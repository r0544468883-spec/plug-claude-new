import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CURRENT_AI_MODEL, CURRENT_AI_MODEL_VERSION } from "../_shared/ai-models.ts";
import { sha256Hex } from "../_shared/ai-cache.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ok = (body: object) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { jobId, title, description, requirements } = await req.json();

    if (!jobId) return ok({ error: "jobId required" });

    const CLAUDE_API_KEY = Deno.env.get("CLAUDE_API_KEY");
    if (!CLAUDE_API_KEY) return ok({ error: "AI not configured" });

    const rawText = [title, requirements, description].filter(Boolean).join("\n\n").slice(0, 4000);
    const inputHash = await sha256Hex(rawText);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Cache-first: skip Claude call if the same JD text was already parsed
    // by the current model. The `fire-and-forget` call sites (PostJobForm,
    // ClientProfilePage) re-trigger parse-jd on every submit — this guard
    // collapses those duplicates.
    const { data: existing } = await supabase
      .from("jobs")
      .select("parsed_jd, parsed_jd_hash, parsed_jd_model")
      .eq("id", jobId)
      .single();

    if (
      existing?.parsed_jd &&
      existing?.parsed_jd_hash === inputHash &&
      existing?.parsed_jd_model === CURRENT_AI_MODEL_VERSION
    ) {
      return ok({ parsed_jd: existing.parsed_jd, cache_hit: true });
    }

    const prompt = `נתח את תיאור המשרה הבא והחזר JSON מנורמל בלבד, ללא markdown.

תיאור המשרה:
${rawText}

החזר את ה-JSON הבא (מלא את כל השדות לפי המידע הקיים, null אם לא ידוע):
{
  "role": "שם התפקיד המנורמל (כותרת ברורה)",
  "seniority": "junior|mid|senior|lead|manager|director|intern|null",
  "required_skills": ["skill1", "skill2"],
  "preferred_skills": ["skill1", "skill2"],
  "culture_keywords": ["remote-friendly", "startup", "agile"],
  "remote_type": "remote|hybrid|onsite|null",
  "languages": ["Hebrew", "English"],
  "education": "degree required or null",
  "experience_years": 3
}`;

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: CURRENT_AI_MODEL,
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!claudeRes.ok) return ok({ error: `Claude error ${claudeRes.status}` });

    const claudeData = await claudeRes.json();
    const text: string = claudeData.content?.[0]?.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return ok({ error: "Failed to parse Claude response" });

    const parsedJd = JSON.parse(jsonMatch[0]);

    const { error } = await supabase
      .from("jobs")
      .update({
        parsed_jd: parsedJd,
        parsed_jd_hash: inputHash,
        parsed_jd_model: CURRENT_AI_MODEL_VERSION,
      })
      .eq("id", jobId);

    if (error) return ok({ error: error.message });

    return ok({ parsed_jd: parsedJd, cache_hit: false });
  } catch (e) {
    return ok({ error: String(e) });
  }
});
