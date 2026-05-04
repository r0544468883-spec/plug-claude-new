import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64url } from "https://deno.land/std@0.190.0/encoding/base64url.ts";

const GOOGLE_CLIENT_ID     = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL              = Deno.env.get("APP_URL") || "https://www.plug-hr.com";

const DIGEST_INTERVAL_HOURS = 48;
const MIN_MATCH_SCORE = 70;

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

interface DigestJob {
  title: string;
  company?: string;
  location?: string;
  id: string;
  job_url?: string;
  score?: number;
}

function buildEmailHtml(jobs: DigestJob[], isHe: boolean): string {
  const jobRows = jobs.map(job => {
    const url = job.job_url || `${APP_URL}/jobs/${job.id}`;
    const scoreTag = job.score
      ? `<span style="display:inline-block;background:#00FF9D;color:#0A1128;font-weight:700;font-size:11px;padding:2px 8px;border-radius:50px;margin-${isHe ? 'left' : 'right'}:8px;">${job.score}% ${isHe ? 'התאמה' : 'match'}</span>`
      : '';
    return `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #1e2a4a;">
          <div>
            ${scoreTag}
            <a href="${url}" style="color:#00FF9D;font-weight:600;font-size:15px;text-decoration:none;">${job.title}</a>
          </div>
          <span style="color:#8899aa;font-size:13px;">${[job.company, job.location].filter(Boolean).join(' · ')}</span>
        </td>
      </tr>
    `;
  }).join('');

  const headline = isHe
    ? `🎯 ${jobs.length} משרות שהכי מתאימות לך`
    : `🎯 ${jobs.length} top matches for you`;
  const subtitle = isHe
    ? 'המשרות האלה נבחרו במיוחד בשבילך על סמך הפרופיל, הכישורים והניסיון שלך'
    : 'These jobs were hand-picked for you based on your profile, skills, and experience';
  const ctaText = isHe ? 'צפה בכל ההתאמות שלך' : 'View all your matches';
  const footerText = isHe
    ? 'קיבלת מייל זה כי יש לך חשבון PLUG פעיל. רק משרות מעל 70% התאמה נכללות.'
    : 'You received this email because you have an active PLUG account. Only 70%+ matches are included.';

  return `<!DOCTYPE html>
<html dir="${isHe ? 'rtl' : 'ltr'}" lang="${isHe ? 'he' : 'en'}">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0A1128;font-family:'Segoe UI',system-ui,sans-serif;color:#e2e8f0;">
  <div style="max-width:560px;margin:32px auto;background:#0f1f3d;border-radius:16px;border:1px solid #1e3a5f;overflow:hidden;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0a1840,#0d2855);padding:28px 32px;border-bottom:1px solid #1e3a5f;">
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="background:#00FF9D;color:#0A1128;font-weight:900;font-size:18px;padding:4px 10px;border-radius:8px;">PLUG</span>
        <span style="color:#8899aa;font-size:13px;">AI Job Digest</span>
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
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  let testTo: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    testTo = body.test_to || null;
  } catch { /* no body */ }

  // Test mode — send sample email
  if (testTo) {
    const sampleJobs: DigestJob[] = [
      { id: '1', title: 'Full Stack Developer', company: 'WalkMe', location: 'Tel Aviv', job_url: APP_URL, score: 92 },
      { id: '2', title: 'Frontend Engineer (React)', company: 'Wix', location: 'Tel Aviv', job_url: APP_URL, score: 87 },
      { id: '3', title: 'Backend Developer — Node.js', company: 'Monday.com', location: 'Tel Aviv / Hybrid', job_url: APP_URL, score: 81 },
      { id: '4', title: 'DevOps Engineer', company: 'Fiverr', location: 'Tel Aviv', job_url: APP_URL, score: 75 },
      { id: '5', title: 'Mobile Developer (React Native)', company: 'Gett', location: 'Tel Aviv', job_url: APP_URL, score: 71 },
    ];
    const { data: token } = await supabase
      .from("email_oauth_tokens")
      .select("access_token, refresh_token, expires_at")
      .eq("provider", "gmail")
      .eq("sync_enabled", true)
      .limit(1)
      .maybeSingle();

    if (!token) {
      return new Response(JSON.stringify({ error: "No Gmail account connected" }), {
        status: 404, headers: { "Content-Type": "application/json" },
      });
    }

    let accessToken = token.access_token;
    if (new Date(token.expires_at).getTime() - Date.now() < 5 * 60 * 1000) {
      accessToken = await refreshGmailToken(token.refresh_token);
    }

    const subject = "🎯 5 משרות שהכי מתאימות לך — PLUG (דוגמה)";
    await sendGmailDigest(accessToken, testTo, subject, buildEmailHtml(sampleJobs, true));
    return new Response(JSON.stringify({ sent: 1, test: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── Real digest flow ─────────────────────────────────────────────
  const { data: tokens, error: tokensErr } = await supabase
    .from("email_oauth_tokens")
    .select("user_id, provider, access_token, refresh_token, expires_at, email_address")
    .eq("provider", "gmail")
    .eq("sync_enabled", true);

  if (tokensErr) {
    console.error("job-digest: error fetching tokens:", tokensErr);
    return new Response(JSON.stringify({ error: tokensErr.message }), { status: 500 });
  }

  const results = { sent: 0, skipped: 0, skipped_no_matches: 0, errors: 0 };
  const now = new Date();

  for (const token of (tokens || [])) {
    try {
      const userId = token.user_id;

      // Check if digest was sent recently
      const { data: profile } = await supabase
        .from("profiles")
        .select("last_digest_sent_at, languages")
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

      const langs = profile?.languages;
      const isHe = Array.isArray(langs) ? langs.includes('he') : langs === 'he';

      // Get applied job IDs
      const { data: applications } = await supabase
        .from("applications")
        .select("job_id")
        .eq("candidate_id", userId);
      const appliedJobIds = new Set((applications || []).map((a: any) => a.job_id).filter(Boolean));

      // Fetch jobs with match scores >= 70% for this user
      const { data: matchedJobs } = await supabase
        .from("job_match_scores")
        .select("job_id, score, jobs!inner(id, title, company_name, location, source_url, created_at)")
        .eq("user_id", userId)
        .gte("score", MIN_MATCH_SCORE)
        .order("score", { ascending: false })
        .limit(20);

      // Filter out applied jobs and build digest list
      const digestJobs: DigestJob[] = [];
      for (const match of (matchedJobs || [])) {
        const job = (match as any).jobs;
        if (!job || appliedJobIds.has(job.id)) continue;
        digestJobs.push({
          id: job.id,
          title: job.title,
          company: job.company_name || undefined,
          location: job.location || undefined,
          job_url: job.source_url || undefined,
          score: match.score,
        });
        if (digestJobs.length >= 8) break;
      }

      // No 70%+ matches → skip this user (don't send random jobs)
      if (digestJobs.length === 0) {
        console.log(`job-digest: no 70%+ matches for user ${userId}, skipping`);
        results.skipped_no_matches++;
        continue;
      }

      // Refresh Gmail token if needed
      let accessToken = token.access_token;
      const expiresAt = new Date(token.expires_at);
      if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
        accessToken = await refreshGmailToken(token.refresh_token);
        await supabase
          .from("email_oauth_tokens")
          .update({ access_token: accessToken, expires_at: new Date(now.getTime() + 3600 * 1000).toISOString() })
          .eq("user_id", userId)
          .eq("provider", "gmail");
      }

      const subject = isHe
        ? `🎯 ${digestJobs.length} משרות שהכי מתאימות לך — PLUG`
        : `🎯 ${digestJobs.length} top matches for you — PLUG`;

      await sendGmailDigest(accessToken, token.email_address, subject, buildEmailHtml(digestJobs, isHe));

      // Update last digest sent
      await supabase
        .from("profiles")
        .update({ last_digest_sent_at: now.toISOString() })
        .eq("user_id", userId);

      results.sent++;
      console.log(`job-digest: sent to ${token.email_address} (${digestJobs.length} jobs, top score: ${digestJobs[0].score}%)`);
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
