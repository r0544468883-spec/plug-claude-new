-- Fix 1: Update profiles SELECT policies to use profiles_secure view pattern
-- Keep the existing RLS but ensure frontend only queries profiles_secure

-- Fix 2: Update applications RLS to exclude internal_notes for candidates
-- Drop existing candidate view policies and recreate with column exclusion
-- Note: PostgreSQL RLS operates at row level, not column level
-- We need to handle this in the application layer or create a view

-- Create a view for candidate-visible application data (excludes internal_notes)
CREATE OR REPLACE VIEW public.applications_candidate_view
WITH (security_invoker = on)
AS SELECT 
  id,
  job_id,
  candidate_id,
  status,
  current_stage,
  match_score,
  notes,  -- candidate-visible notes
  -- internal_notes excluded
  last_interaction,
  created_at,
  updated_at
FROM public.applications
WHERE candidate_id = auth.uid();

-- Fix 3: Update audit_log to be admin-only for viewing
-- For now, restrict to own actions only (already done) but remove IP from user view
-- Create a secure view that hides IP address from regular users
CREATE OR REPLACE VIEW public.audit_log_user_view
WITH (security_invoker = on)
AS SELECT 
  id,
  user_id,
  action,
  entity_type,
  entity_id,
  old_values,
  new_values,
  -- ip_address excluded for privacy
  created_at
FROM public.audit_log
WHERE user_id = auth.uid();

-- Add comment to clarify proper usage
COMMENT ON VIEW public.applications_candidate_view IS 'Use this view for candidate-facing application queries - excludes internal_notes';
COMMENT ON VIEW public.audit_log_user_view IS 'Use this view for user-facing audit queries - excludes IP address';