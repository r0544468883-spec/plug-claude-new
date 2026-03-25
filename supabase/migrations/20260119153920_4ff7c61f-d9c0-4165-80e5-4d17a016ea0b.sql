-- Add cv_data column to profiles for storing CV builder data
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cv_data JSONB DEFAULT '{}'::jsonb;