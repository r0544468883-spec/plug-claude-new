import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/contexts/CreditsContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AMBASSADOR_TIERS, ACHIEVEMENTS, getTierFromXP,
  type AmbassadorTier, type AchievementId
} from '@/lib/credit-costs';
import {
  Trophy, Star, Flame, Users, Share2, Heart, Award,
  Zap, Target, Crown, Shield, Sparkles, TrendingUp,
  CheckCircle2, Lock, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const TIER_ICONS: Record<AmbassadorTier, typeof Star> = {
  explorer: Star,
  connector: Users,
  advocate: Heart,
  ambassador: Award,
  champion: Crown,
};

const TIER_COLORS: Record<AmbassadorTier, string> = {
  explorer: 'text-muted-foreground',
  connector: 'text-amber-600',
  advocate: 'text-slate-400',
  ambassador: 'text-yellow-500',
  champion: 'text-purple-400',
};

const BADGE_COLORS: Record<string, string> = {
  bronze: 'bg-amber-600/20 text-amber-600 border-amber-600/30',
  silver: 'bg-slate-300/20 text-slate-400 border-slate-400/30',
  gold: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
  platinum: 'bg-purple-400/20 text-purple-400 border-purple-400/30',
};

export function AmbassadorDashboard() {
  const { user, profile } = useAuth();
  const { credits } = useCredits();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isHebrew = language === 'he';

  const xp = credits?.xp || 0;
  const currentTier = getTierFromXP(xp);
  const tierConfig = AMBASSADOR_TIERS[currentTier];
  const TierIcon = TIER_ICONS[currentTier];

  // Next tier calculation
  const tiers = Object.entries(AMBASSADOR_TIERS) as [AmbassadorTier, typeof tierConfig][];
  const currentTierIndex = tiers.findIndex(([k]) => k === currentTier);
  const nextTier = currentTierIndex < tiers.length - 1 ? tiers[currentTierIndex + 1] : null;
  const xpForNext = nextTier ? nextTier[1].minXP : xp;
  const xpProgress = nextTier
    ? ((xp - tierConfig.minXP) / (xpForNext - tierConfig.minXP)) * 100
    : 100;

  // Fetch achievements
  const { data: unlockedAchievements = [] } = useQuery({
    queryKey: ['achievements', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await (supabase.from('achievements') as any)
        .select('*')
        .eq('user_id', user.id);
      return (data || []) as { achievement_id: string; unlocked_at: string; xp_awarded: number; fuel_awarded: number }[];
    },
    enabled: !!user?.id,
  });

  // Fetch leaderboard
  const { data: leaderboard = [] } = useQuery({
    queryKey: ['ambassador-leaderboard'],
    queryFn: async () => {
      const { data } = await (supabase.from('ambassador_leaderboard') as any)
        .select('*')
        .limit(20);
      return (data || []) as { user_id: string; full_name: string; avatar_url: string | null; xp: number; ambassador_tier: string; rank: number }[];
    },
  });

  const unlockedIds = new Set(unlockedAchievements.map(a => a.achievement_id));
  const myRank = leaderboard.findIndex(l => l.user_id === user?.id) + 1;

  return (
    <div className="space-y-6" dir={isHebrew ? 'rtl' : 'ltr'}>
      {/* Hero Card: Tier & XP */}
      <Card className="overflow-hidden">
        <div className={cn(
          "bg-gradient-to-br p-6",
          currentTier === 'champion' ? 'from-purple-600/20 to-purple-900/20' :
          currentTier === 'ambassador' ? 'from-yellow-500/20 to-amber-700/20' :
          currentTier === 'advocate' ? 'from-slate-300/20 to-slate-500/20' :
          currentTier === 'connector' ? 'from-amber-500/20 to-amber-700/20' :
          'from-muted/50 to-muted/30'
        )}>
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center border-2",
              BADGE_COLORS[tierConfig.badge || ''] || 'border-muted-foreground/30 bg-muted/50'
            )}>
              <TierIcon className={cn("w-8 h-8", TIER_COLORS[currentTier])} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold">
                  {isHebrew ? tierConfig.label.he : tierConfig.label.en}
                </h2>
                {tierConfig.badge && (
                  <Badge variant="outline" className={cn("text-xs", BADGE_COLORS[tierConfig.badge])}>
                    {tierConfig.badge}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {xp.toLocaleString()} XP
                {nextTier && (
                  <span> / {xpForNext.toLocaleString()} XP {isHebrew ? `ל-${nextTier[1].label.he}` : `to ${nextTier[1].label.en}`}</span>
                )}
              </p>
            </div>
          </div>

          {nextTier && (
            <div className="mt-4">
              <Progress value={xpProgress} className="h-2.5" />
              <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
                <span>{isHebrew ? tierConfig.label.he : tierConfig.label.en}</span>
                <span>{isHebrew ? nextTier[1].label.he : nextTier[1].label.en}</span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Users, value: credits?.total_referrals || 0, label: isHebrew ? 'הזמנות' : 'Referrals', color: 'text-blue-500' },
          { icon: Flame, value: credits?.login_streak || 0, label: isHebrew ? 'רצף ימים' : 'Day Streak', color: 'text-orange-500' },
          { icon: Heart, value: credits?.total_vouches_given || 0, label: isHebrew ? 'המלצות' : 'Vouches', color: 'text-pink-500' },
          { icon: Zap, value: tierConfig.dailyFuel, label: isHebrew ? 'דלק יומי' : 'Daily Fuel', color: 'text-green-500' },
        ].map((stat, i) => (
          <Card key={i} className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={cn("w-4 h-4", stat.color)} />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="achievements" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="achievements" className="gap-1.5">
            <Trophy className="w-4 h-4" />
            {isHebrew ? 'הישגים' : 'Achievements'}
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="gap-1.5">
            <TrendingUp className="w-4 h-4" />
            {isHebrew ? 'מובילים' : 'Leaderboard'}
          </TabsTrigger>
          <TabsTrigger value="tiers" className="gap-1.5">
            <Shield className="w-4 h-4" />
            {isHebrew ? 'דרגות' : 'Tiers'}
          </TabsTrigger>
        </TabsList>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.entries(ACHIEVEMENTS) as [AchievementId, typeof ACHIEVEMENTS[AchievementId]][]).map(([id, ach]) => {
              const unlocked = unlockedIds.has(id);
              return (
                <Card key={id} className={cn(
                  "transition-all",
                  unlocked ? "border-primary/30 bg-primary/5" : "opacity-60"
                )}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      unlocked ? "bg-primary/20" : "bg-muted"
                    )}>
                      {unlocked ? (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      ) : (
                        <Lock className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{isHebrew ? ach.label.he : ach.label.en}</p>
                      <p className="text-xs text-muted-foreground">
                        +{ach.xp} XP &middot; +{ach.fuel} {isHebrew ? 'דלק' : 'fuel'}
                      </p>
                    </div>
                    {unlocked && (
                      <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {leaderboard.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Trophy className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>{isHebrew ? 'עדיין אין נתונים' : 'No data yet'}</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {leaderboard.slice(0, 15).map((entry, index) => {
                    const isMe = entry.user_id === user?.id;
                    const rank = index + 1;
                    return (
                      <div key={entry.user_id} className={cn(
                        "flex items-center gap-3 px-4 py-3",
                        isMe && "bg-primary/5"
                      )}>
                        <span className={cn(
                          "w-7 text-center font-bold text-sm",
                          rank === 1 ? "text-yellow-500" :
                          rank === 2 ? "text-slate-400" :
                          rank === 3 ? "text-amber-600" :
                          "text-muted-foreground"
                        )}>
                          {rank <= 3 ? ['', '🥇', '🥈', '🥉'][rank] : `${rank}.`}
                        </span>
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={entry.avatar_url || undefined} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {entry.full_name?.charAt(0)?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm truncate", isMe && "font-bold")}>
                            {isMe ? (isHebrew ? 'את/ה' : 'You') : entry.full_name}
                          </p>
                        </div>
                        <Badge variant="outline" className={cn(
                          "text-xs",
                          BADGE_COLORS[AMBASSADOR_TIERS[entry.ambassador_tier as AmbassadorTier]?.badge || ''] || ''
                        )}>
                          {entry.xp.toLocaleString()} XP
                        </Badge>
                      </div>
                    );
                  })}
                  {myRank > 15 && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-primary/5 border-t-2 border-primary/20">
                      <span className="w-7 text-center font-bold text-sm text-muted-foreground">{myRank}.</span>
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-bold">{isHebrew ? 'את/ה' : 'You'}</p>
                      </div>
                      <Badge variant="outline">{xp.toLocaleString()} XP</Badge>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tiers Tab */}
        <TabsContent value="tiers" className="mt-4">
          <div className="space-y-3">
            {tiers.map(([key, tier]) => {
              const Icon = TIER_ICONS[key];
              const isCurrentTier = key === currentTier;
              const isLocked = tier.minXP > xp;
              return (
                <Card key={key} className={cn(
                  "transition-all",
                  isCurrentTier ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20" :
                  isLocked ? "opacity-50" : ""
                )}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center border-2",
                      BADGE_COLORS[tier.badge || ''] || 'border-muted-foreground/30 bg-muted/50'
                    )}>
                      <Icon className={cn("w-6 h-6", TIER_COLORS[key])} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold">{isHebrew ? tier.label.he : tier.label.en}</p>
                        {isCurrentTier && (
                          <Badge className="bg-primary text-primary-foreground text-[10px]">
                            {isHebrew ? 'הדרגה שלך' : 'Your tier'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {tier.minXP.toLocaleString()} XP &middot; {tier.dailyFuel} {isHebrew ? 'דלק/יום' : 'fuel/day'}
                        {tier.referralBonus > 0 && ` &middot; +${tier.referralBonus} ${isHebrew ? 'בונוס רפרל' : 'referral bonus'}`}
                      </p>
                    </div>
                    {isLocked ? (
                      <Lock className="w-5 h-5 text-muted-foreground" />
                    ) : isCurrentTier ? (
                      <ChevronRight className="w-5 h-5 text-primary" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* CTA */}
      <div className="flex gap-3">
        <Button onClick={() => navigate('/fuel-up')} className="flex-1 gap-2">
          <Zap className="w-4 h-4" />
          {isHebrew ? 'צבור דלק' : 'Earn Fuel'}
        </Button>
        <Button variant="outline" onClick={() => navigate('/referrals')} className="flex-1 gap-2">
          <Share2 className="w-4 h-4" />
          {isHebrew ? 'הזמן חברים' : 'Invite Friends'}
        </Button>
      </div>
    </div>
  );
}
