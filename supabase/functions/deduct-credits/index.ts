import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CREDIT_COSTS: Record<string, number> = {
  'cv_builder': 10,
  'resume_match': 3,
  'ai_interview': 5,
  'interview_tips': 5,
  'home_task_review': 10,
  'smart_search': 2,
  'ping': 15,
  'feed_interaction': 1,
  'job_swipe_batch': 15,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, customAmount } = await req.json();

    if (!action) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing action parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[deduct-credits] User ${user.id} requesting ${action}`);

    // Fetch only the columns we know exist
    let { data: credits, error: creditsError } = await supabase
      .from('user_credits')
      .select('id, daily_fuel, permanent_fuel')
      .eq('user_id', user.id)
      .maybeSingle();

    if (creditsError) {
      console.error('[deduct-credits] Credits fetch error:', creditsError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch credits: ' + creditsError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!credits) {
      console.log('[deduct-credits] No credits record — creating default for user:', user.id);
      const { data: newCredits, error: createError } = await supabase
        .from('user_credits')
        .insert({ user_id: user.id, daily_fuel: 20, permanent_fuel: 0 })
        .select('id, daily_fuel, permanent_fuel')
        .single();

      if (createError || !newCredits) {
        console.error('[deduct-credits] Failed to create credits:', createError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to initialize credits: ' + (createError?.message || 'unknown') }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      credits = newCredits;
    }

    const dailyFuel = credits.daily_fuel;
    const permanentFuel = credits.permanent_fuel;
    const amountToDeduct = customAmount || CREDIT_COSTS[action] || 0;
    const totalCredits = dailyFuel + permanentFuel;

    if (totalCredits < amountToDeduct) {
      console.log(`[deduct-credits] Insufficient credits: ${totalCredits} < ${amountToDeduct}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Insufficient credits',
          required: amountToDeduct,
          available: totalCredits,
          daily_fuel: dailyFuel,
          permanent_fuel: permanentFuel,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deduct from daily_fuel first, then permanent_fuel
    const dailyDeduct = Math.min(dailyFuel, amountToDeduct);
    const permanentDeduct = amountToDeduct - dailyDeduct;
    const newDailyFuel = dailyFuel - dailyDeduct;
    const newPermanentFuel = permanentFuel - permanentDeduct;

    const { error: updateError } = await supabase
      .from('user_credits')
      .update({
        daily_fuel: newDailyFuel,
        permanent_fuel: newPermanentFuel,
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[deduct-credits] Update error:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update credits: ' + updateError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log transactions
    const transactions = [];
    if (dailyDeduct > 0) {
      transactions.push({
        user_id: user.id, amount: -dailyDeduct, credit_type: 'daily',
        action_type: action, description: `Used ${dailyDeduct} daily fuel for ${action}`,
      });
    }
    if (permanentDeduct > 0) {
      transactions.push({
        user_id: user.id, amount: -permanentDeduct, credit_type: 'permanent',
        action_type: action, description: `Used ${permanentDeduct} permanent fuel for ${action}`,
      });
    }
    if (transactions.length > 0) {
      await supabase.from('credit_transactions').insert(transactions);
    }

    console.log(`[deduct-credits] Success: ${action} cost ${amountToDeduct}`);

    return new Response(
      JSON.stringify({
        success: true,
        deducted: amountToDeduct,
        daily_fuel: newDailyFuel,
        permanent_fuel: newPermanentFuel,
        total_credits: newDailyFuel + newPermanentFuel,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[deduct-credits] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to process credits: ' + (error?.message || 'unknown error') }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
