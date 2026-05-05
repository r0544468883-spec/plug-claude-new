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

// ── Keyword-based matching (title-only, bilingual) ────────────────

// Map preference slugs → search keywords (Hebrew + English)
const FIELD_KEYWORDS: Record<string, string[]> = {
  management: ["מנהל", "ניהול", "manager", "management", "director", "head of", "lead", "team lead", "vp"],
  marketing: ["שיווק", "מרקום", "marketing", "brand", "מותג", "סושיאל", "social", "digital", "content", "מדיה", "media", "seo", "sem", "ppc", "growth"],
  sales: ["מכירות", "sales", "account", "business development", "פיתוח עסקי", "bdm", "bdr", "sdr", "revenue"],
  tech: ["פיתוח", "תוכנה", "developer", "engineer", "software", "fullstack", "frontend", "backend", "devops", "data"],
  design: ["עיצוב", "design", "ux", "ui", "graphic", "product design", "מעצב"],
  product: ["מוצר", "product", "pm", "product manager"],
  hr: ["משאבי אנוש", "hr", "human resources", "גיוס", "recruiter", "recruiting", "talent"],
  finance: ["כספים", "finance", "חשבונאות", "accounting", "cfo", "bookkeep"],
  operations: ["תפעול", "operations", "logistics", "לוגיסטיקה", "supply chain"],
  legal: ["משפט", "legal", "עורך דין", "lawyer", "compliance"],
  support: ["תמיכה", "support", "customer success", "cs", "שירות לקוחות"],
  data: ["data", "דאטה", "analyst", "analytics", "bi", "מידע", "intelligence"],
};

const ROLE_KEYWORDS: Record<string, string[]> = {
  cto: ["cto", "chief technology", "vp r&d", "vp engineering", "head of engineering"],
  ceo: ["ceo", "chief executive", "מנכ\"ל"],
  cfo: ["cfo", "chief financial", "סמנכ\"ל כספים"],
  cmo: ["cmo", "chief marketing", "vp marketing", "סמנכ\"ל שיווק"],
  "marketing-manager": ["מנהל שיווק", "marketing manager", "head of marketing", "marketing lead", "מנהלת שיווק", "מרקום"],
  "business-development": ["פיתוח עסקי", "business development", "bd manager", "bdm", "partnerships"],
  "product-manager": ["product manager", "מנהל מוצר", "pm", "head of product"],
  "project-manager": ["project manager", "מנהל פרויקט", "pmo"],
  "full-stack": ["full stack", "fullstack", "פול סטאק"],
  frontend: ["frontend", "front end", "react", "angular", "vue"],
  backend: ["backend", "back end", "node", "python", "java", "go"],
  devops: ["devops", "dev ops", "sre", "cloud", "infrastructure"],
  "data-analyst": ["data analyst", "מנתח נתונים", "bi analyst", "business analyst", "אנליסט"],
  "data-engineer": ["data engineer", "etl", "pipeline"],
  "data-scientist": ["data scientist", "machine learning", "ml", "ai engineer"],
  designer: ["designer", "מעצב", "ux", "ui", "graphic"],
  recruiter: ["recruiter", "מגייס", "talent acquisition"],
  "account-manager": ["account manager", "מנהל לקוחות", "account executive", "ae"],
  "sales-manager": ["מנהל מכירות", "sales manager", "head of sales", "sales lead"],
};

interface UserPrefs {
  preferred_fields: string[];
  preferred_roles: string[];
  skills: string[];
}

interface ScoredJob {
  id: string;
  title: string;
  company_name: string | null;
  location: string | null;
  source_url: string | null;
  score: number;
  matchReasons: string[];
}

function scoreJobByTitle(jobTitle: string, prefs: UserPrefs): { score: number; reasons: string[] } {
  const titleLower = jobTitle.toLowerCase();
  let totalPoints = 0;
  let earnedPoints = 0;
  const reasons: string[] = [];

  // Field matching (40 weight)
  if (prefs.preferred_fields.length > 0) {
    totalPoints += 40;
    for (const field of prefs.preferred_fields) {
      const keywords = FIELD_KEYWORDS[field] || [field.replace(/-/g, ' ')];
      if (keywords.some(kw => titleLower.includes(kw.toLowerCase()))) {
        earnedPoints += 40;
        reasons.push(`תחום: ${field}`);
        break;
      }
    }
  }

  // Role matching (40 weight)
  if (prefs.preferred_roles.length > 0) {
    totalPoints += 40;
    for (const role of prefs.preferred_roles) {
      const keywords = ROLE_KEYWORDS[role] || [role.replace(/-/g, ' ')];
      if (keywords.some(kw => titleLower.includes(kw.toLowerCase()))) {
        earnedPoints += 40;
        reasons.push(`תפקיד: ${role}`);
        break;
      }
    }
  }

  // Skills matching (20 weight) — check if job title mentions any skill
  if (prefs.skills.length > 0) {
    totalPoints += 20;
    const matchedSkills: string[] = [];
    for (const skill of prefs.skills) {
      if (skill.length >= 3 && titleLower.includes(skill.toLowerCase())) {
        matchedSkills.push(skill);
      }
    }
    if (matchedSkills.length > 0) {
      earnedPoints += 20;
      reasons.push(`כישורים: ${matchedSkills.join(', ')}`);
    }
  }

  if (totalPoints === 0) return { score: 0, reasons: [] };
  return { score: Math.round((earnedPoints / totalPoints) * 100), reasons };
}

