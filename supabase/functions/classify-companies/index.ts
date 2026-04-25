import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INDUSTRIES = [
  "Technology", "Cybersecurity", "Fintech", "Healthcare", "AI/ML",
  "E-commerce", "SaaS", "Media", "Education", "Real Estate",
  "Gaming", "Logistics", "Automotive", "Defense", "Consulting",
  "Marketing", "HR Tech", "Legal Tech", "Insurance", "Other"
];

const SIZES = ["startup", "small", "medium", "large", "enterprise"];

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const claudeApiKey = Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("CLAUDE_API_KEY");

    if (!claudeApiKey) {
      return new Response(JSON.stringify({ error: "Missing Claude API key" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service client to update companies
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch companies that have no industry OR no size
    const { data: companies, error } = await adminClient
      .from("companies")
      .select("id, name, description, employee_count")
      .or("industry.is.null,size.is.null")
      .limit(30);

    if (error) throw error;
    if (!companies || companies.length === 0) {
      return new Response(JSON.stringify({ classified: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build prompt for Claude
    const companyList = companies
      .map((c: any, i: number) =>
        `${i + 1}. Name: "${c.name}"${c.description ? ` | Description: "${c.description.slice(0, 150)}"` : ""}${c.employee_count ? ` | Employees: "${c.employee_count}"` : ""}`
      )
      .join("\n");

    const prompt = `You are classifying companies for a job search platform. For each company below, determine:
1. industry: one of [${INDUSTRIES.join(", ")}]
2. size: one of [${SIZES.join(", ")}] where startup=1-15, small=16-50, medium=51-200, large=201-1000, enterprise=1000+

Use the company name and any available info. For Israeli tech companies, most are Technology unless clearly otherwise.
If you can't determine size from employee count, infer from company type (startups are usually startup/small).

Return ONLY a JSON array with objects: [{"id": "...", "industry": "...", "size": "..."}]
Use the exact IDs provided.

Companies:
${companies.map((c: any, i: number) => `${i + 1}. ID: ${c.id} | ${c.name}${c.description ? ` | ${c.description.slice(0, 100)}` : ""}${c.employee_count ? ` | ${c.employee_count} employees` : ""}`).join("\n")}`;

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": claudeApiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!claudeResponse.ok) {
      throw new Error(`Claude API error: ${claudeResponse.status}`);
    }

    const claudeData = await claudeResponse.json();
    const rawText = claudeData.content?.[0]?.text || "[]";

    // Parse JSON from response (handle markdown code blocks)
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON array in Claude response");

    const classifications: { id: string; industry: string; size: string }[] = JSON.parse(jsonMatch[0]);

    // Update each company
    let classified = 0;
    for (const cls of classifications) {
      if (!cls.id || !cls.industry || !cls.size) continue;
      const validIndustry = INDUSTRIES.includes(cls.industry) ? cls.industry : null;
      const validSize = SIZES.includes(cls.size) ? cls.size : null;
      if (!validIndustry && !validSize) continue;

      const updateData: Record<string, string> = {};
      if (validIndustry) updateData.industry = validIndustry;
      if (validSize) updateData.size = validSize;

      const { error: updateError } = await adminClient
        .from("companies")
        .update(updateData)
        .eq("id", cls.id);

      if (!updateError) classified++;
    }

    return new Response(JSON.stringify({ classified, total: companies.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("classify-companies error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
