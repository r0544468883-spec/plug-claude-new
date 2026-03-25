-- Extension Integration Migration
-- Adds source tracking to applications and creates agent control table

-- Add source column to applications (web vs extension)
ALTER TABLE applications ADD COLUMN IF NOT EXISTS source text DEFAULT 'web';
ALTER TABLE applications ADD COLUMN IF NOT EXISTS job_url text;

-- Create extension_agent_control table for dashboard ↔ extension communication
CREATE TABLE IF NOT EXISTS extension_agent_control (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  command text DEFAULT 'stop' CHECK (command IN ('start', 'stop', 'pause')),
  criteria jsonb DEFAULT '{}',
  status text DEFAULT 'idle' CHECK (status IN ('running', 'idle', 'paused')),
  stats jsonb DEFAULT '{}',
  last_updated timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE extension_agent_control ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own agent control row
CREATE POLICY "Users manage own agent control"
  ON extension_agent_control
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Enable real-time for the new table
ALTER PUBLICATION supabase_realtime ADD TABLE extension_agent_control;