// ── Gmail helpers ─────────────────────────────────────────────────

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
  score: number;
}

function buildEmailHtml(jobs: DigestJob[], isHe: boolean): string {
  const jobRows = jobs.map(job => {
    const url = job.job_url || `${APP_URL}/jobs/${job.id}`;
    const scoreTag = `<span style="display:inline-block;background:#00FF9D;color:#0A1128;font-weight:700;font-size:11px;padding:2px 8px;border-radius:50px;margin-${isHe ? 'left' : 'right'}:8px;">${job.score}% ${isHe ? 'התאמה' : 'match'}</span>`;
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
    <div style="background:linear-gradient(135deg,#0a1840,#0d2855);padding:28px 32px;border-bottom:1px solid #1e3a5f;">
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="background:#00FF9D;color:#0A1128;font-weight:900;font-size:18px;padding:4px 10px;border-radius:8px;">PLUG</span>
        <span style="color:#8899aa;font-size:13px;">AI Job Digest</span>
      </div>
      <h1 style="margin:16px 0 4px;font-size:22px;color:#ffffff;">${headline}</h1>
      <p style="margin:0;color:#8899aa;font-size:14px;">${subtitle}</p>
    </div>
    <div style="padding:8px 32px 24px;">
      <table style="width:100%;border-collapse:collapse;">${jobRows}</table>
    </div>
    <div style="padding:0 32px 28px;text-align:center;">
      <a href="${APP_URL}" style="display:inline-block;background:#00FF9D;color:#0A1128;font-weight:700;padding:12px 32px;border-radius:50px;text-decoration:none;font-size:15px;">${ctaText} →</a>
    </div>
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
    headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: encoded }),
  });
  if (!res.ok) throw new Error(`Gmail send failed: ${await res.text()}`);
}

