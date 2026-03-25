-- Fix: Recruiter notes RLS - require legitimate relationship with candidate
-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "Recruiters can create notes" ON public.recruiter_candidate_notes;

-- Create a new policy that requires the recruiter to have a legitimate relationship
-- with the candidate (candidate applied to recruiter's jobs OR is visible_to_hr)
CREATE POLICY "Recruiters can create notes for related candidates"
ON public.recruiter_candidate_notes
FOR INSERT
WITH CHECK (
  auth.uid() = recruiter_id 
  AND (
    public.has_role(auth.uid(), 'freelance_hr') 
    OR public.has_role(auth.uid(), 'inhouse_hr')
  )
  AND (
    -- Candidate must have applied to one of the recruiter's jobs
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.jobs j ON a.job_id = j.id
      WHERE a.candidate_id = recruiter_candidate_notes.candidate_id
      AND (j.created_by = auth.uid() OR j.shared_by_user_id = auth.uid())
    )
    -- OR candidate has visibility enabled for HR
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = recruiter_candidate_notes.candidate_id
      AND p.visible_to_hr = true
    )
  )
);