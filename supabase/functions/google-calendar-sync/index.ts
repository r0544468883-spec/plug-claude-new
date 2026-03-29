import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_CLIENT_ID     = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY    = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function refreshToken(rt: string): Promise<{ access_token: string; expires_in: number } | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: rt,
      client_id:     GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type:    "refresh_token",
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

/** Guess task type from event title */
function guessTaskType(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("interview") || t.includes("ראיון"))        return "interview";
  if (t.includes("phone") || t.includes("שיחה") || t.includes("call")) return "phone_call";
  if (t.includes("technical") || t.includes("טכני"))         return "frontal_interview";
  if (t.includes("task") || t.includes("assignment") || t.includes("מטלה")) return "home_assignment";
  if (t.includes("follow") || t.includes("מעקב"))           return "followup";
  if (t.includes("deadline") || t.includes("דד"))           return "deadline";
  return "meeting";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    // Verify JWT → get user
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });
    }

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get stored tokens
    const { data: tokenData, error: tokenErr } = await serviceClient
      .from("google_calendar_tokens")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (tokenErr || !tokenData) {
      return new Response(JSON.stringify({ error: "not_connected" }), { status: 400, headers: corsHeaders });
    }

    let accessToken = tokenData.access_token;

    // Refresh if expired
    if (tokenData.expires_at && new Date(tokenData.expires_at) <= new Date()) {
      if (!tokenData.refresh_token) {
        return new Response(JSON.stringify({ error: "token_expired_reconnect" }), { status: 400, headers: corsHeaders });
      }
      const refreshed = await refreshToken(tokenData.refresh_token);
      if (!refreshed) {
        return new Response(JSON.stringify({ error: "refresh_failed" }), { status: 400, headers: corsHeaders });
      }
      accessToken = refreshed.access_token;
      await serviceClient.from("google_calendar_tokens").update({
        access_token: accessToken,
        expires_at:   new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        updated_at:   new Date().toISOString(),
      }).eq("user_id", user.id);
    }

    // Fetch upcoming events (next 14 days) from ALL calendars
    const now          = new Date().toISOString();
    const twoWeeks     = new Date(Date.now() + 14 * 86400 * 1000).toISOString();

    // Get list of all calendars
    const calListRes = await fetch(
      `https://www.googleapis.com/calendar/v3/users/me/calendarList`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    let calendarIds = ["primary"];
    if (calListRes.ok) {
      const { items: calendars = [] } = await calListRes.json();
      calendarIds = calendars
        .filter((c: any) => c.selected !== false)
        .map((c: any) => c.id);
      if (calendarIds.length === 0) calendarIds = ["primary"];
    }

    // Fetch events from all calendars
    const allEvents: any[] = [];
    for (const calId of calendarIds) {
      const calRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events` +
        `?timeMin=${now}&timeMax=${twoWeeks}&maxResults=50&singleEvents=true&orderBy=startTime`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (calRes.ok) {
        const { items = [] } = await calRes.json();
        allEvents.push(...items);
      }
    }

    let synced = 0;

    for (const ev of allEvents) {
      if (!ev.start || !ev.summary) continue;

      const dueDate  = (ev.start.date || ev.start.dateTime?.substring(0, 10)) ?? null;
      const dueTime  = ev.start.dateTime ? ev.start.dateTime.substring(11, 16) : null;

      const { error: upsertErr } = await serviceClient.from("schedule_tasks").upsert(
        {
          user_id:   user.id,
          title:     ev.summary,
          description: ev.description || null,
          due_date:  dueDate,
          due_time:  dueTime,
          priority:  "medium",
          task_type: guessTaskType(ev.summary),
          is_completed: false,
          location:  ev.location || null,
          meeting_link: ev.hangoutLink || ev.conferenceData?.entryPoints?.[0]?.uri || null,
          source:    "google_calendar",
          source_id: ev.id,
        },
        { onConflict: "source,source_id" }
      );

      if (!upsertErr) synced++;
    }

    // Update last_synced_at
    await serviceClient.from("google_calendar_tokens").update({
      last_synced_at: new Date().toISOString(),
    }).eq("user_id", user.id);

    return new Response(
      JSON.stringify({ success: true, synced, total: events.length }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
