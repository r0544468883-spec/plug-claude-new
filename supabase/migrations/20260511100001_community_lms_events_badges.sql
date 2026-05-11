-- ============================================================
-- PLUG Community Module — Phase 1: Courses, Events, Badges, Q&A
-- ============================================================

-- ==================== COURSES ====================

CREATE TABLE public.community_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hub_id UUID NOT NULL REFERENCES public.community_hubs(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL,
  title TEXT NOT NULL,
  title_he TEXT DEFAULT '',
  slug TEXT NOT NULL,
  description TEXT DEFAULT '',
  description_he TEXT DEFAULT '',
  logo_url TEXT,
  banner_url TEXT,
  cost NUMERIC(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'ILS',
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_free BOOLEAN NOT NULL DEFAULT true,
  certificate_enabled BOOLEAN NOT NULL DEFAULT false,
  certificate_theme TEXT DEFAULT 'default',
  max_students INTEGER,
  enrollment_count INTEGER NOT NULL DEFAULT 0,
  rating_avg NUMERIC(3,2) DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(hub_id, slug)
);

CREATE TABLE public.community_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.community_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_he TEXT DEFAULT '',
  description TEXT DEFAULT '',
  description_he TEXT DEFAULT '',
  video_url TEXT,
  call_url TEXT,
  lesson_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_free_preview BOOLEAN NOT NULL DEFAULT false,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.community_lesson_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.community_lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'pdf',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.community_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.community_courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(course_id, user_id)
);

CREATE TABLE public.community_lesson_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.community_lessons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lesson_id, user_id)
);

-- ==================== EXERCISES & SUBMISSIONS ====================

CREATE TABLE public.community_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.community_lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_he TEXT DEFAULT '',
  description TEXT DEFAULT '',
  description_he TEXT DEFAULT '',
  exercise_type TEXT NOT NULL DEFAULT 'assignment',
  due_at TIMESTAMPTZ,
  max_score INTEGER DEFAULT 100,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.community_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exercise_id UUID NOT NULL REFERENCES public.community_exercises(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT,
  file_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  grade INTEGER,
  feedback TEXT,
  graded_by UUID,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  graded_at TIMESTAMPTZ
);

-- ==================== QUIZZES ====================

CREATE TABLE public.community_quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exercise_id UUID NOT NULL REFERENCES public.community_exercises(id) ON DELETE CASCADE,
  random_order BOOLEAN NOT NULL DEFAULT false,
  pass_mark INTEGER NOT NULL DEFAULT 60,
  single_attempt BOOLEAN NOT NULL DEFAULT false,
  show_answers_at_end BOOLEAN NOT NULL DEFAULT true,
  time_limit_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.community_quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.community_quizzes(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_he TEXT DEFAULT '',
  question_type TEXT NOT NULL DEFAULT 'mc',
  explanation TEXT DEFAULT '',
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE public.community_quiz_choices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.community_quiz_questions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  text_he TEXT DEFAULT '',
  is_correct BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE public.community_quiz_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.community_quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}',
  score INTEGER,
  passed BOOLEAN,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- ==================== EVENTS ====================

CREATE TABLE public.community_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hub_id UUID NOT NULL REFERENCES public.community_hubs(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL,
  title TEXT NOT NULL,
  title_he TEXT DEFAULT '',
  slug TEXT NOT NULL,
  description TEXT DEFAULT '',
  description_he TEXT DEFAULT '',
  location TEXT DEFAULT '',
  event_url TEXT,
  banner_url TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  is_online BOOLEAN NOT NULL DEFAULT true,
  is_public BOOLEAN NOT NULL DEFAULT true,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_rule JSONB,
  max_attendees INTEGER,
  registration_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(hub_id, slug)
);

CREATE TABLE public.community_event_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.community_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'attendee',
  status TEXT NOT NULL DEFAULT 'confirmed',
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

CREATE TABLE public.community_event_agenda (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.community_events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_he TEXT DEFAULT '',
  description TEXT DEFAULT '',
  speaker_name TEXT DEFAULT '',
  speaker_user_id UUID,
  start_at TIMESTAMPTZ,
  duration_minutes INTEGER DEFAULT 30,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- ==================== BADGES ====================

CREATE TABLE public.community_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hub_id UUID REFERENCES public.community_hubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_he TEXT DEFAULT '',
  description TEXT DEFAULT '',
  icon_url TEXT,
  level TEXT NOT NULL DEFAULT 'bronze',
  handler TEXT,
  handler_param JSONB DEFAULT '{}',
  is_auto BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.community_badge_awards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  badge_id UUID NOT NULL REFERENCES public.community_badges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(badge_id, user_id)
);

