-- RPC to search PLUG users by name (bypasses profile_visibility RLS)
-- Only returns safe public fields: user_id, full_name, avatar_url, tagline, role
CREATE OR REPLACE FUNCTION public.search_plug_users(query text)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  personal_tagline TEXT,
  role TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT DISTINCT ON (p.user_id)
    p.user_id,
    p.full_name,
    p.avatar_url,
    p.personal_tagline,
    COALESCE(r.role::text, 'job_seeker') AS role
  FROM public.profiles p
  LEFT JOIN public.user_roles r ON r.user_id = p.user_id
  WHERE
    auth.uid() IS NOT NULL
    AND p.user_id <> auth.uid()
    AND (
      p.full_name ILIKE '%' || query || '%'
      OR p.email ILIKE '%' || query || '%'
    )
  ORDER BY p.user_id, p.full_name
  LIMIT 10;
$$;

GRANT EXECUTE ON FUNCTION public.search_plug_users(text) TO authenticated;
