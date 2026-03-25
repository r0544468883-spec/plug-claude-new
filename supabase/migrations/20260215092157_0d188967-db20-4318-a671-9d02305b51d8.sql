
-- Phase 1: Candidate Analytics columns
ALTER TABLE public.applications 
  ADD COLUMN IF NOT EXISTS last_stage_change_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS stagnation_snoozed_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_candidate_summary JSONB,
  ADD COLUMN IF NOT EXISTS retention_risk_score NUMERIC;

-- Trigger to auto-update last_stage_change_at on stage change
CREATE OR REPLACE FUNCTION public.update_last_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.current_stage IS DISTINCT FROM NEW.current_stage THEN
    NEW.last_stage_change_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_update_last_stage_change
BEFORE UPDATE ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.update_last_stage_change();

-- Phase 2: Content Dashboard columns
ALTER TABLE public.feed_posts
  ADD COLUMN IF NOT EXISTS views_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unique_viewers INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shares_count INT DEFAULT 0;

-- Phase 3: Company SLA columns (avg_response_time_hours already may exist from prior migration)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='companies' AND column_name='response_rate') THEN
    ALTER TABLE public.companies ADD COLUMN response_rate NUMERIC;
  END IF;
END$$;
