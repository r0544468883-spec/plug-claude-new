import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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
        promptHint: 'For LinkedIn: company name typically appears after "at " in the job title, or in the "Company" section. Look for patterns like "Software Engineer at Google" or explicit company fields.'
      };
    }
    if (hostname.includes('alljobs.co.il')) {
      return {
        name: 'alljobs',
        waitFor: 3000,
        promptHint: 'This is a Hebrew job board (AllJobs). Company name may be in Hebrew characters. Look for the employer/מעסיק field. Extract all text even if in Hebrew.'
      };
    }
    if (hostname.includes('drushim.co.il')) {
      return {
        name: 'drushim',
        waitFor: 3000,
        promptHint: 'This is a Hebrew job board (Drushim). Company name may be in Hebrew. Look for structured data or company logo alt text. The company often appears in the header section.'
      };
    }
    if (hostname.includes('glassdoor.com')) {
      return {
        name: 'glassdoor',
        waitFor: 4000,
        promptHint: 'For Glassdoor: company name is usually prominent in the header. Look for employer ratings section which includes company name.'
      };
    }
    if (hostname.includes('indeed.com')) {
      return {
        name: 'indeed',
        waitFor: 3000,
        promptHint: 'For Indeed: look for the company name near the job title, often in a separate line or link.'
      };
    }
    
    return { name: 'generic', waitFor: 2000, promptHint: '' };
  } catch {
    return { name: 'generic', waitFor: 2000, promptHint: '' };
  }
}

// Job taxonomy for AI matching
const JOB_FIELDS = [
  { slug: 'tech', name_en: 'Hi-Tech & IT', keywords: ['software', 'developer', 'engineer', 'programming', 'coding', 'tech', 'IT', 'digital', 'computer', 'data', 'cyber', 'devops', 'cloud', 'mobile', 'web', 'frontend', 'backend', 'fullstack', 'QA', 'product manager', 'scrum'] },
  { slug: 'marketing', name_en: 'Marketing & Advertising', keywords: ['marketing', 'advertising', 'seo', 'sem', 'social media', 'content', 'brand', 'campaign', 'digital marketing', 'growth', 'acquisition', 'retention'] },
  { slug: 'sales', name_en: 'Sales', keywords: ['sales', 'business development', 'account', 'customer success', 'SDR', 'BDR', 'enterprise', 'B2B', 'B2C'] },
  { slug: 'finance', name_en: 'Finance & Economics', keywords: ['finance', 'accounting', 'financial', 'investment', 'banking', 'budget', 'controller', 'CFO', 'analyst'] },
  { slug: 'engineering', name_en: 'Engineering', keywords: ['mechanical', 'electrical', 'civil', 'chemical', 'industrial', 'engineer'] },
  { slug: 'hr', name_en: 'HR & Recruitment', keywords: ['HR', 'human resources', 'recruiter', 'recruiting', 'talent', 'people', 'compensation', 'benefits'] },
  { slug: 'management', name_en: 'Management & Admin', keywords: ['manager', 'management', 'admin', 'administrative', 'office', 'executive', 'director', 'CEO', 'COO', 'operations'] },
  { slug: 'customer-service', name_en: 'Customer Service & Support', keywords: ['customer service', 'support', 'helpdesk', 'client', 'call center'] },
  { slug: 'design', name_en: 'Design & Creative', keywords: ['design', 'designer', 'UX', 'UI', 'graphic', 'creative', 'visual', 'art'] },
  { slug: 'data', name_en: 'Data & Analytics', keywords: ['data', 'analytics', 'analyst', 'BI', 'business intelligence', 'statistics', 'machine learning', 'AI'] },
  { slug: 'healthcare', name_en: 'Healthcare & Medical', keywords: ['healthcare', 'medical', 'health', 'nurse', 'doctor', 'clinical', 'pharma', 'biotech'] },
  { slug: 'education', name_en: 'Education & Teaching', keywords: ['education', 'teaching', 'teacher', 'instructor', 'training', 'learning'] },
  { slug: 'legal', name_en: 'Legal', keywords: ['legal', 'lawyer', 'attorney', 'law', 'compliance', 'contract'] },
  { slug: 'logistics', name_en: 'Logistics & Shipping', keywords: ['logistics', 'shipping', 'supply chain', 'warehouse', 'transportation'] },
  { slug: 'hospitality', name_en: 'Hospitality & Tourism', keywords: ['hospitality', 'hotel', 'tourism', 'travel', 'restaurant', 'food'] },
  { slug: 'retail', name_en: 'Retail & Commerce', keywords: ['retail', 'store', 'shop', 'ecommerce', 'commerce', 'merchandising'] },
];