// ── Main ──────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  let testTo: string | null = null;
  try { const body = await req.json().catch(() => ({})); testTo = body.test_to || null; } catch {}

  // Test mode
  if (testTo) {
    const sampleJobs: DigestJob[] = [
      { id: '1', title: 'מנהל/ת שיווק דיגיטלי', company: 'WalkMe', location: 'תל אביב', job_url: APP_URL, score: 100 },
      { id: '2', title: 'Business Development Manager', company: 'Wix', location: 'תל אביב', job_url: APP_URL, score: 80 },
      { id: '3', title: 'מנהל/ת מרקום — חברת סטארטאפ', company: 'Monday.com', location: 'תל אביב / היברידי', job_url: APP_URL, score: 80 },
      { id: '4', title: 'Account Executive — SaaS', company: 'Fiverr', location: 'תל אביב', job_url: APP_URL, score: 80 },
      { id: '5', title: 'Head of Growth & Marketing', company: 'Gett', location: 'Tel Aviv', job_url: APP_URL, score: 100 },
    ];
    const { data: token } = await supabase.from("email_oauth_tokens")
      .select("access_token, refresh_token, expires_at").eq("provider", "gmail").eq("sync_enabled", true).limit(1).maybeSingle();
    if (!token) return new Response(JSON.stringify({ error: "No Gmail connected" }), { status: 404, headers: { "Content-Type": "application/json" } });

    let accessToken = token.access_token;
    if (new Date(token.expires_at).getTime() - Date.now() < 5 * 60 * 1000) accessToken = await refreshGmailToken(token.refresh_token);

    await sendGmailDigest(accessToken, testTo, "🎯 5 משרות שהכי מתאימות לך — PLUG (דוגמה)", buildEmailHtml(sampleJobs, true));
    return new Response(JSON.stringify({ sent: 1, test: true }), { headers: { "Content-Type": "application/json" } });
  }

  // ── Real digest ─────────────────────────────────────────────────

  const { data: tokens, error: tokensErr } = await supabase.from("email_oauth_tokens")
    .select("user_id, provider, access_token, refresh_token, expires_at, email_address")
    .eq("provider", "gmail").eq("sync_enabled", true);

  if (tokensErr) return new Response(JSON.stringify({ error: tokensErr.message }), { status: 500 });

  // Pre-fetch all active jobs (only title + metadata needed)
  const { data: allJobs } = await supabase.from("jobs")
    .select("id, title, company_name, location, source_url")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(500);

  const results = { sent: 0, skipped: 0, skipped_no_matches: 0, errors: 0, debug: {} as Record<string, unknown> };
  const now = new Date();

  for (const token of (tokens || [])) {
    try {
      const userId = token.user_id;

      const { data: profile } = await supabase.from("profiles")
        .select("last_digest_sent_at, languages, preferred_fields, preferred_roles, skills")
        .eq("user_id", userId).single();

      // Cooldown check
      if (profile?.last_digest_sent_at) {
        const hoursSince = (now.getTime() - new Date(profile.last_digest_sent_at).getTime()) / (1000 * 60 * 60);
        if (hoursSince < DIGEST_INTERVAL_HOURS - 1) { results.skipped++; continue; }
      }

      const isHe = Array.isArray(profile?.languages) ? profile.languages.includes('he') : profile?.languages === 'he';

      const prefs: UserPrefs = {
        preferred_fields: profile?.preferred_fields || [],
        preferred_roles: profile?.preferred_roles || [],
        skills: profile?.skills || [],
      };

      // Must have at least one preference
      if (prefs.preferred_fields.length === 0 && prefs.preferred_roles.length === 0 && prefs.skills.length === 0) {
        results.skipped_no_matches++;
        continue;
      }

      // Get applied job IDs
      const { data: applications } = await supabase.from("applications").select("job_id").eq("candidate_id", userId);
      const appliedJobIds = new Set((applications || []).map((a: any) => a.job_id).filter(Boolean));

      // Score all jobs for this user
      const scoredJobs: ScoredJob[] = [];
      for (const job of (allJobs || [])) {
        if (appliedJobIds.has(job.id)) continue;
        if (!job.title) continue;

        const { score, reasons } = scoreJobByTitle(job.title, prefs);
        if (score >= MIN_MATCH_SCORE) {
          scoredJobs.push({ ...job, score, matchReasons: reasons });
        }
      }

      // Sort by score, take top 8
      scoredJobs.sort((a, b) => b.score - a.score);
      const topJobs = scoredJobs.slice(0, 8);

      if (topJobs.length === 0) {
        console.log(`job-digest: no ${MIN_MATCH_SCORE}%+ matches for ${userId} (checked ${allJobs?.length || 0} jobs, prefs: fields=${prefs.preferred_fields}, roles=${prefs.preferred_roles})`);
        results.skipped_no_matches++;
        continue;
      }

      // Cache scores in job_match_scores
      const scoresToCache = topJobs.map(j => ({ user_id: userId, job_id: j.id, score: j.score, scored_at: now.toISOString() }));
      await supabase.from("job_match_scores").upsert(scoresToCache, { onConflict: "user_id,job_id" }).then(({ error }) => {
        if (error) console.error(`job-digest: cache error:`, error.message);
      });

      // Refresh Gmail token
      let accessToken = token.access_token;
      if (new Date(token.expires_at).getTime() - now.getTime() < 5 * 60 * 1000) {
        accessToken = await refreshGmailToken(token.refresh_token);
        await supabase.from("email_oauth_tokens")
          .update({ access_token: accessToken, expires_at: new Date(now.getTime() + 3600 * 1000).toISOString() })
          .eq("user_id", userId).eq("provider", "gmail");
      }

      const digestJobs: DigestJob[] = topJobs.map(j => ({
        id: j.id, title: j.title, score: j.score,
        company: j.company_name || undefined,
        location: (j.location || '').split('\n')[0].trim() || undefined,
        job_url: j.source_url || undefined,
      }));

      const subject = isHe
        ? `🎯 ${digestJobs.length} משרות שהכי מתאימות לך — PLUG`
        : `🎯 ${digestJobs.length} top matches for you — PLUG`;

      await sendGmailDigest(accessToken, token.email_address, subject, buildEmailHtml(digestJobs, isHe));
      await supabase.from("profiles").update({ last_digest_sent_at: now.toISOString() }).eq("user_id", userId);

      results.sent++;
      results.debug[token.email_address] = { checked: allJobs?.length || 0, above70: scoredJobs.length, sent: topJobs.length, topScore: topJobs[0]?.score, topReasons: topJobs[0]?.matchReasons };
      console.log(`job-digest: sent to ${token.email_address} (${topJobs.length} jobs, top: ${topJobs[0]?.score}% — ${topJobs[0]?.matchReasons?.join(', ')})`);
    } catch (err: any) {
      console.error(`job-digest: error for ${token.user_id}:`, err.message);
      results.errors++;
    }
  }

  return new Response(JSON.stringify(results), { headers: { "Content-Type": "application/json" } });
});
