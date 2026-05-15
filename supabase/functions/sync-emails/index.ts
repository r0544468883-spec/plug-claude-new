import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_CLIENT_ID     = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const MICROSOFT_CLIENT_ID     = Deno.env.get("MICROSOFT_CLIENT_ID") || "";
const MICROSOFT_CLIENT_SECRET = Deno.env.get("MICROSOFT_CLIENT_SECRET") || "";
const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLASSIFY_URL         = `${SUPABASE_URL}/functions/v1/classify-email`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Email signal word bank (sourced from real job emails in inbox) ──────────
// Only REJECTION + INTERVIEW + OFFER trigger step-8 matching and needs_review.
// ACKNOWLEDGMENT ("thank you for applying") is too noisy — every receipt email
// would fire the banner — so it's kept separate for classify-email only.

const SIGNAL_REJECTION = [
  // English — seen in: Lightrun, Payoneer, JobTestPrep
  "unfortunately",
  "we regret",
  "regret to inform",
  "not moving forward",
  "not selected",
  "decided to move forward with other",
  "went with another candidate",
  "high volume of applications",
  "we appreciate your time and effort",
  "wish you well in your",
  "best of luck in your",
  "unable to move forward",
  "will not be advancing",
  "position has been filled",
  "not the right fit",
  "we have decided not to",
  "sorry to inform",
  // Hebrew
  "לצערנו",
  "לא נוכל לקדמך",
  "לא נוכל לקדם",
  "לא ממשיכים",
  "לא קדמנו",
  "בחרנו במועמד אחר",
  "לא עמדת בקריטריונים",
  "סיימנו את תהליך",
  "נסגרה המשרה",
  "עברנו הלאה",
  "לא מתאים לתפקיד",
  "לא נוכל להמשיך",
  "לא נוכל",
  "החלטנו שלא",
];

const SIGNAL_INTERVIEW = [
  // English — seen in: Theator (BambooHR), Clicks Talent
  "schedule your interview",
  "schedule an interview",
  "let's talk",
  "phone screen",
  "video call",
  "next step",
  "next round",
  "next stage",
  "we'd like to invite",
  "we would like to invite",
  "shortlisted",
  "moving forward with you",
  "we've reviewed your application and",
  "advance to the next",
  "schedule a call",
  "book a meeting",
  "we'd like to meet",
  // Hebrew
  "ראיון",
  "שלב הבא",
  "שיחת טלפון",
  "שמחים להזמינך",
  "ממשיכים איתך",
  "נבחרת להמשיך",
  "לתאם שיחה",
  "קביעת ראיון",
  "עברת לשלב",
  "הזמנה לראיון",
  "שיחת היכרות",
  "ראיון עבודה",
  "ראיון ראשוני",
  "היינו רוצים להזמין",
];

const SIGNAL_OFFER = [
  // English
  "offer letter",
  "pleased to offer",
  "extend an offer",
  "we'd like to offer",
  "welcome aboard",
  "start date",
  "compensation package",
  "congratulations",
  "joining us",
  // Hebrew
  "הצעת עבודה",
  "ברכות",
  "שמחים להציע",
  "להצטרף אלינו",
  "ברוך הבא לצוות",
  "תאריך התחלה",
  "תנאי העסקה",
  "תנאי שכר",
];

// JOB_SIGNAL_WORDS → step-8 matching + needs_review flag
// (acknowledgment words like "thank you for applying" are intentionally excluded —
//  they fire on every receipt email and make the needs_review banner too noisy)
const JOB_SIGNAL_WORDS = [...SIGNAL_REJECTION, ...SIGNAL_INTERVIEW, ...SIGNAL_OFFER];

async function refreshToken(provider: string, refreshToken: string) {
  if (provider === "gmail") {
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
    if (!res.ok) {
      const errText = await res.text();
      console.error(`[sync-emails] Gmail refresh failed: ${res.status} ${errText}`);
      throw new Error(`Gmail refresh failed: ${res.status}`);
    }
    return res.json();
  } else {
    const res = await fetch(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          refresh_token: refreshToken,
          client_id: MICROSOFT_CLIENT_ID,
          client_secret: MICROSOFT_CLIENT_SECRET,
          grant_type: "refresh_token",
          scope: "Mail.Send Mail.Read offline_access User.Read",
        }),
      }
    );
    if (!res.ok) throw new Error(`Outlook refresh failed`);
    return res.json();
  }
}

async function getValidAccessToken(
  supabase: ReturnType<typeof createClient>,
  token: { user_id: string; provider: string; access_token: string; refresh_token: string; expires_at: string }
) {
  const expiresAt = new Date(token.expires_at);
  if (expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    const refreshed = await refreshToken(token.provider, token.refresh_token);
    const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
    await supabase
      .from("email_oauth_tokens")
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token || token.refresh_token,
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", token.user_id)
      .eq("provider", token.provider);
    return refreshed.access_token;
  }
  return token.access_token;
}

interface ParsedEmail {
  provider_msg_id: string;
  thread_id: string;
  from_email: string;
  to_email: string;
  subject: string;
  body_text: string;
  body_html: string;
  received_at: string;
}

