import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useConnections } from '@/hooks/useConnections';
import { Header } from '@/components/Header';
import { ConnectButton } from '@/components/connections/ConnectButton';
import { ConnectionRequestCard } from '@/components/connections/ConnectionRequestCard';
import { PeopleYouMayKnow } from '@/components/connections/PeopleYouMayKnow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users, Briefcase, Building2, ArrowLeft, ArrowRight,
  Search, User, MessageSquare, Heart, ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FollowButton } from '@/components/feed/FollowButton';

const Network = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isHebrew = language === 'he';
  const isRTL = language === 'he';
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  const {
    connections,
    pendingReceived,
    pendingSent,
    isLoading,
    connectionCount,
    pendingCount,
  } = useConnections();

  const [searchQuery, setSearchQuery] = useState('');

  // Split connections by circle
  const colleagues = connections.filter((c: any) => c.circle === 'colleague');
  const recruiters = connections.filter((c: any) => c.circle === 'recruiter');

  // Fetch followed companies
  const { data: followedCompanies = [], isLoading: isLoadingCompanies } = useQuery({
    queryKey: ['followed-companies', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: follows, error } = await supabase
        .from('follows')
        .select('id, followed_company_id, created_at')
        .eq('follower_id', user.id)
        .not('followed_company_id', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!follows || follows.length === 0) return [];

      const companyIds = follows.map(f => f.followed_company_id).filter(Boolean);
      const { data: companies } = await (supabase as any)
        .from('companies')
        .select('id, name, logo_url, industry')
        .in('id', companyIds);

      return follows.map(f => ({
        ...f,
        company: (companies || []).find((c: any) => c.id === f.followed_company_id),
      }));
    },
    enabled: !!user?.id,
  });

  // Filter connections by search
  const filterBySearch = (items: any[]) => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((c: any) =>
      c.profile?.full_name?.toLowerCase().includes(q)
    );
  };

  // Stats
  const totalNetwork = connectionCount + followedCompanies.length;

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Header />
      <main className="container max-w-5xl mx-auto px-4 py-8" id="main-content">
        {/* Back + Title */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="shrink-0">
            <BackIcon className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-500" />
              {isHebrew ? 'הרשת שלי' : 'My Network'}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isHebrew
                ? 'קולגות, מגייסים וחברות — כל הקשרים שלך במקום אחד'
                : 'Colleagues, recruiters and companies — all your connections in one place'}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-blue-500">{totalNetwork}</p>
              <p className="text-[10px] text-muted-foreground">{isHebrew ? 'סה"כ רשת' : 'Total'}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{colleagues.length}</p>
              <p className="text-[10px] text-muted-foreground">{isHebrew ? 'קולגות' : 'Colleagues'}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-purple-500">{recruiters.length}</p>
              <p className="text-[10px] text-muted-foreground">{isHebrew ? 'מגייסים' : 'Recruiters'}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-emerald-500">{followedCompanies.length}</p>
              <p className="text-[10px] text-muted-foreground">{isHebrew ? 'חברות' : 'Companies'}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content — 2 cols */}
          <div className="lg:col-span-2 space-y-6">
            {/* Pending Requests */}
            {pendingReceived.length > 0 && (
              <Card className="bg-card border-border border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                      {pendingReceived.length}
                    </Badge>
                    {isHebrew ? 'בקשות חיבור ממתינות' : 'Pending Requests'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {pendingReceived.map((conn: any) => (
                    <ConnectionRequestCard key={conn.id} connection={conn} />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={isHebrew ? 'חפש קשר...' : 'Search connections...'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="ps-9"
              />
            </div>

            {/* Tabs */}
            <Tabs defaultValue="colleagues" className="space-y-4">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="colleagues" className="gap-1.5 text-xs sm:text-sm">
                  <Users className="w-4 h-4" />
                  {isHebrew ? `קולגות (${colleagues.length})` : `Colleagues (${colleagues.length})`}
                </TabsTrigger>
                <TabsTrigger value="recruiters" className="gap-1.5 text-xs sm:text-sm">
                  <Briefcase className="w-4 h-4" />
                  {isHebrew ? `מגייסים (${recruiters.length})` : `Recruiters (${recruiters.length})`}
                </TabsTrigger>
                <TabsTrigger value="companies" className="gap-1.5 text-xs sm:text-sm">
                  <Building2 className="w-4 h-4" />
                  {isHebrew ? `חברות (${followedCompanies.length})` : `Companies (${followedCompanies.length})`}
                </TabsTrigger>
              </TabsList>

              {/* Colleagues Tab */}
              <TabsContent value="colleagues" className="space-y-3">
                {isLoading ? (
                  <LoadingSkeletons />
                ) : filterBySearch(colleagues).length > 0 ? (
                  <motion.div className="space-y-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {filterBySearch(colleagues).map((conn: any) => (
                      <ConnectionCard
                        key={conn.id}
                        connection={conn}
                        circle="colleague"
                        language={language}
                        onNavigate={navigate}
                      />
                    ))}
                  </motion.div>
                ) : (
                  <EmptyState
                    icon={<Users className="h-12 w-12" />}
                    title={isHebrew ? 'אין קולגות עדיין' : 'No colleagues yet'}
                    description={isHebrew
                      ? 'חבר קולגות מהעבר ומההווה — הם הרשת החזקה ביותר שלך'
                      : 'Connect with past and present colleagues — they are your strongest network'}
                  />
                )}
              </TabsContent>

              {/* Recruiters Tab */}
              <TabsContent value="recruiters" className="space-y-3">
                {isLoading ? (
                  <LoadingSkeletons />
                ) : filterBySearch(recruiters).length > 0 ? (
                  <motion.div className="space-y-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {filterBySearch(recruiters).map((conn: any) => (
                      <ConnectionCard
                        key={conn.id}
                        connection={conn}
                        circle="recruiter"
                        language={language}
                        onNavigate={navigate}
                      />
                    ))}
                  </motion.div>
                ) : (
                  <EmptyState
                    icon={<Briefcase className="h-12 w-12" />}
                    title={isHebrew ? 'אין מגייסים עדיין' : 'No recruiters yet'}
                    description={isHebrew
                      ? 'התחבר למגייסים כדי שיוכלו למצוא אותך לתפקידים מתאימים'
                      : 'Connect with recruiters so they can find you for matching roles'}
                  />
                )}
              </TabsContent>

              {/* Companies Tab */}
              <TabsContent value="companies" className="space-y-3">
                {isLoadingCompanies ? (
                  <LoadingSkeletons />
                ) : followedCompanies.length > 0 ? (
                  <motion.div className="space-y-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {followedCompanies.map((fc: any) => (
                      <Card key={fc.id} className="bg-card border-border hover:border-primary/20 transition-colors">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 rounded-lg shrink-0">
                              <AvatarImage src={fc.company?.logo_url || ''} />
                              <AvatarFallback className="rounded-lg bg-emerald-500/10 text-emerald-600 text-sm">
                                {fc.company?.name?.[0]?.toUpperCase() || <Building2 className="h-4 w-4" />}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {fc.company?.name || (isHebrew ? 'חברה' : 'Company')}
                              </p>
                              {fc.company?.industry && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {fc.company.industry}
                                </p>
                              )}
                            </div>
                            <FollowButton targetCompanyId={fc.followed_company_id} size="sm" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </motion.div>
                ) : (
                  <EmptyState
                    icon={<Building2 className="h-12 w-12" />}
                    title={isHebrew ? 'לא עוקב אחרי חברות' : 'No companies followed'}
                    description={isHebrew
                      ? 'עקוב אחרי חברות כדי לקבל עדכונים על משרות חדשות'
                      : 'Follow companies to get updates on new job openings'}
                  />
                )}
              </TabsContent>
            </Tabs>

            {/* Sent Requests */}
            {pendingSent.length > 0 && (
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    {isHebrew ? `בקשות שנשלחו (${pendingSent.length})` : `Sent Requests (${pendingSent.length})`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {pendingSent.map((conn: any) => (
                    <div key={conn.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={conn.profile?.avatar_url || ''} />
                        <AvatarFallback><User className="h-3.5 w-3.5" /></AvatarFallback>
                      </Avatar>
                      <span className="text-sm flex-1 truncate">
                        {conn.profile?.full_name || (isHebrew ? 'משתמש' : 'User')}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {isHebrew ? 'ממתין' : 'Pending'}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar — 1 col */}
          <div className="space-y-4">
            <PeopleYouMayKnow />
          </div>
        </div>
      </main>
    </div>
  );
};

// --- Sub-components ---

function ConnectionCard({
  connection,
  circle,
  language,
  onNavigate,
}: {
  connection: any;
  circle: 'colleague' | 'recruiter';
  language: string;
  onNavigate: (path: string) => void;
}) {
  const isHebrew = language === 'he';
  const profile = connection.profile;
  const initials = profile?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || '??';

  return (
    <Card className="bg-card border-border hover:border-primary/20 transition-colors">
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <Avatar
            className="h-10 w-10 shrink-0 cursor-pointer"
            onClick={() => profile?.user_id && onNavigate(`/profile/${profile.user_id}`)}
          >
            <AvatarImage src={profile?.avatar_url || ''} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => profile?.user_id && onNavigate(`/profile/${profile.user_id}`)}
          >
            <p className="font-medium text-sm truncate hover:text-primary transition-colors">
              {profile?.full_name || (isHebrew ? 'משתמש' : 'User')}
            </p>
            <Badge variant="outline" className="text-[10px] mt-0.5">
              {circle === 'colleague'
                ? (isHebrew ? 'קולגה' : 'Colleague')
                : (isHebrew ? 'מגייס' : 'Recruiter')}
            </Badge>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => profile?.user_id && onNavigate(`/profile/${profile.user_id}`)}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="py-12 text-center">
        <div className="text-muted-foreground/30 mx-auto mb-3">{icon}</div>
        <p className="text-muted-foreground font-medium">{title}</p>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

function LoadingSkeletons() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <Skeleton key={i} className="h-16 w-full rounded-lg" />
      ))}
    </div>
  );
}

export default Network;
