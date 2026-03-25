import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find all pending reminders that are due
    const now = new Date().toISOString();
    const { data: dueReminders, error: fetchError } = await supabase
      .from("client_reminders")
      .select(`
        *,
        client_contacts!contact_id(full_name, email),
        companies!company_id(name)
      `)
      .eq("status", "pending")
      .lte("remind_at", now)
      .limit(100);

    if (fetchError) throw fetchError;
    if (!dueReminders || dueReminders.length === 0) {
      return new Response(JSON.stringify({ processed: 0, message: "No due reminders" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let emailsSent = 0;
    let inAppSent = 0;

    for (const reminder of dueReminders) {
      const contactName = reminder.client_contacts?.full_name || "Unknown";
      const companyName = reminder.companies?.name || "Unknown";

      // Send email notification if needed
      if (reminder.reminder_type === "email" || reminder.reminder_type === "both") {
        // Get recruiter email
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("user_id", reminder.recruiter_id)
          .single();

        if (profile?.email) {
          // Check if RESEND_API_KEY exists for email sending
          const resendKey = Deno.env.get("RESEND_API_KEY");
          if (resendKey) {
            try {
              await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${resendKey}`,
                },
                body: JSON.stringify({
                  from: "Plug <reminders@plug-app.com>",
                  to: [profile.email],
                  subject: `🔔 Reminder: ${reminder.title} - ${contactName} (${companyName})`,
                  html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                      <h2 style="color: #6366f1;">🔔 Reminder</h2>
                      <p><strong>${reminder.title}</strong></p>
                      ${reminder.description ? `<p style="color: #666;">${reminder.description}</p>` : ""}
                      <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;" />
                      <p style="color: #888; font-size: 14px;">
                        Contact: <strong>${contactName}</strong><br/>
                        Company: <strong>${companyName}</strong><br/>
                        Scheduled: ${new Date(reminder.remind_at).toLocaleString()}
                      </p>
                      <p style="color: #888; font-size: 12px; margin-top: 24px;">
                        — Plug CRM
                      </p>
                    </div>
                  `,
                }),
              });
              emailsSent++;
            } catch (emailErr) {
              console.error("Email send error:", emailErr);
            }
          } else {
            console.log("RESEND_API_KEY not configured, skipping email for reminder:", reminder.id);
          }
        }
      }

      // Create in-app notification via client_timeline
      if (reminder.reminder_type === "in_app" || reminder.reminder_type === "both") {
        await supabase.from("client_timeline").insert({
          company_id: reminder.company_id,
          recruiter_id: reminder.recruiter_id,
          contact_id: reminder.contact_id,
          event_type: "reminder",
          title: `🔔 ${reminder.title}`,
          description: `Reminder for ${contactName}: ${reminder.description || reminder.title}`,
        });
        inAppSent++;
      }

      // Mark reminder as sent
      await supabase
        .from("client_reminders")
        .update({ status: "sent", sent_at: now })
        .eq("id", reminder.id);
    }

    return new Response(
      JSON.stringify({
        processed: dueReminders.length,
        emailsSent,
        inAppSent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error processing reminders:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
