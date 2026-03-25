
-- Part 1: Jobs - hybrid + structured salary
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS hybrid_office_days integer;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS salary_min integer;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS salary_max integer;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS salary_currency text;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS salary_period text;

-- Part 2: Community hubs - feature toggles
ALTER TABLE public.community_hubs ADD COLUMN IF NOT EXISTS allow_posts boolean NOT NULL DEFAULT true;
ALTER TABLE public.community_hubs ADD COLUMN IF NOT EXISTS allow_comments boolean NOT NULL DEFAULT true;
ALTER TABLE public.community_hubs ADD COLUMN IF NOT EXISTS allow_polls boolean NOT NULL DEFAULT true;
ALTER TABLE public.community_hubs ADD COLUMN IF NOT EXISTS allow_video boolean NOT NULL DEFAULT true;
ALTER TABLE public.community_hubs ADD COLUMN IF NOT EXISTS allow_images boolean NOT NULL DEFAULT true;
ALTER TABLE public.community_hubs ADD COLUMN IF NOT EXISTS allow_member_invite boolean NOT NULL DEFAULT true;
