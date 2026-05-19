import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MAKE_WEBHOOK_URL = "https://hook.eu1.make.com/bo8q5pbu5uom4dn9q21xi8f1vc5fmjyb";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";

// LinkedIn posting (v2 ugcPosts API)
const LINKEDIN_API_URL = "https://api.linkedin.com/v2/ugcPosts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Topic definitions ──────────────────────────────────────────
interface TopicResult {
  topic: string;
  data: string;
  number?: string;
}

async function getJobsThisWeek(supabase: any): Promise<TopicResult> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase.from("jobs").select("*", { count: "exact", head: true }).gte("created_at", weekAgo);
  return { topic: "משרות חדשות השבוע", data: `${count || 0} משרות חדשות נוספו למערכת השבוע`, number: String(count || 0) };
}

async function getHottestFields(supabase: any): Promise<TopicResult> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: jobs } = await supabase.from("jobs").select("title").gte("created_at", weekAgo).limit(200);
  if (!jobs?.length) return { topic: "תחומים חמים", data: "אין מספיק נתונים השבוע" };

  const fields: Record<string, number> = {};
  const keywords: Record<string, string> = {
    "marketing": "שיווק", "sales": "מכירות", "development": "פיתוח", "product": "מוצר",
    "design": "עיצוב", "data": "דאטה", "hr": "משאבי אנוש", "finance": "פיננסים",
    "operations": "תפעול", "customer success": "הצלחת לקוח", "content": "תוכן",
    "growth": "צמיחה", "business development": "פיתוח עסקי",
  };
  for (const job of jobs) {
    const title = (job.title || "").toLowerCase();
    for (const [en, he] of Object.entries(keywords)) {
      if (title.includes(en)) fields[he] = (fields[he] || 0) + 1;
    }
  }
  const sorted = Object.entries(fields).sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (!sorted.length) return { topic: "תחומים חמים", data: "מגוון תחומים במערכת" };
  const top = sorted.map(([name, count]) => `${name} (${count})`).join(", ");
  return { topic: "התחומים הכי חמים", data: `התחומים הכי מבוקשים השבוע: ${top}`, number: String(sorted[0][1]) };
}

async function getRemoteVsOnsite(supabase: any): Promise<TopicResult> {
  const { data: jobs } = await supabase.from("jobs").select("title, description, location").limit(300);
  if (!jobs?.length) return { topic: "עבודה מרחוק", data: "אין מספיק נתונים" };
  let remote = 0, onsite = 0, hybrid = 0;
  for (const j of jobs) {
    const text = `${j.title} ${j.description || ""} ${j.location || ""}`.toLowerCase();
    if (text.includes("remote") || text.includes("מרחוק")) remote++;
    else if (text.includes("hybrid") || text.includes("היברידי")) hybrid++;
    else onsite++;
  }
  const total = remote + onsite + hybrid;
  const remotePct = total > 0 ? Math.round((remote / total) * 100) : 0;
  return { topic: "עבודה מרחוק", data: `${remotePct}% מהמשרות במערכת הן remote, ${Math.round((hybrid / total) * 100)}% היברידיות`, number: `${remotePct}%` };
}

