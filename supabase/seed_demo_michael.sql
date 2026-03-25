-- ============================================
-- DEMO USER: מיכאל בדיקות (Michael Tests)
-- Run in Supabase Dashboard SQL Editor
-- ============================================

-- ============================================
-- Create messaging tables if they don't exist
-- ============================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1 UUID NOT NULL,
  participant_2 UUID NOT NULL,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(participant_1, participant_2)
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Conversations RLS (safe — IF NOT EXISTS via DO block)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='conversations' AND policyname='Users can view their conversations') THEN
    CREATE POLICY "Users can view their conversations" ON public.conversations FOR SELECT USING (auth.uid() = participant_1 OR auth.uid() = participant_2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='conversations' AND policyname='Users can create conversations') THEN
    CREATE POLICY "Users can create conversations" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='conversations' AND policyname='Users can update their conversations') THEN
    CREATE POLICY "Users can update their conversations" ON public.conversations FOR UPDATE USING (auth.uid() = participant_1 OR auth.uid() = participant_2);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  attachment_url TEXT,
  attachment_name TEXT,
  attachment_type TEXT,
  attachment_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='messages' AND policyname='Users can view their messages') THEN
    CREATE POLICY "Users can view their messages" ON public.messages FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='messages' AND policyname='Users can send messages') THEN
    CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = from_user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='messages' AND policyname='Users can update their received messages') THEN
    CREATE POLICY "Users can update their received messages" ON public.messages FOR UPDATE USING (auth.uid() = to_user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_to_user ON public.messages(to_user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON public.conversations(participant_1, participant_2);

-- Enable realtime (safe — ignore errors if already added)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- Add missing profile columns (safe — IF NOT EXISTS)
-- ============================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_field TEXT DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS experience_level TEXT DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS desired_role TEXT DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{}';

-- Refresh profiles_secure view to include new columns
DROP VIEW IF EXISTS public.profiles_secure;
CREATE VIEW public.profiles_secure WITH (security_invoker = on) AS
SELECT * FROM public.profiles;

-- ============================================
-- Fixed UUID for the demo user
-- You can change this if needed
DO $$
DECLARE
  demo_id uuid := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  current_user_id uuid;
  convo_id uuid;
  demo_email text := 'michael.test@plug-demo.com';
BEGIN

  -- ==========================================
  -- 1. Create auth user
  -- ==========================================
  INSERT INTO auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at,
    created_at, updated_at, confirmation_token,
    raw_app_meta_data, raw_user_meta_data
  ) VALUES (
    demo_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    demo_email,
    crypt('DemoPass123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"מיכאל בדיקות"}'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;

  -- Also insert into auth.identities (required by Supabase)
  INSERT INTO auth.identities (
    id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
  ) VALUES (
    demo_id, demo_id, demo_id::text, 'email',
    jsonb_build_object('sub', demo_id::text, 'email', demo_email),
    now(), now(), now()
  )
  ON CONFLICT DO NOTHING;

  -- ==========================================
  -- 2. Create profile
  -- ==========================================
  INSERT INTO profiles (
    user_id, full_name, email, avatar_url,
    personal_tagline, city, about_me, bio,
    job_field, experience_level, desired_role,
    skills, languages, last_seen_at
  ) VALUES (
    demo_id,
    'מיכאל בדיקות',
    demo_email,
    null,
    'מפתח Full Stack | React & Node.js | מחפש הזדמנויות חדשות',
    'תל אביב',
    'מפתח עם 5 שנות ניסיון בפיתוח אפליקציות ווב. מתמחה ב-React, TypeScript, Node.js ו-PostgreSQL. מחפש תפקיד מאתגר בחברת טכנולוגיה.',
    'Full Stack Developer עם 5 שנות ניסיון',
    'הייטק ומחשבים',
    '3-5 שנים',
    'Full Stack Developer',
    ARRAY['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Tailwind CSS', 'Docker'],
    ARRAY['עברית', 'אנגלית'],
    now() - interval '2 minutes'  -- Online recently
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    personal_tagline = EXCLUDED.personal_tagline,
    city = EXCLUDED.city,
    about_me = EXCLUDED.about_me,
    job_field = EXCLUDED.job_field,
    experience_level = EXCLUDED.experience_level,
    desired_role = EXCLUDED.desired_role,
    skills = EXCLUDED.skills,
    languages = EXCLUDED.languages,
    last_seen_at = EXCLUDED.last_seen_at;

  -- ==========================================
  -- 3. User role
  -- ==========================================
  INSERT INTO user_roles (user_id, role)
  VALUES (demo_id, 'job_seeker')
  ON CONFLICT DO NOTHING;

  -- ==========================================
  -- 4. Find YOUR user_id (the first non-demo user)
  -- ==========================================
  SELECT p.user_id INTO current_user_id
  FROM profiles p
  WHERE p.user_id != demo_id
  ORDER BY p.created_at ASC
  LIMIT 1;

  IF current_user_id IS NULL THEN
    RAISE NOTICE 'No other user found — skipping conversation/messages';
    RETURN;
  END IF;

  RAISE NOTICE 'Creating conversation between you (%) and demo user (%)', current_user_id, demo_id;

  -- ==========================================
  -- 5. Create conversation
  -- ==========================================
  -- participant_1 is always the smaller UUID
  INSERT INTO conversations (
    participant_1, participant_2, last_message_at
  ) VALUES (
    LEAST(current_user_id, demo_id),
    GREATEST(current_user_id, demo_id),
    now()
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO convo_id;

  -- If conversation already existed, fetch its ID
  IF convo_id IS NULL THEN
    SELECT id INTO convo_id
    FROM conversations
    WHERE participant_1 = LEAST(current_user_id, demo_id)
      AND participant_2 = GREATEST(current_user_id, demo_id);
  END IF;

  -- ==========================================
  -- 6. Insert demo messages
  -- ==========================================
  -- Message 1: מיכאל שולח (3 hours ago)
  INSERT INTO messages (conversation_id, from_user_id, to_user_id, content, is_read, created_at)
  VALUES (convo_id, demo_id, current_user_id,
    'היי! ראיתי את הפרופיל שלך ב-PLUG Social. אני מיכאל, מפתח Full Stack עם 5 שנות ניסיון. רציתי לשאול אותך כמה שאלות על החברה שלכם 😊',
    true, now() - interval '3 hours');

  -- Message 2: אתה עונה (2.5 hours ago)
  INSERT INTO messages (conversation_id, from_user_id, to_user_id, content, is_read, created_at)
  VALUES (convo_id, current_user_id, demo_id,
    'היי מיכאל! בטח, שמח לעזור. מה רצית לדעת?',
    true, now() - interval '2 hours 30 minutes');

  -- Message 3: מיכאל (2 hours ago)
  INSERT INTO messages (conversation_id, from_user_id, to_user_id, content, is_read, created_at)
  VALUES (convo_id, demo_id, current_user_id,
    'תודה! רציתי לשאול - מה הסטאק הטכנולוגי שלכם? ראיתי שאתם עובדים עם React, זה מעניין אותי מאוד.',
    true, now() - interval '2 hours');

  -- Message 4: אתה (1.5 hours ago)
  INSERT INTO messages (conversation_id, from_user_id, to_user_id, content, is_read, created_at)
  VALUES (convo_id, current_user_id, demo_id,
    'כן, אנחנו עובדים עם React + TypeScript בצד הקליינט, ו-Node.js עם Supabase בבקאנד. הצוות מעולה והפרויקטים מגוונים.',
    true, now() - interval '1 hour 30 minutes');

  -- Message 5: מיכאל (45 min ago)
  INSERT INTO messages (conversation_id, from_user_id, to_user_id, content, is_read, created_at)
  VALUES (convo_id, demo_id, current_user_id,
    'נשמע מדהים! זה בדיוק מה שאני מחפש. אפשר לקבוע שיחה קצרה השבוע? אשמח לשמוע עוד על התפקיד.',
    true, now() - interval '45 minutes');

  -- Message 6: אתה (30 min ago)
  INSERT INTO messages (conversation_id, from_user_id, to_user_id, content, is_read, created_at)
  VALUES (convo_id, current_user_id, demo_id,
    'בטח! בוא נתאם. מה לגבי יום רביעי ב-14:00?',
    true, now() - interval '30 minutes');

  -- Message 7: מיכאל (5 min ago) — UNREAD
  INSERT INTO messages (conversation_id, from_user_id, to_user_id, content, is_read, created_at)
  VALUES (convo_id, demo_id, current_user_id,
    'מעולה! יום רביעי ב-14:00 מתאים לי. אשלח לך קישור לזום. תודה רבה! 🙏',
    false, now() - interval '5 minutes');

  -- ==========================================
  -- 7. Schedule task (meeting) — skip if table missing
  -- ==========================================
  BEGIN
    INSERT INTO schedule_tasks (
      user_id, title, description, due_date, due_time,
      task_type, is_completed, priority, related_candidate,
      meeting_link, location
    ) VALUES (
      current_user_id,
      'שיחה עם מיכאל בדיקות',
      'שיחת היכרות ראשונית - מפתח Full Stack',
      (CURRENT_DATE + interval '2 days')::date,
      '14:00',
      'meeting',
      false,
      'high',
      'מיכאל בדיקות',
      'https://zoom.us/j/1234567890',
      'Zoom'
    );
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    RAISE NOTICE 'Skipped schedule_tasks (table/column missing)';
  END;

  -- ==========================================
  -- 8. Feed post by מיכאל — skip if table missing
  -- ==========================================
  BEGIN
    INSERT INTO feed_posts (
      user_id, content, post_type, visibility,
      likes_count, comments_count, created_at
    ) VALUES (
      demo_id,
      'שמח לשתף שסיימתי קורס מתקדם ב-React + TypeScript! 🎉

אחרי 3 חודשים של למידה אינטנסיבית, אני מרגיש מוכן לאתגר הבא.

מחפש תפקיד Full Stack Developer בחברה דינמית.
מישהו מכיר משהו?

#React #TypeScript #FullStack #JobSearch #PLUG',
      'update',
      'public',
      3,
      1,
      now() - interval '1 day'
    );
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    RAISE NOTICE 'Skipped feed_posts (table/column missing)';
  END;

  -- ==========================================
  -- 9. Notification (new message) — skip if table missing
  -- ==========================================
  BEGIN
    INSERT INTO notifications (
      user_id, title, message, type, is_read, created_at
    ) VALUES (
      current_user_id,
      'הודעה חדשה ממיכאל בדיקות',
      'מעולה! יום רביעי ב-14:00 מתאים לי. אשלח לך קישור לזום. תודה רבה! 🙏',
      'message',
      false,
      now() - interval '5 minutes'
    );
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    RAISE NOTICE 'Skipped notifications (table/column missing)';
  END;

  -- ==========================================
  -- 10. Vouch for credibility — skip if table missing
  -- ==========================================
  BEGIN
    INSERT INTO vouches (
      from_user_id, to_user_id, relationship,
      recommendation, skills, is_public
    ) VALUES (
      current_user_id,
      demo_id,
      'עמית לעבודה',
      'מיכאל הוא מפתח מעולה עם יכולת למידה מהירה. ממליץ בחום!',
      ARRAY['React', 'TypeScript', 'Problem Solving'],
      true
    );
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    RAISE NOTICE 'Skipped vouches (table/column missing)';
  END;

  -- ==========================================
  -- 11. Credits — skip if table missing
  -- ==========================================
  BEGIN
    INSERT INTO user_credits (user_id, total_credits, used_credits)
    VALUES (demo_id, 50, 5);
  EXCEPTION WHEN undefined_table OR undefined_column OR unique_violation THEN
    RAISE NOTICE 'Skipped user_credits (table missing or already exists)';
  END;

  -- ==========================================
  -- Done!
  -- ==========================================
  RAISE NOTICE '✅ Demo user "מיכאל בדיקות" created successfully!';
  RAISE NOTICE '   User ID: %', demo_id;
  RAISE NOTICE '   Email: %', demo_email;
  RAISE NOTICE '   Password: DemoPass123!';
  RAISE NOTICE '   Conversation with your user (%) created with 7 messages', current_user_id;

END $$;
