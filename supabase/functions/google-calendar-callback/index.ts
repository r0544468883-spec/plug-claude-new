import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_CLIENT_ID     = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL              = Deno.env.get("APP_URL") || "http://localhost:8081";

const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/google-calendar-callback`;

serve(async (req) => {
  const url   = new URL(req.url);
  const code  = url.searchParams.get("code");
  const state = url.searchParams.get("state");   // user_id
  const err   = url.searchParams.get("error");

  if (err) {
    return Response.redirect(`${APP_URL}?gcal_error=${encodeURIComponent(err)}`, 302);
  }
  if (!code || !state) {
    return Response.redirect(`${APP_URL}?gcal_error=missing_params`, 302);
  }

  // Exchange auth code → tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id:     GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri:  REDIRECT_URI,
      grant_type:    "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const detail = await tokenRes.text();
    console.error("Token exchange failed:", detail);
    return Response.redirect(`${APP_URL}?gcal_error=token_exchange_failed`, 302);
  }

  const { access_token, refresh_token, expires_in, scope } = await tokenRes.json();
  const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

  // Store tokens
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { error: dbErr } = await supabase
    .from("google_calendar_tokens")
    .upsert(
      {
        user_id:       state,
        access_token,
        refresh_token,
        expires_at:    expiresAt,
        scope,
        updated_at:    new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (dbErr) {
    console.error("DB error:", dbErr);
    return Response.redirect(`${APP_URL}?gcal_error=db_error`, 302);
  }

  return Response.redirect(`${APP_URL}?gcal_connected=true`, 302);
});
