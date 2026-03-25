-- Drop the existing constraint
ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_current_stage_check;

-- Add the new constraint with 'withdrawn' included
ALTER TABLE public.applications ADD CONSTRAINT applications_current_stage_check 
CHECK (current_stage = ANY (ARRAY['applied', 'screening', 'interview', 'technical', 'task', 'offer', 'hired', 'rejected', 'withdrawn']));