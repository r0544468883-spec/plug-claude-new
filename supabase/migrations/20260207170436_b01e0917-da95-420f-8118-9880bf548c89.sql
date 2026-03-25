-- Enable trigram extension for fuzzy search FIRST
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create master_skills table for global bilingual skill database
CREATE TABLE public.master_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_he TEXT NOT NULL,
  category_en TEXT NOT NULL,
  category_he TEXT NOT NULL,
  skill_type TEXT NOT NULL DEFAULT 'hard' CHECK (skill_type IN ('hard', 'soft')),
  is_custom BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name_en),
  UNIQUE(name_he)
);

-- Enable RLS
ALTER TABLE public.master_skills ENABLE ROW LEVEL SECURITY;

-- Anyone can view skills
CREATE POLICY "Anyone can view skills"
ON public.master_skills FOR SELECT
USING (true);

-- Authenticated users can add custom skills
CREATE POLICY "Authenticated users can add custom skills"
ON public.master_skills FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND is_custom = true);

-- Create index for fuzzy search
CREATE INDEX idx_master_skills_name_en ON public.master_skills USING gin(name_en gin_trgm_ops);
CREATE INDEX idx_master_skills_name_he ON public.master_skills USING gin(name_he gin_trgm_ops);

-- Add weight to vouches table
ALTER TABLE public.vouches ADD COLUMN IF NOT EXISTS weight NUMERIC NOT NULL DEFAULT 1.0;
ALTER TABLE public.vouches ADD COLUMN IF NOT EXISTS skill_ids UUID[] DEFAULT '{}';

-- Create function to calculate vouch weight
CREATE OR REPLACE FUNCTION public.calculate_vouch_weight(giver_id UUID, skill_ids UUID[])
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_weight NUMERIC := 1.0;
  profile_complete BOOLEAN;
  is_recruiter BOOLEAN;
  has_matching_skill BOOLEAN;
BEGIN
  -- Check if high reliability user (complete profile)
  SELECT 
    (p.avatar_url IS NOT NULL AND p.bio IS NOT NULL AND p.experience_years IS NOT NULL)
  INTO profile_complete
  FROM profiles p WHERE p.user_id = giver_id;
  
  IF profile_complete THEN
    base_weight := base_weight + 1.0; -- 2x for complete profile
  END IF;
  
  -- Check if verified recruiter
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = giver_id 
    AND ur.role IN ('freelance_hr', 'inhouse_hr')
  ) INTO is_recruiter;
  
  IF is_recruiter THEN
    base_weight := base_weight * 5.0; -- 5x for recruiters
  END IF;
  
  -- Check domain expert (has same skill in received vouches)
  IF array_length(skill_ids, 1) > 0 THEN
    SELECT EXISTS (
      SELECT 1 FROM vouches v
      WHERE v.to_user_id = giver_id
      AND v.skill_ids && skill_ids
    ) INTO has_matching_skill;
    
    IF has_matching_skill THEN
      base_weight := base_weight * 1.5; -- 1.5x for domain expert
    END IF;
  END IF;
  
  RETURN base_weight;
END;
$$;

