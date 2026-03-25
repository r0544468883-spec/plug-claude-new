-- Add skills and target_locations columns to profiles
-- These are used by the PLUG Chrome Extension agent to know what jobs to apply for

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS skills text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_locations text[] DEFAULT '{}';

-- Allow users to read/update their own new columns (RLS already covers profiles via user_id)
COMMENT ON COLUMN public.profiles.skills IS 'Free-text skills list used by the extension agent';
COMMENT ON COLUMN public.profiles.target_locations IS 'Preferred job locations used by the extension agent';
