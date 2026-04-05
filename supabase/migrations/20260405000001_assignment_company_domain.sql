-- Add company_name and domain fields to assignment_templates
ALTER TABLE assignment_templates
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS domain TEXT;
