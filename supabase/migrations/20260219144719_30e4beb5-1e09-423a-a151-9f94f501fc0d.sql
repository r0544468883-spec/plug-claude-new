
-- ============================================================
-- CAREER SITE BLOCKS (15.1)
-- ============================================================

-- Career sites blocks table
CREATE TABLE IF NOT EXISTS public.career_site_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  career_site_id UUID NOT NULL REFERENCES public.career_sites(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  config JSONB NOT NULL DEFAULT '{}',
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.career_site_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Career site blocks viewable by all"
  ON public.career_site_blocks FOR SELECT USING (true);

CREATE POLICY "Career site blocks editable by owner"
  ON public.career_site_blocks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.career_sites cs
      JOIN public.companies c ON c.id = cs.company_id
      WHERE cs.id = career_site_id AND c.created_by = auth.uid()
    )
  );

CREATE TRIGGER update_career_site_blocks_updated_at
  BEFORE UPDATE ON public.career_site_blocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_career_site_blocks_site_id ON public.career_site_blocks(career_site_id);
CREATE INDEX idx_career_site_blocks_sort ON public.career_site_blocks(career_site_id, sort_order);

-- Career site analytics table
CREATE TABLE IF NOT EXISTS public.career_site_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  career_site_id UUID NOT NULL REFERENCES public.career_sites(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  session_id TEXT,
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.career_site_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Career site analytics insertable by all"
  ON public.career_site_analytics FOR INSERT WITH CHECK (true);

CREATE POLICY "Career site analytics viewable by owner"
  ON public.career_site_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.career_sites cs
      JOIN public.companies c ON c.id = cs.company_id
      WHERE cs.id = career_site_id AND c.created_by = auth.uid()
    )
  );

-- Team stories table
CREATE TABLE IF NOT EXISTS public.career_site_team_stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  career_site_id UUID NOT NULL REFERENCES public.career_sites(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  employee_title TEXT,
  employee_avatar_url TEXT,
  quote TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.career_site_team_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team stories viewable by all"
  ON public.career_site_team_stories FOR SELECT USING (true);

CREATE POLICY "Team stories editable by owner"
  ON public.career_site_team_stories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.career_sites cs
      JOIN public.companies c ON c.id = cs.company_id
      WHERE cs.id = career_site_id AND c.created_by = auth.uid()
    )
  );

-- ============================================================
-- ESIGNATURE WORKFLOW (5.2)
-- ============================================================

-- Document templates
CREATE TABLE IF NOT EXISTS public.document_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  content_html TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Document templates viewable by authenticated"
  ON public.document_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Document templates managed by creator"
  ON public.document_templates FOR ALL
  USING (auth.uid() = created_by);

CREATE TRIGGER update_document_templates_updated_at
  BEFORE UPDATE ON public.document_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Signing documents
CREATE TABLE IF NOT EXISTS public.signing_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_number TEXT UNIQUE NOT NULL,
  created_by UUID NOT NULL,
  template_id UUID REFERENCES public.document_templates(id) ON DELETE SET NULL,
  candidate_id UUID,
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content_html TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  sent_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  signed_at TIMESTAMP WITH TIME ZONE,
  declined_at TIMESTAMP WITH TIME ZONE,
  decline_reason TEXT,
  signature_data TEXT,
  signed_document_url TEXT,
  reminder_sent_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.signing_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signing documents viewable by creator"
  ON public.signing_documents FOR SELECT
  USING (auth.uid() = created_by OR auth.uid() = candidate_id);

CREATE POLICY "Signing documents creatable by HR"
  ON public.signing_documents FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Signing documents updatable by involved parties"
  ON public.signing_documents FOR UPDATE
  USING (auth.uid() = created_by OR auth.uid() = candidate_id);

CREATE TRIGGER update_signing_documents_updated_at
  BEFORE UPDATE ON public.signing_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-generate document number
CREATE SEQUENCE IF NOT EXISTS document_number_seq START 1000;

