
-- Add community targeting and comment settings to feed_posts
ALTER TABLE public.feed_posts
  ADD COLUMN IF NOT EXISTS target_hub_id UUID REFERENCES public.community_hubs(id),
  ADD COLUMN IF NOT EXISTS target_channel_id UUID REFERENCES public.community_channels(id),
  ADD COLUMN IF NOT EXISTS allow_comments BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS comment_permission TEXT NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS content_language TEXT NOT NULL DEFAULT 'en';

-- Add recruiter profile fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS recruiter_industries TEXT[],
  ADD COLUMN IF NOT EXISTS recruiter_companies TEXT[],
  ADD COLUMN IF NOT EXISTS recruiter_philosophy TEXT,
  ADD COLUMN IF NOT EXISTS recruiter_background TEXT,
  ADD COLUMN IF NOT EXISTS recruiter_education TEXT,
  ADD COLUMN IF NOT EXISTS recruiter_tip TEXT,
  ADD COLUMN IF NOT EXISTS recruiter_video_url TEXT;
