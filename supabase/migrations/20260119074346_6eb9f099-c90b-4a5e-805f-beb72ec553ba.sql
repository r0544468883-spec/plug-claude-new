-- Create job_fields table (main categories/domains)
CREATE TABLE public.job_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_he TEXT NOT NULL,
  icon TEXT DEFAULT 'briefcase',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create experience_levels table (independent of field/role)
CREATE TABLE public.experience_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_he TEXT NOT NULL,
  years_min INTEGER NOT NULL DEFAULT 0,
  years_max INTEGER,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create job_roles table (roles within each field)
CREATE TABLE public.job_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  field_id UUID NOT NULL REFERENCES public.job_fields(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_he TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(field_id, slug)
);

-- Enable RLS on all new tables
ALTER TABLE public.job_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_roles ENABLE ROW LEVEL SECURITY;

-- Everyone can read job_fields, experience_levels, and job_roles (reference data)
CREATE POLICY "Anyone can view job fields" ON public.job_fields FOR SELECT USING (true);
CREATE POLICY "Anyone can view experience levels" ON public.experience_levels FOR SELECT USING (true);
CREATE POLICY "Anyone can view job roles" ON public.job_roles FOR SELECT USING (true);

-- Add new columns to jobs table
ALTER TABLE public.jobs 
  ADD COLUMN field_id UUID REFERENCES public.job_fields(id),
  ADD COLUMN role_id UUID REFERENCES public.job_roles(id),
  ADD COLUMN experience_level_id UUID REFERENCES public.experience_levels(id);

-- Add new columns to profiles table for job seeker preferences
ALTER TABLE public.profiles
  ADD COLUMN preferred_fields UUID[] DEFAULT '{}',
  ADD COLUMN preferred_roles UUID[] DEFAULT '{}',
  ADD COLUMN experience_years INTEGER,
  ADD COLUMN preferred_experience_level_id UUID REFERENCES public.experience_levels(id);

-- Create indexes for better query performance
CREATE INDEX idx_jobs_field_id ON public.jobs(field_id);
CREATE INDEX idx_jobs_role_id ON public.jobs(role_id);
CREATE INDEX idx_jobs_experience_level_id ON public.jobs(experience_level_id);
CREATE INDEX idx_job_roles_field_id ON public.job_roles(field_id);

-- Seed experience levels
INSERT INTO public.experience_levels (slug, name_en, name_he, years_min, years_max, display_order) VALUES
  ('entry', 'Entry Level / Student', 'ללא ניסיון / סטודנט', 0, 0, 1),
  ('junior', 'Junior', 'זוטר', 1, 2, 2),
  ('mid', 'Mid-Level', 'בינוני', 3, 5, 3),
  ('senior', 'Senior', 'בכיר', 6, 10, 4),
  ('lead', 'Lead / Team Lead', 'מוביל / ראש צוות', 8, 15, 5),
  ('executive', 'Executive / Director', 'מנהל בכיר / דירקטור', 15, NULL, 6);

-- Seed job fields (all 30 categories from ALLJOBS)
INSERT INTO public.job_fields (slug, name_en, name_he, icon, display_order) VALUES
  ('tech', 'Hi-Tech & IT', 'הייטק ומחשבים', 'monitor', 1),
  ('marketing', 'Marketing & Advertising', 'שיווק ופרסום', 'megaphone', 2),
  ('sales', 'Sales', 'מכירות', 'trending-up', 3),
  ('finance', 'Finance & Economics', 'כספים וכלכלה', 'dollar-sign', 4),
  ('engineering', 'Engineering', 'הנדסה', 'settings', 5),
  ('hr', 'HR & Recruitment', 'משאבי אנוש וגיוס', 'users', 6),
  ('management', 'Management & Admin', 'ניהול ואדמיניסטרציה', 'briefcase', 7),
  ('customer-service', 'Customer Service & Support', 'שירות לקוחות ותמיכה', 'headphones', 8),
  ('design', 'Design & Creative', 'עיצוב וקריאייטיב', 'palette', 9),
  ('logistics', 'Logistics & Shipping', 'לוגיסטיקה ושילוח', 'truck', 10),
  ('manufacturing', 'Manufacturing & Industry', 'ייצור ותעשייה', 'factory', 11),
  ('healthcare', 'Healthcare & Medical', 'בריאות ורפואה', 'heart-pulse', 12),
  ('education', 'Education & Teaching', 'חינוך והוראה', 'graduation-cap', 13),
  ('legal', 'Legal', 'משפטים', 'scale', 14),
  ('media', 'Media & PR', 'תקשורת ויחסי ציבור', 'newspaper', 15),
  ('real-estate', 'Real Estate', 'נדל"ן', 'home', 16),
  ('hospitality', 'Hospitality & Tourism', 'מסעדנות ומלונאות', 'utensils', 17),
  ('retail', 'Retail & Commerce', 'קמעונאות ומסחר', 'shopping-cart', 18),
  ('construction', 'Construction & Infrastructure', 'בניין ותשתיות', 'hard-hat', 19),
  ('security', 'Security & Safety', 'ביטחון ושמירה', 'shield', 20),
  ('drivers', 'Drivers & Transportation', 'נהגים והובלה', 'car', 21),
  ('social-work', 'Social Work & Welfare', 'עבודה סוציאלית ורווחה', 'hand-helping', 22),
  ('data', 'Data & Analytics', 'דאטה ואנליטיקה', 'bar-chart', 23),
  ('insurance', 'Insurance & Banking', 'ביטוח ובנקאות', 'landmark', 24),
  ('agriculture', 'Agriculture & Environment', 'חקלאות וסביבה', 'leaf', 25),
  ('culture', 'Culture & Entertainment', 'תרבות ובידור', 'music', 26),
  ('sports', 'Sports & Fitness', 'ספורט וכושר', 'dumbbell', 27),
  ('import-export', 'Import & Export', 'יבוא ויצוא', 'plane', 28),
  ('freelance', 'Freelance & Self-employed', 'פרילנס ועצמאים', 'user', 29),
  ('students', 'Students & Entry Level', 'סטודנטים וללא ניסיון', 'book-open', 30);