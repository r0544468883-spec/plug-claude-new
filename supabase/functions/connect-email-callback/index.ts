import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_CLIENT_ID     = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const MICROSOFT_CLIENT_ID     = Deno.env.get("MICROSOFT_CLIENT_ID") || "";
const MICROSOFT_CLIENT_SECRET = Deno.env.get("MICROSOFT_CLIENT_SECRET") || "";
const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL              = Deno.env.get("APP_URL") || "http://localhost:8081";

const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/connect-email-callback`;

serve(async (req) => {
  const url   = new URL(req.url);
  const code  = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // format: "{user_id}:{provider}"
  const err   = url.searchParams.get("error");

  if (err) {
    return Response.redirect(`${APP_URL}?email_error=${encodeURIComponent(err)}`, 302);
  }
  if (!code || !state) {
    return Response.redirect(`${APP_URL}?email_error=missing_params`, 302);
  }

  const [userId, provider] = state.split(":");
  if (!userId || !provider || !["gmail", "outlook"].includes(provider)) {
    return Response.redirect(`${APP_URL}?email_error=invalid_state`, 302);
  }

  let tokenData: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  let emailAddress = "";

  try {
    if (provider === "gmail") {
      // Exchange code for tokens with Google
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenRes.ok) {
        const detail = await tokenRes.text();
        console.error("Gmail token exchange failed:", detail);
        return Response.redirect(`${APP_URL}?email_error=token_exchange_failed`, 302);
      }

      tokenData = await tokenRes.json();

      // Get user's email address from Gmail profile
      const profileRes = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/profile",
        { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
      );
      if (profileRes.ok) {
        const profile = await profileRes.json();
        emailAddress = profile.emailAddress || "";
      }
    } else {
      // Outlook — exchange code with Microsoft
      const tokenRes = await fetch(
        "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: MICROSOFT_CLIENT_ID,
            client_secret: MICROSOFT_CLIENT_SECRET,
            redirect_uri: REDIRECT_URI,
            grant_type: "authorization_code",
            scope: "Mail.Send Mail.Read offline_access User.Read",
          }),
        }
      );

      if (!tokenRes.ok) {
        const detail = await tokenRes.text();
        console.error("Outlook token exchange failed:", detail);
        return Response.redirect(`${APP_URL}?email_error=token_exchange_failed`, 302);
      }

      tokenData = await tokenRes.json();

      // Get user's email from Microsoft Graph
      const profileRes = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (profileRes.ok) {
        const profile = await profileRes.json();
        emailAddress = profile.mail || profile.userPrincipalName || "";
      }
    }
  } catch (e) {
    console.error("OAuth error:", e);
    return Response.redirect(`${APP_URL}?email_error=oauth_failed`, 302);
  }

  // Store tokens in email_oauth_tokens
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { error: dbErr } = await supabase
    .from("email_oauth_tokens")
    .upsert(
      {
        user_id: userId,
        provider,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
        email_address: emailAddress,
        sync_enabled: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" }
    );

  if (dbErr) {
    console.error("DB error:", dbErr);
    return Response.redirect(`${APP_URL}?email_error=db_error`, 302);
  }

  // Initialize sync state
  await supabase
    .from("email_sync_state")
    .upsert(
      { user_id: userId, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );

  return Response.redirect(`${APP_URL}?email_connected=true&provider=${provider}`, 302);
});
