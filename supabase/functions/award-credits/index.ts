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
  'vouch_received': { amount: 25, monthlyCap: 5 },
  'vouch_given': { amount: 5, monthlyCap: 5 },
  'vouch_reciprocal': { amount: 5 },
  'vouch_via_external_link': { amount: 15 },
  'vouch_from_recruiter': { amount: 50 },
  'skill_added': { amount: 10 },
  'login_streak': { amount: 2, dailyCap: 1 },
  // Feed interactions are now FREE (0 credits awarded, engagement should never cost)
  'feed_like': { amount: 0, fuelType: 'daily' },
  'feed_comment': { amount: 0, fuelType: 'daily' },
  'feed_poll_vote': { amount: 0, fuelType: 'daily' },
  'community_like': { amount: 0, fuelType: 'daily' },
  'community_comment': { amount: 0, fuelType: 'daily' },
  'community_poll_vote': { amount: 0, fuelType: 'daily' },
};

// XP rewards per action
const XP_REWARDS: Record<string, number> = {
  'social_task': 5,
  'community_share': 2,
  'job_share': 2,
  'vouch_given': 5,
  'vouch_received': 10,
  'vouch_reciprocal': 10,
  'vouch_via_external_link': 15,
  'skill_added': 3,
  'referral_signup': 10,
  'referral_profile_complete': 5,
  'referral_applied': 25,
  'referral_active_7d': 15,
  'referral_hired': 100,
};

// Progressive referral rewards
const REFERRAL_STAGES: Record<string, { fuel: number; xp: number; stage: string }> = {
  'referral_signup': { fuel: 15, xp: 10, stage: 'signed_up' },
  'referral_profile_complete': { fuel: 10, xp: 5, stage: 'profile_complete' },
  'referral_applied': { fuel: 25, xp: 25, stage: 'applied' },
  'referral_active_7d': { fuel: 15, xp: 15, stage: 'active_7d' },
  'referral_hired': { fuel: 100, xp: 100, stage: 'hired' },
};

