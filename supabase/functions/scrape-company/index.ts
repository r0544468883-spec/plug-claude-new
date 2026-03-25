import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Validate URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http')) formattedUrl = `https://${formattedUrl}`;
    try { new URL(formattedUrl); } catch { return new Response(JSON.stringify({ error: 'Invalid URL' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }

    const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY');
    if (!CLAUDE_API_KEY) throw new Error('CLAUDE_API_KEY not configured');

    // Try Firecrawl first
    let pageContent = '';
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    
    if (FIRECRAWL_API_KEY) {
      try {
        const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${FIRECRAWL_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: formattedUrl, formats: ['markdown'], onlyMainContent: true, waitFor: 3000 }),
        });
        const data = await res.json();
        if (res.ok && data.success && data.data?.markdown) {
          pageContent = data.data.markdown.substring(0, 30000);
        }
      } catch (e) { console.error('Firecrawl error:', e); }
    }

    // Fallback to basic fetch
    if (!pageContent) {
      try {
        const res = await fetch(formattedUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        });
        pageContent = await res.text();
        pageContent = pageContent.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').substring(0, 30000);
      } catch (e) { console.error('Fetch error:', e); }
    }

    if (!pageContent) {
      return new Response(JSON.stringify({ error: 'Could not fetch page content' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('Page content length:', pageContent.length);
    console.log('Page content preview:', pageContent.substring(0, 500));

    // Use AI to extract company info (via Claude API)
    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        system: 'You are a data extraction assistant. Always respond with valid JSON only. Never use markdown code blocks. Never add any explanation. Return ONLY valid JSON, no markdown, no code blocks.',
        messages: [
          {
            role: 'user',
            content: `Extract company information from the following webpage content and return a JSON object with these exact fields:
- name: the company name (string)
- description: 2-3 sentence company description (string)
- industry: the industry/sector (string)
- tech_stack: array of technologies mentioned (array of strings)
- lead_status: "active" if actively hiring, "lead" if general info, "cold" if outdated (string)
- logo_url: logo image URL if found (string or null)

Return ONLY the JSON object. No markdown, no code fences, no explanation.

Webpage URL: ${formattedUrl}
Webpage content:
${pageContent.substring(0, 20000)}`
          }
        ],
        max_tokens: 800,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errText);
      throw new Error(`AI API failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI raw response:', JSON.stringify(aiData).substring(0, 500));
    const content = aiData.content?.[0]?.text || '';
    console.log('AI content:', content.substring(0, 500));

    // Parse JSON from response — try direct parse first, then regex extraction
    let company: any = {};
    try {
      // First try direct JSON parse (works when response_format is json_object)
      company = JSON.parse(content);
    } catch {
      try {
        // Fallback: extract JSON from possible markdown wrapping
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          company = JSON.parse(jsonMatch[0]);
        }
      } catch (e2) {
        console.error('Failed to parse AI response:', content);
      }
    }

    console.log('Extracted company:', JSON.stringify(company));

    return new Response(JSON.stringify({ company, source_url: formattedUrl }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
