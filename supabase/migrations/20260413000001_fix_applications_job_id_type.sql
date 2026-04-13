-- Fix applications.job_id type: TEXT → UUID
-- The TEXT type prevents PostgREST joins with jobs.id (UUID), so applications
-- from the extension don't display in the dashboard.

-- Step 1: Drop the unique constraint that depends on job_id
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_job_id_candidate_id_key;

-- Step 2: Null out non-UUID job_id values (legacy extension entries before upsert fix)
UPDATE applications
SET job_id = NULL
WHERE job_id IS NOT NULL
  AND NOT (job_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- Step 3: Convert column from TEXT to UUID
ALTER TABLE applications
  ALTER COLUMN job_id TYPE uuid USING job_id::uuid;

-- Step 4: Add FK constraint to jobs table
ALTER TABLE applications
  ADD CONSTRAINT applications_job_id_fkey
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL;

-- Step 5: Re-create the unique constraint
ALTER TABLE applications
  ADD CONSTRAINT applications_job_id_candidate_id_key
  UNIQUE (job_id, candidate_id);

-- Step 6: Backfill job_company from the jobs table for extension applications
UPDATE applications a
SET job_company = j.company_name
FROM jobs j
WHERE a.job_id = j.id
  AND a.source = 'extension'
  AND (a.job_company IS NULL OR a.job_company = '');

-- Step 7: Recover lost applications from job_history
-- saveApplication() silently failed (expired JWT) but job_history was written.
-- Recover by inserting from job_history entries that have matching jobs but no application.
INSERT INTO applications (candidate_id, job_id, current_stage, status, source, job_url, job_title, last_interaction, created_at)
SELECT
  jh.user_id,
  j.id,
  'applied',
  'active',
  'extension',
  jh.url,
  jh.title,
  jh.last_visit,
  jh.last_visit
FROM job_history jh
INNER JOIN jobs j ON j.source_url = jh.url
WHERE jh.url LIKE '%UploadSingle%'
  AND NOT EXISTS (
    SELECT 1 FROM applications a
    WHERE a.candidate_id = jh.user_id
      AND (a.job_url = jh.url OR a.job_id = j.id)
  )
ON CONFLICT (job_id, candidate_id) DO NOTHING;
