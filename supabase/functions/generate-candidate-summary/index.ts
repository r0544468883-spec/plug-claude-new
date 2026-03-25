import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseService = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Verify user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { candidateId, applicationId } = await req.json();
    if (!candidateId || !applicationId) {
      return new Response(JSON.stringify({ error: 'Missing candidateId or applicationId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch candidate data
    const { data: profile } = await supabaseService
      .from('profiles')
      .select('full_name, cv_data, experience_years, bio, personal_tagline')
      .eq('user_id', candidateId)
      .single();

    // Fetch vouches
    const { data: vouches } = await supabaseService
      .from('vouches')
      .select('vouch_type, message, skill_ids')
      .eq('to_user_id', candidateId)
      .eq('is_public', true)
      .limit(10);

    const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY');
    if (!CLAUDE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `Analyze this candidate and return a concise JSON summary.

Candidate: ${profile?.full_name || 'Unknown'}
Experience: ${profile?.experience_years || 'N/A'} years
Bio: ${profile?.bio || 'N/A'}
Tagline: ${profile?.personal_tagline || 'N/A'}
CV Data: ${JSON.stringify(profile?.cv_data || {}).slice(0, 2000)}
Vouches (${vouches?.length || 0}): ${JSON.stringify(vouches?.map(v => ({ type: v.vouch_type, msg: v.message })) || []).slice(0, 1000)}

Return JSON with: skills (array of top 5), soft_skills (array of top 3), salary_positioning ("below_market" | "at_market" | "above_market"), summary (2-3 sentences), strengths (array of 3). Return ONLY valid JSON, no markdown, no code blocks.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        system: 'You are a recruitment analyst. Return ONLY valid JSON, no markdown, no code blocks.',
        messages: [
          { role: 'user', content: prompt },
        ],
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI error:', response.status, errText);
      return new Response(JSON.stringify({ error: 'AI service error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiResult = await response.json();
    const rawText = aiResult.content?.[0]?.text || '';
    let summary = {};

    try {
      const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        summary = JSON.parse(jsonMatch[0]);
      } else {
        summary = JSON.parse(cleaned);
      }
    } catch {
      summary = { summary: 'Could not parse AI response', skills: [], soft_skills: [], salary_positioning: 'at_market', strengths: [] };
    }

    // Cache in application
    await supabaseService
      .from('applications')
      .update({ ai_candidate_summary: summary } as any)
      .eq('id', applicationId);

    return new Response(JSON.stringify({ success: true, summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('generate-candidate-summary error:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate summary' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
