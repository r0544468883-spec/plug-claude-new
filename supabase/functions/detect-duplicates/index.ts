import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Job {
  id: string;
  title: string;
  location: string | null;
  company_id: string | null;
  source_url: string | null;
  created_at: string;
  updated_at: string;
}

// Simple similarity check for titles (case-insensitive, normalized)
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[\s\-\_\.\,]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function areTitlesSimilar(title1: string, title2: string): boolean {
  const normalized1 = normalizeTitle(title1);
  const normalized2 = normalizeTitle(title2);
  
  // Exact match after normalization
  if (normalized1 === normalized2) return true;
  
  // Check if one contains the other (at least 80% of the shorter one)
  const shorter = normalized1.length < normalized2.length ? normalized1 : normalized2;
  const longer = normalized1.length >= normalized2.length ? normalized1 : normalized2;
  
  if (longer.includes(shorter) && shorter.length > longer.length * 0.7) {
    return true;
  }
  
  // Simple Levenshtein-like check for small differences
  if (Math.abs(normalized1.length - normalized2.length) <= 3) {
    const words1 = normalized1.split(' ');
    const words2 = normalized2.split(' ');
    const commonWords = words1.filter(w => words2.includes(w));
    const similarity = (commonWords.length * 2) / (words1.length + words2.length);
    return similarity >= 0.8;
  }
  
  return false;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { newJobId, dryRun = false } = await req.json();

    console.log('Detecting duplicates for job:', newJobId, 'dryRun:', dryRun);

    // Get the new job details
    const { data: newJob, error: jobError } = await supabase
      .from('jobs')
      .select('id, title, location, company_id, source_url, created_at, updated_at')
      .eq('id', newJobId)
      .single();

    if (jobError || !newJob) {
      throw new Error('Job not found: ' + (jobError?.message || 'Unknown error'));
    }

    // Find potential duplicates
    const { data: allJobs, error: allJobsError } = await supabase
      .from('jobs')
      .select('id, title, location, company_id, source_url, created_at, updated_at')
      .neq('id', newJobId)
      .eq('status', 'active');

    if (allJobsError) {
      throw new Error('Failed to fetch jobs: ' + allJobsError.message);
    }

    const duplicates: Job[] = [];

    for (const job of allJobs || []) {
      let isDuplicate = false;

      // Check 1: Same source_url (strongest indicator)
      if (newJob.source_url && job.source_url && newJob.source_url === job.source_url) {
        isDuplicate = true;
        console.log('Duplicate by source_url:', job.id);
      }

      // Check 2: Same company + similar title + same location
      if (!isDuplicate && newJob.company_id && job.company_id === newJob.company_id) {
        if (areTitlesSimilar(newJob.title, job.title)) {
          // Check location similarity
          const sameLocation = 
            (!newJob.location && !job.location) ||
            (newJob.location && job.location && 
              normalizeTitle(newJob.location) === normalizeTitle(job.location));
          
          if (sameLocation) {
            isDuplicate = true;
            console.log('Duplicate by company+title+location:', job.id);
          }
        }
      }

      // Check 3: Very similar title + same location (even without company match)
      if (!isDuplicate && areTitlesSimilar(newJob.title, job.title)) {
        const sameLocation = newJob.location && job.location && 
          normalizeTitle(newJob.location) === normalizeTitle(job.location);
        
        if (sameLocation) {
          // Additional check: created within same week
          const daysDiff = Math.abs(
            new Date(newJob.created_at).getTime() - new Date(job.created_at).getTime()
          ) / (1000 * 60 * 60 * 24);
          
          if (daysDiff <= 7) {
            isDuplicate = true;
            console.log('Duplicate by title+location+date:', job.id);
          }
        }
      }

      if (isDuplicate) {
        duplicates.push(job);
      }
    }

    console.log('Found duplicates:', duplicates.length);

    const deletedIds: string[] = [];

    if (!dryRun && duplicates.length > 0) {
      // Delete older duplicates (keep the most recently updated)
      for (const dup of duplicates) {
        const newJobDate = new Date(newJob.updated_at);
        const dupJobDate = new Date(dup.updated_at);

        // Delete the older one
        const jobToDelete = newJobDate > dupJobDate ? dup.id : newJobId;
        
        // Only delete if the duplicate is older
        if (dupJobDate < newJobDate) {
          const { error: deleteError } = await supabase
            .from('jobs')
            .update({ status: 'inactive' })
            .eq('id', jobToDelete);

          if (!deleteError) {
            deletedIds.push(jobToDelete);
            console.log('Marked as inactive:', jobToDelete);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        duplicatesFound: duplicates.length,
        duplicates: duplicates.map(d => ({
          id: d.id,
          title: d.title,
          location: d.location,
          updated_at: d.updated_at,
        })),
        deletedIds,
        dryRun,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in detect-duplicates:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to detect duplicates. Please try again.' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
