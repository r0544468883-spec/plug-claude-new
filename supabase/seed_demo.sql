-- ============================================================
-- PLUG Demo Seed Data
-- ⚠️  שנה את YOUR-USER-ID-HERE ל-ID שלך מ: Authentication → Users
-- ============================================================

DO $$
DECLARE
  v_uid uuid := 'YOUR-USER-ID-HERE';
BEGIN

-- 1. Companies
INSERT INTO companies (id, name, logo_url, website, description) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Monday.com', 'https://logo.clearbit.com/monday.com', 'https://monday.com', 'Work OS platform'),
  ('11111111-0000-0000-0000-000000000002', 'Wix',        'https://logo.clearbit.com/wix.com',    'https://wix.com',    'Web development platform'),
  ('11111111-0000-0000-0000-000000000003', 'Fiverr',     'https://logo.clearbit.com/fiverr.com', 'https://fiverr.com', 'Freelance marketplace'),
  ('11111111-0000-0000-0000-000000000004', 'Playtika',   'https://logo.clearbit.com/playtika.com','https://playtika.com','Mobile gaming company'),
  ('11111111-0000-0000-0000-000000000005', 'Amdocs',     'https://logo.clearbit.com/amdocs.com', 'https://amdocs.com', 'Software & services company')
ON CONFLICT (id) DO NOTHING;

-- 2. Jobs
INSERT INTO jobs (id, title, company_id, location, job_type, salary_range, description, status, is_community_shared) VALUES
  ('22222222-0000-0000-0000-000000000001','Frontend Developer',       '11111111-0000-0000-0000-000000000001','תל אביב','hybrid',    '25,000–35,000 ₪','פיתוח ממשקי משתמש עם React ו-TypeScript בצוות Agile.','active',false),
  ('22222222-0000-0000-0000-000000000002','Full Stack Engineer',       '11111111-0000-0000-0000-000000000002','תל אביב','full-time','28,000–40,000 ₪','Full Stack עם Node.js, React ו-PostgreSQL. מוצרים בסקייל עולמי.','active',false),
  ('22222222-0000-0000-0000-000000000003','Backend Developer',         '11111111-0000-0000-0000-000000000003','תל אביב','hybrid',   '22,000–32,000 ₪','Python ו-AWS. אחריות על APIs ומיקרוסרביסים.','active',false),
  ('22222222-0000-0000-0000-000000000004','React Native Developer',    '11111111-0000-0000-0000-000000000004','הרצליה','full-time','26,000–36,000 ₪','פיתוח מובייל עם React Native ל-Android ו-iOS.','active',false),
  ('22222222-0000-0000-0000-000000000005','Senior Software Engineer',  '11111111-0000-0000-0000-000000000005','רעננה','hybrid',    '32,000–45,000 ₪','הובלה טכנית. ניסיון 5+ שנים נדרש.','active',false)
ON CONFLICT (id) DO NOTHING;

-- 3. Applications
INSERT INTO applications (id, candidate_id, job_id, status, current_stage, match_score, notes, source, created_at, last_interaction) VALUES
  ('33333333-0000-0000-0000-000000000001', v_uid, '22222222-0000-0000-0000-000000000001',
   'active','interview', 87,'שיחה ראשונה הייתה טובה! ראיון טכני לשבוע הבא.',
   'web', NOW()-INTERVAL'5 days', NOW()-INTERVAL'1 day'),
  ('33333333-0000-0000-0000-000000000002', v_uid, '22222222-0000-0000-0000-000000000002',
   'active','screening', 72,'שלחתי קורות חיים. מחכה לחזרה מ-HR.',
   'web', NOW()-INTERVAL'10 days', NOW()-INTERVAL'3 days'),
  ('33333333-0000-0000-0000-000000000003', v_uid, '22222222-0000-0000-0000-000000000003',
   'active','applied',   65, NULL,
   'extension', NOW()-INTERVAL'3 days', NOW()-INTERVAL'3 days'),
  ('33333333-0000-0000-0000-000000000004', v_uid, '22222222-0000-0000-0000-000000000004',
   'rejected','rejected',45,'לא עברתי סינון ראשוני.',
   'web', NOW()-INTERVAL'20 days', NOW()-INTERVAL'15 days'),
  ('33333333-0000-0000-0000-000000000005', v_uid, '22222222-0000-0000-0000-000000000005',
   'active','technical', 91,'עברתי HR screening! מחכה למטלה טכנית.',
   'extension', NOW()-INTERVAL'7 days', NOW()-INTERVAL'2 days')
