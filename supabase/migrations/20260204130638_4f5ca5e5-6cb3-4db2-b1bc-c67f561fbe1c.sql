-- Create table to track crawler runs and discovered jobs
CREATE TABLE public.crawler_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL, -- 'linkedin', 'alljobs', 'drushim'
  search_query TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  jobs_found INTEGER DEFAULT 0,
  jobs_added INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table to store crawler settings per user
CREATE TABLE public.crawler_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  search_queries TEXT[] DEFAULT ARRAY['software engineer', 'product manager', 'developer']::TEXT[],
  platforms TEXT[] DEFAULT ARRAY['linkedin', 'alljobs', 'drushim']::TEXT[],
  locations TEXT[] DEFAULT ARRAY['Israel', 'Tel Aviv', 'Remote']::TEXT[],
  frequency_hours INTEGER DEFAULT 6, -- how often to run
  last_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT crawler_settings_user_unique UNIQUE (user_id)
);

-- Create table to track discovered job URLs to avoid duplicates
CREATE TABLE public.crawler_discovered_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_url TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL,
  title TEXT,
  company_name TEXT,
  discovered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  job_id UUID REFERENCES public.jobs(id),
  status TEXT DEFAULT 'discovered' -- 'discovered', 'processed', 'failed', 'duplicate'
);

-- Enable RLS
ALTER TABLE public.crawler_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crawler_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crawler_discovered_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for crawler_runs (public read, system write)
CREATE POLICY "Anyone can view crawler runs" 
ON public.crawler_runs FOR SELECT USING (true);

-- RLS policies for crawler_settings (user owns their settings)
CREATE POLICY "Users can view own crawler settings" 
ON public.crawler_settings FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own crawler settings" 
ON public.crawler_settings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own crawler settings" 
ON public.crawler_settings FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS policies for discovered jobs (public read)
CREATE POLICY "Anyone can view discovered jobs" 
ON public.crawler_discovered_jobs FOR SELECT USING (true);

-- Create indexes for performance
CREATE INDEX idx_crawler_runs_status ON public.crawler_runs(status);
CREATE INDEX idx_crawler_runs_created_at ON public.crawler_runs(created_at DESC);
CREATE INDEX idx_crawler_discovered_jobs_source_url ON public.crawler_discovered_jobs(source_url);
CREATE INDEX idx_crawler_discovered_jobs_status ON public.crawler_discovered_jobs(status);
CREATE INDEX idx_crawler_settings_user_id ON public.crawler_settings(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_crawler_settings_updated_at
BEFORE UPDATE ON public.crawler_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();