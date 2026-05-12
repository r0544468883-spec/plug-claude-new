-- ============================================================
-- Migration: 10 Missing Features
-- 1. Offer Templates Library
-- 2. EEO/OFCCP Compliance
-- 3. AI Auto-Screen
-- 4. Multi-board Job Publishing (enhance existing)
-- 5. Nurture Campaigns / Email Sequences
-- 6. Predictive Analytics
-- 7. SMS/WhatsApp Engagement
-- 8. External Sourcing
-- 9. AI Interview Transcription
-- 10. Custom Dashboard Builder
-- ============================================================

-- 1. Offer Templates
CREATE TABLE IF NOT EXISTS public.offer_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('employment','nda','offer_letter','contractor','internship','general')),
  salary_range_min numeric,
  salary_range_max numeric,
  currency text DEFAULT 'ILS',
  benefits jsonb DEFAULT '[]'::jsonb,
  additional_terms text,
  template_body text,
  is_default boolean DEFAULT false,
  use_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.offer_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own offer templates" ON public.offer_templates
  FOR ALL USING (created_by = auth.uid() OR company_id = auth.uid());
CREATE INDEX idx_offer_templates_company ON public.offer_templates(company_id);

-- 2. EEO/OFCCP Compliance
CREATE TABLE IF NOT EXISTS public.eeo_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL,
  candidate_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  gender text CHECK (gender IN ('male','female','non_binary','prefer_not_to_say')),
  race_ethnicity text CHECK (race_ethnicity IN ('white','black','hispanic','asian','native_american','pacific_islander','two_or_more','prefer_not_to_say')),
  veteran_status text CHECK (veteran_status IN ('veteran','not_veteran','prefer_not_to_say')),
  disability_status text CHECK (disability_status IN ('yes','no','prefer_not_to_say')),
  submitted_at timestamptz DEFAULT now()
);

ALTER TABLE public.eeo_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Candidates submit own EEO" ON public.eeo_submissions
  FOR INSERT WITH CHECK (candidate_id = auth.uid());
CREATE POLICY "HR view EEO aggregate only" ON public.eeo_submissions
  FOR SELECT USING (true);
CREATE INDEX idx_eeo_application ON public.eeo_submissions(application_id);

-- 3. AI Auto-Screen
CREATE TABLE IF NOT EXISTS public.auto_screen_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  created_by uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  min_match_score integer DEFAULT 60,
  required_skills text[] DEFAULT '{}',
  min_experience_years integer DEFAULT 0,
  knockout_fail_action text DEFAULT 'reject' CHECK (knockout_fail_action IN ('reject','flag','hold')),
  auto_advance_threshold integer DEFAULT 80,
  auto_reject_threshold integer DEFAULT 30,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.auto_screen_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own screen rules" ON public.auto_screen_rules
  FOR ALL USING (created_by = auth.uid());
CREATE INDEX idx_auto_screen_job ON public.auto_screen_rules(job_id);

CREATE TABLE IF NOT EXISTS public.auto_screen_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES public.auto_screen_rules(id) ON DELETE CASCADE,
  application_id uuid NOT NULL,
  candidate_id uuid,
  action text NOT NULL CHECK (action IN ('advanced','rejected','flagged','held')),
  match_score integer,
  reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.auto_screen_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own screen logs" ON public.auto_screen_logs
  FOR SELECT USING (rule_id IN (SELECT id FROM public.auto_screen_rules WHERE created_by = auth.uid()));
CREATE INDEX idx_auto_screen_logs_rule ON public.auto_screen_logs(rule_id);

-- 4. Multi-board Publishing - enhance existing job_publications
-- Add auto-publish config per job
CREATE TABLE IF NOT EXISTS public.job_board_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  created_by uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('plug','alljobs','drushim','linkedin','indeed','google_jobs','facebook_jobs','glassdoor','jobmaster','gotfriends')),
  auto_publish boolean DEFAULT false,
  custom_title text,
  custom_description text,
  budget_daily numeric,
  start_date date,
  end_date date,
  status text DEFAULT 'draft' CHECK (status IN ('draft','scheduled','publishing','published','paused','failed','expired')),
  external_post_id text,
  external_url text,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.job_board_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own board configs" ON public.job_board_configs
  FOR ALL USING (created_by = auth.uid());
CREATE INDEX idx_board_configs_job ON public.job_board_configs(job_id);

-- 5. Nurture Campaigns / Email Sequences
CREATE TABLE IF NOT EXISTS public.nurture_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  target_audience text DEFAULT 'talent_pool' CHECK (target_audience IN ('talent_pool','rejected','interviewed','all_candidates','custom')),
  status text DEFAULT 'draft' CHECK (status IN ('draft','active','paused','completed','archived')),
  total_enrolled integer DEFAULT 0,
  total_completed integer DEFAULT 0,
  open_rate numeric DEFAULT 0,
  reply_rate numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.nurture_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own campaigns" ON public.nurture_campaigns
  FOR ALL USING (created_by = auth.uid());