ON CONFLICT (id) DO NOTHING;

-- 4. Job Analyses
INSERT INTO job_analyses (id, user_id, title, company, score, summary, recommendation, source_url, analyzed_at) VALUES
  ('44444444-0000-0000-0000-000000000001', v_uid,'Frontend Developer','Monday.com',87,
   'התאמה גבוהה. React ו-TypeScript — בדיוק מה שיש לך. שכר תחרותי, חברה יציבה.',
   'apply','https://linkedin.com/jobs/view/1001', NOW()-INTERVAL'2 hours'),
  ('44444444-0000-0000-0000-000000000002', v_uid,'Full Stack Engineer','Wix',72,
   'משרה טובה אבל Node.js לא הכוח המרכזי שלך. שווה לנסות.',
   'maybe','https://linkedin.com/jobs/view/1002', NOW()-INTERVAL'5 hours'),
  ('44444444-0000-0000-0000-000000000003', v_uid,'Junior React Developer','Startup X',38,
   'מחפשים 0-1 שנות ניסיון. יש לך 3+ — overskilled למשרה זו.',
   'skip','https://alljobs.co.il/jobs/1003', NOW()-INTERVAL'1 day'),
  ('44444444-0000-0000-0000-000000000004', v_uid,'Senior Software Engineer','Amdocs',91,
   'התאמה מעולה! כל הדרישות תואמות. שכר גבוה, hybrid.',
   'apply','https://linkedin.com/jobs/view/1004', NOW()-INTERVAL'30 minutes')
ON CONFLICT (id) DO NOTHING;

-- 5. Saved Jobs
INSERT INTO saved_jobs (user_id, job_id) VALUES
  (v_uid, '22222222-0000-0000-0000-000000000001'),
  (v_uid, '22222222-0000-0000-0000-000000000005')
ON CONFLICT DO NOTHING;

-- 6. Schedule Tasks (יומן)
INSERT INTO schedule_tasks (id, user_id, title, description, due_date, due_time, priority, task_type, is_completed, related_job, location, meeting_link) VALUES
  ('55555555-0000-0000-0000-000000000001', v_uid,
   'ראיון טכני — Monday.com', 'ראיון עם מנהל הצוות. להכין שאלות על React architecture.',
   CURRENT_DATE + 2, '10:00', 'urgent', 'interview', false,
   'Frontend Developer', 'תל אביב, דרך מנחם בגין 52', 'https://meet.google.com/abc-defg-hij'),

  ('55555555-0000-0000-0000-000000000002', v_uid,
   'לשלוח follow-up ל-Wix', 'שלחתי קורות חיים לפני 5 ימים. לשלוח מייל מעקב.',
   CURRENT_DATE + 1, '09:00', 'high', 'followup', false,
   'Full Stack Engineer', NULL, NULL),

  ('55555555-0000-0000-0000-000000000003', v_uid,
   'לעדכן קורות חיים', 'להוסיף פרויקטים חדשים ולעדכן ניסיון עם TypeScript.',
   CURRENT_DATE, '14:00', 'medium', 'task', false,
   NULL, NULL, NULL),

  ('55555555-0000-0000-0000-000000000004', v_uid,
   'שיחת היכרות עם Amdocs', 'שיחה ראשונה עם HR. 20 דקות בסיסיות על התפקיד.',
   CURRENT_DATE + 4, '15:30', 'high', 'meeting', false,
   'Senior Software Engineer', NULL, 'https://zoom.us/j/123456789'),

  ('55555555-0000-0000-0000-000000000005', v_uid,
   'לסיים מטלת קוד — Amdocs', 'מטלה טכנית שקיבלתי. Deadline: עוד 3 ימים.',
   CURRENT_DATE + 3, '23:59', 'urgent', 'deadline', false,
   'Senior Software Engineer', NULL, NULL),

  ('55555555-0000-0000-0000-000000000006', v_uid,
   'לחקור את Monday.com לפני ראיון', 'לקרוא על המוצר, הצוות, ותרבות הארגון.',
   CURRENT_DATE + 1, '20:00', 'medium', 'reminder', false,
   'Frontend Developer', NULL, NULL),

  ('55555555-0000-0000-0000-000000000007', v_uid,
   'עדכון פרופיל LinkedIn', 'להוסיף פרויקטים ולבקש המלצות מקולגות.',
   CURRENT_DATE - 1, '12:00', 'low', 'task', true,
   NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

RAISE NOTICE 'Demo data inserted successfully!';
END $$;
