import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { jobTitle, companyName, jobDescription, language } = await req.json();

    if (!jobTitle) {
      return new Response(
        JSON.stringify({ error: 'Job title is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY');
    if (!CLAUDE_API_KEY) {
      console.error('CLAUDE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error: CLAUDE_API_KEY not set' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isHebrew = language === 'he';

    // Build prompt for generating interview questions
    const systemPrompt = isHebrew
      ? `אתה מומחה גיוס עם ניסיון רב בראיונות עבודה. עליך ליצור שאלות ראיון מקצועיות ורלוונטיות.
         צור 8 שאלות ראיון עבור תפקיד "${jobTitle}"${companyName ? ` בחברת ${companyName}` : ''}.
         חלק את השאלות ל-3 קטגוריות: behavioral (התנהגותי), technical (טכני), situational (סיטואציוני).
         לכל שאלה, הוסף טיפ קצר למועמד.
         החזר JSON עם מערך questions שכל אובייקט מכיל: id, question, category, tip.`
      : `You are an expert recruiter with extensive interview experience. Create professional, relevant interview questions.
         Generate 8 interview questions for a "${jobTitle}" position${companyName ? ` at ${companyName}` : ''}.
         Divide questions into 3 categories: behavioral, technical, situational.
         For each question, add a brief tip for the candidate.
         Return JSON with a questions array where each object has: id, question, category, tip.`;

    const userPrompt = jobDescription 
      ? `Job Description:\n${jobDescription}\n\nGenerate questions based on this description.`
      : `Generate general questions for this role.`;

    console.log(`Generating questions for: ${jobTitle}${companyName ? ` at ${companyName}` : ''}`);

    // Call Claude API
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
        messages: [
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded, please try again later' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.content?.[0]?.text;

    if (!content) {
      console.error('No content in AI response:', aiResponse);
      throw new Error('No content in AI response');
    }

    console.log('AI response received, parsing...');

    const fallbackQuestions = [
      { id: '1', question: isHebrew ? 'ספר לי על עצמך ועל הניסיון שלך הרלוונטי לתפקיד' : `Tell me about yourself and your experience relevant to the ${jobTitle} role`, category: 'behavioral', tip: isHebrew ? 'התמקד ב-3 נקודות חוזק רלוונטיות' : 'Focus on 3 relevant strengths' },
      { id: '2', question: isHebrew ? 'מהן החוזקות העיקריות שלך?' : 'What are your main strengths?', category: 'behavioral', tip: isHebrew ? 'תן דוגמאות קונקרטיות ומספרים' : 'Give concrete examples with numbers' },
      { id: '3', question: isHebrew ? 'תאר מצב שבו נאלצת להתמודד עם לחץ — מה עשית?' : 'Describe a situation where you had to work under pressure — what did you do?', category: 'situational', tip: isHebrew ? 'השתמש בשיטת STAR' : 'Use the STAR method' },
      { id: '4', question: isHebrew ? 'למה אתה רוצה לעבוד בתפקיד זה?' : `Why do you want this ${jobTitle} position?`, category: 'behavioral', tip: isHebrew ? 'חבר בין המטרות שלך לתפקיד' : 'Connect your goals to the role' },
      { id: '5', question: isHebrew ? 'תאר אתגר מקצועי משמעותי שפתרת' : 'Describe a significant professional challenge you solved', category: 'technical', tip: isHebrew ? 'הדגש את תהליך החשיבה שלך' : 'Emphasize your thinking process' },
      { id: '6', question: isHebrew ? 'איפה אתה רואה את עצמך בעוד 3 שנים?' : 'Where do you see yourself in 3 years?', category: 'behavioral', tip: isHebrew ? 'הראה שאפתנות אבל ריאליסטית' : 'Show ambition but be realistic' },
      { id: '7', question: isHebrew ? 'תאר מצב שבו עבדת בצוות — מה היה תפקידך?' : 'Describe a time you worked in a team — what was your role?', category: 'situational', tip: isHebrew ? 'הדגש שיתוף פעולה וממשקים' : 'Highlight collaboration and communication' },
      { id: '8', question: isHebrew ? 'מה מעניין אותך במיוחד בחברה שלנו?' : `What interests you most about working here?`, category: 'behavioral', tip: isHebrew ? 'חקור את החברה מראש' : 'Research the company beforehand' },
    ];

    let questions: any[] = [];
    try {
      // Extract JSON object from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const raw = jsonMatch ? jsonMatch[0] : content;
      const parsed = JSON.parse(raw);

      // Handle both { questions: [...] } and direct array
      if (Array.isArray(parsed)) {
        questions = parsed;
      } else if (Array.isArray(parsed.questions)) {
        questions = parsed.questions;
      } else {
        // Try to get values if it's an object of objects
        const vals = Object.values(parsed);
        if (vals.length > 0 && typeof vals[0] === 'object') {
          questions = vals as any[];
        }
      }
    } catch (e) {
      console.error('Failed to parse AI response:', content?.slice(0, 200));
    }

    // Normalize structure
    questions = questions
      .map((q: any, index: number) => ({
        id: q.id || String(index + 1),
        question: q.question || q.text || q.content || '',
        category: q.category || 'behavioral',
        tip: q.tip || q.hint || '',
      }))
      .filter((q: any) => q.question && q.question.trim().length > 3);

    // Always guarantee at least the fallback questions
    if (questions.length === 0) {
      console.log('Using fallback questions');
      questions = fallbackQuestions;
    }

    console.log(`Generated ${questions.length} questions for ${jobTitle}`);

    return new Response(
      JSON.stringify({ questions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate questions: ' + (error?.message || 'unknown error') }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
