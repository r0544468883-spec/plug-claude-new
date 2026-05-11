-- Candidate tasks: recruiters assign tasks/to-dos to candidates
CREATE TABLE IF NOT EXISTS candidate_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  candidate_id UUID NOT NULL REFERENCES auth.users(id),
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE candidate_tasks ENABLE ROW LEVEL SECURITY;

-- Recruiters can manage tasks they created
CREATE POLICY "Recruiters manage own tasks" ON candidate_tasks
  FOR ALL USING (auth.uid() = created_by);

-- Candidates can view and update tasks assigned to them
CREATE POLICY "Candidates view own tasks" ON candidate_tasks
  FOR SELECT USING (auth.uid() = candidate_id);

CREATE POLICY "Candidates update own tasks" ON candidate_tasks
  FOR UPDATE USING (auth.uid() = candidate_id)
  WITH CHECK (auth.uid() = candidate_id);
