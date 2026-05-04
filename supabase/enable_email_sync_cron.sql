-- Enable automatic email sync every 15 minutes (SERVER-SIDE)
-- ALREADY ACTIVE in production as of 2026-05-04 (cron jobid=7)
--
-- Prerequisites: pg_cron and pg_net extensions must be enabled in Supabase Dashboard → Database → Extensions

-- Ensure extensions exist
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove old schedule if exists (safe to run multiple times)
DO $$
BEGIN
  PERFORM cron.unschedule('sync-emails-every-15-min');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Schedule sync-emails every 15 minutes
SELECT cron.schedule(
  'sync-emails-every-15-min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://llrzeexnzgknpwcxdxpm.supabase.co/functions/v1/sync-emails',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxscnplZXhuemdrbnB3Y3hkeHBtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjcxMDA4NCwiZXhwIjoyMDQ4Mjg2MDg0fQ.R6IM8MFIoLKynJMBqpGxNt-Z5Kk1LsBnp1LjAf53xSw", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Job digest email — runs every 2 days at 8:00 AM Israel time (05:00 UTC)
-- ALREADY ACTIVE in production (cron jobid=6)
DO $$
BEGIN
  PERFORM cron.unschedule('job-digest-email');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'job-digest-email',
  '0 5 */2 * *',
  $$
  SELECT net.http_post(
    url := 'https://llrzeexnzgknpwcxdxpm.supabase.co/functions/v1/job-digest-email',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxscnplZXhuemdrbnB3Y3hkeHBtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjcxMDA4NCwiZXhwIjoyMDQ4Mjg2MDg0fQ.R6IM8MFIoLKynJMBqpGxNt-Z5Kk1LsBnp1LjAf53xSw"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
