import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Candidate {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  preferred_fields: string[] | null;
  preferred_roles: string[] | null;
  preferred_experience_level_id: string | null;
  experience_years: number | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  matchScore: number;
  vouchCount: number;
}

function calculateCandidateMatchScore(
  candidate: any,
  jobFieldId: string | null,
  jobRoleId: string | null,
  jobExpLevelId: string | null
): number {
  let score = 0;
  let factors = 0;

  // Field match (40 points)
  if (jobFieldId) {
    factors += 40;
    if (candidate.preferred_fields?.includes(jobFieldId)) {
      score += 40;
    }
  }

  // Role match (35 points)
  if (jobRoleId) {
    factors += 35;
    if (candidate.preferred_roles?.includes(jobRoleId)) {
      score += 35;
    }
  }

  // Experience level match (25 points)
  if (jobExpLevelId) {
    factors += 25;
    if (candidate.preferred_experience_level_id === jobExpLevelId) {
      score += 25;
    }
  }

  if (factors === 0) return 50; // Base score if no job taxonomy

  return Math.round((score / factors) * 100);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is HR
    const { data: { user }, error: authError } = await createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is HR
    const { data: userRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userRole || !['freelance_hr', 'inhouse_hr'].includes(userRole.role)) {
      return new Response(
        JSON.stringify({ error: 'Access denied. HR role required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { job_id } = body;

    if (!job_id) {
      return new Response(
        JSON.stringify({ error: 'job_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get job details
    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select('id, field_id, role_id, experience_level_id, created_by')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user owns the job
    if (job.created_by !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Access denied. You can only view candidates for your own jobs.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get job seekers who are visible to HR
    const { data: jobSeekers, error: seekersError } = await supabaseAdmin
      .from('profiles')
      .select(`
        user_id,
        full_name,
        email,
        avatar_url,
        bio,
        preferred_fields,
        preferred_roles,
        preferred_experience_level_id,
        experience_years,
        linkedin_url,
        github_url,
        portfolio_url,
        visible_to_hr
      `)
      .eq('visible_to_hr', true);

    if (seekersError) {
      console.error('Error fetching job seekers:', seekersError);
      throw new Error('Failed to fetch candidates');
    }

    // Filter to only job_seeker role
    const { data: jobSeekerRoles } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'job_seeker');

    const jobSeekerUserIds = new Set(jobSeekerRoles?.map(r => r.user_id) || []);

    const filteredSeekers = (jobSeekers || []).filter(
      seeker => jobSeekerUserIds.has(seeker.user_id)
    );

    // Calculate match scores
    const candidatesWithScores: Candidate[] = [];

    for (const seeker of filteredSeekers) {
      const matchScore = calculateCandidateMatchScore(
        seeker,
        job.field_id,
        job.role_id,
        job.experience_level_id
      );

      // Get vouch count
      const { count: vouchCount } = await supabaseAdmin
        .from('vouches')
        .select('id', { count: 'exact', head: true })
        .eq('to_user_id', seeker.user_id)
        .eq('is_public', true);

      candidatesWithScores.push({
        user_id: seeker.user_id,
        full_name: seeker.full_name,
        email: seeker.email,
        avatar_url: seeker.avatar_url,
        bio: seeker.bio,
        preferred_fields: seeker.preferred_fields,
        preferred_roles: seeker.preferred_roles,
        preferred_experience_level_id: seeker.preferred_experience_level_id,
        experience_years: seeker.experience_years,
        linkedin_url: seeker.linkedin_url,
        github_url: seeker.github_url,
        portfolio_url: seeker.portfolio_url,
        matchScore,
        vouchCount: vouchCount || 0,
      });
    }

    // Sort by match score descending
    candidatesWithScores.sort((a, b) => b.matchScore - a.matchScore);

    // Filter to top 85%+ matches only
    const topCandidates = candidatesWithScores.filter(c => c.matchScore >= 85);

    // If no 85%+ matches, show top 10 candidates anyway (but with lower scores)
    const result = topCandidates.length > 0 
      ? topCandidates 
      : candidatesWithScores.slice(0, 10);

    console.log(`Found ${result.length} matching candidates for job ${job_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        candidates: result,
        total_visible: filteredSeekers.length,
        threshold: 85,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in match-candidates:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to find matching candidates. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