CREATE OR REPLACE FUNCTION public.generate_document_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.document_number IS NULL OR NEW.document_number = '' THEN
    NEW.document_number := 'DOC-' || LPAD(NEXTVAL('document_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_document_number
  BEFORE INSERT ON public.signing_documents
  FOR EACH ROW EXECUTE FUNCTION public.generate_document_number();

-- Signing document audit trail
CREATE TABLE IF NOT EXISTS public.signing_document_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.signing_documents(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_id UUID,
  actor_name TEXT,
  ip_address TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.signing_document_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit viewable by document creator"
  ON public.signing_document_audit FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.signing_documents sd
      WHERE sd.id = document_id AND sd.created_by = auth.uid()
    )
  );

CREATE POLICY "Audit insertable by authenticated"
  ON public.signing_document_audit FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_signing_documents_created_by ON public.signing_documents(created_by);
CREATE INDEX idx_signing_documents_candidate ON public.signing_documents(candidate_id);
CREATE INDEX idx_signing_document_audit_doc ON public.signing_document_audit(document_id);

-- Seed 3 Hebrew legal document templates
INSERT INTO public.document_templates (created_by, name, description, content_html, category)
SELECT 
  auth.uid(),
  'הסכם עבודה סטנדרטי',
  'הסכם עבודה כללי עם תנאי העסקה בסיסיים',
  '<h1>הסכם עבודה</h1><p>הסכם זה נערך ונחתם בין <strong>{{company_name}}</strong> (להלן: "המעסיק") לבין <strong>{{candidate_name}}</strong> (להלן: "העובד").</p><h2>1. תפקיד ומשרה</h2><p>העובד יועסק בתפקיד {{role_title}} החל מתאריך {{start_date}}.</p><h2>2. שכר</h2><p>שכרו החודשי ברוטו של העובד יהיה {{salary}} ש"ח.</p><h2>3. שעות עבודה</h2><p>העובד יעבוד {{hours_per_week}} שעות שבועיות.</p><h2>4. חופשה שנתית</h2><p>העובד יהיה זכאי ל-{{vacation_days}} ימי חופשה שנתיים.</p><p>_______________________</p><p>חתימת המעסיק</p><p>_______________________</p><p>חתימת העובד</p>',
  'employment'
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.document_templates (created_by, name, description, content_html, category)
SELECT 
  auth.uid(),
  'הסכם סודיות (NDA)',
  'הסכם אי-גילוי מידע סודי',
  '<h1>הסכם סודיות</h1><p>הסכם זה נערך בין <strong>{{company_name}}</strong> לבין <strong>{{candidate_name}}</strong>.</p><h2>1. הגדרת מידע סודי</h2><p>מידע סודי כולל כל מידע עסקי, טכני, פיננסי או מסחרי שנחשף על ידי החברה.</p><h2>2. התחייבויות הנמען</h2><p>הנמען מתחייב לשמור על סודיות המידע ולא לגלותו לצד שלישי כלשהו.</p><h2>3. תקופת ההסכם</h2><p>הסכם זה יהיה בתוקף למשך {{duration}} שנים ממועד חתימתו.</p><p>_______________________</p><p>חתימה</p>',
  'nda'
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.document_templates (created_by, name, description, content_html, category)
SELECT 
  auth.uid(),
  'הצעת עבודה רשמית',
  'מסמך הצעת עבודה פורמלי לשליחה למועמד',
  '<h1>הצעת עבודה</h1><p>ברצוננו להציע לך, <strong>{{candidate_name}}</strong>, משרה ב<strong>{{company_name}}</strong>.</p><h2>פרטי המשרה</h2><ul><li>תפקיד: {{role_title}}</li><li>שכר חודשי: {{salary}} ש"ח ברוטו</li><li>תאריך התחלה: {{start_date}}</li><li>סוג משרה: {{employment_type}}</li></ul><h2>הטבות</h2><p>{{benefits}}</p><p>נשמח לראותך מצטרף/ת לצוות שלנו. אנא חתום/י על הצעה זו לאישורה.</p><p>_______________________</p><p>חתימה</p>',
  'offer'
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;
