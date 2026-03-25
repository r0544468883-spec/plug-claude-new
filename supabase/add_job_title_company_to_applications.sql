-- Add job_title and job_company columns to applications table
-- Required for extension-submitted applications that don't have a job_id FK
-- Run once in Supabase Dashboard SQL Editor

ALTER TABLE applications ADD COLUMN IF NOT EXISTS job_title text;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS job_company text;
