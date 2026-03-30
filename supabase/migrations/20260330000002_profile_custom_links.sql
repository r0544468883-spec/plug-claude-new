-- ══════════════════════════════════════════════════════════════
-- Add custom_links JSONB column to profiles
-- Stores an array of { label, url } objects for Linktree-style links
-- Run this in Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS custom_links JSONB DEFAULT '[]'::JSONB;

COMMENT ON COLUMN profiles.custom_links IS 'Array of {label, url} objects for custom professional links';
