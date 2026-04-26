-- Cache AI match scores per user per job
-- Populated by the extension's Claude scoring, read by the web app
CREATE TABLE IF NOT EXISTS public.job_match_scores (
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id    UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  score     INT  NOT NULL CHECK (score >= 0 AND score <= 100),
  scored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, job_id)
);

ALTER TABLE public.job_match_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own job scores"
  ON public.job_match_scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own job scores"
  ON public.job_match_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own job scores"
  ON public.job_match_scores FOR UPDATE
  USING (auth.uid() = user_id);
