import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64url } from "https://deno.land/std@0.190.0/encoding/base64url.ts";

// ============================================================
// Extension Promo Email
// - One-time blast to all existing users
// - Also used as day-after-signup automated email (mode=onboarding)
// ============================================================

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SYSTEM_SENDER_EMAIL = Deno.env.get("SYSTEM_SENDER_EMAIL") || "plug.hotjobs@gmail.com";
const APP_URL = Deno.env.get("APP_URL") || "https://www.plug-hr.com";
const EXTENSION_PAGE_URL = `${APP_URL}/extension`;

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

async function sendViaGmail(accessToken: string, to: string, subject: string, html: string) {
  const rawEmail = [
    `From: =?UTF-8?B?${btoa(unescape(encodeURIComponent("פלאג — PLUG")))}?= <${SYSTEM_SENDER_EMAIL}>`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
    ``,
    html,
  ].join("\r\n");

  const encoded = base64url(new TextEncoder().encode(rawEmail));
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: encoded }),
  });
  if (!res.ok) throw new Error(`Send failed: ${await res.text()}`);
}

function buildPromoHtml(name: string): string {
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0a0e1a;font-family:'Segoe UI',system-ui,sans-serif;direction:rtl;text-align:right;unicode-bidi:embed;">
<div style="max-width:580px;margin:0 auto;padding:32px 20px;">
  <div style="background:#111827;border-radius:16px;padding:32px;border:1px solid #1f2937;">
    <!-- Logo -->
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:28px;font-weight:800;background:linear-gradient(135deg,#00ff8c,#00d4ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">פלאג PLUG</span>
    </div>

    <!-- Greeting -->
    <p style="color:#f3f4f6;font-size:16px;margin:0 0 16px;">היי ${name},</p>
    <p style="color:#9ca3af;font-size:15px;margin:0 0 8px;">שמנו לב שאתה משתמש בפלאג לחיפוש עבודה — מעולה!</p>
    <p style="color:#9ca3af;font-size:15px;margin:0 0 24px;">אבל ידעת שיש לנו <strong style="color:#f3f4f6;">תוסף לכרום</strong> שחוסך לך המון זמן?</p>

    <!-- Features -->
    <div style="background:#0d1424;border-radius:12px;padding:20px;margin-bottom:24px;border:1px solid #1e2a4a;">
      <p style="color:#00ff8c;font-weight:700;font-size:14px;margin:0 0 12px;">מה התוסף עושה:</p>
      <table style="width:100%;">
        <tr><td style="padding:6px 0;color:#d1d5db;font-size:14px;">✅ סורק אוטומטית משרות מ-AllJobs ולינקדין</td></tr>
        <tr><td style="padding:6px 0;color:#d1d5db;font-size:14px;">✅ מנתח עם בינה מלאכותית אם המשרה מתאימה לך</td></tr>
        <tr><td style="padding:6px 0;color:#d1d5db;font-size:14px;">✅ שומר הכל אוטומטית בחשבון פלאג שלך</td></tr>
        <tr><td style="padding:6px 0;color:#d1d5db;font-size:14px;">✅ מילוי טפסים אוטומטי בהגשת מועמדות</td></tr>
      </table>
    </div>

    <!-- CTA -->
    <p style="color:#f3f4f6;font-size:15px;font-weight:600;margin:0 0 16px;text-align:center;">בקיצור: במקום לגלוש שעות — התוסף עושה את העבודה בשבילך.</p>

    <div style="text-align:center;margin-bottom:16px;">
      <a href="${EXTENSION_PAGE_URL}" style="display:inline-block;background:linear-gradient(135deg,#00ff8c,#00d4ff);color:#0a0e1a;font-weight:700;font-size:16px;padding:14px 32px;border-radius:12px;text-decoration:none;">⬇️ הורד את התוסף של פלאג</a>
    </div>

    <!-- Install instructions -->
    <div style="background:#0d1424;border-radius:12px;padding:16px;margin-bottom:24px;border:1px solid #1e2a4a;">
      <p style="color:#00ff8c;font-weight:700;font-size:13px;margin:0 0 8px;">איך מתקינים? (30 שניות)</p>
      <table style="width:100%;">
        <tr><td style="padding:4px 0;color:#9ca3af;font-size:13px;">1. לחץ על הכפתור למעלה להורדת הקובץ</td></tr>
        <tr><td style="padding:4px 0;color:#9ca3af;font-size:13px;">2. פתח את Chrome וכנס ל- <span style="color:#d1d5db;">chrome://extensions</span></td></tr>
        <tr><td style="padding:4px 0;color:#9ca3af;font-size:13px;">3. הפעל "מצב מפתח" (Developer Mode) בפינה הימנית</td></tr>
        <tr><td style="padding:4px 0;color:#9ca3af;font-size:13px;">4. חלץ את הקובץ וגרור את התיקייה לדף התוספים</td></tr>
      </table>
    </div>

    <p style="color:#6b7280;font-size:13px;margin:0 0 4px;">כבר התקנת? מעולה, אפשר להתעלם מהמייל הזה.</p>
    <p style="color:#6b7280;font-size:13px;margin:0;">שאלות? <a href="https://wa.me/972544468883" style="color:#00ff8c;text-decoration:none;">שלח לנו בוואטסאפ</a></p>

    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #1f2937;text-align:center;">
      <p style="color:#4b5563;font-size:11px;margin:0;">בהצלחה בחיפוש! 💪<br/>צוות פלאג</p>
    </div>
  </div>
</div>
</body></html>`;
}

function buildOnboardingHtml(name: string): string {
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0a0e1a;font-family:'Segoe UI',system-ui,sans-serif;direction:rtl;text-align:right;unicode-bidi:embed;">
<div style="max-width:580px;margin:0 auto;padding:32px 20px;">
  <div style="background:#111827;border-radius:16px;padding:32px;border:1px solid #1f2937;">
    <!-- Logo -->
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:28px;font-weight:800;background:linear-gradient(135deg,#00ff8c,#00d4ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">פלאג PLUG</span>
    </div>

    <p style="color:#f3f4f6;font-size:16px;margin:0 0 16px;">היי ${name},</p>
    <p style="color:#9ca3af;font-size:15px;margin:0 0 8px;">יום ראשון בפלאג! מקווים שהתרשמת 🙂</p>
    <p style="color:#9ca3af;font-size:15px;margin:0 0 24px;">רצינו לשתף את <strong style="color:#f3f4f6;">הטיפ הכי חשוב שלנו:</strong></p>

    <!-- Highlight box -->
    <div style="background:linear-gradient(135deg,rgba(0,255,140,0.1),rgba(0,212,255,0.1));border-radius:12px;padding:20px;margin-bottom:24px;border:1px solid rgba(0,255,140,0.3);">
      <p style="color:#00ff8c;font-weight:700;font-size:17px;margin:0 0 12px;text-align:center;">התקן את התוסף של פלאג לכרום</p>
      <p style="color:#d1d5db;font-size:14px;margin:0;text-align:center;">וחיפוש העבודה שלך ישתנה לגמרי.</p>
    </div>

    <!-- Why -->
    <div style="background:#0d1424;border-radius:12px;padding:20px;margin-bottom:24px;border:1px solid #1e2a4a;">
      <p style="color:#f3f4f6;font-weight:700;font-size:14px;margin:0 0 12px;">למה?</p>
      <table style="width:100%;">
        <tr><td style="padding:6px 0;color:#d1d5db;font-size:14px;">🔍 נכנסת ללינקדין? התוסף סורק ומנתח משרות אוטומטית</td></tr>
        <tr><td style="padding:6px 0;color:#d1d5db;font-size:14px;">💼 גולש באולג'ובס? התוסף מזהה משרות מתאימות בזמן אמת</td></tr>
        <tr><td style="padding:6px 0;color:#d1d5db;font-size:14px;">💾 כל מה שהתוסף מוצא — נשמר אוטומטית בחשבון פלאג שלך</td></tr>
      </table>
    </div>

    <!-- CTA -->
    <p style="color:#f3f4f6;font-size:15px;font-weight:600;margin:0 0 16px;text-align:center;">זה לוקח 30 שניות להתקנה. באמת.</p>

    <div style="text-align:center;margin-bottom:16px;">
      <a href="${EXTENSION_PAGE_URL}" style="display:inline-block;background:linear-gradient(135deg,#00ff8c,#00d4ff);color:#0a0e1a;font-weight:700;font-size:16px;padding:14px 32px;border-radius:12px;text-decoration:none;">⬇️ הורד את התוסף של פלאג</a>
    </div>

    <!-- Install instructions -->
    <div style="background:#0d1424;border-radius:12px;padding:16px;margin-bottom:24px;border:1px solid #1e2a4a;">
      <p style="color:#00ff8c;font-weight:700;font-size:13px;margin:0 0 8px;">איך מתקינים?</p>
      <table style="width:100%;">
        <tr><td style="padding:4px 0;color:#9ca3af;font-size:13px;">1. לחץ על הכפתור למעלה להורדת הקובץ</td></tr>
        <tr><td style="padding:4px 0;color:#9ca3af;font-size:13px;">2. פתח את Chrome וכנס ל- <span style="color:#d1d5db;">chrome://extensions</span></td></tr>
        <tr><td style="padding:4px 0;color:#9ca3af;font-size:13px;">3. הפעל "מצב מפתח" (Developer Mode) בפינה הימנית</td></tr>
        <tr><td style="padding:4px 0;color:#9ca3af;font-size:13px;">4. חלץ את הקובץ וגרור את התיקייה לדף התוספים</td></tr>
      </table>
    </div>

    <p style="color:#6b7280;font-size:13px;margin:0;">שאלות? <a href="https://wa.me/972544468883" style="color:#00ff8c;text-decoration:none;">שלח לנו בוואטסאפ</a></p>

    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #1f2937;text-align:center;">
      <p style="color:#4b5563;font-size:11px;margin:0;">בהצלחה! 💪<br/>צוות פלאג</p>
    </div>
  </div>
</div>
</body></html>`;
}

serve(async (req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Get system sender's Gmail token
  const { data: sysToken } = await supabase
    .from("email_oauth_tokens")
    .select("refresh_token")
    .eq("email_address", SYSTEM_SENDER_EMAIL)
    .single();

  if (!sysToken?.refresh_token) {
    return new Response(JSON.stringify({ error: "No system Gmail token" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let accessToken: string;
  try {
    accessToken = await refreshGmailToken(sysToken.refresh_token);
  } catch (e) {
    return new Response(JSON.stringify({ error: `Gmail auth failed: ${(e as Error).message}` }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse mode: "blast" (all users) or "onboarding" (users who signed up yesterday)
  // Optional: test_email + test_name to send a single test
  let mode = "blast";
  let testEmail: string | null = null;
  let testName: string | null = null;
  try {
    const body = await req.json();
    if (body.mode) mode = body.mode;
    if (body.test_email) testEmail = body.test_email;
    if (body.test_name) testName = body.test_name;
  } catch { /* no body = blast */ }

  let users: { email: string; full_name: string | null }[] = [];

  // Test mode: send to a single email only
  if (testEmail) {
    users = [{ email: testEmail, full_name: testName || testEmail.split("@")[0] }];
  } else if (mode === "onboarding") {
    // Users who signed up ~24h ago (between 24-48h ago to avoid timing issues)
    const { data } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .gte("created_at", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
      .lte("created_at", new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString());

    if (data && data.length > 0) {
      // Get emails from auth.users
      for (const p of data) {
        const { data: authUser } = await supabase.auth.admin.getUserById(p.user_id);
        if (authUser?.user?.email) {
          users.push({ email: authUser.user.email, full_name: p.full_name });
        }
      }
    }
  } else {
    // Blast: get all users with profiles
    const { data } = await supabase
      .from("profiles")
      .select("user_id, full_name");

    if (data && data.length > 0) {
      for (const p of data) {
        const { data: authUser } = await supabase.auth.admin.getUserById(p.user_id);
        if (authUser?.user?.email) {
          users.push({ email: authUser.user.email, full_name: p.full_name });
        }
      }
    }
  }

  // Filter out system/test accounts
  users = users.filter(u =>
    !u.email.includes("plug-demo.com") &&
    !u.email.includes("plug-test.com") &&
    u.email !== SYSTEM_SENDER_EMAIL
  );

  let sent = 0;
  let errors = 0;
  const errorDetails: string[] = [];

  for (const user of users) {
    const name = user.full_name || (user.email.split("@")[0]);
    const subject = mode === "onboarding"
      ? "טיפ מפלאג: ככה תחפש עבודה פי 3 יותר מהר"
      : "חיפוש עבודה חכם יותר — הכרת את התוסף של פלאג?";
    const html = mode === "onboarding"
      ? buildOnboardingHtml(name)
      : buildPromoHtml(name);

    try {
      await sendViaGmail(accessToken, user.email, subject, html);
      sent++;
    } catch (e) {
      errors++;
      errorDetails.push(`${user.email}: ${(e as Error).message}`);
    }
  }

  return new Response(
    JSON.stringify({ mode, sent, errors, total_users: users.length, errorDetails }),
    { headers: { "Content-Type": "application/json" } }
  );
});