// Counter field mapping for totals tracking
const TOTAL_COUNTER_FIELDS: Record<string, string> = {
  'job_share': 'total_job_shares',
  'vouch_given': 'total_vouches_given',
  'vouch_received': 'total_vouches_received',
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
    const requestBody = await req.json();
    const { action, taskId, referralCode, userId, amount, creditType, actionType: reqActionType, description: customDescription } = requestBody;

    // Handle direct credit award (from client with explicit amount)
    if (userId && amount && reqActionType) {
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

      await supabase
        .from('user_credits')
        .update({ [fieldToUpdate]: newValue })
        .eq('user_id', userId);

      await supabase.from('credit_transactions').insert({
        user_id: userId,
        amount,
        credit_type: creditType,
        action_type: reqActionType,
        description: customDescription || `Awarded ${amount} ${creditType} credits for ${reqActionType}`
      });

      return new Response(
        JSON.stringify({
          success: true,
          awarded: amount,
          daily_fuel: creditType === 'daily' ? newValue : credits.daily_fuel,
          permanent_fuel: creditType === 'permanent' ? newValue : credits.permanent_fuel,
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
    let xpToAward = 0;
    let actionType = action;
    let description = '';

    // ── Handle login streak ──
    if (action === 'login_streak') {
      const { data: streakResult } = await supabase.rpc('update_login_streak', { p_user_id: user.id });
      const row = streakResult?.[0];
      if (row) {
        // Check achievements after streak update
        await supabase.rpc('check_achievements', { p_user_id: user.id });

        return new Response(
          JSON.stringify({
            success: true,
            awarded: row.streak_fuel,
            xp_awarded: row.streak_xp,
            streak: row.new_streak,
            daily_fuel: credits.daily_fuel,
            permanent_fuel: credits.permanent_fuel + row.streak_fuel,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ success: true, awarded: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Handle one-time social tasks ──
    if (action === 'social_task' && taskId) {
      const reward = SOCIAL_TASK_REWARDS[taskId];
      if (!reward) {
        return new Response(
          JSON.stringify({ error: 'Invalid task ID' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

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

      await supabase.from('social_task_completions').insert({
        user_id: user.id,
        task_id: taskId,
        credits_awarded: reward
      });

      amountToAward = reward;
      xpToAward = XP_REWARDS['social_task'] || 5;
      actionType = `social_${taskId}`;
      description = `Completed social task: ${taskId}`;

      // Check if all social tasks are complete → social_butterfly achievement
      const { count: socialCount } = await supabase
        .from('social_task_completions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if ((socialCount || 0) >= 12) {
        xpToAward += 50; // bonus for completing all
      }
    }

    // ── Handle progressive referral stages ──
    else if (REFERRAL_STAGES[action]) {
      const stageConfig = REFERRAL_STAGES[action];

      if (action === 'referral_signup' && referralCode) {
        // New user signing up with referral code
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

        // Record referral with stage tracking
        await supabase.from('referrals').insert({
          referrer_id: referrer.user_id,
          referred_id: user.id,
          referrer_credits_awarded: true,
          referred_credits_awarded: true,
          stage: 'signed_up',
        });

        // Award referrer: fuel + XP + increment total_referrals
        await supabase.rpc('award_xp', { p_user_id: referrer.user_id, p_amount: stageConfig.xp, p_reason: 'Referral signed up' });
        const { data: referrerCredits } = await supabase
          .from('user_credits')
          .select('permanent_fuel, total_referrals')
          .eq('user_id', referrer.user_id)
          .single();

        await supabase
          .from('user_credits')
          .update({
            permanent_fuel: (referrerCredits?.permanent_fuel || 0) + stageConfig.fuel,
            total_referrals: (referrerCredits?.total_referrals || 0) + 1,
          })
          .eq('user_id', referrer.user_id);

        await supabase.from('credit_transactions').insert({
          user_id: referrer.user_id,
          amount: stageConfig.fuel,
          credit_type: 'permanent',
          action_type: 'referral_signup',
          description: 'Referral bonus: new user signed up with your code'
        });

        // Check referrer achievements
        await supabase.rpc('check_achievements', { p_user_id: referrer.user_id });

        // Award referred user welcome bonus
        amountToAward = 20; // welcome bonus for new user
        xpToAward = 0;
        actionType = 'referral_welcome';
        description = 'Welcome bonus for joining via referral';

      } else {
        // Other referral stages (profile_complete, applied, active_7d, hired)
        // Find the referral record where this user is the referred
        const { data: referralRecord } = await supabase
          .from('referrals')
          .select('*')
          .eq('referred_id', user.id)
          .maybeSingle();

        if (!referralRecord) {
          return new Response(
            JSON.stringify({ error: 'No referral found for this user' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if stage already rewarded
        const stageField = action === 'referral_profile_complete' ? 'profile_completed_at' :
                          action === 'referral_applied' ? 'first_application_at' :
                          action === 'referral_active_7d' ? 'active_7d_at' :
                          action === 'referral_hired' ? 'hired_at' : null;

        if (stageField && referralRecord[stageField]) {
          return new Response(
            JSON.stringify({ error: 'Stage already completed', already_completed: true }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update referral stage
        const updateData: Record<string, any> = {
          stage: stageConfig.stage,
          referrer_xp_awarded: (referralRecord.referrer_xp_awarded || 0) + stageConfig.xp,
          referrer_fuel_awarded: (referralRecord.referrer_fuel_awarded || 0) + stageConfig.fuel,
        };
        if (stageField) updateData[stageField] = new Date().toISOString();

        await supabase
          .from('referrals')
          .update(updateData)
          .eq('id', referralRecord.id);

        // Award referrer
        const referrerId = referralRecord.referrer_id;
        await supabase.rpc('award_xp', { p_user_id: referrerId, p_amount: stageConfig.xp, p_reason: `Referral ${stageConfig.stage}` });

        const { data: refCredits } = await supabase
          .from('user_credits')
          .select('permanent_fuel')
          .eq('user_id', referrerId)
          .single();

        await supabase
          .from('user_credits')
          .update({ permanent_fuel: (refCredits?.permanent_fuel || 0) + stageConfig.fuel })
          .eq('user_id', referrerId);

        await supabase.from('credit_transactions').insert({
          user_id: referrerId,
          amount: stageConfig.fuel,
          credit_type: 'permanent',
          action_type: action,
          description: `Referral milestone: ${stageConfig.stage}`
        });

        await supabase.rpc('check_achievements', { p_user_id: referrerId });

        // Also reward the referred user for milestones
        const referredBonus = action === 'referral_profile_complete' ? 10 :
                             action === 'referral_applied' ? 15 :
                             action === 'referral_hired' ? 50 : 0;

        if (referredBonus > 0) {
          amountToAward = referredBonus;
          actionType = action;
          description = `Milestone bonus: ${stageConfig.stage}`;
        } else {
          return new Response(
            JSON.stringify({ success: true, awarded: 0, referrer_awarded: stageConfig.fuel }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // ── Handle recurring actions ──
    else if (RECURRING_REWARDS[action]) {
      const rewardConfig = RECURRING_REWARDS[action];
      const today = new Date().toISOString().split('T')[0];
      const currentMonth = new Date().toISOString().slice(0, 7);

      // Feed interactions are free now — no credits awarded, just allow the action
      if (rewardConfig.amount === 0) {
        return new Response(
          JSON.stringify({ success: true, awarded: 0, daily_fuel: credits.daily_fuel, permanent_fuel: credits.permanent_fuel }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

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
            JSON.stringify({ error: 'Daily cap reached', cap_reached: true, current: currentCount, max: rewardConfig.dailyCap }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

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
            JSON.stringify({ error: 'Monthly vouch cap reached', cap_reached: true, current: currentCount, max: rewardConfig.monthlyCap }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        await supabase
          .from('user_credits')
          .update({ [countField]: currentCount + 1 })
          .eq('user_id', user.id);
      }

      amountToAward = rewardConfig.amount;
      xpToAward = XP_REWARDS[action] || 0;
      description = `Earned ${amountToAward} credits for ${action.replace(/_/g, ' ')}`;

      // Update total counters
      const counterField = TOTAL_COUNTER_FIELDS[action];
      if (counterField) {
        await supabase
          .from('user_credits')
          .update({ [counterField]: (credits[counterField] || 0) + 1 })
          .eq('user_id', user.id);
      }
    }

    // ── Handle legacy referral format ──
    else if (action === 'referral' && referralCode) {
      // Redirect to new referral_signup action
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

      await supabase.from('referrals').insert({
        referrer_id: referrer.user_id,
        referred_id: user.id,
        referrer_credits_awarded: true,
        referred_credits_awarded: true,
        stage: 'signed_up',
      });

      // Award referrer
      await supabase.rpc('award_xp', { p_user_id: referrer.user_id, p_amount: 10, p_reason: 'Referral signed up' });
      const { data: referrerCredits } = await supabase
        .from('user_credits')
        .select('permanent_fuel, total_referrals')
        .eq('user_id', referrer.user_id)
        .single();

      await supabase
        .from('user_credits')
        .update({
          permanent_fuel: (referrerCredits?.permanent_fuel || 0) + 15,
          total_referrals: (referrerCredits?.total_referrals || 0) + 1,
        })
        .eq('user_id', referrer.user_id);

      await supabase.from('credit_transactions').insert({
        user_id: referrer.user_id,
        amount: 15,
        credit_type: 'permanent',
        action_type: 'referral_signup',
        description: 'Referral bonus: new user signed up with your code'
      });

      await supabase.rpc('check_achievements', { p_user_id: referrer.user_id });

      amountToAward = 20;
      actionType = 'referral_welcome';
      description = 'Welcome bonus for joining via referral';
    }

    if (amountToAward <= 0 && xpToAward <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid action or no credits to award' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Award XP if applicable
    if (xpToAward > 0) {
      await supabase.rpc('award_xp', { p_user_id: user.id, p_amount: xpToAward, p_reason: actionType });
      // Check achievements after XP change
      await supabase.rpc('check_achievements', { p_user_id: user.id });
    }

    // Award fuel
    if (amountToAward > 0) {
      const newPermanentFuel = credits.permanent_fuel + amountToAward;

      await supabase
        .from('user_credits')
        .update({ permanent_fuel: newPermanentFuel })
        .eq('user_id', user.id);

      await supabase.from('credit_transactions').insert({
        user_id: user.id,
        amount: amountToAward,
        credit_type: 'permanent',
        action_type: actionType,
        description
      });

      console.log(`[award-credits] Awarded ${amountToAward} fuel + ${xpToAward} XP to ${user.id} for ${actionType}`);

      return new Response(
        JSON.stringify({
          success: true,
          awarded: amountToAward,
          xp_awarded: xpToAward,
          daily_fuel: credits.daily_fuel,
          permanent_fuel: newPermanentFuel,
          total_credits: credits.daily_fuel + newPermanentFuel
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // XP only (no fuel)
    return new Response(
      JSON.stringify({
        success: true,
        awarded: 0,
        xp_awarded: xpToAward,
        daily_fuel: credits.daily_fuel,
        permanent_fuel: credits.permanent_fuel,
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
