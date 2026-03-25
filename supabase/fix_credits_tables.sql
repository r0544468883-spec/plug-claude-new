-- Fix Credits tables - run in Supabase SQL Editor
-- Uses IF NOT EXISTS to be safe

-- user_credits table
CREATE TABLE IF NOT EXISTS public.user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_fuel INTEGER DEFAULT 20 NOT NULL CHECK (daily_fuel >= 0),
  permanent_fuel INTEGER DEFAULT 0 NOT NULL CHECK (permanent_fuel >= 0),
  is_onboarded BOOLEAN DEFAULT false NOT NULL,
  last_refill_date DATE DEFAULT CURRENT_DATE NOT NULL,
  pings_today INTEGER DEFAULT 0 NOT NULL CHECK (pings_today >= 0),
  referral_code TEXT UNIQUE,
  vouches_given_this_month INTEGER DEFAULT 0 NOT NULL CHECK (vouches_given_this_month >= 0),
  vouches_received_this_month INTEGER DEFAULT 0 NOT NULL CHECK (vouches_received_this_month >= 0),
  last_vouch_reset_month DATE DEFAULT date_trunc('month', CURRENT_DATE)::DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- credit_transactions table
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  credit_type TEXT NOT NULL CHECK (credit_type IN ('daily', 'permanent')),
  action_type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- social_task_completions table
CREATE TABLE IF NOT EXISTS public.social_task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL,
  credits_awarded INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, task_id)
);

-- referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referrer_credits_awarded BOOLEAN DEFAULT false NOT NULL,
  referred_credits_awarded BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(referred_id)
);

-- daily_action_counts table
CREATE TABLE IF NOT EXISTS public.daily_action_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_date DATE DEFAULT CURRENT_DATE NOT NULL,
  community_shares INTEGER DEFAULT 0 NOT NULL CHECK (community_shares >= 0),
  job_shares INTEGER DEFAULT 0 NOT NULL CHECK (job_shares >= 0),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, action_date)
);

-- Enable RLS
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_action_counts ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own credits" ON public.user_credits;
CREATE POLICY "Users can view their own credits" ON public.user_credits FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own credits" ON public.user_credits;
CREATE POLICY "Users can update their own credits" ON public.user_credits FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert user credits" ON public.user_credits;
CREATE POLICY "System can insert user credits" ON public.user_credits FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own transactions" ON public.credit_transactions;
CREATE POLICY "Users can view their own transactions" ON public.credit_transactions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.credit_transactions;
CREATE POLICY "Users can insert their own transactions" ON public.credit_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own task completions" ON public.social_task_completions;
CREATE POLICY "Users can view their own task completions" ON public.social_task_completions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own task completions" ON public.social_task_completions;
CREATE POLICY "Users can insert their own task completions" ON public.social_task_completions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view referrals they made" ON public.referrals;
CREATE POLICY "Users can view referrals they made" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id);

DROP POLICY IF EXISTS "Users can view if they were referred" ON public.referrals;
CREATE POLICY "Users can view if they were referred" ON public.referrals FOR SELECT USING (auth.uid() = referred_id);

DROP POLICY IF EXISTS "Users can insert referrals" ON public.referrals;
CREATE POLICY "Users can insert referrals" ON public.referrals FOR INSERT WITH CHECK (auth.uid() = referred_id);

DROP POLICY IF EXISTS "Users can view their own action counts" ON public.daily_action_counts;
CREATE POLICY "Users can view their own action counts" ON public.daily_action_counts FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own action counts" ON public.daily_action_counts;
CREATE POLICY "Users can insert their own action counts" ON public.daily_action_counts FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own action counts" ON public.daily_action_counts;
CREATE POLICY "Users can update their own action counts" ON public.daily_action_counts FOR UPDATE USING (auth.uid() = user_id);

-- Function to generate referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := 'PLUG-';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Function to initialize credits on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_referral_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_referral_code := generate_referral_code();
    SELECT EXISTS (SELECT 1 FROM public.user_credits WHERE referral_code = new_referral_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  INSERT INTO public.user_credits (user_id, referral_code) VALUES (NEW.id, new_referral_code)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger (drop first)
DROP TRIGGER IF EXISTS on_auth_user_created_credits ON auth.users;
CREATE TRIGGER on_auth_user_created_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_credits();

-- Create credits record for existing users who don't have one yet
INSERT INTO public.user_credits (user_id, referral_code)
SELECT u.id, public.generate_referral_code()
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_credits c WHERE c.user_id = u.id)
ON CONFLICT (user_id) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_credits_referral_code ON public.user_credits(referral_code);

-- ═══════════════════════════════════
-- PROMO CODES TABLES
-- ═══════════════════════════════════

CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  expires_at TIMESTAMPTZ,
  max_uses INTEGER,
  uses_count INTEGER DEFAULT 0 NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('unlimited', 'bonus')),
  amount INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.promo_code_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  credits_awarded INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, code)
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage promo codes" ON public.promo_codes;
CREATE POLICY "Admins can manage promo codes" ON public.promo_codes FOR ALL USING (true);

DROP POLICY IF EXISTS "Users can view their own redemptions" ON public.promo_code_redemptions;
CREATE POLICY "Users can view their own redemptions" ON public.promo_code_redemptions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own redemptions" ON public.promo_code_redemptions;
CREATE POLICY "Users can insert their own redemptions" ON public.promo_code_redemptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function needed by redeem-promo-code edge function
CREATE OR REPLACE FUNCTION public.increment_permanent_fuel(p_user_id UUID, p_amount INTEGER)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.user_credits
  SET permanent_fuel = permanent_fuel + p_amount, updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;
