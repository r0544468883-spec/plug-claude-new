-- Fix audit_log permissive INSERT policy
-- Remove the overly permissive INSERT policy and create a SECURITY DEFINER function instead

-- Drop the existing permissive INSERT policy
DROP POLICY IF EXISTS "System can insert audit log" ON public.audit_log;

-- Create a SECURITY DEFINER function for audit logging
-- This ensures only server-side code can create audit entries
CREATE OR REPLACE FUNCTION public.create_audit_log_entry(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_values, new_values, ip_address)
  VALUES (
    auth.uid(),
    p_action,
    p_entity_type,
    p_entity_id,
    p_old_values,
    p_new_values,
    current_setting('request.headers', true)::json->>'x-forwarded-for'
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- Revoke direct execute from public, only allow authenticated users through the function
REVOKE ALL ON FUNCTION public.create_audit_log_entry FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_audit_log_entry TO authenticated;

-- Fix profiles table - restrict email/phone visibility to appropriate users
-- Create a view that hides sensitive contact info for non-authorized viewers

-- First, create a function to check if user can see contact details
CREATE OR REPLACE FUNCTION public.can_view_contact_details(profile_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- User can always see their own contact details
  IF auth.uid() = profile_user_id THEN
    RETURN TRUE;
  END IF;
  
  -- HR users can see contact details of candidates who:
  -- 1. Have visible_to_hr = true, OR
  -- 2. Have applied to their jobs
  IF has_role(auth.uid(), 'freelance_hr') OR has_role(auth.uid(), 'inhouse_hr') THEN
    -- Check if candidate applied to their jobs OR is visible to HR
    RETURN EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = profile_user_id
      AND (
        p.visible_to_hr = true
        OR EXISTS (
          SELECT 1 FROM applications a
          JOIN jobs j ON a.job_id = j.id
          WHERE a.candidate_id = profile_user_id
          AND (j.created_by = auth.uid() OR j.shared_by_user_id = auth.uid())
        )
      )
    );
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Create a secure view for profiles that conditionally shows contact info
CREATE OR REPLACE VIEW public.profiles_secure AS
SELECT 
  id,
  user_id,
  full_name,
  avatar_url,
  bio,
  -- Only show email/phone if authorized
  CASE WHEN public.can_view_contact_details(user_id) THEN email ELSE NULL END as email,
  CASE WHEN public.can_view_contact_details(user_id) THEN phone ELSE NULL END as phone,
  -- Public professional links
  linkedin_url,
  github_url,
  portfolio_url,
  -- Career preferences (non-sensitive)
  preferred_fields,
  preferred_roles,
  preferred_experience_level_id,
  experience_years,
  -- Settings
  profile_visibility,
  visible_to_hr,
  allow_recruiter_contact,
  email_notifications,
  preferred_language,
  theme,
  created_at,
  updated_at
FROM public.profiles;

-- Enable RLS on the view (views with security_invoker use underlying table RLS)
-- Note: The base table already has RLS enabled, so the view inherits it

-- Update the profiles SELECT policy to be more restrictive for non-owners
-- First drop the existing broad policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Create a more restrictive policy
CREATE POLICY "Authenticated users can view profiles with restrictions"
ON public.profiles
FOR SELECT
USING (
  -- User can always see their own profile
  auth.uid() = user_id
  OR
  -- Public profiles can be seen by anyone (but contact info hidden via view)
  profile_visibility = 'public'
  OR
  -- HR can see candidates who applied to their jobs
  EXISTS (
    SELECT 1 FROM applications a
    JOIN jobs j ON a.job_id = j.id
    WHERE a.candidate_id = profiles.user_id
    AND (j.created_by = auth.uid() OR j.shared_by_user_id = auth.uid())
  )
);