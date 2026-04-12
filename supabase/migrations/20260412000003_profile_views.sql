-- Profile views tracking table
-- Records every visit to a user's public profile
CREATE TABLE IF NOT EXISTS profile_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- null = anonymous visitor
  viewer_ip TEXT, -- for anonymous dedup
  viewer_user_agent TEXT,
  referrer TEXT, -- where they came from
  action TEXT NOT NULL DEFAULT 'view' CHECK (action IN ('view', 'resume_download', 'video_play', 'link_click')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX idx_profile_views_profile ON profile_views(profile_user_id, created_at DESC);
CREATE INDEX idx_profile_views_action ON profile_views(profile_user_id, action);

-- RLS
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a view (even anonymous)
CREATE POLICY "Anyone can record a profile view"
  ON profile_views FOR INSERT
  WITH CHECK (true);

-- Only the profile owner can read their own views
CREATE POLICY "Profile owner can view their analytics"
  ON profile_views FOR SELECT
  USING (auth.uid() = profile_user_id);
