-- Backfill: create 'viewed' application records for jobs in job_history
-- that have a matching jobs row but NO application record yet.
-- This covers jobs viewed before the JOB_VIEWED handler started creating application records.

INSERT INTO applications (candidate_id, job_id, current_stage, status, source, job_url, job_title, job_company, last_interaction, created_at)
SELECT
  jh.user_id,
  j.id,
  'viewed',
  'active',
  'extension',
  jh.url,
  COALESCE(jh.title, j.title),
  COALESCE(jh.company, j.company_name),
  jh.last_visit,
  jh.last_visit
FROM job_history jh
INNER JOIN jobs j
  ON j.external_source = jh.source
  AND j.external_id = jh.normalized_url
WHERE NOT EXISTS (
  SELECT 1 FROM applications a
  WHERE a.candidate_id = jh.user_id
    AND a.job_id = j.id
)
-- Safety: only backfill for last 90 days
AND jh.last_visit > NOW() - INTERVAL '90 days'
ON CONFLICT (job_id, candidate_id) DO NOTHING;

-- Also catch jobs matched by source_url (AllJobs uses URL as ID, not normalized_url)
INSERT INTO applications (candidate_id, job_id, current_stage, status, source, job_url, job_title, job_company, last_interaction, created_at)
SELECT
  jh.user_id,
  j.id,
  'viewed',
  'active',
  'extension',
  jh.url,
  COALESCE(jh.title, j.title),
  COALESCE(jh.company, j.company_name),
  jh.last_visit,
  jh.last_visit
FROM job_history jh
INNER JOIN jobs j
  ON j.source_url = jh.url
WHERE NOT EXISTS (
  SELECT 1 FROM applications a
  WHERE a.candidate_id = jh.user_id
    AND a.job_id = j.id
)
AND jh.last_visit > NOW() - INTERVAL '90 days'
ON CONFLICT (job_id, candidate_id) DO NOTHING;
