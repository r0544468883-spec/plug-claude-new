import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64url } from "https://deno.land/std@0.190.0/encoding/base64url.ts";

// ============================================================
// PLUG Interview Prep Email — runs daily at 08:30 Israel time
// Finds users with interviews TODAY and sends a prep reminder
// Sources: interview_reminders, schedule_tasks, application_emails
// ============================================================

const GOOGLE_CLIENT_ID     = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL              = Deno.env.get("APP_URL") || "https://www.plug-hr.com";
const SYSTEM_SENDER_EMAIL  = Deno.env.get("SYSTEM_SENDER_EMAIL") || "plug.hotjobs@gmail.com";

// ── Types ────────────────────────────────────────────────────────

interface InterviewToday {
  userId: string;
  email: string;
  fullName: string;
  jobTitle: string;
  companyName: string;
  interviewTime: string | null; // HH:MM or null
  interviewType: "phone" | "frontal"; // phone = phone_screen/hr_interview, frontal = everything else
  applicationId: string | null;
  source: "reminder" | "schedule" | "email";
  isHebrew: boolean;
}

// ── Gmail helpers ────────────────────────────────────────────────

async function refreshGmailToken(refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Gmail refresh failed: ${await res.text()}`);
  const { access_token } = await res.json();
  return access_token;
}

async function sendEmail(
  accessToken: string,
  fromEmail: string,
  toEmail: string,
  subject: string,
  bodyHtml: string
): Promise<void> {
  const subjectEncoded = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const rawMessage = [
    `From: =?UTF-8?B?${btoa(unescape(encodeURIComponent("פלאג")))}?= <${fromEmail}>`,
    `To: ${toEmail}`,
    `Subject: ${subjectEncoded}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
    ``,
    bodyHtml,
  ].join("\r\n");

  const encoded = base64url(new TextEncoder().encode(rawMessage));
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: encoded }),
    }
  );
  if (!res.ok) throw new Error(`Gmail send failed: ${await res.text()}`);
}

// ── Determine interview type ─────────────────────────────────────

const PHONE_TYPES = new Set([
  "phone", "phone_screen", "hr_interview", "hr", "screening",
  "phone_call", "telephone", "טלפוני", "סינון טלפוני",
]);

function classifyInterview(rawType: string | null | undefined): "phone" | "frontal" {
  if (!rawType) return "frontal";
  const lower = rawType.toLowerCase().trim();
  if (PHONE_TYPES.has(lower)) return "phone";
  if (lower.includes("phone") || lower.includes("טלפו")) return "phone";
  return "frontal";
}

// ── Email template ───────────────────────────────────────────────

