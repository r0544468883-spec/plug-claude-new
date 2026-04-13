import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLAUDE_API_KEY   = Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("CLAUDE_API_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CLASSIFICATION_PROMPT = `You are an email classifier for a recruitment/job platform.
Classify the following email into exactly one category:
- interview_invitation: Invitation to an interview (phone, video, in-person)
- rejection: Application rejection or "we decided to move forward with other candidates"
- offer: Job offer or salary negotiation
- task_assignment: Home assignment, coding challenge, or test task
- follow_up: Follow-up on a previous interaction
- acknowledgment: "We received your application" or similar confirmation
- info_request: Request for more information (CV, portfolio, references)
- general: Anything else

Also extract if possible:
- company_name: The company that sent the email
- job_title: The position being discussed
- interview_date: Date/time of interview if mentioned (ISO format)
- action_required: Brief description of what the recipient needs to do

The email may be in Hebrew, English, or mixed.

Return ONLY valid JSON:
{
  "classification": "<category>",
  "confidence": <0.00-1.00>,
  "company_name": "<string or null>",
  "job_title": "<string or null>",
  "interview_date": "<ISO string or null>",
  "action_required": "<string or null>"
}`;

async function classifyWithAI(subject: string, body: string): Promise<{
  classification: string;
  confidence: number;
  company_name: string | null;
  job_title: string | null;
  interview_date: string | null;
  action_required: string | null;
}> {
  if (!CLAUDE_API_KEY) {
    console.error("[classify-email] CLAUDE_API_KEY / ANTHROPIC_API_KEY is NOT SET");
    return { classification: "general", confidence: 0, company_name: null, job_title: null, interview_date: null, action_required: null };
  }
  console.log(`[classify-email] Calling Claude API for subject="${subject.substring(0, 60)}"`);

  // Truncate body to 2000 chars
  const truncatedBody = body.length > 2000 ? body.substring(0, 2000) + "..." : body;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CLAUDE_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `${CLASSIFICATION_PROMPT}\n\nSubject: ${subject}\n\nBody:\n${truncatedBody}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("AI classification failed:", detail);
    return { classification: "general", confidence: 0, company_name: null, job_title: null, interview_date: null, action_required: null };
  }

  const data = await res.json();
  const text = data.content?.[0]?.text || "{}";

  try {
    // Extract JSON from response (in case there's extra text)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    return JSON.parse(jsonMatch[0]);
  } catch {
    console.error("Failed to parse AI response:", text);
    return { classification: "general", confidence: 0, company_name: null, job_title: null, interview_date: null, action_required: null };
  }
}

// Map classification → application stage
const CLASSIFICATION_TO_STAGE: Record<string, { stage: string; validFrom: string[] }> = {
  interview_invitation: { stage: "interview", validFrom: ["applied", "screening", "viewed"] },
  rejection: { stage: "rejected", validFrom: ["applied", "screening", "interview", "task", "offer", "viewed"] },
  offer: { stage: "offer", validFrom: ["interview", "task"] },
  task_assignment: { stage: "task", validFrom: ["interview", "screening", "applied"] },
};

