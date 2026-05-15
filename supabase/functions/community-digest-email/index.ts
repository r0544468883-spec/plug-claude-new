import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const APP_URL = Deno.env.get("APP_URL") || "https://www.plug-hr.com";
const SENDER_EMAIL = "plug.hotjobs@gmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Types ────────────────────────────────────────────────────────

interface HubDigest {
  hubId: string;
  hubName: string;
  newPostsCount: number;
  newMembersCount: number;
  upcomingEvents: { title: string; start_at: string; is_online: boolean }[];
  newCourses: { title: string; is_free: boolean }[];
  topMembers: { userId: string; fullName: string; points: number }[];
}

// ── Email HTML builder ───────────────────────────────────────────

function buildDigestHtml(digest: HubDigest): string {
  const hubUrl = `${APP_URL}/community/${digest.hubId}`;

  // Stats row
  const stats = [
    { label: "New Posts", value: digest.newPostsCount },
    { label: "New Members", value: digest.newMembersCount },
    { label: "Upcoming Events", value: digest.upcomingEvents.length },
    { label: "New Courses", value: digest.newCourses.length },
  ];

  const statsHtml = stats
    .map(
      (s) => `
    <td style="text-align:center;padding:12px 8px;">
      <div style="font-size:28px;font-weight:800;color:#00FF9D;">${s.value}</div>
      <div style="font-size:12px;color:#8899aa;margin-top:4px;">${s.label}</div>
    </td>`
    )
    .join("");

  // Upcoming events list
  let eventsHtml = "";
  if (digest.upcomingEvents.length > 0) {
    const rows = digest.upcomingEvents
      .map((ev) => {
        const date = new Date(ev.start_at).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        const badge = ev.is_online
          ? '<span style="background:#0d2855;color:#00d4ff;font-size:10px;padding:2px 6px;border-radius:4px;">Online</span>'
          : '<span style="background:#2d1b0e;color:#ffa726;font-size:10px;padding:2px 6px;border-radius:4px;">In-Person</span>';
        return `<tr>
          <td style="padding:10px 0;border-bottom:1px solid #1e2a4a;">
            <div style="color:#f3f4f6;font-size:14px;font-weight:600;">${ev.title}</div>
            <div style="color:#8899aa;font-size:12px;margin-top:4px;">${date} ${badge}</div>
          </td>
        </tr>`;
      })
      .join("");

    eventsHtml = `
      <div style="margin-top:24px;">
        <h3 style="color:#f3f4f6;font-size:16px;margin:0 0 12px;">Upcoming Events</h3>
        <table style="width:100%;border-collapse:collapse;">${rows}</table>
      </div>`;
  }

  // New courses list
  let coursesHtml = "";
  if (digest.newCourses.length > 0) {
    const rows = digest.newCourses
      .map((c) => {
        const badge = c.is_free
          ? '<span style="background:#0b3d2e;color:#00FF9D;font-size:10px;padding:2px 6px;border-radius:4px;">Free</span>'
          : '<span style="background:#3d2e0b;color:#ffd700;font-size:10px;padding:2px 6px;border-radius:4px;">Paid</span>';
        return `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #1e2a4a;">
            <span style="color:#f3f4f6;font-size:14px;">${c.title}</span> ${badge}
          </td>
        </tr>`;
      })
      .join("");

    coursesHtml = `
      <div style="margin-top:24px;">
        <h3 style="color:#f3f4f6;font-size:16px;margin:0 0 12px;">New Courses</h3>
        <table style="width:100%;border-collapse:collapse;">${rows}</table>
      </div>`;
  }

  // Top members leaderboard
  let leaderboardHtml = "";
  if (digest.topMembers.length > 0) {
    const medals = ["#FFD700", "#C0C0C0", "#CD7F32"];
    const rows = digest.topMembers
      .map(
        (m, i) => `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #1e2a4a;">
            <span style="display:inline-block;width:24px;height:24px;line-height:24px;text-align:center;border-radius:50%;background:${medals[i] || "#1e2a4a"};color:#0A1128;font-weight:700;font-size:12px;margin-right:10px;">${i + 1}</span>
            <span style="color:#f3f4f6;font-size:14px;">${m.fullName}</span>
            <span style="color:#00FF9D;font-size:12px;margin-left:8px;">${m.points} pts</span>
          </td>
        </tr>`
      )
      .join("");

    leaderboardHtml = `
      <div style="margin-top:24px;">
        <h3 style="color:#f3f4f6;font-size:16px;margin:0 0 12px;">Top Members</h3>
        <table style="width:100%;border-collapse:collapse;">${rows}</table>
      </div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0A1128;font-family:'Segoe UI',system-ui,sans-serif;color:#e2e8f0;">
  <div style="max-width:580px;margin:32px auto;background:#0f1f3d;border-radius:16px;border:1px solid #1e3a5f;overflow:hidden;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0a1840,#0d2855);padding:28px 32px;border-bottom:1px solid #1e3a5f;">
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="background:#00FF9D;color:#0A1128;font-weight:900;font-size:18px;padding:4px 10px;border-radius:8px;">PLUG</span>
        <span style="color:#8899aa;font-size:13px;">Community Digest</span>
      </div>
      <h1 style="margin:16px 0 4px;font-size:22px;color:#ffffff;">${digest.hubName}</h1>
      <p style="margin:0;color:#8899aa;font-size:14px;">Here's what happened in your community this week</p>
    </div>

    <!-- Activity Stats -->
    <div style="padding:24px 32px 0;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>${statsHtml}</tr>
      </table>
    </div>

    <!-- Sections -->
    <div style="padding:0 32px 24px;">
      ${eventsHtml}
      ${coursesHtml}
      ${leaderboardHtml}
    </div>

    <!-- CTA -->
    <div style="padding:0 32px 28px;text-align:center;">
      <a href="${hubUrl}" style="display:inline-block;background:#00FF9D;color:#0A1128;font-weight:700;padding:12px 32px;border-radius:50px;text-decoration:none;font-size:15px;">Visit Hub &rarr;</a>
    </div>

    <!-- Footer -->
    <div style="padding:16px 32px;border-top:1px solid #1e3a5f;text-align:center;">
      <p style="color:#4a5568;font-size:11px;margin:0;">You received this email because you are a member of this community hub on PLUG.</p>
    </div>
  </div>
</body>
</html>`;
}

// ── Send email via Resend ────────────────────────────────────────

async function sendViaResend(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: `PLUG Community <${SENDER_EMAIL}>`,
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend send failed (${res.status}): ${text}`);
  }
}

// ── Main ─────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const now = new Date();
    const sevenDaysAgo = new Date(
      now.getTime() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();
    const fourteenDaysFromNow = new Date(
      now.getTime() + 14 * 24 * 60 * 60 * 1000
    ).toISOString();

    // 1. Find hubs that had activity in the last 7 days
    //    Activity = new messages in any of the hub's channels
    const { data: activeChannels } = await supabase
      .from("community_messages")
      .select("channel_id")
      .gte("created_at", sevenDaysAgo);

    if (!activeChannels || activeChannels.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No active hubs" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const activeChannelIds = [
      ...new Set(activeChannels.map((m: any) => m.channel_id)),
    ];

    // Map channels -> hubs
    const { data: channels } = await supabase
      .from("community_channels")
      .select("id, hub_id")
      .in("id", activeChannelIds);

    const activeHubIds = [
      ...new Set((channels || []).map((c: any) => c.hub_id)),
    ];

    if (activeHubIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No active hubs" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch hub details
    const { data: hubs } = await supabase
      .from("community_hubs")
      .select("id, name_en, name_he")
      .in("id", activeHubIds);

    if (!hubs || hubs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No hubs found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build a map of hub_id -> channel_ids for counting messages
    const hubChannelMap: Record<string, string[]> = {};
    for (const ch of channels || []) {
      if (!hubChannelMap[ch.hub_id]) hubChannelMap[ch.hub_id] = [];
      hubChannelMap[ch.hub_id].push(ch.id);
    }

    // 3. Build digest data for each hub
    const digests: HubDigest[] = [];

    for (const hub of hubs) {
      const hubChannelIds = hubChannelMap[hub.id] || [];

      // New posts count (messages in hub channels in last 7 days)
      let newPostsCount = 0;
      if (hubChannelIds.length > 0) {
        const { count } = await supabase
          .from("community_messages")
          .select("id", { count: "exact", head: true })
          .in("channel_id", hubChannelIds)
          .gte("created_at", sevenDaysAgo);
        newPostsCount = count || 0;
      }

      // Upcoming events (next 14 days)
      const { data: events } = await supabase
        .from("community_events")
        .select("title, title_he, start_at, is_online")
        .eq("hub_id", hub.id)
        .gte("start_at", now.toISOString())
        .lte("start_at", fourteenDaysFromNow)
        .in("status", ["published", "draft"])
        .order("start_at", { ascending: true })
        .limit(5);

      // New courses (created in last 7 days)
      const { data: courses } = await supabase
        .from("community_courses")
        .select("title, title_he, is_free")
        .eq("hub_id", hub.id)
        .eq("is_published", true)
        .gte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: false })
        .limit(5);

      // Top 3 members by points
      const { data: topMembers } = await supabase
        .from("community_members")
        .select("user_id, points")
        .eq("hub_id", hub.id)
        .order("points", { ascending: false })
        .limit(3);

      // Resolve member names
      const resolvedMembers: { userId: string; fullName: string; points: number }[] = [];
      for (const member of topMembers || []) {
        if ((member.points || 0) <= 0) continue;
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", member.user_id)
          .single();
        resolvedMembers.push({
          userId: member.user_id,
          fullName: profile?.full_name || "Community Member",
          points: member.points || 0,
        });
      }

      // New members count (joined in last 7 days)
      const { count: newMembersCount } = await supabase
        .from("community_members")
        .select("id", { count: "exact", head: true })
        .eq("hub_id", hub.id)
        .gte("joined_at", sevenDaysAgo);

      digests.push({
        hubId: hub.id,
        hubName: hub.name_en || hub.name_he || "Community Hub",
        newPostsCount,
        newMembersCount: newMembersCount || 0,
        upcomingEvents: (events || []).map((e: any) => ({
          title: e.title || e.title_he,
          start_at: e.start_at,
          is_online: e.is_online,
        })),
        newCourses: (courses || []).map((c: any) => ({
          title: c.title || c.title_he,
          is_free: c.is_free,
        })),
        topMembers: resolvedMembers,
      });
    }

    // 4. For each hub, get members and send digest emails
    let totalSent = 0;
    let totalErrors = 0;
    const errorDetails: string[] = [];

    for (const digest of digests) {
      // Skip hubs with zero activity to report
      if (
        digest.newPostsCount === 0 &&
        digest.upcomingEvents.length === 0 &&
        digest.newCourses.length === 0 &&
        digest.newMembersCount === 0
      ) {
        continue;
      }

      // Get all members of this hub
      const { data: members } = await supabase
        .from("community_members")
        .select("user_id")
        .eq("hub_id", digest.hubId);

      if (!members || members.length === 0) continue;

      const html = buildDigestHtml(digest);
      const subject = `Weekly Digest: ${digest.hubName} -- ${digest.newPostsCount} new posts, ${digest.upcomingEvents.length} upcoming events`;

      for (const member of members) {
        try {
          // Get user email from auth
          const { data: authUser } =
            await supabase.auth.admin.getUserById(member.user_id);
          const email = authUser?.user?.email;
          if (!email) continue;

          // Skip system/test accounts
          if (
            email.includes("plug-demo.com") ||
            email.includes("plug-test.com") ||
            email === SENDER_EMAIL
          ) {
            continue;
          }

          await sendViaResend(email, subject, html);
          totalSent++;
        } catch (err: any) {
          totalErrors++;
          errorDetails.push(
            `${member.user_id}: ${err.message}`
          );
          console.error(
            `community-digest: error for user ${member.user_id}:`,
            err.message
          );
        }
      }
    }

    const result = {
      success: true,
      hubs_processed: digests.length,
      sent: totalSent,
      errors: totalErrors,
      ...(errorDetails.length > 0 && { errorDetails }),
    };

    console.log(
      `community-digest: processed ${digests.length} hubs, sent ${totalSent} emails, ${totalErrors} errors`
    );

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("community-digest: fatal error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
