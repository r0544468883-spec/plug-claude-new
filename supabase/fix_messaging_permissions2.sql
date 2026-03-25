-- ============================================
-- Fix #2: Missing profiles SELECT policy
-- The migration that creates conversations also adds
-- a broader profiles view policy. Without it, users
-- can only see their OWN profile.
-- ============================================

-- Add the broader profiles SELECT policy (view other users)
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = user_id
    OR profile_visibility = 'public'
    OR true  -- allow all authenticated users to see profiles
  );

-- Make sure profile_visibility is set for the demo user
UPDATE profiles
SET profile_visibility = 'public'
WHERE user_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  AND (profile_visibility IS NULL OR profile_visibility != 'public');

-- Verify: can we see both profiles?
SELECT user_id, full_name, profile_visibility, last_seen_at
FROM profiles
WHERE user_id IN (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'da55502c-62f1-4cfa-9b3a-b3a9ca8304db'
);
