-- Fix: Remove overly permissive profile search policy and replace with restricted access
-- This prevents enumeration of all users by requiring specific conditions

-- Drop the overly permissive search policy
DROP POLICY IF EXISTS "Authenticated users can search profiles" ON public.profiles;

-- Replace with a more restricted policy that only allows searching
-- when there's a specific purpose (vouch recipient lookup by name)
-- The profiles_secure view should be used for lookups, not direct table access

-- Note: The following policies already exist and provide proper access:
-- - "Users can view own profile" - own profile access
-- - "Public profiles are viewable by authenticated users" - public profiles only  
-- - "HR can view applicant profiles" - HR viewing job applicants
-- - "HR can view visible to HR candidates" - HR-visible candidates

-- The profiles_secure view with security_invoker=on will inherit these policies
-- and additionally hide sensitive PII (email/phone) based on can_view_contact_details()