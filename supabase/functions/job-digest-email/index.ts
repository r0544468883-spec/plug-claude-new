import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64url } from "https://deno.land/std@0.190.0/encoding/base64url.ts";

const GOOGLE_CLIENT_ID     = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL              = Deno.env.get("APP_URL") || "https://plug-claude-new-psi.vercel.app";

const DIGEST_INTERVAL_HOURS = 48; // send every 2 days

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

function buildEmailHtml(jobs: Array<{ title: string; company?: string; location?: string; id: string; job_url?: string }>, isHe: boolean): string {
  const jobRows = jobs.map(job => {
    const url = job.job_url || `${APP_URL}/jobs/${job.id}`;
    return `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #1e2a4a;">
          <a href="${url}" style="color:#00FF9D;font-weight:600;font-size:15px;text-decoration:none;">${job.title}</a><br/>
          <span style="color:#8899aa;font-size:13px;">${[job.company, job.location].filter(Boolean).join(' · ')}</span>
        </td>
      </tr>
    `;
  }).join('');

  const headline = isHe ? `🔍 ${jobs.length} משרות חדשות מחכות לך` : `🔍 ${jobs.length} new jobs waiting for you`;
  const subtitle = isHe ? 'PLUG מצא בשבילך את המשרות הכי רלוונטיות השבוע' : 'PLUG found the most relevant jobs for you this week';
  const ctaText  = isHe ? 'ראה את כל המשרות' : 'View all jobs';
  const footerText = isHe ? 'קיבלת מייל זה כי יש לך חשבון PLUG פעיל.' : 'You received this email because you have an active PLUG account.';

  return `<!DOCTYPE html>
<html dir="${isHe ? 'rtl' : 'ltr'}" lang="${isHe ? 'he' : 'en'}">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0A1128;font-family:'Segoe UI',system-ui,sans-serif;color:#e2e8f0;">
  <div style="max-width:560px;margin:32px auto;background:#0f1f3d;border-radius:16px;border:1px solid #1e3a5f;overflow:hidden;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0a1840,#0d2855);padding:28px 32px;border-bottom:1px solid #1e3a5f;">
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="background:#00FF9D;color:#0A1128;font-weight:900;font-size:18px;padding:4px 10px;border-radius:8px;">PLUG</span>
        <span style="color:#8899aa;font-size:13px;">Job Digest</span>
      </div>
      <h1 style="margin:16px 0 4px;font-size:22px;color:#ffffff;">${headline}</h1>
      <p style="margin:0;color:#8899aa;font-size:14px;">${subtitle}</p>
    </div>
    <!-- Jobs list -->
    <div style="padding:8px 32px 24px;">
      <table style="width:100%;border-collapse:collapse;">
        ${jobRows}
      </table>
    </div>
    <!-- CTA -->
    <div style="padding:0 32px 28px;text-align:center;">
      <a href="${APP_URL}" style="display:inline-block;background:#00FF9D;color:#0A1128;font-weight:700;padding:12px 32px;border-radius:50px;text-decoration:none;font-size:15px;">${ctaText} →</a>
    </div>
    <!-- Footer -->
    <div style="padding:16px 32px;border-top:1px solid #1e3a5f;text-align:center;">
      <p style="color:#4a5568;font-size:11px;margin:0;">${footerText}</p>
    </div>
  </div>
</body>
</html>`;
}

async function sendGmailDigest(accessToken: string, toEmail: string, subject: string, bodyHtml: string): Promise<void> {
  const subjectEncoded = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const rawMessage = [
    `From: PLUG Jobs <${toEmail}>`,
    `To: ${toEmail}`,
    `Subject: ${subjectEncoded}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
    ``,
    bodyHtml,
  ].join('\r\n');

  const encoded = base64url(new TextEncoder().encode(rawMessage));

  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/send`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: encoded }),
  });

  if (!res.ok) throw new Error(`Gmail send failed: ${await res.text()}`);
}

