-- Add RLS policy for HR to insert applications when importing candidates
CREATE POLICY "HR can create sourced applications" 
ON public.applications 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM jobs 
    WHERE jobs.id = applications.job_id 
    AND jobs.created_by = auth.uid()
  )
  AND (has_role(auth.uid(), 'freelance_hr') OR has_role(auth.uid(), 'inhouse_hr'))
);

-- Update notifications policy to allow system/HR to send notifications
DROP POLICY IF EXISTS "Users can receive notifications" ON public.notifications;
CREATE POLICY "Users can receive notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

-- Add policy for HR to add timeline events for their job applications
CREATE POLICY "HR can add timeline events for their job applications" 
ON public.application_timeline 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM applications a
    JOIN jobs j ON j.id = a.job_id
    WHERE a.id = application_timeline.application_id 
    AND j.created_by = auth.uid()
  )
);