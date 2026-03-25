import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { resumeUrl, resumeText } = await req.json();
    const CLAUDE_API_KEY = Deno.env.get("CLAUDE_API_KEY");
    if (!CLAUDE_API_KEY) throw new Error("CLAUDE_API_KEY not configured");

    const systemPrompt = `You are a resume parser. Extract information from resumes and return ONLY valid JSON with no markdown, no code blocks, just raw JSON.

Return ONLY this JSON structure:
{
  "full_name": "",
  "title": "",
  "email": "",
  "phone": "",
  "location": "",
  "summary": "",
  "experience": [{"company": "", "role": "", "start_date": "", "end_date": "", "description": ""}],
  "education": [{"institution": "", "degree": "", "field": "", "year": ""}],
  "skills": [],
  "languages": []
}`;

    let userContent: unknown[];

    if (resumeText) {
      userContent = [{ type: "text", text: `Parse this resume text and extract structured data:\n\n${resumeText}` }];
    } else if (resumeUrl) {
      // Download the file from the signed URL
      const fileRes = await fetch(resumeUrl);
      if (!fileRes.ok) throw new Error("Failed to download resume file");

      const blob = await fileRes.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      // Chunked conversion — much faster than byte-by-byte for large files
      const CHUNK = 8192;
      let binary = "";
      for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
      }
      const base64 = btoa(binary);
      const mimeType = blob.type || "application/pdf";

      if (mimeType === "application/pdf") {
        userContent = [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
          { type: "text", text: "Parse this resume and extract the structured data." },
        ];
      } else {
        userContent = [{ type: "text", text: `Parse this resume (${mimeType}) and extract structured data. Content: ${binary.slice(0, 8000)}` }];
      }
    } else {
      throw new Error("Either resumeUrl or resumeText is required");
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        system: systemPrompt,
        messages: [{ role: "user", content: userContent }],
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || "{}";

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error("Could not extract JSON from AI response");
      }
    }

    return new Response(JSON.stringify({ data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-resume error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
