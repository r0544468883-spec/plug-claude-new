
-- Improvement 8: Smart Trigger Notifications
CREATE TABLE public.smart_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  trigger_type TEXT NOT NULL,
  message TEXT NOT NULL,
  cta_text TEXT,
  cta_link TEXT,
  seen BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.smart_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.smart_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.smart_notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications" ON public.smart_notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Improvement 9: Gamification - Achievements
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  achievement_key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, achievement_key)
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements" ON public.achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements" ON public.achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Improvement 9: Gamification - Weekly Quests
CREATE TABLE public.weekly_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  quest_key TEXT NOT NULL,
  target INTEGER NOT NULL,
  progress INTEGER DEFAULT 0,
  week_start DATE NOT NULL,
  completed BOOLEAN DEFAULT false,
  fuel_reward INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.weekly_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quests" ON public.weekly_quests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quests" ON public.weekly_quests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quests" ON public.weekly_quests
  FOR UPDATE USING (auth.uid() = user_id);

-- Progressive Disclosure: Add onboarding_stage and completed_actions to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_stage TEXT DEFAULT 'newcomer';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS completed_actions INTEGER DEFAULT 0;