function extractEmailAddress(header: string): string {
  const match = header.match(/<([^>]+)>/) || header.match(/([^\s<]+@[^\s>]+)/);
  return match ? match[1] : header;
}

async function syncGmail(
  accessToken: string,
  userId: string,
  lastHistoryId: string | null,
  supabase: ReturnType<typeof createClient>,
  overrideDays?: number
): Promise<{ emails: ParsedEmail[]; newHistoryId: string | null }> {
  const emails: ParsedEmail[] = [];

  // Always do full sync to ensure we catch all emails
  console.log("[sync-emails] Running FULL sync (always)");
  return syncGmailFull(accessToken, userId, overrideDays);
}

async function syncGmailFull(accessToken: string, userId: string, overrideDays?: number): Promise<{ emails: ParsedEmail[]; newHistoryId: string | null }> {
  const emails: ParsedEmail[] = [];
  const seenIds = new Set<string>();
  let newHistoryId: string | null = null;
  const days = overrideDays && overrideDays > 0 ? overrideDays : 90;
  const after = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000);

  // 4 targeted queries — cast a wide net, let AI classify
  const queries = [
    // Q1: General inbox — latest emails
    `after:${after}`,
    // Q2: REJECTIONS — real phrases from actual rejection emails
    `after:${after} {unfortunately regret "not moving forward" "decided to move forward" "not selected" "went with another" "position has been filled" "position has been closed" "no longer open" "unable to move" "will not be advancing" "not the right fit" "after careful consideration" "after careful review" "do not fully align" "does not align" "different direction" "other candidates" "לצערנו" "לא נוכל להציע" "לא נוכל לקדם" "לא ממשיכים" "בחרנו במועמד" "נסגרה המשרה" "בשלב זה לא נוכל"}`,
    // Q3: INTERVIEWS + OFFERS
    `after:${after} {"schedule your interview" "schedule an interview" "next step" "we'd like to invite" "shortlisted" "pleased to offer" "offer letter" "הזמנה לראיון" "זימון לראיון" "ראיון עבודה" "הצעת עבודה" "שמחים להזמינך" "זומנת לראיון" "נקבע ראיון" "קביעת ראיון"}`,
    // Q4: ATS platforms — these send rejections with generic subjects
    `after:${after} from:(greenhouse-mail.io OR lever.co OR workablemail.com OR bamboohr.com OR ashbyhq.com OR comeet-notifications.com OR smartrecruiters.com OR icims.com OR jobvite.com OR breezy.hr OR recruitee.com OR workday.com)`,
    // Q5: LinkedIn job emails — rejections, views, updates
    `after:${after} from:linkedin.com {application viewed rejected "no longer" update status}`,
  ];

  for (const q of queries) {
    try {
      const listRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&q=${encodeURIComponent(q)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!listRes.ok) {
        console.error(`[sync-emails] Gmail list failed for query "${q.substring(0, 50)}": ${listRes.status}`);
        continue;
      }
      const listData = await listRes.json();
      const msgs = (listData.messages || []).slice(0, 20);
      console.log(`[sync-emails] Query "${q.substring(0, 40)}..." returned ${msgs.length} messages`);

      // Deduplicate across queries
      const newMsgs = msgs.filter((m: { id: string }) => !seenIds.has(m.id));
      newMsgs.forEach((m: { id: string }) => seenIds.add(m.id));

      // Fetch in parallel
      const fetches = newMsgs.map((msg: { id: string }) => fetchGmailMessage(accessToken, msg.id));
      const results = await Promise.all(fetches);
      for (const email of results) {
        if (email) emails.push(email);
      }
    } catch (err) {
      console.error(`[sync-emails] Query error:`, err);
    }
  }

  console.log(`[sync-emails] Total fetched: ${emails.length} unique emails from ${queries.length} queries`);

  // Get current historyId for next incremental sync
  const profileRes = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/profile",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (profileRes.ok) {
    const profile = await profileRes.json();
    newHistoryId = profile.historyId;
  }

  return { emails, newHistoryId };
}

async function fetchGmailMessage(accessToken: string, messageId: string): Promise<ParsedEmail | null> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) return null;
  const msg = await res.json();

  const headers = msg.payload?.headers || [];
  const getHeader = (name: string) => headers.find((h: { name: string }) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

  let bodyText = "";
  let bodyHtml = "";

  function extractBody(part: { mimeType?: string; body?: { data?: string }; parts?: unknown[] }) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      bodyText = atob(part.body.data.replace(/-/g, "+").replace(/_/g, "/"));
    }
    if (part.mimeType === "text/html" && part.body?.data) {
      bodyHtml = atob(part.body.data.replace(/-/g, "+").replace(/_/g, "/"));
    }
    if (part.parts) {
      for (const sub of part.parts as { mimeType?: string; body?: { data?: string }; parts?: unknown[] }[]) {
        extractBody(sub);
      }
    }
  }
  extractBody(msg.payload);

  return {
    provider_msg_id: msg.id,
    thread_id: msg.threadId || "",
    from_email: extractEmailAddress(getHeader("From")),
    to_email: extractEmailAddress(getHeader("To")),
    subject: getHeader("Subject"),
    body_text: bodyText,
    body_html: bodyHtml,
    received_at: new Date(parseInt(msg.internalDate)).toISOString(),
  };
}

