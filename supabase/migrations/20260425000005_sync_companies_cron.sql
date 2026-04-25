-- Daily cron job: sync companies from users' CV experience data
-- Requires pg_cron extension (enabled by default in Supabase)

-- 1. Create the sync function
CREATE OR REPLACE FUNCTION public.sync_companies_from_cvs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count integer;
BEGIN
  WITH new_companies AS (
    INSERT INTO companies (name, created_by)
    SELECT DISTINCT ON (lower(trim(exp->>'company')))
      trim(exp->>'company') as name,
      p.user_id as created_by
    FROM profiles p,
      jsonb_array_elements(p.cv_data->'experience') as exp
    WHERE
      p.cv_data IS NOT NULL
      AND jsonb_typeof(p.cv_data->'experience') = 'array'
      AND exp->>'company' IS NOT NULL
      AND length(trim(exp->>'company')) > 1
      AND length(trim(exp->>'company')) < 100
      -- Skip obvious job titles
      AND trim(exp->>'company') NOT ILIKE '%manager%'
      AND trim(exp->>'company') NOT ILIKE '%engineer%'
      AND trim(exp->>'company') NOT ILIKE '%developer%'
      AND trim(exp->>'company') NOT ILIKE '%verified job%'
      AND NOT EXISTS (
        SELECT 1 FROM companies c
        WHERE lower(c.name) = lower(trim(exp->>'company'))
      )
    ON CONFLICT DO NOTHING
    RETURNING id
  )
  SELECT COUNT(*) INTO inserted_count FROM new_companies;

  RETURN inserted_count;
END;
$$;

-- 2. Schedule daily at 03:00 UTC using pg_cron
SELECT cron.schedule(
  'sync-companies-from-cvs',   -- job name
  '0 3 * * *',                  -- every day at 03:00 UTC
  'SELECT public.sync_companies_from_cvs()'
);
