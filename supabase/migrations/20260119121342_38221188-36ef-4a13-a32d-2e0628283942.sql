-- Fix the SECURITY DEFINER view issue by using security_invoker
DROP VIEW IF EXISTS public.profiles_secure;

CREATE VIEW public.profiles_secure
WITH (security_invoker = on)
AS
SELECT 
  id,
  user_id,
  full_name,
  avatar_url,
  bio,
  CASE WHEN public.can_view_contact_details(user_id) THEN email ELSE NULL END as email,
  CASE WHEN public.can_view_contact_details(user_id) THEN phone ELSE NULL END as phone,
  linkedin_url,
  github_url,
  portfolio_url,
  preferred_fields,
  preferred_roles,
  preferred_experience_level_id,
  experience_years,
  profile_visibility,
  visible_to_hr,
  allow_recruiter_contact,
  email_notifications,
  preferred_language,
  theme,
  created_at,
  updated_at
FROM public.profiles;