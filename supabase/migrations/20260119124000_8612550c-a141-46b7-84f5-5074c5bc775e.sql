-- Fix RLS infinite recursion by removing policies that query profiles inside other table policies.
-- Use security definer function get_active_company_id() instead.

-- applications
DROP POLICY IF EXISTS "HR can view applications for their jobs" ON public.applications;
DROP POLICY IF EXISTS "HR can update applications for their jobs" ON public.applications;
DROP POLICY IF EXISTS "HR can create sourced applications" ON public.applications;

CREATE POLICY "HR can view applications for their jobs"
ON public.applications
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.jobs j
    WHERE j.id = applications.job_id
      AND j.created_by = auth.uid()
      AND (public.get_active_company_id() IS NULL OR j.company_id = public.get_active_company_id())
  )
);

CREATE POLICY "HR can update applications for their jobs"
ON public.applications
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.jobs j
    WHERE j.id = applications.job_id
      AND j.created_by = auth.uid()
      AND (public.get_active_company_id() IS NULL OR j.company_id = public.get_active_company_id())
  )
);

CREATE POLICY "HR can create sourced applications"
ON public.applications
FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'freelance_hr'::app_role) OR has_role(auth.uid(), 'inhouse_hr'::app_role))
  AND EXISTS (
    SELECT 1
    FROM public.jobs j
    WHERE j.id = applications.job_id
      AND j.created_by = auth.uid()
      AND (public.get_active_company_id() IS NULL OR j.company_id = public.get_active_company_id())
  )
);

-- application_timeline (HR SELECT policy used profiles join)
DROP POLICY IF EXISTS "HR can view application timeline for their jobs" ON public.application_timeline;
CREATE POLICY "HR can view application timeline for their jobs"
ON public.application_timeline
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    WHERE a.id = application_timeline.application_id
      AND j.created_by = auth.uid()
      AND (public.get_active_company_id() IS NULL OR j.company_id = public.get_active_company_id())
  )
);

-- documents (HR SELECT policy used profiles join)
DROP POLICY IF EXISTS "HR can view candidate documents for their jobs" ON public.documents;
CREATE POLICY "HR can view candidate documents for their jobs"
ON public.documents
FOR SELECT
USING (
  related_application_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    WHERE a.id = documents.related_application_id
      AND j.created_by = auth.uid()
      AND (public.get_active_company_id() IS NULL OR j.company_id = public.get_active_company_id())
  )
);

-- home_assignments (HR SELECT policy used profiles join)
DROP POLICY IF EXISTS "HR can view home assignments for their jobs" ON public.home_assignments;
CREATE POLICY "HR can view home assignments for their jobs"
ON public.home_assignments
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    WHERE a.id = home_assignments.application_id
      AND j.created_by = auth.uid()
      AND (public.get_active_company_id() IS NULL OR j.company_id = public.get_active_company_id())
  )
);

-- interview_reminders (HR SELECT policy used profiles join)
DROP POLICY IF EXISTS "HR can view interview reminders for their jobs" ON public.interview_reminders;
CREATE POLICY "HR can view interview reminders for their jobs"
ON public.interview_reminders
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    WHERE a.id = interview_reminders.application_id
      AND j.created_by = auth.uid()
      AND (public.get_active_company_id() IS NULL OR j.company_id = public.get_active_company_id())
  )
);
