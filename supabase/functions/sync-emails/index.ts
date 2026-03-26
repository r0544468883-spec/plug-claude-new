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
    if (!res.ok) throw new Error(`Gmail refresh failed`);
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

  if (lastHistoryId) {
    // Incremental sync via History API
    const historyRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${lastHistoryId}&historyTypes=messageAdded`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!historyRes.ok) {
      // History ID expired — fall back to full sync
      return syncGmailFull(accessToken, userId);
    }

    const historyData = await historyRes.json();
    const newHistoryId = historyData.historyId || lastHistoryId;
    const messageIds = new Set<string>();

    for (const record of historyData.history || []) {
      for (const added of record.messagesAdded || []) {
        messageIds.add(added.message.id);
      }
    }

    for (const msgId of messageIds) {
      const email = await fetchGmailMessage(accessToken, msgId);
      if (email) emails.push(email);
    }

    return { emails, newHistoryId };
  } else {
    return syncGmailFull(accessToken, userId);
  }
}

async function syncGmailFull(accessToken: string, userId: string): Promise<{ emails: ParsedEmail[]; newHistoryId: string | null }> {
  // First sync: get last 30 days of messages
  const emails: ParsedEmail[] = [];
  const after = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);

  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=after:${after}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!listRes.ok) return { emails: [], newHistoryId: null };

  const listData = await listRes.json();
  let newHistoryId: string | null = null;

  for (const msg of (listData.messages || []).slice(0, 50)) {
    const email = await fetchGmailMessage(accessToken, msg.id);
    if (email) {
      emails.push(email);
    }
  }

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
  userId: string
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

  // 2. Domain match — sender domain vs companies.website
  const senderDomain = email.from_email.split("@")[1];
  if (senderDomain) {
    const { data: apps } = await supabase
      .from("applications")
      .select("id, company_name")
      .eq("user_id", userId)
      .not("stage", "in", "(rejected,hired,withdrawn)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (apps) {
      // Check if any application's company matches the domain
      for (const app of apps) {
        if (app.company_name && senderDomain.toLowerCase().includes(
          app.company_name.toLowerCase().replace(/\s+/g, "").substring(0, 10)
        )) {
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

    // Support per-user sync via body.user_id
    const body = await req.json().catch(() => ({}));
    const targetUserId = body.user_id || null;

    // Get users with sync_enabled tokens
    let tokenQuery = supabase
      .from("email_oauth_tokens")
      .select("*")
      .eq("sync_enabled", true);

    if (targetUserId) {
      tokenQuery = tokenQuery.eq("user_id", targetUserId);
    }

    const { data: tokens, error: tokenErr } = await tokenQuery;

    if (tokenErr || !tokens?.length) {
      return new Response(
        JSON.stringify({ message: "No accounts to sync", synced: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalSynced = 0;
    const errors: string[] = [];

    for (const token of tokens) {
      try {
        const accessToken = await getValidAccessToken(supabase, token);

        // Get sync state
        const { data: syncState } = await supabase
          .from("email_sync_state")
          .select("*")
          .eq("user_id", token.user_id)
          .single();

        let emails: ParsedEmail[] = [];
        let newHistoryId: string | null = null;

        if (token.provider === "gmail") {
          const result = await syncGmail(
            accessToken,
            token.user_id,
            syncState?.last_history_id || null,
            supabase
          );
          emails = result.emails;
          newHistoryId = result.newHistoryId;
        } else {
          const result = await syncOutlook(
            accessToken,
            token.user_id,
            syncState?.last_sync_at || null
          );
          emails = result.emails;
        }

        // Process each email
        for (const email of emails) {
          // Check if already synced
          const { data: existing } = await supabase
            .from("application_emails")
            .select("id")
            .eq("provider_msg_id", email.provider_msg_id)
            .eq("user_id", token.user_id)
            .limit(1);

          if (existing && existing.length > 0) continue;

          // Match to application
          const applicationId = await matchEmailToApplication(supabase, email, token.user_id);

          // Save email
          const { data: savedEmail } = await supabase
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

          // Classify with AI if linked to an application
          if (savedEmail && applicationId) {
            try {
              await fetch(CLASSIFY_URL, {
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
                  application_id: applicationId,
                  auto_update: true,
                  user_id: token.user_id,
                }),
              });
            } catch (classifyErr) {
              console.error("Classification failed for email:", savedEmail.id, classifyErr);
            }
          }

          totalSynced++;
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

        // Increment error count
        await supabase
          .from("email_sync_state")
          .upsert({
            user_id: token.user_id,
            sync_errors: (await supabase.from("email_sync_state").select("sync_errors").eq("user_id", token.user_id).single()).data?.sync_errors + 1 || 1,
            last_error: userErr.message,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });
      }
    }

    return new Response(
      JSON.stringify({ synced: totalSynced, users: tokens.length, errors }),
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
