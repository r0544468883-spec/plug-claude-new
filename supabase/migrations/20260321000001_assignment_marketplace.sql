-- Home Assignments Marketplace
-- Run in Supabase Dashboard SQL Editor

CREATE TABLE IF NOT EXISTS assignment_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT,               -- 'frontend' | 'backend' | 'data' | 'design' | 'product' | 'other'
  difficulty TEXT,             -- 'easy' | 'medium' | 'hard'
  estimated_hours NUMERIC,
  file_url TEXT,               -- downloadable brief file (from home-assignments bucket)
  view_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  template_id UUID REFERENCES assignment_templates(id) ON DELETE CASCADE NOT NULL,
  submitted_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  notes TEXT,
  file_url TEXT NOT NULL,
  is_public BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'pending',   -- 'pending' | 'viewed' | 'starred' | 'rejected'
  recruiter_notes TEXT,            -- private, only poster sees
  recruiter_rating INT,            -- 1-5, only poster sets
  UNIQUE(template_id, submitted_by)
);

ALTER TABLE assignment_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;

-- Templates RLS
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view active assignments' AND tablename = 'assignment_templates') THEN
    CREATE POLICY "Anyone can view active assignments" ON assignment_templates FOR SELECT USING (is_active = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated can create assignment' AND tablename = 'assignment_templates') THEN
    CREATE POLICY "Authenticated can create assignment" ON assignment_templates FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Creator can update assignment' AND tablename = 'assignment_templates') THEN
    CREATE POLICY "Creator can update assignment" ON assignment_templates FOR UPDATE TO authenticated USING (auth.uid() = created_by);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Creator can delete assignment' AND tablename = 'assignment_templates') THEN
    CREATE POLICY "Creator can delete assignment" ON assignment_templates FOR DELETE TO authenticated USING (auth.uid() = created_by);
  END IF;
END $$;

-- Submissions RLS
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public submissions visible to all' AND tablename = 'assignment_submissions') THEN
    CREATE POLICY "Public submissions visible to all" ON assignment_submissions FOR SELECT USING (is_public = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Submitter sees own submission' AND tablename = 'assignment_submissions') THEN
    CREATE POLICY "Submitter sees own submission" ON assignment_submissions FOR SELECT TO authenticated USING (auth.uid() = submitted_by);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Poster sees submissions on their templates' AND tablename = 'assignment_submissions') THEN
    CREATE POLICY "Poster sees submissions on their templates" ON assignment_submissions FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM assignment_templates t WHERE t.id = template_id AND t.created_by = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated can submit solution' AND tablename = 'assignment_submissions') THEN
    CREATE POLICY "Authenticated can submit solution" ON assignment_submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = submitted_by);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Submitter can update own submission' AND tablename = 'assignment_submissions') THEN
    CREATE POLICY "Submitter can update own submission" ON assignment_submissions FOR UPDATE TO authenticated USING (auth.uid() = submitted_by);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Poster can rate and note submissions' AND tablename = 'assignment_submissions') THEN
    CREATE POLICY "Poster can rate and note submissions" ON assignment_submissions FOR UPDATE TO authenticated
      USING (EXISTS (SELECT 1 FROM assignment_templates t WHERE t.id = template_id AND t.created_by = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Submitter can delete own submission' AND tablename = 'assignment_submissions') THEN
    CREATE POLICY "Submitter can delete own submission" ON assignment_submissions FOR DELETE TO authenticated USING (auth.uid() = submitted_by);
  END IF;
END $$;

-- Storage policies for home-assignments bucket
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated can upload to home-assignments' AND tablename = 'objects') THEN
    CREATE POLICY "Authenticated can upload to home-assignments" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'home-assignments');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated can read home-assignments' AND tablename = 'objects') THEN
    CREATE POLICY "Authenticated can read home-assignments" ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'home-assignments');
  END IF;
END $$;

-- Ensure home-assignments bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('home-assignments', 'home-assignments', false)
ON CONFLICT (id) DO NOTHING;
