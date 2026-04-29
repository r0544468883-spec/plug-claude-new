-- Add needs_review flag to application_emails
-- Set when an email looks job-related (contains signal words) but could not be matched to any application.
-- Used by the frontend to show a notification prompting the user to manually link it.
ALTER TABLE public.application_emails
  ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_application_emails_needs_review
  ON public.application_emails(user_id, needs_review)
  WHERE needs_review = true;
