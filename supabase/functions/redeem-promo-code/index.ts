import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { code } = await req.json();
    
    if (!code || typeof code !== 'string' || code.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Invalid code format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Look up the code in the database (stored as plaintext hash for now - code_hash column stores the code value)
    const { data: promoCode, error: lookupError } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code_hash', code)
      .eq('is_active', true)
      .maybeSingle();

    if (lookupError) {
      console.error('Promo code lookup error:', lookupError);
      return new Response(
        JSON.stringify({ error: 'Failed to validate code', success: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!promoCode) {
      console.log(`Invalid promo code attempt by user ${user.id}`);
      return new Response(
        JSON.stringify({ error: 'Invalid promo code', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiration
    if (promoCode.expires_at && new Date(promoCode.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Code has expired', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check max uses
    if (promoCode.max_uses && promoCode.uses_count >= promoCode.max_uses) {
      return new Response(
        JSON.stringify({ error: 'Code has reached maximum uses', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already redeemed this code
    const { data: existingRedemption } = await supabase
      .from('promo_code_redemptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('code', code)
      .maybeSingle();

    if (existingRedemption) {
      return new Response(
        JSON.stringify({ error: 'Code already redeemed', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Apply the promo code
    let creditsAwarded = 0;
    
    if (promoCode.type === 'unlimited') {
      creditsAwarded = 999999;
      
      const { error: updateError } = await supabase
        .from('user_credits')
        .update({ 
          permanent_fuel: 999999,
          daily_fuel: 999999 
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating credits:', updateError);
        throw new Error('Failed to apply promo code');
      }
    } else if (promoCode.type === 'bonus' && promoCode.amount) {
      creditsAwarded = promoCode.amount;
      
      const { error: updateError } = await supabase.rpc('increment_permanent_fuel', {
        p_user_id: user.id,
        p_amount: promoCode.amount
      });

      if (updateError) {
        console.error('Error incrementing credits:', updateError);
        throw new Error('Failed to apply promo code');
      }
    }

    // Increment uses_count on the promo code
    await supabase
      .from('promo_codes')
      .update({ uses_count: promoCode.uses_count + 1 })
      .eq('id', promoCode.id);

    // Record the redemption
    await supabase
      .from('promo_code_redemptions')
      .insert({
        user_id: user.id,
        code: code,
        credits_awarded: creditsAwarded
      });

    // Log the transaction
    await supabase
      .from('credit_transactions')
      .insert({
        user_id: user.id,
        action_type: 'promo_code',
        amount: creditsAwarded,
        credit_type: 'permanent',
        description: `Promo code redeemed`
      });

    console.log(`Promo code redeemed by user ${user.id}: ${creditsAwarded} credits`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        creditsAwarded,
        message: promoCode.type === 'unlimited' ? 'Unlimited fuel activated! 🚀' : `${creditsAwarded} fuel added!`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Promo code error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to redeem code', success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
