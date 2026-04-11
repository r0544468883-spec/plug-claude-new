-- Ambassador System: XP, tiers, streaks, achievements, referral stages, weekly quests
-- Run this in Supabase Dashboard SQL Editor

-- ============================================================
-- 1. Extend user_credits with ambassador fields
-- ============================================================
ALTER TABLE public.user_credits
  ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ambassador_tier TEXT NOT NULL DEFAULT 'explorer',
  ADD COLUMN IF NOT EXISTS login_streak INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_login_date DATE NULL,
  ADD COLUMN IF NOT EXISTS chat_messages_today INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_referrals INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_job_shares INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_vouches_given INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_vouches_received INTEGER NOT NULL DEFAULT 0;

-- Update default daily fuel from 20 to 15 (Explorer tier)
ALTER TABLE public.user_credits ALTER COLUMN daily_fuel SET DEFAULT 15;

-- ============================================================
-- 2. Achievements table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  fuel_awarded INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements"
  ON public.achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage achievements"
  ON public.achievements FOR ALL
  USING (auth.role() = 'service_role');

-- Index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_user_credits_xp ON public.user_credits (xp DESC);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON public.achievements (user_id);

-- ============================================================
-- 3. Referral stages tracking (progressive referral rewards)
-- ============================================================
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'signed_up',
  ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS first_application_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS active_7d_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS hired_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS referrer_xp_awarded INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referrer_fuel_awarded INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- 4. Weekly quest tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS public.weekly_quest_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL, -- Monday of the week
  quest_id TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  target INTEGER NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ NULL,
  rewarded BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(user_id, week_start, quest_id)
);

ALTER TABLE public.weekly_quest_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weekly quests"
  ON public.weekly_quest_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage weekly quests"
  ON public.weekly_quest_progress FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- 5. Vouch request links
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vouch_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  link_code TEXT NOT NULL UNIQUE,
  message TEXT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, expired
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ NULL
);

ALTER TABLE public.vouch_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vouch requests"
  ON public.vouch_requests FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can create vouch requests"
  ON public.vouch_requests FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Service role can manage vouch requests"
  ON public.vouch_requests FOR ALL
  USING (auth.role() = 'service_role');

-- Generate unique vouch link codes
CREATE OR REPLACE FUNCTION generate_vouch_link_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    code := substr(md5(random()::text || clock_timestamp()::text), 1, 8);
    SELECT EXISTS(SELECT 1 FROM public.vouch_requests WHERE link_code = code) INTO exists_check;
    EXIT WHEN NOT exists_check;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 6. Ambassador leaderboard view
-- ============================================================
CREATE OR REPLACE VIEW public.ambassador_leaderboard AS
SELECT
  uc.user_id,
  p.full_name,
  p.avatar_url,
  uc.xp,
  uc.ambassador_tier,
  uc.login_streak,
  uc.total_referrals,
  uc.total_vouches_given,
  ROW_NUMBER() OVER (ORDER BY uc.xp DESC) AS rank
FROM public.user_credits uc
JOIN public.profiles p ON p.user_id = uc.user_id
WHERE uc.xp > 0
ORDER BY uc.xp DESC
LIMIT 100;

-- ============================================================
-- 7. Function: update ambassador tier based on XP
-- ============================================================
CREATE OR REPLACE FUNCTION update_ambassador_tier()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ambassador_tier := CASE
    WHEN NEW.xp >= 10000 THEN 'champion'
    WHEN NEW.xp >= 2000  THEN 'ambassador'
    WHEN NEW.xp >= 500   THEN 'advocate'
    WHEN NEW.xp >= 100   THEN 'connector'
    ELSE 'explorer'
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_ambassador_tier ON public.user_credits;
CREATE TRIGGER trg_update_ambassador_tier
  BEFORE UPDATE OF xp ON public.user_credits
  FOR EACH ROW
  EXECUTE FUNCTION update_ambassador_tier();

-- ============================================================
-- 8. Function: update login streak
-- ============================================================
CREATE OR REPLACE FUNCTION update_login_streak(p_user_id UUID)
RETURNS TABLE(new_streak INTEGER, streak_xp INTEGER, streak_fuel INTEGER) AS $$
DECLARE
  v_last_login DATE;
  v_streak INTEGER;
  v_today DATE := CURRENT_DATE;
  v_xp INTEGER := 0;
  v_fuel INTEGER := 0;
