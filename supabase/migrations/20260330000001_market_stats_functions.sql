-- ══════════════════════════════════════════════════════════════
-- Market Statistics RPC Functions
-- Run this in Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════

-- ── Stage order helper ──────────────────────────────────────
-- Maps current_stage to a numeric order for funnel calculations.
-- Higher = further in the process. Terminal stages get negative.
CREATE OR REPLACE FUNCTION stage_order(p_stage TEXT)
RETURNS INT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_stage
    WHEN 'applied'            THEN 0
    WHEN 'screening'          THEN 1
    WHEN 'phone_screen'       THEN 2
    WHEN 'hr_interview'       THEN 3
    WHEN 'technical'          THEN 4
    WHEN 'interview'          THEN 5
    WHEN 'manager_interview'  THEN 6
    WHEN 'team_interview'     THEN 7
    WHEN 'ceo_interview'      THEN 8
    WHEN 'home_assignment'    THEN 9
    WHEN 'second_assignment'  THEN 10
    WHEN 'offer'              THEN 11
    WHEN 'hired'              THEN 12
    WHEN 'rejected'           THEN -1
    WHEN 'withdrawn'          THEN -2
    ELSE 0
  END;
$$;


-- ══════════════════════════════════════════════════════════════
-- 1. get_market_benchmarks
--    Aggregate stats across ALL active users.
--    Returns: total_active_users, avg rates, top cities, top job types.
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_market_benchmarks()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result JSON;
BEGIN
  WITH user_stats AS (
    SELECT
      a.candidate_id,
      COUNT(*) AS total_apps,
      COUNT(*) FILTER (WHERE stage_order(a.current_stage) >= 1) AS responded,
      COUNT(*) FILTER (WHERE stage_order(a.current_stage) >= 3) AS interviewed,
      AVG(a.match_score) FILTER (WHERE a.match_score IS NOT NULL) AS avg_match
    FROM applications a
    WHERE a.status != 'withdrawn'
    GROUP BY a.candidate_id
    HAVING COUNT(*) >= 1
  ),
  agg AS (
    SELECT
      COUNT(DISTINCT candidate_id)::INT AS total_active_users,
      ROUND(AVG(CASE WHEN total_apps > 0 THEN (responded::NUMERIC / total_apps) * 100 ELSE 0 END))::INT AS avg_response_rate,
      ROUND(AVG(CASE WHEN total_apps > 0 THEN (interviewed::NUMERIC / total_apps) * 100 ELSE 0 END))::INT AS avg_interview_rate,
      COALESCE(ROUND(AVG(avg_match))::INT, 0) AS avg_match_score
    FROM user_stats
  ),
  top_cities AS (
    SELECT COALESCE(
      json_agg(json_build_object('city', city, 'count', cnt) ORDER BY cnt DESC),
      '[]'::JSON
    ) AS data
    FROM (
      SELECT j.location AS city, COUNT(*) AS cnt
      FROM applications a
      JOIN jobs j ON j.id = a.job_id
      WHERE j.location IS NOT NULL AND j.location != ''
      GROUP BY j.location
      ORDER BY cnt DESC
      LIMIT 8
    ) sub
  ),
  top_job_types AS (
    SELECT COALESCE(
      json_agg(json_build_object('job_type', job_type, 'count', cnt) ORDER BY cnt DESC),
      '[]'::JSON
    ) AS data
    FROM (
      SELECT j.job_type, COUNT(*) AS cnt
      FROM applications a
      JOIN jobs j ON j.id = a.job_id
      WHERE j.job_type IS NOT NULL AND j.job_type != ''
      GROUP BY j.job_type
      ORDER BY cnt DESC
      LIMIT 6
    ) sub
  )
  SELECT json_build_object(
    'total_active_users', a.total_active_users,
    'avg_response_rate',  a.avg_response_rate,
    'avg_interview_rate', a.avg_interview_rate,
    'avg_match_score',    a.avg_match_score,
    'top_cities',         tc.data,
    'top_job_types',      tjt.data
  ) INTO result
  FROM agg a, top_cities tc, top_job_types tjt;

  RETURN result;
END;
$$;


