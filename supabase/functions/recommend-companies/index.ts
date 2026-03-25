import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Create client with user's auth header
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user
    const { data: { user: authUser }, error: authError } = await authClient.auth.getUser();
    
    if (authError || !authUser) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const userId = authUser.id;
    
    // Use service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { fieldSlug, limit = 10 } = await req.json();

    console.log('Recommending companies for user:', userId, 'field:', fieldSlug);

    // Get user's resume data for context
    const { data: resume } = await supabase
      .from('documents')
      .select('ai_summary')
      .eq('owner_id', userId)
      .eq('doc_type', 'cv')
      .maybeSingle();

    // Get user's preferences
    const { data: profile } = await supabase
      .from('profiles')
      .select('preferred_fields, preferred_roles, experience_years')
      .eq('user_id', userId)
      .single();

    // Build query for companies
    let companiesQuery = supabase
      .from('companies')
      .select(`
        id, name, description, industry, website, logo_url, size,
        avg_hiring_speed_days, total_hires
      `)
      .order('total_hires', { ascending: false, nullsFirst: false })
      .limit(limit);

    // If field filter provided, join with jobs to filter by field
    if (fieldSlug) {
      // Get field ID first
      const { data: fieldData } = await supabase
        .from('job_fields')
        .select('id')
        .eq('slug', fieldSlug)
        .maybeSingle();

      if (fieldData) {
        // Get companies that have jobs in this field
        const { data: jobsInField } = await supabase
          .from('jobs')
          .select('company_id')
          .eq('field_id', fieldData.id)
          .eq('status', 'active')
          .not('company_id', 'is', null);

        const companyIds = [...new Set(jobsInField?.map(j => j.company_id) || [])];
        
        if (companyIds.length > 0) {
          companiesQuery = companiesQuery.in('id', companyIds);
        }
      }
    }

    const { data: companies, error: companiesError } = await companiesQuery;

    if (companiesError) {
      throw new Error('Failed to fetch companies: ' + companiesError.message);
    }

    // Enrich with active job counts
    const enrichedCompanies = await Promise.all(
      (companies || []).map(async (company) => {
        const { count } = await supabase
          .from('jobs')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', company.id)
          .eq('status', 'active');

        return {
          ...company,
          activeJobsCount: count || 0,
          matchReason: getMatchReason(company, profile, resume?.ai_summary),
        };
      })
    );

    // Sort by relevance (active jobs + hiring speed)
    const sortedCompanies = enrichedCompanies.sort((a, b) => {
      const scoreA = (a.activeJobsCount * 10) + (a.total_hires || 0) - (a.avg_hiring_speed_days || 30);
      const scoreB = (b.activeJobsCount * 10) + (b.total_hires || 0) - (b.avg_hiring_speed_days || 30);
      return scoreB - scoreA;
    });

    return new Response(
      JSON.stringify({
        success: true,
        companies: sortedCompanies,
        totalFound: sortedCompanies.length,
        filterApplied: fieldSlug || null,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in recommend-companies:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to fetch company recommendations. Please try again.' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

function getMatchReason(
  company: { industry?: string | null; size?: string | null },
  profile: { preferred_fields?: string[] | null; experience_years?: number | null } | null,
  resumeSummary: unknown
): string {
  const reasons: string[] = [];

  if (company.industry) {
    reasons.push(`Industry: ${company.industry}`);
  }

  if (company.size) {
    reasons.push(`Company size: ${company.size}`);
  }

  if (profile?.experience_years && profile.experience_years > 5) {
    reasons.push('Good fit for experienced professionals');
  }

  if (resumeSummary && typeof resumeSummary === 'object' && 'skills' in resumeSummary) {
    reasons.push('Skills match detected');
  }

  return reasons.length > 0 ? reasons.join(' • ') : 'Based on your preferences';
}
