-- Add recruiter_company_ids to profiles for linked company records
-- Run in Supabase Dashboard SQL Editor

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS recruiter_company_ids UUID[] DEFAULT '{}';

NOTIFY pgrst, 'reload schema';
