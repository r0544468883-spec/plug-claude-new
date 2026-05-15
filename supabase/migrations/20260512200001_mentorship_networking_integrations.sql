-- Migration: Mentorship Matching, Speed Networking, Slack/Teams Integration
-- Date: 2026-05-12

-- ============================================================================
-- 1. MENTORSHIP MATCHING
-- ============================================================================

-- Mentorship profiles (users opt-in as mentor or mentee)
CREATE TABLE IF NOT EXISTS community_mentorship_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id uuid NOT NULL REFERENCES community_hubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('mentor', 'mentee', 'both')),
  bio text,
  expertise text[] DEFAULT '{}',
  looking_for text[] DEFAULT '{}',
  years_experience int DEFAULT 0,
  max_mentees int DEFAULT 3,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(hub_id, user_id)
);

-- Mentorship matches
CREATE TABLE IF NOT EXISTS community_mentorship_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id uuid NOT NULL REFERENCES community_hubs(id) ON DELETE CASCADE,
  mentor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled')),
  match_score numeric(5,2),
  mentor_note text,
  mentee_note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(hub_id, mentor_id, mentee_id)
);

-- Mentorship sessions (scheduled meetings)
CREATE TABLE IF NOT EXISTS community_mentorship_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES community_mentorship_matches(id) ON DELETE CASCADE,
  title text,
  scheduled_at timestamptz,
  duration_minutes int DEFAULT 30,
  meeting_url text,
  notes text,
  rating int CHECK (rating >= 1 AND rating <= 5),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 2. SPEED NETWORKING
-- ============================================================================

-- Speed networking events
CREATE TABLE IF NOT EXISTS community_speed_networking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id uuid NOT NULL REFERENCES community_hubs(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  title_he text,
  description text,
  round_duration_seconds int DEFAULT 300,
  break_duration_seconds int DEFAULT 30,
  max_participants int DEFAULT 50,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'lobby', 'active', 'ended')),
  scheduled_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Speed networking participants
CREATE TABLE IF NOT EXISTS community_speed_networking_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES community_speed_networking(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  interests text[] DEFAULT '{}',
  UNIQUE(event_id, user_id)
);

-- Speed networking rounds (pairings)
CREATE TABLE IF NOT EXISTS community_speed_networking_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES community_speed_networking(id) ON DELETE CASCADE,
  round_number int NOT NULL,
  user_a uuid NOT NULL REFERENCES auth.users(id),
  user_b uuid NOT NULL REFERENCES auth.users(id),
  room_url text,
  started_at timestamptz,
  ended_at timestamptz,
  rating_a int CHECK (rating_a >= 1 AND rating_a <= 5),
  rating_b int CHECK (rating_b >= 1 AND rating_b <= 5),
  want_connect_a boolean,
  want_connect_b boolean
);

-- ============================================================================
-- 3. SLACK / TEAMS / DISCORD INTEGRATION
-- ============================================================================

-- Integration configurations per hub
CREATE TABLE IF NOT EXISTS community_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id uuid NOT NULL REFERENCES community_hubs(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('slack', 'teams', 'discord')),
  webhook_url text NOT NULL,
  channel_name text,
  events text[] DEFAULT '{new_post,new_event,new_course}',
  is_active boolean DEFAULT true,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(hub_id, provider)
);

-- ============================================================================
-- 4. FEATURE TOGGLES ON community_hubs
-- ============================================================================

ALTER TABLE community_hubs
  ADD COLUMN IF NOT EXISTS allow_mentorship boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_speed_networking boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_integrations boolean DEFAULT true;

-- ============================================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE community_mentorship_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_mentorship_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_mentorship_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_speed_networking ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_speed_networking_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_speed_networking_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_integrations ENABLE ROW LEVEL SECURITY;

-- ---- community_mentorship_profiles ----

DROP POLICY IF EXISTS "Authenticated users can view mentorship profiles" ON community_mentorship_profiles;
CREATE POLICY "Authenticated users can view mentorship profiles"
  ON community_mentorship_profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own mentorship profile" ON community_mentorship_profiles;
