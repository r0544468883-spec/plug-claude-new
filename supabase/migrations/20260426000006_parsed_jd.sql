-- Add normalized JD struct to jobs table
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS parsed_jd JSONB;

-- Index for querying by seniority / remote_type
CREATE INDEX IF NOT EXISTS idx_jobs_parsed_jd ON public.jobs USING GIN (parsed_jd);
