import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { postId, authorId, companyId } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get followers of this author or company
    const followerIds = new Set<string>();

    if (authorId) {
      const { data: userFollows } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('followed_user_id', authorId);
      userFollows?.forEach((f: any) => followerIds.add(f.follower_id));
    }

    if (companyId) {
      const { data: companyFollows } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('followed_company_id', companyId);
      companyFollows?.forEach((f: any) => followerIds.add(f.follower_id));

      // Also get candidates who previously applied to jobs from this company
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id')
        .eq('company_id', companyId);

      if (jobs?.length) {
        const jobIds = jobs.map((j: any) => j.id);
        const { data: apps } = await supabase
          .from('applications')
          .select('candidate_id')
          .in('job_id', jobIds);
        apps?.forEach((a: any) => followerIds.add(a.candidate_id));
      }
    }

    // Remove the author themselves
    followerIds.delete(authorId);

    // Get author name for notification
    const { data: authorProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', authorId)
      .single();

    const authorName = authorProfile?.full_name || 'A recruiter';

    // Insert notifications
    const notifications = Array.from(followerIds).map(userId => ({
      user_id: userId,
      type: 'new_content',
      title: `📢 ${authorName} posted new content`,
      message: 'Check out their latest post in the PLUG Feed',
      metadata: { post_id: postId, author_id: authorId },
    }));

    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications);
    }

    return new Response(
      JSON.stringify({ success: true, notified: notifications.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
