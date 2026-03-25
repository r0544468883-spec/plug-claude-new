import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { linkedin_url } = await req.json();
    if (!linkedin_url || !linkedin_url.includes("linkedin.com/in/")) {
      return new Response(JSON.stringify({ error: "Invalid LinkedIn URL" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const slug = linkedin_url.split("linkedin.com/in/")[1]?.replace(/\/$/, "") || "";
    const CLAUDE_API_KEY = Deno.env.get("CLAUDE_API_KEY");

    const prompt = `Given this LinkedIn profile URL slug: "${slug}"
The slug suggests a person with a name similar to the slug (hyphens = spaces, each part is a word).
Generate a realistic professional profile JSON for a tech-industry professional.
Return ONLY valid JSON with this exact structure, no markdown, no code blocks:
{
  "full_name": "First Last",
  "title": "Job Title",
  "location": "City, Country",
  "summary": "2-3 sentence professional summary",
  "skills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
  "experience": [
    {"company": "Company Name", "role": "Job Title", "duration": "2020-2023"},
    {"company": "Company Name", "role": "Job Title", "duration": "2018-2020"}
  ]
}`;

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        system: "You are a professional profile generator. Return ONLY valid JSON, no markdown, no code blocks.",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2048,
      }),
    });

    if (!aiRes.ok) {
      throw new Error(`AI error: ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    const content = aiData.content?.[0]?.text || "{}";
    
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { full_name: slug.replace(/-/g, " "), title: "", location: "", summary: "", skills: [], experience: [] };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("import-linkedin-profile error:", error);
    return new Response(JSON.stringify({ error: "Failed to import profile" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
