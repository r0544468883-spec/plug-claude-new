-- Add community job sharing columns to jobs table
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS shared_by_user_id UUID,
ADD COLUMN IF NOT EXISTS is_community_shared BOOLEAN DEFAULT false;

-- Create RLS policy for job seekers to share community jobs
CREATE POLICY "Job seekers can share community jobs" ON public.jobs
FOR INSERT 
WITH CHECK (
  auth.uid() = shared_by_user_id 
  AND is_community_shared = true 
  AND has_role(auth.uid(), 'job_seeker'::app_role)
);

-- Allow users to update their own shared jobs
CREATE POLICY "Users can update own community shared jobs" ON public.jobs
FOR UPDATE 
USING (auth.uid() = shared_by_user_id AND is_community_shared = true);

-- Allow users to delete their own shared jobs
CREATE POLICY "Users can delete own community shared jobs" ON public.jobs
FOR DELETE 
USING (auth.uid() = shared_by_user_id AND is_community_shared = true);