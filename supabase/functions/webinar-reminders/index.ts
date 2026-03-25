import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const now = new Date();
    const windowMinutes = 5; // cron runs every 5 min

    // Fetch all upcoming webinars
    const { data: webinars } = await supabase
      .from('webinars')
      .select('*')
      .gte('scheduled_at', now.toISOString());

    if (!webinars?.length) {
      return new Response(JSON.stringify({ success: true, reminders_sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let totalSent = 0;

    for (const webinar of webinars) {
      const scheduledTime = new Date(webinar.scheduled_at).getTime();
      const nowTime = now.getTime();

      for (const reminderMinutes of [webinar.reminder_1_minutes, webinar.reminder_2_minutes]) {
        if (!reminderMinutes) continue;
        const reminderTime = scheduledTime - reminderMinutes * 60 * 1000;
        const diff = reminderTime - nowTime;

        // Check if reminder should fire within the current window (0 to windowMinutes ahead)
        if (diff >= 0 && diff <= windowMinutes * 60 * 1000) {
          // Get registered users
          const { data: registrations } = await supabase
            .from('webinar_registrations')
            .select('user_id')
            .eq('webinar_id', webinar.id);

          if (registrations?.length) {
            const title = webinar.title_en || webinar.title_he;
            const timeLabel = reminderMinutes >= 60
              ? `${Math.round(reminderMinutes / 60)}h`
              : `${reminderMinutes}min`;

            const notifications = registrations.map((r: any) => ({
              user_id: r.user_id,
              type: 'webinar_reminder',
              title: `🎥 "${title}" starts in ${timeLabel}`,
              message: webinar.link_url
                ? 'Click to join the webinar'
                : 'The webinar will stream live in the PLUG Feed',
              metadata: { webinar_id: webinar.id },
            }));

            await supabase.from('notifications').insert(notifications);
            totalSent += notifications.length;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, reminders_sent: totalSent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
