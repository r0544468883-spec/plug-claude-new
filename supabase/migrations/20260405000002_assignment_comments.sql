-- Assignment comments
CREATE TABLE IF NOT EXISTS assignment_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  template_id UUID REFERENCES assignment_templates(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL
);

ALTER TABLE assignment_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comments" ON assignment_comments FOR SELECT USING (true);
CREATE POLICY "Auth users can insert comments" ON assignment_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON assignment_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);
