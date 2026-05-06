import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================
// PLUG Daily Health Check — runs every morning at 08:00 Israel
// Checks all integrations and sends report email
// ============================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("CLAUDE_API_KEY") || "";
const PLUG_CLIENT_KEY = Deno.env.get("PLUG_CLIENT_KEY") || "";
const REPORT_EMAIL = "r0544468883@gmail.com";
const SYSTEM_SENDER_EMAIL = Deno.env.get("SYSTEM_SENDER_EMAIL") || "plug.hotjobs@gmail.com";

interface CheckResult {
  name: string;
  status: "ok" | "warning" | "error";
  detail: string;
}

serve(async (_req) => {
  const results: CheckResult[] = [];
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // ── 1. AI Credits (Anthropic API) ─────────────────────────────
  try {
    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 5,
        messages: [{ role: "user", content: "hi" }],
      }),
    });

    if (aiRes.ok) {
      results.push({ name: "AI Credits", status: "ok", detail: "API key valid, credits available" });
    } else {
      const err = await aiRes.text();
      if (err.includes("credit balance")) {
        results.push({ name: "AI Credits", status: "error", detail: "Credit balance too low — AI disabled for all users" });
      } else if (err.includes("authentication")) {
        results.push({ name: "AI Credits", status: "error", detail: "API key invalid or revoked" });
      } else {
        results.push({ name: "AI Credits", status: "error", detail: `API error: ${err.slice(0, 200)}` });
      }
    }
  } catch (e) {
    results.push({ name: "AI Credits", status: "error", detail: `Exception: ${(e as Error).message}` });
  }

  // ── 2. Gmail OAuth — check all connected users ────────────────
  try {
    const { data: tokens, error: tokErr } = await supabase
      .from("email_oauth_tokens")
      .select("user_id, provider, refresh_token, email_address, sync_enabled");

    if (tokErr) {
      results.push({ name: "Gmail OAuth", status: "error", detail: `DB query failed: ${tokErr.message}` });
    } else if (!tokens || tokens.length === 0) {
      results.push({ name: "Gmail OAuth", status: "warning", detail: "No users connected to Gmail/Outlook" });
    } else {
      let validCount = 0;
      let brokenCount = 0;
      const brokenUsers: string[] = [];

      for (const token of tokens) {
        if (token.provider === "gmail" && token.refresh_token) {
          try {
            const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                refresh_token: token.refresh_token,
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                grant_type: "refresh_token",
              }),
            });
            if (refreshRes.ok) {
              validCount++;
            } else {
              brokenCount++;
              brokenUsers.push(token.email_address || token.user_id);
            }
          } catch {
            brokenCount++;
            brokenUsers.push(token.email_address || token.user_id);
          }
        } else {
          validCount++; // Outlook or no refresh needed
        }
      }

      if (brokenCount === 0) {
        results.push({ name: "Gmail OAuth", status: "ok", detail: `${validCount} users connected, all tokens valid` });
      } else {
        results.push({
          name: "Gmail OAuth",
          status: "error",
          detail: `${validCount} valid, ${brokenCount} broken. Broken: ${brokenUsers.join(", ")}`,
        });
      }
    }
  } catch (e) {
    results.push({ name: "Gmail OAuth", status: "error", detail: `Exception: ${(e as Error).message}` });
  }

  // ── 3. Google Calendar — check tokens & last sync ─────────────
  try {
    const { data: calTokens, error: calErr } = await supabase
      .from("google_calendar_tokens")
      .select("user_id, refresh_token, last_synced_at");

    if (calErr) {
      results.push({ name: "Google Calendar", status: "error", detail: `DB query failed: ${calErr.message}` });
    } else if (!calTokens || calTokens.length === 0) {
      results.push({ name: "Google Calendar", status: "warning", detail: "No users connected to Google Calendar" });
    } else {
      let staleCount = 0;
      const now = Date.now();
      const twentyFourHours = 24 * 60 * 60 * 1000;

      for (const cal of calTokens) {
        if (!cal.last_synced_at || (now - new Date(cal.last_synced_at).getTime()) > twentyFourHours) {
          staleCount++;
        }
      }

      if (staleCount === 0) {
        results.push({ name: "Google Calendar", status: "ok", detail: `${calTokens.length} users synced within 24h` });
      } else {
        results.push({
          name: "Google Calendar",
          status: "warning",
          detail: `${calTokens.length} connected, ${staleCount} not synced in 24h`,
        });
      }
    }
  } catch (e) {
    results.push({ name: "Google Calendar", status: "error", detail: `Exception: ${(e as Error).message}` });
  }

  // ── 4. AllJobs (Extension) — recent data in DB ────────────────
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentJobs, error: jobErr } = await supabase
      .from("jobs")
      .select("id")
      .eq("external_source", "alljobs")
      .gte("created_at", twentyFourHoursAgo);

    if (jobErr) {
      results.push({ name: "AllJobs (Extension)", status: "error", detail: `DB query failed: ${jobErr.message}` });
    } else {
      const count = recentJobs?.length || 0;
      if (count > 0) {
        results.push({ name: "AllJobs (Extension)", status: "ok", detail: `${count} jobs scraped in last 24h` });
      } else {
        results.push({ name: "AllJobs (Extension)", status: "warning", detail: "No new AllJobs data in 24h — extension may not be running" });
      }
    }
  } catch (e) {
    results.push({ name: "AllJobs (Extension)", status: "error", detail: `Exception: ${(e as Error).message}` });
  }

  // ── 5. LinkedIn (Extension) — recent data in DB ───────────────
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentJobs, error: jobErr } = await supabase
      .from("jobs")
      .select("id")
      .eq("external_source", "linkedin")
      .gte("created_at", twentyFourHoursAgo);

    if (jobErr) {
      results.push({ name: "LinkedIn (Extension)", status: "error", detail: `DB query failed: ${jobErr.message}` });
    } else {
      const count = recentJobs?.length || 0;
      if (count > 0) {
        results.push({ name: "LinkedIn (Extension)", status: "ok", detail: `${count} jobs scraped in last 24h` });
      } else {
        results.push({ name: "LinkedIn (Extension)", status: "warning", detail: "No new LinkedIn data in 24h — extension may not be running" });
      }
    }
  } catch (e) {
    results.push({ name: "LinkedIn (Extension)", status: "error", detail: `Exception: ${(e as Error).message}` });
  }

  // ── 6. Job Digest Email — dry run ─────────────────────────────
  try {
    const digestRes = await fetch(`${SUPABASE_URL}/functions/v1/job-digest-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({ dry_run: true }),
    });

    if (digestRes.ok) {
      const digestData = await digestRes.json();
      if (digestData.errors && digestData.errors > 0) {
        results.push({ name: "Job Digest", status: "error", detail: `Function ran but had ${digestData.errors} errors` });
      } else {
        results.push({
          name: "Job Digest",
          status: "ok",
          detail: `Ready: ${digestData.sent || 0} would send, ${digestData.skipped || 0} skipped`,
        });
      }
    } else {
      const err = await digestRes.text();
      results.push({ name: "Job Digest", status: "error", detail: `Function failed: ${err.slice(0, 200)}` });
    }
  } catch (e) {
    results.push({ name: "Job Digest", status: "error", detail: `Exception: ${(e as Error).message}` });
  }

  // ── Build & Send Report Email ─────────────────────────────────
  const statusIcon = (s: string) => s === "ok" ? "&#x2705;" : s === "warning" ? "&#x26A0;&#xFE0F;" : "&#x274C;";
  const overallStatus = results.some(r => r.status === "error") ? "ERRORS FOUND" :
    results.some(r => r.status === "warning") ? "WARNINGS" : "ALL GOOD";

  const today = new Date().toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });

  const emailHtml = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"/></head>
<body style="font-family: 'Segoe UI', sans-serif; background: #0a0e1a; color: #fff; padding: 24px;">
  <div style="max-width: 600px; margin: 0 auto; background: #111827; border-radius: 12px; padding: 24px; border: 1px solid #1f2937;">
    <h1 style="color: #00ff8c; font-size: 20px; margin: 0 0 8px;">PLUG Health Check</h1>
    <p style="color: #9ca3af; margin: 0 0 20px;">${today} | ${overallStatus}</p>
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="border-bottom: 1px solid #374151;">
          <th style="text-align: right; padding: 8px; color: #9ca3af; font-size: 12px;">Status</th>
          <th style="text-align: right; padding: 8px; color: #9ca3af; font-size: 12px;">Component</th>
          <th style="text-align: right; padding: 8px; color: #9ca3af; font-size: 12px;">Details</th>
        </tr>
      </thead>
      <tbody>
        ${results.map(r => `
        <tr style="border-bottom: 1px solid #1f2937;">
          <td style="padding: 10px 8px; font-size: 18px;">${statusIcon(r.status)}</td>
          <td style="padding: 10px 8px; color: #f3f4f6; font-weight: 600;">${r.name}</td>
          <td style="padding: 10px 8px; color: #9ca3af; font-size: 13px;">${r.detail}</td>
        </tr>`).join("")}
      </tbody>
    </table>
    <p style="color: #6b7280; font-size: 11px; margin-top: 20px; text-align: center;">PLUG Automated Health Check | Sent daily at 08:00</p>
  </div>
</body>
</html>`;

  // Send via Gmail (system account) using nodemailer-style raw send
  // We'll use the existing send-email-via-user pattern but with system account
  try {
    // Try sending via system Gmail (plug.hotjobs@gmail.com)
    const { data: sysToken } = await supabase
      .from("email_oauth_tokens")
      .select("refresh_token")
      .eq("email_address", SYSTEM_SENDER_EMAIL)
      .single();

    if (sysToken?.refresh_token) {
      // Refresh access token
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          refresh_token: sysToken.refresh_token,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          grant_type: "refresh_token",
        }),
      });

      if (tokenRes.ok) {
        const { access_token } = await tokenRes.json();

        // Build RFC 2822 email
        const boundary = "plug_health_" + Date.now();
        const rawEmail = [
          `From: PLUG System <${SYSTEM_SENDER_EMAIL}>`,
          `To: ${REPORT_EMAIL}`,
          `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(`PLUG Health Check | ${today} | ${overallStatus}`)))}?=`,
          `MIME-Version: 1.0`,
          `Content-Type: text/html; charset=UTF-8`,
          ``,
          emailHtml,
        ].join("\r\n");

        const encodedEmail = base64url(new TextEncoder().encode(rawEmail));

        const sendRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ raw: encodedEmail }),
        });

        if (!sendRes.ok) {
          console.error("Gmail send failed:", await sendRes.text());
        }
      }
    } else {
      // Fallback: log results if no system email connected
      console.log("No system email connected. Report:", JSON.stringify(results));
    }
  } catch (e) {
    console.error("Email send error:", (e as Error).message);
  }

  // Return results as JSON (useful for manual invocation)
  return new Response(
    JSON.stringify({ status: overallStatus, checks: results, timestamp: new Date().toISOString() }),
    { headers: { "Content-Type": "application/json" } }
  );
});
