-- Add referred_by column to profiles table for referral attribution
-- Stores email, phone, or ref-code of the person who referred this user
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by TEXT DEFAULT NULL;

-- Ensure gender column exists (may already exist from earlier migration)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT NULL;

-- Index for looking up who referred whom
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON profiles(referred_by) WHERE referred_by IS NOT NULL;

-- Add to_user_id to vouch_requests if not exists (for internal vouch requests)
ALTER TABLE vouch_requests ADD COLUMN IF NOT EXISTS to_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT NULL;

-- Index for fetching pending vouch requests sent to a user
CREATE INDEX IF NOT EXISTS idx_vouch_requests_to_user ON vouch_requests(to_user_id, status) WHERE to_user_id IS NOT NULL;

-- RLS: users can view vouch_requests addressed to them
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can view vouch requests to them' AND tablename = 'vouch_requests'
  ) THEN
    CREATE POLICY "Users can view vouch requests to them"
      ON vouch_requests FOR SELECT
      USING (auth.uid() = to_user_id OR auth.uid() = from_user_id);
  END IF;
END $$;
