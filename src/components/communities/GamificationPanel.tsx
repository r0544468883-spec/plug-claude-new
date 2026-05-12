import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import { Trophy, Flame, Star, TrendingUp, Crown, Shield, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

interface GamificationPanelProps {
  hubId: string;
}

const TRUST_LEVELS = [
  { label: 'New', labelHe: 'חדש', color: 'bg-gray-100 text-gray-700', icon: User, threshold: 0 },
  { label: 'Member', labelHe: 'חבר', color: 'bg-blue-100 text-blue-700', icon: Shield, threshold: 10 },
  { label: 'Active', labelHe: 'פעיל', color: 'bg-green-100 text-green-700', icon: Star, threshold: 100 },
  { label: 'Leader', labelHe: 'מוביל', color: 'bg-purple-100 text-purple-700', icon: TrendingUp, threshold: 500 },
  { label: 'Elder', labelHe: 'זקן הקהילה', color: 'bg-yellow-100 text-yellow-700', icon: Crown, threshold: 1000 },
];

const LEVEL_THRESHOLDS = [0, 10, 100, 500, 1000];

function getTrustLevelInfo(level: number) {
  return TRUST_LEVELS[Math.min(Math.max(level, 0), 4)];
}

function getProgressToNextLevel(points: number, trustLevel: number): number {
  if (trustLevel >= 4) return 100;
  const current = LEVEL_THRESHOLDS[trustLevel];
  const next = LEVEL_THRESHOLDS[trustLevel + 1];
  return Math.min(100, Math.round(((points - current) / (next - current)) * 100));
}

function TrustBadge({ level, isRTL }: { level: number; isRTL: boolean }) {
  const info = getTrustLevelInfo(level);
  const Icon = info.icon;
  return (
    <Badge className={cn('gap-1 text-xs font-medium', info.color)}>
      <Icon className="w-3 h-3" />
      {isRTL ? info.labelHe : info.label}
    </Badge>
  );
}

export function GamificationPanel({ hubId }: GamificationPanelProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const locale = isRTL ? he : enUS;

  // My stats in this hub
  const { data: myStats, isLoading: myStatsLoading } = useQuery({
    queryKey: ['my-community-stats', hubId, user?.id],
    enabled: !!user?.id && !!hubId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('community_members')
        .select('points, trust_level, streak_days')
        .eq('hub_id', hubId)
        .eq('user_id', user!.id)
        .single();
      if (error) throw error;
      return data as { points: number; trust_level: number; streak_days: number };
    },
  });

  // Leaderboard — top 10 by points
  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery({
    queryKey: ['community-leaderboard', hubId],
    enabled: !!hubId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('community_members')
        .select('user_id, points, trust_level, profiles(full_name, avatar_url)')
        .eq('hub_id', hubId)
        .order('points', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as Array<{
        user_id: string;
        points: number;
        trust_level: number;
        profiles: { full_name: string | null; avatar_url: string | null };
      }>;
    },
  });

  // Recent point transactions for current user
  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ['community-point-transactions', hubId, user?.id],
    enabled: !!user?.id && !!hubId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('community_point_transactions')
        .select('id, points, reason, created_at')
        .eq('hub_id', hubId)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as Array<{
        id: string;
        points: number;
        reason: string;
        created_at: string;
      }>;
    },
  });

  const progressPct =
    myStats ? getProgressToNextLevel(myStats.points, myStats.trust_level) : 0;
  const nextThreshold =
    myStats && myStats.trust_level < 4
      ? LEVEL_THRESHOLDS[myStats.trust_level + 1]
      : null;

  return (
    <div className={cn('flex flex-col gap-4', isRTL && 'rtl')} dir={isRTL ? 'rtl' : 'ltr'}>

      {/* My Stats */}
      <Card>
        <CardHeader className="pb-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            {isRTL ? 'הסטטיסטיקות שלי' : 'My Stats'}
          </h3>
        </CardHeader>
        <CardContent>
          {myStatsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-5 w-24" />
            </div>
          ) : myStats ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="text-2xl font-bold">{myStats.points.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">{isRTL ? 'נקודות' : 'pts'}</span>
                </div>
                <div className="flex items-center gap-1 text-orange-500">
                  <Flame className="w-4 h-4" />
                  <span className="text-sm font-medium">{myStats.streak_days}</span>
                  <span className="text-xs text-muted-foreground">{isRTL ? 'ימים רצופים' : 'day streak'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <TrustBadge level={myStats.trust_level} isRTL={isRTL} />
                  {nextThreshold !== null && (
                    <span>{isRTL ? `עד הרמה הבאה: ${nextThreshold} נקודות` : `Next level: ${nextThreshold} pts`}</span>
                  )}
                </div>
                <Progress value={progressPct} className="h-2" />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {isRTL ? 'לא נמצאו נתונים' : 'No stats available'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Leaderboard */}
      <Card>
        <CardHeader className="pb-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Crown className="w-4 h-4 text-purple-500" />
            {isRTL ? 'לוח המובילים' : 'Leaderboard'}
          </h3>
        </CardHeader>
        <CardContent className="p-0">
          {leaderboardLoading ? (
            <div className="px-4 pb-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : leaderboard && leaderboard.length > 0 ? (
            <ul className="divide-y">
              {leaderboard.map((member, index) => {
                const isMe = member.user_id === user?.id;
                const rank = index + 1;
                const name = member.profiles?.full_name || (isRTL ? 'משתמש' : 'User');
                const avatar = member.profiles?.avatar_url;
                return (
                  <li
                    key={member.user_id}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2 text-sm',
                      isMe && 'bg-primary/5 font-semibold'
                    )}
                  >
                    {/* Rank */}
                    <span
                      className={cn(
                        'w-6 text-center font-bold shrink-0',
                        rank === 1 && 'text-yellow-500',
                        rank === 2 && 'text-gray-400',
                        rank === 3 && 'text-amber-600'
                      )}
                    >
                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                    </span>

                    {/* Avatar */}
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={name}
                        className="w-7 h-7 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}

                    {/* Name */}
                    <span className="flex-1 truncate">
                      {name}
                      {isMe && (
                        <span className="ms-1 text-xs text-primary">
                          ({isRTL ? 'אני' : 'you'})
                        </span>
                      )}
                    </span>

                    {/* Points + trust */}
                    <div className={cn('flex items-center gap-2 shrink-0', isRTL && 'flex-row-reverse')}>
                      <TrustBadge level={member.trust_level} isRTL={isRTL} />
                      <span className="font-semibold text-xs">{member.points.toLocaleString()}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-4 pb-4 text-sm text-muted-foreground">
              {isRTL ? 'אין עדיין חברים' : 'No members yet'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            {isRTL ? 'פעילות אחרונה' : 'Recent Activity'}
          </h3>
        </CardHeader>
        <CardContent className="p-0">
          {txLoading ? (
            <div className="px-4 pb-4 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : transactions && transactions.length > 0 ? (
            <ul className="divide-y">
              {transactions.map((tx) => (
                <li key={tx.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                  <span className="flex-1 text-muted-foreground truncate">{tx.reason}</span>
                  <span className="font-semibold text-green-600 shrink-0">
                    +{tx.points}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true, locale })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 pb-4 text-sm text-muted-foreground">
              {isRTL ? 'אין פעילות עדיין' : 'No activity yet'}
            </p>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
