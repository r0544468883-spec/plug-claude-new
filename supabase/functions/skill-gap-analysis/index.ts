import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { candidateSkills, jobRequirements, jobTitle } = await req.json();
    const CLAUDE_API_KEY = Deno.env.get("CLAUDE_API_KEY");
    if (!CLAUDE_API_KEY) throw new Error("CLAUDE_API_KEY is not configured");

    const systemPrompt = `You are a career advisor AI that analyzes skill gaps between a candidate's current skills and job requirements.
Always respond with valid JSON only, no markdown, no explanation outside the JSON.`;

    const userPrompt = `Analyze the skill gap for a "${jobTitle}" position.

Candidate skills: ${JSON.stringify(candidateSkills)}
Job requirements text: ${jobRequirements}

Return a JSON object with this exact structure:
{
  "matched_skills": ["skill1", "skill2"],
  "missing_skills": [
    {
      "skill": "skill name",
      "importance": "critical|important|nice_to_have",
      "recommendation": {
        "title": "Course/resource title",
        "platform": "Coursera|Udemy|YouTube|LinkedIn Learning|freeCodeCamp",
        "url": "https://...",
        "duration": "e.g. 20 hours"
      }
    }
  ],
  "match_percentage": 75,
  "summary_he": "סיכום קצר בעברית של פערי הכישורים",
  "summary_en": "Short English summary of the skill gaps"
}

Rules:
- matched_skills: skills the candidate HAS that match job requirements
- missing_skills: skills required but candidate doesn't have
- For each missing skill, suggest a real, specific course (use real course names that actually exist on those platforms)
- importance: critical = must-have, important = strongly preferred, nice_to_have = bonus
- match_percentage: realistic number 0-100
- Keep missing_skills to max 6 items (the most important ones)`;

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
        messages: [
          { role: "user", content: userPrompt },
        ],
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
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const rawContent = aiData.content?.[0]?.text || "";

    // Parse JSON from the AI response
    let parsed;
    try {
      // Strip markdown code blocks if present
      const cleaned = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", rawContent);
      throw new Error("AI returned invalid JSON");
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("skill-gap-analysis error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
