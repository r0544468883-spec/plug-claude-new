import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ExternalAttendee {
  name: string;
  email: string;
}

interface MeetingInviteRequest {
  title: string;
  description?: string;
  event_date: string;
  location?: string;
  meeting_link?: string;
  organizer_name: string;
  company_name: string;
  external_attendees: ExternalAttendee[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: MeetingInviteRequest = await req.json();
    const { title, description, event_date, location, meeting_link, organizer_name, company_name, external_attendees } = body;

    if (!external_attendees || external_attendees.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No external attendees" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.log("RESEND_API_KEY not configured, skipping email invitations");
      return new Response(JSON.stringify({ sent: 0, message: "Email not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const eventDateFormatted = new Date(event_date).toLocaleString("he-IL", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    let sent = 0;

    for (const attendee of external_attendees) {
      if (!attendee.email || !attendee.email.includes("@")) continue;

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: "Plug CRM <meetings@plug-app.com>",
            to: [attendee.email],
            subject: `📅 הזמנה לפגישה: ${title}`,
            html: `
              <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl; text-align: right;">
                <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; border-radius: 12px 12px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">📅 הזמנה לפגישה</h1>
                  <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 16px;">${title}</p>
                </div>
                <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                  <p style="color: #374151; font-size: 16px; margin: 0 0 24px;">
                    שלום ${attendee.name},<br/><br/>
                    <strong>${organizer_name}</strong> מ-<strong>${company_name}</strong> מזמין אותך לפגישה.
                  </p>
                  
                  <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 100px;">📋 נושא</td>
                        <td style="padding: 8px 0; color: #111827; font-weight: 600;">${title}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">🗓️ מועד</td>
                        <td style="padding: 8px 0; color: #111827; font-weight: 600;">${eventDateFormatted}</td>
                      </tr>
                      ${location ? `
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">📍 מיקום</td>
                        <td style="padding: 8px 0; color: #111827;">${location}</td>
                      </tr>` : ""}
                      ${meeting_link ? `
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">🔗 לינק</td>
                        <td style="padding: 8px 0;"><a href="${meeting_link}" style="color: #6366f1; font-weight: 600;">${meeting_link}</a></td>
                      </tr>` : ""}
                    </table>
                  </div>

                  ${description ? `
                  <div style="border-right: 3px solid #6366f1; padding-right: 16px; margin-bottom: 24px;">
                    <p style="color: #374151; margin: 0; font-size: 14px;">${description}</p>
                  </div>` : ""}

                  ${meeting_link ? `
                  <div style="text-align: center; margin: 24px 0;">
                    <a href="${meeting_link}" style="background: #6366f1; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
                      🎥 הצטרף לפגישה
                    </a>
                  </div>` : ""}

                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                  <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                    הזמנה זו נשלחה על ידי Plug CRM • ${company_name}
                  </p>
                </div>
              </div>
            `,
          }),
        });

        if (res.ok) {
          sent++;
        } else {
          const errBody = await res.text();
          console.error(`Failed to send to ${attendee.email}:`, errBody);
        }
      } catch (err) {
        console.error(`Error sending invite to ${attendee.email}:`, err);
      }
    }

    return new Response(
      JSON.stringify({ sent, message: `Sent ${sent} of ${external_attendees.length} invitations` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error sending meeting invites:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