serve(async (req) => {
  // Only allow POST (called by cron or manually)
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Fetch all users with Gmail connected and sync enabled
  const { data: tokens, error: tokensErr } = await supabase
    .from("email_oauth_tokens")
    .select("user_id, provider, access_token, refresh_token, expires_at, email_address")
    .eq("provider", "gmail")
    .eq("sync_enabled", true);

  if (tokensErr) {
    console.error("job-digest: error fetching tokens:", tokensErr);
    return new Response(JSON.stringify({ error: tokensErr.message }), { status: 500 });
  }

  const results = { sent: 0, skipped: 0, errors: 0 };
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - DIGEST_INTERVAL_HOURS * 60 * 60 * 1000).toISOString();

  for (const token of (tokens || [])) {
    try {
      const userId = token.user_id;

      // Check if digest was sent recently
      const { data: profile } = await supabase
        .from("profiles")
        .select("last_digest_sent_at, language")
        .eq("user_id", userId)
        .single();

      if (profile?.last_digest_sent_at) {
        const lastSent = new Date(profile.last_digest_sent_at);
        const hoursSince = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);
        if (hoursSince < DIGEST_INTERVAL_HOURS - 1) {
          results.skipped++;
          continue;
        }
      }

      const isHe = profile?.language === 'he';

      // Get applied job IDs for this user
      const { data: applications } = await supabase
        .from("applications")
        .select("job_id")
        .eq("user_id", userId);
      const appliedJobIds = new Set((applications || []).map((a: any) => a.job_id).filter(Boolean));

      // Fetch new jobs from the last 2 days, not yet applied
      const { data: jobs } = await supabase
        .from("jobs")
        .select("id, title, company_id, location, job_url, created_at")
        .gte("created_at", twoDaysAgo)
        .order("created_at", { ascending: false })
        .limit(20);

      // Filter out already applied jobs
      const newJobs = (jobs || []).filter((j: any) => !appliedJobIds.has(j.id)).slice(0, 8);

      if (newJobs.length === 0) {
        results.skipped++;
        continue;
      }

      // Enrich with company names if available
      const companyIds = [...new Set(newJobs.map((j: any) => j.company_id).filter(Boolean))];
      let companyMap: Record<string, string> = {};
      if (companyIds.length > 0) {
        const { data: companies } = await supabase
          .from("clients")
          .select("id, name")
          .in("id", companyIds);
        companyMap = Object.fromEntries((companies || []).map((c: any) => [c.id, c.name]));
      }

      const enrichedJobs = newJobs.map((j: any) => ({
        id: j.id,
        title: j.title,
        company: companyMap[j.company_id] || undefined,
        location: j.location || undefined,
        job_url: j.job_url || undefined,
      }));

      // Refresh Gmail token if expiring soon
      let accessToken = token.access_token;
      const expiresAt = new Date(token.expires_at);
      if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
        accessToken = await refreshGmailToken(token.refresh_token);
        // Update token in DB
        await supabase
          .from("email_oauth_tokens")
          .update({ access_token: accessToken, expires_at: new Date(now.getTime() + 3600 * 1000).toISOString() })
          .eq("user_id", userId)
          .eq("provider", "gmail");
      }

      const subject = isHe
        ? `🔍 ${enrichedJobs.length} משרות חדשות מחכות לך — PLUG`
        : `🔍 ${enrichedJobs.length} new jobs waiting for you — PLUG`;

      await sendGmailDigest(accessToken, token.email_address, subject, buildEmailHtml(enrichedJobs, isHe));

      // Update last digest sent time
      await supabase
        .from("profiles")
        .update({ last_digest_sent_at: now.toISOString() })
        .eq("user_id", userId);

      results.sent++;
      console.log(`job-digest: sent to ${token.email_address} (${enrichedJobs.length} jobs)`);
    } catch (err: any) {
      console.error(`job-digest: error for user ${token.user_id}:`, err.message);
      results.errors++;
    }
  }

  console.log(`job-digest complete:`, results);
  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json" },
  });
});
