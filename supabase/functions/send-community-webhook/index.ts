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

    const { hub_id, event_type, payload } = await req.json();
    if (!hub_id || !event_type) {
      return new Response(JSON.stringify({ error: 'hub_id and event_type required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get active integrations for this hub that listen to this event type
    const { data: integrations } = await supabase
      .from('community_integrations')
      .select('*')
      .eq('hub_id', hub_id)
      .eq('is_active', true);

    if (!integrations?.length) {
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let sent = 0;
    const errors: string[] = [];

    for (const integration of integrations) {
      // Check if this integration listens to this event type
      const events: string[] = integration.events || [];
      if (!events.includes(event_type)) continue;

      try {
        const message = buildMessage(integration.provider, event_type, payload);
        const response = await fetch(integration.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message),
        });

        if (response.ok) {
          sent++;
        } else {
          errors.push(`${integration.provider}: ${response.status}`);
        }
      } catch (err) {
        errors.push(`${integration.provider}: ${(err as Error).message}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent, errors: errors.length > 0 ? errors : undefined }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildMessage(
  provider: string,
  eventType: string,
  payload: Record<string, unknown>
): Record<string, unknown> {
  const title = payload.title || 'PLUG Community Update';
  const description = payload.description || '';
  const url = payload.url || '';

  const eventLabels: Record<string, string> = {
    new_post: 'New Post',
    new_event: 'New Event',
    new_course: 'New Course',
    new_member: 'New Member',
    mentorship_match: 'Mentorship Match',
    test: 'Test Notification',
  };

  const label = eventLabels[eventType] || eventType;

  if (provider === 'slack') {
    return {
      text: `*${label}*: ${title}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${label}*\n${title}${description ? `\n${description}` : ''}${url ? `\n<${url}|View in PLUG>` : ''}`,
          },
        },
      ],
    };
  }

  if (provider === 'teams') {
    return {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor: '6366f1',
      summary: `${label}: ${title}`,
      sections: [
        {
          activityTitle: label,
          activitySubtitle: 'PLUG Community',
          text: `${title}${description ? `<br>${description}` : ''}`,
        },
      ],
      potentialAction: url
        ? [{ '@type': 'OpenUri', name: 'View in PLUG', targets: [{ os: 'default', uri: url }] }]
        : [],
    };
  }

  // Discord
  return {
    content: `**${label}**: ${title}${description ? `\n${description}` : ''}${url ? `\n${url}` : ''}`,
  };
}
