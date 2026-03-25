-- ============================================================
-- Extend schedule_tasks.task_type CHECK constraint
-- Add: phone_call, frontal_interview, home_assignment
-- ============================================================

-- Drop the old constraint, add new one with extended values
ALTER TABLE public.schedule_tasks
  DROP CONSTRAINT IF EXISTS schedule_tasks_task_type_check;

ALTER TABLE public.schedule_tasks
  ADD CONSTRAINT schedule_tasks_task_type_check
  CHECK (task_type IN (
    'interview',
    'phone_call',
    'frontal_interview',
    'home_assignment',
    'followup',
    'task',
    'meeting',
    'deadline',
    'reminder'
  ));
