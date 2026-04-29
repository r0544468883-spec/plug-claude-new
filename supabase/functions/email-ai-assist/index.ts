import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY    = Deno.env.get("ANTHROPIC_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, job_title, company_name, stage, language, user_name } = await req.json();

    if (action !== "draft") {
      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isHe = language === "he";

    // Build stage-specific instructions
    const stageInstructions: Record<string, string> = {
      applied: isHe
        ? "כתוב מייל מעקב מנומס כ-3-5 ימים אחרי הגשת המועמדות. בקש עדכון סטטוס, הבע עניין מחודש בתפקיד."
        : "Write a polite follow-up email, 3-5 days after applying. Ask for a status update, re-express interest in the role.",
      interview: isHe
        ? "כתוב מייל תודה אחרי ראיון. הבע הכרת תודה, סכם נקודת עיקרית אחת מהשיחה, אשר עניין בתפקיד."
        : "Write a thank-you email after an interview. Express gratitude, summarize one key point from the conversation, confirm interest in the role.",
      task: isHe
        ? "כתוב מייל קבלה של מטלה בית. אשר קבלה, שאל שאלה הבהרה אחת אם רלוונטי, ציין מועד הגשה משוער."
        : "Write an email acknowledging a home assignment. Confirm receipt, ask one clarifying question if relevant, mention estimated submission date.",
      offer: isHe
        ? "כתוב מייל ראשוני למשא ומתן על שכר. הבע הכרת תודה על ההצעה, ציין שאתה בוחן אותה, בקש שיחה לדיון."
        : "Write an initial salary negotiation email. Express gratitude for the offer, mention you are reviewing it, request a call to discuss.",
    };

    const instructions = stageInstructions[stage] || (
      isHe
        ? "כתוב מייל פנייה מקצועית ותמציתי לחברה בנוגע למשרה."
        : "Write a professional and concise outreach email to the company about the position."
    );

    const systemPrompt = isHe
      ? `אתה עוזר לכתיבת מיילים מקצועיים לחיפוש עבודה. כתוב מיילים קצרים, ממוקדים ואישיים. החזר JSON בלבד עם שני שדות: "subject" (נושא המייל) ו-"body" (גוף המייל, טקסט רגיל עם שורות חדשות). אל תוסיף הסברים.`
      : `You are an assistant for writing professional job search emails. Write short, focused, and personal emails. Return JSON only with two fields: "subject" (email subject line) and "body" (email body as plain text with newlines). No explanations.`;

    const userPrompt = isHe
      ? `${instructions}\n\nמידע:\n- שם שולח: ${user_name || "המועמד"}\n- תפקיד: ${job_title || "לא צוין"}\n- חברה: ${company_name || "לא צוינה"}\n\nהחזר JSON בלבד.`
      : `${instructions}\n\nContext:\n- Sender name: ${user_name || "Applicant"}\n- Position: ${job_title || "Not specified"}\n- Company: ${company_name || "Not specified"}\n\nReturn JSON only.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const aiData = await response.json();
    const text = aiData.content?.[0]?.text || "";

    // Parse JSON from response
    let subject = "";
    let body = "";
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        subject = parsed.subject || "";
        body = parsed.body || "";
      }
    } catch {
      // Fallback: return raw text as body
      body = text;
    }

    return new Response(JSON.stringify({ subject, body }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("email-ai-assist error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
