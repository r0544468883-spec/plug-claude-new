import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Header } from '@/components/Header';
import { VouchCard } from '@/components/vouch/VouchCard';
import { WeightedSkillHeatmap } from '@/components/vouch/WeightedSkillHeatmap';
import { VouchDiscovery } from '@/components/vouch/VouchDiscovery';
import { GiveVouchDialog } from '@/components/vouch/GiveVouchDialog';
import { RequestVouchDialog } from '@/components/vouch/RequestVouchDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Heart, Users, Sparkles, ArrowLeft, ArrowRight,
  Shield, Award, Crown, MessageSquare, HandHeart, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const Vouches = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isHebrew = language === 'he';
  const isRTL = language === 'he';
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  // Fetch all vouches received by this user
  const { data: vouches, isLoading } = useQuery({
    queryKey: ['my-vouches', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: vouchesData, error } = await supabase
        .from('vouches')
        .select('*')
        .eq('to_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get profiles for from_user_ids
      const fromUserIds = vouchesData.map(v => v.from_user_id);
      if (fromUserIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles_secure')
        .select('user_id, full_name, avatar_url')
        .in('user_id', fromUserIds);

      return vouchesData.map(vouch => ({
        ...vouch,
        from_profile: profiles?.find(p => p.user_id === vouch.from_user_id),
      }));
    },
    enabled: !!user?.id,
  });

  // Fetch vouches I gave to others
  const { data: givenVouches, isLoading: isLoadingGiven } = useQuery({
    queryKey: ['my-given-vouches', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: vouchesData, error } = await supabase
        .from('vouches')
        .select('*')
        .eq('from_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get profiles for to_user_ids
      const toUserIds = vouchesData.map(v => v.to_user_id);
      if (toUserIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles_secure')
        .select('user_id, full_name, avatar_url')
        .in('user_id', toUserIds);

      return vouchesData.map(vouch => ({
        ...vouch,
        // For given vouches, show the recipient profile as "from_profile" for VouchCard display
        from_profile: profiles?.find(p => p.user_id === vouch.to_user_id),
      }));
    },
    enabled: !!user?.id,
  });

  // Fetch pending vouch requests sent TO me (I need to vouch for them)
  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['pending-vouch-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: requests, error } = await (supabase as any)
        .from('vouch_requests')
        .select('id, from_user_id, message, created_at')
        .eq('to_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!requests?.length) return [];

      const fromIds = requests.map((r: any) => r.from_user_id);
      const { data: profiles } = await supabase
        .from('profiles_secure')
        .select('user_id, full_name, avatar_url')
        .in('user_id', fromIds);

      return requests.map((r: any) => ({
        ...r,
        profile: profiles?.find((p: any) => p.user_id === r.from_user_id),
      }));
    },
    enabled: !!user?.id,
  });

  // Stats
  const totalReceived = vouches?.length || 0;
  const totalGiven = givenVouches?.length || 0;
  const uniqueEndorsers = new Set(vouches?.map(v => v.from_user_id) || []).size;

  // Count by type
  const typeCount: Record<string, number> = {};
  vouches?.forEach(v => {
    typeCount[v.vouch_type] = (typeCount[v.vouch_type] || 0) + 1;
  });

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Header />
      <main className="container max-w-4xl mx-auto px-4 py-8" id="main-content">
        {/* Back button + Title */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="shrink-0"
          >
            <BackIcon className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Heart className="w-6 h-6 text-pink-500" />
              {isHebrew ? 'ההמלצות שלי' : 'My Vouches'}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isHebrew
                ? 'כל ההמלצות שקיבלת ונתת — במקום אחד'
                : 'All recommendations you received and gave — in one place'}
            </p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-pink-500">{totalReceived}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isHebrew ? 'המלצות שקיבלתי' : 'Received'}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-primary">{uniqueEndorsers}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isHebrew ? 'ממליצים ייחודיים' : 'Unique Endorsers'}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-[#00FF9D]">{totalGiven}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isHebrew ? 'המלצות שנתתי' : 'Given'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mb-6">
          <GiveVouchDialog trigger={
            <Button variant="outline" className="flex-1 gap-2">
              <Heart className="w-4 h-4" />
              {isHebrew ? 'תן המלצה' : 'Give Vouch'}
            </Button>
          } />
          <RequestVouchDialog trigger={
            <Button variant="outline" className="flex-1 gap-2">
              <MessageSquare className="w-4 h-4" />
              {isHebrew ? 'בקש המלצה' : 'Request Vouch'}
            </Button>
          } />
        </div>

        {/* Pending Vouch Requests (someone asked me to vouch) */}
        {pendingRequests.length > 0 && (
          <Card className="bg-card border-border mb-6 border-primary/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <HandHeart className="h-5 w-5 text-primary" />
                {isHebrew ? 'בקשות המלצה שקיבלת' : 'Vouch Requests'}
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {pendingRequests.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pendingRequests.map((req: any) => (
                <div key={req.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {req.profile?.full_name || (isHebrew ? 'משתמש' : 'User')}
                    </p>
                    {req.message && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        "{req.message}"
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(req.created_at).toLocaleDateString(isHebrew ? 'he-IL' : 'en-US')}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="gap-1.5 shrink-0"
                    onClick={() => {
                      window.dispatchEvent(
                        new CustomEvent('open-give-vouch', {
                          detail: {
                            userId: req.from_user_id,
                            userName: req.profile?.full_name || '',
                            avatarUrl: req.profile?.avatar_url,
                          },
                        })
                      );
                    }}
                  >
                    <Heart className="w-3.5 h-3.5" />
                    {isHebrew ? 'כתוב המלצה' : 'Write Vouch'}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Return the Vouch suggestions */}
        <div className="mb-6">
          <VouchDiscovery />
        </div>

        {/* Verified Skills Heatmap */}
        {user?.id && totalReceived > 0 && (
          <Card className="bg-card border-border mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-primary" />
                {isHebrew ? 'מיומנויות מאומתות' : 'Verified Skills'}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {isHebrew
                  ? 'מיומנויות שאנשים אימתו עליך — ככל שיותר אנשים מאשרים, הבאדג\' גדל'
                  : 'Skills people verified about you — more endorsements = bigger badge'}
              </p>
            </CardHeader>
            <CardContent>
              <WeightedSkillHeatmap userId={user.id} />
            </CardContent>
          </Card>
        )}

        {/* Tabs: Received / Given */}
        <Tabs defaultValue="received" className="space-y-4">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="received" className="gap-2">
              <Heart className="w-4 h-4" />
              {isHebrew ? `קיבלתי (${totalReceived})` : `Received (${totalReceived})`}
            </TabsTrigger>
            <TabsTrigger value="given" className="gap-2">
              <Users className="w-4 h-4" />
              {isHebrew ? `נתתי (${totalGiven})` : `Given (${totalGiven})`}
            </TabsTrigger>
          </TabsList>

          {/* Received vouches */}
          <TabsContent value="received" className="space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-28 w-full rounded-lg" />
                ))}
              </div>
            ) : vouches && vouches.length > 0 ? (
              <motion.div
                className="space-y-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {/* Type filter pills */}
                {Object.keys(typeCount).length > 1 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {Object.entries(typeCount).map(([type, count]) => (
                      <span
                        key={type}
                        className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground"
                      >
                        {type} ({count})
                      </span>
                    ))}
                  </div>
                )}

                {vouches.map(vouch => (
                  <VouchCard key={vouch.id} vouch={vouch} />
                ))}
              </motion.div>
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center">
                  <Heart className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground font-medium">
                    {isHebrew ? 'עדיין אין המלצות' : 'No vouches yet'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isHebrew
                      ? 'בקש המלצות מאנשים שעבדת איתם כדי לחזק את הפרופיל שלך'
                      : 'Request vouches from people you worked with to strengthen your profile'}
                  </p>
                  <RequestVouchDialog trigger={
                    <Button variant="outline" className="mt-4 gap-2">
                      <MessageSquare className="w-4 h-4" />
                      {isHebrew ? 'בקש המלצה ראשונה' : 'Request Your First Vouch'}
                    </Button>
                  } />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Given vouches */}
          <TabsContent value="given" className="space-y-3">
            {isLoadingGiven ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-28 w-full rounded-lg" />
                ))}
              </div>
            ) : givenVouches && givenVouches.length > 0 ? (
              <motion.div
                className="space-y-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {givenVouches.map(vouch => (
                  <VouchCard key={vouch.id} vouch={vouch} />
                ))}
              </motion.div>
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground font-medium">
                    {isHebrew ? 'עדיין לא נתת המלצות' : 'No vouches given yet'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isHebrew
                      ? 'תן המלצה לעמיתים — זה מחזק גם אותך!'
                      : 'Vouch for colleagues — it strengthens your profile too!'}
                  </p>
                  <GiveVouchDialog trigger={
                    <Button variant="outline" className="mt-4 gap-2">
                      <Heart className="w-4 h-4" />
                      {isHebrew ? 'תן המלצה ראשונה' : 'Give Your First Vouch'}
                    </Button>
                  } />
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Vouches;
