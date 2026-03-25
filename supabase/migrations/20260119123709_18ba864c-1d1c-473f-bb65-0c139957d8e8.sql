-- Fix infinite recursion in RLS policies
-- The issue: policies on applications query profiles, and policies on profiles query applications

-- Step 1: Drop the problematic policies on applications
DROP POLICY IF EXISTS "HR can view applications for their jobs" ON public.applications;
DROP POLICY IF EXISTS "HR can update applications for their jobs" ON public.applications;

-- Step 2: Drop the problematic policy on profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "HR users can view candidate profiles" ON public.profiles;

-- Step 3: Recreate profiles policies WITHOUT referencing applications
-- Users can always view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- HR can view profiles of candidates who set visible_to_hr = true
CREATE POLICY "HR can view visible candidates"
ON public.profiles
FOR SELECT
USING (
  visible_to_hr = true
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('freelance_hr', 'inhouse_hr')
  )
);

-- Step 4: Recreate applications policies WITHOUT circular references
-- Candidates can view their own applications
CREATE POLICY "Candidates can view their own applications"
ON public.applications
FOR SELECT
USING (candidate_id = auth.uid());

-- HR can view applications for jobs they created (with company context)
CREATE POLICY "HR can view applications for their jobs"
ON public.applications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = applications.job_id
    AND j.created_by = auth.uid()
    AND (
      -- If HR has an active company set, only show that company's jobs
      (SELECT active_company_id FROM public.profiles WHERE user_id = auth.uid()) IS NULL
      OR j.company_id = (SELECT active_company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  )
);

-- HR can update applications for their jobs
CREATE POLICY "HR can update applications for their jobs"
ON public.applications
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = applications.job_id
    AND j.created_by = auth.uid()
    AND (
      (SELECT active_company_id FROM public.profiles WHERE user_id = auth.uid()) IS NULL
      OR j.company_id = (SELECT active_company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  )
);

-- Step 5: Recreate other candidate policies
DROP POLICY IF EXISTS "Candidates can insert their own applications" ON public.applications;
CREATE POLICY "Candidates can insert their own applications"
ON public.applications
FOR INSERT
WITH CHECK (candidate_id = auth.uid());

DROP POLICY IF EXISTS "Candidates can update their own applications" ON public.applications;
CREATE POLICY "Candidates can update their own applications"
ON public.applications
FOR UPDATE
USING (candidate_id = auth.uid());

DROP POLICY IF EXISTS "Candidates can delete their own applications" ON public.applications;
CREATE POLICY "Candidates can delete their own applications"
ON public.applications
FOR DELETE
USING (candidate_id = auth.uid());