CREATE POLICY "Users can insert their own mentorship profile"
  ON community_mentorship_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own mentorship profile" ON community_mentorship_profiles;
CREATE POLICY "Users can update their own mentorship profile"
  ON community_mentorship_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own mentorship profile" ON community_mentorship_profiles;
CREATE POLICY "Users can delete their own mentorship profile"
  ON community_mentorship_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ---- community_mentorship_matches ----

DROP POLICY IF EXISTS "Mentor and mentee can view their matches" ON community_mentorship_matches;
CREATE POLICY "Mentor and mentee can view their matches"
  ON community_mentorship_matches FOR SELECT
  TO authenticated
  USING (auth.uid() = mentor_id OR auth.uid() = mentee_id);

DROP POLICY IF EXISTS "Authenticated users can create match requests" ON community_mentorship_matches;
CREATE POLICY "Authenticated users can create match requests"
  ON community_mentorship_matches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = mentee_id);

DROP POLICY IF EXISTS "Mentor or mentee can update their match" ON community_mentorship_matches;
CREATE POLICY "Mentor or mentee can update their match"
  ON community_mentorship_matches FOR UPDATE
  TO authenticated
  USING (auth.uid() = mentor_id OR auth.uid() = mentee_id)
  WITH CHECK (auth.uid() = mentor_id OR auth.uid() = mentee_id);

DROP POLICY IF EXISTS "Mentor or mentee can delete their match" ON community_mentorship_matches;
CREATE POLICY "Mentor or mentee can delete their match"
  ON community_mentorship_matches FOR DELETE
  TO authenticated
  USING (auth.uid() = mentor_id OR auth.uid() = mentee_id);

-- ---- community_mentorship_sessions ----

DROP POLICY IF EXISTS "Match participants can view sessions" ON community_mentorship_sessions;
CREATE POLICY "Match participants can view sessions"
  ON community_mentorship_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_mentorship_matches m
      WHERE m.id = match_id
        AND (m.mentor_id = auth.uid() OR m.mentee_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Match participants can create sessions" ON community_mentorship_sessions;
CREATE POLICY "Match participants can create sessions"
  ON community_mentorship_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM community_mentorship_matches m
      WHERE m.id = match_id
        AND (m.mentor_id = auth.uid() OR m.mentee_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Match participants can update sessions" ON community_mentorship_sessions;
CREATE POLICY "Match participants can update sessions"
  ON community_mentorship_sessions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_mentorship_matches m
      WHERE m.id = match_id
        AND (m.mentor_id = auth.uid() OR m.mentee_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Match participants can delete sessions" ON community_mentorship_sessions;
CREATE POLICY "Match participants can delete sessions"
  ON community_mentorship_sessions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_mentorship_matches m
      WHERE m.id = match_id
        AND (m.mentor_id = auth.uid() OR m.mentee_id = auth.uid())
    )
  );

-- ---- community_speed_networking ----

DROP POLICY IF EXISTS "Authenticated users can view speed networking events" ON community_speed_networking;
CREATE POLICY "Authenticated users can view speed networking events"
  ON community_speed_networking FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create speed networking events" ON community_speed_networking;
CREATE POLICY "Authenticated users can create speed networking events"
  ON community_speed_networking FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can update their speed networking events" ON community_speed_networking;
CREATE POLICY "Creators can update their speed networking events"
  ON community_speed_networking FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can delete their speed networking events" ON community_speed_networking;
CREATE POLICY "Creators can delete their speed networking events"
  ON community_speed_networking FOR DELETE
  TO authenticated
  USING (auth.uid() = creator_id);

-- ---- community_speed_networking_participants ----

DROP POLICY IF EXISTS "Authenticated users can view participants" ON community_speed_networking_participants;
CREATE POLICY "Authenticated users can view participants"
  ON community_speed_networking_participants FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can join speed networking events" ON community_speed_networking_participants;
CREATE POLICY "Users can join speed networking events"
  ON community_speed_networking_participants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own participation" ON community_speed_networking_participants;
CREATE POLICY "Users can update their own participation"
  ON community_speed_networking_participants FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can leave speed networking events" ON community_speed_networking_participants;
CREATE POLICY "Users can leave speed networking events"
  ON community_speed_networking_participants FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ---- community_speed_networking_rounds ----

DROP POLICY IF EXISTS "Participants can view their rounds" ON community_speed_networking_rounds;
CREATE POLICY "Participants can view their rounds"
  ON community_speed_networking_rounds FOR SELECT
  TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b);

