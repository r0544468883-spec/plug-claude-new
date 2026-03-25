import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Use service role for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { action, user_id, company_id } = await req.json();

    console.log('Calculate metrics called with action:', action);

    if (action === 'calculate_candidate_metrics' && user_id) {
      // Calculate candidate response metrics
      const { data: applications, error: appError } = await supabaseAdmin
        .from('applications')
        .select('id, created_at, status, last_interaction')
        .eq('candidate_id', user_id);

      if (appError) throw appError;

      const totalApplications = applications?.length || 0;
      
      // Calculate response rate (applications with any update after creation)
      const responded = applications?.filter(app => 
        app.last_interaction && 
        new Date(app.last_interaction) > new Date(app.created_at)
      ).length || 0;

      const responseRate = totalApplications > 0 
        ? Math.round((responded / totalApplications) * 100) 
        : 0;

      // Calculate average response time in hours
      let avgResponseTimeHours = null;
      const responseTimes = applications
        ?.filter(app => app.last_interaction && new Date(app.last_interaction) > new Date(app.created_at))
        .map(app => {
          const created = new Date(app.created_at).getTime();
          const responded = new Date(app.last_interaction!).getTime();
          return (responded - created) / (1000 * 60 * 60); // hours
        });

      if (responseTimes && responseTimes.length > 0) {
        avgResponseTimeHours = Math.round(
          responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        );
      }

      // Update profile
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          response_rate: responseRate,
          avg_response_time_hours: avgResponseTimeHours,
          total_applications: totalApplications
        })
        .eq('user_id', user_id);

      if (updateError) throw updateError;

      console.log('Candidate metrics updated:', { user_id, responseRate, avgResponseTimeHours, totalApplications });

      return new Response(
        JSON.stringify({ 
          success: true, 
          metrics: { responseRate, avgResponseTimeHours, totalApplications }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'calculate_company_metrics' && company_id) {
      // Calculate company hiring speed metrics
      const { data: jobs, error: jobsError } = await supabaseAdmin
        .from('jobs')
        .select('id')
        .eq('company_id', company_id);

      if (jobsError) throw jobsError;

      const jobIds = jobs?.map(j => j.id) || [];

      if (jobIds.length === 0) {
        return new Response(
          JSON.stringify({ success: true, metrics: { avgHiringSpeedDays: null, totalHires: 0 } }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get applications that resulted in hires
      const { data: hiredApps, error: appsError } = await supabaseAdmin
        .from('applications')
        .select('created_at, updated_at, status')
        .in('job_id', jobIds)
        .eq('status', 'hired');

      if (appsError) throw appsError;

      const totalHires = hiredApps?.length || 0;

      // Calculate average hiring speed
      let avgHiringSpeedDays = null;
      if (hiredApps && hiredApps.length > 0) {
        const hiringSpeeds = hiredApps.map(app => {
          const applied = new Date(app.created_at).getTime();
          const hired = new Date(app.updated_at).getTime();
          return (hired - applied) / (1000 * 60 * 60 * 24); // days
        });
        avgHiringSpeedDays = Math.round(
          hiringSpeeds.reduce((a, b) => a + b, 0) / hiringSpeeds.length
        );
      }

      // Update company
      const { error: updateError } = await supabaseAdmin
        .from('companies')
        .update({
          avg_hiring_speed_days: avgHiringSpeedDays,
          total_hires: totalHires,
          last_metrics_update: new Date().toISOString()
        })
        .eq('id', company_id);

      if (updateError) throw updateError;

      console.log('Company metrics updated:', { company_id, avgHiringSpeedDays, totalHires });

      return new Response(
        JSON.stringify({ 
          success: true, 
          metrics: { avgHiringSpeedDays, totalHires }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'recalculate_all') {
      // Batch recalculation for all users and companies
      console.log('Starting batch metrics recalculation...');

      // Get all user IDs with applications
      const { data: candidates, error: candError } = await supabaseAdmin
        .from('applications')
        .select('candidate_id')
        .limit(1000);

      if (candError) throw candError;

      const uniqueCandidates = [...new Set(candidates?.map(c => c.candidate_id) || [])];
      console.log(`Processing ${uniqueCandidates.length} candidates...`);

      for (const candidateId of uniqueCandidates) {
        try {
          // Recursive call to calculate individual metrics
          await fetch(`${supabaseUrl}/functions/v1/calculate-metrics`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({ action: 'calculate_candidate_metrics', user_id: candidateId })
          });
        } catch (e) {
          console.error(`Failed to calculate metrics for candidate ${candidateId}:`, e);
        }
      }

      // Get all company IDs
      const { data: companies, error: compError } = await supabaseAdmin
        .from('companies')
        .select('id');

      if (compError) throw compError;

      console.log(`Processing ${companies?.length || 0} companies...`);

      for (const company of companies || []) {
        try {
          await fetch(`${supabaseUrl}/functions/v1/calculate-metrics`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({ action: 'calculate_company_metrics', company_id: company.id })
          });
        } catch (e) {
          console.error(`Failed to calculate metrics for company ${company.id}:`, e);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          processed: { candidates: uniqueCandidates.length, companies: companies?.length || 0 }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action or missing parameters' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("calculate-metrics error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to calculate metrics. Please try again." }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
