-- ============================================================
-- RPC: get_job_market_stats(p_job_id)
-- Returns anonymized/aggregated market data for a single job
-- SECURITY DEFINER so any authenticated user can read aggregated stats
-- without exposing individual application rows
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_job_market_stats(p_job_id UUID)
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'total_applicants', COUNT(*)::integer,
    'avg_match_score',  COALESCE(ROUND(AVG(match_score))::integer, 0),
    'stages', (
      SELECT COALESCE(
        json_object_agg(current_stage, cnt),
        '{}'::json
      )
      FROM (
        SELECT current_stage, COUNT(*) AS cnt
        FROM applications
        WHERE job_id = p_job_id::text
        GROUP BY current_stage
      ) stage_counts
    )
  )
  FROM applications
  WHERE job_id = p_job_id::text;
$$;

GRANT EXECUTE ON FUNCTION public.get_job_market_stats(UUID) TO authenticated;
