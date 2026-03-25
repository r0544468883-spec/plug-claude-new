-- Job Analyses table — stores per-user AI match analysis results from the extension
CREATE TABLE IF NOT EXISTS job_analyses (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  job_id         uuid REFERENCES jobs(id) ON DELETE SET NULL,
  title          text NOT NULL,
  company        text,
  score          integer,
  summary        text,
  recommendation text CHECK (recommendation IN ('apply', 'skip', 'maybe')),
  source_url     text,
  reasons        text[],
  missing_skills text[],
  analyzed_at    timestamptz DEFAULT now()
);

ALTER TABLE job_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own analyses"
  ON job_analyses FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