BEGIN
  SELECT last_login_date, login_streak
  INTO v_last_login, v_streak
  FROM public.user_credits
  WHERE user_id = p_user_id;

  IF v_last_login = v_today THEN
    -- Already logged in today
    RETURN QUERY SELECT v_streak, 0, 0;
    RETURN;
  END IF;

  IF v_last_login = v_today - 1 THEN
    -- Consecutive day
    v_streak := v_streak + 1;
  ELSE
    -- Streak broken
    v_streak := 1;
  END IF;

  -- Award streak bonuses
  v_xp := 1; -- daily login XP
  v_fuel := 2; -- daily login fuel

  -- Milestone bonuses
  IF v_streak = 7 THEN
    v_xp := v_xp + 15;
  ELSIF v_streak = 30 THEN
    v_xp := v_xp + 75;
    v_fuel := v_fuel + 10;
  END IF;

  UPDATE public.user_credits
  SET
    login_streak = v_streak,
    last_login_date = v_today,
    xp = xp + v_xp,
    permanent_fuel = permanent_fuel + v_fuel
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT v_streak, v_xp, v_fuel;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 9. Function: award XP (callable from edge functions)
-- ============================================================
CREATE OR REPLACE FUNCTION award_xp(p_user_id UUID, p_amount INTEGER, p_reason TEXT DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  v_new_xp INTEGER;
BEGIN
  UPDATE public.user_credits
  SET xp = xp + p_amount
  WHERE user_id = p_user_id
  RETURNING xp INTO v_new_xp;

  -- Log XP transaction
  INSERT INTO public.credit_transactions (user_id, amount, credit_type, action_type, description)
  VALUES (p_user_id, p_amount, 'permanent', 'xp_award', COALESCE(p_reason, 'XP earned'));

  RETURN v_new_xp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 10. Function: check and unlock achievements
-- ============================================================
CREATE OR REPLACE FUNCTION check_achievements(p_user_id UUID)
RETURNS TABLE(achievement_id TEXT, xp_awarded INTEGER, fuel_awarded INTEGER) AS $$
DECLARE
  v_uc RECORD;
  v_social_complete BOOLEAN;
  v_all_social INTEGER;
BEGIN
  SELECT * INTO v_uc FROM public.user_credits WHERE user_id = p_user_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Check each achievement
  -- networker: 5 referrals
  IF v_uc.total_referrals >= 5 THEN
    BEGIN
      INSERT INTO public.achievements (user_id, achievement_id, xp_awarded, fuel_awarded)
      VALUES (p_user_id, 'networker', 50, 50);
      UPDATE public.user_credits SET xp = xp + 50, permanent_fuel = permanent_fuel + 50 WHERE user_id = p_user_id;
      RETURN QUERY SELECT 'networker'::TEXT, 50, 50;
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
  END IF;

  -- influencer: 20 referrals
  IF v_uc.total_referrals >= 20 THEN
    BEGIN
      INSERT INTO public.achievements (user_id, achievement_id, xp_awarded, fuel_awarded)
      VALUES (p_user_id, 'influencer', 200, 200);
      UPDATE public.user_credits SET xp = xp + 200, permanent_fuel = permanent_fuel + 200 WHERE user_id = p_user_id;
      RETURN QUERY SELECT 'influencer'::TEXT, 200, 200;
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
  END IF;

  -- committed: 30 day streak
  IF v_uc.login_streak >= 30 THEN
    BEGIN
      INSERT INTO public.achievements (user_id, achievement_id, xp_awarded, fuel_awarded)
      VALUES (p_user_id, 'committed', 75, 100);
      UPDATE public.user_credits SET xp = xp + 75, permanent_fuel = permanent_fuel + 100 WHERE user_id = p_user_id;
      RETURN QUERY SELECT 'committed'::TEXT, 75, 100;
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
  END IF;

  -- job_spreader: 100 job shares
  IF v_uc.total_job_shares >= 100 THEN
    BEGIN
      INSERT INTO public.achievements (user_id, achievement_id, xp_awarded, fuel_awarded)
      VALUES (p_user_id, 'job_spreader', 100, 100);
      UPDATE public.user_credits SET xp = xp + 100, permanent_fuel = permanent_fuel + 100 WHERE user_id = p_user_id;
      RETURN QUERY SELECT 'job_spreader'::TEXT, 100, 100;
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
  END IF;

  -- community_builder: 10 vouches given
  IF v_uc.total_vouches_given >= 10 THEN
    BEGIN
      INSERT INTO public.achievements (user_id, achievement_id, xp_awarded, fuel_awarded)
      VALUES (p_user_id, 'community_builder', 50, 75);
      UPDATE public.user_credits SET xp = xp + 50, permanent_fuel = permanent_fuel + 75 WHERE user_id = p_user_id;
      RETURN QUERY SELECT 'community_builder'::TEXT, 50, 75;
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
  END IF;

  -- trusted_pro: 5 vouches received
  IF v_uc.total_vouches_received >= 5 THEN
    BEGIN
      INSERT INTO public.achievements (user_id, achievement_id, xp_awarded, fuel_awarded)
      VALUES (p_user_id, 'trusted_pro', 30, 50);
      UPDATE public.user_credits SET xp = xp + 30, permanent_fuel = permanent_fuel + 50 WHERE user_id = p_user_id;
      RETURN QUERY SELECT 'trusted_pro'::TEXT, 30, 50;
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
  END IF;

  -- social_butterfly: all 12 social tasks completed
  SELECT COUNT(*) INTO v_all_social FROM public.social_task_completions WHERE user_id = p_user_id;
  IF v_all_social >= 12 THEN
    BEGIN
      INSERT INTO public.achievements (user_id, achievement_id, xp_awarded, fuel_awarded)
      VALUES (p_user_id, 'social_butterfly', 50, 100);
      UPDATE public.user_credits SET xp = xp + 50, permanent_fuel = permanent_fuel + 100 WHERE user_id = p_user_id;
      RETURN QUERY SELECT 'social_butterfly'::TEXT, 50, 100;
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
