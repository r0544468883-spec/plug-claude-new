import { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Newspaper, ArrowRight, ArrowLeft } from 'lucide-react';
import { generateFeedPosts, FeedPost } from './feedMockData';

interface FeedCarouselWidgetProps {
  onNavigateToFeed: () => void;
}

const ROTATE_INTERVAL = 10_000;

export function FeedCarouselWidget({ onNavigateToFeed }: FeedCarouselWidgetProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'he';
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  // Fetch followed IDs for prioritization
  const { data: followedIds } = useQuery({
    queryKey: ['carousel-follows', user?.id],
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

  // Fetch real posts
  const { data: dbPosts } = useQuery({
    queryKey: ['carousel-feed-posts'],
    queryFn: async () => {
      const { data: posts, error } = await supabase
        .from('feed_posts')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error || !posts?.length) return [];

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
        likes: p.likes_count || 0,
        comments: p.comments_count || 0,
        createdAt: p.created_at,
        authorId: p.author_id,
        companyId: p.company_id,
      }));
    },
  });

  const mockPosts = useMemo(() => generateFeedPosts([]), []);

  // Combine & prioritize: followed first, then sort by engagement, take top 5
  const posts = useMemo(() => {
    const real = dbPosts || [];
    const combined = real.length >= 3 ? real : [...real, ...mockPosts];

    let sorted: FeedPost[];
    if (followedIds?.userIds.length || followedIds?.companyIds.length) {
      const followed: FeedPost[] = [];
      const rest: FeedPost[] = [];
      for (const p of combined) {
        if ((p.authorId && followedIds!.userIds.includes(p.authorId)) ||
            (p.companyId && followedIds!.companyIds.includes(p.companyId))) {
          followed.push(p);
        } else {
          rest.push(p);
        }
      }
      sorted = [...followed, ...rest.sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments))];
    } else {
      sorted = [...combined].sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments));
    }

    return sorted.slice(0, 5);
  }, [dbPosts, mockPosts, followedIds]);

  // Auto-rotate
  useEffect(() => {
    if (paused || posts.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % posts.length);
    }, ROTATE_INTERVAL);
    return () => clearInterval(timer);
  }, [paused, posts.length]);

  // Reset index when posts change
  useEffect(() => {
    setCurrentIndex(0);
  }, [posts.length]);

  const handleDotClick = useCallback((i: number) => {
    setCurrentIndex(i);
  }, []);

  if (posts.length === 0) return null;

  const post = posts[currentIndex];
  const content = isRTL ? post.contentHe : post.content;
  const snippet = content.length > 120 ? content.slice(0, 120) + '...' : content;
  const NavArrow = isRTL ? ArrowLeft : ArrowRight;

  return (
    <Card
      className="bg-card border-border plug-card-hover cursor-pointer"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onClick={onNavigateToFeed}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-primary" />
            {isRTL ? 'מהפיד שלך' : 'From Your Feed'}
          </span>
          <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground h-auto p-0 hover:text-primary">
            {isRTL ? 'לפיד' : 'View Feed'}
            <NavArrow className="w-3 h-3" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            {/* Author */}
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {post.recruiterAvatar}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{post.recruiterName}</p>
                {post.companyName && (
                  <p className="text-xs text-muted-foreground truncate">{post.companyName}</p>
                )}
              </div>
            </div>

            {/* Content */}
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
              {snippet}
            </p>

            {/* Stats */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Heart className="w-3 h-3" /> {post.likes}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3" /> {post.comments}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Dots */}
        {posts.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-3">
            {posts.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); handleDotClick(i); }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i === currentIndex
                    ? 'bg-primary w-3'
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
