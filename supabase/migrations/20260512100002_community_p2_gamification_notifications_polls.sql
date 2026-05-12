-- ============================================================
-- PLUG Community Module — Phase 2: Trust Levels, Gamification, Notifications, Polls
-- ============================================================

-- ==================== TRUST LEVELS & POINTS ====================

ALTER TABLE public.community_members ADD COLUMN IF NOT EXISTS trust_level INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.community_members ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.community_members ADD COLUMN IF NOT EXISTS streak_days INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.community_members ADD COLUMN IF NOT EXISTS last_active_date DATE;

-- Point transactions log
CREATE TABLE public.community_point_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hub_id UUID NOT NULL REFERENCES public.community_hubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  ref_type TEXT,
  ref_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==================== NOTIFICATIONS ====================

CREATE TABLE public.community_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hub_id UUID REFERENCES public.community_hubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  ref_type TEXT,
  ref_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==================== POLLS ====================

CREATE TABLE public.community_polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hub_id UUID NOT NULL REFERENCES public.community_hubs(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES public.community_channels(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.community_events(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL,
  question TEXT NOT NULL,
  question_he TEXT DEFAULT '',
  poll_type TEXT NOT NULL DEFAULT 'single',
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  ends_at TIMESTAMPTZ,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  total_votes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.community_poll_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.community_polls(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  text_he TEXT DEFAULT '',
  vote_count INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE public.community_poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.community_polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.community_poll_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

-- ==================== LIVE ROOMS ====================

CREATE TABLE public.community_live_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hub_id UUID NOT NULL REFERENCES public.community_hubs(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL,
  title TEXT NOT NULL,
  title_he TEXT DEFAULT '',
  room_url TEXT,
  provider TEXT NOT NULL DEFAULT 'jitsi',
  status TEXT NOT NULL DEFAULT 'scheduled',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  max_participants INTEGER,
  participant_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==================== RLS ====================

ALTER TABLE public.community_point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_live_rooms ENABLE ROW LEVEL SECURITY;

-- Point transactions
CREATE POLICY "Users can view own points" ON public.community_point_transactions
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System can insert points" ON public.community_point_transactions
  FOR INSERT WITH CHECK (true);

-- Notifications
CREATE POLICY "Users can view own notifications" ON public.community_notifications
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.community_notifications
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "System can insert notifications" ON public.community_notifications
  FOR INSERT WITH CHECK (true);

-- Polls
CREATE POLICY "Members can view polls" ON public.community_polls
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.hub_id = community_polls.hub_id AND cm.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.community_hubs h WHERE h.id = community_polls.hub_id AND h.is_public = true)
  );
CREATE POLICY "Members can create polls" ON public.community_polls
  FOR INSERT WITH CHECK (
    creator_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.hub_id = community_polls.hub_id AND cm.user_id = auth.uid())
  );
CREATE POLICY "Creators can update polls" ON public.community_polls
  FOR UPDATE USING (creator_id = auth.uid());

-- Poll options
CREATE POLICY "Anyone can view poll options" ON public.community_poll_options
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.community_polls p WHERE p.id = community_poll_options.poll_id)
  );
CREATE POLICY "Poll creators can manage options" ON public.community_poll_options
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.community_polls p WHERE p.id = community_poll_options.poll_id AND p.creator_id = auth.uid())
  );

-- Poll votes
CREATE POLICY "Users can vote" ON public.community_poll_votes
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can view votes" ON public.community_poll_votes
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.community_polls p WHERE p.id = community_poll_votes.poll_id AND p.is_anonymous = false)
  );

-- Live rooms
CREATE POLICY "Members can view live rooms" ON public.community_live_rooms
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.hub_id = community_live_rooms.hub_id AND cm.user_id = auth.uid())
  );
CREATE POLICY "Admins can manage live rooms" ON public.community_live_rooms
  FOR ALL USING (
    creator_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.hub_id = community_live_rooms.hub_id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'moderator'))
  );

-- ==================== INDEXES ====================

CREATE INDEX idx_community_points_hub_user ON public.community_point_transactions(hub_id, user_id);
CREATE INDEX idx_community_points_created ON public.community_point_transactions(created_at);
CREATE INDEX idx_community_notifications_user ON public.community_notifications(user_id, is_read);
CREATE INDEX idx_community_notifications_created ON public.community_notifications(created_at);
CREATE INDEX idx_community_polls_hub ON public.community_polls(hub_id);
CREATE INDEX idx_community_polls_channel ON public.community_polls(channel_id);
CREATE INDEX idx_community_poll_options_poll ON public.community_poll_options(poll_id);
CREATE INDEX idx_community_poll_votes_poll ON public.community_poll_votes(poll_id);
CREATE INDEX idx_community_live_rooms_hub ON public.community_live_rooms(hub_id);

-- ==================== TRIGGER: Update poll vote counts ====================

CREATE OR REPLACE FUNCTION public.update_poll_vote_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_poll_options SET vote_count = vote_count + 1 WHERE id = NEW.option_id;
    UPDATE public.community_polls SET total_votes = total_votes + 1 WHERE id = NEW.poll_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_poll_options SET vote_count = vote_count - 1 WHERE id = OLD.option_id;
    UPDATE public.community_polls SET total_votes = total_votes - 1 WHERE id = OLD.poll_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_poll_vote_count
AFTER INSERT OR DELETE ON public.community_poll_votes
FOR EACH ROW EXECUTE FUNCTION public.update_poll_vote_count();

-- ==================== FUNCTION: Award points ====================

CREATE OR REPLACE FUNCTION public.award_community_points(
  p_hub_id UUID, p_user_id UUID, p_points INTEGER, p_reason TEXT, p_ref_type TEXT DEFAULT NULL, p_ref_id UUID DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.community_point_transactions (hub_id, user_id, points, reason, ref_type, ref_id)
  VALUES (p_hub_id, p_user_id, p_points, p_reason, p_ref_type, p_ref_id);

  UPDATE public.community_members
  SET points = points + p_points
  WHERE hub_id = p_hub_id AND user_id = p_user_id;

  -- Auto-update trust level based on points
  UPDATE public.community_members SET trust_level =
    CASE
      WHEN points + p_points >= 1000 THEN 4
      WHEN points + p_points >= 500 THEN 3
      WHEN points + p_points >= 100 THEN 2
      WHEN points + p_points >= 10 THEN 1
      ELSE 0
    END
  WHERE hub_id = p_hub_id AND user_id = p_user_id;
END;
$$;
