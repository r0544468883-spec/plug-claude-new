
-- Community Hubs
CREATE TABLE public.community_hubs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  company_id UUID REFERENCES public.companies(id),
  name_en TEXT NOT NULL,
  name_he TEXT NOT NULL DEFAULT '',
  description_en TEXT DEFAULT '',
  description_he TEXT DEFAULT '',
  template TEXT NOT NULL DEFAULT 'custom',
  avatar_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  member_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Community Channels
CREATE TABLE public.community_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hub_id UUID NOT NULL REFERENCES public.community_hubs(id) ON DELETE CASCADE,
  name_en TEXT NOT NULL,
  name_he TEXT NOT NULL DEFAULT '',
  description_en TEXT DEFAULT '',
  description_he TEXT DEFAULT '',
  access_mode TEXT NOT NULL DEFAULT 'open',
  private_code TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Community Members
CREATE TABLE public.community_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hub_id UUID NOT NULL REFERENCES public.community_hubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(hub_id, user_id)
);

-- Community Messages
CREATE TABLE public.community_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.community_channels(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  attachment_url TEXT,
  parent_message_id UUID REFERENCES public.community_messages(id),
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Community Join Requests
CREATE TABLE public.community_join_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.community_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.community_hubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_join_requests ENABLE ROW LEVEL SECURITY;

-- RLS: community_hubs
CREATE POLICY "Anyone can view public hubs" ON public.community_hubs FOR SELECT USING (is_public = true);
CREATE POLICY "Creators can manage own hubs" ON public.community_hubs FOR ALL USING (auth.uid() = creator_id);
CREATE POLICY "HR can create hubs" ON public.community_hubs FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'freelance_hr') OR has_role(auth.uid(), 'inhouse_hr')
);

-- RLS: community_channels
CREATE POLICY "Members can view channels" ON public.community_channels FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.hub_id = community_channels.hub_id AND cm.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.community_hubs h WHERE h.id = community_channels.hub_id AND h.is_public = true)
);
CREATE POLICY "Hub admins can manage channels" ON public.community_channels FOR ALL USING (
  EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.hub_id = community_channels.hub_id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'moderator'))
);

-- RLS: community_members
CREATE POLICY "Authenticated can view members" ON public.community_members FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can join open hubs" ON public.community_members FOR INSERT WITH CHECK (
  auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.community_hubs h WHERE h.id = hub_id AND h.is_public = true)
);
CREATE POLICY "Users can leave hubs" ON public.community_members FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage members" ON public.community_members FOR ALL USING (
  EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.hub_id = community_members.hub_id AND cm.user_id = auth.uid() AND cm.role = 'admin')
);

-- RLS: community_messages
CREATE POLICY "Members can view messages" ON public.community_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.community_channels cc
    JOIN public.community_members cm ON cm.hub_id = cc.hub_id
    WHERE cc.id = community_messages.channel_id AND cm.user_id = auth.uid()
  )
);
CREATE POLICY "Members can send messages" ON public.community_messages FOR INSERT WITH CHECK (
  auth.uid() = author_id AND EXISTS (
    SELECT 1 FROM public.community_channels cc
    JOIN public.community_members cm ON cm.hub_id = cc.hub_id
    WHERE cc.id = community_messages.channel_id AND cm.user_id = auth.uid()
  )
);

-- RLS: community_join_requests
CREATE POLICY "Users can create own requests" ON public.community_join_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own requests" ON public.community_join_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage requests" ON public.community_join_requests FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.community_channels cc
    JOIN public.community_members cm ON cm.hub_id = cc.hub_id
    WHERE cc.id = community_join_requests.channel_id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'moderator')
  )
);

-- Enable realtime for community messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;
