import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64url } from "https://deno.land/std@0.190.0/encoding/base64url.ts";

const GOOGLE_CLIENT_ID     = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const MICROSOFT_CLIENT_ID     = Deno.env.get("MICROSOFT_CLIENT_ID") || "";
const MICROSOFT_CLIENT_SECRET = Deno.env.get("MICROSOFT_CLIENT_SECRET") || "";
const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function refreshGmailToken(refreshToken: string) {
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
  return res.json();
}

async function refreshOutlookToken(refreshToken: string) {
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
  if (!res.ok) throw new Error(`Outlook refresh failed: ${await res.text()}`);
  return res.json();
}

async function getValidToken(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  tokenRow: { provider: string; access_token: string; refresh_token: string; expires_at: string }
) {
  const expiresAt = new Date(tokenRow.expires_at);
  // Refresh if expiring within 5 minutes
  if (expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    const refreshFn = tokenRow.provider === "gmail" ? refreshGmailToken : refreshOutlookToken;
    const refreshed = await refreshFn(tokenRow.refresh_token);
    const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

    await supabase
      .from("email_oauth_tokens")
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token || tokenRow.refresh_token,
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("provider", tokenRow.provider);

    return refreshed.access_token;
  }
  return tokenRow.access_token;
}

function buildRfc2822(from: string, to: string, subject: string, bodyHtml: string, replyToMsgId?: string): string {
  const encoder = new TextEncoder();
  const boundary = `boundary_${Date.now()}`;
  let headers = `From: ${from}\r\nTo: ${to}\r\nSubject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=\r\nMIME-Version: 1.0\r\n`;
  if (replyToMsgId) {
    headers += `In-Reply-To: ${replyToMsgId}\r\nReferences: ${replyToMsgId}\r\n`;
  }
  headers += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n\r\n`;

  const textBody = bodyHtml.replace(/<[^>]*>/g, "");
  const body = `--${boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${textBody}\r\n--${boundary}\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${bodyHtml}\r\n--${boundary}--`;

  const raw = headers + body;
  return base64url(encoder.encode(raw));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const anonClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !user) throw new Error("Unauthorized");

    const { to, subject, body_html, application_id, reply_to_message_id, provider_preference } = await req.json();
    if (!to || !subject || !body_html) throw new Error("Missing required fields: to, subject, body_html");

    // Get email tokens (prefer requested provider, fallback to any connected)
    let tokenQuery = supabase
      .from("email_oauth_tokens")
      .select("*")
      .eq("user_id", user.id);

    if (provider_preference) {
      tokenQuery = tokenQuery.eq("provider", provider_preference);
    }

    const { data: tokens, error: tokenErr } = await tokenQuery.limit(1).single();
    if (tokenErr || !tokens) throw new Error("No email account connected. Please connect Gmail or Outlook first.");

    const accessToken = await getValidToken(supabase, user.id, tokens);
    let providerMsgId = "";

    if (tokens.provider === "gmail") {
      // Send via Gmail API
      const raw = buildRfc2822(tokens.email_address, to, subject, body_html, reply_to_message_id);
      const sendRes = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ raw }),
        }
      );

      if (!sendRes.ok) {
        const detail = await sendRes.text();
        console.error("Gmail send failed:", detail);
        throw new Error("Failed to send email via Gmail");
      }

      const sendData = await sendRes.json();
      providerMsgId = sendData.id || "";
    } else {
      // Send via Microsoft Graph
      const sendRes = await fetch(
        "https://graph.microsoft.com/v1.0/me/sendMail",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              subject,
              body: { contentType: "HTML", content: body_html },
              toRecipients: [{ emailAddress: { address: to } }],
            },
          }),
        }
      );

      if (!sendRes.ok) {
        const detail = await sendRes.text();
        console.error("Outlook send failed:", detail);
        throw new Error("Failed to send email via Outlook");
      }
    }

    // Save to application_emails
    const { error: saveErr } = await supabase
      .from("application_emails")
      .insert({
        application_id: application_id || null,
        user_id: user.id,
        provider_msg_id: providerMsgId,
        direction: "sent",
        from_email: tokens.email_address,
        to_email: to,
        subject,
        body_text: body_html.replace(/<[^>]*>/g, ""),
        body_html,
      });

    if (saveErr) console.error("Failed to save email record:", saveErr);

    // Add timeline event if linked to application
    if (application_id) {
      await supabase.from("application_timeline").insert({
        application_id,
        event_type: "email_sent",
        title: "מייל נשלח",
        description: `נושא: ${subject}`,
        created_by: user.id,
      });
    }

    return new Response(
      JSON.stringify({ success: true, provider: tokens.provider, from: tokens.email_address }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("send-email-via-user error:", e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