DROP POLICY IF EXISTS "Event creators can insert rounds" ON community_speed_networking_rounds;
CREATE POLICY "Event creators can insert rounds"
  ON community_speed_networking_rounds FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM community_speed_networking e
      WHERE e.id = event_id AND e.creator_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Participants can update their own ratings in rounds" ON community_speed_networking_rounds;
CREATE POLICY "Participants can update their own ratings in rounds"
  ON community_speed_networking_rounds FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b)
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

DROP POLICY IF EXISTS "Event creators can delete rounds" ON community_speed_networking_rounds;
CREATE POLICY "Event creators can delete rounds"
  ON community_speed_networking_rounds FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_speed_networking e
      WHERE e.id = event_id AND e.creator_id = auth.uid()
    )
  );

-- ---- community_integrations ----

DROP POLICY IF EXISTS "Hub admins can view integrations" ON community_integrations;
CREATE POLICY "Hub admins can view integrations"
  ON community_integrations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.hub_id = community_integrations.hub_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "Hub admins can create integrations" ON community_integrations;
CREATE POLICY "Hub admins can create integrations"
  ON community_integrations FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.hub_id = community_integrations.hub_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "Hub admins can update integrations" ON community_integrations;
CREATE POLICY "Hub admins can update integrations"
  ON community_integrations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.hub_id = community_integrations.hub_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "Hub admins can delete integrations" ON community_integrations;
CREATE POLICY "Hub admins can delete integrations"
  ON community_integrations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.hub_id = community_integrations.hub_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('admin', 'owner')
    )
  );

-- ============================================================================
-- 6. GAMIFICATION — award_community_points FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION award_community_points(
  p_hub_id uuid,
  p_user_id uuid,
  p_points int,
  p_reason text,
  p_ref_type text DEFAULT NULL,
  p_ref_id uuid DEFAULT NULL
) RETURNS void AS $$
BEGIN
  -- Insert transaction
  INSERT INTO community_point_transactions (hub_id, user_id, points, reason, ref_type, ref_id)
  VALUES (p_hub_id, p_user_id, p_points, p_reason, p_ref_type, p_ref_id);

  -- Update member points
  UPDATE community_members
  SET points = points + p_points,
      last_active_date = CURRENT_DATE
  WHERE hub_id = p_hub_id AND user_id = p_user_id;

  -- Auto-upgrade trust level
  UPDATE community_members
  SET trust_level = CASE
    WHEN points + p_points >= 1000 THEN 4
    WHEN points + p_points >= 500 THEN 3
    WHEN points + p_points >= 100 THEN 2
    WHEN points + p_points >= 10 THEN 1
    ELSE 0
  END
  WHERE hub_id = p_hub_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. AUTO-AWARD TRIGGERS
-- ============================================================================

