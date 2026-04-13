-- Fix applications.job_id type: TEXT → UUID
-- The TEXT type prevents PostgREST joins with jobs.id (UUID), so applications
-- from the extension don't display in the dashboard.

-- Step 0: Drop triggers that reference job_id as TEXT (they do regex + ::uuid casts)
DROP TRIGGER IF EXISTS trg_nullify_invalid_job_id ON applications;
DROP FUNCTION IF EXISTS nullify_invalid_job_id();
DROP TRIGGER IF EXISTS trg_populate_application_job_info ON applications;
DROP FUNCTION IF EXISTS populate_application_job_info();

-- Step 1: Drop constraints that depend on job_id
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_job_id_candidate_id_key;
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_job_id_fkey;

-- Step 2: Null out non-UUID job_id values (legacy extension entries)
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

-- Step 6: Re-create triggers updated for UUID type (no more regex/cast needed)
CREATE OR REPLACE FUNCTION nullify_invalid_job_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.job_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM jobs WHERE id = NEW.job_id) THEN
      NEW.job_id := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_nullify_invalid_job_id
  BEFORE INSERT OR UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION nullify_invalid_job_id();

CREATE OR REPLACE FUNCTION populate_application_job_info()
RETURNS TRIGGER AS $$
DECLARE
  v_title TEXT;
  v_company TEXT;
BEGIN
  IF NEW.job_id IS NOT NULL THEN
    BEGIN
      SELECT j.title, COALESCE(NULLIF(c.name,''), NULLIF(j.company_name,''))
      INTO v_title, v_company
      FROM jobs j
      LEFT JOIN companies c ON j.company_id = c.id
      WHERE j.id = NEW.job_id;

      IF NEW.job_title IS NULL OR NEW.job_title = '' THEN NEW.job_title := NULLIF(v_title,''); END IF;
      IF NEW.job_company IS NULL OR NEW.job_company = '' THEN NEW.job_company := NULLIF(v_company,''); END IF;
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_populate_application_job_info
  BEFORE INSERT OR UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION populate_application_job_info();

-- Step 7: Backfill job_company from the jobs table for extension applications
UPDATE applications a
SET job_company = j.company_name
FROM jobs j
WHERE a.job_id = j.id
  AND a.source = 'extension'
  AND (a.job_company IS NULL OR a.job_company = '');

-- Step 8: Recover lost applications from job_history
-- saveApplication() silently failed (expired JWT) but job_history was written.
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
