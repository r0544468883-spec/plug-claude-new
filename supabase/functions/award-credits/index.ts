import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Credit rewards for social tasks (one-time)
const SOCIAL_TASK_REWARDS: Record<string, number> = {
  'github_star': 100,
  'linkedin_follow': 50,
  'whatsapp_join': 50,
  'tiktok_follow': 50,
  'discord_join': 50,
  'youtube_subscribe': 50,
  'spotify_follow': 25,
  'telegram_join': 25,
  'facebook_follow': 25,
  'instagram_follow': 25,
  'linkedin_post_share': 25,
  'x_follow': 25,
};

// Recurring rewards (with caps)
const RECURRING_REWARDS: Record<string, { amount: number; dailyCap?: number; monthlyCap?: number; fuelType?: 'daily' | 'permanent' }> = {
  'community_share': { amount: 5, dailyCap: 3 },
  'job_share': { amount: 5, dailyCap: 5 },
  'referral_bonus': { amount: 10 },
  'vouch_received': { amount: 25, monthlyCap: 5 },
  'vouch_given': { amount: 5, monthlyCap: 5 },
  'skill_added': { amount: 10 },
  'feed_like': { amount: 1, fuelType: 'daily' },
  'feed_comment': { amount: 1, fuelType: 'daily' },
  'feed_poll_vote': { amount: 1, fuelType: 'daily' },
  'community_like': { amount: 1, fuelType: 'daily' },
  'community_comment': { amount: 1, fuelType: 'daily' },
  'community_poll_vote': { amount: 1, fuelType: 'daily' },
};

