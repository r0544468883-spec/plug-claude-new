import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";
import { CURRENT_AI_MODEL_VERSION } from "../_shared/ai-models.ts";
import { sha256Hex } from "../_shared/ai-cache.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Input validation
const MAX_FILE_NAME_LENGTH = 255;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Allow https and Supabase storage URLs
    if (parsed.protocol !== 'https:') {
      return false;
    }
    // Block internal/private IPs
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname.startsWith('127.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname) ||
      hostname.startsWith('169.254.') ||
      hostname === '0.0.0.0' ||
      hostname === '169.254.169.254'
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const CLAUDE_API_KEY = Deno.env.get("CLAUDE_API_KEY");

    if (!CLAUDE_API_KEY) {
      throw new Error("CLAUDE_API_KEY is not configured");
    }

    // Create client with user's token
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Verify the user
    const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !authUser) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const authenticatedUserId = authUser.id;
    console.log('Authenticated user for analyze-resume:', authenticatedUserId);

    const { fileUrl, fileName, documentId } = await req.json();

    // Validate inputs
    if (!fileUrl || typeof fileUrl !== 'string') {
      return new Response(
        JSON.stringify({ error: 'fileUrl is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isValidUrl(fileUrl)) {
      return new Response(
        JSON.stringify({ error: 'Invalid file URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (fileName && (typeof fileName !== 'string' || fileName.length > MAX_FILE_NAME_LENGTH)) {
      return new Response(
        JSON.stringify({ error: 'Invalid fileName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (documentId && !UUID_REGEX.test(documentId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid documentId format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If documentId is provided, verify the user owns the document
    if (documentId) {
      const { data: document, error: docError } = await supabaseClient
        .from('documents')
        .select('owner_id')
        .eq('id', documentId)
        .single();

      if (docError || !document) {
        return new Response(
          JSON.stringify({ error: 'Document not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (document.owner_id !== authenticatedUserId) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized - you do not own this document' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create admin client for updating documents
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Download the file content - REQUIRED for AI analysis
    // Since the resumes bucket is private, we need to download using the service role
    let fileContent = "";
    
    try {
      // Extract the file path from the URL
      // URL format: https://xxx.supabase.co/storage/v1/object/public/resumes/user-id/filename.pdf
      const urlParts = fileUrl.split('/storage/v1/object/public/');
      if (urlParts.length !== 2) {
        // Try signed URL format
        const signedUrlParts = fileUrl.split('/storage/v1/object/sign/');
        if (signedUrlParts.length !== 2) {
          console.error("Invalid file URL format:", fileUrl);
          return new Response(
            JSON.stringify({ error: 'Invalid file URL format.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      
      // Parse bucket and path
      const pathPart = urlParts[1] || fileUrl.split('/storage/v1/object/sign/')[1]?.split('?')[0];
      const [bucket, ...pathParts] = pathPart.split('/');
      const filePath = pathParts.join('/');
      
      console.log("Downloading from bucket:", bucket, "path:", filePath);
      
      // Use supabase admin client to download from private bucket
      const { data: fileData, error: downloadError } = await supabaseAdmin
        .storage
        .from(bucket)
        .download(filePath);
      
      if (downloadError || !fileData) {
        console.error("Storage download error:", downloadError);
        return new Response(
          JSON.stringify({ error: 'Failed to download resume file from storage.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const base64 = await blobToBase64(fileData);
      fileContent = base64;
      console.log("File downloaded and converted, size:", fileData.size, "type:", fileData.type);
    } catch (e) {
      console.error("Error downloading file:", e);
      return new Response(
        JSON.stringify({ error: 'Failed to process resume file. Please try uploading again.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate we have content
    if (!fileContent || !fileContent.startsWith('data:')) {
      return new Response(
        JSON.stringify({ error: 'Failed to read resume file content.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are an expert HR analyst specializing in resume analysis. Your task is to extract COMPLETE and STRUCTURED data from resumes.

## MANDATORY EXTRACTION REQUIREMENTS

You MUST extract the following:
1. Personal information (name, email, phone, location, professional headline, and ALL social/portfolio URLs found in the CV)
2. COMPLETE work history - extract EVERY job position separately with full details
3. COMPLETE education history - extract EVERY institution separately
4. All skills categorized by type
5. Languages spoken

## CRITICAL: POSITIONS EXTRACTION

For the "positions" array, you MUST:
- Extract EACH job as a SEPARATE entry in the positions array
- Include company name, job title, dates, and description for EACH position
- NEVER summarize multiple jobs into one entry
- If you see multiple companies/roles, create multiple entries

Example: If someone worked at Google, then Microsoft, then Apple - create 3 separate position entries.

## DATE FORMAT RULES

- Convert ALL dates to YYYY-MM format (e.g., "2020-01", "2023-12")
- If only year available: "2020" → "2020-01"
- If "Present", "Current", "Now", "היום", "עד היום" → use literal string "Present"
- Hebrew months: ינואר=01, פברואר=02, מרץ=03, אפריל=04, מאי=05, יוני=06, יולי=07, אוגוסט=08, ספטמבר=09, אוקטובר=10, נובמבר=11, דצמבר=12

## REQUIRED JSON STRUCTURE

{
  "personalInfo": {
    "name": "Full Name",
    "email": "email@example.com",
    "phone": "+1234567890",
    "location": "City, Country",
    "headline": "Professional headline or current job title from the CV header",
    "linkedin": "https://linkedin.com/in/... (full URL if found, else null)",
    "github": "https://github.com/... (full URL if found, else null)",
    "portfolio": "https://... (personal website/portfolio URL if found, else null)"
  },
  "skills": {
    "technical": ["JavaScript", "Python", "React"],
    "soft": ["Leadership", "Communication"],
    "languages": ["English", "Hebrew"]
  },
  "experience": {
    "totalYears": 5,
    "summary": "Brief professional summary",
    "recentRole": "Most recent job title",
    "positions": [
      {
        "company": "Most Recent Company",
        "role": "Job Title",
        "startDate": "2022-01",
        "endDate": "Present",
        "description": "Key responsibilities and achievements"
      },
      {
        "company": "Previous Company",
        "role": "Previous Title",
        "startDate": "2020-06",
        "endDate": "2021-12",
        "description": "Previous role description"
      },
      {
        "company": "Earlier Company",
        "role": "Earlier Title",
        "startDate": "2018-03",
        "endDate": "2020-05",
        "description": "Earlier role description"
      }
    ]
  },
  "education": {
    "highest": "Highest degree name",
    "certifications": ["Cert1", "Cert2"],
    "institutions": [
      {
        "name": "University Name",
        "degree": "Bachelor's/Master's/MBA/PhD",
        "field": "Field of Study",
        "startDate": "2015-09",
        "endDate": "2019-06"
      }
    ]
  },
  "strengths": ["strength1", "strength2"],
  "suggestedRoles": ["role1", "role2"],
  "improvementTips": ["tip1", "tip2"],
  "overallScore": 85
}

## VALIDATION BEFORE RESPONDING

Before responding, verify:
✓ positions array contains EVERY job from the resume (minimum 1 entry)
✓ institutions array contains EVERY school/university (minimum 1 entry if education exists)
✓ ALL dates are in YYYY-MM format or "Present"
✓ totalYears is calculated from positions dates`;

    // Parse the base64 data URL to extract mime type and raw data
    const [dataPart, base64Data] = fileContent.split(",");
    const mimeType = dataPart?.split(":")[1]?.split(";")[0] || "application/pdf";

    // Cache-first: skip Claude call if this exact file content was already
    // analyzed by the current model. Users frequently re-upload the same CV.
    let contentHash: string | null = null;
    if (documentId) {
      contentHash = await sha256Hex(base64Data);
      const { data: cachedDoc } = await supabaseAdmin
        .from("documents")
        .select("ai_summary, content_hash, ai_summary_model")
        .eq("id", documentId)
        .single();

      if (
        cachedDoc?.ai_summary &&
        cachedDoc?.content_hash === contentHash &&
        cachedDoc?.ai_summary_model === CURRENT_AI_MODEL_VERSION
      ) {
        console.log("analyze-resume cache hit for document:", documentId);
        return new Response(
          JSON.stringify({ success: true, analysis: cachedDoc.ai_summary, cache_hit: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Build Claude content block based on file type
    let fileContentBlock: unknown;
    if (mimeType === "application/pdf") {
      fileContentBlock = {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64Data },
      };
    } else if (mimeType.startsWith("image/")) {
      fileContentBlock = {
        type: "image",
        source: { type: "base64", media_type: mimeType, data: base64Data },
      };
    } else {
      // Word / Excel / TXT — decode as text best-effort
      let textContent = "";
      try { textContent = atob(base64Data).slice(0, 10000); } catch { textContent = "[binary file]"; }
      fileContentBlock = { type: "text", text: `File (${mimeType}):\n${textContent}` };
    }

    console.log("Sending to Claude for analysis...");
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        system: systemPrompt + "\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no code blocks.",
        messages: [
          {
            role: "user",
            content: [
              fileContentBlock,
              { type: "text", text: `Please analyze this resume (${fileName || "resume"}):` },
            ],
          },
        ],
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("Claude analysis error:", response.status, errorText);
      throw new Error("AI analysis failed");
    }

    const data = await response.json();
    const analysisContent = data.content?.[0]?.text;
    
    console.log("Raw AI response content length:", analysisContent?.length || 0);
    
    let analysis;
    try {
      analysis = JSON.parse(analysisContent);
      console.log("Parsed analysis - has positions:", !!analysis?.experience?.positions, "count:", analysis?.experience?.positions?.length || 0);
      console.log("Parsed analysis - has institutions:", !!analysis?.education?.institutions, "count:", analysis?.education?.institutions?.length || 0);
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr);
      // If JSON parsing fails, create a basic structure
      analysis = {
        skills: { technical: [], soft: [], languages: [] },
        experience: { totalYears: 0, summary: analysisContent, recentRole: "", positions: [] },
        education: { highest: "", certifications: [], institutions: [] },
        strengths: [],
        suggestedRoles: [],
        improvementTips: [],
        overallScore: 70,
        rawAnalysis: analysisContent,
      };
    }

    // Ensure positions and institutions arrays exist even if AI didn't return them
    if (!analysis.experience) {
      analysis.experience = { totalYears: 0, summary: "", recentRole: "", positions: [] };
    }
    if (!analysis.experience.positions) {
      analysis.experience.positions = [];
    }
    if (!analysis.education) {
      analysis.education = { highest: "", certifications: [], institutions: [] };
    }
    if (!analysis.education.institutions) {
      analysis.education.institutions = [];
    }

    console.log("Final analysis to save - positions:", analysis.experience.positions.length, "institutions:", analysis.education.institutions.length);

    // Update the document with the AI summary (using admin client since we verified ownership)
    if (documentId) {
      const { error: updateError } = await supabaseAdmin
        .from("documents")
        .update({
          ai_summary: analysis,
          content_hash: contentHash,
          ai_summary_model: CURRENT_AI_MODEL_VERSION,
        })
        .eq("id", documentId)
        .eq("owner_id", authenticatedUserId); // Double-check ownership

      if (updateError) {
        console.error("Error updating document:", updateError);
      } else {
        console.log("Document updated successfully with ai_summary");
      }
    }

    return new Response(JSON.stringify({ success: true, analysis, cache_hit: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("analyze-resume error:", error);
    return new Response(JSON.stringify({ error: "Failed to analyze resume. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function blobToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  const mimeType = blob.type || "application/pdf";
  return `data:${mimeType};base64,${base64}`;
}
