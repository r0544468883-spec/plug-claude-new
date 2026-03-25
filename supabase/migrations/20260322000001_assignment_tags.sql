-- Add tags array and deadline to assignment_templates
ALTER TABLE assignment_templates ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE assignment_templates ADD COLUMN IF NOT EXISTS deadline DATE;
