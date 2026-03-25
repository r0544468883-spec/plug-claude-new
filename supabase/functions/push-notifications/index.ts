import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface RegisterSubscriptionRequest {
  subscription: PushSubscription;
}

interface SendNotificationRequest {
  userId: string;
  title: string;
  body: string;
  icon?: string;
  url?: string;
  tag?: string;
}

// Input validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_TITLE_LENGTH = 200;
const MAX_BODY_LENGTH = 1000;

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // check-reminders is a server-to-server action (cron job) - no auth needed
    if (action === "check-reminders") {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      
      console.log("Checking for upcoming interview reminders...");

      const now = new Date();
      const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Find interviews happening in the next 24 hours that haven't been reminded
      const { data: reminders, error: reminderError } = await supabaseAdmin
        .from("interview_reminders")
        .select(`
          *,
          application:applications(
            candidate_id,
            job:jobs(title, company:companies(name))
          )
        `)
        .eq("reminder_sent", false)
        .gte("interview_date", now.toISOString())
        .lte("interview_date", oneDayFromNow.toISOString());

      if (reminderError) {
        console.error("Error fetching reminders:", reminderError);
        throw reminderError;
      }

      console.log(`Found ${reminders?.length || 0} reminders to send`);

      let sentCount = 0;
      for (const reminder of reminders || []) {
        const app = reminder.application as any;
        const userId = app?.candidate_id;
        const jobTitle = app?.job?.title || "Interview";
        const companyName = app?.job?.company?.name || "";

        if (userId) {
          // Create notification
          await supabaseAdmin.from("notifications").insert({
            user_id: userId,
            title: "Interview Reminder 📅",
            message: `Your interview for ${jobTitle}${companyName ? ` at ${companyName}` : ""} is coming up!`,
            type: "interview_reminder",
            metadata: {
              interview_date: reminder.interview_date,
              interview_type: reminder.interview_type,
              location: reminder.location,
            },
            is_read: false,
          });

          // Mark reminder as sent
          await supabaseAdmin
            .from("interview_reminders")
            .update({ reminder_sent: true })
            .eq("id", reminder.id);

          sentCount++;
        }
      }

      return new Response(
        JSON.stringify({ success: true, sentCount }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // All other actions require authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Verify the user
    const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !authUser) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const authenticatedUserId = authUser.id;
    console.log('Authenticated user for push-notifications:', authenticatedUserId);

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "register") {
      // Register a push subscription
      const { subscription }: RegisterSubscriptionRequest = await req.json();
      
      if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
        return new Response(
          JSON.stringify({ error: 'Invalid subscription data' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log("Registering push subscription for user:", authenticatedUserId);

      // Store subscription in database using authenticated user ID
      const { error } = await supabaseAdmin
        .from("push_subscriptions")
        .upsert({
          user_id: authenticatedUserId,
          endpoint: subscription.endpoint,
          p256dh_key: subscription.keys.p256dh,
          auth_key: subscription.keys.auth,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id,endpoint",
        });

      if (error) {
        console.error("Error storing subscription:", error);
        throw error;
      }

      return new Response(
        JSON.stringify({ success: true, message: "Subscription registered" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } else if (action === "unregister") {
      // Unregister a push subscription
      const { endpoint } = await req.json();
      
      if (!endpoint || typeof endpoint !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Endpoint is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log("Unregistering push subscription for user:", authenticatedUserId);

      // Only delete subscriptions for the authenticated user
      const { error } = await supabaseAdmin
        .from("push_subscriptions")
        .delete()
        .eq("user_id", authenticatedUserId)
        .eq("endpoint", endpoint);

      if (error) {
        console.error("Error removing subscription:", error);
        throw error;
      }

      return new Response(
        JSON.stringify({ success: true, message: "Subscription removed" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } else if (action === "send") {
      // Send push notification - only allow sending to self
      const { title, body, icon, url, tag }: Omit<SendNotificationRequest, 'userId'> = await req.json();
      
      // Validate inputs
      if (!title || typeof title !== 'string' || title.length > MAX_TITLE_LENGTH) {
        return new Response(
          JSON.stringify({ error: 'Invalid title' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (!body || typeof body !== 'string' || body.length > MAX_BODY_LENGTH) {
        return new Response(
          JSON.stringify({ error: 'Invalid body' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log("Sending push notification to self:", authenticatedUserId);

      // Get user's subscriptions
      const { data: subscriptions, error: fetchError } = await supabaseAdmin
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", authenticatedUserId);

      if (fetchError) {
        console.error("Error fetching subscriptions:", fetchError);
        throw fetchError;
      }

      if (!subscriptions || subscriptions.length === 0) {
        console.log("No subscriptions found for user:", authenticatedUserId);
        return new Response(
          JSON.stringify({ success: false, message: "No subscriptions found" }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      // Create notification for the authenticated user only
      const { error: notifError } = await supabaseAdmin
        .from("notifications")
        .insert({
          user_id: authenticatedUserId,
          title,
          message: body,
          type: tag || "general",
          metadata: { icon, url },
          is_read: false,
        });

      if (notifError) {
        console.error("Error creating notification:", notifError);
        throw notifError;
      }

      console.log(`Notification sent to ${subscriptions.length} device(s)`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Notification sent to ${subscriptions.length} device(s)` 
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in push-notifications function:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process notification. Please try again." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
