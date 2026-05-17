-- Referral tracking for viral growth loop
-- Tracks who invited whom and conversion status

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  referred_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL,
  channel TEXT DEFAULT 'whatsapp', -- whatsapp, linkedin, copy, twitter
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'clicked', 'signed_up', 'activated')),
  job_title TEXT,
  job_company TEXT,
  score INTEGER,
  landing_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  clicked_at TIMESTAMPTZ,
  signed_up_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ
);

-- Each user gets a unique referral code
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(user_id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);

-- RLS
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals" ON referrals
  FOR SELECT USING (referrer_id = auth.uid());

CREATE POLICY "Anyone can insert referral click" ON referrals
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update referrals" ON referrals
  FOR UPDATE USING (true);

-- Function to generate referral code on profile creation
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := lower(substr(md5(random()::text), 1, 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_referral_code ON profiles;
CREATE TRIGGER trg_generate_referral_code
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION generate_referral_code();

-- Backfill existing profiles with referral codes
UPDATE profiles SET referral_code = lower(substr(md5(user_id::text || random()::text), 1, 8))
WHERE referral_code IS NULL;

-- Function to increment referral count (called from web app after signup)
CREATE OR REPLACE FUNCTION increment_referral_count(ref_code TEXT)
RETURNS void AS $$
BEGIN
  UPDATE profiles SET referral_count = COALESCE(referral_count, 0) + 1
  WHERE referral_code = ref_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
