import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ImportResult {
  url: string;
  status: 'success' | 'error' | 'pending';
  job?: { id: string; title: string; company: string };
  application_id?: string;
  error?: string;
}

interface BulkImportResponse {
  success: boolean;
  totalUrls: number;
  processed: number;
  failed: number;
  results: ImportResult[];
}

// Platform detection for optimized scraping
interface PlatformConfig {
  name: string;
  waitFor: number;
  promptHint: string;
}

function detectPlatform(url: string): PlatformConfig {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    
    if (hostname.includes('linkedin.com')) {
      return {
        name: 'linkedin',
        waitFor: 5000,
        promptHint: 'For LinkedIn: company name typically appears after "at " in the job title, or in the "Company" section.'
      };
    }
    if (hostname.includes('alljobs.co.il')) {
      return {
        name: 'alljobs',
        waitFor: 3000,
        promptHint: 'This is a Hebrew job board (AllJobs). Company name may be in Hebrew characters.'
      };
    }
    if (hostname.includes('drushim.co.il')) {
      return {
        name: 'drushim',
        waitFor: 3000,
        promptHint: 'This is a Hebrew job board (Drushim). Company name may be in Hebrew.'
      };
    }
    
    return { name: 'generic', waitFor: 2000, promptHint: '' };
  } catch {
    return { name: 'generic', waitFor: 2000, promptHint: '' };
  }
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname.startsWith('127.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.')
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// Process a single URL with rate limiting
async function processSingleUrl(
  url: string,
  supabaseAdmin: any,
  userId: string,
  FIRECRAWL_API_KEY: string,
  CLAUDE_API_KEY: string,
  addToApplications: boolean,
  markAsApplied: boolean,
  shareToComm: boolean
): Promise<ImportResult> {
  try {
    console.log(`Processing URL: ${url}`);
    
    const platform = detectPlatform(url);
    console.log(`Platform: ${platform.name}, waitFor: ${platform.waitFor}ms`);
    
    // Scrape the job page
    let pageContent = '';
    
    if (FIRECRAWL_API_KEY) {
      try {
        const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: url,
            formats: ['markdown'],
            onlyMainContent: true,
            waitFor: platform.waitFor,
          }),
        });
        
        const firecrawlData = await firecrawlResponse.json();
        
        if (firecrawlResponse.ok && firecrawlData.success && firecrawlData.data?.markdown) {
          pageContent = firecrawlData.data.markdown.substring(0, 50000);
        }
      } catch (e) {
        console.error('Firecrawl error:', e);
      }
    }
    
    // Fallback to basic fetch
    if (!pageContent) {
      try {
        const pageResponse = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.5,he;q=0.3',
          }
        });
        pageContent = await pageResponse.text();
        pageContent = pageContent
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .substring(0, 50000);
      } catch (fetchError) {
        return { url, status: 'error', error: 'Failed to fetch page' };
      }
    }
    
    if (!pageContent || pageContent.length < 100) {
      return { url, status: 'error', error: 'No content extracted' };
    }
    
    // Use AI to extract job details
    const platformHint = platform.promptHint ? `\n\nPLATFORM HINT: ${platform.promptHint}` : '';

    const aiSystemPrompt = `Extract job details as JSON: { "company_name": "string", "job_title": "string", "location": "string or null", "job_type": "full-time|part-time|contract|freelance|null", "description": "2 sentences", "requirements": "comma-separated" }. Content may be in Hebrew. Return ONLY valid JSON, no markdown, no code blocks.${platformHint}`;

    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        system: aiSystemPrompt,
        messages: [
          {
            role: 'user',
            content: `Extract: ${pageContent.substring(0, 30000)}`
          }
        ],
        max_tokens: 2048,
      }),
    });

    if (!aiResponse.ok) {
      return { url, status: 'error', error: `AI error: ${aiResponse.status}` };
    }

    const aiData = await aiResponse.json();
    let jobDetails;

    const rawContent = aiData.content?.[0]?.text || '';
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        jobDetails = JSON.parse(jsonMatch[0]);
      } catch {
        return { url, status: 'error', error: 'Failed to parse job details' };
      }
    } else {
      return { url, status: 'error', error: 'Failed to parse job details' };
    }
    
    if (!jobDetails.company_name || !jobDetails.job_title) {
      return { url, status: 'error', error: 'Missing company or job title' };
    }
    
    // Find or create company
    let companyId: string | null = null;
    
    const { data: existingCompany } = await supabaseAdmin
      .from('companies')
      .select('id')
      .ilike('name', jobDetails.company_name)
      .maybeSingle();
    
    if (existingCompany) {
      companyId = existingCompany.id;
    } else {
      const { data: newCompany, error: companyError } = await supabaseAdmin
        .from('companies')
        .insert({
          name: jobDetails.company_name,
          created_by: userId,
        })
        .select('id')
        .single();
      
      if (companyError) {
        return { url, status: 'error', error: 'Failed to create company' };
      }
      companyId = newCompany.id;
    }
    
    // Create job
    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .insert({
        title: jobDetails.job_title,
        company_id: companyId,
        location: jobDetails.location || null,
        job_type: jobDetails.job_type || null,
        description: jobDetails.description || null,
        requirements: jobDetails.requirements || null,
        source_url: url,
        created_by: userId,
        is_community_shared: shareToComm,
        shared_by_user_id: shareToComm ? userId : null,
      })
      .select('id')
      .single();
    
    if (jobError) {
      return { url, status: 'error', error: 'Failed to create job' };
    }
    
    let applicationId: string | undefined = undefined;
    
    // Create application if requested
    if (addToApplications) {
      const { data: application, error: appError } = await supabaseAdmin
        .from('applications')
        .insert({
          job_id: job.id,
          candidate_id: userId,
          status: 'active',
          current_stage: markAsApplied ? 'applied' : 'saved',
        })
        .select('id')
        .single();
      
      if (!appError && application) {
        applicationId = application.id;
        
        // Add timeline event
        const eventDescription = markAsApplied 
          ? 'CV submitted (bulk import)' 
          : 'Application created (bulk import)';
        
        await supabaseAdmin
          .from('application_timeline')
          .insert({
            application_id: application.id,
            event_type: markAsApplied ? 'applied' : 'created',
            description: eventDescription,
          });
      }
    }
    
    return {
      url,
      status: 'success',
      job: {
        id: job.id,
        title: jobDetails.job_title,
        company: jobDetails.company_name
      },
      application_id: applicationId
    };
    
  } catch (error) {
    console.error(`Error processing ${url}:`, error);
    return { 
      url, 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY') || '';
    const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY');

    if (!CLAUDE_API_KEY) {
      throw new Error('CLAUDE_API_KEY not configured');
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !authUser) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const userId = authUser.id;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const body = await req.json();
    const { urls, addToApplications = true, markAsApplied = true, shareToComm = true } = body;
    
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No URLs provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate and filter URLs
    const validUrls = urls.filter((url: string) => isValidUrl(url)).slice(0, 50); // Max 50 URLs
    console.log(`Processing ${validUrls.length} valid URLs out of ${urls.length}`);
    
    const results: ImportResult[] = [];
    
    // Process URLs in batches of 3 (to avoid rate limits)
    const batchSize = 3;
    for (let i = 0; i < validUrls.length; i += batchSize) {
      const batch = validUrls.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(
        batch.map((url: string) => 
          processSingleUrl(
            url,
            supabaseAdmin,
            userId,
            FIRECRAWL_API_KEY,
            CLAUDE_API_KEY,
            addToApplications,
            markAsApplied,
            shareToComm
          )
        )
      );
      
      results.push(...batchResults);
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < validUrls.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    const response: BulkImportResponse = {
      success: true,
      totalUrls: urls.length,
      processed: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'error').length,
      results
    };
    
    console.log(`Bulk import complete: ${response.processed} success, ${response.failed} failed`);
    
    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Bulk import error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to import jobs. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
