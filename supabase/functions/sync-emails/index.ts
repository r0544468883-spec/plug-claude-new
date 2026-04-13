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
  supabase: ReturnType<typeof createClient>
): Promise<{ emails: ParsedEmail[]; newHistoryId: string | null }> {
  const emails: ParsedEmail[] = [];

  // Always do full sync to ensure we catch all emails
  console.log("[sync-emails] Running FULL sync (always)");
  return syncGmailFull(accessToken, userId);
}

async function syncGmailFull(accessToken: string, userId: string): Promise<{ emails: ParsedEmail[]; newHistoryId: string | null }> {
  // First sync: get last 30 days of messages
  const emails: ParsedEmail[] = [];
  const after = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);

  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=after:${after}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!listRes.ok) {
    const errBody = await listRes.text();
    console.error(`[sync-emails] Gmail list failed: ${listRes.status} ${errBody}`);
    return { emails: [], newHistoryId: null };
  }

  const listData = await listRes.json();
  console.log(`[sync-emails] Full sync: Gmail returned ${listData.messages?.length || 0} message IDs, resultSizeEstimate=${listData.resultSizeEstimate}`);
  let newHistoryId: string | null = null;

  const msgs = (listData.messages || []).slice(0, 20);
  // Fetch all messages in parallel (much faster than sequential)
  const fetches = msgs.map(msg => fetchGmailMessage(accessToken, msg.id));
  const results = await Promise.all(fetches);
  for (const email of results) {
    if (email) emails.push(email);
  }
  console.log(`[sync-emails] Fetched ${emails.length} emails in parallel`);

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
  const haystack = `${subjectLower} ${bodySnippet}`;

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

    for (const token of tokens) {
      try {
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
            supabase
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

        // Process each email
        debugInfo.processingStarted = true;
        debugInfo.emailsToProcess = emails.length;
        let skipped = 0, saved = 0, failed = 0;
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

          // Match to application
          const applicationId = await matchEmailToApplication(supabase, email, token.user_id);
          console.log(`[sync-emails] Saving email "${email.subject}" — matched app: ${applicationId || "none"}`);
          if (!debugInfo.matchResults) debugInfo.matchResults = [];
          (debugInfo.matchResults as unknown[]).push({ subject: email.subject, from: email.from_email, matched: applicationId });

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

          // Classify ALL saved emails with AI (fire-and-forget to avoid timeout)
          if (savedEmail) {
            fetch(CLASSIFY_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
                "apikey": SUPABASE_SERVICE_KEY,
              },
              body: JSON.stringify({
                email_id: savedEmail.id,
                subject: email.subject,
                body_text: email.body_text,
                from_email: email.from_email,
                application_id: applicationId || null,
                auto_update: true,
                user_id: token.user_id,
              }),
            }).catch(err => console.error("Classification failed:", err));
            console.log(`[sync-emails] Classification triggered for "${email.subject}" (app=${applicationId || "unmatched"})`);
          }

          totalSynced++;
        }
        debugInfo.skipped = skipped;
        debugInfo.saved = saved;
        debugInfo.failed = failed;
        console.log(`[sync-emails] Results: saved=${saved}, skipped=${skipped}, failed=${failed}`);

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
      JSON.stringify({ synced: totalSynced, users: tokens.length, errors, debug: debugInfo }),
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
