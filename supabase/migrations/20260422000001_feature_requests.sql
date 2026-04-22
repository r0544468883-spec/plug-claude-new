-- Community Ideas Board: feature requests, votes, badges
-- Run in Supabase Dashboard SQL Editor

-- ── Feature Requests ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS feature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  system_area TEXT NOT NULL DEFAULT 'other',       -- 'dashboard' | 'extension' | 'ai_engine' | 'candidate_view' | 'other'
  target_audience TEXT NOT NULL DEFAULT 'both',    -- 'recruiters' | 'candidates' | 'both'
  priority INT DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  status TEXT DEFAULT 'submitted',                 -- 'submitted' | 'under_review' | 'planned' | 'in_development' | 'shipped' | 'declined'
  voice_url TEXT,
  voice_transcript TEXT,
  attachments TEXT[] DEFAULT '{}',
  link_url TEXT,
  votes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  admin_response TEXT,
  admin_response_at TIMESTAMPTZ,
  feed_post_id UUID,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_feature_requests_author ON feature_requests(author_id);
CREATE INDEX IF NOT EXISTS idx_feature_requests_status ON feature_requests(status);
CREATE INDEX IF NOT EXISTS idx_feature_requests_votes ON feature_requests(votes_count DESC);

-- ── Feature Request Votes ────────────────────────────────
CREATE TABLE IF NOT EXISTS feature_request_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  request_id UUID REFERENCES feature_requests(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(request_id, user_id)
);

-- ── User Badges ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  badge_type TEXT NOT NULL,                        -- 'builder' | 'visionary' | 'founder'
  feature_request_id UUID REFERENCES feature_requests(id) ON DELETE SET NULL,
  UNIQUE(user_id, badge_type, feature_request_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);

-- ── RLS ──────────────────────────────────────────────────
ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_request_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- feature_requests policies
CREATE POLICY "Anyone can view active feature requests"
  ON feature_requests FOR SELECT USING (is_active = true);

CREATE POLICY "Authenticated users can create feature requests"
  ON feature_requests FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update own requests"
  ON feature_requests FOR UPDATE USING (auth.uid() = author_id);

-- feature_request_votes policies
CREATE POLICY "Anyone can view votes"
  ON feature_request_votes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can vote"
  ON feature_request_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own vote"
  ON feature_request_votes FOR DELETE USING (auth.uid() = user_id);

-- user_badges policies
CREATE POLICY "Anyone can view badges"
  ON user_badges FOR SELECT USING (true);

CREATE POLICY "System can insert badges"
  ON user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── Triggers ─────────────────────────────────────────────

-- Auto-update votes_count
CREATE OR REPLACE FUNCTION update_feature_request_votes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feature_requests SET votes_count = votes_count + 1 WHERE id = NEW.request_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feature_requests SET votes_count = votes_count - 1 WHERE id = OLD.request_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_feature_request_votes_count
AFTER INSERT OR DELETE ON feature_request_votes
FOR EACH ROW EXECUTE FUNCTION update_feature_request_votes_count();

-- Auto-award badges on status change
CREATE OR REPLACE FUNCTION award_feature_badge()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'planned' AND (OLD.status IS DISTINCT FROM 'planned') THEN
    INSERT INTO user_badges (user_id, badge_type, feature_request_id)
    VALUES (NEW.author_id, 'visionary', NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;
  IF NEW.status = 'shipped' AND (OLD.status IS DISTINCT FROM 'shipped') THEN
    INSERT INTO user_badges (user_id, badge_type, feature_request_id)
    VALUES (NEW.author_id, 'founder', NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_award_feature_badge
AFTER UPDATE ON feature_requests
FOR EACH ROW EXECUTE FUNCTION award_feature_badge();

-- ── Storage bucket ───────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('feature-attachments', 'feature-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload feature attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'feature-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read feature attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'feature-attachments' AND auth.role() = 'authenticated');
