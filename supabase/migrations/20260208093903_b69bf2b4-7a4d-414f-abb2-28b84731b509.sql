-- Fix the company_ratings view to use security_invoker
DROP VIEW IF EXISTS public.company_ratings;

CREATE VIEW public.company_ratings 
WITH (security_invoker = true)
AS
SELECT 
  company_id,
  COUNT(*) as total_reviews,
  ROUND(AVG(communication_rating)::numeric, 1) as avg_communication,
  ROUND(AVG(process_speed_rating)::numeric, 1) as avg_process_speed,
  ROUND(AVG(transparency_rating)::numeric, 1) as avg_transparency,
  ROUND(AVG(overall_rating)::numeric, 1) as avg_overall,
  COUNT(*) FILTER (WHERE would_recommend = true) as recommend_count,
  COUNT(*) FILTER (WHERE process_outcome = 'ghosted') as ghosted_count,
  COUNT(*) FILTER (WHERE process_outcome = 'hired') as hired_count
FROM public.company_vouches
GROUP BY company_id
HAVING COUNT(*) >= 3;

-- Allow authenticated users to see company ratings (anonymous aggregate data)
CREATE POLICY "Authenticated users can view company ratings"
ON public.company_vouches FOR SELECT
TO authenticated
USING (true);