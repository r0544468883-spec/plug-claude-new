-- Add custom_links and personal fields to profiles_secure view
CREATE OR REPLACE VIEW public.profiles_secure AS
SELECT
  id,
  user_id,
  full_name,
  avatar_url,
  bio,
  -- Only show email/phone if authorized
  CASE WHEN public.can_view_contact_details(user_id) THEN email ELSE NULL END as email,
  CASE WHEN public.can_view_contact_details(user_id) THEN phone ELSE NULL END as phone,
  -- Public professional links
  linkedin_url,
  github_url,
  portfolio_url,
  custom_links,
  -- Public profile content
  personal_tagline,
  about_me,
  intro_video_url,
  -- Career preferences (non-sensitive)
  preferred_fields,
  preferred_roles,
  preferred_experience_level_id,
  experience_years,
  -- Settings
  profile_visibility,
  visible_to_hr,
  allow_recruiter_contact,
  email_notifications,
  preferred_language,
  theme,
  created_at,
  updated_at
FROM public.profiles;