const EXPERIENCE_LEVELS = [
  { slug: 'entry', name_en: 'Entry Level / Student', years_min: 0, years_max: 0, keywords: ['entry', 'student', 'internship', 'intern', 'graduate', 'no experience', 'junior', '0-1 years'] },
  { slug: 'junior', name_en: 'Junior', years_min: 1, years_max: 2, keywords: ['junior', '1-2 years', '1-3 years', 'early career'] },
  { slug: 'mid', name_en: 'Mid-Level', years_min: 3, years_max: 5, keywords: ['mid', 'mid-level', '3-5 years', '2-4 years', '3+ years'] },
  { slug: 'senior', name_en: 'Senior', years_min: 6, years_max: 10, keywords: ['senior', '5+ years', '5-7 years', '6+ years', 'experienced'] },
  { slug: 'lead', name_en: 'Lead / Team Lead', years_min: 8, years_max: 15, keywords: ['lead', 'team lead', 'tech lead', 'principal', '8+ years', '10+ years'] },
  { slug: 'executive', name_en: 'Executive / Director', years_min: 15, years_max: null, keywords: ['executive', 'director', 'VP', 'C-level', 'CTO', 'CEO', 'head of', 'chief'] },
];

// Input validation helpers
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_COMPANY_NAME_LENGTH = 200;
const MAX_JOB_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_LOCATION_LENGTH = 200;
const MAX_PAGE_CONTENT_LENGTH = 50000;

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow https
    if (parsed.protocol !== 'https:') {
      return false;
    }
    // Block internal/private IPs
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname.startsWith('127.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname) ||
      hostname.startsWith('169.254.') ||
      hostname === '0.0.0.0' ||
      hostname.includes('metadata.google') ||
      hostname === '169.254.169.254'
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function validateStringInput(value: string | undefined, maxLength: number, fieldName: string): string | null {
  if (!value) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new Error(`${fieldName} exceeds maximum length of ${maxLength} characters`);
  }
  return trimmed;
}

// Helper function to detect field from job content
function detectField(title: string, description: string, requirements: string): string | null {
  const content = `${title} ${description} ${requirements}`.toLowerCase();
  
  for (const field of JOB_FIELDS) {
    for (const keyword of field.keywords) {
      if (content.includes(keyword.toLowerCase())) {
        return field.slug;
      }
    }
  }
  return null;
}

