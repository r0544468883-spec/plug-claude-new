
-- Extend schedule_tasks with CRM linking and attendee fields
ALTER TABLE schedule_tasks
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_id UUID,
  ADD COLUMN IF NOT EXISTS source_table TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS meeting_link TEXT,
  ADD COLUMN IF NOT EXISTS assigned_to UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS external_attendees JSONB DEFAULT '[]';

-- Add linked_task_id to client_timeline for bidirectional linking
ALTER TABLE client_timeline
  ADD COLUMN IF NOT EXISTS linked_task_id UUID REFERENCES schedule_tasks(id) ON DELETE SET NULL;

-- Index for source lookups
CREATE INDEX IF NOT EXISTS idx_schedule_tasks_source ON schedule_tasks(source, source_id) WHERE source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_schedule_tasks_user_date ON schedule_tasks(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_client_timeline_linked_task ON client_timeline(linked_task_id) WHERE linked_task_id IS NOT NULL;
