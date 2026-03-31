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
    const { question, answer, category, language, jobTitle, seniority } = await req.json();

    if (!question || !answer?.trim()) {
      return ok({ error: 'Question and answer are required' });
    }

    const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY');
    if (!CLAUDE_API_KEY) return ok({ error: 'Server configuration error' });

    const isHebrew = language === 'he';

    // Seniority calibration for scoring
    const seniorityExpectations: Record<string, { he: string; en: string }> = {
      junior:    { he: 'ג\'וניור (0-3 שנים): ציון 4 = דוגמה ספציפית אחת עם לפחות מטריקה אחת. אל תצפה לחשיבה מערכתית.',
                   en: 'Junior (0-3 years): score 4 = one specific example with at least one metric. Don\'t expect systems thinking.' },
      mid:       { he: 'מיד-לבל (4-8 שנים): ציון 4 = השפעה מדידה עם אלטרנטיבות ששקלת.',
                   en: 'Mid-level (4-8 years): score 4 = quantified impact with alternatives considered.' },
      senior:    { he: 'סניור (8-15 שנים): ציון 4 = חשיבה מערכתית עם השפעות עקיפות (second-order effects).',
                   en: 'Senior (8-15 years): score 4 = systems-level thinking with second-order effects.' },
      executive: { he: 'מנהל בכיר (15+): ציון 4 = השפעה ברמת העסק עם מודעות ל-P&L.',
                   en: 'Executive (15+): score 4 = business-level impact with P&L awareness.' },
    };
    const seniorityCtx = seniorityExpectations[seniority || 'mid'] || seniorityExpectations.mid;

    const systemPrompt = isHebrew
      ? `אתה מאמן ראיונות עבודה מקצועי. נתח את תשובת המועמד ב-5 ממדים.
         רמת ותק המועמד: ${seniorityCtx.he}

         החזר JSON בלבד עם המפתחות:
         - dimensions: אובייקט עם 5 ציונים (1-5 כל אחד):
           substance (תוכן — עומק וראיות), structure (מבנה — בהירות STAR), relevance (רלוונטיות — התאמה לשאלה), credibility (אמינות — מידת השכנוע), differentiation (ייחודיות — מה מבדיל את המועמד)
         - score (ממוצע כולל 1-10)
         - feedback (2-3 משפטים)
         - improvements (מערך של 2-3 הצעות קונקרטיות)
         - priorityMove (ההמלצה הכי חשובה לשיפור — משפט אחד)
         היה ספציפי ומעודד. דבר ישירות אל המועמד בגוף שני.`
      : `You are a professional interview coach. Analyze the candidate's answer across 5 dimensions.
         Candidate seniority: ${seniorityCtx.en}

         Return JSON ONLY with keys:
         - dimensions: object with 5 scores (1-5 each):
           substance (depth & evidence), structure (STAR clarity), relevance (question fit), credibility (believability & proof), differentiation (what makes this candidate unique)
         - score (overall average 1-10)
         - feedback (2-3 sentences)
         - improvements (array of 2-3 concrete suggestions)
         - priorityMove (the single most important recommendation — one sentence)
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
        max_tokens: 800,
      }),
    });

    const aiRes = await response.json();
    const content = aiRes.content?.[0]?.text;

    if (!content) return ok({ error: 'No AI response' });

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
      const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
      const dims = parsed.dimensions ?? {};
      return ok({
        score: typeof parsed.score === 'number' ? clamp(parsed.score, 1, 10) : 5,
        dimensions: {
          substance: clamp(dims.substance ?? 3, 1, 5),
          structure: clamp(dims.structure ?? 3, 1, 5),
          relevance: clamp(dims.relevance ?? 3, 1, 5),
          credibility: clamp(dims.credibility ?? 3, 1, 5),
          differentiation: clamp(dims.differentiation ?? 3, 1, 5),
        },
        feedback: parsed.feedback ?? '',
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
        priorityMove: parsed.priorityMove ?? '',
      });
    } catch {
      return ok({ score: 5, dimensions: { substance: 3, structure: 3, relevance: 3, credibility: 3, differentiation: 3 }, feedback: content, improvements: [], priorityMove: '' });
    }
  } catch (error: any) {
    return ok({ error: 'Failed to get feedback: ' + (error?.message ?? 'unknown') });
  }
});
