
CREATE TABLE IF NOT EXISTS public.schedule_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  due_time TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  task_type TEXT NOT NULL DEFAULT 'task' CHECK (task_type IN ('interview', 'followup', 'task', 'meeting', 'deadline', 'reminder')),
  is_completed BOOLEAN NOT NULL DEFAULT false,
  related_candidate TEXT,
  related_job TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.schedule_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_tasks"
  ON public.schedule_tasks
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS schedule_tasks_user_id_idx ON public.schedule_tasks(user_id);
CREATE INDEX IF NOT EXISTS schedule_tasks_due_date_idx ON public.schedule_tasks(due_date);
