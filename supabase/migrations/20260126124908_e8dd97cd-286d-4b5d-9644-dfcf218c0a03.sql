-- Fix profiles table exposure: Remove overly permissive SELECT policies and tighten access

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can view profiles with restrictions" ON public.profiles;
DROP POLICY IF EXISTS "HR can view visible candidates" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create new secure policies

-- 1. Users can always view their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- 2. Users can view public profiles (but email/phone are protected via profiles_secure view)
-- Only show minimal info for public profiles - the profiles_secure view handles sensitive data
CREATE POLICY "Public profiles are viewable"
ON public.profiles
FOR SELECT
USING (
  profile_visibility = 'public'
  AND auth.uid() IS NOT NULL
);

-- 3. HR can view profiles of candidates who applied to their jobs
CREATE POLICY "HR can view applicant profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM applications a
    JOIN jobs j ON a.job_id = j.id
    WHERE a.candidate_id = profiles.user_id
    AND (j.created_by = auth.uid() OR j.shared_by_user_id = auth.uid())
  )
);

-- 4. HR can view candidates marked as visible to HR
CREATE POLICY "HR can view visible to HR candidates"
ON public.profiles
FOR SELECT
USING (
  visible_to_hr = true
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('freelance_hr', 'inhouse_hr')
  )
);

-- Fix profiles_secure view: Add RLS policy to the view
-- Note: profiles_secure is a view with security_invoker, so it inherits the RLS of profiles table
-- We need to ensure the view is properly secured

-- First check if RLS is enabled on profiles_secure (views can have RLS in some cases)
-- For views with security_invoker=on, the underlying table's RLS applies automatically
-- So profiles_secure should be secure if profiles is secure

-- However, let's explicitly verify the view definition is correct
DROP VIEW IF EXISTS public.profiles_secure;

-- Recreate the view with proper security settings
CREATE VIEW public.profiles_secure
WITH (security_invoker=on) AS
SELECT 
  id,
  user_id,
  full_name,
  avatar_url,
  bio,
  portfolio_url,
  linkedin_url,
  github_url,
  experience_years,
  preferred_fields,
  preferred_roles,
  preferred_experience_level_id,
  preferred_language,
  theme,
  profile_visibility,
  visible_to_hr,
  allow_recruiter_contact,
  email_notifications,
  active_company_id,
  created_at,
  updated_at,
  -- Only show email/phone if caller is authorized
  CASE WHEN public.can_view_contact_details(user_id) THEN email ELSE NULL END AS email,
  CASE WHEN public.can_view_contact_details(user_id) THEN phone ELSE NULL END AS phone
FROM public.profiles;