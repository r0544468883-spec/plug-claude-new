-- My Secrets: company insights collected by PLUG extension
CREATE TABLE IF NOT EXISTS company_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  company_url TEXT,
  tagline TEXT,
  industry TEXT,
  company_size TEXT,
  insights TEXT, -- AI-generated analysis
  known_people JSONB DEFAULT '[]'::jsonb, -- array of strings
  analyzed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_company_insights_user_id ON company_insights(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_insights_user_company ON company_insights(user_id, company_url);

-- RLS
ALTER TABLE company_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own insights"
  ON company_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own insights"
  ON company_insights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own insights"
  ON company_insights FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own insights"
  ON company_insights FOR DELETE
  USING (auth.uid() = user_id);
