-- Add rejection_reason to applications for feedback loop
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS rejection_reason text;
