-- Run this in Supabase SQL Editor to ensure all storage buckets exist
-- Safe to run multiple times (ON CONFLICT DO NOTHING)

-- Resumes bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

-- Avatars bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Profile videos bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('profile-videos', 'profile-videos', false, 52428800, ARRAY['video/mp4', 'video/webm', 'video/quicktime'])
ON CONFLICT (id) DO NOTHING;

-- Home assignments bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('home-assignments', 'home-assignments', false)
ON CONFLICT (id) DO NOTHING;

-- Message attachments bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for resumes (skip if already exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can upload own resumes' AND tablename = 'objects') THEN
    CREATE POLICY "Users can upload own resumes" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own resumes' AND tablename = 'objects') THEN
    CREATE POLICY "Users can view own resumes" ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own resumes' AND tablename = 'objects') THEN
    CREATE POLICY "Users can delete own resumes" ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own resumes' AND tablename = 'objects') THEN
    CREATE POLICY "Users can update own resumes" ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

-- RLS policies for avatars (skip if already exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view avatars' AND tablename = 'objects') THEN
    CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'avatars');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can upload their own avatar' AND tablename = 'objects') THEN
    CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own avatar' AND tablename = 'objects') THEN
    CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own avatar' AND tablename = 'objects') THEN
    CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

-- RLS policies for profile-videos (skip if already exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can upload their own intro videos' AND tablename = 'objects') THEN
    CREATE POLICY "Users can upload their own intro videos" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'profile-videos' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own intro videos' AND tablename = 'objects') THEN
    CREATE POLICY "Users can view their own intro videos" ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'profile-videos' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own intro videos' AND tablename = 'objects') THEN
    CREATE POLICY "Users can delete their own intro videos" ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'profile-videos' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;