async function getTopCities(supabase: any): Promise<TopicResult> {
  const { data: jobs } = await supabase.from("jobs").select("location").not("location", "is", null).limit(300);
  if (!jobs?.length) return { topic: "ערים מובילות", data: "אין מספיק נתונים" };
  const cities: Record<string, number> = {};
  const cityNames = ["tel aviv", "תל אביב", "jerusalem", "ירושלים", "haifa", "חיפה", "ramat gan", "רמת גן", "herzliya", "הרצליה", "petah tikva", "פתח תקווה", "beer sheva", "באר שבע", "netanya", "נתניה"];
  const hebrewMap: Record<string, string> = {
    "tel aviv": "תל אביב", "jerusalem": "ירושלים", "haifa": "חיפה",
    "ramat gan": "רמת גן", "herzliya": "הרצליה", "petah tikva": "פתח תקווה",
    "beer sheva": "באר שבע", "netanya": "נתניה",
    "תל אביב": "תל אביב", "ירושלים": "ירושלים", "חיפה": "חיפה",
    "רמת גן": "רמת גן", "הרצליה": "הרצליה", "פתח תקווה": "פתח תקווה",
    "באר שבע": "באר שבע", "נתניה": "נתניה",
  };
  for (const j of jobs) {
    const loc = (j.location || "").toLowerCase();
    for (const city of cityNames) {
      if (loc.includes(city)) {
        const heName = hebrewMap[city] || city;
        cities[heName] = (cities[heName] || 0) + 1;
        break;
      }
    }
  }
  const sorted = Object.entries(cities).sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (!sorted.length) return { topic: "ערים מובילות", data: "משרות מכל הארץ" };
  const top = sorted.map(([name, count]) => `${name} (${count} משרות)`).join(", ");
  return { topic: "הערים עם הכי הרבה משרות", data: top, number: String(sorted[0][1]) };
}

async function getApplicationsThisWeek(supabase: any): Promise<TopicResult> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase.from("applications").select("*", { count: "exact", head: true }).gte("created_at", weekAgo);
  return { topic: "הגשות השבוע", data: `${count || 0} הגשות מועמדות בוצעו השבוע דרך פלאג`, number: String(count || 0) };
}

async function getAvgApplicationsPerUser(supabase: any): Promise<TopicResult> {
  const { count: appCount } = await supabase.from("applications").select("*", { count: "exact", head: true });
  const { count: userCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });
  const avg = userCount && userCount > 0 ? Math.round(((appCount || 0) / userCount) * 10) / 10 : 0;
  return { topic: "ממוצע הגשות למועמד", data: `בממוצע כל מועמד שלנו הגיש ${avg} מועמדויות`, number: String(avg) };
}

async function getExtensionVsManual(supabase: any): Promise<TopicResult> {
  const { count: extCount } = await supabase.from("applications").select("*", { count: "exact", head: true }).eq("source", "extension");
  const { count: totalCount } = await supabase.from("applications").select("*", { count: "exact", head: true });
  const extPct = totalCount && totalCount > 0 ? Math.round(((extCount || 0) / totalCount) * 100) : 0;
  return { topic: "הגשות דרך התוסף", data: `${extPct}% מההגשות בוצעו אוטומטית דרך התוסף החכם שלנו`, number: `${extPct}%` };
}

async function getAvgMatchScore(supabase: any): Promise<TopicResult> {
  const { data: analyses } = await supabase.from("job_analyses").select("score").not("score", "is", null).limit(500);
  if (!analyses?.length) return { topic: "ציון התאמה", data: "עוד לא מספיק נתונים" };
  const avg = Math.round(analyses.reduce((s: number, a: any) => s + (a.score || 0), 0) / analyses.length);
  return { topic: "ציון התאמה ממוצע", data: `ציון ההתאמה הממוצע של המועמדים שלנו הוא ${avg}%`, number: `${avg}%` };
}

async function getAIAnalysesCount(supabase: any): Promise<TopicResult> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase.from("job_analyses").select("*", { count: "exact", head: true }).gte("created_at", weekAgo);
  return { topic: "ניתוחי AI השבוע", data: `ה-AI שלנו ניתח ${count || 0} משרות השבוע והתאים אותן למועמדים`, number: String(count || 0) };
}

