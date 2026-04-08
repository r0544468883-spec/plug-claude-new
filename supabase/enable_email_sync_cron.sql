-- Enable automatic email sync every 15 minutes (SERVER-SIDE)
-- Run this in Supabase Dashboard → SQL Editor (one-time setup)
-- This is a BACKUP mechanism — the web app also auto-syncs client-side every 15 min
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
  -- Job doesn't exist, that's fine
END $$;

-- Schedule sync-emails every 15 minutes
-- IMPORTANT: Replace YOUR_SERVICE_ROLE_KEY with your actual Supabase service role key
-- You can find it in: Supabase Dashboard → Project Settings → API → service_role key
SELECT cron.schedule(
  'sync-emails-every-15-min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://llrzeexnzgknpwcxdxpm.supabase.co/functions/v1/sync-emails',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
