import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Action = "improve" | "professional" | "shorten" | "expand" | "fix_grammar" | "ats_optimize";
type Context = "summary" | "bullets" | "description" | "title" | "generic";

const ACTION_PROMPTS: Record<Action, string> = {
  improve: "Improve the clarity, impact, and flow of this text while preserving its core meaning.",
  professional: "Rewrite this text in a formal, professional tone suitable for a corporate resume.",
  shorten: "Shorten this text to be more concise and punchy, keeping only the most important points.",
  expand: "Expand this text with more specific detail, quantified achievements, and strong action verbs.",
  fix_grammar: "Fix any grammar, spelling, punctuation, and style issues in this text.",
  ats_optimize: "Rewrite this text to maximize ATS (Applicant Tracking System) score. Use strong action verbs (Led, Developed, Achieved, Managed, Implemented, Increased, Reduced, Delivered), include quantifiable achievements where possible (%, $, numbers), use industry-standard keywords, avoid graphics or tables in description, keep sentences clear and scannable. Each bullet should start with a past-tense action verb.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, action, context, language } = await req.json() as {
      text: string;
      action: Action;
      context: Context;
      language: "he" | "en";
    };

    if (!text || !action) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: text, action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const CLAUDE_API_KEY = Deno.env.get("CLAUDE_API_KEY");
    if (!CLAUDE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contextLabel = context === "bullets"
      ? "CV work experience bullet points"
      : context === "summary"
      ? "CV professional summary"
      : context === "description"
      ? "CV project description"
      : context === "title"
      ? "CV job title or headline"
      : "CV text";

    const systemPrompt = `You are an expert professional CV/resume editor specializing in ${language === "he" ? "Hebrew" : "English"} resumes.
The user is editing their ${contextLabel}.
${ACTION_PROMPTS[action]}

CRITICAL RULES:
- Return ONLY the improved text. No explanations, no labels, no quotes, no markdown.
- Keep the same language as the input (${language === "he" ? "Hebrew" : "English"}).
- If the input is bullet points (multiple lines), return improved bullet points (same number of lines or fewer).
- Do not add any preamble or closing remarks.
- Preserve line breaks if the original has them.`;

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
        messages: [{ role: "user", content: text }],
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Failed to improve text" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    const improved = result.content?.[0]?.text?.trim() || text;

    return new Response(
      JSON.stringify({ result: improved }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("cv-text-improve error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to improve text. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
