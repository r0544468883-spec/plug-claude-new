-- Add job links and PLUG user link to recruiter_contacts
ALTER TABLE public.recruiter_contacts
  ADD COLUMN IF NOT EXISTS job_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS linked_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
