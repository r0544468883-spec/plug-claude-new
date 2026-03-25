
-- Drop existing overly-permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can read approved reviews" ON public.company_reviews;

-- Create a security definer function to check review access
-- This avoids RLS recursion and keeps logic clean
CREATE OR REPLACE FUNCTION public.can_view_company_review(review_company_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- 1. Always allow the reviewer themselves (handled separately in policy)
  -- 2. HR users who own jobs linked to this company
  SELECT EXISTS (
    SELECT 1
    FROM public.jobs j
    JOIN public.companies c ON c.id = j.company_id
    WHERE LOWER(c.name) = LOWER(review_company_name)
      AND j.created_by = auth.uid()
  )
  OR
  -- 3. Hunters (freelance_hr) who have submitted applications (candidates) 
  --    on jobs linked to this company
  EXISTS (
    SELECT 1
    FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    JOIN public.companies c ON c.id = j.company_id
    JOIN public.user_roles ur ON ur.user_id = auth.uid()
    WHERE LOWER(c.name) = LOWER(review_company_name)
      AND a.candidate_id = auth.uid()
      AND ur.role IN ('freelance_hr', 'inhouse_hr')
  );
$$;

-- New restricted SELECT policy: reviewer + HR who owns the company jobs + hunters linked to the job
CREATE POLICY "Restricted review access"
ON public.company_reviews
FOR SELECT
TO authenticated
USING (
  -- The reviewer can always see their own review (approved or not)
  reviewer_id = auth.uid()
  OR
  -- HR/Hunter access via the security definer function
  public.can_view_company_review(company_name)
);
