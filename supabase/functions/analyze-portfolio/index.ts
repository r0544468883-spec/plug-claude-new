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
    // Authentication check
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
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
    
    const userId = authUser.id;
    console.log('Analyzing portfolio for user:', userId);

    const { portfolio_url } = await req.json();
    
    if (!portfolio_url) {
      return new Response(
        JSON.stringify({ error: 'portfolio_url is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const CLAUDE_API_KEY = Deno.env.get("CLAUDE_API_KEY");

    if (!CLAUDE_API_KEY) {
      throw new Error("CLAUDE_API_KEY is not configured");
    }

    // Analyze the portfolio with AI
    const analysisSystemPrompt = `You are analyzing a portfolio website. Based on the URL provided, generate a professional analysis. Return ONLY valid JSON, no markdown, no code blocks.`;

    const analysisPrompt = `Portfolio URL: ${portfolio_url}

Please analyze and return a JSON object with the following structure:
{
  "style": "A brief description of the portfolio's design style (e.g., 'Minimalist tech-focused', 'Creative & colorful', 'Corporate professional')",
  "tech_stack": ["Array of technologies/tools the person likely uses based on the domain and URL patterns"],
  "projects_hint": "Brief note about what kind of projects might be showcased",
  "overall_summary": "2-3 sentence professional summary of what this portfolio likely represents",
  "quality_score": 0-100,
  "suggestions": ["Array of 2-3 suggestions to improve the portfolio if visible from URL"]
}

Important: Since you cannot actually visit the URL, make intelligent inferences based on:
- The domain name (personal domain vs GitHub pages vs other platforms)
- URL patterns (if it includes specific paths)
- Common portfolio site patterns

Return ONLY the JSON object, no additional text.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        system: analysisSystemPrompt,
        messages: [
          { role: "user", content: analysisPrompt }
        ],
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      throw new Error("Failed to analyze portfolio");
    }

    const aiResponse = await response.json();
    const analysisText = aiResponse.content?.[0]?.text || '{}';
    
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch {
      console.error("Failed to parse AI response:", analysisText);
      analysis = {
        style: "Could not analyze",
        tech_stack: [],
        projects_hint: "",
        overall_summary: "Portfolio analysis was not successful",
        quality_score: 0,
        suggestions: []
      };
    }

    // Add metadata
    analysis.analyzed_at = new Date().toISOString();
    analysis.url = portfolio_url;

    // Save to user's profile
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ portfolio_summary: analysis })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to save analysis:', updateError);
      throw new Error('Failed to save portfolio analysis');
    }

    console.log('Portfolio analysis saved successfully for user:', userId);

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("analyze-portfolio error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to analyze portfolio. Please try again." }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
