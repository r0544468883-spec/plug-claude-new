import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FeedCard } from './FeedCard';
import { WebinarFeedCard, WebinarData } from './WebinarFeedCard';
import { generateFeedPosts, FeedPost } from './feedMockData';
import { Flame, Newspaper, Lightbulb, Building2, BarChart3, Video, PenLine, ArrowUp, Loader2, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FeedPageProps {
  onCreatePost?: () => void;
}

const POSTS_PER_PAGE = 10;

export function FeedPage({ onCreatePost }: FeedPageProps) {
  const { language } = useLanguage();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const isRTL = language === 'he';

  // Pagination state
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_PAGE);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // New posts banner
  const [newPostsCount, setNewPostsCount] = useState(0);
  const latestPostTimeRef = useRef<string | null>(null);

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

  // Fetch connection user IDs for "My Network" tab
  const { data: connectionUserIds } = useQuery({
    queryKey: ['connection-user-ids', user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as string[];
      const { data } = await (supabase as any)
        .from('connections')
        .select('requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
      if (!data) return [];
      return data.map((c: any) =>
        c.requester_id === user.id ? c.addressee_id : c.requester_id
      );
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
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', authorIds);
      const profileMap: Record<string, string> = {};
      profiles?.forEach((p: any) => { profileMap[p.id] = p.full_name; });

      const companyIds = [...new Set(posts.filter((p: any) => p.company_id).map((p: any) => p.company_id))];
      let companyMap: Record<string, string> = {};
      if (companyIds.length > 0) {
        const { data: companies } = await supabase.from('companies').select('id, name').in('id', companyIds);
        companies?.forEach((c: any) => { companyMap[c.id] = c.name; });
      }

      // Track latest post time for realtime
      if (posts.length > 0) {
        latestPostTimeRef.current = posts[0].created_at;
      }

      return posts.map((p: any): FeedPost => ({
        id: p.id,
        recruiterName: profileMap[p.author_id] || 'Recruiter',
        recruiterAvatar: (profileMap[p.author_id] || 'R').charAt(0).toUpperCase(),
        companyName: p.company_id ? (companyMap[p.company_id] || '') : '',
        postType: p.post_type,
        content: p.content_en || p.content_he || '',
        contentHe: p.content_he || p.content_en || '',
        imageUrl: p.image_url || undefined,
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

  // Realtime subscription for new posts
  useEffect(() => {
    const channel = supabase
      .channel('feed-new-posts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'feed_posts', filter: 'is_published=eq.true' },
        () => {
          setNewPostsCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleShowNewPosts = useCallback(() => {
    setNewPostsCount(0);
    queryClient.invalidateQueries({ queryKey: ['feed-posts-real'] });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [queryClient]);

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
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', creatorIds);
      const profileMap: Record<string, string> = {};
      profiles?.forEach((p: any) => { profileMap[p.id] = p.full_name; });

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

      const currentUserName = (user as any)?.user_metadata?.full_name || null;

      return (assignments as any[]).map((a): FeedPost => {
        const name = nameMap[a.created_by] || (a.created_by === user?.id ? currentUserName : null) || 'User';
        const isAnon = !!a.is_anonymous;
        return {
          id: `assignment-${a.id}`,
          recruiterName: isAnon ? 'Anonymous' : name,
          recruiterAvatar: isAnon ? '?' : name.charAt(0).toUpperCase(),
          companyName: a.company_name || '',
          postType: 'assignment',
          content: `📋 New assignment: "${a.title}"\n${a.description?.slice(0, 200) || ''}${a.description?.length > 200 ? '...' : ''}`,
          contentHe: `📋 מטלה חדשה: "${a.title}"\n${a.description?.slice(0, 200) || ''}${a.description?.length > 200 ? '...' : ''}`,
          likes: 0,
          comments: 0,
          createdAt: a.created_at,
          authorId: a.created_by,
        };
      });
    },
  });

  const mockPosts = useMemo(() => generateFeedPosts(companyNames || [], language), [companyNames, language]);

  // Combine & sort: real posts first, then mock to fill, all by date
  const allPosts = useMemo(() => {
    const real = [...(dbPosts || []), ...(assignmentPosts || [])];
    real.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (real.length >= 5) return real;

    const mockSorted = [...mockPosts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return [...real, ...mockSorted];
  }, [dbPosts, assignmentPosts, mockPosts]);

  // Trending = sorted by engagement
  const trendingPosts = useMemo(() => {
    return [...allPosts].sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments)).slice(0, 20);
  }, [allPosts]);

  // Network = posts from accepted connections only
  const networkPosts = useMemo(() => {
    if (!connectionUserIds || connectionUserIds.length === 0) return [];
    const connSet = new Set(connectionUserIds);
    return allPosts.filter(p => p.authorId && connSet.has(p.authorId));
  }, [allPosts, connectionUserIds]);

  const filterPosts = (type?: string): FeedPost[] => {
    if (!type || type === 'all') return allPosts;
    return allPosts.filter(p => p.postType === type);
  };

  // Infinite scroll — IntersectionObserver
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) {
          setLoadingMore(true);
          setTimeout(() => {
            setVisibleCount(prev => prev + POSTS_PER_PAGE);
            setLoadingMore(false);
          }, 300);
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [loadingMore]);

  const userName = (profile as any)?.full_name?.split(' ')[0] || '';
  const userInitial = userName.charAt(0).toUpperCase() || 'U';

  // Render a paginated list of posts
  const renderPosts = (posts: FeedPost[]) => {
    const visible = posts.slice(0, visibleCount);
    const hasMore = posts.length > visibleCount;

    return (
      <>
        {visible.length === 0 ? (
          <EmptyFeed isRTL={isRTL} onCreatePost={onCreatePost} />
        ) : (
          <>
            {visible.map(post => <FeedCard key={post.id} post={post} />)}
            {hasMore && (
              <div ref={loadMoreRef} className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </>
        )}
      </>
    );
  };

  return (
    <div data-tour="feed-content">
      <div className="space-y-5" dir={isRTL ? 'rtl' : 'ltr'}>

        {/* ─── New Posts Banner ──────────────────────────── */}
        <AnimatePresence>
          {newPostsCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="sticky top-0 z-10"
            >
              <Button
                onClick={handleShowNewPosts}
                className="w-full rounded-full shadow-lg gap-2"
                size="sm"
              >
                <ArrowUp className="w-4 h-4" />
                {isRTL
                  ? `${newPostsCount} פוסטים חדשים`
                  : `${newPostsCount} new post${newPostsCount > 1 ? 's' : ''}`}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Create Post Prompt (LinkedIn style) ───────── */}
        {onCreatePost && (
          <Card
            className="shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            onClick={onCreatePost}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 bg-muted rounded-full px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted/80 transition-colors border border-border">
                {isRTL ? 'מה עובר עליך?' : "What's on your mind?"}
              </div>
              <PenLine className="w-5 h-5 text-muted-foreground" />
            </CardContent>
          </Card>
        )}

        {/* ─── Tabs ──────────────────────────────────────── */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="flex w-full overflow-x-auto bg-card border border-border">
            <TabsTrigger value="all" className="gap-1 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm flex-1 min-w-0">
              <Newspaper className="w-3.5 h-3.5" />
              {isRTL ? 'הכל' : 'All'}
            </TabsTrigger>
            <TabsTrigger value="network" className="gap-1 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm flex-1 min-w-0">
              <Users className="w-3.5 h-3.5" />
              {isRTL ? 'רשת' : 'Network'}
            </TabsTrigger>
            <TabsTrigger value="trending" className="gap-1 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm flex-1 min-w-0">
              <Flame className="w-3.5 h-3.5" />
              {isRTL ? 'טרנדינג' : 'Trending'}
            </TabsTrigger>
            <TabsTrigger value="tip" className="gap-1 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm flex-1 min-w-0">
              <Lightbulb className="w-3.5 h-3.5" />
              {isRTL ? 'טיפים' : 'Tips'}
            </TabsTrigger>
            <TabsTrigger value="culture" className="gap-1 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm flex-1 min-w-0">
              <Building2 className="w-3.5 h-3.5" />
              {isRTL ? 'תרבות' : 'Culture'}
            </TabsTrigger>
            <TabsTrigger value="poll" className="gap-1 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm flex-1 min-w-0">
              <BarChart3 className="w-3.5 h-3.5" />
              {isRTL ? 'סקרים' : 'Polls'}
            </TabsTrigger>
            <TabsTrigger value="webinars" className="gap-1 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm flex-1 min-w-0">
              <Video className="w-3.5 h-3.5" />
              {isRTL ? 'וובינרים' : 'Webinars'}
            </TabsTrigger>
          </TabsList>

          {/* Loading state */}
          {postsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="bg-card border border-border">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-1.5 flex-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-48 w-full rounded-lg" />
                    <div className="flex gap-4 pt-2">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-8 w-20" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              <TabsContent value="all" className="space-y-4">
                {renderPosts(allPosts)}
              </TabsContent>

              <TabsContent value="network" className="space-y-4">
                {renderPosts(networkPosts)}
              </TabsContent>

              <TabsContent value="trending" className="space-y-4">
                {renderPosts(trendingPosts)}
              </TabsContent>

              {['tip', 'culture', 'poll'].map(tab => (
                <TabsContent key={tab} value={tab} className="space-y-4">
                  {renderPosts(filterPosts(tab))}
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

function EmptyFeed({ isRTL, message, onCreatePost }: { isRTL: boolean; message?: string; onCreatePost?: () => void }) {
  return (
    <Card className="bg-card border border-border">
      <CardContent className="py-12 text-center">
        <Newspaper className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground text-sm mb-1">
          {message || (isRTL ? 'אין פוסטים בקטגוריה זו' : 'No posts in this category')}
        </p>
        <p className="text-xs text-muted-foreground/70 mb-4">
          {isRTL ? 'היה הראשון לפרסם תוכן!' : 'Be the first to share something!'}
        </p>
        {onCreatePost && (
          <Button size="sm" onClick={onCreatePost} className="gap-1.5">
            <PenLine className="w-4 h-4" />
            {isRTL ? 'צור פוסט' : 'Create Post'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
