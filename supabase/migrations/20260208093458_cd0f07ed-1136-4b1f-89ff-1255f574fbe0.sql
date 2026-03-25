-- Update can_view_contact_details to allow authenticated users to see emails for search purposes
CREATE OR REPLACE FUNCTION public.can_view_contact_details(profile_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- User can always see their own contact details
  IF auth.uid() = profile_user_id THEN
    RETURN TRUE;
  END IF;
  
  -- All authenticated users can see email for search/vouch purposes
  IF auth.uid() IS NOT NULL THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;