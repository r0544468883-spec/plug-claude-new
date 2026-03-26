-- Email Rejection Flow Enhancements
-- Adds provider column, previous_stage for undo, and cron job for auto-sync

-- 1. Add provider column to application_emails (needed for building web links)
ALTER TABLE public.application_emails
  ADD COLUMN IF NOT EXISTS provider TEXT;

-- 2. Add previous_stage for undo capability
ALTER TABLE public.application_emails
  ADD COLUMN IF NOT EXISTS previous_stage TEXT;

-- 3. Schedule email sync every 15 minutes via pg_cron + pg_net
-- NOTE: Replace SUPABASE_URL and SERVICE_ROLE_KEY with actual values before running
-- SELECT cron.schedule(
--   'sync-emails-every-15-min',
--   '*/15 * * * *',
--   $$
--   SELECT net.http_post(
--     url := 'YOUR_SUPABASE_URL/functions/v1/sync-emails',
--     headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
--     body := '{}'::jsonb
--   );
--   $$
-- );
