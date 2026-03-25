import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart3, Eye, Heart, MessageSquare, Share2, TrendingUp, Lightbulb, Sparkles, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface ContentDashboardProps {
  onNavigate?: (section: string) => void;
}

export function ContentDashboard({ onNavigate }: ContentDashboardProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isHebrew = language === 'he';

  // User's posts
  const { data: posts = [] } = useQuery({
    queryKey: ['content-dashboard', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase.from('feed_posts').select('*').eq('author_id', user.id).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  // All posts for benchmark
  const { data: allPosts = [] } = useQuery({
    queryKey: ['content-benchmark'],
    queryFn: async () => {
      const { data } = await supabase.from('feed_posts').select('likes_count, comments_count, views_count, post_type').eq('is_published', true).limit(500);
      return data || [];
    },
  });

  const totalViews = posts.reduce((sum, p) => sum + ((p as any).views_count || 0), 0);
  const totalLikes = posts.reduce((sum, p) => sum + (p.likes_count || 0), 0);
  const totalComments = posts.reduce((sum, p) => sum + (p.comments_count || 0), 0);
  const totalShares = posts.reduce((sum, p) => sum + ((p as any).shares_count || 0), 0);

  // Benchmark: average engagement across all posts vs user posts
  const allAvgLikes = allPosts.length > 0 ? (allPosts.reduce((s, p) => s + (p.likes_count || 0), 0) / allPosts.length) : 0;
  const allAvgComments = allPosts.length > 0 ? (allPosts.reduce((s, p) => s + (p.comments_count || 0), 0) / allPosts.length) : 0;
  const userAvgLikes = posts.length > 0 ? totalLikes / posts.length : 0;
  const userAvgComments = posts.length > 0 ? totalComments / posts.length : 0;

  // Top performing posts (anonymous)
  const topPosts = [...allPosts].sort((a, b) => (b.likes_count || 0) + (b.comments_count || 0) - (a.likes_count || 0) - (a.comments_count || 0)).slice(0, 3);

  const chartData = posts.slice(0, 10).map((p, i) => ({
    name: `#${i + 1}`,
    likes: p.likes_count || 0,
    comments: p.comments_count || 0,
    views: (p as any).views_count || 0,
  }));

  const tips = [
    { text: isHebrew ? 'פוסטים עם תמונה מקבלים 2x יותר engagement' : 'Posts with images get 2x more engagement', emoji: '📸' },
    { text: isHebrew ? 'פוסטים עם סקר מגיעים ל-3x תגובות' : 'Posts with polls reach 3x more comments', emoji: '📊' },
    { text: isHebrew ? 'פרסמי תוכן בשעות 8-10 בבוקר לחשיפה מקסימלית' : 'Post at 8-10 AM for maximum exposure', emoji: '⏰' },
    { text: isHebrew ? 'שאלות פתוחות מעודדות דיון' : 'Open questions encourage discussion', emoji: '💬' },
  ];

  return (
    <div className="space-y-6" dir={isHebrew ? 'rtl' : 'ltr'}>
      <h2 className="text-2xl font-bold flex items-center gap-3">
        <BarChart3 className="w-6 h-6 text-primary" />
        {isHebrew ? 'דאשבורד תוכן' : 'Content Dashboard'}
      </h2>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: isHebrew ? 'צפיות' : 'Views', value: totalViews, icon: Eye, color: 'text-blue-500' },
          { label: isHebrew ? 'לייקים' : 'Likes', value: totalLikes, icon: Heart, color: 'text-pink-500' },
          { label: isHebrew ? 'תגובות' : 'Comments', value: totalComments, icon: MessageSquare, color: 'text-primary' },
          { label: isHebrew ? 'שיתופים' : 'Shares', value: totalShares, icon: Share2, color: 'text-accent' },
        ].map((stat) => (
          <Card key={stat.label} className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted"><stat.icon className={`w-5 h-5 ${stat.color}`} /></div>
              <div><p className="text-2xl font-bold">{stat.value}</p><p className="text-xs text-muted-foreground">{stat.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Benchmark Comparison */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            {isHebrew ? 'השוואה לממוצע המערכת' : 'Benchmark vs. Platform Average'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">{isHebrew ? 'לייקים ממוצע לפוסט' : 'Avg. likes per post'}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold">{userAvgLikes.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">vs {allAvgLikes.toFixed(1)} {isHebrew ? 'ממוצע' : 'avg'}</span>
              </div>
              {userAvgLikes >= allAvgLikes ? <Badge className="mt-1 bg-primary/20 text-primary text-xs">🔥 {isHebrew ? 'מעל הממוצע!' : 'Above average!'}</Badge> : <Badge variant="outline" className="mt-1 text-xs">{isHebrew ? 'יש מקום לצמוח' : 'Room to grow'}</Badge>}
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">{isHebrew ? 'תגובות ממוצע לפוסט' : 'Avg. comments per post'}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold">{userAvgComments.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">vs {allAvgComments.toFixed(1)} {isHebrew ? 'ממוצע' : 'avg'}</span>
              </div>
              {userAvgComments >= allAvgComments ? <Badge className="mt-1 bg-primary/20 text-primary text-xs">🔥 {isHebrew ? 'מעל הממוצע!' : 'Above average!'}</Badge> : <Badge variant="outline" className="mt-1 text-xs">{isHebrew ? 'יש מקום לצמוח' : 'Room to grow'}</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Performing Posts (anonymous) */}
      {topPosts.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              {isHebrew ? 'פוסטים מובילים במערכת' : 'Top Performing Posts (Platform)'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topPosts.map((p, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                  <Badge variant="outline">{(p as any).post_type || 'tip'}</Badge>
                  <div className="flex-1 text-sm text-muted-foreground">{isHebrew ? `פוסט מסוג ${(p as any).post_type}` : `${(p as any).post_type} post`}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{p.likes_count || 0}</span>
                    <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{p.comments_count || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Card className="bg-gradient-to-r from-accent/5 to-primary/5 border-accent/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Lightbulb className="w-4 h-4 text-accent" />{isHebrew ? 'טיפים לתוכן מצליח' : 'Tips for Great Content'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-background/50">
                <span className="text-lg">{tip.emoji}</span>
                <p className="text-sm text-muted-foreground">{tip.text}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <Card className="bg-primary/10 border-primary/20 cursor-pointer plug-card-hover" onClick={() => onNavigate?.('create-feed-post')}>
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{isHebrew ? 'צרי תוכן חדש' : 'Create New Content'}</h3>
            <p className="text-sm text-muted-foreground">{isHebrew ? 'הגיע הזמן לפוסט הבא שלך!' : 'Time for your next post!'}</p>
          </div>
          <ArrowRight className="w-5 h-5 text-primary" />
        </CardContent>
      </Card>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{isHebrew ? 'ביצועי פוסטים אחרונים' : 'Recent Post Performance'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="likes" fill="hsl(330, 80%, 60%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="comments" fill="hsl(156, 100%, 50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Posts Table */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{isHebrew ? 'כל הפוסטים' : 'All Posts'}</CardTitle>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{isHebrew ? 'אין פוסטים עדיין' : 'No posts yet'}</p>
          ) : (
            <div className="space-y-2">
              {posts.map((post) => (
                <div key={post.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <Badge variant="outline" className="shrink-0">{post.post_type}</Badge>
                  <p className="flex-1 text-sm truncate">{(post as any).content_en || (post as any).content_he || '—'}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{(post as any).views_count || 0}</span>
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{post.likes_count || 0}</span>
                    <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{post.comments_count || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
