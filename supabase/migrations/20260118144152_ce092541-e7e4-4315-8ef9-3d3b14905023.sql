-- Add GPS coordinates and category to jobs table for distance-based search
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS category TEXT;

-- Add portfolio and social links to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS portfolio_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS github_url TEXT;

-- Add preferences columns for settings page
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'system';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_visibility TEXT DEFAULT 'public';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS allow_recruiter_contact BOOLEAN DEFAULT true;

-- Create index for faster location-based queries
CREATE INDEX IF NOT EXISTS idx_jobs_location_coords ON public.jobs (latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_jobs_category ON public.jobs (category) WHERE category IS NOT NULL;