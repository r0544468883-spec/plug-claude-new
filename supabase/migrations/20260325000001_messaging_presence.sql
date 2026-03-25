-- Add last_seen_at column for online presence tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz DEFAULT now();

-- Recreate profiles_secure view to include last_seen_at
DROP VIEW IF EXISTS public.profiles_secure;

CREATE VIEW public.profiles_secure WITH (security_invoker = on) AS
SELECT * FROM public.profiles;