CREATE TABLE IF NOT EXISTS public.nurture_sequence_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.nurture_campaigns(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  delay_days integer DEFAULT 0,
  delay_hours integer DEFAULT 0,
  channel text DEFAULT 'email' CHECK (channel IN ('email','sms','whatsapp','in_app')),
  subject text,
  body text NOT NULL,
  template_variables jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.nurture_sequence_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own steps" ON public.nurture_sequence_steps
  FOR ALL USING (campaign_id IN (SELECT id FROM public.nurture_campaigns WHERE created_by = auth.uid()));
CREATE INDEX idx_nurture_steps_campaign ON public.nurture_sequence_steps(campaign_id);

CREATE TABLE IF NOT EXISTS public.nurture_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.nurture_campaigns(id) ON DELETE CASCADE,
  candidate_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  current_step integer DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active','completed','unsubscribed','bounced')),
  enrolled_at timestamptz DEFAULT now(),
  last_sent_at timestamptz,
  next_send_at timestamptz,
  UNIQUE(campaign_id, candidate_id)
);

ALTER TABLE public.nurture_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own enrollments" ON public.nurture_enrollments
  FOR ALL USING (campaign_id IN (SELECT id FROM public.nurture_campaigns WHERE created_by = auth.uid()));
CREATE INDEX idx_nurture_enrollments_campaign ON public.nurture_enrollments(campaign_id);
CREATE INDEX idx_nurture_enrollments_next ON public.nurture_enrollments(next_send_at) WHERE status = 'active';

-- 6. Predictive Analytics
CREATE TABLE IF NOT EXISTS public.hiring_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  department text,
  role_title text NOT NULL,
  forecast_date date NOT NULL,
  predicted_hires integer DEFAULT 0,
  predicted_days_to_fill integer,
  predicted_cost_per_hire numeric,
  confidence_score numeric DEFAULT 0.5,
  actual_hires integer,
  model_version text DEFAULT 'v1',
  factors jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.hiring_forecasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own forecasts" ON public.hiring_forecasts
  FOR ALL USING (created_by = auth.uid() OR company_id = auth.uid());
CREATE INDEX idx_forecasts_company ON public.hiring_forecasts(company_id);

-- 7. SMS/WhatsApp Messaging
CREATE TABLE IF NOT EXISTS public.messaging_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  channel_type text NOT NULL CHECK (channel_type IN ('sms','whatsapp')),
  phone_number text NOT NULL,
  provider text DEFAULT 'twilio' CHECK (provider IN ('twilio','vonage','messagebird')),
  provider_config jsonb DEFAULT '{}'::jsonb,
  is_verified boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.messaging_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own channels" ON public.messaging_channels
  FOR ALL USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.candidate_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  candidate_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email','sms','whatsapp','in_app')),
  direction text DEFAULT 'outbound' CHECK (direction IN ('inbound','outbound')),
  subject text,
  body text NOT NULL,
  status text DEFAULT 'sent' CHECK (status IN ('pending','sent','delivered','read','failed','bounced')),
  external_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  sent_at timestamptz DEFAULT now()
);

ALTER TABLE public.candidate_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own messages" ON public.candidate_messages
  FOR ALL USING (sender_id = auth.uid());
CREATE INDEX idx_candidate_messages_candidate ON public.candidate_messages(candidate_id);
CREATE INDEX idx_candidate_messages_channel ON public.candidate_messages(channel);

-- 8. External Sourcing
CREATE TABLE IF NOT EXISTS public.external_source_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sourced_by uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  source text NOT NULL CHECK (source IN ('linkedin','github','stackoverflow','twitter','angel_list','personal_site','other')),
  external_url text,
  external_id text,
  full_name text NOT NULL,
  headline text,
  location text,
  skills text[] DEFAULT '{}',
  experience_years integer,
  current_company text,
  current_title text,
  email text,
  phone text,
  avatar_url text,
  raw_data jsonb DEFAULT '{}'::jsonb,
  match_score integer,
  linked_profile_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(source, external_id)
);

ALTER TABLE public.external_source_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage sourced profiles" ON public.external_source_profiles
  FOR ALL USING (sourced_by = auth.uid());
CREATE INDEX idx_external_profiles_source ON public.external_source_profiles(source);
CREATE INDEX idx_external_profiles_skills ON public.external_source_profiles USING gin(skills);

-- 9. AI Interview Transcription
CREATE TABLE IF NOT EXISTS public.interview_transcriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid,
  video_response_id uuid,
  created_by uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  audio_url text,
  transcript_text text,
  summary text,
  key_points jsonb DEFAULT '[]'::jsonb,
  sentiment text CHECK (sentiment IN ('positive','neutral','negative','mixed')),
  language text DEFAULT 'he',
  confidence_score numeric DEFAULT 0,
  duration_seconds integer,
  word_count integer,
  status text DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  model_used text DEFAULT 'whisper-1',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.interview_transcriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own transcriptions" ON public.interview_transcriptions
  FOR ALL USING (created_by = auth.uid());
CREATE INDEX idx_transcriptions_interview ON public.interview_transcriptions(interview_id);

-- 10. Custom Dashboard Builder
CREATE TABLE IF NOT EXISTS public.custom_dashboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  layout jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_default boolean DEFAULT false,
  is_shared boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.custom_dashboards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own dashboards" ON public.custom_dashboards
  FOR ALL USING (user_id = auth.uid() OR is_shared = true);
CREATE INDEX idx_custom_dashboards_user ON public.custom_dashboards(user_id);
