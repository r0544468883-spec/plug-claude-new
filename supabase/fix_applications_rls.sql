-- Fix: applications INSERT policy was too restrictive
-- Original required has_role('job_seeker'), but extension users may not have this role
-- New policy: any authenticated user can insert/update their own applications

DROP POLICY IF EXISTS "Job seekers can create applications" ON public.applications;

CREATE POLICY "Candidates can create applications"
  ON public.applications FOR INSERT
  TO authenticated
  WITH CHECK (candidate_id = auth.uid());

-- Also allow candidates to update their own applications (needed for upsert on conflict)
DROP POLICY IF EXISTS "Candidates can update own applications" ON public.applications;

CREATE POLICY "Candidates can update own applications"
  ON public.applications FOR UPDATE
  TO authenticated
  USING (candidate_id = auth.uid())
  WITH CHECK (candidate_id = auth.uid());
