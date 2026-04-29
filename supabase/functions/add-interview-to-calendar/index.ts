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

async function refreshGoogleToken(rt: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: rt,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);
  const d = await res.json();
  return d.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { interview_date, job_title, company_name, application_id } = await req.json();
    if (!interview_date) return new Response(JSON.stringify({ error: "interview_date required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get Google Calendar token
    const { data: calToken } = await supabase
      .from("google_calendar_tokens")
      .select("access_token, refresh_token, expires_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!calToken) {
      return new Response(JSON.stringify({ error: "no_calendar", message: "Google Calendar not connected" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Refresh if needed
    let accessToken = calToken.access_token;
    if (new Date(calToken.expires_at).getTime() - Date.now() < 5 * 60 * 1000) {
      accessToken = await refreshGoogleToken(calToken.refresh_token);
    }

    const start = new Date(interview_date);
    const end   = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour default

    const title = company_name
      ? `ראיון עבודה — ${company_name}${job_title ? ` (${job_title})` : ""}`
      : `Job Interview${job_title ? ` — ${job_title}` : ""}`;

    const event = {
      summary: title,
      description: `מועמדות בPLUG${application_id ? ` · ID: ${application_id}` : ""}`,
      start: { dateTime: start.toISOString(), timeZone: "Asia/Jerusalem" },
      end:   { dateTime: end.toISOString(),   timeZone: "Asia/Jerusalem" },
      reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 60 }, { method: "popup", minutes: 10 }] },
    };

    const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });

    if (!res.ok) throw new Error(`Calendar API error: ${await res.text()}`);
    const created = await res.json();

    return new Response(JSON.stringify({ success: true, event_id: created.id, html_link: created.htmlLink }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
