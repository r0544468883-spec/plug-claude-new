-- Fix missing columns on messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS related_job_id UUID DEFAULT NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS related_application_id UUID DEFAULT NULL;