-- ==================== Q&A FORUM ====================

CREATE TABLE public.community_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hub_id UUID NOT NULL REFERENCES public.community_hubs(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  vote_count INTEGER NOT NULL DEFAULT 0,
  answer_count INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  accepted_answer_id UUID,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'open',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.community_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.community_questions(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  body TEXT NOT NULL,
  vote_count INTEGER NOT NULL DEFAULT 0,
  is_accepted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.community_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  vote_value INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, target_type, target_id)
);

-- ==================== CERTIFICATES ====================

CREATE TABLE public.community_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.community_courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  certificate_url TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(course_id, user_id)
);

-- ==================== COURSE RATINGS ====================

CREATE TABLE public.community_course_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.community_courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(course_id, user_id)
);

-- ==================== ATTENDANCE ====================

CREATE TABLE public.community_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID REFERENCES public.community_lessons(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.community_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  is_present BOOLEAN NOT NULL DEFAULT true,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (lesson_id IS NOT NULL OR event_id IS NOT NULL)
);

-- ==================== RLS POLICIES ====================

ALTER TABLE public.community_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_lesson_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_lesson_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_quiz_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_event_agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_badge_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_course_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_attendance ENABLE ROW LEVEL SECURITY;

-- Courses: published courses visible to all, unpublished only to hub admins
CREATE POLICY "Anyone can view published courses" ON public.community_courses
  FOR SELECT USING (
    is_published = true
    OR creator_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.hub_id = community_courses.hub_id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'moderator'))
  );

CREATE POLICY "Hub admins can manage courses" ON public.community_courses
  FOR ALL USING (
    creator_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.hub_id = community_courses.hub_id AND cm.user_id = auth.uid() AND cm.role = 'admin')
  );

-- Lessons: visible to enrolled users or hub members for free courses
CREATE POLICY "Enrolled users can view lessons" ON public.community_lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.community_courses c
      WHERE c.id = community_lessons.course_id
      AND (
        c.is_free = true
        OR EXISTS (SELECT 1 FROM public.community_enrollments e WHERE e.course_id = c.id AND e.user_id = auth.uid())
        OR c.creator_id = auth.uid()
      )
    )
    OR community_lessons.is_free_preview = true
  );

CREATE POLICY "Course creators can manage lessons" ON public.community_lessons
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.community_courses c WHERE c.id = community_lessons.course_id AND c.creator_id = auth.uid())
  );

-- Lesson materials: same as lessons
CREATE POLICY "Enrolled users can view materials" ON public.community_lesson_materials
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.community_lessons l
      JOIN public.community_courses c ON c.id = l.course_id
      WHERE l.id = community_lesson_materials.lesson_id
      AND (c.is_free = true OR EXISTS (SELECT 1 FROM public.community_enrollments e WHERE e.course_id = c.id AND e.user_id = auth.uid()) OR c.creator_id = auth.uid())
    )
  );

CREATE POLICY "Course creators can manage materials" ON public.community_lesson_materials
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.community_lessons l
      JOIN public.community_courses c ON c.id = l.course_id
      WHERE l.id = community_lesson_materials.lesson_id AND c.creator_id = auth.uid()
    )
  );

-- Enrollments
CREATE POLICY "Users can view own enrollments" ON public.community_enrollments
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can enroll themselves" ON public.community_enrollments
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Course creators can view enrollments" ON public.community_enrollments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.community_courses c WHERE c.id = community_enrollments.course_id AND c.creator_id = auth.uid())
  );

-- Lesson completions
CREATE POLICY "Users can manage own completions" ON public.community_lesson_completions
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Course creators can view completions" ON public.community_lesson_completions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.community_lessons l
      JOIN public.community_courses c ON c.id = l.course_id
      WHERE l.id = community_lesson_completions.lesson_id AND c.creator_id = auth.uid()
    )
  );