// Retry matching email to application using AI-extracted company/job info
async function retryMatchWithAI(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  aiResult: { company_name: string | null; job_title: string | null },
  subject: string,
  fromEmail: string,
): Promise<string | null> {
  const { data: apps } = await supabase
    .from("applications")
    .select("id, job_company, job_title, job_url")
    .eq("candidate_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (!apps || apps.length === 0) return null;

  const senderDomain = fromEmail.split("@")[1]?.toLowerCase() || "";
  const subjectLower = subject.toLowerCase();

  // Match by AI-extracted company name
  if (aiResult.company_name && aiResult.company_name.length >= 3) {
    const companyLower = aiResult.company_name.toLowerCase();
    for (const app of apps) {
      if (app.job_company) {
        const appCompany = app.job_company.toLowerCase();
        if (appCompany.includes(companyLower) || companyLower.includes(appCompany)) return app.id;
      }
    }
    // Check if sender domain contains the company name
    const companyClean = companyLower.replace(/\s+/g, "");
    if (companyClean.length >= 4 && senderDomain.includes(companyClean)) {
      return apps[0].id;
    }
  }

  // Match by AI-extracted job title
  if (aiResult.job_title && aiResult.job_title.length >= 5) {
    const titleLower = aiResult.job_title.toLowerCase();
    for (const app of apps) {
      if (app.job_title && app.job_title.toLowerCase().includes(titleLower)) return app.id;
    }
  }

  // Last resort: sender domain vs job_url domain
  if (senderDomain) {
    for (const app of apps) {
      if (app.job_url) {
        try {
          const jobDomain = new URL(app.job_url).hostname.replace("www.", "").split(".")[0].toLowerCase();
          if (jobDomain.length >= 4 && senderDomain.includes(jobDomain)) return app.id;
        } catch { /* invalid URL */ }
      }
    }
  }

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const token = authHeader.replace("Bearer ", "");
    let isServiceRole = token === SUPABASE_SERVICE_KEY;

    // Fallback: accept legacy JWT service_role keys
    if (!isServiceRole && token.startsWith("eyJ")) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload.role === "service_role") isServiceRole = true;
      } catch { /* not a valid JWT */ }
    }

    let userId: string;

    const requestBody = await req.json();
    const { email_id, subject, body_text, from_email, application_id: rawApplicationId, auto_update, user_id: bodyUserId } = requestBody;

    if (isServiceRole) {
      // Called from sync-emails with service role key
      if (!bodyUserId) throw new Error("Missing user_id for service role call");
      userId = bodyUserId;
    } else {
      // Called from frontend with user JWT
      const anonClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
      const { data: { user }, error: authErr } = await anonClient.auth.getUser(token);
      if (authErr || !user) throw new Error("Unauthorized");
      userId = user.id;
    }
    if (!subject && !body_text) throw new Error("Need subject or body_text");

    // Classify
    const result = await classifyWithAI(subject || "", body_text || "");

    // If no application_id was provided, try to match using AI-extracted company/job info
    let application_id = rawApplicationId || null;
    if (!application_id && (result.company_name || result.job_title)) {
      console.log(`[classify-email] No app match from sync — retrying with AI-extracted company="${result.company_name}", title="${result.job_title}"`);
      application_id = await retryMatchWithAI(supabase, userId, result, subject || "", from_email || "");
      if (application_id) {
        console.log(`[classify-email] AI retry matched application: ${application_id}`);
      }
    }

    // Save classification to application_emails if email_id provided
    if (email_id) {
      await supabase
        .from("application_emails")
        .update({
          application_id: application_id || null,
          ai_classification: result.classification,
          ai_confidence: result.confidence,
          ai_extracted_data: {
            company_name: result.company_name,
            job_title: result.job_title,
            interview_date: result.interview_date,
            action_required: result.action_required,
          },
        })
        .eq("id", email_id)
        .eq("user_id", userId);
    }

    // Auto-update application stage if confidence is high enough
    let stageUpdated = false;
    let previousStage = null;
    let newStage = null;

    console.log(`[classify-email] result: classification=${result.classification}, confidence=${result.confidence}, app=${application_id}`);

    if (application_id && auto_update !== false && result.confidence >= 0.50) {
      const mapping = CLASSIFICATION_TO_STAGE[result.classification];
      if (mapping) {
        // Get current application stage
        const { data: app } = await supabase
          .from("applications")
          .select("current_stage")
          .eq("id", application_id)
          .eq("candidate_id", userId)
          .single();

        console.log(`[classify-email] app current_stage=${app?.current_stage}, validFrom=${JSON.stringify(mapping.validFrom)}, mapping.stage=${mapping.stage}`);

        if (app && mapping.validFrom.includes(app.current_stage)) {
          if (result.confidence >= 0.70) {
            // Auto-update
            previousStage = app.current_stage;
            newStage = mapping.stage;

            await supabase
              .from("applications")
              .update({ current_stage: newStage, updated_at: new Date().toISOString() })
              .eq("id", application_id);

            // Get email provider info for building web link
            let gmailLink: string | null = null;
            if (email_id) {
              const { data: emailRow } = await supabase
                .from("application_emails")
                .select("provider_msg_id, provider")
                .eq("id", email_id)
                .single();
              if (emailRow?.provider_msg_id) {
                gmailLink = emailRow.provider === "outlook"
                  ? `https://outlook.live.com/mail/0/inbox/id/${encodeURIComponent(emailRow.provider_msg_id)}`
                  : `https://mail.google.com/mail/u/0/#inbox/${emailRow.provider_msg_id}`;
              }
            }

            // Get application details for notification text
            const { data: appDetails } = await supabase
              .from("applications")
              .select("job_company")
              .eq("id", application_id)
              .single();

            const companyName = appDetails?.job_company || result.company_name || "";
            const jobTitle = result.job_title || "";

            // Timeline event with email reference
            const isRejection = result.classification === "rejection";
            await supabase.from("application_timeline").insert({
              application_id,
              event_type: isRejection ? "rejection_detected" : "stage_change_auto",
              title: isRejection
                ? `התקבל מייל דחייה מ-${companyName || "החברה"}`
                : `שלב עודכן אוטומטית: ${newStage}`,
              description: JSON.stringify({
                email_id: email_id || null,
                subject: subject || "",
                confidence: result.confidence,
                gmail_link: gmailLink,
              }),
              created_by: userId,
            });

            // Insert notification for the user
            await supabase.from("notifications").insert({
              user_id: userId,
              type: isRejection ? "rejection_detected" : "application_update",
              title: isRejection
                ? `נראה שקיבלת תשובה מ-${companyName}`
                : `עדכון אוטומטי: ${companyName} - ${jobTitle}`,
              message: isRejection
                ? `לגבי משרת ${jobTitle}. לחץ כדי לצפות במייל המלא.`
                : `השלב עודכן ל-${newStage} (${Math.round(result.confidence * 100)}% ביטחון)`,
              is_read: false,
              metadata: {
                application_id,
                email_id: email_id || null,
                gmail_link: gmailLink,
                classification: result.classification,
                confidence: result.confidence,
                previous_stage: previousStage,
                new_stage: newStage,
                company_name: companyName,
                job_title: jobTitle,
              },
            });

            if (email_id) {
              await supabase
                .from("application_emails")
                .update({ auto_updated: true, previous_stage: previousStage })
                .eq("id", email_id);
            }

            stageUpdated = true;
          }
          // For 0.60-0.84: return suggestion but don't auto-update
        }
      }
    }

    return new Response(
      JSON.stringify({
        ...result,
        stage_updated: stageUpdated,
        previous_stage: previousStage,
        new_stage: newStage,
        suggestion: result.confidence >= 0.50 && result.confidence < 0.70
          ? CLASSIFICATION_TO_STAGE[result.classification]?.stage || null
          : null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("classify-email error:", e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
