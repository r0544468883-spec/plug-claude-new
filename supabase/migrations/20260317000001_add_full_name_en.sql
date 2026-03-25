-- Add English name field to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name_en TEXT DEFAULT NULL;

COMMENT ON COLUMN public.profiles.full_name_en IS 'Full name in English, used for CV submission on English-language job sites';
