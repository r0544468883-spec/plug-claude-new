import { useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { FeedCard } from './FeedCard';
import { WebinarFeedCard, WebinarData } from './WebinarFeedCard';
import { generateFeedPosts, FeedPost } from './feedMockData';
import { Flame, Newspaper, Lightbulb, Building2, BarChart3, Video, PenLine } from 'lucide-react';

interface FeedPageProps {
  onCreatePost?: () => void;
}

export function FeedPage({ onCreatePost }: FeedPageProps) {
  const { language } = useLanguage();
  const { user, profile } = useAuth();
  const isRTL = language === 'he';

  // Fetch user's followed IDs for prioritization
  const { data: followedIds } = useQuery({
    queryKey: ['user-follows', user?.id],
    queryFn: async () => {
      if (!user?.id) return { userIds: [] as string[], companyIds: [] as string[] };
      const { data } = await supabase.from('follows').select('followed_user_id, followed_company_id').eq('follower_id', user.id);
      return {
        userIds: data?.filter((f: any) => f.followed_user_id).map((f: any) => f.followed_user_id) || [],
        companyIds: data?.filter((f: any) => f.followed_company_id).map((f: any) => f.followed_company_id) || [],
      };
    },
    enabled: !!user?.id,
  });

  // Fetch real posts from DB
  const { data: dbPosts, isLoading: postsLoading } = useQuery({
    queryKey: ['feed-posts-real'],
    queryFn: async () => {
      const { data: posts, error } = await supabase
        .from('feed_posts')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error || !posts?.length) return [];

      const pollPostIds = posts.filter((p: any) => p.post_type === 'poll').map((p: any) => p.id);
      let pollOptionsMap: Record<string, any[]> = {};
      if (pollPostIds.length > 0) {
        const { data: options } = await supabase.from('feed_poll_options').select('*').in('post_id', pollPostIds);
        if (options) {
          for (const opt of options) {
            if (!pollOptionsMap[opt.post_id]) pollOptionsMap[opt.post_id] = [];
            pollOptionsMap[opt.post_id].push(opt);
          }
        }
      }

      const authorIds = [...new Set(posts.map((p: any) => p.author_id))];
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', authorIds);
      const profileMap: Record<string, string> = {};
      profiles?.forEach((p: any) => { profileMap[p.user_id] = p.full_name; });

      const companyIds = [...new Set(posts.filter((p: any) => p.company_id).map((p: any) => p.company_id))];
      let companyMap: Record<string, string> = {};
      if (companyIds.length > 0) {
        const { data: companies } = await supabase.from('companies').select('id, name').in('id', companyIds);
        companies?.forEach((c: any) => { companyMap[c.id] = c.name; });
      }

      return posts.map((p: any): FeedPost => ({
        id: p.id,
        recruiterName: profileMap[p.author_id] || 'Recruiter',
        recruiterAvatar: (profileMap[p.author_id] || 'R').charAt(0).toUpperCase(),
        companyName: p.company_id ? (companyMap[p.company_id] || '') : '',
        postType: p.post_type,
        content: p.content_en || p.content_he || '',
        contentHe: p.content_he || p.content_en || '',
        videoUrl: p.video_url || undefined,
        likes: p.likes_count || 0,
        comments: p.comments_count || 0,
        createdAt: p.created_at,
        authorId: p.author_id,
        companyId: p.company_id,
        pollOptions: pollOptionsMap[p.id]?.map((o: any) => ({
          id: o.id, text: o.text_en, textHe: o.text_he, votes: o.votes_count || 0,
        })),
      }));
    },
  });

  // Fetch webinars
  const { data: webinars } = useQuery({
    queryKey: ['webinars-feed', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('webinars')
        .select('*')
        .gte('scheduled_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(20);

      if (error || !data?.length) return [];

      const creatorIds = [...new Set(data.map((w: any) => w.creator_id))];
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', creatorIds);
      const profileMap: Record<string, string> = {};
      profiles?.forEach((p: any) => { profileMap[p.user_id] = p.full_name; });

      const companyIds = [...new Set(data.filter((w: any) => w.company_id).map((w: any) => w.company_id))];
      let companyMap: Record<string, string> = {};
      if (companyIds.length > 0) {
        const { data: companies } = await supabase.from('companies').select('id, name').in('id', companyIds);
        companies?.forEach((c: any) => { companyMap[c.id] = c.name; });
      }

      let regSet = new Set<string>();
      let regCounts: Record<string, number> = {};
      if (user?.id) {
        const { data: myRegs } = await supabase.from('webinar_registrations').select('webinar_id').eq('user_id', user.id);
        myRegs?.forEach((r: any) => regSet.add(r.webinar_id));
      }

      const webinarIds = data.map((w: any) => w.id);
      for (const wid of webinarIds) {
        const { count } = await supabase.from('webinar_registrations').select('id', { count: 'exact', head: true }).eq('webinar_id', wid);
        regCounts[wid] = count || 0;
      }

      return data.map((w: any): WebinarData => ({
        id: w.id,
        title_en: w.title_en,
        title_he: w.title_he,
        description_en: w.description_en || '',
        description_he: w.description_he || '',
        scheduled_at: w.scheduled_at,
        link_url: w.link_url,
        is_internal: w.is_internal,
        internal_stream_url: w.internal_stream_url,
        creator_name: profileMap[w.creator_id],
        company_name: w.company_id ? companyMap[w.company_id] : undefined,
        registration_count: regCounts[w.id] || 0,
        is_registered: regSet.has(w.id),
      }));
    },
  });

  const { data: companyNames } = useQuery({
    queryKey: ['feed-companies', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('applications')
        .select('job_id, jobs(company_id, companies(name))')
        .eq('candidate_id', user.id)
        .limit(20);
      const names: string[] = [];
      data?.forEach((app: any) => {
        const name = app.jobs?.companies?.name;
        if (name && !names.includes(name)) names.push(name);
      });
      return names;
    },
    enabled: !!user?.id,
  });

  // Fetch recent assignments for the feed
  const { data: assignmentPosts } = useQuery({
    queryKey: ['feed-assignments'],
    queryFn: async () => {
      const { data: assignments } = await supabase
        .from('assignment_templates' as any)
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);
      if (!assignments?.length) return [];

      const creatorIds = [...new Set((assignments as any[]).map(a => a.created_by))];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', creatorIds);
      const nameMap: Record<string, string> = {};
      profiles?.forEach((p: any) => { nameMap[p.id] = p.full_name; });

      return (assignments as any[]).map((a): FeedPost => ({
        id: `assignment-${a.id}`,
        recruiterName: nameMap[a.created_by] || 'User',
        recruiterAvatar: (nameMap[a.created_by] || 'U').charAt(0).toUpperCase(),
        companyName: a.company_name || '',
        postType: 'assignment',
        content: `📋 New assignment: "${a.title}"\n${a.description?.slice(0, 200) || ''}${a.description?.length > 200 ? '...' : ''}`,
        contentHe: `📋 מטלה חדשה: "${a.title}"\n${a.description?.slice(0, 200) || ''}${a.description?.length > 200 ? '...' : ''}`,
        likes: 0,
        comments: 0,
        createdAt: a.created_at,
        authorId: a.created_by,
      }));
    },
  });

  const mockPosts = useMemo(() => generateFeedPosts(companyNames || []), [companyNames]);

  // Combine & prioritize followed content
  const allPosts = useMemo(() => {
    const real = [...(dbPosts || []), ...(assignmentPosts || [])];
    // Sort by date
    real.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const combined = real.length >= 5 ? real : [...real, ...mockPosts];

    if (!followedIds?.userIds.length && !followedIds?.companyIds.length) return combined;

    const followed: FeedPost[] = [];
    const rest: FeedPost[] = [];
    for (const p of combined) {
      if ((p.authorId && followedIds.userIds.includes(p.authorId)) ||
          (p.companyId && followedIds.companyIds.includes(p.companyId))) {
        followed.push(p);
      } else {
        rest.push(p);
      }
    }
    return [...followed, ...rest];
  }, [dbPosts, assignmentPosts, mockPosts, followedIds]);

  // Trending = sorted by engagement
  const trendingPosts = useMemo(() => {
    return [...allPosts].sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments)).slice(0, 20);
  }, [allPosts]);

  const filterPosts = (type?: string): FeedPost[] => {
    if (!type || type === 'all') return allPosts;
    return allPosts.filter(p => p.postType === type);
  };

  const userName = (profile as any)?.full_name?.split(' ')[0] || '';
  const userInitial = userName.charAt(0).toUpperCase() || 'U';

  return (
    <div data-tour="feed-content">
      <div className="space-y-5" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Subtitle */}
        <p className="text-gray-500 text-sm">
          {isRTL
            ? 'תוכן מותאם אישית ממגייסים וחברות – כל אינטראקציה מרוויחה +1 דלק!'
            : 'Personalized content from recruiters & companies – every interaction earns +1 Fuel!'}
        </p>

        {/* Create post prompt (LinkedIn style) */}
        {onCreatePost && (
          <Card
            className="bg-white shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
            onClick={onCreatePost}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 bg-gray-50 rounded-full px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-100 transition-colors border border-gray-200">
                {isRTL ? 'מה עובר עליך?' : "What's on your mind?"}
              </div>
              <PenLine className="w-5 h-5 text-gray-400" />
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="trending" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6 bg-white border border-gray-200">
            <TabsTrigger value="trending" className="gap-1 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Flame className="w-3.5 h-3.5" />
              {isRTL ? 'טרנדינג' : 'Trending'}
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-1 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Newspaper className="w-3.5 h-3.5" />
              {isRTL ? 'הכל' : 'All'}
            </TabsTrigger>
            <TabsTrigger value="tip" className="gap-1 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Lightbulb className="w-3.5 h-3.5" />
              {isRTL ? 'טיפים' : 'Tips'}
            </TabsTrigger>
            <TabsTrigger value="culture" className="gap-1 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Building2 className="w-3.5 h-3.5" />
              {isRTL ? 'תרבות' : 'Culture'}
            </TabsTrigger>
            <TabsTrigger value="poll" className="gap-1 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <BarChart3 className="w-3.5 h-3.5" />
              {isRTL ? 'סקרים' : 'Polls'}
            </TabsTrigger>
            <TabsTrigger value="webinars" className="gap-1 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Video className="w-3.5 h-3.5" />
              {isRTL ? 'וובינרים' : 'Webinars'}
            </TabsTrigger>
          </TabsList>

          {/* Loading state */}
          {postsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="bg-white border border-gray-100">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-11 w-11 rounded-full" />
                      <div className="space-y-1.5 flex-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {/* Trending tab */}
              <TabsContent value="trending" className="space-y-4">
                {trendingPosts.length === 0 ? (
                  <EmptyFeed isRTL={isRTL} />
                ) : (
                  trendingPosts.map(post => <FeedCard key={post.id} post={post} />)
                )}
              </TabsContent>

              {/* Other tabs */}
              {['all', 'tip', 'culture', 'poll'].map(tab => (
                <TabsContent key={tab} value={tab} className="space-y-4">
                  {filterPosts(tab).length === 0 ? (
                    <EmptyFeed isRTL={isRTL} />
                  ) : (
                    filterPosts(tab).map(post => (
                      <FeedCard key={post.id} post={post} />
                    ))
                  )}
                </TabsContent>
              ))}

              <TabsContent value="webinars" className="space-y-4">
                {(!webinars || webinars.length === 0) ? (
                  <EmptyFeed isRTL={isRTL} message={isRTL ? 'אין וובינרים קרובים' : 'No upcoming webinars'} />
                ) : (
                  webinars.map(w => <WebinarFeedCard key={w.id} webinar={w} />)
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
}

function EmptyFeed({ isRTL, message }: { isRTL: boolean; message?: string }) {
  return (
    <Card className="bg-white border border-gray-100">
      <CardContent className="py-12 text-center">
        <Newspaper className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">
          {message || (isRTL ? 'אין פוסטים בקטגוריה זו' : 'No posts in this category')}
        </p>
      </CardContent>
    </Card>
  );
}