// Direct credit award (from client with explicit amount)
interface DirectAwardRequest {
  userId: string;
  amount: number;
  creditType: 'daily' | 'permanent';
  actionType: string;
  description?: string;
}

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
    const requestBody = await req.json();
    const { action, taskId, referralCode, userId, amount, creditType, actionType: reqActionType, description: customDescription } = requestBody;
    
    // Handle direct credit award (from client with explicit amount)
    if (userId && amount && reqActionType) {
      // Verify the caller is the user or has admin rights
      if (userId !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized: can only award credits to yourself' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: credits, error: creditsError } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (creditsError || !credits) {
        return new Response(
          JSON.stringify({ error: 'Credits not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const fieldToUpdate = creditType === 'daily' ? 'daily_fuel' : 'permanent_fuel';
      const newValue = credits[fieldToUpdate] + amount;

      const { error: updateError } = await supabase
        .from('user_credits')
        .update({ 
          [fieldToUpdate]: newValue,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      // Log transaction
      await supabase.from('credit_transactions').insert({
        user_id: userId,
        amount,
        credit_type: creditType,
        action_type: reqActionType,
        description: customDescription || `Awarded ${amount} ${creditType} credits for ${reqActionType}`
      });

      console.log(`[award-credits] Direct award: ${amount} ${creditType} fuel to ${userId} for ${reqActionType}`);

      return new Response(
        JSON.stringify({ 
          success: true,
          awarded: amount,
          daily_fuel: creditType === 'daily' ? newValue : credits.daily_fuel,
          permanent_fuel: creditType === 'permanent' ? newValue : credits.permanent_fuel,
          total_credits: (creditType === 'daily' ? newValue : credits.daily_fuel) + (creditType === 'permanent' ? newValue : credits.permanent_fuel)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!action) {
      return new Response(
        JSON.stringify({ error: 'Missing action parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[award-credits] User ${user.id} completing ${action}${taskId ? ` (task: ${taskId})` : ''}`);

    // Get current credits
    const { data: credits, error: creditsError } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (creditsError || !credits) {
      return new Response(
        JSON.stringify({ error: 'Credits not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let amountToAward = 0;
    let actionType = action;
    let description = '';

    // Handle one-time social tasks
    if (action === 'social_task' && taskId) {
      const reward = SOCIAL_TASK_REWARDS[taskId];
      if (!reward) {
        return new Response(
          JSON.stringify({ error: 'Invalid task ID' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if already completed
      const { data: existing } = await supabase
        .from('social_task_completions')
        .select('id')
        .eq('user_id', user.id)
        .eq('task_id', taskId)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ error: 'Task already completed', already_completed: true }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Record completion
      await supabase.from('social_task_completions').insert({
        user_id: user.id,
        task_id: taskId,
        credits_awarded: reward
      });

      amountToAward = reward;
      actionType = `social_${taskId}`;
      description = `Completed social task: ${taskId}`;
    }

    // Handle recurring actions
    else if (RECURRING_REWARDS[action]) {
      const rewardConfig = RECURRING_REWARDS[action];
      const today = new Date().toISOString().split('T')[0];
      const currentMonth = new Date().toISOString().slice(0, 7);

      // Check daily cap
      if (rewardConfig.dailyCap) {
        const { data: dailyCounts } = await supabase
          .from('daily_action_counts')
          .select('*')
          .eq('user_id', user.id)
          .eq('action_date', today)
          .maybeSingle();

        const columnName = action === 'community_share' ? 'community_shares' : 'job_shares';
        const currentCount = dailyCounts?.[columnName] || 0;

        if (currentCount >= rewardConfig.dailyCap) {
          return new Response(
            JSON.stringify({ 
              error: 'Daily cap reached', 
              cap_reached: true,
              current: currentCount,
              max: rewardConfig.dailyCap
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update or insert daily count
        if (dailyCounts) {
          await supabase
            .from('daily_action_counts')
            .update({ [columnName]: currentCount + 1 })
            .eq('user_id', user.id)
            .eq('action_date', today);
        } else {
          await supabase.from('daily_action_counts').insert({
            user_id: user.id,
            action_date: today,
            [columnName]: 1
          });
        }
      }

      // Check monthly cap for vouches
      if (rewardConfig.monthlyCap && (action === 'vouch_received' || action === 'vouch_given')) {
        // Reset monthly counts if needed
        const creditMonth = credits.last_vouch_reset_month?.slice(0, 7);
        if (creditMonth !== currentMonth) {
          await supabase
            .from('user_credits')
            .update({
              vouches_given_this_month: 0,
              vouches_received_this_month: 0,
              last_vouch_reset_month: new Date().toISOString().slice(0, 10)
            })
            .eq('user_id', user.id);
          credits.vouches_given_this_month = 0;
          credits.vouches_received_this_month = 0;
        }

        const countField = action === 'vouch_given' ? 'vouches_given_this_month' : 'vouches_received_this_month';
        const currentCount = credits[countField] || 0;

        if (currentCount >= rewardConfig.monthlyCap) {
          return new Response(
            JSON.stringify({ 
              error: 'Monthly vouch cap reached',
              cap_reached: true,
              current: currentCount,
              max: rewardConfig.monthlyCap
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Increment vouch count
        await supabase
          .from('user_credits')
          .update({ [countField]: currentCount + 1 })
          .eq('user_id', user.id);
      }

      amountToAward = rewardConfig.amount;
      description = `Earned ${amountToAward} credits for ${action.replace('_', ' ')}`;
    }

    // Handle referral
    else if (action === 'referral' && referralCode) {
      // Find the referrer by code
      const { data: referrer } = await supabase
        .from('user_credits')
        .select('user_id')
        .eq('referral_code', referralCode)
        .maybeSingle();

      if (!referrer) {
        return new Response(
          JSON.stringify({ error: 'Invalid referral code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if already referred
      const { data: existingReferral } = await supabase
        .from('referrals')
        .select('id')
        .eq('referred_id', user.id)
        .maybeSingle();

      if (existingReferral) {
        return new Response(
          JSON.stringify({ error: 'Already referred', already_referred: true }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Record referral
      await supabase.from('referrals').insert({
        referrer_id: referrer.user_id,
        referred_id: user.id,
        referrer_credits_awarded: true,
        referred_credits_awarded: true
      });

      // Award credits to referrer
      const { data: referrerCredits } = await supabase
        .from('user_credits')
        .select('permanent_fuel')
        .eq('user_id', referrer.user_id)
        .single();
      
      await supabase
        .from('user_credits')
        .update({ permanent_fuel: (referrerCredits?.permanent_fuel || 0) + 10 })
        .eq('user_id', referrer.user_id);

      await supabase.from('credit_transactions').insert({
        user_id: referrer.user_id,
        amount: 10,
        credit_type: 'permanent',
        action_type: 'referral_bonus',
        description: 'Referral bonus: new user signed up with your code'
      });

      amountToAward = 10;
      actionType = 'referral_bonus';
      description = 'Welcome bonus for using a referral code';
    }

    if (amountToAward <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid action or no credits to award' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine fuel type - feed actions go to daily, everything else to permanent
    const rewardConfig = RECURRING_REWARDS[action];
    const fuelType = rewardConfig?.fuelType || 'permanent';

    if (fuelType === 'daily') {
      // Award daily fuel (can exceed 20 via feed interactions)
      const newDailyFuel = credits.daily_fuel + amountToAward;
      
      const { error: updateError } = await supabase
        .from('user_credits')
        .update({ 
          daily_fuel: newDailyFuel,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      await supabase.from('credit_transactions').insert({
        user_id: user.id,
        amount: amountToAward,
        credit_type: 'daily',
        action_type: actionType,
        description
      });

      console.log(`[award-credits] Awarded ${amountToAward} daily fuel to ${user.id}`);

      return new Response(
        JSON.stringify({ 
          success: true,
          awarded: amountToAward,
          daily_fuel: newDailyFuel,
          permanent_fuel: credits.permanent_fuel,
          total_credits: newDailyFuel + credits.permanent_fuel
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Award permanent fuel (default)
    const newPermanentFuel = credits.permanent_fuel + amountToAward;
    
    const { error: updateError } = await supabase
      .from('user_credits')
      .update({ 
        permanent_fuel: newPermanentFuel,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError) throw updateError;

    // Log transaction
    await supabase.from('credit_transactions').insert({
      user_id: user.id,
      amount: amountToAward,
      credit_type: 'permanent',
      action_type: actionType,
      description
    });

    console.log(`[award-credits] Awarded ${amountToAward} permanent fuel to ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        awarded: amountToAward,
        daily_fuel: credits.daily_fuel,
        permanent_fuel: newPermanentFuel,
        total_credits: credits.daily_fuel + newPermanentFuel
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[award-credits] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process credits. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
