import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ok = (body: object) =>
  new Response(JSON.stringify(body), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { question, answer, category, language, jobTitle } = await req.json();

    if (!question || !answer?.trim()) {
      return ok({ error: 'Question and answer are required' });
    }

    const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY');
    if (!CLAUDE_API_KEY) return ok({ error: 'Server configuration error' });

    const isHebrew = language === 'he';

    const systemPrompt = isHebrew
      ? `אתה מאמן ראיונות עבודה מקצועי. נתח את תשובת המועמד ותן משוב קצר ומועיל.
         החזר JSON בלבד עם המפתחות: score (מספר 1-10), feedback (2-3 משפטים), improvements (מערך של 2-3 הצעות קונקרטיות לשיפור).
         היה ספציפי ומעודד. דבר ישירות אל המועמד בגוף שני.`
      : `You are a professional interview coach. Analyze the candidate's answer and give brief, helpful feedback.
         Return JSON ONLY with keys: score (number 1-10), feedback (2-3 sentences), improvements (array of 2-3 concrete improvement suggestions).
         Be specific and encouraging. Address the candidate directly in second person.`;

    const userPrompt = isHebrew
      ? `שאלת ראיון (${category || 'כללי'})${jobTitle ? ` לתפקיד ${jobTitle}` : ''}:
         "${question}"

         תשובת המועמד:
         "${answer}"`
      : `Interview question (${category || 'general'})${jobTitle ? ` for ${jobTitle} role` : ''}:
         "${question}"

         Candidate's answer:
         "${answer}"`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
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
        max_tokens: 600,
      }),
    });

    const aiRes = await response.json();
    const content = aiRes.content?.[0]?.text;

    if (!content) return ok({ error: 'No AI response' });

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
      return ok({
        score: typeof parsed.score === 'number' ? Math.min(10, Math.max(1, parsed.score)) : 5,
        feedback: parsed.feedback ?? '',
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
      });
    } catch {
      return ok({ score: 5, feedback: content, improvements: [] });
    }
  } catch (error: any) {
    return ok({ error: 'Failed to get feedback: ' + (error?.message ?? 'unknown') });
  }
});