-- Exercises: same as lessons
CREATE POLICY "Enrolled users can view exercises" ON public.community_exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.community_lessons l
      JOIN public.community_courses c ON c.id = l.course_id
      WHERE l.id = community_exercises.lesson_id
      AND (c.is_free = true OR EXISTS (SELECT 1 FROM public.community_enrollments e WHERE e.course_id = c.id AND e.user_id = auth.uid()) OR c.creator_id = auth.uid())
    )
  );

CREATE POLICY "Course creators can manage exercises" ON public.community_exercises
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.community_lessons l
      JOIN public.community_courses c ON c.id = l.course_id
      WHERE l.id = community_exercises.lesson_id AND c.creator_id = auth.uid()
    )
  );

-- Submissions
CREATE POLICY "Users can manage own submissions" ON public.community_submissions
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Course creators can view and grade submissions" ON public.community_submissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.community_exercises ex
      JOIN public.community_lessons l ON l.id = ex.lesson_id
      JOIN public.community_courses c ON c.id = l.course_id
      WHERE ex.id = community_submissions.exercise_id AND c.creator_id = auth.uid()
    )
  );

-- Quizzes, questions, choices: same as exercises
CREATE POLICY "Enrolled users can view quizzes" ON public.community_quizzes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.community_exercises ex
      JOIN public.community_lessons l ON l.id = ex.lesson_id
      JOIN public.community_courses c ON c.id = l.course_id
      WHERE ex.id = community_quizzes.exercise_id
      AND (c.is_free = true OR EXISTS (SELECT 1 FROM public.community_enrollments e WHERE e.course_id = c.id AND e.user_id = auth.uid()) OR c.creator_id = auth.uid())
    )
  );

CREATE POLICY "Course creators can manage quizzes" ON public.community_quizzes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.community_exercises ex
      JOIN public.community_lessons l ON l.id = ex.lesson_id
      JOIN public.community_courses c ON c.id = l.course_id
      WHERE ex.id = community_quizzes.exercise_id AND c.creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can view quiz questions" ON public.community_quiz_questions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.community_quizzes q WHERE q.id = community_quiz_questions.quiz_id)
  );

CREATE POLICY "Course creators can manage quiz questions" ON public.community_quiz_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.community_quizzes q
      JOIN public.community_exercises ex ON ex.id = q.exercise_id
      JOIN public.community_lessons l ON l.id = ex.lesson_id
      JOIN public.community_courses c ON c.id = l.course_id
      WHERE q.id = community_quiz_questions.quiz_id AND c.creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can view quiz choices" ON public.community_quiz_choices
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.community_quiz_questions qq WHERE qq.id = community_quiz_choices.question_id)
  );

CREATE POLICY "Course creators can manage quiz choices" ON public.community_quiz_choices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.community_quiz_questions qq
      JOIN public.community_quizzes q ON q.id = qq.quiz_id
      JOIN public.community_exercises ex ON ex.id = q.exercise_id
      JOIN public.community_lessons l ON l.id = ex.lesson_id
      JOIN public.community_courses c ON c.id = l.course_id
      WHERE qq.id = community_quiz_choices.question_id AND c.creator_id = auth.uid()
    )
  );

-- Quiz attempts
CREATE POLICY "Users can manage own quiz attempts" ON public.community_quiz_attempts
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Course creators can view quiz attempts" ON public.community_quiz_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.community_quizzes q
      JOIN public.community_exercises ex ON ex.id = q.exercise_id
      JOIN public.community_lessons l ON l.id = ex.lesson_id
      JOIN public.community_courses c ON c.id = l.course_id
      WHERE q.id = community_quiz_attempts.quiz_id AND c.creator_id = auth.uid()
    )
  );

-- Events: public events visible to all, private to members
CREATE POLICY "Anyone can view public events" ON public.community_events
  FOR SELECT USING (
    is_public = true
    OR creator_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.hub_id = community_events.hub_id AND cm.user_id = auth.uid())
  );

CREATE POLICY "Hub admins can manage events" ON public.community_events
  FOR ALL USING (
    creator_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.hub_id = community_events.hub_id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'moderator'))
  );

-- Event registrations
CREATE POLICY "Users can view event registrations" ON public.community_event_registrations
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.community_events e WHERE e.id = community_event_registrations.event_id AND e.creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can register for events" ON public.community_event_registrations
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can cancel own registration" ON public.community_event_registrations
  FOR DELETE USING (user_id = auth.uid());