-- Insert mega seed data: Software, AI & DevOps - Hard Skills
INSERT INTO public.master_skills (name_en, name_he, category_en, category_he, skill_type) VALUES
('Python', 'פייתון', 'Software, AI & DevOps', 'פיתוח, בינה מלאכותית ודאופס', 'hard'),
('JavaScript', 'ג׳אווהסקריפט', 'Software, AI & DevOps', 'פיתוח, בינה מלאכותית ודאופס', 'hard'),
('TypeScript', 'טייפסקריפט', 'Software, AI & DevOps', 'פיתוח, בינה מלאכותית ודאופס', 'hard'),
('React', 'ריאקט', 'Software, AI & DevOps', 'פיתוח, בינה מלאכותית ודאופס', 'hard'),
('Node.js', 'נוד.ג׳יי.אס', 'Software, AI & DevOps', 'פיתוח, בינה מלאכותית ודאופס', 'hard'),
('AWS', 'אמזון ווב סרוויסס', 'Software, AI & DevOps', 'פיתוח, בינה מלאכותית ודאופס', 'hard'),
('Docker', 'דוקר', 'Software, AI & DevOps', 'פיתוח, בינה מלאכותית ודאופס', 'hard'),
('Kubernetes', 'קוברנטיס', 'Software, AI & DevOps', 'פיתוח, בינה מלאכותית ודאופס', 'hard'),
('Prompt Engineering', 'הנדסת פרומפטים', 'Software, AI & DevOps', 'פיתוח, בינה מלאכותית ודאופס', 'hard'),
('GEO', 'אופטימיזציית מנועי AI', 'Software, AI & DevOps', 'פיתוח, בינה מלאכותית ודאופס', 'hard'),
('RAG', 'ראג', 'Software, AI & DevOps', 'פיתוח, בינה מלאכותית ודאופס', 'hard'),
('Rust', 'ראסט', 'Software, AI & DevOps', 'פיתוח, בינה מלאכותית ודאופס', 'hard'),
('Go', 'גו', 'Software, AI & DevOps', 'פיתוח, בינה מלאכותית ודאופס', 'hard'),
('FastAPI', 'פאסט אי.פי.איי', 'Software, AI & DevOps', 'פיתוח, בינה מלאכותית ודאופס', 'hard'),
('SQL', 'אס.קיו.אל', 'Software, AI & DevOps', 'פיתוח, בינה מלאכותית ודאופס', 'hard'),
('NoSQL', 'נו-אס.קיו.אל', 'Software, AI & DevOps', 'פיתוח, בינה מלאכותית ודאופס', 'hard'),
('CI/CD', 'אינטגרציה רציפה', 'Software, AI & DevOps', 'פיתוח, בינה מלאכותית ודאופס', 'hard'),
('Cyber Security', 'סייבר', 'Software, AI & DevOps', 'פיתוח, בינה מלאכותית ודאופס', 'hard'),
('Mobile Development', 'פיתוח מובייל', 'Software, AI & DevOps', 'פיתוח, בינה מלאכותית ודאופס', 'hard'),
('Backend Development', 'פיתוח צד שרת', 'Software, AI & DevOps', 'פיתוח, בינה מלאכותית ודאופס', 'hard'),
('Technical Intuition', 'אינטואיציה טכנית', 'Software, AI & DevOps', 'פיתוח, בינה מלאכותית ודאופס', 'soft'),
('Self-Learning', 'למידה עצמית', 'Software, AI & DevOps', 'פיתוח, בינה מלאכותית ודאופס', 'soft'),
('Debugging Mindset', 'גישת פתרון בעיות', 'Software, AI & DevOps', 'פיתוח, בינה מלאכותית ודאופס', 'soft'),
('Architectural Thinking', 'חשיבה ארכיטקטונית', 'Software, AI & DevOps', 'פיתוח, בינה מלאכותית ודאופס', 'soft'),
('Team Collaboration', 'עבודה בצוות', 'Software, AI & DevOps', 'פיתוח, בינה מלאכותית ודאופס', 'soft'),
('SEO', 'קידום אורגני', 'Marketing, Growth & Content', 'שיווק, צמיחה ותוכן', 'hard'),
('PPC', 'קמפיינים ממומנים', 'Marketing, Growth & Content', 'שיווק, צמיחה ותוכן', 'hard'),
('Marketing Automation', 'אוטומציה שיווקית', 'Marketing, Growth & Content', 'שיווק, צמיחה ותוכן', 'hard'),
('GA4', 'גוגל אנליטיקס 4', 'Marketing, Growth & Content', 'שיווק, צמיחה ותוכן', 'hard'),
('Growth Hacking', 'האקינג צמיחה', 'Marketing, Growth & Content', 'שיווק, צמיחה ותוכן', 'hard'),
('Content Strategy', 'אסטרטגיית תוכן', 'Marketing, Growth & Content', 'שיווק, צמיחה ותוכן', 'hard'),
('Copywriting', 'קופירייטינג', 'Marketing, Growth & Content', 'שיווק, צמיחה ותוכן', 'hard'),
('HubSpot', 'האבספוט', 'Marketing, Growth & Content', 'שיווק, צמיחה ותוכן', 'hard'),
('Lead Generation', 'יצירת לידים', 'Marketing, Growth & Content', 'שיווק, צמיחה ותוכן', 'hard'),
('Email Marketing', 'שיווק באימייל', 'Marketing, Growth & Content', 'שיווק, צמיחה ותוכן', 'hard'),
('Social Media Marketing', 'רשתות חברתיות', 'Marketing, Growth & Content', 'שיווק, צמיחה ותוכן', 'hard'),
('Affiliate Marketing', 'שיווק שותפים', 'Marketing, Growth & Content', 'שיווק, צמיחה ותוכן', 'hard'),
('CRO', 'אופטימיזציית המרות', 'Marketing, Growth & Content', 'שיווק, צמיחה ותוכן', 'hard'),
('B2B Marketing', 'שיווק B2B', 'Marketing, Growth & Content', 'שיווק, צמיחה ותוכן', 'hard'),
('Brand Identity', 'זהות מותג', 'Marketing, Growth & Content', 'שיווק, צמיחה ותוכן', 'hard'),
('CRM Management', 'ניהול CRM', 'Marketing, Growth & Content', 'שיווק, צמיחה ותוכן', 'hard'),
('Video Editing', 'עריכת וידאו', 'Marketing, Growth & Content', 'שיווק, צמיחה ותוכן', 'hard'),
('Sales Funnels', 'משפכי מכירות', 'Marketing, Growth & Content', 'שיווק, צמיחה ותוכן', 'hard'),
('Influencer Marketing', 'שיווק משפיענים', 'Marketing, Growth & Content', 'שיווק, צמיחה ותוכן', 'hard'),
('Market Research', 'מחקר שוק', 'Marketing, Growth & Content', 'שיווק, צמיחה ותוכן', 'hard'),
('Creative Flair', 'יצירתיות', 'Marketing, Growth & Content', 'שיווק, צמיחה ותוכן', 'soft'),
('Analytical Mind', 'חשיבה אנליטית', 'Marketing, Growth & Content', 'שיווק, צמיחה ותוכן', 'soft'),
('Storytelling', 'סיפור סיפורים', 'Marketing, Growth & Content', 'שיווק, צמיחה ותוכן', 'soft'),
('Customer Empathy', 'אמפתיה ללקוח', 'Marketing, Growth & Content', 'שיווק, צמיחה ותוכן', 'soft'),
('Trend Spotting', 'זיהוי טרנדים', 'Marketing, Growth & Content', 'שיווק, צמיחה ותוכן', 'soft'),
('Financial Reporting', 'דיווח פיננסי', 'Finance & Accounting', 'כספים וחשבונאות', 'hard'),
('Auditing', 'ביקורת', 'Finance & Accounting', 'כספים וחשבונאות', 'hard'),
('IFRS', 'תקני IFRS', 'Finance & Accounting', 'כספים וחשבונאות', 'hard'),
('GAAP', 'תקני GAAP', 'Finance & Accounting', 'כספים וחשבונאות', 'hard'),
('Tax Planning', 'תכנון מס', 'Finance & Accounting', 'כספים וחשבונאות', 'hard'),
('Payroll Management', 'ניהול שכר', 'Finance & Accounting', 'כספים וחשבונאות', 'hard'),
('ERP Systems', 'מערכות ERP', 'Finance & Accounting', 'כספים וחשבונאות', 'hard'),
('Cash Flow Management', 'תזרים מזומנים', 'Finance & Accounting', 'כספים וחשבונאות', 'hard'),
('Consolidation', 'איחוד דוחות', 'Finance & Accounting', 'כספים וחשבונאות', 'hard'),
('Cost Accounting', 'חשבונאות עלויות', 'Finance & Accounting', 'כספים וחשבונאות', 'hard'),
('Forensic Accounting', 'חשבונאות משפטית', 'Finance & Accounting', 'כספים וחשבונאות', 'hard'),
('Budgeting', 'תקצוב', 'Finance & Accounting', 'כספים וחשבונאות', 'hard'),
('Revenue Recognition', 'הכרה בהכנסות', 'Finance & Accounting', 'כספים וחשבונאות', 'hard'),
('VAT Filing', 'דיווח מע״מ', 'Finance & Accounting', 'כספים וחשבונאות', 'hard'),
('Financial Analysis', 'אנליזה פיננסית', 'Finance & Accounting', 'כספים וחשבונאות', 'hard'),
('Excel Advanced', 'אקסל מתקדם', 'Finance & Accounting', 'כספים וחשבונאות', 'hard'),
('General Ledger', 'ספר ראשי', 'Finance & Accounting', 'כספים וחשבונאות', 'hard'),
('M&A', 'מיזוגים ורכישות', 'Finance & Accounting', 'כספים וחשבונאות', 'hard'),
('Fundraising', 'גיוס הון', 'Finance & Accounting', 'כספים וחשבונאות', 'hard'),
('Risk Management', 'ניהול סיכונים', 'Finance & Accounting', 'כספים וחשבונאות', 'hard'),
('Ethical Judgment', 'שיקול דעת אתי', 'Finance & Accounting', 'כספים וחשבונאות', 'soft'),
('Attention to Detail', 'ירידה לפרטים', 'Finance & Accounting', 'כספים וחשבונאות', 'soft'),
('Professional Integrity', 'יושרה מקצועית', 'Finance & Accounting', 'כספים וחשבונאות', 'soft'),
('Stress Management', 'עמידה בלחץ', 'Finance & Accounting', 'כספים וחשבונאות', 'soft'),
('Precision', 'דיוק', 'Finance & Accounting', 'כספים וחשבונאות', 'soft'),
('Machine Learning', 'למידת מכונה', 'Data Science & BI', 'דאטה ובינה עסקית', 'hard'),
('Data Visualization', 'ויזואליזציה', 'Data Science & BI', 'דאטה ובינה עסקית', 'hard'),
('Power BI', 'פאוור BI', 'Data Science & BI', 'דאטה ובינה עסקית', 'hard'),
('Tableau', 'טאבלו', 'Data Science & BI', 'דאטה ובינה עסקית', 'hard'),
('ETL', 'תהליכי ETL', 'Data Science & BI', 'דאטה ובינה עסקית', 'hard'),
('Statistics', 'סטטיסטיקה', 'Data Science & BI', 'דאטה ובינה עסקית', 'hard'),
('Data Warehousing', 'מחסני נתונים', 'Data Science & BI', 'דאטה ובינה עסקית', 'hard'),
('Big Data', 'ביג דאטה', 'Data Science & BI', 'דאטה ובינה עסקית', 'hard'),
('Predictive Modeling', 'מודלים חיזויים', 'Data Science & BI', 'דאטה ובינה עסקית', 'hard'),
('A/B Testing', 'בדיקות A/B', 'Data Science & BI', 'דאטה ובינה עסקית', 'hard'),
('NLP', 'עיבוד שפה טבעית', 'Data Science & BI', 'דאטה ובינה עסקית', 'hard'),
('Data Governance', 'ממשל נתונים', 'Data Science & BI', 'דאטה ובינה עסקית', 'hard'),
('Feature Engineering', 'הנדסת פיצ׳רים', 'Data Science & BI', 'דאטה ובינה עסקית', 'hard'),
('Neural Networks', 'רשתות נוירונים', 'Data Science & BI', 'דאטה ובינה עסקית', 'hard'),
('Python for Data', 'פייתון לדאטה', 'Data Science & BI', 'דאטה ובינה עסקית', 'hard'),
('Quantitative Research', 'מחקר כמותי', 'Data Science & BI', 'דאטה ובינה עסקית', 'hard'),
('Data Storytelling', 'סיפור נתונים', 'Data Science & BI', 'דאטה ובינה עסקית', 'hard'),
('MLOps', 'אופרציות ML', 'Data Science & BI', 'דאטה ובינה עסקית', 'hard'),
('Business Intelligence', 'בינה עסקית', 'Data Science & BI', 'דאטה ובינה עסקית', 'hard'),
('Intellectual Curiosity', 'סקרנות אינטלקטואלית', 'Data Science & BI', 'דאטה ובינה עסקית', 'soft'),
('Logical Reasoning', 'היסק לוגי', 'Data Science & BI', 'דאטה ובינה עסקית', 'soft'),
('Insight Intuition', 'אינטואיציה לתובנות', 'Data Science & BI', 'דאטה ובינה עסקית', 'soft'),
('Clarity of Expression', 'בהירות בהבעה', 'Data Science & BI', 'דאטה ובינה עסקית', 'soft'),
('Objective Observation', 'תצפית אובייקטיבית', 'Data Science & BI', 'דאטה ובינה עסקית', 'soft'),
('UI Design', 'עיצוב ממשק', 'Product, Design & HR', 'מוצר, עיצוב ומשאבי אנוש', 'hard'),
('UX Research', 'מחקר חווית משתמש', 'Product, Design & HR', 'מוצר, עיצוב ומשאבי אנוש', 'hard'),
('Figma', 'פיגמה', 'Product, Design & HR', 'מוצר, עיצוב ומשאבי אנוש', 'hard'),
('Product Roadmap', 'מפת דרכים מוצרית', 'Product, Design & HR', 'מוצר, עיצוב ומשאבי אנוש', 'hard'),
('Wireframing', 'ווייירפריימים', 'Product, Design & HR', 'מוצר, עיצוב ומשאבי אנוש', 'hard'),
('Agile/Scrum', 'אג׳ייל/סקראם', 'Product, Design & HR', 'מוצר, עיצוב ומשאבי אנוש', 'hard'),
('User Journeys', 'מסעות משתמש', 'Product, Design & HR', 'מוצר, עיצוב ומשאבי אנוש', 'hard'),
('Accessibility', 'נגישות', 'Product, Design & HR', 'מוצר, עיצוב ומשאבי אנוש', 'hard'),
('Talent Acquisition', 'גיוס טאלנטים', 'Product, Design & HR', 'מוצר, עיצוב ומשאבי אנוש', 'hard'),
('Technical Sourcing', 'סורסינג טכנולוגי', 'Product, Design & HR', 'מוצר, עיצוב ומשאבי אנוש', 'hard'),
('Employer Branding', 'מיתוג מעסיק', 'Product, Design & HR', 'מוצר, עיצוב ומשאבי אנוש', 'hard'),
('Sales Pipeline', 'צינור מכירות', 'Product, Design & HR', 'מוצר, עיצוב ומשאבי אנוש', 'hard'),
('B2B Sales', 'מכירות B2B', 'Product, Design & HR', 'מוצר, עיצוב ומשאבי אנוש', 'hard'),
('Customer Success', 'הצלחת לקוחות', 'Product, Design & HR', 'מוצר, עיצוב ומשאבי אנוש', 'hard'),
('Supply Chain', 'שרשרת אספקה', 'Product, Design & HR', 'מוצר, עיצוב ומשאבי אנוש', 'hard'),
('Leadership', 'מנהיגות', 'Product, Design & HR', 'מוצר, עיצוב ומשאבי אנוש', 'soft'),
('Networking', 'נטוורקינג', 'Product, Design & HR', 'מוצר, עיצוב ומשאבי אנוש', 'soft'),
('Resilience', 'חוסן נפשי', 'Product, Design & HR', 'מוצר, עיצוב ומשאבי אנוש', 'soft'),
('Persuasion', 'שכנוע', 'Product, Design & HR', 'מוצר, עיצוב ומשאבי אנוש', 'soft'),
('Emotional Intelligence', 'אינטליגנציה רגשית', 'Product, Design & HR', 'מוצר, עיצוב ומשאבי אנוש', 'soft');