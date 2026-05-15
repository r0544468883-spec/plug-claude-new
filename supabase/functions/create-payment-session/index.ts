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

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: 'Stripe not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { payment_id, course_title, amount, currency } = await req.json();
    if (!payment_id || !amount) {
      return new Response(
        JSON.stringify({ error: 'payment_id and amount required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get payment record to verify
    const { data: payment, error: paymentError } = await supabase
      .from('community_payments')
      .select('id, hub_id, user_id, course_id, amount, currency, status')
      .eq('id', payment_id)
      .single();

    if (paymentError || !payment) {
      return new Response(
        JSON.stringify({ error: 'Payment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (payment.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: 'Payment already processed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const siteUrl = Deno.env.get('SITE_URL') || 'https://plug-nexus.vercel.app';

    // Create Stripe Checkout Session via API
    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'payment_method_types[]': 'card',
        'line_items[0][price_data][currency]': (currency || 'ILS').toLowerCase(),
        'line_items[0][price_data][product_data][name]': course_title || 'Course',
        'line_items[0][price_data][unit_amount]': String(Math.round(amount * 100)),
        'line_items[0][quantity]': '1',
        'mode': 'payment',
        'success_url': `${siteUrl}/community?payment=success&pid=${payment_id}`,
        'cancel_url': `${siteUrl}/community?payment=cancelled&pid=${payment_id}`,
        'metadata[payment_id]': payment_id,
        'metadata[hub_id]': payment.hub_id,
        'metadata[course_id]': payment.course_id,
      }),
    });

    const session = await stripeResponse.json();

    if (!stripeResponse.ok) {
      return new Response(
        JSON.stringify({ error: session.error?.message || 'Stripe error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update payment with stripe session ID
    await supabase
      .from('community_payments')
      .update({
        provider_session_id: session.id,
        provider_payment_id: session.payment_intent,
      })
      .eq('id', payment_id);

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
