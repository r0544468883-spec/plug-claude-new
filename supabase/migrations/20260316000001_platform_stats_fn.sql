-- Platform Stats RPC — returns aggregated community stats
-- Uses SECURITY DEFINER to bypass RLS so it can read all users' analyses
-- without exposing individual records.

CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg_score   int;
  v_top_skills  json;
BEGIN
  -- 1. Average match score across all recent analyses (last 500)
  SELECT ROUND(AVG(score))
  INTO v_avg_score
  FROM (
    SELECT score
    FROM job_analyses
    WHERE score IS NOT NULL
    ORDER BY analyzed_at DESC
    LIMIT 500
  ) sub;

  -- 2. Top missing skills from recent analyses
  SELECT json_agg(row_to_json(t))
  INTO v_top_skills
  FROM (
    SELECT skill, COUNT(*)::int AS count
    FROM job_analyses,
         LATERAL jsonb_array_elements_text(
           CASE
             WHEN jsonb_typeof(missing_skills::jsonb) = 'array' THEN missing_skills::jsonb
             ELSE '[]'::jsonb
           END
         ) AS skill
    WHERE missing_skills IS NOT NULL
      AND missing_skills != 'null'
    GROUP BY skill
    ORDER BY count DESC
    LIMIT 7
  ) t;

  RETURN json_build_object(
    'avgMatchScore', v_avg_score,
    'topSkills',     COALESCE(v_top_skills, '[]'::json)
  );
END;
$$;

-- Allow any authenticated user to call this function
GRANT EXECUTE ON FUNCTION get_platform_stats() TO authenticated;