-- Event agenda: visible to all who can see the event
CREATE POLICY "Anyone can view event agenda" ON public.community_event_agenda
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.community_events e WHERE e.id = community_event_agenda.event_id)
  );

CREATE POLICY "Event creators can manage agenda" ON public.community_event_agenda
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.community_events e WHERE e.id = community_event_agenda.event_id AND e.creator_id = auth.uid())
  );

-- Badges
CREATE POLICY "Anyone can view badges" ON public.community_badges FOR SELECT USING (true);
CREATE POLICY "Hub admins can manage badges" ON public.community_badges
  FOR ALL USING (
    hub_id IS NULL
    OR EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.hub_id = community_badges.hub_id AND cm.user_id = auth.uid() AND cm.role = 'admin')
  );

-- Badge awards
CREATE POLICY "Anyone can view badge awards" ON public.community_badge_awards FOR SELECT USING (true);
CREATE POLICY "Hub admins can award badges" ON public.community_badge_awards
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.community_badges b
      LEFT JOIN public.community_members cm ON cm.hub_id = b.hub_id AND cm.user_id = auth.uid()
      WHERE b.id = community_badge_awards.badge_id
      AND (b.hub_id IS NULL OR cm.role = 'admin')
    )
  );

-- Q&A: visible to hub members
CREATE POLICY "Members can view questions" ON public.community_questions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.hub_id = community_questions.hub_id AND cm.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.community_hubs h WHERE h.id = community_questions.hub_id AND h.is_public = true)
  );

CREATE POLICY "Members can create questions" ON public.community_questions
  FOR INSERT WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.hub_id = community_questions.hub_id AND cm.user_id = auth.uid())
  );

CREATE POLICY "Authors and admins can update questions" ON public.community_questions
  FOR UPDATE USING (
    author_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.hub_id = community_questions.hub_id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'moderator'))
  );

CREATE POLICY "Members can view answers" ON public.community_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.community_questions q WHERE q.id = community_answers.question_id
    )
  );

CREATE POLICY "Members can create answers" ON public.community_answers
  FOR INSERT WITH CHECK (author_id = auth.uid());

CREATE POLICY "Authors can update own answers" ON public.community_answers
  FOR UPDATE USING (author_id = auth.uid());

-- Votes
CREATE POLICY "Authenticated can vote" ON public.community_votes
  FOR ALL USING (user_id = auth.uid());

-- Certificates
CREATE POLICY "Users can view own certificates" ON public.community_certificates
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Course creators can issue certificates" ON public.community_certificates
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.community_courses c WHERE c.id = community_certificates.course_id AND c.creator_id = auth.uid())
  );

CREATE POLICY "Anyone can view certificates by URL" ON public.community_certificates
  FOR SELECT USING (true);

-- Course ratings
CREATE POLICY "Anyone can view ratings" ON public.community_course_ratings FOR SELECT USING (true);
CREATE POLICY "Enrolled users can rate" ON public.community_course_ratings
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.community_enrollments e WHERE e.course_id = community_course_ratings.course_id AND e.user_id = auth.uid())
  );

-- Attendance
CREATE POLICY "Users can view own attendance" ON public.community_attendance
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage attendance" ON public.community_attendance
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.community_lessons l
      JOIN public.community_courses c ON c.id = l.course_id
      JOIN public.community_members cm ON cm.hub_id = c.hub_id
      WHERE l.id = community_attendance.lesson_id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'moderator')
    )
    OR EXISTS (
      SELECT 1 FROM public.community_events e
      JOIN public.community_members cm ON cm.hub_id = e.hub_id
      WHERE e.id = community_attendance.event_id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'moderator')
    )
  );

-- ==================== INDEXES ====================

