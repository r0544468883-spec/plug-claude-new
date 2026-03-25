-- Fix: Add missing columns to jobs table for extension-sourced jobs
-- Run this once in Supabase Dashboard SQL Editor

-- Add external source tracking columns
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS external_source TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Add company_name text fallback (for when company_id FK is not yet resolved)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS company_name TEXT;

-- Unique index for dedup upsert from extension
CREATE UNIQUE INDEX IF NOT EXISTS jobs_external_source_id_unique
  ON jobs(external_source, external_id)
  WHERE external_source IS NOT NULL AND external_id IS NOT NULL;
