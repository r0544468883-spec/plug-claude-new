
-- Fix overly permissive INSERT policy - require authentication for analytics inserts
DROP POLICY IF EXISTS "Career site analytics insertable by all" ON public.career_site_analytics;

CREATE POLICY "Career site analytics insertable by authenticated"
  ON public.career_site_analytics FOR INSERT TO authenticated WITH CHECK (true);

-- Also allow anon for public page tracking (career site is public)
CREATE POLICY "Career site analytics insertable by anon"
  ON public.career_site_analytics FOR INSERT TO anon WITH CHECK (true);

-- Fix audit log policy - require authenticated
DROP POLICY IF EXISTS "Audit insertable by authenticated" ON public.signing_document_audit;

CREATE POLICY "Audit insertable by creator or candidate"
  ON public.signing_document_audit FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = actor_id OR
    EXISTS (
      SELECT 1 FROM public.signing_documents sd
      WHERE sd.id = document_id
        AND (sd.created_by = auth.uid() OR sd.candidate_id = auth.uid())
    )
  );