// Helper function to detect experience level from job content
function detectExperienceLevel(title: string, description: string, requirements: string): string | null {
  const content = `${title} ${description} ${requirements}`.toLowerCase();
  
  // Check for year patterns first
  const yearsMatch = content.match(/(\d+)[+-]?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience)?/i);
  if (yearsMatch) {
    const years = parseInt(yearsMatch[1]);
    if (years === 0) return 'entry';
    if (years <= 2) return 'junior';
    if (years <= 5) return 'mid';
    if (years <= 10) return 'senior';
    if (years <= 15) return 'lead';
    return 'executive';
  }
  
  // Check for keyword patterns
  for (const level of EXPERIENCE_LEVELS) {
    for (const keyword of level.keywords) {
      if (content.includes(keyword.toLowerCase())) {
        return level.slug;
      }
    }
  }
  
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create client with user's token
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Verify the user
    const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !authUser) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const authenticatedUserId = authUser.id;
    console.log('Authenticated user:', authenticatedUserId);

    const body = await req.json();
    const { url, save, manual, pastedContent } = body;
    
    // Create admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Handle manual application creation
    if (manual) {
      const { company_name, job_title, location, job_type, description, source_url } = body;
      
      // Validate inputs
      const validatedCompanyName = validateStringInput(company_name, MAX_COMPANY_NAME_LENGTH, 'Company name');
      const validatedJobTitle = validateStringInput(job_title, MAX_JOB_TITLE_LENGTH, 'Job title');
      const validatedLocation = validateStringInput(location, MAX_LOCATION_LENGTH, 'Location');
      const validatedDescription = validateStringInput(description, MAX_DESCRIPTION_LENGTH, 'Description');
      const validatedSourceUrl = source_url ? validateStringInput(source_url, 2000, 'Source URL') : null;
      
      if (!validatedCompanyName || !validatedJobTitle) {
        return new Response(
          JSON.stringify({ error: 'Company name and job title are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Find or create company
      let companyId: string | null = null;
      
      const { data: existingCompany } = await supabaseAdmin
        .from('companies')
        .select('id')
        .ilike('name', validatedCompanyName)
        .maybeSingle();

      if (existingCompany) {
        companyId = existingCompany.id;
      } else {
        const { data: newCompany, error: companyError } = await supabaseAdmin
          .from('companies')
          .insert({
            name: validatedCompanyName,
            created_by: authenticatedUserId,
          })
          .select('id')
          .single();

        if (companyError) {
          console.error('Error creating company:', companyError);
          throw new Error('Failed to create company');
        }
        companyId = newCompany.id;
      }

      // Create job
      const { data: job, error: jobError } = await supabaseAdmin
        .from('jobs')
        .insert({
          title: validatedJobTitle,
          company_id: companyId,
          location: validatedLocation || null,
          job_type: job_type || null,
          description: validatedDescription || null,
          source_url: validatedSourceUrl || null,
          created_by: authenticatedUserId,
        })
        .select('id')
        .single();

      if (jobError) {
        console.error('Error creating job:', jobError);
        throw new Error('Failed to create job');
      }

      // Create application
      const { data: application, error: appError } = await supabaseAdmin
        .from('applications')
        .insert({
          job_id: job.id,
          candidate_id: authenticatedUserId,
          status: 'active',
          current_stage: 'applied',
        })
        .select('id')
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
          event_type: 'created',
          description: 'Application created manually',
        });

      return new Response(
        JSON.stringify({
          success: true,
          saved: true,
          application_id: application.id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Handle pasted content - no need to fetch URL
    const isPastedContent = url === 'paste://manual-entry' && pastedContent;
    
    if (!isPastedContent && !url) {
      return new Response(
        JSON.stringify({ error: 'URL or pasted content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate URL format and security (skip for pasted content)
    if (!isPastedContent && !isValidUrl(url)) {
      return new Response(
        JSON.stringify({ error: 'Invalid URL. Only HTTPS URLs to public websites are allowed.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY');
    if (!CLAUDE_API_KEY) {
      throw new Error('CLAUDE_API_KEY is not configured');
    }

    // Get page content - either from URL or pasted content
    let pageContent = '';
    let scrapeMethod = 'unknown';
    
    if (isPastedContent) {
      // Use pasted content directly
      pageContent = pastedContent.substring(0, MAX_PAGE_CONTENT_LENGTH);
      scrapeMethod = 'pasted';
      console.log('Using pasted content, length:', pageContent.length);
    } else {
      // Try Firecrawl first for better scraping, fallback to basic fetch
      const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
      
      // Detect platform for optimized scraping
      const platform = detectPlatform(url);
      console.log(`Detected platform: ${platform.name} (waitFor: ${platform.waitFor}ms)`);
      
      if (FIRECRAWL_API_KEY) {
        try {
          console.log('Attempting Firecrawl scrape for:', url);
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
              waitFor: platform.waitFor, // Dynamic wait time based on platform
            }),
          });
          
          const firecrawlData = await firecrawlResponse.json();
          
          if (firecrawlResponse.ok && firecrawlData.success && firecrawlData.data?.markdown) {
            pageContent = firecrawlData.data.markdown.substring(0, MAX_PAGE_CONTENT_LENGTH);
            scrapeMethod = 'firecrawl';
            console.log('Firecrawl success, content length:', pageContent.length);
          } else {
            console.log('Firecrawl failed or no content, falling back to basic fetch:', firecrawlData.error || 'No markdown');
          }
        } catch (firecrawlError) {
          console.error('Firecrawl error, falling back to basic fetch:', firecrawlError);
        }
      }
      
      // Fallback to basic fetch if Firecrawl didn't work
      if (!pageContent) {
        try {
          console.log('Using basic fetch for:', url);
          const pageResponse = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5,he;q=0.3',
            }
          });
          pageContent = await pageResponse.text();
          // Clean HTML - remove scripts and styles, keep text
          pageContent = pageContent
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .substring(0, MAX_PAGE_CONTENT_LENGTH);
          scrapeMethod = 'basic-fetch';
          console.log('Basic fetch success, content length:', pageContent.length);
        } catch (fetchError) {
          console.error('Error fetching URL:', fetchError);
          return new Response(
            JSON.stringify({ 
              error: 'Failed to fetch job page. Please check the URL.',
              requiresManualEntry: true,
              source_url: url
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Use Claude API to extract job details
    const sourceInfo = isPastedContent ? 'Pasted job description text' : `URL: ${url}`;

    // Get platform hint for AI prompt (if URL scraping)
    const platformForAI = isPastedContent ? { name: 'pasted', waitFor: 0, promptHint: '' } : detectPlatform(url);
    const platformHint = platformForAI.promptHint ? `\n\nPLATFORM HINT: ${platformForAI.promptHint}` : '';

    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        system: `You are a job posting analyzer. Extract structured job information from the provided text.
Always respond with valid JSON in this exact format, no markdown, no code blocks:
{
  "company_name": "string",
  "job_title": "string",
  "location": "string or null",
  "job_type": "full-time | part-time | contract | freelance | null",
  "salary_range": "string or null",
  "description": "string (2-3 sentences summary)",
  "requirements": "string (comma-separated key requirements)",
  "years_of_experience": "number or null (estimated years required)",
  "required_skills": ["skill1", "skill2"],
  "preferred_skills": ["skill1", "skill2"],
  "culture_keywords": ["remote-friendly", "fast-paced", "startup"],
  "remote_type": "remote | hybrid | onsite | null"
}
If you cannot extract a field, use null or empty array []. Always return valid JSON.
required_skills: hard requirements explicitly stated (must-have technologies, languages, tools).
preferred_skills: nice-to-have or bonus skills mentioned.
culture_keywords: adjectives/phrases describing the work environment, values, or perks.
remote_type: detect from keywords like "remote", "hybrid", "on-site", "in-office", "flexible".
IMPORTANT: Extract the company name even from job board posts - look for "at [Company]", "Company: [Name]", or similar patterns.
The content may be in Hebrew - extract all information even if in Hebrew characters.${platformHint}`,
        messages: [
          {
            role: 'user',
            content: `Extract job details from this job posting:\n\n${sourceInfo}\n\nContent:\n${pageContent}`
          }
        ],
        max_tokens: 2048,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();

    // Extract from Claude response
    let jobDetails;
    const rawText = aiData.content?.[0]?.text || '';
    const jsonMatch = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim().match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        jobDetails = JSON.parse(jsonMatch[0]);
      } catch {
        throw new Error('Failed to parse job details from AI response');
      }
    } else {
      throw new Error('Failed to parse job details from AI response');
    }

    // Detect field and experience level from taxonomy
    const detectedFieldSlug = detectField(
      jobDetails.job_title || '',
      jobDetails.description || '',
      jobDetails.requirements || ''
    );
    
    const detectedExpLevelSlug = detectExperienceLevel(
      jobDetails.job_title || '',
      jobDetails.description || '',
      jobDetails.requirements || ''
    );

    console.log('Detected field:', detectedFieldSlug);
    console.log('Detected experience level:', detectedExpLevelSlug);

    // Fetch taxonomy IDs from database
    let fieldId: string | null = null;
    let roleId: string | null = null;
    let experienceLevelId: string | null = null;

    if (detectedFieldSlug) {
      const { data: field } = await supabaseAdmin
        .from('job_fields')
        .select('id')
        .eq('slug', detectedFieldSlug)
        .single();
      if (field) fieldId = field.id;
    }

    if (detectedExpLevelSlug) {
      const { data: expLevel } = await supabaseAdmin
        .from('experience_levels')
        .select('id')
        .eq('slug', detectedExpLevelSlug)
        .single();
      if (expLevel) experienceLevelId = expLevel.id;
    }

    // Build normalized JD schema (jd-intel pattern)
    const parsedJd = {
      role: jobDetails.job_title || null,
      seniority: detectedExpLevelSlug || null,
      required_skills: Array.isArray(jobDetails.required_skills) ? jobDetails.required_skills : [],
      preferred_skills: Array.isArray(jobDetails.preferred_skills) ? jobDetails.preferred_skills : [],
      culture_keywords: Array.isArray(jobDetails.culture_keywords) ? jobDetails.culture_keywords : [],
      remote_type: jobDetails.remote_type || null,
      salary_range: jobDetails.salary_range || null,
      years_of_experience: jobDetails.years_of_experience || null,
    };
    jobDetails.parsed_jd = parsedJd;

    // Add taxonomy info to response
    jobDetails.detected_field_slug = detectedFieldSlug;
    jobDetails.detected_experience_level_slug = detectedExpLevelSlug;
    jobDetails.field_id = fieldId;
    jobDetails.experience_level_id = experienceLevelId;

    // If save is requested, save to database using authenticated user ID
    if (save) {
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
            created_by: authenticatedUserId,
          })
          .select('id')
          .single();

        if (companyError) {
          console.error('Error creating company:', companyError);
          throw new Error('Failed to create company');
        }
        companyId = newCompany.id;
      }

      // Create job with taxonomy
      const { data: job, error: jobError } = await supabaseAdmin
        .from('jobs')
        .insert({
          title: jobDetails.job_title,
          company_id: companyId,
          location: jobDetails.location,
          job_type: jobDetails.job_type,
          salary_range: jobDetails.salary_range,
          description: jobDetails.description,
          requirements: jobDetails.requirements,
          source_url: url,
          created_by: authenticatedUserId,
          field_id: fieldId,
          role_id: roleId,
          experience_level_id: experienceLevelId,
          category: detectedFieldSlug,
          parsed_jd: parsedJd,
        })
        .select('id')
        .single();

      if (jobError) {
        console.error('Error creating job:', jobError);
        throw new Error('Failed to create job');
      }

      // Create application
      const { data: application, error: appError } = await supabaseAdmin
        .from('applications')
        .insert({
          job_id: job.id,
          candidate_id: authenticatedUserId,
          status: 'active',
          current_stage: 'applied',
        })
        .select('id')
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
          event_type: 'created',
          description: 'Application created from URL',
        });

      return new Response(
        JSON.stringify({
          success: true,
          saved: true,
          job: {
            ...jobDetails,
            source_url: url
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if critical fields are missing - signal for manual completion
    const missingFields: string[] = [];
    if (!jobDetails.company_name || jobDetails.company_name === 'Unknown' || jobDetails.company_name.length < 2) {
      missingFields.push('company_name');
    }
    if (!jobDetails.job_title || jobDetails.job_title === 'Unknown' || jobDetails.job_title.length < 2) {
      missingFields.push('job_title');
    }
    
    const requiresCompletion = missingFields.length > 0;

    // Return preview only
    return new Response(
      JSON.stringify({
        success: true,
        saved: false,
        requiresCompletion,
        missingFields,
        scrapeMethod,
        job: {
          ...jobDetails,
          source_url: url
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('scrape-job error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process job posting. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
