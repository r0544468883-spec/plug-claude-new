import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ok = (body: object) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { url, language } = await req.json();

    if (!url || !url.startsWith('http')) {
      return ok({ error: 'Invalid URL — must start with http/https' });
    }

    const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY');
    if (!CLAUDE_API_KEY) {
      return ok({ error: 'AI service not configured' });
    }

    // Fetch the URL content
    let pageText = '';
    try {
      const pageRes = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(8000),
      });

      if (!pageRes.ok) {
        return ok({ error: `Site returned HTTP ${pageRes.status} — the site may block automated access. Please paste the job description manually.` });
      }

      const html = await pageRes.text();

      pageText = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/&#\d+;/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim()
        .slice(0, 6000);

    } catch (fetchErr: any) {
      console.error('Failed to fetch URL:', fetchErr);
      const isTimeout = fetchErr.message?.includes('timeout') || fetchErr.name === 'TimeoutError';
      return ok({
        error: isTimeout
          ? 'Site did not respond in time (8s timeout). Please paste the job description manually.'
          : `Could not fetch URL: ${fetchErr.message}`,
      });
    }

    if (!pageText) {
      return ok({ error: 'Page content is empty — the site may load content dynamically. Please paste the job description manually.' });
    }

    const systemPrompt = `You are a job listing parser. Extract job details from web page text.
Return ONLY a JSON object with these fields (no markdown, no explanation):
{
  "jobTitle": "the job title/position name",
  "companyName": "the hiring company name",
  "jobDescription": "the job description, requirements and responsibilities (max 800 chars)"
}
If a field is not found, use an empty string "".`;

    const userPrompt = `Extract the job details from this page content:\n\n${pageText}`;

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        max_tokens: 800,
      }),
    });

    if (!claudeRes.ok) {
      return ok({ error: `AI service error: ${claudeRes.status}` });
    }

    const claudeData = await claudeRes.json();
    const content = claudeData.content?.[0]?.text || '';

    let extracted: { jobTitle: string; companyName: string; jobDescription: string };
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : { jobTitle: '', companyName: '', jobDescription: '' };
    } catch {
      extracted = { jobTitle: '', companyName: '', jobDescription: '' };
    }

    return ok({ success: true, ...extracted });

  } catch (error: any) {
    console.error('Error:', error);
    return ok({ error: `Failed to extract job details: ${error.message}` });
  }
});
