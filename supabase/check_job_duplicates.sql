-- ── Step 1: View duplicate groups (same title + company) ──────────────────
SELECT
  LOWER(TRIM(title))       AS norm_title,
  LOWER(TRIM(company_name)) AS norm_company,
  COUNT(*)                 AS duplicates,
  ARRAY_AGG(id ORDER BY created_at ASC) AS ids,
  MIN(created_at)          AS first_created
FROM jobs
WHERE is_active = true
  AND title IS NOT NULL
  AND company_name IS NOT NULL
GROUP BY LOWER(TRIM(title)), LOWER(TRIM(company_name))
HAVING COUNT(*) > 1
ORDER BY duplicates DESC
LIMIT 50;


-- ── Step 2: Preview rows that WOULD be deleted (keep oldest, remove rest) ──
-- (run this to check before deleting)
SELECT j.id, j.title, j.company_name, j.created_at, j.external_source
FROM jobs j
WHERE j.is_active = true
  AND EXISTS (
    SELECT 1 FROM jobs j2
    WHERE LOWER(TRIM(j2.title))        = LOWER(TRIM(j.title))
      AND LOWER(TRIM(j2.company_name)) = LOWER(TRIM(j.company_name))
      AND j2.id <> j.id
      AND j2.created_at < j.created_at   -- j2 is older → j is the duplicate
  )
ORDER BY j.title, j.created_at;


-- ── Step 3: DELETE duplicates (soft-delete — keep the OLDEST row per group) ──
-- !! Run Step 1 & 2 first to verify !!
/*
UPDATE jobs SET is_active = false
WHERE is_active = true
  AND EXISTS (
    SELECT 1 FROM jobs j2
    WHERE LOWER(TRIM(j2.title))        = LOWER(TRIM(jobs.title))
      AND LOWER(TRIM(j2.company_name)) = LOWER(TRIM(jobs.company_name))
      AND j2.id <> jobs.id
      AND j2.created_at < jobs.created_at
  );
*/
