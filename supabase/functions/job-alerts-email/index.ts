import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JobAlert {
  id: string;
  user_id: string;
  field_ids: string[] | null;
  role_ids: string[] | null;
  experience_level_ids: string[] | null;
  location: string | null;
  is_active: boolean;
}

interface Job {
  id: string;
  title: string;
  location: string | null;
  field_id: string | null;
  role_id: string | null;
  experience_level_id: string | null;
  company: { name: string }[] | null;
  created_at: string;
}

interface Profile {
  user_id: string;
  email: string;
  full_name: string;
  preferred_fields: string[] | null;
  preferred_roles: string[] | null;
  preferred_experience_level_id: string | null;
}

// Calculate match score
function calculateMatchScore(
  job: Job,
  profile: Profile
): number {
  if (!profile.preferred_fields?.length && !profile.preferred_roles?.length && !profile.preferred_experience_level_id) {
    return 0;
  }

  let score = 0;
  let factors = 0;

  // Field match (40 points)
  if (profile.preferred_fields && profile.preferred_fields.length > 0) {
    factors += 40;
    if (job.field_id && profile.preferred_fields.includes(job.field_id)) {
      score += 40;
    }
  }

  // Role match (35 points)
  if (profile.preferred_roles && profile.preferred_roles.length > 0) {
    factors += 35;
    if (job.role_id && profile.preferred_roles.includes(job.role_id)) {
      score += 35;
    }
  }

  // Experience level match (25 points)
  if (profile.preferred_experience_level_id) {
    factors += 25;
    if (job.experience_level_id === profile.preferred_experience_level_id) {
      score += 25;
    }
  }

  if (factors === 0) return 0;
  return Math.round((score / factors) * 100);
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting job alerts email process...');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Get recent jobs (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: recentJobs, error: jobsError } = await supabaseAdmin
      .from('jobs')
      .select(`
        id,
        title,
        location,
        field_id,
        role_id,
        experience_level_id,
        created_at,
        company:companies(name)
      `)
      .gte('created_at', yesterday)
      .eq('status', 'active');

    if (jobsError) {
      console.error('Error fetching recent jobs:', jobsError);
      throw new Error('Failed to fetch recent jobs');
    }

    if (!recentJobs || recentJobs.length === 0) {
      console.log('No new jobs in the last 24 hours');
      return new Response(
        JSON.stringify({ success: true, message: 'No new jobs to process', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${recentJobs.length} new jobs`);

    // Get all profiles with preferences set
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, email, full_name, preferred_fields, preferred_roles, preferred_experience_level_id')
      .eq('email_notifications', true);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw new Error('Failed to fetch profiles');
    }

    if (!profiles || profiles.length === 0) {
      console.log('No profiles with email notifications enabled');
      return new Response(
        JSON.stringify({ success: true, message: 'No users to notify', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${profiles.length} profiles`);

    let notificationsSent = 0;

    // For each profile, find matching jobs with 60%+ match
    for (const profile of profiles) {
      const matchingJobs: (Job & { matchScore: number })[] = [];

      for (const job of recentJobs) {
        const score = calculateMatchScore(job as Job, profile);
        
        if (score >= 60) {
          matchingJobs.push({ ...job as Job, matchScore: score });
        }
      }

      if (matchingJobs.length > 0) {
        // Sort by match score
        matchingJobs.sort((a, b) => b.matchScore - a.matchScore);

        // Create a notification instead of email (email would require Resend setup)
        const { error: notifError } = await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: profile.user_id,
            type: 'job_alert',
            title: `${matchingJobs.length} משרות חדשות מתאימות לך!`,
            message: `נמצאו ${matchingJobs.length} משרות חדשות עם התאמה של 60% ומעלה: ${matchingJobs.slice(0, 3).map(j => j.title).join(', ')}${matchingJobs.length > 3 ? '...' : ''}`,
            metadata: {
              job_count: matchingJobs.length,
              top_jobs: matchingJobs.slice(0, 5).map(j => ({
                id: j.id,
                title: j.title,
                matchScore: j.matchScore,
                company: j.company?.[0]?.name || null
              }))
            }
          });

        if (notifError) {
          console.error(`Error creating notification for ${profile.email}:`, notifError);
        } else {
          notificationsSent++;
          console.log(`Notification sent to ${profile.email} for ${matchingJobs.length} jobs`);
        }
      }
    }

    console.log(`Job alerts process completed. Sent ${notificationsSent} notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${recentJobs.length} jobs, sent ${notificationsSent} notifications`,
        jobs_processed: recentJobs.length,
        notifications_sent: notificationsSent
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in job-alerts-email:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to process job alerts. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
