import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

// Simple HMAC verification for webhook security
async function verifyWebhookSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return signature === expectedSignature;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET');

    // SECURITY: Webhook secret MUST be configured
    if (!webhookSecret) {
      console.error('WEBHOOK_SECRET environment variable is not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook endpoint not configured' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Signature header is required
    const providedSignature = req.headers.get('x-webhook-secret');
    if (!providedSignature) {
      console.error('Missing webhook signature header');
      return new Response(
        JSON.stringify({ error: 'Missing webhook signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.text();

    // SECURITY: Verify HMAC signature
    const isValid = await verifyWebhookSignature(body, providedSignature, webhookSecret);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return new Response(
        JSON.stringify({ error: 'Invalid webhook signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = body ? JSON.parse(body) : {};
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Webhook received: action=${action}`, payload);

    // Log to audit table using the secure SECURITY DEFINER function
    // This prevents direct INSERT access and ensures proper audit trail
    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
    await supabaseAdmin.rpc('create_audit_log_entry', {
      p_action: `webhook_${action}`,
      p_entity_type: 'webhook',
      p_entity_id: payload.id || null,
      p_new_values: payload,
      p_old_values: null
    });

    switch (action) {
      case 'new_application': {
        // External system notifying about a new application
        const { job_id, candidate_email, candidate_name, source } = payload;
        
        if (!job_id || !candidate_email) {
          return new Response(
            JSON.stringify({ error: 'job_id and candidate_email are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Find or create the candidate
        const { data: existingProfile } = await supabaseAdmin
          .from('profiles')
          .select('user_id')
          .eq('email', candidate_email)
          .single();

        // If candidate exists, create application
        if (existingProfile) {
          const { data: application, error: appError } = await supabaseAdmin
            .from('applications')
            .insert({
              job_id,
              candidate_id: existingProfile.user_id,
              status: 'active',
              current_stage: 'applied',
              notes: source ? `Applied via ${source}` : null
            })
            .select()
            .single();

          if (appError) throw appError;

          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Application created',
              application_id: application.id
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Candidate not found in system',
            pending: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'status_update': {
        // External system updating application status
        const { application_id, new_status, new_stage, notes } = payload;
        
        if (!application_id) {
          return new Response(
            JSON.stringify({ error: 'application_id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const updateData: Record<string, unknown> = {
          last_interaction: new Date().toISOString()
        };
        if (new_status) updateData.status = new_status;
        if (new_stage) updateData.current_stage = new_stage;
        if (notes) updateData.notes = notes;

        const { error: updateError } = await supabaseAdmin
          .from('applications')
          .update(updateData)
          .eq('id', application_id);

        if (updateError) throw updateError;

        // Add timeline event
        await supabaseAdmin.from('application_timeline').insert({
          application_id,
          event_type: 'status_change',
          description: `Status updated via webhook`,
          old_value: null,
          new_value: new_status || new_stage
        });

        return new Response(
          JSON.stringify({ success: true, message: 'Application updated' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'interview_scheduled': {
        // External calendar/scheduling system notifying about interview
        const { application_id, interview_date, interview_type, location, notes } = payload;
        
        if (!application_id || !interview_date) {
          return new Response(
            JSON.stringify({ error: 'application_id and interview_date are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: reminder, error: reminderError } = await supabaseAdmin
          .from('interview_reminders')
          .insert({
            application_id,
            interview_date,
            interview_type: interview_type || 'general',
            location,
            notes
          })
          .select()
          .single();

        if (reminderError) throw reminderError;

        // Update application stage
        await supabaseAdmin
          .from('applications')
          .update({ 
            current_stage: 'interview',
            last_interaction: new Date().toISOString()
          })
          .eq('id', application_id);

        // Add timeline event
        await supabaseAdmin.from('application_timeline').insert({
          application_id,
          event_type: 'interview_scheduled',
          description: `${interview_type || 'Interview'} scheduled for ${new Date(interview_date).toLocaleDateString()}`,
          new_value: interview_date
        });

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Interview scheduled',
            reminder_id: reminder.id
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'candidate_feedback': {
        // HR system sending feedback about candidate
        const { application_id, feedback, rating } = payload;
        
        if (!application_id) {
          return new Response(
            JSON.stringify({ error: 'application_id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        await supabaseAdmin.from('application_timeline').insert({
          application_id,
          event_type: 'feedback_received',
          description: feedback || 'Feedback received',
          new_value: rating ? String(rating) : null
        });

        return new Response(
          JSON.stringify({ success: true, message: 'Feedback recorded' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ 
            error: 'Unknown action',
            available_actions: ['new_application', 'status_update', 'interview_scheduled', 'candidate_feedback']
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error("webhook-handler error:", error);
    return new Response(
      JSON.stringify({ error: "Webhook processing failed" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