function buildPrepEmail(interview: InterviewToday): string {
  const isPhone = interview.interviewType === "phone";
  const isHe = interview.isHebrew;

  // Always use production URL — never Vercel preview
  const baseUrl = "https://www.plug-hr.com";

  // Deep links
  const chatPrepUrl = `${baseUrl}/dashboard?section=chat&prepFor=${encodeURIComponent(interview.companyName || interview.jobTitle)}`;
  const interviewPrepUrl = `${baseUrl}/interview-prep${interview.applicationId ? `?app=${interview.applicationId}` : `?company=${encodeURIComponent(interview.companyName)}&role=${encodeURIComponent(interview.jobTitle)}`}`;
  const ctaUrl = isPhone ? chatPrepUrl : interviewPrepUrl;

  // Time display
  const timeStr = interview.interviewTime
    ? (isHe ? `בשעה ${interview.interviewTime}` : `at ${interview.interviewTime}`)
    : "";

  // Content variants
  const emoji = isPhone ? "📞" : "🏢";
  const typeLabel = isPhone
    ? (isHe ? "שיחה טלפונית" : "phone screening")
    : (isHe ? "ראיון עבודה" : "job interview");

  const headline = isHe
    ? `${emoji} יש לך ${typeLabel} היום ${timeStr}`
    : `${emoji} You have a ${typeLabel} today ${timeStr}`;

  const jobLine = [interview.jobTitle, interview.companyName]
    .filter(Boolean)
    .join(isHe ? " ב-" : " at ");

  const subtitle = isHe
    ? `המשרה: ${jobLine}`
    : `Position: ${jobLine}`;

  const prepMessage = isPhone
    ? (isHe
        ? "בוא נתכונן ביחד לשיחה! פלאג יעזור לך עם נקודות מפתח, שאלות צפויות, ותשובות מנצחות."
        : "Let's prepare for the call together! PLUG can help with key talking points, expected questions, and winning answers.")
    : (isHe
        ? "בוא נתכונן ביחד לראיון! פלאג יכין לך שאלות מותאמות, טיפים לחברה הספציפית, ותרגול תשובות."
        : "Let's prepare for the interview! PLUG will generate tailored questions, company-specific tips, and answer practice.");

  const ctaText = isPhone
    ? (isHe ? "← התכונן לשיחה עם פלאג" : "Prepare for the call with PLUG →")
    : (isHe ? "← התכונן לראיון עם פלאג" : "Prepare for interview with PLUG →");

  const footerText = isHe
    ? "קיבלת מייל זה כי זוהה ראיון עבודה ביומן שלך. בהצלחה!"
    : "You received this email because an interview was detected in your schedule. Good luck!";

  const tipTitle = isPhone
    ? (isHe ? "💡 טיפ מהיר לשיחה טלפונית" : "Quick phone screen tip")
    : (isHe ? "💡 טיפ מהיר לראיון" : "Quick interview tip");

  const tipContent = isPhone
    ? (isHe
        ? "שיחה טלפונית ראשונית נמשכת בד\"כ 15-30 דקות. הכינו פתיח קצר על עצמכם (30 שניות), דעו למה אתם רוצים את התפקיד הזה, והכינו 2-3 שאלות למגייס."
        : "Phone screens typically last 15-30 minutes. Prepare a 30-second intro, know why you want this role, and have 2-3 questions ready for the recruiter.")
    : (isHe
        ? "הכירו את החברה — אתר, מוצר, חדשות אחרונות. הכינו סיפורים מניסיון העבר שמדגימים את הכישורים הרלוונטיים (שיטת STAR)."
        : "Research the company — website, product, recent news. Prepare stories from past experience that demonstrate relevant skills (STAR method).");

  // Hebrew emails are always RTL; English LTR
  const dir = isHe ? "rtl" : "ltr";
  const align = isHe ? "right" : "left";
  const brandName = isHe ? "פלאג" : "PLUG";
  const subLabel = isHe ? "הכנה לראיון" : "Interview Prep";

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${isHe ? "he" : "en"}">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body dir="${dir}" style="margin:0;padding:0;background:#0A1128;font-family:'Segoe UI',system-ui,sans-serif;color:#e2e8f0;direction:${dir};text-align:${align};">
  <div dir="${dir}" style="max-width:560px;margin:32px auto;background:#0f1f3d;border-radius:16px;border:1px solid #1e3a5f;overflow:hidden;direction:${dir};text-align:${align};">

    <!-- Header -->
    <div dir="${dir}" style="background:linear-gradient(135deg,#0a1840,#0d2855);padding:28px 32px;border-bottom:1px solid #1e3a5f;text-align:${align};">
      <div style="display:flex;align-items:center;gap:10px;direction:${dir};">
        <span style="background:#00FF9D;color:#0A1128;font-weight:900;font-size:18px;padding:4px 10px;border-radius:8px;">${brandName}</span>
        <span style="color:#8899aa;font-size:13px;">${subLabel}</span>
      </div>
      <h1 dir="${dir}" style="margin:16px 0 4px;font-size:22px;color:#ffffff;text-align:${align};">${headline}</h1>
      <p dir="${dir}" style="margin:0;color:#00FF9D;font-size:15px;font-weight:600;text-align:${align};">${subtitle}</p>
    </div>

    <!-- Prep message -->
    <div dir="${dir}" style="padding:24px 32px;text-align:${align};">
      <p dir="${dir}" style="color:#cbd5e1;font-size:14px;line-height:1.7;margin:0 0 20px;text-align:${align};">${prepMessage}</p>

      <!-- Quick tip box -->
      <div dir="${dir}" style="background:#0a1840;border:1px solid #1e3a5f;border-radius:12px;padding:16px 20px;margin-bottom:24px;text-align:${align};">
        <p dir="${dir}" style="color:#00FF9D;font-weight:700;font-size:13px;margin:0 0 8px;text-align:${align};">${tipTitle}</p>
        <p dir="${dir}" style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0;text-align:${align};">${tipContent}</p>
      </div>

      <!-- CTA button -->
      <div style="text-align:center;">
        <a href="${ctaUrl}" style="display:inline-block;background:#00FF9D;color:#0A1128;font-weight:700;padding:14px 36px;border-radius:50px;text-decoration:none;font-size:15px;">${ctaText}</a>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:16px 32px;border-top:1px solid #1e3a5f;text-align:center;">
      <p style="color:#4a5568;font-size:11px;margin:0;">${footerText}</p>
    </div>
  </div>
</body>
</html>`;
}

// ── Main ─────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method !== "POST")
    return new Response("Method not allowed", { status: 405 });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Parse optional test mode
  let testTo: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    testTo = body.test_to || null;
  } catch {}

  // ── Test mode ─────────────────────────────────────────────────
  if (testTo) {
    const sample: InterviewToday = {
      userId: "test",
      email: testTo,
      fullName: "Test User",
      jobTitle: "Senior Frontend Engineer",
      companyName: "Wix",
      interviewTime: "14:30",
      interviewType: "phone",
      applicationId: null,
      source: "reminder",
      isHebrew: true,
    };

    const { data: sysToken } = await supabase
      .from("email_oauth_tokens")
      .select("access_token, refresh_token, expires_at, user_id")
      .eq("provider", "gmail")
      .eq("email_address", SYSTEM_SENDER_EMAIL)
      .limit(1)
      .maybeSingle();

    if (!sysToken)
      return new Response(
        JSON.stringify({ error: `System sender ${SYSTEM_SENDER_EMAIL} not connected` }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );

    let accessToken = sysToken.access_token;
    if (new Date(sysToken.expires_at).getTime() - Date.now() < 5 * 60 * 1000) {
      accessToken = await refreshGmailToken(sysToken.refresh_token);
      await supabase
        .from("email_oauth_tokens")
        .update({ access_token: accessToken, expires_at: new Date(Date.now() + 3600 * 1000).toISOString() })
        .eq("user_id", sysToken.user_id)
        .eq("provider", "gmail");
    }

    // Send both variants as test
    await sendEmail(accessToken, SYSTEM_SENDER_EMAIL, testTo,
      "פלאג — יש לך שיחה טלפונית היום! (דוגמה)",
      buildPrepEmail(sample)
    );
    const frontalSample = { ...sample, interviewType: "frontal" as const, interviewTime: "10:00" };
    await sendEmail(accessToken, SYSTEM_SENDER_EMAIL, testTo,
      "פלאג — יש לך ראיון עבודה היום! (דוגמה)",
      buildPrepEmail(frontalSample)
    );

    return new Response(JSON.stringify({ sent: 2, test: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── Production: find all interviews scheduled for TODAY ────────

  // Israel timezone: UTC+2 (winter) or UTC+3 (summer/DST)
  // Use Intl to get today's date in Israel
  const israelNow = new Date().toLocaleString("en-US", { timeZone: "Asia/Jerusalem" });
  const todayIsrael = new Date(israelNow);
  const todayStart = new Date(todayIsrael.getFullYear(), todayIsrael.getMonth(), todayIsrael.getDate()).toISOString();
  const todayEnd = new Date(todayIsrael.getFullYear(), todayIsrael.getMonth(), todayIsrael.getDate() + 1).toISOString();

  console.log(`interview-prep-email: scanning for interviews on ${todayStart.split("T")[0]}`);

  // Collect all interviews for today from multiple sources
  const interviewMap = new Map<string, InterviewToday>(); // key = `${userId}:${jobTitle}` to deduplicate

  // ── Source 1: interview_reminders table ────────────────────────
  const { data: reminders } = await (supabase as any)
    .from("interview_reminders")
    .select(`
      id, interview_date, interview_type, reminder_sent,
      application:applications!application_id (
        id, candidate_id, job_title, job_company
      )
    `)
    .gte("interview_date", todayStart)
    .lt("interview_date", todayEnd);

  for (const rem of reminders || []) {
    const app = rem.application;
    if (!app?.candidate_id) continue;
    const key = `${app.candidate_id}:${app.job_title || "unknown"}`;
    if (interviewMap.has(key)) continue;

    const interviewDate = new Date(rem.interview_date);
    const timeStr = interviewDate.toLocaleTimeString("he-IL", {
      timeZone: "Asia/Jerusalem",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    interviewMap.set(key, {
      userId: app.candidate_id,
      email: "", // filled later
      fullName: "", // filled later
      jobTitle: app.job_title || "",
      companyName: app.job_company || "",
      interviewTime: timeStr,
      interviewType: classifyInterview(rem.interview_type),
      applicationId: app.id,
      source: "reminder",
      isHebrew: true, // default, overridden later
    });
  }

  // ── Source 2: schedule_tasks table (fuzzy — type match OR keyword match) ──
  // First: get ALL incomplete tasks for today (any task_type)
  const { data: allTodayTasks } = await (supabase as any)
    .from("schedule_tasks")
    .select("id, user_id, title, description, task_type, due_date, due_time, related_job, related_candidate, source_id, location, meeting_link")
    .eq("is_completed", false)
    .gte("due_date", todayStart.split("T")[0])
    .lte("due_date", todayStart.split("T")[0]);

  // Fuzzy keywords for detecting interviews in title/description (Hebrew + English)
  const INTERVIEW_KEYWORDS = [
    // Hebrew
    "ראיון", "ריאיון", "שיחת סינון", "סינון טלפוני", "שיחה טלפונית",
    "שיחת היכרות", "מיון", "שיחת מיון", "פגישת גיוס", "מרכז הערכה",
    "שיחה עם", "פגישה עם", "הכנה לראיון", "ראיון טכני", "ראיון HR",
    "ראיון מנהל", "ראיון צוות", "ראיון סופי", "יום מיונים", "יום הערכה",
    // English
    "interview", "phone screen", "screening call", "assessment",
    "hiring", "recruiter call", "hr call", "technical interview",
    "onsite", "on-site", "final round", "panel interview",
    "coding interview", "behavioral interview", "case study",
    "meet the team", "culture fit",
  ];

  const PHONE_KEYWORDS = [
    "טלפון", "טלפוני", "סינון", "phone", "call", "שיחה", "שיחת",
    "screening", "hr call", "recruiter call", "שיחת היכרות",
  ];

  for (const task of allTodayTasks || []) {
    // Check if task is interview by type OR by fuzzy keyword match
    const exactTypeMatch = ["interview", "phone_call", "frontal_interview"].includes(task.task_type);
    const searchText = `${task.title || ""} ${task.description || ""} ${task.related_job || ""}`.toLowerCase();
    const fuzzyMatch = INTERVIEW_KEYWORDS.some(kw => searchText.includes(kw.toLowerCase()));

    if (!exactTypeMatch && !fuzzyMatch) continue;

    const key = `${task.user_id}:${task.title || task.related_job || "unknown"}`;
    if (interviewMap.has(key)) continue;

    // Determine phone vs frontal: exact type first, then fuzzy keyword detection
    let interviewType: "phone" | "frontal" = classifyInterview(task.task_type);
    if (!exactTypeMatch && fuzzyMatch) {
      // Fuzzy-detected — check if keywords suggest phone
      interviewType = PHONE_KEYWORDS.some(kw => searchText.includes(kw.toLowerCase())) ? "phone" : "frontal";
    }

    interviewMap.set(key, {
      userId: task.user_id,
      email: "",
      fullName: "",
      jobTitle: task.related_job || task.title || "",
      companyName: "",
      interviewTime: task.due_time || null,
      interviewType,
      applicationId: task.source_id || null,
      source: "schedule",
      isHebrew: true,
    });
  }

  // ── Source 2b: applications with interview stage changed recently ──
  // Catches cases where stage moved to interview but no reminder/task was created
  const INTERVIEW_STAGES = [
    "phone_screen", "hr_interview", "technical", "interview",
    "manager_interview", "team_interview", "ceo_interview",
  ];
  const { data: interviewApps } = await supabase
    .from("applications")
    .select("id, candidate_id, job_title, job_company, current_stage, last_stage_change_at")
    .in("current_stage", INTERVIEW_STAGES);

  for (const app of interviewApps || []) {
    if (!app.candidate_id) continue;
    const key = `${app.candidate_id}:${app.job_title || "unknown"}`;
    if (interviewMap.has(key)) continue;

    // Only include if stage changed in the last 3 days (recently scheduled)
    // We can't know the exact interview date from just the stage, so this is a "heads up"
    const changedAt = app.last_stage_change_at ? new Date(app.last_stage_change_at) : null;
    if (!changedAt) continue;
    const daysSinceChange = (todayIsrael.getTime() - changedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceChange > 3) continue; // Only recent stage changes

    const isPhone = ["phone_screen", "hr_interview"].includes(app.current_stage);

    interviewMap.set(key, {
      userId: app.candidate_id,
      email: "",
      fullName: "",
      jobTitle: app.job_title || "",
      companyName: app.job_company || "",
      interviewTime: null, // we don't know the exact time from stage alone
      interviewType: isPhone ? "phone" : "frontal",
      applicationId: app.id,
      source: "schedule",
      isHebrew: true,
    });
  }

  // ── Source 3: application_emails with interview_invitation + extracted date ──
  const { data: interviewEmails } = await (supabase as any)
    .from("application_emails")
    .select("user_id, ai_classification, ai_extracted_data, application:applications!application_id (id, job_title, job_company)")
    .eq("ai_classification", "interview_invitation");

  for (const em of interviewEmails || []) {
    const extracted = em.ai_extracted_data as { interview_date?: string; company_name?: string; job_title?: string } | null;
    if (!extracted?.interview_date) continue;

    // Check if the extracted interview_date is today
    const interviewDate = new Date(extracted.interview_date);
    const interviewDateStr = interviewDate.toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" }); // YYYY-MM-DD
    const todayDateStr = todayStart.split("T")[0];
    if (interviewDateStr !== todayDateStr) continue;

    const app = em.application;
    const jobTitle = app?.job_title || extracted.job_title || "";
    const key = `${em.user_id}:${jobTitle}`;
    if (interviewMap.has(key)) continue;

    const timeStr = interviewDate.toLocaleTimeString("he-IL", {
      timeZone: "Asia/Jerusalem",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    interviewMap.set(key, {
      userId: em.user_id,
      email: "",
      fullName: "",
      jobTitle,
      companyName: app?.job_company || extracted.company_name || "",
      interviewTime: timeStr !== "00:00" ? timeStr : null,
      interviewType: "frontal", // email-detected interviews default to frontal
      applicationId: app?.id || null,
      source: "email",
      isHebrew: true,
    });
  }

  console.log(`interview-prep-email: found ${interviewMap.size} interviews today`);

  if (interviewMap.size === 0) {
    return new Response(JSON.stringify({ sent: 0, interviews: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── Get user emails + names + language ─────────────────────────

  const userIds = [...new Set([...interviewMap.values()].map((i) => i.userId))];

  // Get profiles for names + language
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name, languages")
    .in("user_id", userIds);

  const profileMap = new Map(
    (profiles || []).map((p: any) => [p.user_id, p])
  );

  // Get emails from auth (via email_oauth_tokens as fallback, or profiles)
  const { data: emailTokens } = await supabase
    .from("email_oauth_tokens")
    .select("user_id, email_address")
    .in("user_id", userIds)
    .eq("provider", "gmail");

  const emailMap = new Map(
    (emailTokens || []).map((t: any) => [t.user_id, t.email_address])
  );

  // Also try auth.users for email
  for (const uid of userIds) {
    if (!emailMap.has(uid)) {
      const { data } = await supabase.auth.admin.getUserById(uid);
      if (data?.user?.email) emailMap.set(uid, data.user.email);
    }
  }

  // Enrich interview records
  for (const interview of interviewMap.values()) {
    const profile = profileMap.get(interview.userId) as any;
    interview.email = emailMap.get(interview.userId) || "";
    interview.fullName = profile?.full_name || "";
    const lang = profile?.languages;
    interview.isHebrew = Array.isArray(lang) ? lang.includes("he") : lang === "he" || !lang;
  }

  // ── Get system sender token ───────────────────────────────────

  const { data: senderToken } = await supabase
    .from("email_oauth_tokens")
    .select("user_id, access_token, refresh_token, expires_at")
    .eq("provider", "gmail")
    .eq("email_address", SYSTEM_SENDER_EMAIL)
    .limit(1)
    .maybeSingle();

  if (!senderToken) {
    return new Response(
      JSON.stringify({ error: `System sender ${SYSTEM_SENDER_EMAIL} not connected` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let senderAccessToken = senderToken.access_token;
  if (new Date(senderToken.expires_at).getTime() - Date.now() < 5 * 60 * 1000) {
    senderAccessToken = await refreshGmailToken(senderToken.refresh_token);
    await supabase
      .from("email_oauth_tokens")
      .update({ access_token: senderAccessToken, expires_at: new Date(Date.now() + 3600 * 1000).toISOString() })
      .eq("user_id", senderToken.user_id)
      .eq("provider", "gmail");
  }

  // ── Send emails ───────────────────────────────────────────────

  const results = { sent: 0, skipped: 0, errors: 0, details: [] as string[] };

  for (const interview of interviewMap.values()) {
    if (!interview.email) {
      results.skipped++;
      continue;
    }

    try {
      const isPhone = interview.interviewType === "phone";
      const isHe = interview.isHebrew;

      const subject = isHe
        ? `פלאג — ${isPhone ? "יש לך שיחה טלפונית" : "יש לך ראיון עבודה"} היום${interview.companyName ? ` ב-${interview.companyName}` : ""}!`
        : `PLUG — You have a ${isPhone ? "phone screen" : "job interview"} today${interview.companyName ? ` at ${interview.companyName}` : ""}!`;

      await sendEmail(
        senderAccessToken,
        SYSTEM_SENDER_EMAIL,
        interview.email,
        subject,
        buildPrepEmail(interview)
      );

      // Mark reminder as sent (if from interview_reminders)
      if (interview.source === "reminder" && interview.applicationId) {
        await (supabase as any)
          .from("interview_reminders")
          .update({ reminder_sent: true })
          .eq("application_id", interview.applicationId);
      }

      // Insert notification in-app
      await (supabase as any).from("notifications").insert({
        user_id: interview.userId,
        type: "interview_prep",
        title: isHe
          ? `${isPhone ? "📞 שיחה טלפונית" : "🏢 ראיון עבודה"} היום — ${interview.jobTitle}`
          : `${isPhone ? "📞 Phone screen" : "🏢 Interview"} today — ${interview.jobTitle}`,
        body: isHe
          ? `בוא נתכונן ביחד! לחץ כאן להכנה עם PLUG.`
          : `Let's prepare together! Click here to prep with PLUG.`,
        action_url: isPhone
          ? `/dashboard?section=chat&prepFor=${encodeURIComponent(interview.companyName || interview.jobTitle)}`
          : `/interview-prep${interview.applicationId ? `?app=${interview.applicationId}` : ""}`,
        is_read: false,
      }).then(() => {});

      results.sent++;
      results.details.push(
        `${interview.email}: ${interview.interviewType} @ ${interview.interviewTime || "?"} — ${interview.jobTitle} (${interview.source})`
      );
      console.log(
        `interview-prep-email: sent to ${interview.email} — ${interview.interviewType} for ${interview.jobTitle} at ${interview.companyName}`
      );
    } catch (err: any) {
      console.error(`interview-prep-email: error for ${interview.email}:`, err.message);
      results.errors++;
    }
  }

  console.log(`interview-prep-email: done — sent ${results.sent}, skipped ${results.skipped}, errors ${results.errors}`);

  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json" },
  });
});