CREATE INDEX idx_community_courses_hub ON public.community_courses(hub_id);
CREATE INDEX idx_community_courses_slug ON public.community_courses(hub_id, slug);
CREATE INDEX idx_community_lessons_course ON public.community_lessons(course_id, sort_order);
CREATE INDEX idx_community_enrollments_course ON public.community_enrollments(course_id);
CREATE INDEX idx_community_enrollments_user ON public.community_enrollments(user_id);
CREATE INDEX idx_community_lesson_completions_user ON public.community_lesson_completions(user_id);
CREATE INDEX idx_community_exercises_lesson ON public.community_exercises(lesson_id);
CREATE INDEX idx_community_submissions_exercise ON public.community_submissions(exercise_id);
CREATE INDEX idx_community_submissions_user ON public.community_submissions(user_id);
CREATE INDEX idx_community_events_hub ON public.community_events(hub_id);
CREATE INDEX idx_community_events_start ON public.community_events(start_at);
CREATE INDEX idx_community_event_regs_event ON public.community_event_registrations(event_id);
CREATE INDEX idx_community_questions_hub ON public.community_questions(hub_id);
CREATE INDEX idx_community_answers_question ON public.community_answers(question_id);
CREATE INDEX idx_community_votes_target ON public.community_votes(target_type, target_id);
CREATE INDEX idx_community_badge_awards_user ON public.community_badge_awards(user_id);

-- ==================== RPC: Course Progress ====================

CREATE OR REPLACE FUNCTION public.get_course_progress(p_course_id UUID, p_user_id UUID)
RETURNS TABLE(total_lessons BIGINT, completed_lessons BIGINT, progress_pct INTEGER)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.community_lessons WHERE course_id = p_course_id) AS total_lessons,
    (SELECT COUNT(*) FROM public.community_lesson_completions lc
     JOIN public.community_lessons l ON l.id = lc.lesson_id
     WHERE l.course_id = p_course_id AND lc.user_id = p_user_id) AS completed_lessons,
    CASE
      WHEN (SELECT COUNT(*) FROM public.community_lessons WHERE course_id = p_course_id) = 0 THEN 0
      ELSE ((SELECT COUNT(*) FROM public.community_lesson_completions lc
             JOIN public.community_lessons l ON l.id = lc.lesson_id
             WHERE l.course_id = p_course_id AND lc.user_id = p_user_id) * 100 /
            (SELECT COUNT(*) FROM public.community_lessons WHERE course_id = p_course_id))::INTEGER
    END AS progress_pct;
END;
$$;

-- ==================== TRIGGER: Update enrollment count ====================

CREATE OR REPLACE FUNCTION public.update_course_enrollment_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_courses SET enrollment_count = enrollment_count + 1 WHERE id = NEW.course_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_courses SET enrollment_count = enrollment_count - 1 WHERE id = OLD.course_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_enrollment_count
AFTER INSERT OR DELETE ON public.community_enrollments
FOR EACH ROW EXECUTE FUNCTION public.update_course_enrollment_count();

-- ==================== TRIGGER: Update event registration count ====================

CREATE OR REPLACE FUNCTION public.update_event_registration_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_events SET registration_count = registration_count + 1 WHERE id = NEW.event_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_events SET registration_count = registration_count - 1 WHERE id = OLD.event_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_event_registration_count
AFTER INSERT OR DELETE ON public.community_event_registrations
FOR EACH ROW EXECUTE FUNCTION public.update_event_registration_count();

-- ==================== TRIGGER: Update Q&A vote/answer counts ====================

CREATE OR REPLACE FUNCTION public.update_qa_counts()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_TABLE_NAME = 'community_answers' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.community_questions SET answer_count = answer_count + 1 WHERE id = NEW.question_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE public.community_questions SET answer_count = answer_count - 1 WHERE id = OLD.question_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'community_votes' THEN
    IF NEW.target_type = 'question' THEN
      UPDATE public.community_questions SET vote_count = vote_count + NEW.vote_value WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'answer' THEN
      UPDATE public.community_answers SET vote_count = vote_count + NEW.vote_value WHERE id = NEW.target_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_answer_count
AFTER INSERT OR DELETE ON public.community_answers
FOR EACH ROW EXECUTE FUNCTION public.update_qa_counts();

CREATE TRIGGER trg_vote_count
AFTER INSERT ON public.community_votes
FOR EACH ROW EXECUTE FUNCTION public.update_qa_counts();

-- ==================== TRIGGER: Update course rating ====================

CREATE OR REPLACE FUNCTION public.update_course_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.community_courses SET
    rating_avg = (SELECT COALESCE(AVG(rating), 0) FROM public.community_course_ratings WHERE course_id = NEW.course_id),
    rating_count = (SELECT COUNT(*) FROM public.community_course_ratings WHERE course_id = NEW.course_id)
  WHERE id = NEW.course_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_course_rating
AFTER INSERT OR UPDATE ON public.community_course_ratings
FOR EACH ROW EXECUTE FUNCTION public.update_course_rating();
