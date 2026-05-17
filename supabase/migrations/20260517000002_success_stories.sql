-- Success stories — UGC content from hired users
CREATE TABLE IF NOT EXISTS success_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  application_id UUID,
  job_title TEXT NOT NULL,
  company_name TEXT,
  story TEXT NOT NULL,
  tip_for_others TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_success_stories_user ON success_stories(user_id);
CREATE INDEX IF NOT EXISTS idx_success_stories_public ON success_stories(is_public) WHERE is_public = true;

-- RLS
ALTER TABLE success_stories ENABLE ROW LEVEL SECURITY;

-- Anyone can read public stories
CREATE POLICY "Anyone can view public stories" ON success_stories
  FOR SELECT USING (is_public = true);

-- Users can view own stories
CREATE POLICY "Users can view own stories" ON success_stories
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert own stories
CREATE POLICY "Users can insert own stories" ON success_stories
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update own stories
CREATE POLICY "Users can update own stories" ON success_stories
  FOR UPDATE USING (user_id = auth.uid());
