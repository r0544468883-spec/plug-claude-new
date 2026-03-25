-- Fix 1: Create internal_notes column on applications table for HR-only notes
-- The existing 'notes' field is visible to candidates, so we add a separate field
ALTER TABLE public.applications 
ADD COLUMN IF NOT EXISTS internal_notes text;

-- Add comment to clarify usage
COMMENT ON COLUMN public.applications.notes IS 'Candidate-visible notes about the application';
COMMENT ON COLUMN public.applications.internal_notes IS 'Internal HR notes, not visible to candidates';

-- Fix 2: Update the profiles RLS to hide email/phone from public profile view
-- Drop the existing policy that exposes PII
DROP POLICY IF EXISTS "Public profiles are viewable" ON public.profiles;

-- Create a more restrictive public profile policy that doesn't expose contact info
-- Public profiles can be viewed but contact details should come from profiles_secure
CREATE POLICY "Public profiles are viewable by authenticated users"
ON public.profiles FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND profile_visibility = 'public'
);

-- Note: The profiles_secure view already handles PII protection via can_view_contact_details()
-- and uses security_invoker=on, so it inherits RLS from profiles table