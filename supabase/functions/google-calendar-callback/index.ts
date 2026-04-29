import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_CLIENT_ID     = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL              = Deno.env.get("APP_URL") || "https://plug-claude-new-psi.vercel.app";

const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/google-calendar-callback`;

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
    <div class="icon">${success ? "📅✅" : "❌"}</div>
    <h1>${success ? "יומן Google חובר!" : "שגיאה בחיבור"}</h1>
    <p>${success ? "Google Calendar חובר בהצלחה לחשבון ה-PLUG שלך.<br/>PLUG יוכל לראות ולנהל ראיונות בלוח הזמנים שלך." : `לא הצלחנו לחבר את היומן${error ? `: ${error}` : ""}. אנא נסה שוב.`}</p>
    <button class="btn" onclick="window.close()">חזור לאפליקציה ←</button>
    <p class="hint">חלון זה יסגר אוטומטית בעוד <span id="t">5</span> שניות</p>
  </div>
  <script>
    if (window.opener) {
      try { window.opener.postMessage({ type: 'PLUG_OAUTH_SUCCESS', provider: 'calendar' }, '*'); } catch(e) {}
    }
    let n=5; const el=document.getElementById('t');
    const iv=setInterval(()=>{ n--; if(el) el.textContent=n; if(n<=0){clearInterval(iv);window.close();} },1000);
  </script>
</body>
</html>`;

const toEntities = (s: string) => s.replace(/[^\x00-\x7F]/g, c => `&#x${c.codePointAt(0)!.toString(16)};`);

const htmlResponse = (success: boolean, error?: string) =>
  new Response(toEntities(htmlPage(success, error)), { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 200 });

serve(async (req) => {
  const url   = new URL(req.url);
  const code  = url.searchParams.get("code");
  const state = url.searchParams.get("state");   // user_id
  const err   = url.searchParams.get("error");

  if (err) {
    return htmlResponse(false, err || "unknown");
  }
  if (!code || !state) {
    return htmlResponse(false, "missing_params");
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
    return htmlResponse(false, "token_exchange_failed");
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
    return htmlResponse(false, "db_error");
  }

  return htmlResponse(true);
});
