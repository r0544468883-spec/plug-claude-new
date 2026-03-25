-- Fix overly permissive UPDATE policy — drop the broad one and rely on service role bypass
DROP POLICY IF EXISTS "Service role can update is_approved" ON public.company_reviews;
-- Service role bypasses RLS by default, so no extra policy needed for admin approval
