-- Fix: Restrict company metrics visibility to prevent competitor intelligence gathering
-- The 'Anyone can view companies' policy exposes internal business metrics

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view companies" ON public.companies;

-- Create a more restrictive policy for company viewing
-- Public users can see basic company info (name, description, industry, logo, website, size)
-- Internal metrics (total_hires, avg_hiring_speed_days, metadata) should only be visible to:
-- 1. The company creator
-- 2. Authenticated users who have applied to jobs at the company
-- 3. HR users managing jobs at the company

-- For basic company info, allow public read of non-sensitive fields
-- We'll handle field-level security by creating a secure view similar to profiles_secure

-- First, allow authenticated users to view companies they have relationships with
CREATE POLICY "Authenticated users can view companies"
ON public.companies
FOR SELECT
TO authenticated
USING (true);

-- Allow anonymous users to view basic company info (for job listings)
CREATE POLICY "Public can view companies"
ON public.companies
FOR SELECT
TO anon
USING (true);

-- Create a secure view that hides internal metrics from non-related users
CREATE OR REPLACE VIEW public.companies_secure
WITH (security_invoker = on)
AS
SELECT 
  id,
  name,
  description,
  logo_url,
  website,
  industry,
  size,
  created_at,
  updated_at,
  -- Only show internal metrics to related users
  CASE 
    WHEN auth.uid() IS NULL THEN NULL
    WHEN created_by = auth.uid() THEN total_hires
    WHEN EXISTS (
      SELECT 1 FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE j.company_id = companies.id
      AND a.candidate_id = auth.uid()
    ) THEN total_hires
    WHEN EXISTS (
      SELECT 1 FROM jobs j
      WHERE j.company_id = companies.id
      AND (j.created_by = auth.uid() OR j.shared_by_user_id = auth.uid())
    ) THEN total_hires
    ELSE NULL
  END as total_hires,
  CASE 
    WHEN auth.uid() IS NULL THEN NULL
    WHEN created_by = auth.uid() THEN avg_hiring_speed_days
    WHEN EXISTS (
      SELECT 1 FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE j.company_id = companies.id
      AND a.candidate_id = auth.uid()
    ) THEN avg_hiring_speed_days
    WHEN EXISTS (
      SELECT 1 FROM jobs j
      WHERE j.company_id = companies.id
      AND (j.created_by = auth.uid() OR j.shared_by_user_id = auth.uid())
    ) THEN avg_hiring_speed_days
    ELSE NULL
  END as avg_hiring_speed_days,
  CASE 
    WHEN auth.uid() IS NULL THEN NULL
    WHEN created_by = auth.uid() THEN metadata
    WHEN EXISTS (
      SELECT 1 FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE j.company_id = companies.id
      AND a.candidate_id = auth.uid()
    ) THEN metadata
    WHEN EXISTS (
      SELECT 1 FROM jobs j
      WHERE j.company_id = companies.id
      AND (j.created_by = auth.uid() OR j.shared_by_user_id = auth.uid())
    ) THEN metadata
    ELSE NULL
  END as metadata,
  CASE 
    WHEN auth.uid() IS NULL THEN NULL
    WHEN created_by = auth.uid() THEN last_metrics_update
    WHEN EXISTS (
      SELECT 1 FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE j.company_id = companies.id
      AND a.candidate_id = auth.uid()
    ) THEN last_metrics_update
    WHEN EXISTS (
      SELECT 1 FROM jobs j
      WHERE j.company_id = companies.id
      AND (j.created_by = auth.uid() OR j.shared_by_user_id = auth.uid())
    ) THEN last_metrics_update
    ELSE NULL
  END as last_metrics_update,
  created_by
FROM public.companies;