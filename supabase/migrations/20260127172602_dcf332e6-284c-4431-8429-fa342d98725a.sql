-- 1. Add new columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS personal_tagline TEXT,
ADD COLUMN IF NOT EXISTS about_me TEXT,
ADD COLUMN IF NOT EXISTS intro_video_url TEXT;

-- 2. Create profile-videos storage bucket (private - for intro videos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('profile-videos', 'profile-videos', false, 52428800, ARRAY['video/mp4', 'video/webm', 'video/quicktime'])
ON CONFLICT (id) DO NOTHING;

-- 3. Create avatars storage bucket (public - for profile photos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 4. RLS policies for profile-videos bucket

-- Owners can upload their own videos
CREATE POLICY "Users can upload their own intro videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Owners can view their own videos
CREATE POLICY "Users can view their own intro videos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'profile-videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Owners can delete their own videos
CREATE POLICY "Users can delete their own intro videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- HR can view videos of visible_to_hr candidates or applicants
CREATE POLICY "HR can view candidate intro videos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'profile-videos'
  AND (
    -- HR viewing visible_to_hr candidates
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.user_roles ur ON ur.user_id = auth.uid()
      WHERE p.user_id::text = (storage.foldername(name))[1]
      AND p.visible_to_hr = true
      AND ur.role IN ('freelance_hr', 'inhouse_hr')
    )
    OR
    -- HR viewing applicants for their jobs
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      WHERE a.candidate_id::text = (storage.foldername(name))[1]
      AND j.created_by = auth.uid()
    )
  )
);

-- 5. RLS policies for avatars bucket

-- Anyone can view avatars (public bucket, but need explicit policy)
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Users can upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 6. Update profiles_secure view to include new fields
DROP VIEW IF EXISTS public.profiles_secure;

CREATE VIEW public.profiles_secure WITH (security_invoker = on) AS
SELECT
  id,
  user_id,
  full_name,
  CASE WHEN can_view_contact_details(user_id) THEN email ELSE NULL END as email,
  CASE WHEN can_view_contact_details(user_id) THEN phone ELSE NULL END as phone,
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
  personal_tagline,
  about_me,
  intro_video_url,
  created_at,
  updated_at
FROM public.profiles;