-- Add HR premium flag to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_hr_premium BOOLEAN DEFAULT false;

-- Talent pool saved candidates table
CREATE TABLE IF NOT EXISTS talent_pool_saved (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hr_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hr_user_id, candidate_id)
);

ALTER TABLE talent_pool_saved ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hr_manage_talent_pool" ON talent_pool_saved
  USING (auth.uid() = hr_user_id)
  WITH CHECK (auth.uid() = hr_user_id);