// ── Tips & motivation (rotate daily) ──────────────────────────
function getDailyTip(): TopicResult {
  const tips = [
    "קורות חיים שמותאמים למשרה ספציפית מקבלים פי 3 יותר תשובות מקורות חיים גנריים",
    "רוב המשרות מתמלאות תוך 30 יום מפרסום. מי שמגיש ראשון, מרוויח",
    "הוסיפו מספרים לקורות החיים. לא כתבו סתם ניהלתי צוות, כתבו ניהלתי צוות של 8 אנשים",
    "80% מהמשרות לא מפורסמות בלוחות דרושים. נטוורקינג זה המפתח",
    "מכתב מקדים טוב לא מספר מי אתם. הוא מסביר למה דווקא אתם מתאימים למשרה הזו",
    "תעדכנו את הלינקדין כל חודש גם אם לא מחפשים עבודה. כשתחפשו זה כבר יהיה מוכן",
    "אל תגישו ל-50 משרות ביום. תגישו ל-5 משרות מותאמות. האיכות מנצחת",
  ];
  const dayIndex = Math.floor(Date.now() / (24 * 60 * 60 * 1000)) % tips.length;
  return { topic: "טיפ יומי לחיפוש עבודה", data: tips[dayIndex] };
}

function getMotivation(): TopicResult {
  const messages = [
    "חיפוש עבודה זה מרתון, לא ספרינט. כל דחייה מקרבת אתכם לכן הבא",
    "אתם לא מחפשים סתם עבודה. אתם מחפשים את המקום הנכון. זה לוקח זמן וזה בסדר",
    "כל ראיון, גם כזה שלא הסתיים בהצעה, הוא ניסיון שמחזק אתכם לראיון הבא",
    "לא מצאתם עדיין? זה לא אומר שאתם לא מספיק טובים. זה אומר שעוד לא הגעתם למקום שמתאים לכם",
    "הדבר הכי חשוב בחיפוש עבודה: לא להפסיק. הצעד הבא יכול להיות זה שמשנה הכל",
  ];
  const dayIndex = Math.floor(Date.now() / (24 * 60 * 60 * 1000)) % messages.length;
  return { topic: "מוטיבציה יומית", data: messages[dayIndex] };
}

function getDidYouKnow(): TopicResult {
  const facts = [
    "הממוצע בישראל הוא 3 חודשים לחיפוש עבודה בהייטק. אל תתייאשו אחרי שבועיים",
    "מגייסים מסתכלים על קורות חיים בממוצע 7 שניות. התחילו עם המידע הכי חשוב",
    "50% מהמועמדים לא עוברים סינון ראשוני בגלל שגיאות כתיב בקורות החיים",
    "הזמן הכי טוב לשלוח קורות חיים: ראשון עד שלישי בין 8 ל-10 בבוקר",
    "חברות בישראל מעדיפות מועמדים עם המלצות. בקשו מקולגות שיכתבו עליכם בלינקדין",
    "ענף ההייטק בישראל מעסיק כ-14% מכלל המועסקים ומייצר 25% מהתוצר",
  ];
  const dayIndex = Math.floor(Date.now() / (24 * 60 * 60 * 1000)) % facts.length;
  return { topic: "הידעתם?", data: facts[dayIndex] };
}

// ── All topic fetchers ──────────────────────────────────────────
const TOPIC_FETCHERS = [
  getJobsThisWeek,
  getHottestFields,
  getRemoteVsOnsite,
  getTopCities,
  getApplicationsThisWeek,
  getAvgApplicationsPerUser,
  getExtensionVsManual,
  getAvgMatchScore,
  getAIAnalysesCount,
  () => Promise.resolve(getDailyTip()),
  () => Promise.resolve(getMotivation()),
  () => Promise.resolve(getDidYouKnow()),
];

