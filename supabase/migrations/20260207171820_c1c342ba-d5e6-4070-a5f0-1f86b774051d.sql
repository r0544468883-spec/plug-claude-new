-- Fix: Require authentication to view companies (was publicly accessible)
-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Public can view companies" ON public.companies;

-- Keep the existing "Authenticated users can view companies" policy which already exists
-- This ensures only logged-in users can view company data