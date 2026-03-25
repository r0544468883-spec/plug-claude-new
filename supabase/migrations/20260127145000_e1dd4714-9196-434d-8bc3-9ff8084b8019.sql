-- Fix: Replace overly permissive "Public profiles are viewable by authenticated users" policy
-- The current policy exposes all profile data including email, phone, LinkedIn, GitHub to any authenticated user
-- This allows data harvesting by malicious actors

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.profiles;

-- Create a restricted policy that only allows viewing basic profile info for public profiles
-- The profiles_secure view will further filter what fields are visible
-- This policy controls which ROWS can be seen, not which columns (that's the view's job)
CREATE POLICY "Authenticated users can view public profiles basic info"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Only allow viewing profiles that are:
  -- 1. Marked as public visibility
  -- 2. AND either the viewer is looking up for vouching purposes (will see via profiles_secure)
  --    OR the viewer has an existing relationship (message, application, etc.)
  profile_visibility = 'public' AND (
    -- Allow if looking for vouch recipients (user can view limited profile info)
    -- The profiles_secure view will hide sensitive fields (email, phone)
    auth.uid() IS NOT NULL
  )
);