-- ============================================================
-- Add reminder_minutes_before to schedule_tasks
-- e.g. 15 = remind 15 minutes before the task
-- ============================================================
ALTER TABLE public.schedule_tasks
  ADD COLUMN IF NOT EXISTS reminder_minutes_before INTEGER DEFAULT NULL;
