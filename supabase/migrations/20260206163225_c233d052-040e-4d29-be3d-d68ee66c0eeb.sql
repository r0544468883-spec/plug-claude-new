-- =====================================================
-- PLUG FUEL ECONOMY - Database Schema
-- =====================================================

-- 1. Create user_credits table (main credit tracking)
CREATE TABLE public.user_credits (
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

-- 2. Create credit_transactions table (audit log for credits)
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  credit_type TEXT NOT NULL CHECK (credit_type IN ('daily', 'permanent')),
  action_type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Create social_task_completions table (one-time social tasks)
CREATE TABLE public.social_task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL,
  credits_awarded INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, task_id)
);

-- 4. Create referrals table (referral tracking)
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referrer_credits_awarded BOOLEAN DEFAULT false NOT NULL,
  referred_credits_awarded BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(referred_id)
);

-- 5. Create daily_action_counts table (for tracking daily caps)
CREATE TABLE public.daily_action_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_date DATE DEFAULT CURRENT_DATE NOT NULL,
  community_shares INTEGER DEFAULT 0 NOT NULL CHECK (community_shares >= 0),
  job_shares INTEGER DEFAULT 0 NOT NULL CHECK (job_shares >= 0),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, action_date)
);

-- =====================================================
-- Enable RLS on all tables
-- =====================================================
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_action_counts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies for user_credits
-- =====================================================
CREATE POLICY "Users can view their own credits"
  ON public.user_credits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own credits"
  ON public.user_credits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert user credits"
  ON public.user_credits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- RLS Policies for credit_transactions
-- =====================================================
CREATE POLICY "Users can view their own transactions"
  ON public.credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
  ON public.credit_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- RLS Policies for social_task_completions
-- =====================================================
CREATE POLICY "Users can view their own task completions"
  ON public.social_task_completions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own task completions"
  ON public.social_task_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- RLS Policies for referrals
-- =====================================================
CREATE POLICY "Users can view referrals they made"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id);

CREATE POLICY "Users can view if they were referred"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referred_id);

CREATE POLICY "Users can insert referrals"
  ON public.referrals FOR INSERT
  WITH CHECK (auth.uid() = referred_id);

-- =====================================================
-- RLS Policies for daily_action_counts
-- =====================================================
CREATE POLICY "Users can view their own action counts"
  ON public.daily_action_counts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own action counts"
  ON public.daily_action_counts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own action counts"
  ON public.daily_action_counts FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- Triggers for updated_at
-- =====================================================
CREATE TRIGGER update_user_credits_updated_at
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- Function to generate unique referral code
-- =====================================================
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- =====================================================
-- Function to initialize user credits on signup
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_referral_code TEXT;
  code_exists BOOLEAN;
BEGIN
  -- Generate unique referral code
  LOOP
    new_referral_code := generate_referral_code();
    SELECT EXISTS (
      SELECT 1 FROM public.user_credits WHERE referral_code = new_referral_code
    ) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;

  -- Insert initial credits for new user
  INSERT INTO public.user_credits (user_id, referral_code)
  VALUES (NEW.id, new_referral_code);
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_credits();

-- =====================================================
-- Function to get total available credits
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_total_credits(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(daily_fuel, 0) + COALESCE(permanent_fuel, 0)
  FROM public.user_credits
  WHERE user_id = p_user_id;
$$;

-- =====================================================
-- Add indexes for performance
-- =====================================================
CREATE INDEX idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC);
CREATE INDEX idx_social_task_completions_user_id ON public.social_task_completions(user_id);
CREATE INDEX idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_referred_id ON public.referrals(referred_id);
CREATE INDEX idx_user_credits_referral_code ON public.user_credits(referral_code);
CREATE INDEX idx_daily_action_counts_user_date ON public.daily_action_counts(user_id, action_date);