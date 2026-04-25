-- Career Data Foundation: add career_context to profiles
-- Users describe what they're looking for; AI uses this as primary context in every chat

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS career_context text;