async function syncOutlook(
  accessToken: string,
  userId: string,
  lastSyncAt: string | null
): Promise<{ emails: ParsedEmail[] }> {
  const emails: ParsedEmail[] = [];
  const since = lastSyncAt || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$filter=receivedDateTime ge ${since}&$top=50&$select=id,conversationId,from,toRecipients,subject,body,bodyPreview,receivedDateTime`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) return { emails: [] };
  const data = await res.json();

  for (const msg of data.value || []) {
    emails.push({
      provider_msg_id: msg.id,
      thread_id: msg.conversationId || "",
      from_email: msg.from?.emailAddress?.address || "",
      to_email: msg.toRecipients?.[0]?.emailAddress?.address || "",
      subject: msg.subject || "",
      body_text: msg.bodyPreview || "",
      body_html: msg.body?.content || "",
      received_at: msg.receivedDateTime,
    });
  }

  return { emails };
}

async function matchEmailToApplication(
  supabase: ReturnType<typeof createClient>,
  email: ParsedEmail,
  userId: string,
  extraCompanyName?: string | null,
): Promise<string | null> {
  // 1. Thread match — check if thread_id already exists in application_emails
  if (email.thread_id) {
    const { data: existing } = await supabase
      .from("application_emails")
      .select("application_id")
      .eq("thread_id", email.thread_id)
      .eq("user_id", userId)
      .not("application_id", "is", null)
      .limit(1)
      .single();

    if (existing?.application_id) return existing.application_id;
  }

  // Get ALL applications (including rejected — email may reference old ones)
  const { data: apps, error: appsErr } = await supabase
    .from("applications")
    .select("id, job_company, job_title, job_url")
    .eq("candidate_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (appsErr) console.error(`[sync-emails] Failed to fetch apps: ${appsErr.message}`);

  if (!apps || apps.length === 0) return null;

  const senderDomain = email.from_email.split("@")[1]?.toLowerCase() || "";
  const subjectLower = (email.subject || "").toLowerCase();
  const bodySnippet = (email.body_text || "").toLowerCase().substring(0, 1000);

  // ATS domain mapping — emails from these domains come on behalf of a company.
  // Extract the company hint from the subject (first word / company name pattern).
  const ATS_DOMAINS: Record<string, true> = {
    "greenhouse-mail.io": true,
    "us.greenhouse-mail.io": true,
    "eu.greenhouse-mail.io": true,
    "hire.lever.co": true,
    "lever.co": true,
    "workablemail.com": true,
    "candidates.workablemail.com": true,
    "bamboohr.com": true,
    "notifications.app.bamboohr.com": true,
    "ashbyhq.com": true,
    "recruitee.com": true,
    "smartrecruiters.com": true,
    "comeet.co": true,
    "breezy.hr": true,
    "taleo.net": true,
    "icims.com": true,
    "jobvite.com": true,
    "hire-match.ai": true,
  };
  const isATS = Object.keys(ATS_DOMAINS).some(d => senderDomain.includes(d));
  const isLinkedIn = senderDomain.includes("linkedin.com");

  const haystack = `${subjectLower} ${bodySnippet}`;

  // 1.5 LinkedIn fast-path — extract company name from subject patterns:
  //   "your application was sent to TikTok"
  //   "Your application was viewed by Shibolet & Co."
  //   "Ron, you applied for Marketing Manager at Google"
  //   "Ron, your application was sent to Join - Digital Talent Agency"
  if (isLinkedIn) {
    const linkedInPatterns = [
      /application was (?:sent|submitted) to (.+?)(?:\s*$)/i,
      /application was viewed by (.+?)(?:\s*$)/i,
      /you applied (?:for .+ )?at (.+?)(?:\s*$)/i,
      /invited you to apply (?:for .+ )?at (.+?)(?:\s*$)/i,
      /interview (?:with|at) (.+?)(?:\s*$)/i,
    ];
    for (const pattern of linkedInPatterns) {
      const match = (email.subject || "").match(pattern);
      if (match) {
        const companyFromSubject = match[1].trim().toLowerCase();
        for (const app of apps) {
          if (!app.job_company || app.job_company.length < 3) continue;
          const appCompany = app.job_company.toLowerCase();
          // Check both directions: "tiktok" in "TikTok Inc" or "TikTok" in "tiktok"
          if (appCompany.includes(companyFromSubject) || companyFromSubject.includes(appCompany)) return app.id;
          // Word-level match for multi-word companies
          const companyWords = appCompany.split(/[\s,./\-_()&]+/).filter((w: string) => w.length >= 3);
          if (companyWords.some((w: string) => companyFromSubject.includes(w))) return app.id;
        }
      }
    }
    // Fallback: scan company names in subject+body
    for (const app of apps) {
      if (!app.job_company || app.job_company.length < 3) continue;
      if (haystack.includes(app.job_company.toLowerCase())) return app.id;
    }
  }

  // 2.5 ATS fast-path — sender is a known ATS (Greenhouse, Lever, Workable…).
  // Domain matching is useless here; go straight to company-name scan across all apps.
  if (isATS) {
    for (const app of apps) {
      if (!app.job_company || app.job_company.length < 3) continue;
      const companyWords = app.job_company.toLowerCase().split(/[\s,./\-_()]+/).filter((w: string) => w.length >= 3);
      if (companyWords.some((w: string) => haystack.includes(w))) return app.id;
    }
    // Also try job title match on subject
    for (const app of apps) {
      if (app.job_title && app.job_title.length >= 6 && subjectLower.includes(app.job_title.toLowerCase())) return app.id;
    }
  }

  for (const app of apps) {
    // 2. Domain match — sender domain contains company name
    if (app.job_company && app.job_company.length >= 4) {
      const companyLower = app.job_company.toLowerCase().replace(/\s+/g, "");
      const companyShort = companyLower.substring(0, 10);
      if (senderDomain && companyShort.length >= 4 && senderDomain.includes(companyShort)) {
        return app.id;
      }
      // 3. Subject/body match — contains company name
      if (subjectLower.includes(app.job_company.toLowerCase())) return app.id;
      if (bodySnippet.includes(app.job_company.toLowerCase())) return app.id;
    }

    // 4. Job title match — subject contains the exact job title from the application
    if (app.job_title && app.job_title.length >= 6) {
      const titleLower = app.job_title.toLowerCase();
      if (subjectLower.includes(titleLower)) return app.id;
    }

    // 5. Job URL domain match — sender domain matches the ATS/company domain from job_url
    if (app.job_url && senderDomain) {
      try {
        const jobDomain = new URL(app.job_url).hostname.replace("www.", "").split(".")[0].toLowerCase();
        if (jobDomain.length >= 4 && senderDomain.includes(jobDomain)) return app.id;
      } catch { /* invalid URL */ }
    }
  }

  // 6. AI-extracted company name match (from classify-email)
  if (extraCompanyName && extraCompanyName.length >= 3) {
    const extraLower = extraCompanyName.toLowerCase();
    for (const app of apps) {
      if (app.job_company && app.job_company.toLowerCase().includes(extraLower)) return app.id;
      if (app.job_title && app.job_title.toLowerCase().includes(extraLower)) return app.id;
    }
    // Also check sender domain
    if (senderDomain.includes(extraLower.replace(/\s+/g, ""))) {
      return apps[0].id; // Best guess
    }
  }

  // 7. Fallback: if few active applications, match job-related emails
  const activeApps = apps.filter(a => !["rejected", "hired", "withdrawn"].includes(""));
  if (activeApps.length <= 3) {
    const jobKeywords = ["interview", "ראיון", "position", "משרה", "application", "מועמדות", "candidate", "מועמד", "rejection", "דחי", "offer", "הצעה", "thank you for applying", "תודה על", "regret", "unfortunately", "לצערנו", "we have decided", "move forward with other", "not moving forward"];
    if (jobKeywords.some(k => haystack.includes(k))) {
      // Try to pick the best match from active apps
      if (activeApps.length === 1) return activeApps[0].id;
      // For multiple, see if any company name appears in the email
      for (const app of activeApps) {
        if (app.job_company && app.job_company.length >= 3 && haystack.includes(app.job_company.toLowerCase())) {
          return app.id;
        }
      }
    }
  }

  // 8. 2-keyword match — BOTH a job signal word AND a partial company name must appear in the email.
  // Example: email contains "sorry" + "wix" → matches the application to Wix.
  if (JOB_SIGNAL_WORDS.some(w => haystack.includes(w))) {
    for (const app of apps) {
      if (!app.job_company || app.job_company.length < 3) continue;
      // Split company into words and check if any meaningful word appears in the email
      const companyWords = app.job_company.toLowerCase().split(/[\s,./\-_()]+/).filter((w: string) => w.length >= 3);
      if (companyWords.some((word: string) => haystack.includes(word))) {
        return app.id;
      }
    }
  }

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Support per-user sync via body.user_id, force_full to reset history
    const body = await req.json().catch(() => ({}));
    const targetUserId = body.user_id || null;
    const forceFull = body.force_full === true;
    const rescanDays = typeof body.rescan_days === "number" ? body.rescan_days : 0;

    // If force_full, reset history + delete old emails so we re-process everything
    if (forceFull) {
      console.log(`[sync-emails] Force full sync — resetting all data`);
      if (targetUserId) {
        await supabase.from("email_sync_state").update({ last_history_id: null }).eq("user_id", targetUserId);
        await supabase.from("application_emails").delete().eq("user_id", targetUserId).eq("direction", "received");
      } else {
        await supabase.from("email_sync_state").update({ last_history_id: null }).neq("user_id", "");
        await supabase.from("application_emails").delete().eq("direction", "received");
      }
      console.log(`[sync-emails] Reset complete`);
    }

    // rescan_days: delete recent emails (last N days) so they get re-classified
    if (rescanDays > 0 && !forceFull) {
      const since = new Date(Date.now() - rescanDays * 24 * 60 * 60 * 1000).toISOString();
      console.log(`[sync-emails] Rescan last ${rescanDays} days — deleting emails since ${since}`);
      let delQuery = supabase.from("application_emails").delete().eq("direction", "received").gte("created_at", since);
      if (targetUserId) delQuery = delQuery.eq("user_id", targetUserId);
      await delQuery;
    }

    // Get users with sync_enabled tokens
    let tokenQuery = supabase
      .from("email_oauth_tokens")
      .select("*")
      .eq("sync_enabled", true);

    if (targetUserId) {
      tokenQuery = tokenQuery.eq("user_id", targetUserId);
    }

    const { data: tokens, error: tokenErr } = await tokenQuery;

    console.log(`[sync-emails] targetUserId=${targetUserId}, tokenErr=${tokenErr?.message}, tokensFound=${tokens?.length || 0}`);

    if (tokenErr || !tokens?.length) {
      return new Response(
        JSON.stringify({ message: "No accounts to sync", synced: 0, debug: { targetUserId, tokenErr: tokenErr?.message } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalSynced = 0;
    const errors: string[] = [];
    const debugInfo: Record<string, unknown> = {};

    // System sender email — used only for sending, never scan it
    const SYSTEM_EMAILS = ["plug.hotjobs@gmail.com"];

    for (const token of tokens) {
      try {
        if (SYSTEM_EMAILS.includes(token.email_address?.toLowerCase?.())) {
          console.log(`[sync-emails] Skipping system sender: ${token.email}`);
          continue;
        }
        console.log(`[sync-emails] Processing ${token.provider} for user ${token.user_id}`);
        const accessToken = await getValidAccessToken(supabase, token);
        debugInfo.tokenOk = true;

        // Get sync state
        const { data: syncState } = await supabase
          .from("email_sync_state")
          .select("*")
          .eq("user_id", token.user_id)
          .single();

        let emails: ParsedEmail[] = [];
        let newHistoryId: string | null = null;

        if (token.provider === "gmail") {
          console.log(`[sync-emails] Gmail sync — lastHistoryId=${syncState?.last_history_id || "null (full sync)"}`);
          const result = await syncGmail(
            accessToken,
            token.user_id,
            syncState?.last_history_id || null,
            supabase,
            rescanDays > 0 ? rescanDays : undefined
          );
          emails = result.emails;
          newHistoryId = result.newHistoryId;
          console.log(`[sync-emails] Gmail returned ${emails.length} emails, newHistoryId=${newHistoryId}`);
          debugInfo.emailsFetched = emails.length;
          debugInfo.subjects = emails.map(e => e.subject).slice(0, 5);
        } else {
          const result = await syncOutlook(
            accessToken,
            token.user_id,
            syncState?.last_sync_at || null
          );
          emails = result.emails;
        }

        // Skip non-job domains to avoid wasting AI credits on irrelevant emails
        const SKIP_DOMAINS = [
          "aliexpress.com", "amazon.com", "ebay.com", "paypal.com",
          "facebook.com", "instagram.com", "twitter.com", "x.com",
          "google.com", "youtube.com", "netflix.com", "spotify.com",
          "apple.com", "microsoft.com", "skool.com", "substack.com",
          "wix.com", "squarespace.com", "mailchimp.com", "hubspot.com",
          "notion.so", "slack.com", "zoom.us", "calendly.com",
          "udemy.com", "coursera.org", "medium.com",
          "aiautomationsociety.ai", "arielgroup.co.il",
        ];
        // Skip newsletter/job-alert senders (not about YOUR applications)
        const SKIP_SENDERS = [
          "alljob.co.il", "alljobs.co.il", "jobnet.co.il",
          "neto.work", "plug.hotjobs@gmail.com",
        ];

        // Process each email
        debugInfo.processingStarted = true;
        debugInfo.emailsToProcess = emails.length;
        let skipped = 0, saved = 0, failed = 0, skippedNonJob = 0;
        const classifyPromises: Promise<void>[] = [];
        for (const email of emails) {
          // Check if already synced
          const { data: existing } = await supabase
            .from("application_emails")
            .select("id")
            .eq("provider_msg_id", email.provider_msg_id)
            .eq("user_id", token.user_id)
            .limit(1);

          if (existing && existing.length > 0) {
            skipped++;
            continue;
          }

          // Skip non-job domains — no point wasting AI credits on AliExpress/Amazon/etc.
          const emailDomain = (email.from_email || "").split("@")[1]?.toLowerCase() || "";
          const emailAddr = (email.from_email || "").toLowerCase();
          if (SKIP_DOMAINS.some(d => emailDomain.includes(d)) || SKIP_SENDERS.some(s => emailAddr.includes(s) || emailDomain.includes(s))) {
            skippedNonJob++;
            continue;
          }

          // Match to application
          const applicationId = await matchEmailToApplication(supabase, email, token.user_id);
          console.log(`[sync-emails] Saving email "${email.subject}" — matched app: ${applicationId || "none"}`);
          // Only track first 10 match results to avoid memory bloat
          if (!debugInfo.matchResults) debugInfo.matchResults = [];
          if ((debugInfo.matchResults as unknown[]).length < 10) {
            (debugInfo.matchResults as unknown[]).push({ subject: email.subject, from: email.from_email, matched: applicationId });
          }

          // Feature 1: flag unmatched emails that look job-related for manual review
          const emailHaystack = `${(email.subject || "").toLowerCase()} ${(email.body_text || "").toLowerCase().substring(0, 1000)}`;
          const needsReview = applicationId === null && JOB_SIGNAL_WORDS.some(w => emailHaystack.includes(w));

          // Save email
          const { data: savedEmail, error: insertErr } = await supabase
            .from("application_emails")
            .insert({
              application_id: applicationId,
              user_id: token.user_id,
              provider_msg_id: email.provider_msg_id,
              thread_id: email.thread_id,
              direction: "received",
              from_email: email.from_email,
              to_email: email.to_email,
              subject: email.subject,
              body_text: email.body_text,
              body_html: email.body_html,
              provider: token.provider,
              created_at: email.received_at,
              needs_review: needsReview,
            })
            .select("id")
            .single();

          if (insertErr) {
            console.error(`[sync-emails] Insert failed: ${insertErr.message}`);
            failed++;
            debugInfo.insertError = insertErr.message;
            continue;
          }
          saved++;
          if (!debugInfo._savedEmailIds) debugInfo._savedEmailIds = [];
          (debugInfo._savedEmailIds as string[]).push(savedEmail.id);

          // Classify sequentially with delay to avoid rate limiting
          // Skip AI for obvious non-application emails (newsletters, job alerts, promos)
          const subjectL = (email.subject || "").toLowerCase();
          const isNewsletter = /newsletter|הזמנה.*וובינר|webinar|tip|טיפ|כל המשרות שעלו|roles for|the best|top \d/i.test(subjectL) && !applicationId;
          if (savedEmail && !isNewsletter) {
            try {
              // If body_text is empty (HTML-only email), extract text from HTML
              let classifyBody = email.body_text || "";
              if (!classifyBody.trim() && email.body_html) {
                classifyBody = email.body_html
                  .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
                  .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
                  .replace(/<br\s*\/?>/gi, "\n")
                  .replace(/<\/p>/gi, "\n")
                  .replace(/<\/div>/gi, "\n")
                  .replace(/<\/tr>/gi, "\n")
                  .replace(/<[^>]+>/g, " ")
                  .replace(/&nbsp;/g, " ")
                  .replace(/&amp;/g, "&")
                  .replace(/&lt;/g, "<")
                  .replace(/&gt;/g, ">")
                  .replace(/&#\d+;/g, "")
                  .replace(/\s+/g, " ")
                  .trim()
                  .substring(0, 2000);
              }
              console.log(`[sync-emails] Classifying "${email.subject}" (app=${applicationId || "unmatched"}, bodyLen=${classifyBody.length})`);
              const classifyRes = await fetch(CLASSIFY_URL, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
                  "apikey": SUPABASE_SERVICE_KEY,
                },
                body: JSON.stringify({
                  email_id: savedEmail.id,
                  subject: email.subject,
                  body_text: classifyBody,
                  from_email: email.from_email,
                  application_id: applicationId || null,
                  auto_update: true,
                  user_id: token.user_id,
                }),
              });
              const classifyResult = await classifyRes.text();
              console.log(`[sync-emails] Classification done for "${email.subject}": ${classifyResult.substring(0, 200)}`);
              // Small delay between classify calls to avoid Claude rate-limiting
              await new Promise(r => setTimeout(r, 100));
            } catch (err) {
              console.error(`[sync-emails] Classification failed for "${email.subject}":`, err);
            }
          } else if (savedEmail && isNewsletter) {
            // Mark as general without calling AI — saves time and credits
            await supabase.from("application_emails").update({ ai_classification: "general", ai_confidence: 0.9 }).eq("id", savedEmail.id);
          }

          totalSynced++;
        }

        debugInfo.skipped = skipped;
        debugInfo.skippedNonJob = skippedNonJob;
        debugInfo.saved = saved;
        debugInfo.failed = failed;
        console.log(`[sync-emails] Results: saved=${saved}, skipped=${skipped}, skippedNonJob=${skippedNonJob}, failed=${failed}`);

        // ─── Post-scan: classification summary notification + email ───
        if (saved > 0) {
          try {
            const savedIds = (debugInfo._savedEmailIds as string[]) || [];
            // Query in batches of 50 (Supabase .in() limit)
            let recentEmails: { ai_classification: string | null; subject: string | null; from_email: string | null; application_id: string | null }[] = [];
            for (let i = 0; i < savedIds.length; i += 50) {
              const batch = savedIds.slice(i, i + 50);
              const { data } = await supabase
                .from("application_emails")
                .select("ai_classification, subject, from_email, application_id")
                .in("id", batch);
              if (data) recentEmails = recentEmails.concat(data);
            }

            // Count by classification type
            const counts: Record<string, number> = {};
            const sampleSubjects: Record<string, string[]> = {};
            for (const em of (recentEmails || [])) {
              const cls = em.ai_classification || "unclassified";
              counts[cls] = (counts[cls] || 0) + 1;
              if (!sampleSubjects[cls]) sampleSubjects[cls] = [];
              if (sampleSubjects[cls].length < 3) sampleSubjects[cls].push(em.subject || em.from_email || "");
            }

            const rejections = counts["rejection"] || 0;
            const interviews = counts["interview_invitation"] || 0;
            const offers = counts["offer"] || 0;
            const acknowledgments = counts["acknowledgment"] || 0;
            const autoUpdated = (recentEmails || []).filter(e => e.application_id).length;
            const totalClassified = (recentEmails || []).length;

            debugInfo.postScan = { totalClassified, counts, rejections, interviews, offers, acknowledgments, autoUpdated };
            console.log(`[sync-emails] Post-scan: ${totalClassified} classified — rejections=${rejections}, interviews=${interviews}, offers=${offers}, ack=${acknowledgments}, autoUpdated=${autoUpdated}`);

            // Send notification + email if we found anything meaningful
            // (rejections, interviews, offers, or at least 3 acknowledgments)
            const hasMeaningful = rejections > 0 || interviews > 0 || offers > 0 || acknowledgments >= 3;
            debugInfo.hasMeaningful = hasMeaningful;
            if (hasMeaningful) {
              // Build Hebrew summary lines
              const lines: string[] = [];
              if (rejections > 0) lines.push(`❌ ${rejections} דחיות`);
              if (interviews > 0) lines.push(`📞 ${interviews} הזמנות לראיון`);
              if (offers > 0) lines.push(`🎉 ${offers} הצעות עבודה`);
              if (acknowledgments > 0) lines.push(`📩 ${acknowledgments} אישורי קבלה`);
              const summaryText = lines.join(" · ");

              // In-app notification
              await supabase.from("notifications").insert({
                user_id: token.user_id,
                type: "scan_summary",
                title: `סריקת מיילים הושלמה`,
                message: `סרקנו ${saved} מיילים חדשים: ${summaryText}`,
                is_read: false,
                metadata: {
                  emails_scanned: saved,
                  rejections,
                  interviews,
                  offers,
                  acknowledgments,
                  auto_updates: autoUpdated,
                },
              });

              // Build detailed email HTML
              const SYSTEM_SENDER = "plug.hotjobs@gmail.com";
              const { data: senderToken } = await supabase.from("email_oauth_tokens")
                .select("provider, access_token, refresh_token, expires_at, user_id")
                .eq("provider", "gmail").eq("email_address", SYSTEM_SENDER).limit(1).maybeSingle();

              debugInfo.senderTokenFound = !!senderToken;
              if (senderToken) {
                let senderAccessToken = senderToken.access_token;
                if (new Date(senderToken.expires_at).getTime() - Date.now() < 5 * 60 * 1000) {
                  senderAccessToken = await getValidAccessToken(supabase, senderToken as any);
                }

                const userEmail = token.email_address || (await supabase.from("profiles").select("email").eq("user_id", token.user_id).single()).data?.email;
                debugInfo.userEmail = userEmail;
                if (userEmail) {
                  // Build category rows for email
                  const categoryRows: string[] = [];
                  if (rejections > 0) {
                    const samples = (sampleSubjects["rejection"] || []).map(s => `<li style="color:#94a3b8;font-size:13px;margin:2px 0;">${s}</li>`).join("");
                    categoryRows.push(`
                      <div style="background:#1a0a0a;border:1px solid #4a2020;border-radius:10px;padding:14px;margin-bottom:10px;">
                        <div style="font-size:15px;font-weight:700;color:#ff6b6b;margin-bottom:6px;">❌ ${rejections} דחיות</div>
                        ${samples ? `<ul style="margin:0;padding:0 16px;">${samples}</ul>` : ""}
                      </div>`);
                  }
                  if (interviews > 0) {
                    const samples = (sampleSubjects["interview_invitation"] || []).map(s => `<li style="color:#94a3b8;font-size:13px;margin:2px 0;">${s}</li>`).join("");
                    categoryRows.push(`
                      <div style="background:#0a1a0a;border:1px solid #204a20;border-radius:10px;padding:14px;margin-bottom:10px;">
                        <div style="font-size:15px;font-weight:700;color:#00ff8c;margin-bottom:6px;">📞 ${interviews} הזמנות לראיון</div>
                        ${samples ? `<ul style="margin:0;padding:0 16px;">${samples}</ul>` : ""}
                      </div>`);
                  }
                  if (offers > 0) {
                    const samples = (sampleSubjects["offer"] || []).map(s => `<li style="color:#94a3b8;font-size:13px;margin:2px 0;">${s}</li>`).join("");
                    categoryRows.push(`
                      <div style="background:#1a1a0a;border:1px solid #4a4a20;border-radius:10px;padding:14px;margin-bottom:10px;">
                        <div style="font-size:15px;font-weight:700;color:#ffd700;margin-bottom:6px;">🎉 ${offers} הצעות עבודה</div>
                        ${samples ? `<ul style="margin:0;padding:0 16px;">${samples}</ul>` : ""}
                      </div>`);
                  }
                  if (acknowledgments > 0) {
                    categoryRows.push(`
                      <div style="background:#0a0f1a;border:1px solid #203050;border-radius:10px;padding:14px;margin-bottom:10px;">
                        <div style="font-size:15px;font-weight:700;color:#60a5fa;margin-bottom:4px;">📩 ${acknowledgments} אישורי קבלת מועמדות</div>
                      </div>`);
                  }

                  const emailSubject = rejections > 0
                    ? `PLUG — סרקנו את המייל: ${rejections} דחיות${interviews > 0 ? `, ${interviews} ראיונות` : ""}`
                    : interviews > 0
                    ? `PLUG — סרקנו את המייל: ${interviews} הזמנות לראיון`
                    : `PLUG — סריקת מיילים הושלמה (${saved} מיילים)`;

                  const emailHtml = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0A1128;font-family:'Segoe UI',system-ui,sans-serif;color:#e2e8f0;">
  <div style="max-width:520px;margin:32px auto;background:#0f1f3d;border-radius:16px;border:1px solid #1e3a5f;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#0a1840,#0d2855);padding:24px 28px;border-bottom:1px solid #1e3a5f;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <span style="background:#00FF9D;color:#0A1128;font-weight:900;font-size:16px;padding:3px 10px;border-radius:8px;">PLUG</span>
        <span style="color:#8899aa;font-size:13px;">סריקת מיילים</span>
      </div>
      <h1 style="margin:0 0 4px;font-size:20px;color:#fff;">סרקנו ${saved} מיילים חדשים מהתיבה שלך</h1>
      <p style="margin:0;color:#8899aa;font-size:13px;">הנה סיכום מה שמצאנו:</p>
    </div>
    <div style="padding:20px 28px;">
      ${categoryRows.join("")}
      ${autoUpdated > 0 ? `<p style="color:#00ff8c;font-size:13px;margin-top:12px;">✓ ${autoUpdated} מועמדויות עודכנו אוטומטית בפלטפורמה</p>` : ""}
    </div>
    <div style="padding:0 28px 24px;text-align:center;">
      <a href="https://www.plug-hr.com" style="display:inline-block;background:#00FF9D;color:#0A1128;font-weight:700;padding:12px 32px;border-radius:50px;text-decoration:none;font-size:14px;">היכנס לפלטפורמה לפירוט מלא</a>
    </div>
    <div style="padding:14px 28px;border-top:1px solid #1e3a5f;text-align:center;">
      <p style="color:#4a5568;font-size:11px;margin:0;">PLUG — הפלטפורמה החכמה לחיפוש עבודה</p>
    </div>
  </div>
</body>
</html>`;

                  const subjectEncoded = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(emailSubject)))}?=`;
                  const rawMessage = [
                    `From: PLUG <${SYSTEM_SENDER}>`,
                    `To: ${userEmail}`,
                    `Subject: ${subjectEncoded}`,
                    `MIME-Version: 1.0`,
                    `Content-Type: text/html; charset=UTF-8`,
                    ``,
                    emailHtml,
                  ].join('\r\n');
                  const { encode: b64url } = await import("https://deno.land/std@0.190.0/encoding/base64url.ts");
                  const encoded = b64url(new TextEncoder().encode(rawMessage));
                  const sendRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${senderAccessToken}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ raw: encoded }),
                  });
                  const sendResText = await sendRes.text();
                  debugInfo.summaryEmailSent = sendRes.ok;
                  debugInfo.summaryEmailStatus = sendRes.status;
                  if (!sendRes.ok) debugInfo.summaryEmailError = sendResText.substring(0, 300);
                  console.log(`[sync-emails] Summary email to ${userEmail}: status=${sendRes.status} body=${sendResText.substring(0, 200)}`);
                } else {
                  debugInfo.summaryEmailSkip = "no userEmail";
                }
              } else {
                debugInfo.summaryEmailSkip = "no senderToken";
              }
            } else {
              debugInfo.summaryEmailSkip = "not meaningful";
            }
          } catch (notifErr) {
            debugInfo.postScanError = (notifErr as Error).message;
            console.error(`[sync-emails] Post-scan notification error:`, notifErr);
          }
        }

        // Update sync state
        await supabase
          .from("email_sync_state")
          .upsert({
            user_id: token.user_id,
            last_history_id: newHistoryId || syncState?.last_history_id,
            last_sync_at: new Date().toISOString(),
            emails_processed: (syncState?.emails_processed || 0) + emails.length,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });

        // Update last_synced_at on token
        await supabase
          .from("email_oauth_tokens")
          .update({ last_synced_at: new Date().toISOString() })
          .eq("user_id", token.user_id)
          .eq("provider", token.provider);

      } catch (userErr) {
        const errMsg = `Sync failed for user ${token.user_id}: ${userErr.message}`;
        console.error(errMsg);
        errors.push(errMsg);

        // Increment error count using RPC-style: fetch then update
        const { data: syncState } = await supabase
          .from("email_sync_state")
          .select("sync_errors")
          .eq("user_id", token.user_id)
          .single();
        await supabase
          .from("email_sync_state")
          .upsert({
            user_id: token.user_id,
            sync_errors: (syncState?.sync_errors || 0) + 1,
            last_error: userErr.message,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });
      }
    }

    console.log(`[sync-emails] Done. synced=${totalSynced}, users=${tokens.length}, errors=${errors.length}`);
    return new Response(
      JSON.stringify({ synced: totalSynced, users: tokens.length, errors, debug: { ...debugInfo, _savedEmailIds: `${(debugInfo._savedEmailIds as string[] || []).length} ids` } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("sync-emails error:", e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
