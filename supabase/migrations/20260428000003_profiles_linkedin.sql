ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_connected BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_access_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_token_expires_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_sub TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_display_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_picture TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_email TEXT;