-- ══════════════════════════════════════════════════════════════
-- 2. get_user_percentile_stats
--    Compare a specific user against all other users.
--    Returns: user rates, market averages, percentile rank (0-100).
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_user_percentile_stats(p_user_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result JSON;
  v_total        INT;
  v_responded    INT;
  v_interviewed  INT;
  v_avg_match    NUMERIC;
  v_response_r   NUMERIC;
  v_interview_r  NUMERIC;
  v_mkt_response NUMERIC;
  v_mkt_interview NUMERIC;
  v_mkt_match    NUMERIC;
  v_resp_pct     INT;
  v_intv_pct     INT;
  v_match_pct    INT;
BEGIN
  -- User's own stats
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE stage_order(current_stage) >= 1),
    COUNT(*) FILTER (WHERE stage_order(current_stage) >= 3),
    COALESCE(AVG(match_score) FILTER (WHERE match_score IS NOT NULL), 0)
  INTO v_total, v_responded, v_interviewed, v_avg_match
  FROM applications
  WHERE candidate_id = p_user_id AND status != 'withdrawn';

  -- Insufficient data check
  IF v_total < 3 THEN
    RETURN json_build_object(
      'insufficient_data', true,
      'app_count', v_total
    );
  END IF;

  v_response_r  := ROUND((v_responded::NUMERIC / GREATEST(v_total, 1)) * 100);
  v_interview_r := ROUND((v_interviewed::NUMERIC / GREATEST(v_total, 1)) * 100);

  -- Market averages (exclude this user)
  SELECT
    COALESCE(ROUND(AVG(CASE WHEN total > 0 THEN (responded::NUMERIC / total) * 100 END)), 0),
    COALESCE(ROUND(AVG(CASE WHEN total > 0 THEN (interviewed::NUMERIC / total) * 100 END)), 0),
    COALESCE(ROUND(AVG(avg_m)), 0)
  INTO v_mkt_response, v_mkt_interview, v_mkt_match
  FROM (
    SELECT
      candidate_id,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE stage_order(current_stage) >= 1) AS responded,
      COUNT(*) FILTER (WHERE stage_order(current_stage) >= 3) AS interviewed,
      AVG(match_score) FILTER (WHERE match_score IS NOT NULL) AS avg_m
    FROM applications
    WHERE candidate_id != p_user_id AND status != 'withdrawn'
    GROUP BY candidate_id
    HAVING COUNT(*) >= 3
  ) others;

  -- Percentile: what % of users does this user beat?
  SELECT
    COALESCE(ROUND(
      (COUNT(*) FILTER (WHERE resp_rate <= v_response_r)::NUMERIC / GREATEST(COUNT(*), 1)) * 100
    ), 50)::INT,
    COALESCE(ROUND(
      (COUNT(*) FILTER (WHERE intv_rate <= v_interview_r)::NUMERIC / GREATEST(COUNT(*), 1)) * 100
    ), 50)::INT,
    COALESCE(ROUND(
      (COUNT(*) FILTER (WHERE avg_m <= v_avg_match)::NUMERIC / GREATEST(COUNT(*), 1)) * 100
    ), 50)::INT
  INTO v_resp_pct, v_intv_pct, v_match_pct
  FROM (
    SELECT
      candidate_id,
      CASE WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE stage_order(current_stage) >= 1)::NUMERIC / COUNT(*)) * 100 ELSE 0 END AS resp_rate,
      CASE WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE stage_order(current_stage) >= 3)::NUMERIC / COUNT(*)) * 100 ELSE 0 END AS intv_rate,
      COALESCE(AVG(match_score) FILTER (WHERE match_score IS NOT NULL), 0) AS avg_m
    FROM applications
    WHERE status != 'withdrawn'
    GROUP BY candidate_id
    HAVING COUNT(*) >= 3
  ) all_users;

  result := json_build_object(
    'app_count',              v_total,
    'user_response_rate',     v_response_r::INT,
    'user_interview_rate',    v_interview_r::INT,
    'user_avg_match',         ROUND(v_avg_match)::INT,
    'market_avg_response',    v_mkt_response::INT,
    'market_avg_interview',   v_mkt_interview::INT,
    'market_avg_match',       v_mkt_match::INT,
    'response_percentile',    v_resp_pct,
    'interview_percentile',   v_intv_pct,
    'match_percentile',       v_match_pct
  );

  RETURN result;
END;
$$;


-- ══════════════════════════════════════════════════════════════
-- Permissions: allow authenticated users to call these functions
-- ══════════════════════════════════════════════════════════════
GRANT EXECUTE ON FUNCTION get_market_benchmarks() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_percentile_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION stage_order(TEXT) TO authenticated;
