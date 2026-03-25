-- ============================================================
-- Market Benchmarks & User Percentile RPCs
-- All functions return ONLY aggregated/anonymous data
-- ============================================================

-- -------------------------------------------------------
-- get_market_benchmarks()
-- Global market stats: avg response rate, interview rate,
-- top cities, top job types. No personal data exposed.
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_market_benchmarks()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg_response_rate   integer;
  v_avg_interview_rate  integer;
  v_total_active_users  integer;
  v_avg_match_score     integer;
  v_top_cities          json;
  v_top_job_types       json;
BEGIN
  -- Users with at least 5 applications (meaningful sample)
  WITH user_stats AS (
    SELECT
      candidate_id,
      COUNT(*)                                                          AS app_count,
      COUNT(*) FILTER (WHERE current_stage <> 'applied')               AS responded,
      COUNT(*) FILTER (WHERE current_stage = 'interview')              AS interviewed,
      AVG(match_score) FILTER (WHERE match_score IS NOT NULL)          AS avg_match
    FROM applications
    GROUP BY candidate_id
    HAVING COUNT(*) >= 5
  )
  SELECT
    COUNT(*)::integer,
    ROUND(AVG(responded::numeric / NULLIF(app_count, 0) * 100))::integer,
    ROUND(AVG(interviewed::numeric / NULLIF(app_count, 0) * 100))::integer,
    ROUND(AVG(avg_match))::integer
  INTO v_total_active_users, v_avg_response_rate, v_avg_interview_rate, v_avg_match_score
  FROM user_stats;

  -- Top 5 cities by application count
  SELECT json_agg(row_to_json(t)) INTO v_top_cities FROM (
    SELECT
      COALESCE(j.location, 'Unknown') AS city,
      COUNT(*)                        AS count
    FROM applications a
    LEFT JOIN jobs j ON j.id = a.job_id
    WHERE j.location IS NOT NULL AND j.location <> ''
    GROUP BY j.location
    ORDER BY count DESC
    LIMIT 5
  ) t;

  -- Top 5 job types
  SELECT json_agg(row_to_json(t)) INTO v_top_job_types FROM (
    SELECT
      COALESCE(j.job_type, 'Unknown') AS job_type,
      COUNT(*)                        AS count
    FROM applications a
    LEFT JOIN jobs j ON j.id = a.job_id
    WHERE j.job_type IS NOT NULL AND j.job_type <> ''
    GROUP BY j.job_type
    ORDER BY count DESC
    LIMIT 5
  ) t;

  RETURN json_build_object(
    'total_active_users',  COALESCE(v_total_active_users, 0),
    'avg_response_rate',   COALESCE(v_avg_response_rate, 0),
    'avg_interview_rate',  COALESCE(v_avg_interview_rate, 0),
    'avg_match_score',     COALESCE(v_avg_match_score, 0),
    'top_cities',          COALESCE(v_top_cities, '[]'::json),
    'top_job_types',       COALESCE(v_top_job_types, '[]'::json)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_market_benchmarks() TO authenticated;


-- -------------------------------------------------------
-- get_user_percentile_stats(p_user_id UUID)
-- Returns this user's metrics + their percentile vs all users.
-- Requires minimum 3 applications for meaningful comparison.
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_percentile_stats(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app_count           integer;
  v_responded           integer;
  v_interviewed         integer;
  v_user_response_rate  numeric;
  v_user_interview_rate numeric;
  v_user_avg_match      numeric;
  v_response_percentile integer;
  v_interview_percentile integer;
  v_match_percentile    integer;
  v_market_avg_response numeric;
  v_market_avg_interview numeric;
  v_market_avg_match    numeric;
BEGIN
  -- User's own stats
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE current_stage <> 'applied'),
    COUNT(*) FILTER (WHERE current_stage = 'interview'),
    AVG(match_score) FILTER (WHERE match_score IS NOT NULL)
  INTO v_app_count, v_responded, v_interviewed, v_user_avg_match
  FROM applications
  WHERE candidate_id = p_user_id;

  -- Not enough data
  IF COALESCE(v_app_count, 0) < 3 THEN
    RETURN json_build_object('insufficient_data', true, 'app_count', COALESCE(v_app_count, 0));
  END IF;

  v_user_response_rate  := COALESCE(v_responded::numeric  / NULLIF(v_app_count, 0) * 100, 0);
  v_user_interview_rate := COALESCE(v_interviewed::numeric / NULLIF(v_app_count, 0) * 100, 0);

  -- All users' rates (sample: users with >= 3 applications)
  WITH all_user_stats AS (
    SELECT
      candidate_id,
      COUNT(*) FILTER (WHERE current_stage <> 'applied')::numeric
        / NULLIF(COUNT(*), 0) * 100                                 AS resp_rate,
      COUNT(*) FILTER (WHERE current_stage = 'interview')::numeric
        / NULLIF(COUNT(*), 0) * 100                                 AS int_rate,
      AVG(match_score) FILTER (WHERE match_score IS NOT NULL)       AS match_avg
    FROM applications
    GROUP BY candidate_id
    HAVING COUNT(*) >= 3
  )
  SELECT
    AVG(resp_rate),
    AVG(int_rate),
    AVG(match_avg),
    -- Percentile: % of users with LOWER rate than this user
    ROUND(
      (SELECT COUNT(*) FROM all_user_stats WHERE resp_rate < v_user_response_rate)::numeric
      / NULLIF((SELECT COUNT(*) FROM all_user_stats), 0) * 100
    )::integer,
    ROUND(
      (SELECT COUNT(*) FROM all_user_stats WHERE int_rate < v_user_interview_rate)::numeric
      / NULLIF((SELECT COUNT(*) FROM all_user_stats), 0) * 100
    )::integer,
    ROUND(
      (SELECT COUNT(*) FROM all_user_stats WHERE match_avg < v_user_avg_match)::numeric
      / NULLIF((SELECT COUNT(*) FROM all_user_stats WHERE match_avg IS NOT NULL), 0) * 100
    )::integer
  INTO
    v_market_avg_response, v_market_avg_interview, v_market_avg_match,
    v_response_percentile, v_interview_percentile, v_match_percentile
  FROM all_user_stats;

  RETURN json_build_object(
    'insufficient_data',      false,
    'app_count',              v_app_count,
    'user_response_rate',     ROUND(v_user_response_rate)::integer,
    'user_interview_rate',    ROUND(v_user_interview_rate)::integer,
    'user_avg_match',         ROUND(COALESCE(v_user_avg_match, 0))::integer,
    'market_avg_response',    ROUND(COALESCE(v_market_avg_response, 0))::integer,
    'market_avg_interview',   ROUND(COALESCE(v_market_avg_interview, 0))::integer,
    'market_avg_match',       ROUND(COALESCE(v_market_avg_match, 0))::integer,
    'response_percentile',    COALESCE(v_response_percentile, 50),
    'interview_percentile',   COALESCE(v_interview_percentile, 50),
    'match_percentile',       COALESCE(v_match_percentile, 50)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_percentile_stats(UUID) TO authenticated;
