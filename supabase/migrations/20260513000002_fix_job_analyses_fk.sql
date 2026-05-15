-- Fix job_analyses FK: point to profiles(user_id) instead of profiles(id)
-- The extension sends auth.uid() as user_id, which matches profiles.user_id, not profiles.id
ALTER TABLE job_analyses DROP CONSTRAINT IF EXISTS job_analyses_user_id_fkey;
ALTER TABLE job_analyses ADD CONSTRAINT job_analyses_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
