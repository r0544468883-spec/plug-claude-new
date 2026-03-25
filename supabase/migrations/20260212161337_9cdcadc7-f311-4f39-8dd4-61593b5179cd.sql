
-- Create follows table
CREATE TABLE public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL,
  followed_user_id UUID,
  followed_company_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT follows_at_least_one CHECK (followed_user_id IS NOT NULL OR followed_company_id IS NOT NULL)
);

CREATE UNIQUE INDEX idx_follows_user ON public.follows (follower_id, followed_user_id) WHERE followed_user_id IS NOT NULL;
CREATE UNIQUE INDEX idx_follows_company ON public.follows (follower_id, followed_company_id) WHERE followed_company_id IS NOT NULL;

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read follows"
  ON public.follows FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can follow"
  ON public.follows FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON public.follows FOR DELETE TO authenticated
  USING (auth.uid() = follower_id);

-- Create webinars table
CREATE TABLE public.webinars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL,
  company_id UUID REFERENCES public.companies(id),
  title_en TEXT NOT NULL DEFAULT '',
  title_he TEXT NOT NULL DEFAULT '',
  description_en TEXT DEFAULT '',
  description_he TEXT DEFAULT '',
  scheduled_at TIMESTAMPTZ NOT NULL,
  link_url TEXT,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  internal_stream_url TEXT,
  reminder_1_minutes INT NOT NULL DEFAULT 1440,
  reminder_2_minutes INT NOT NULL DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.webinars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read webinars"
  ON public.webinars FOR SELECT TO authenticated USING (true);

CREATE POLICY "Recruiters can create webinars"
  ON public.webinars FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = creator_id
    AND (public.has_role(auth.uid(), 'freelance_hr') OR public.has_role(auth.uid(), 'inhouse_hr'))
  );

CREATE POLICY "Creators can update their webinars"
  ON public.webinars FOR UPDATE TO authenticated
  USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their webinars"
  ON public.webinars FOR DELETE TO authenticated
  USING (auth.uid() = creator_id);

-- Create webinar_registrations table
CREATE TABLE public.webinar_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webinar_id UUID NOT NULL REFERENCES public.webinars(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (webinar_id, user_id)
);

ALTER TABLE public.webinar_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read registrations"
  ON public.webinar_registrations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can register for webinars"
  ON public.webinar_registrations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unregister"
  ON public.webinar_registrations FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.follows;
ALTER PUBLICATION supabase_realtime ADD TABLE public.webinars;
ALTER PUBLICATION supabase_realtime ADD TABLE public.webinar_registrations;
