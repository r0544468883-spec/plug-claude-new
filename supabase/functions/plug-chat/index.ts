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
    
    // Create client with user's token
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
    
    const authenticatedUserId = authUser.id;
    console.log('Authenticated user for plug-chat:', authenticatedUserId);

    const { messages, context } = await req.json();

    // Fetch extension agent data to enrich chat context
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [{ data: extensionApps }, { data: agentControl }, { data: profileData }] = await Promise.all([
      supabaseClient
        .from('applications')
        .select('job_url, current_stage, match_score, created_at, notes')
        .eq('candidate_id', authenticatedUserId)
        .eq('source', 'extension')
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false })
        .limit(20),
      supabaseClient
        .from('extension_agent_control')
        .select('status, criteria, stats, last_updated')
        .eq('user_id', authenticatedUserId)
        .maybeSingle(),
      supabaseClient
        .from('profiles')
        .select('career_context')
        .eq('user_id', authenticatedUserId)
        .maybeSingle(),
    ]);
    const CLAUDE_API_KEY = Deno.env.get("CLAUDE_API_KEY");

    if (!CLAUDE_API_KEY) {
      throw new Error("CLAUDE_API_KEY is not configured");
    }

    // Build comprehensive system prompt based on context
    let systemPrompt = `אתה PLUG ⚡ — עוזר AI חכם של פלטפורמת PLUG Nexus AI לגיוס ו-HR.

## זיהוי משתמש:
אתה יודע את סוג המשתמש (job_seeker / freelance_hr / inhouse_hr / company_employee) ומתאים את התשובות בהתאם.

## יכולות — מחפש עבודה (job_seeker):
- חיפוש משרות והמלצות מותאמות (Match score)
- עזרה בכתיבת סיכום מקצועי וקורות חיים
- הכנה לראיונות עבודה (לפי חברה ותפקיד)
- ניתוח ציוני Match והסבר מפורט
- ביצוע Easy Apply — הפנה ל-⚡ Easy Apply button על כרטיס המשרה
- ניתוח Skill Gap — מה חסר + המלצות למידה
- תובנות שכר: Frontend 2yr=22K, 5yr=34K; Backend 2yr=24K, 5yr=38K (חציון ישראל)
- מעקב סטטוס מועמדויות
- ניהול Job Alerts
- כתיבת הודעות follow-up ובקשות Vouch
- הצגת דוחות: מועמדויות, פעילות, skills, ראיונות, שכר, vouches, קרדיטים, התאמה לשוק
- ניהול קרדיטים — יתרה, עלויות, הרווחה

## יכולות — HR / מגייס (freelance_hr / inhouse_hr):
- חיפוש מועמדים (Match score)
- יצירת ראיונות וידאו + 5 שאלות (פתוחות/situational/technical/behavioral)
- יצירת Scorecards: 6-8 קריטריונים עם name/description/weight
- כתיבת תיאורי משרות (JD)
- יצירת Knockout Questions
- יצירת מבחנים (behavioral, technical, situational)
- Email Sequences עם {{candidate_name}}, {{job_title}}, {{company_name}}
- ניהול הצעות עבודה, CRM, Missions, Talent Pool, Approval Workflows
- סיכום הערות צוות על מועמדים
- ייבוא פרופילים מ-LinkedIn
- דוחות: גיוס חודשי, pipeline, מקורות, מועמדים, משרות, missions, CRM, הכנסות

## יכולות — חברה (company_employee):
- ניהול Career Site, Pipeline, Vouches, Blind Hiring
- ניהול Onboarding של עובדים חדשים
- דוחות: משרות, מועמדים, career site, ראיונות, הצעות, vouches, DEI, חוויית מועמדים

## יכולות כלליות:
- הדרכה על המערכת, ניהול קרדיטים, Referrals, GDPR

## כוונות ספציפיות:
- "צור שאלות ראיון" → שאל על תפקיד, צור 5 שאלות מעורבות
- "תייצר scorecard ל-[role]" → 6-8 קריטריונים כ-JSON
- "תגיש אותי ל-..." → הפנה ל-⚡ Easy Apply button
- "מה השכר ל-[role]" → השב לפי נתוני שוק ישראל
- "תכתוב מייל [stage]" → subject + body בעברית עם placeholders
- "דוח" / "סטטיסטיקות" → הפנה ל-/reports + סכם 3 ממצאים
- "מה הסטטוס שלי" → סכם מועמדויות מה-context
- "מה הסטטוס של onboarding" → סכם progress

## דברים שאתה לא עושה:
- לא כותב תוכן שיווקי, פוסטים, מאמרים, בלוגים
- לא מנהל קהילות
- אל תציע דברים שלא קיימים במערכת

## סגנון:
- דבר בעברית תמיד (חוץ ממונחים טכניים)
- היה ישיר, מועיל, ותכליתי
- ⚡ = החתימה שלך
- Plug tip ⚡: לפני תובנות; Hot take: לפני פידבק ישיר
- השתמש ב-emoji אסטרטגית
- כשמציג נתונים — ציין מקור (מאיזו טבלה/דוח)`;


    // Negotiation Sandbox mode
    if (context?.mode === 'negotiation_sandbox') {
      systemPrompt = `You are a hiring manager in a salary negotiation simulation. The user is practicing negotiation skills.

## Rules:
- Play the role of a friendly but firm hiring manager
- Start with a reasonable offer and respond to the user's counter-offers
- Push back sometimes but be open to good arguments
- After 5-6 exchanges, provide feedback on the user's negotiation tactics
- Be realistic about market rates
- Mirror the user's language (English/Hebrew)
- Keep responses concise and professional

## Feedback Areas:
- Anchoring strategy
- Use of data/research
- Confidence level
- Win-win framing
- Knowing when to accept

Start by presenting an initial offer and let the user negotiate.`;
    }

    // Add application context if provided (for application-specific chats)
    if (context?.jobTitle || context?.companyName) {
      systemPrompt += `\n\n📌 Current Application Context:
- Position: ${context.jobTitle || 'Not specified'}
- Company: ${context.companyName || 'Not specified'}
- Location: ${context.location || 'Not specified'}
- Job Type: ${context.jobType || 'Not specified'}
- Status: ${context.status || 'Not specified'}
${context.matchScore ? `- Match Score: ${context.matchScore}%` : ''}`;
    }

    // Add resume context if provided
    if (context?.resumeSummary) {
      systemPrompt += `\n\n📄 User's Resume Summary:
${JSON.stringify(context.resumeSummary, null, 2)}`;
    }

    // Add user's applications data
    if (context?.applications && context.applications.length > 0) {
      systemPrompt += `\n\n📋 User's Job Applications (${context.applications.length} total):`;
      context.applications.slice(0, 10).forEach((app: any, index: number) => {
        systemPrompt += `
${index + 1}. ${app.jobTitle} at ${app.company}
   - Status: ${app.status || 'active'}, Stage: ${app.stage || 'applied'}
   - Location: ${app.location || 'N/A'}, Type: ${app.jobType || 'N/A'}
   ${app.matchScore ? `- Match Score: ${app.matchScore}%` : ''}
   - Applied: ${new Date(app.appliedAt).toLocaleDateString()}`;
      });
      if (context.applications.length > 10) {
        systemPrompt += `\n   ... and ${context.applications.length - 10} more applications`;
      }
    }

    // Add upcoming interviews
    if (context?.upcomingInterviews && context.upcomingInterviews.length > 0) {
      systemPrompt += `\n\n📅 Upcoming Interviews:`;
      context.upcomingInterviews.forEach((interview: any, index: number) => {
        const date = new Date(interview.date);
        systemPrompt += `
${index + 1}. ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
   - Type: ${interview.type || 'General'}
   - Location: ${interview.location || 'TBD'}
   ${interview.notes ? `- Notes: ${interview.notes}` : ''}`;
      });
    }

    // Add vouches summary
    if (context?.vouches) {
      systemPrompt += `\n\n⭐ User's Endorsements (Vouches):
- Total Vouches: ${context.vouches.total}
- Types: ${Object.entries(context.vouches.types).map(([type, count]) => `${type}: ${count}`).join(', ')}
${context.vouches.skills?.length > 0 ? `- Skills mentioned: ${context.vouches.skills.join(', ')}` : ''}`;
    }

    // Career Data Foundation — inject user's personal career context
    const careerContext = (profileData as any)?.career_context;
    if (careerContext && careerContext.trim()) {
      systemPrompt += `\n\n🎯 Career Data Foundation — מה המשתמש מחפש (רקע אישי שסיפק):
${careerContext.trim()}

השתמש בנתונים אלה כהקשר ראשי לכל תשובה. התאם המלצות, ניתוח משרות, וכתיבת קורות חיים לפי המידע הזה.`;
    }

    // Extension agent context
    if (agentControl) {
      const stats = agentControl.stats as Record<string, unknown> ?? {};
      systemPrompt += `\n\n🤖 Extension Agent Status:
- Status: ${agentControl.status}
- Today applied via extension: ${(extensionApps ?? []).length} jobs
- Total scanned this session: ${stats.totalScanned ?? 0}
- Total applied this session: ${stats.totalApplied ?? 0}
- Last updated: ${agentControl.last_updated ? new Date(agentControl.last_updated).toLocaleTimeString('he-IL') : 'N/A'}`;

      if ((extensionApps ?? []).length > 0) {
        systemPrompt += `\n\nJobs applied today via extension:`;
        (extensionApps ?? []).slice(0, 10).forEach((app: Record<string, unknown>, i: number) => {
          systemPrompt += `\n${i + 1}. Score: ${app.match_score ?? 'N/A'}% | Stage: ${app.current_stage} | ${app.job_url ?? ''}`;
        });
      }
    }

    // ── Multi-Agent Intent Routing ────────────────────────────────────────────
    // Detect specialized intent from the last user message and inject a
    // focused sub-agent persona so Claude acts as the right specialist.
    const lastUserMsg = (messages as Array<{ role: string; content: string }>)
      .filter(m => m.role === 'user')
      .slice(-1)[0]?.content?.toLowerCase() ?? '';

    type Intent = 'resume_tailor' | 'interview_prep' | 'salary_negotiation' | 'outreach' | 'general';

    function detectIntent(msg: string): Intent {
      if (/קורות חיים|ats|resume|tailor|bullet|סיכום מקצועי|cv|מילות מפתח/.test(msg)) return 'resume_tailor';
      if (/ראיון|interview|star|שאלות ראיון|behavioral|situational|הכנה לראיון/.test(msg)) return 'interview_prep';
      if (/שכר|salary|negotiat|compensation|תשלום|משכורת|העלאה|counter|offer/.test(msg)) return 'salary_negotiation';
      if (/הודעה|message|linkedin|recruiter|מגייס|follow.?up|reach out|פנייה|אימייל/.test(msg)) return 'outreach';
      return 'general';
    }

    const intent = context?.mode === 'negotiation_sandbox' ? 'general' : detectIntent(lastUserMsg);

    const SUB_AGENT_PROMPTS: Record<Exclude<Intent, 'general'>, string> = {
      resume_tailor: `
## 📄 מצב פעיל: Resume Tailor Agent
אתה עכשיו ה-Resume Tailor של PLUG — מומחה ATS ושכתוב קורות חיים.
כללים עבור תגובה זו:
- נתח כל JD לפי: דרישות חובה / יתרון / keywords ATS
- כתוב bullets שמתחילים בפועל חזק ומכילים מדד מספרי (%, $, X users)
- ציין ציון ATS (0-100) אם רלוונטי
- הצג: matched keywords ✅, missing keywords ❌, suggestions 💡
- Format: markdown עם sections ברורים`,

      interview_prep: `
## 🎯 מצב פעיל: Interview Prep Agent
אתה עכשיו ה-Interview Coach של PLUG — מומחה הכנה לראיונות.
כללים עבור תגובה זו:
- שאל תפקיד + חברה אם לא ידוע
- צור שאלות מסוג: behavioral (STAR), situational, technical, culture-fit
- עבור כל שאלה — הצג: "מה הם בודקים" + "תשובה מדגמית בפורמט STAR"
- הוסף: Situation → Task → Action → Result + impact
- Tips לשפת גוף ונוכחות אם רלוונטי`,

      salary_negotiation: `
## 💰 מצב פעיל: Salary Negotiation Agent
אתה עכשיו ה-Negotiation Coach של PLUG — מומחה משא ומתן שכר.
כללים עבור תגובה זו:
- השב לפי נתוני שוק ישראל עדכניים (Frontend 2yr=22K, 5yr=34K; Backend 2yr=24K, 5yr=38K; PM 3yr=30K)
- הצג 3 אסטרטגיות: anchor גבוה / win-win framing / silent pause technique
- כתוב script מוכן לשיחה: email + phone + counter-offer
- הזהר ממלכודות נפוצות: לקבל offer ראשון, לא לבקש הטבות, deadline pressure`,

      outreach: `
## ✉️ מצב פעיל: Outreach Agent
אתה עכשיו ה-Outreach Specialist של PLUG — מומחה פנייה למגייסים ו-networking.
כללים עבור תגובה זו:
- כתוב הודעות קצרות (under 150 words) עם subject line מושך
- פורמט: hook personalisé → value prop → CTA ברור
- הצע וריאציות: LinkedIn DM / email / follow-up
- טיפ: אל תבקש "קפה" — בקש "15 דקות" עם agenda ספציפי
- כלול: {{first_name}}, {{company}}, {{role}} placeholders`,
    };

    if (intent !== 'general' && SUB_AGENT_PROMPTS[intent]) {
      systemPrompt += SUB_AGENT_PROMPTS[intent];
      console.log(`[plug-chat] Routed to sub-agent: ${intent}`);
    }
    // ─────────────────────────────────────────────────────────────────────────

    console.log("Plug context loaded:", {
      hasResume: !!context?.resumeSummary,
      applicationsCount: context?.applications?.length || 0,
      interviewsCount: context?.upcomingInterviews?.length || 0,
      vouchesCount: context?.vouches?.total || 0,
    });

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        system: systemPrompt,
        messages: messages,
        max_tokens: 2048,
        stream: true,
      }),
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error("Claude API error:", claudeResponse.status, errorText);

      let parsedError = '';
      try { parsedError = JSON.parse(errorText)?.error?.message || ''; } catch { /* ignore */ }

      if (claudeResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (claudeResponse.status === 401) {
        return new Response(JSON.stringify({ error: "Claude API key is invalid or expired. Contact admin." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (claudeResponse.status === 400) {
        return new Response(JSON.stringify({ error: `Claude API rejected the request: ${parsedError || 'bad request'}` }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (claudeResponse.status === 529 || claudeResponse.status === 503) {
        return new Response(JSON.stringify({ error: "Claude API is temporarily overloaded. Try again in a moment." }), {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `AI service error (${claudeResponse.status}): ${parsedError || 'unknown error'}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Transform Claude SSE format → OpenAI SSE format (for client compatibility)
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const reader = claudeResponse.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            let newlineIndex: number;
            while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
              const line = buffer.slice(0, newlineIndex).trim();
              buffer = buffer.slice(newlineIndex + 1);

              if (!line.startsWith("data: ")) continue;

              const jsonStr = line.slice(6);
              try {
                const event = JSON.parse(jsonStr);
                if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
                  const chunk = JSON.stringify({ choices: [{ delta: { content: event.delta.text } }] });
                  controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
                } else if (event.type === "message_stop") {
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                }
              } catch {
                // skip malformed JSON
              }
            }
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("plug-chat error:", errMsg);

    // Return descriptive error so the client can show it
    if (errMsg.includes('CLAUDE_API_KEY') || errMsg.includes('not configured')) {
      return new Response(JSON.stringify({ error: "CLAUDE_API_KEY is not configured on the server. Contact admin." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: `Chat service error: ${errMsg}` }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
