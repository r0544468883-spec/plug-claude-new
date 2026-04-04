import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userContext, recentJobs, jobTitle, companyName, language, baseTips } = await req.json();

    const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY');
    if (!CLAUDE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isHe = language === 'he';

    // Build user context string
    const contextParts: string[] = [];

    if (userContext?.bio) contextParts.push(`Bio: ${userContext.bio}`);
    if (userContext?.summary) contextParts.push(`CV Summary: ${userContext.summary}`);
    if (userContext?.experienceYears) contextParts.push(`Years of experience: ${userContext.experienceYears}`);

    if (userContext?.experience?.length > 0) {
      const expStr = userContext.experience
        .map((e: any) => `${e.title || e.position || ''} at ${e.company || ''} (${e.duration || e.startDate || ''})`)
        .filter(Boolean)
        .join('; ');
      if (expStr) contextParts.push(`Work experience: ${expStr}`);
    }

    if (userContext?.skills?.length > 0) {
      const skillNames = userContext.skills.map((s: any) =>
        typeof s === 'string' ? s : s.name || s.skill || ''
      ).filter(Boolean);
      if (skillNames.length) contextParts.push(`Skills: ${skillNames.join(', ')}`);
    }

    if (recentJobs?.length > 0) {
      const jobsStr = recentJobs.map((j: any) => `${j.title}${j.company ? ` at ${j.company}` : ''}`).join(', ');
      contextParts.push(`Recently applied to: ${jobsStr}`);
    }

    const userContextStr = contextParts.length > 0
      ? contextParts.join('\n')
      : (isHe ? 'פרטי המשתמש לא זמינים' : 'User profile data not available');

    const targetJobStr = [
      jobTitle ? `Target role: ${jobTitle}` : '',
      companyName ? `Target company: ${companyName}` : '',
    ].filter(Boolean).join('\n') || (isHe ? 'תפקיד לא צוין' : 'No specific role specified');

    // If baseTips provided, personalize them; otherwise generate from scratch
    const hasBaseTips = Array.isArray(baseTips) && baseTips.length > 0;

    const baseTipsStr = hasBaseTips
      ? baseTips.map((t: any, i: number) => `${i + 1}. "${t.title}" — ${t.description}`).join('\n')
      : '';

    const systemPrompt = isHe
      ? hasBaseTips
        ? `אתה מאמן קריירה מומחה ומנוסה בהכנה לראיונות עבודה.
קיבלת רשימה של טיפים כלליים לראיון עבודה. תפקידך להתאים אותם אישית למועמד הספציפי הזה.

כללים חשובים:
- התאם כל טיפ לניסיון, כישורים ורקע המועמד
- השתמש בפרטים אמיתיים מהקורות חיים שלו (שמות חברות, תפקידים, כישורים)
- הפוך טיפים גנריים לספציפיים. לדוגמה: במקום "הדגש הישגים" → "ספר על איך הובלת את פרויקט X ב-[חברה] והשגת Y"
- אם אין מספיק מידע על המועמד, שמור על הטיפ הכללי אבל הוסף הקשר רלוונטי
- שמור על הכותרת הקצרה (עד 5 מילים), אבל שנה את התיאור להיות אישי
- החזר בדיוק את אותו מספר טיפים שקיבלת

החזר JSON בלבד בפורמט הזה (ללא markdown, ללא הסברים):
{
  "tips": [
    {"title": "כותרת קצרה", "description": "2-3 משפטים ספציפיים ומותאמים אישית"}
  ]
}`
        : `אתה מאמן קריירה מומחה ומנוסה בהכנה לראיונות עבודה.
תפקידך לייצר 6 טיפים מותאמים אישית לראיון עבודה, בהתבסס על הפרופיל וניסיון המשתמש.
כל טיפ חייב להיות ספציפי, מעשי, ומתבסס על הנתונים האמיתיים של המשתמש.

החזר JSON בלבד בפורמט הזה (ללא markdown, ללא הסברים):
{
  "tips": [
    {"title": "כותרת קצרה", "description": "2-3 משפטים ספציפיים ומעשיים"}
  ]
}

הנחיות:
- הדגש חוזקות ספציפיות מהניסיון של המשתמש
- תן המלצות איך לספר על ניסיון בצורה שמתאימה לתפקיד הרצוי
- הצע אסטרטגיות לגשר על פערים אפשריים
- המלץ על דוגמאות קונקרטיות מהקורות חיים לשתף בראיון
- כל טיפ בעברית, ספציפי ומדויק`
      : hasBaseTips
        ? `You are an expert career coach specializing in interview preparation.
You received a list of general interview tips. Your job is to personalize them for this specific candidate.

Important rules:
- Tailor each tip to the candidate's experience, skills, and background
- Use real details from their CV (company names, roles, skills)
- Transform generic tips into specific ones. Example: instead of "Highlight achievements" → "Talk about how you led project X at [Company] and achieved Y"
- If there isn't enough info about the candidate, keep the general tip but add relevant context
- Keep titles short (up to 5 words), but change the description to be personal
- Return exactly the same number of tips you received

Return ONLY JSON in this format (no markdown, no explanations):
{
  "tips": [
    {"title": "Short title", "description": "2-3 specific, personalized sentences"}
  ]
}`
        : `You are an expert career coach specializing in interview preparation.
Generate 6 personalized interview tips based on the user's actual profile and experience.
Each tip must be specific, actionable, and reference the user's real background.

Return ONLY JSON in this format (no markdown, no explanations):
{
  "tips": [
    {"title": "Short title", "description": "2-3 specific, actionable sentences"}
  ]
}

Guidelines:
- Highlight specific strengths from their experience
- Advise how to frame their experience for the target role
- Suggest strategies to address any potential gaps
- Recommend concrete examples from their CV to share
- Make each tip specific and directly relevant to their situation`;

    const userPrompt = hasBaseTips
      ? `User Profile:\n${userContextStr}\n\n${targetJobStr}\n\nGeneral tips to personalize:\n${baseTipsStr}\n\nPersonalize each tip for this candidate using their real experience and background.`
      : `User Profile:\n${userContextStr}\n\n${targetJobStr}\n\nGenerate 6 personalized interview preparation tips.`;

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
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.content?.[0]?.text || '';

    let tips: any[];
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        tips = JSON.parse(jsonMatch[0]).tips || [];
      } else {
        tips = JSON.parse(content).tips || [];
      }
    } catch {
      console.error('Failed to parse tips response:', content);
      tips = isHe ? [
        { title: 'השתמש בשיטת STAR', description: 'לכל שאלה התנהגותית, ענה עם Situation, Task, Action, Result. זה מראה חשיבה מסודרת ומשכנעת.' },
        { title: 'הדגש הישגים מספרתיים', description: 'במקום לומר "שיפרתי ביצועים", אמור "הפחתתי זמן עיבוד ב-30%". מספרים עושים רושם.' },
        { title: 'חקור את החברה', description: 'הכר את המוצרים, הערכים, האתגרים האחרונים. שלב מידע זה בתשובותיך.' },
        { title: 'הכן שאלות חכמות', description: 'הכן 3-5 שאלות שמראות עניין עמוק בתפקיד ובחברה.' },
        { title: 'תרגל בקול', description: 'אמור את התשובות בקול רם, לא רק בראש. זה חושף ניסוחים מסורבלים ובונה ביטחון.' },
        { title: 'סיים בחוזק', description: 'בסיום הראיון, חזור על הסיבות למה אתה המועמד הנכון ובקש בבירור את הצעד הבא.' },
      ] : [
        { title: 'Use the STAR Method', description: 'Structure behavioral answers with Situation, Task, Action, Result. It shows clear, organized thinking.' },
        { title: 'Quantify Your Achievements', description: 'Instead of "improved performance", say "reduced processing time by 30%". Numbers make a strong impression.' },
        { title: 'Research the Company', description: 'Know their products, values, recent challenges. Weave this knowledge into your answers.' },
        { title: 'Prepare Smart Questions', description: 'Have 3-5 thoughtful questions ready that show genuine interest in the role and company.' },
        { title: 'Practice Out Loud', description: 'Say your answers aloud, not just in your head. It reveals awkward phrasing and builds confidence.' },
        { title: 'Close Strong', description: 'Recap why you\'re the right fit and clearly ask about next steps.' },
      ];
    }

    return new Response(
      JSON.stringify({ tips: tips.filter((t: any) => t.title && t.description) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating tips:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate tips. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
