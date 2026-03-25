-- Add active_company_id to profiles for HR context switching
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS active_company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- Create a function to check if HR user is working in context of a specific company
CREATE OR REPLACE FUNCTION public.get_active_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT active_company_id 
  FROM public.profiles 
  WHERE user_id = auth.uid()
$$;

-- Drop existing HR policies on applications that need company context
DROP POLICY IF EXISTS "HR can view applications for their jobs" ON public.applications;
DROP POLICY IF EXISTS "HR can update applications for their jobs" ON public.applications;
DROP POLICY IF EXISTS "HR can create sourced applications" ON public.applications;

-- Recreate applications policies with company context for HR
CREATE POLICY "HR can view applications for their jobs"
ON public.applications FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM jobs j
    JOIN profiles p ON p.user_id = auth.uid()
    WHERE j.id = applications.job_id
    AND j.created_by = auth.uid()
    AND (
      -- If HR has no active company set, they can see all their jobs
      p.active_company_id IS NULL
      -- Or if active company matches the job's company
      OR j.company_id = p.active_company_id
    )
  )
);

CREATE POLICY "HR can update applications for their jobs"
ON public.applications FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM jobs j
    JOIN profiles p ON p.user_id = auth.uid()
    WHERE j.id = applications.job_id
    AND j.created_by = auth.uid()
    AND (
      p.active_company_id IS NULL
      OR j.company_id = p.active_company_id
    )
  )
);

CREATE POLICY "HR can create sourced applications"
ON public.applications FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM jobs j
    JOIN profiles p ON p.user_id = auth.uid()
    WHERE j.id = applications.job_id
    AND j.created_by = auth.uid()
    AND (
      p.active_company_id IS NULL
      OR j.company_id = p.active_company_id
    )
  )
  AND (has_role(auth.uid(), 'freelance_hr') OR has_role(auth.uid(), 'inhouse_hr'))
);

-- Update documents policy for HR with company context
DROP POLICY IF EXISTS "HR can view candidate documents for their jobs" ON public.documents;

CREATE POLICY "HR can view candidate documents for their jobs"
ON public.documents FOR SELECT
USING (
  related_application_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM applications a
    JOIN jobs j ON j.id = a.job_id
    JOIN profiles p ON p.user_id = auth.uid()
    WHERE a.id = documents.related_application_id
    AND j.created_by = auth.uid()
    AND (
      p.active_company_id IS NULL
      OR j.company_id = p.active_company_id
    )
  )
);

-- Update application_timeline policy for HR viewing with company context  
DROP POLICY IF EXISTS "HR can view application timeline for their jobs" ON public.application_timeline;

CREATE POLICY "HR can view application timeline for their jobs"
ON public.application_timeline FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM applications a
    JOIN jobs j ON j.id = a.job_id
    JOIN profiles p ON p.user_id = auth.uid()
    WHERE a.id = application_timeline.application_id
    AND j.created_by = auth.uid()
    AND (
      p.active_company_id IS NULL
      OR j.company_id = p.active_company_id
    )
  )
);

-- Update home_assignments policy for HR viewing with company context
DROP POLICY IF EXISTS "HR can view home assignments for their jobs" ON public.home_assignments;

CREATE POLICY "HR can view home assignments for their jobs"
ON public.home_assignments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM applications a
    JOIN jobs j ON j.id = a.job_id
    JOIN profiles p ON p.user_id = auth.uid()
    WHERE a.id = home_assignments.application_id
    AND j.created_by = auth.uid()
    AND (
      p.active_company_id IS NULL
      OR j.company_id = p.active_company_id
    )
  )
);

-- Update interview_reminders policy for HR viewing with company context
DROP POLICY IF EXISTS "HR can view interview reminders for their jobs" ON public.interview_reminders;

CREATE POLICY "HR can view interview reminders for their jobs"
ON public.interview_reminders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM applications a
    JOIN jobs j ON j.id = a.job_id
    JOIN profiles p ON p.user_id = auth.uid()
    WHERE a.id = interview_reminders.application_id
    AND j.created_by = auth.uid()
    AND (
      p.active_company_id IS NULL
      OR j.company_id = p.active_company_id
    )
  )
);

-- Update profiles_secure view to include active_company_id
DROP VIEW IF EXISTS public.profiles_secure;

CREATE VIEW public.profiles_secure
WITH (security_invoker=on) AS
SELECT
  id,
  user_id,
  full_name,
  avatar_url,
  bio,
  linkedin_url,
  github_url,
  portfolio_url,
  preferred_language,
  preferred_fields,
  preferred_roles,
  preferred_experience_level_id,
  experience_years,
  profile_visibility,
  visible_to_hr,
  allow_recruiter_contact,
  email_notifications,
  theme,
  created_at,
  updated_at,
  active_company_id,
  CASE 
    WHEN can_view_contact_details(user_id) THEN email
    ELSE NULL
  END as email,
  CASE 
    WHEN can_view_contact_details(user_id) THEN phone
    ELSE NULL
  END as phone
FROM public.profiles;