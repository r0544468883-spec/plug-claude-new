import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Verify user
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
    const { job_id, candidate_user_id, match_score, send_notification = true } = body;

    if (!job_id || !candidate_user_id) {
      return new Response(
        JSON.stringify({ error: 'job_id and candidate_user_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get job details
    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select(`
        id, 
        title, 
        location,
        created_by,
        company:companies(name)
      `)
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
        JSON.stringify({ error: 'Access denied. You can only import candidates to your own jobs.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get recruiter profile
    const { data: recruiterProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single();

    // Get candidate profile
    const { data: candidateProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('user_id', candidate_user_id)
      .single();

    if (!candidateProfile) {
      return new Response(
        JSON.stringify({ error: 'Candidate not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if application already exists
    const { data: existingApp } = await supabaseAdmin
      .from('applications')
      .select('id')
      .eq('job_id', job_id)
      .eq('candidate_id', candidate_user_id)
      .single();

    if (existingApp) {
      return new Response(
        JSON.stringify({ 
          error: 'Candidate already has an application for this job',
          existing_application_id: existingApp.id
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create application with 'sourced' status
    const { data: application, error: appError } = await supabaseAdmin
      .from('applications')
      .insert({
        job_id: job_id,
        candidate_id: candidate_user_id,
        match_score: match_score || null,
        status: 'active',
        current_stage: 'sourced',
        notes: `Imported from talent pool by ${recruiterProfile?.full_name || 'recruiter'}`
      })
      .select()
      .single();

    if (appError) {
      console.error('Error creating application:', appError);
      throw new Error('Failed to create application');
    }

    // Add timeline event
    await supabaseAdmin
      .from('application_timeline')
      .insert({
        application_id: application.id,
        event_type: 'sourced',
        description: `Imported from talent pool with ${match_score}% match score`
      });

    // Get or create conversation
    let conversationId: string;
    const { data: existingConv } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .or(`and(participant_1.eq.${user.id},participant_2.eq.${candidate_user_id}),and(participant_1.eq.${candidate_user_id},participant_2.eq.${user.id})`)
      .single();

    if (existingConv) {
      conversationId = existingConv.id;
    } else {
      const { data: newConv, error: convError } = await supabaseAdmin
        .from('conversations')
        .insert({
          participant_1: user.id,
          participant_2: candidate_user_id,
        })
        .select()
        .single();

      if (convError) {
        console.error('Error creating conversation:', convError);
        conversationId = '';
      } else {
        conversationId = newConv.id;
      }
    }

    const companyName = (job.company as any)?.[0]?.name || 'our company';
    const jobUrl = `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/job/${job.id}`;

    // Send notification and message to candidate
    if (send_notification) {
      // Create notification
      await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: candidate_user_id,
          type: 'job_opportunity',
          title: 'משרה חדשה מתאימה לך! 🎯',
          message: `${recruiterProfile?.full_name || 'מגייס'} מצא עבורך משרה מתאימה: ${job.title} ב-${companyName}`,
          metadata: {
            job_id: job.id,
            job_title: job.title,
            match_score: match_score,
            recruiter_id: user.id,
            recruiter_name: recruiterProfile?.full_name
          }
        });

      // Send message if conversation exists
      if (conversationId) {
        const messageContent = `שלום ${candidateProfile.full_name}! 👋

מצאתי משרה שנראית מתאימה עבורך:

🎯 **${job.title}**
🏢 ${companyName}
📍 ${job.location || 'לא צוין מיקום'}
${match_score ? `✨ התאמה: ${match_score}%` : ''}

אשמח לשמוע ממך אם המשרה מעניינת אותך!

בהצלחה,
${recruiterProfile?.full_name || 'הצוות שלנו'}`;

        await supabaseAdmin
          .from('messages')
          .insert({
            conversation_id: conversationId,
            from_user_id: user.id,
            to_user_id: candidate_user_id,
            content: messageContent,
            related_job_id: job.id,
            related_application_id: application.id
          });

        // Update conversation timestamp
        await supabaseAdmin
          .from('conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conversationId);
      }
    }

    console.log(`Candidate ${candidate_user_id} imported to job ${job_id} with application ${application.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        application_id: application.id,
        message: 'Candidate imported successfully',
        notification_sent: send_notification,
        conversation_id: conversationId || null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in import-candidate:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to import candidate. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
