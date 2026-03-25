-- Fix storage policies - run this in Supabase SQL Editor
-- Uses DROP IF EXISTS + CREATE to ensure policies exist correctly

-- ═══════════════════════════════════
-- AVATARS BUCKET (public)
-- ═══════════════════════════════════
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ═══════════════════════════════════
-- PROFILE-VIDEOS BUCKET (private)
-- ═══════════════════════════════════
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('profile-videos', 'profile-videos', false, 52428800, ARRAY['video/mp4', 'video/webm', 'video/quicktime'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload their own intro videos" ON storage.objects;
CREATE POLICY "Users can upload their own intro videos" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'profile-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can view their own intro videos" ON storage.objects;
CREATE POLICY "Users can view their own intro videos" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'profile-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own intro videos" ON storage.objects;
CREATE POLICY "Users can delete their own intro videos" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'profile-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update their own intro videos" ON storage.objects;
CREATE POLICY "Users can update their own intro videos" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'profile-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ═══════════════════════════════════
-- RESUMES BUCKET (private)
-- ═══════════════════════════════════
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload own resumes" ON storage.objects;
CREATE POLICY "Users can upload own resumes" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can view own resumes" ON storage.objects;
CREATE POLICY "Users can view own resumes" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own resumes" ON storage.objects;
CREATE POLICY "Users can delete own resumes" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update own resumes" ON storage.objects;
CREATE POLICY "Users can update own resumes" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ═══════════════════════════════════
-- HOME-ASSIGNMENTS BUCKET (private)
-- ═══════════════════════════════════
INSERT INTO storage.buckets (id, name, public) VALUES ('home-assignments', 'home-assignments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload home assignments" ON storage.objects;
CREATE POLICY "Users can upload home assignments" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'home-assignments');

DROP POLICY IF EXISTS "Users can view home assignments" ON storage.objects;
CREATE POLICY "Users can view home assignments" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'home-assignments');
