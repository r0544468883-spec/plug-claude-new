
-- Create feed_posts table
CREATE TABLE public.feed_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID NOT NULL,
  company_id UUID REFERENCES public.companies(id),
  post_type TEXT NOT NULL CHECK (post_type IN ('tip', 'culture', 'poll')),
  content_en TEXT,
  content_he TEXT,
  video_url TEXT,
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create feed_poll_options table
CREATE TABLE public.feed_poll_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  text_en TEXT NOT NULL,
  text_he TEXT NOT NULL,
  votes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_feed_posts_author ON public.feed_posts(author_id);
CREATE INDEX idx_feed_posts_company ON public.feed_posts(company_id);
CREATE INDEX idx_feed_posts_type ON public.feed_posts(post_type);
CREATE INDEX idx_feed_posts_published ON public.feed_posts(is_published, created_at DESC);
CREATE INDEX idx_feed_poll_options_post ON public.feed_poll_options(post_id);

-- Enable RLS
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_poll_options ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone authenticated can read published posts
CREATE POLICY "Anyone can read published feed posts"
  ON public.feed_posts FOR SELECT
  USING (is_published = true);

-- RLS: Recruiters can insert their own posts
CREATE POLICY "Recruiters can create feed posts"
  ON public.feed_posts FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('freelance_hr', 'inhouse_hr')
    )
  );

-- RLS: Recruiters can update their own posts
CREATE POLICY "Recruiters can update own feed posts"
  ON public.feed_posts FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- RLS: Recruiters can delete their own posts
CREATE POLICY "Recruiters can delete own feed posts"
  ON public.feed_posts FOR DELETE
  USING (auth.uid() = author_id);

-- RLS poll options: anyone can read
CREATE POLICY "Anyone can read poll options"
  ON public.feed_poll_options FOR SELECT
  USING (true);

-- RLS poll options: recruiters can insert for their own posts
CREATE POLICY "Recruiters can create poll options"
  ON public.feed_poll_options FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.feed_posts
      WHERE id = post_id AND author_id = auth.uid()
    )
  );

-- RLS poll options: recruiters can update their own
CREATE POLICY "Recruiters can update own poll options"
  ON public.feed_poll_options FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.feed_posts
      WHERE id = post_id AND author_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_feed_posts_updated_at
  BEFORE UPDATE ON public.feed_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create feed-videos storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('feed-videos', 'feed-videos', false);

-- Storage policies for feed-videos
CREATE POLICY "Recruiters can upload feed videos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'feed-videos'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('freelance_hr', 'inhouse_hr')
    )
  );

CREATE POLICY "Anyone authenticated can view feed videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'feed-videos' AND auth.uid() IS NOT NULL);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_posts;
