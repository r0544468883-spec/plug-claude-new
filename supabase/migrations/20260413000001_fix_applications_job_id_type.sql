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
