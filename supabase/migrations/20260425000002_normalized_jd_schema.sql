-- Normalized JD Schema: structured job data for better matching and tailoring
-- Stores extracted skills, culture signals, remote type for each job

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS parsed_jd jsonb;

-- Index for querying required_skills across jobs
CREATE INDEX IF NOT EXISTS idx_jobs_parsed_jd_skills
  ON jobs USING gin ((parsed_jd->'required_skills'));
