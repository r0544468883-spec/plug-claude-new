-- Fix preferred_fields and preferred_roles from UUID[] to text[]
-- The app uses string slugs (e.g. 'tech', 'data', 'developer') not UUIDs
-- Also ensure gender and onboarding_completed columns exist

ALTER TABLE public.profiles
  ALTER COLUMN preferred_fields TYPE text[] USING ARRAY[]::text[],
  ALTER COLUMN preferred_roles TYPE text[] USING ARRAY[]::text[];

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
