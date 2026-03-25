
-- Sprint 1: Video Interviews, Scorecards, Easy Apply, Career Sites, Email Sequences, Offers, Salary Data

-- 1.1 Video Interviews
CREATE TABLE IF NOT EXISTS video_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL,
  job_id UUID REFERENCES jobs(id),
  title TEXT NOT NULL,
  instructions TEXT,
  deadline TIMESTAMPTZ,
  max_retakes INTEGER DEFAULT 1,
  think_time_seconds INTEGER DEFAULT 30,
  answer_time_seconds INTEGER DEFAULT 120,
  status TEXT DEFAULT 'active' CHECK (status IN ('draft','active','closed','archived')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS video_interview_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID REFERENCES video_interviews(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_order INTEGER NOT NULL,
  question_type TEXT DEFAULT 'open' CHECK (question_type IN ('open','situational','technical','behavioral')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS video_interview_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID REFERENCES video_interviews(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL,
  question_id UUID REFERENCES video_interview_questions(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  duration_seconds INTEGER,
  retake_number INTEGER DEFAULT 1,
  submitted_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS video_interview_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID REFERENCES video_interview_responses(id) ON DELETE CASCADE,
  rated_by UUID NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(response_id, rated_by)
);

ALTER TABLE video_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_interview_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_interview_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vi_creators_manage" ON video_interviews FOR ALL USING (auth.uid() = created_by);
CREATE POLICY "vi_candidates_view_active" ON video_interviews FOR SELECT USING (status = 'active');
CREATE POLICY "viq_creators_manage" ON video_interview_questions FOR ALL USING (
  interview_id IN (SELECT id FROM video_interviews WHERE created_by = auth.uid())
);
CREATE POLICY "viq_public_view" ON video_interview_questions FOR SELECT USING (true);
CREATE POLICY "vir_candidates_own" ON video_interview_responses FOR ALL USING (auth.uid() = candidate_id);
CREATE POLICY "vir_creators_view" ON video_interview_responses FOR SELECT USING (
  interview_id IN (SELECT id FROM video_interviews WHERE created_by = auth.uid())
);
CREATE POLICY "virat_raters_manage" ON video_interview_ratings FOR ALL USING (auth.uid() = rated_by);
CREATE POLICY "virat_creators_view" ON video_interview_ratings FOR SELECT USING (
  response_id IN (
    SELECT vir.id FROM video_interview_responses vir
    JOIN video_interviews vi ON vi.id = vir.interview_id
    WHERE vi.created_by = auth.uid()
  )
);

-- 1.2 Scorecards
CREATE TABLE IF NOT EXISTS scorecard_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL,
  job_id UUID REFERENCES jobs(id),
  name TEXT NOT NULL,
  criteria JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES scorecard_templates(id),
  candidate_id UUID NOT NULL,
  interviewer_id UUID NOT NULL,
  interview_type TEXT CHECK (interview_type IN ('phone','video','onsite','technical','hr','final')),
  scores JSONB NOT NULL DEFAULT '{}',
  overall_score NUMERIC(3,1),
  overall_recommendation TEXT CHECK (overall_recommendation IN ('strong_yes','yes','neutral','no','strong_no')),
  general_notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(template_id, candidate_id, interviewer_id)
);

ALTER TABLE scorecard_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sc_creators_manage_templates" ON scorecard_templates FOR ALL USING (auth.uid() = created_by);
CREATE POLICY "sc_interviewers_submit" ON scorecards FOR INSERT WITH CHECK (auth.uid() = interviewer_id);
CREATE POLICY "sc_team_view" ON scorecards FOR SELECT USING (
  template_id IN (SELECT id FROM scorecard_templates WHERE created_by = auth.uid())
  OR interviewer_id = auth.uid()
);
CREATE POLICY "sc_interviewers_update" ON scorecards FOR UPDATE USING (auth.uid() = interviewer_id);

-- 1.3 Easy Apply column
ALTER TABLE applications ADD COLUMN IF NOT EXISTS apply_method TEXT DEFAULT 'manual' CHECK (apply_method IN ('manual','easy_apply','plug_ai'));
ALTER TABLE applications ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;

-- 1.4 Career Sites
CREATE TABLE IF NOT EXISTS career_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE,
  slug TEXT UNIQUE NOT NULL,
  company_name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  logo_url TEXT,
  cover_image_url TEXT,
  video_url TEXT,
  primary_color TEXT DEFAULT '#00FF9D',
  secondary_color TEXT DEFAULT '#B794F4',
  culture_text TEXT,
  benefits JSONB DEFAULT '[]',
  social_links JSONB DEFAULT '{}',
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS career_site_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  career_site_id UUID REFERENCES career_sites(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  page_views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  applications INTEGER DEFAULT 0,
  source TEXT,
  UNIQUE(career_site_id, date, source)
);

ALTER TABLE career_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_site_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cs_company_manages" ON career_sites FOR ALL USING (auth.uid() = company_id);
CREATE POLICY "cs_public_view_published" ON career_sites FOR SELECT USING (is_published = true);
CREATE POLICY "css_company_view" ON career_site_stats FOR SELECT USING (
  career_site_id IN (SELECT id FROM career_sites WHERE company_id = auth.uid())
);
CREATE POLICY "css_company_manage" ON career_site_stats FOR ALL USING (
  career_site_id IN (SELECT id FROM career_sites WHERE company_id = auth.uid())
);

-- 1.5 Email Sequences
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  trigger_stage TEXT CHECK (trigger_stage IN ('applied','screening','interview_scheduled','interviewed','offer','rejected','hired')),
  delay_hours INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES email_templates(id),
  candidate_id UUID,
  sent_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent','delivered','opened','clicked','failed'))
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "et_creators_manage" ON email_templates FOR ALL USING (auth.uid() = created_by);
CREATE POLICY "el_creators_view" ON email_logs FOR SELECT USING (
  template_id IN (SELECT id FROM email_templates WHERE created_by = auth.uid())
);
CREATE POLICY "el_creators_manage" ON email_logs FOR ALL USING (
  template_id IN (SELECT id FROM email_templates WHERE created_by = auth.uid())
);

-- 1.6 Offers
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL,
  candidate_id UUID NOT NULL,
  job_id UUID REFERENCES jobs(id),
  salary_gross INTEGER NOT NULL,
  salary_currency TEXT DEFAULT 'ILS',
  start_date DATE,
  benefits JSONB DEFAULT '[]',
  additional_terms TEXT,
  expiry_date DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','viewed','accepted','declined','expired','countered')),
  candidate_response TEXT,
  signature_url TEXT,
  signed_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "of_creators_manage" ON offers FOR ALL USING (auth.uid() = created_by);
CREATE POLICY "of_candidates_view_own" ON offers FOR SELECT USING (auth.uid() = candidate_id);
CREATE POLICY "of_candidates_respond" ON offers FOR UPDATE USING (auth.uid() = candidate_id);

-- 1.8 Salary Data
CREATE TABLE IF NOT EXISTS salary_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_role TEXT NOT NULL,
  experience_years INTEGER,
  location TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  salary_median INTEGER,
  currency TEXT DEFAULT 'ILS',
  sample_size INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE salary_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sd_public_view" ON salary_data FOR SELECT USING (true);

-- Seed salary data
INSERT INTO salary_data (job_role, experience_years, location, salary_min, salary_max, salary_median, sample_size) VALUES
('Frontend Developer', 2, 'תל אביב', 18000, 28000, 22000, 50),
('Frontend Developer', 5, 'תל אביב', 28000, 42000, 34000, 40),
('Backend Developer', 2, 'תל אביב', 20000, 30000, 24000, 45),
('Backend Developer', 5, 'תל אביב', 30000, 48000, 38000, 35),
('Full Stack Developer', 3, 'תל אביב', 22000, 35000, 28000, 55),
('Product Manager', 3, 'תל אביב', 25000, 40000, 32000, 30),
('Data Analyst', 2, 'תל אביב', 16000, 25000, 20000, 25),
('DevOps Engineer', 3, 'תל אביב', 28000, 42000, 35000, 20),
('QA Engineer', 2, 'תל אביב', 15000, 24000, 19000, 35),
('UX Designer', 3, 'תל אביב', 18000, 30000, 23000, 20)
ON CONFLICT DO NOTHING;

-- Storage bucket for video interviews
INSERT INTO storage.buckets (id, name, public) VALUES ('video-interviews', 'video-interviews', false) ON CONFLICT DO NOTHING;

CREATE POLICY "vi_storage_authenticated" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'video-interviews' AND auth.uid() IS NOT NULL);
CREATE POLICY "vi_storage_view" ON storage.objects FOR SELECT USING (bucket_id = 'video-interviews' AND auth.uid() IS NOT NULL);
