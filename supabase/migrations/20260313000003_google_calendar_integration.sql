-- ============================================================
-- Google Calendar Integration
-- ============================================================

-- Tokens table (one row per user)
CREATE TABLE IF NOT EXISTS public.google_calendar_tokens (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token  TEXT NOT NULL,
  refresh_token TEXT,
  expires_at    TIMESTAMPTZ,
  scope         TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_gcal_tokens"
  ON public.google_calendar_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Unique constraint on schedule_tasks(source, source_id)
-- Needed for upsert when syncing Google Calendar events
ALTER TABLE public.schedule_tasks
  DROP CONSTRAINT IF EXISTS schedule_tasks_source_source_id_key;

ALTER TABLE public.schedule_tasks
  ADD CONSTRAINT schedule_tasks_source_source_id_key
  UNIQUE (source, source_id);
