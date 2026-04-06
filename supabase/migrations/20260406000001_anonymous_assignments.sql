-- Add anonymous option to assignments and comments
ALTER TABLE assignment_templates ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;
ALTER TABLE assignment_comments ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;
