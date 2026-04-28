import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LINKEDIN_CLIENT_ID     = Deno.env.get("LINKEDIN_CLIENT_ID") || "";
const LINKEDIN_CLIENT_SECRET = Deno.env.get("LINKEDIN_CLIENT_SECRET") || "";
const SUPABASE_URL           = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/linkedin-callback`;

const htmlPage = (success: boolean, error?: string) => `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${success ? "חיבור הצליח" : "שגיאה בחיבור"}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; background: hsl(220 47% 5.5%); color: #fff; min-height: 100vh; display: flex; align-items: center; justify-content: center; text-align: center; }
    .card { background: hsl(220 40% 8%); border: 1px solid ${success ? "hsl(156 100% 50% / 0.3)" : "hsl(0 84% 60% / 0.3)"}; border-radius: 1.5rem; padding: 2.5rem 3rem; max-width: 420px; width: 90%; box-shadow: 0 0 40px ${success ? "hsl(156 100% 50% / 0.1)" : "hsl(0 84% 60% / 0.1)"}; }
    .icon { font-size: 3.5rem; margin-bottom: 1rem; }
    h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.75rem; color: ${success ? "hsl(156 100% 50%)" : "hsl(0 84% 60%)"}; }
    p { color: hsl(215 20% 65%); line-height: 1.6; margin-bottom: 1.5rem; }
    .hint { font-size: 0.85rem; color: hsl(215 20% 45%); margin-top: 1rem; }
    .btn { display: inline-block; background: hsl(156 100% 50%); color: hsl(220 47% 5.5%); font-weight: 700; padding: 0.75rem 2rem; border-radius: 9999px; border: none; cursor: pointer; font-size: 1rem; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${success ? "💼✅" : "❌"}</div>
    <h1>${success ? "LinkedIn חובר!" : "שגיאה בחיבור"}</h1>
    <p>${success
      ? "LinkedIn חובר בהצלחה לחשבון ה-PLUG שלך.<br/>הפרטים מהפרופיל שלך יסונכרנו אוטומטית."
      : `לא הצלחנו לחבר את LinkedIn${error ? `: ${error}` : ""}. אנא נסה שוב.`
    }</p>
    <button class="btn" onclick="window.close()">חזור לאפליקציה ←</button>
    <p class="hint">חלון זה יסגר אוטומטית בעוד <span id="t">5</span> שניות</p>
  </div>
  <script>
    if (window.opener) {
      try { window.opener.postMessage({ type: 'PLUG_OAUTH_SUCCESS', provider: 'linkedin' }, '*'); } catch(e) {}
    }
    let n=5; const el=document.getElementById('t');
    const iv=setInterval(()=>{ n--; if(el) el.textContent=n; if(n<=0){clearInterval(iv);window.close();} },1000);
  </script>
</body>
</html>`;

const htmlResponse = (success: boolean, error?: string) =>
  new Response(htmlPage(success, error), { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 200 });

serve(async (req) => {
  const url   = new URL(req.url);
  const code  = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // user_id
  const err   = url.searchParams.get("error");

  if (err) return htmlResponse(false, err);
  if (!code || !state) return htmlResponse(false, "missing_params");

  if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
    return htmlResponse(false, "LinkedIn credentials not configured");
  }

  // Exchange code → tokens
  const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id:     LINKEDIN_CLIENT_ID,
      client_secret: LINKEDIN_CLIENT_SECRET,
      redirect_uri:  REDIRECT_URI,
      grant_type:    "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    console.error("LinkedIn token exchange failed:", await tokenRes.text());
    return htmlResponse(false, "token_exchange_failed");
  }

  const { access_token, expires_in } = await tokenRes.json();
  const expiresAt = new Date(Date.now() + (expires_in || 5184000) * 1000).toISOString();

  // Fetch profile via OpenID Connect userinfo
  const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  let linkedinProfile: Record<string, any> = {};
  if (profileRes.ok) {
    linkedinProfile = await profileRes.json();
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Update profile with LinkedIn data
  const profileUpdates: Record<string, any> = {
    linkedin_connected: true,
    linkedin_access_token: access_token,
    linkedin_token_expires_at: expiresAt,
    linkedin_sub: linkedinProfile.sub || null,
  };

  // Only update name/photo if profile doesn't have them yet
  if (linkedinProfile.name) profileUpdates.linkedin_display_name = linkedinProfile.name;
  if (linkedinProfile.picture) profileUpdates.linkedin_picture = linkedinProfile.picture;
  if (linkedinProfile.email) profileUpdates.linkedin_email = linkedinProfile.email;

  // If no avatar, use LinkedIn picture
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("avatar_url, full_name")
    .eq("user_id", state)
    .single();

  if (!existingProfile?.avatar_url?.trim() && linkedinProfile.picture) {
    profileUpdates.avatar_url = linkedinProfile.picture;
  }
  if (!existingProfile?.full_name?.trim() && linkedinProfile.name) {
    profileUpdates.full_name = linkedinProfile.name;
  }

  const { error: dbErr } = await supabase
    .from("profiles")
    .update(profileUpdates as any)
    .eq("user_id", state);

  if (dbErr) {
    console.error("DB error:", dbErr);
    return htmlResponse(false, "db_error");
  }

  return htmlResponse(true);
});
