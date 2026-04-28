-- AI result caching columns. Each writer stamps the model version;
-- each reader compares against CURRENT_AI_MODEL_VERSION to invalidate
-- stale rows lazily after a model/prompt upgrade.

-- jobs: hash of JD text + which model parsed it
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS parsed_jd_hash text,
  ADD COLUMN IF NOT EXISTS parsed_jd_model text;

CREATE INDEX IF NOT EXISTS idx_jobs_parsed_jd_hash ON public.jobs (parsed_jd_hash);

-- documents: hash of resume bytes + which model summarized it
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS content_hash text,
  ADD COLUMN IF NOT EXISTS ai_summary_model text;

CREATE INDEX IF NOT EXISTS idx_documents_content_hash ON public.documents (content_hash);

-- applications: candidate summary freshness + model
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS ai_candidate_summary_model text,
  ADD COLUMN IF NOT EXISTS ai_candidate_summary_generated_at timestamptz;
