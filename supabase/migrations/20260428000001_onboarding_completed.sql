-- Add onboarding_completed flag to profiles table
-- Used by OnboardingWizard to track if user completed the post-signup questionnaire
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