// ── Generate post text with AI ──────────────────────────────────
async function generatePostText(topicResult: TopicResult): Promise<string> {
  const prompt = `כתוב פוסט קצר לדף הפייסבוק של פלאג.

כללים חמורים:
- עברית בלבד. אסור להשתמש במילה אחת באנגלית. לא "remote", לא "AI", לא שום מילה לועזית. תמיד תרגם: ריחוק, בינה מלאכותית, וכו.
- 2-3 שורות בלבד לפני הסיומת. קצר.
- טון חברי וקליל, כמו חבר שמספר חדשות טובות. דבר ב"אנחנו" ו"שלנו".
- בלי אימוג'ים בכלל.
- בלי סימני קריאה מוגזמים. מקסימום אחד בכל הפוסט.
- בלי מילים מנופחות כמו: חדשני, פורץ דרך, ייחודי, מקיף, מרתק, מגוון.
- עברית תקינה ופשוטה. משפטים קצרים. בלי ניסוחים מסורבלים.

הנתון שצריך להופיע בפוסט: ${topicResult.data}

הפוסט חייב להסתיים בדיוק בשתי השורות האלה (בלי שינוי):
הצטרפו לפלאג, המערכת החברתית לחיפוש עבודה
www.plug-hr.com

תחזיר רק את הפוסט עצמו, בלי הסברים ובלי הערות.`;

  if (ANTHROPIC_API_KEY) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const text = data.content?.[0]?.text?.trim();
      if (text) return text;
    }
  }

  // Fallback: simple template
  return `${topicResult.data}\n\nהצטרפו לפלאג, המערכת החברתית לחיפוש עבודה\nwww.plug-hr.com`;
}

// ── Post to LinkedIn ────────────────────────────────────────────
async function postToLinkedIn(supabase: any, text: string): Promise<{ ok: boolean; error?: string }> {
  // Get the admin user's LinkedIn token (r0544468883@gmail.com)
  const { data: profile } = await supabase
    .from("profiles")
    .select("linkedin_access_token, linkedin_sub, linkedin_token_expires_at")
    .eq("email", "r0544468883@gmail.com")
    .single();

  if (!profile?.linkedin_access_token || !profile?.linkedin_sub) {
    return { ok: false, error: "No LinkedIn token found" };
  }

  // Check if token is expired
  if (profile.linkedin_token_expires_at && new Date(profile.linkedin_token_expires_at).getTime() < Date.now()) {
    return { ok: false, error: "LinkedIn token expired" };
  }

  const personUrn = `urn:li:person:${profile.linkedin_sub}`;

  const body = {
    author: personUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text },
        shareMediaCategory: "NONE",
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  const res = await fetch(LINKEDIN_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${profile.linkedin_access_token}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    return { ok: false, error: `LinkedIn API ${res.status}: ${errText}` };
  }

  return { ok: true };
}

// ── Main handler ────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Check for test mode (dry run — generate but don't publish)
    let testMode = false;
    try {
      const body = await req.json();
      testMode = body?.test === true;
    } catch { /* no body or not JSON */ }

    // ── Pause dates: skip auto-posting on these days ──
    const PAUSED_DATES = ["2026-05-18"];
    const todayStr = new Date().toISOString().slice(0, 10);
    if (!testMode && PAUSED_DATES.includes(todayStr)) {
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: `Paused for ${todayStr}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Pick today's topic (rotate through all 12)
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (24 * 60 * 60 * 1000));
    const topicIndex = dayOfYear % TOPIC_FETCHERS.length;
    const topicResult = await TOPIC_FETCHERS[topicIndex](supabase);

    // Generate post text
    const postText = await generatePostText(topicResult);

    // Post to Facebook via Make webhook
    let fbResult = "skipped";
    if (!testMode) {
      try {
        const fbRes = await fetch(MAKE_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({ caption: postText, link: "" }),
        });
        fbResult = fbRes.ok ? "sent" : `error: ${fbRes.status}`;
      } catch (e) {
        fbResult = `error: ${e}`;
      }
    }

    // Post to LinkedIn directly
    let liResult: { ok: boolean; error?: string } = { ok: false, error: "skipped" };
    if (!testMode) {
      liResult = await postToLinkedIn(supabase, postText);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        topic: topicResult.topic,
        topicIndex,
        postText,
        facebook: fbResult,
        linkedin: liResult,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
