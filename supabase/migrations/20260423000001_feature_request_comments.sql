-- Feature Request Comments & Ratings
-- Run in Supabase Dashboard SQL Editor

CREATE TABLE IF NOT EXISTS feature_request_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  request_id UUID NOT NULL,          -- no FK (constraints dropped)
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_fr_comments_request ON feature_request_comments(request_id);
CREATE INDEX IF NOT EXISTS idx_fr_comments_user ON feature_request_comments(user_id);

-- RLS
ALTER TABLE feature_request_comments ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read active comments
CREATE POLICY "read_active_comments" ON feature_request_comments
  FOR SELECT USING (is_active = true);

-- Authenticated users can insert their own comments
CREATE POLICY "insert_own_comment" ON feature_request_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "update_own_comment" ON feature_request_comments
  FOR UPDATE USING (auth.uid() = user_id);

-- Auto-increment comments_count on feature_requests when a comment is added
CREATE OR REPLACE FUNCTION trg_feature_request_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feature_requests SET comments_count = comments_count + 1 WHERE id = NEW.request_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.is_active = false AND OLD.is_active = true THEN
    UPDATE feature_requests SET comments_count = GREATEST(0, comments_count - 1) WHERE id = NEW.request_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_fr_comment_count
  AFTER INSERT OR UPDATE ON feature_request_comments
  FOR EACH ROW EXECUTE FUNCTION trg_feature_request_comment_count();

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