-- Trigger: award points when a message is posted
CREATE OR REPLACE FUNCTION trg_award_message_points() RETURNS trigger AS $$
BEGIN
  PERFORM award_community_points(
    (SELECT hub_id FROM community_channels WHERE id = NEW.channel_id),
    NEW.author_id,
    2,
    'Posted a message',
    'message',
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS award_message_points ON community_messages;
CREATE TRIGGER award_message_points
  AFTER INSERT ON community_messages
  FOR EACH ROW EXECUTE FUNCTION trg_award_message_points();

-- Trigger: award points when quiz passed
CREATE OR REPLACE FUNCTION trg_award_quiz_points() RETURNS trigger AS $$
BEGIN
  IF NEW.passed = true AND (OLD IS NULL OR OLD.passed IS DISTINCT FROM true) THEN
    PERFORM award_community_points(
      (SELECT hub_id FROM community_courses c
       JOIN community_exercises e ON e.lesson_id IN (SELECT id FROM community_lessons WHERE course_id = c.id)
       JOIN community_quizzes q ON q.exercise_id = e.id
       WHERE q.id = NEW.quiz_id
       LIMIT 1),
      NEW.user_id,
      10,
      'Passed a quiz',
      'quiz',
      NEW.quiz_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS award_quiz_points ON community_quiz_attempts;
CREATE TRIGGER award_quiz_points
  AFTER INSERT OR UPDATE ON community_quiz_attempts
  FOR EACH ROW EXECUTE FUNCTION trg_award_quiz_points();

-- Trigger: award points for event registration
CREATE OR REPLACE FUNCTION trg_award_event_registration_points() RETURNS trigger AS $$
BEGIN
  PERFORM award_community_points(
    (SELECT hub_id FROM community_events WHERE id = NEW.event_id),
    NEW.user_id,
    5,
    'Registered for an event',
    'event',
    NEW.event_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS award_event_registration_points ON community_event_registrations;
CREATE TRIGGER award_event_registration_points
  AFTER INSERT ON community_event_registrations
  FOR EACH ROW EXECUTE FUNCTION trg_award_event_registration_points();

-- Trigger: award points for badge earned
CREATE OR REPLACE FUNCTION trg_award_badge_points() RETURNS trigger AS $$
DECLARE
  v_hub_id uuid;
BEGIN
  SELECT hub_id INTO v_hub_id FROM community_badges WHERE id = NEW.badge_id;
  IF v_hub_id IS NOT NULL THEN
    PERFORM award_community_points(
      v_hub_id,
      NEW.user_id,
      15,
      'Earned a badge',
      'badge',
      NEW.badge_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS award_badge_points ON community_badge_awards;
CREATE TRIGGER award_badge_points
  AFTER INSERT ON community_badge_awards
  FOR EACH ROW EXECUTE FUNCTION trg_award_badge_points();

-- Trigger: award points for course completion
CREATE OR REPLACE FUNCTION trg_award_course_completion_points() RETURNS trigger AS $$
DECLARE
  v_hub_id uuid;
BEGIN
  IF NEW.completed_at IS NOT NULL AND (OLD IS NULL OR OLD.completed_at IS NULL) THEN
    SELECT hub_id INTO v_hub_id FROM community_courses WHERE id = NEW.course_id;
    IF v_hub_id IS NOT NULL THEN
      PERFORM award_community_points(
        v_hub_id,
        NEW.user_id,
        25,
        'Completed a course',
        'course',
        NEW.course_id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS award_course_completion_points ON community_enrollments;
CREATE TRIGGER award_course_completion_points
  AFTER INSERT OR UPDATE ON community_enrollments
  FOR EACH ROW EXECUTE FUNCTION trg_award_course_completion_points();

-- Trigger: streak tracking on daily activity
CREATE OR REPLACE FUNCTION trg_update_streak() RETURNS trigger AS $$
DECLARE
  v_last_active date;
BEGIN
  SELECT last_active_date INTO v_last_active
  FROM community_members
  WHERE hub_id = (SELECT hub_id FROM community_channels WHERE id = NEW.channel_id)
    AND user_id = NEW.author_id;

  IF v_last_active IS NOT NULL AND v_last_active = CURRENT_DATE - INTERVAL '1 day' THEN
    UPDATE community_members
    SET streak_days = streak_days + 1, last_active_date = CURRENT_DATE
    WHERE hub_id = (SELECT hub_id FROM community_channels WHERE id = NEW.channel_id)
      AND user_id = NEW.author_id
      AND last_active_date < CURRENT_DATE;
  ELSIF v_last_active IS NULL OR v_last_active < CURRENT_DATE - INTERVAL '1 day' THEN
    UPDATE community_members
    SET streak_days = 1, last_active_date = CURRENT_DATE
    WHERE hub_id = (SELECT hub_id FROM community_channels WHERE id = NEW.channel_id)
      AND user_id = NEW.author_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_streak_on_message ON community_messages;
CREATE TRIGGER update_streak_on_message
  AFTER INSERT ON community_messages
  FOR EACH ROW EXECUTE FUNCTION trg_update_streak();
