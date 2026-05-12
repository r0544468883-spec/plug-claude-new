-- Add feature toggles for community module tabs
ALTER TABLE public.community_hubs ADD COLUMN IF NOT EXISTS allow_courses BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.community_hubs ADD COLUMN IF NOT EXISTS allow_events BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.community_hubs ADD COLUMN IF NOT EXISTS allow_qa BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.community_hubs ADD COLUMN IF NOT EXISTS allow_badges BOOLEAN NOT NULL DEFAULT true;
