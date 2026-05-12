import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  GraduationCap,
  Calendar,
  MessageSquare,
  TrendingUp,
  DollarSign,
  Activity,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { he, enUS } from 'date-fns/locale';

interface AnalyticsDashboardProps {
  hubId: string;
  isAdmin: boolean;
}

interface StatCard {
  titleHe: string;
  titleEn: string;
  value: string | number;
  subHe?: string;
  subEn?: string;
  icon: React.ReactNode;
  color: string;
}

interface AnalyticsData {
  totalMembers: number;
  newMembersThisWeek: number;
  totalCourses: number;
  totalEnrollments: number;
  avgCompletionRate: number;
  totalEvents: number;
  totalRegistrations: number;
  totalMessages: number;
  totalQuestions: number;
  totalRevenue: number;
}

interface ActivityEvent {
  id: string;
  event_type: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

export function AnalyticsDashboard({ hubId, isAdmin }: AnalyticsDashboardProps) {
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const dateLocale = isRTL ? he : enUS;

  const { data: analytics, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ['community-analytics', hubId],
    enabled: isAdmin,
    queryFn: async (): Promise<AnalyticsData> => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const weekAgoIso = oneWeekAgo.toISOString();

      const [
        { count: totalMembers },
        { count: newMembersThisWeek },
        { data: courses },
        { data: enrollments },
        { count: totalEvents },
        { count: totalRegistrations },
        { count: totalMessages },
        { count: totalQuestions },
        { data: payments },
      ] = await Promise.all([
        (supabase as any)
          .from('community_members')
          .select('*', { count: 'exact', head: true })
          .eq('hub_id', hubId),
        (supabase as any)
          .from('community_members')
          .select('*', { count: 'exact', head: true })
          .eq('hub_id', hubId)
          .gte('created_at', weekAgoIso),
        (supabase as any)
          .from('community_courses')
          .select('id')
          .eq('hub_id', hubId),
        (supabase as any)
          .from('community_course_enrollments')
          .select('course_id, completed_at')
          .in(
            'course_id',
            ((await (supabase as any)
              .from('community_courses')
              .select('id')
              .eq('hub_id', hubId)).data ?? []).map((c: { id: string }) => c.id)
          ),
        (supabase as any)
          .from('community_events')
          .select('*', { count: 'exact', head: true })
          .eq('hub_id', hubId),
        (supabase as any)
          .from('community_event_registrations')
          .select('*', { count: 'exact', head: true })
          .in(
            'event_id',
            ((await (supabase as any)
              .from('community_events')
              .select('id')
              .eq('hub_id', hubId)).data ?? []).map((e: { id: string }) => e.id)
          ),
        (supabase as any)
          .from('community_messages')
          .select('*', { count: 'exact', head: true })
          .in(
            'channel_id',
            ((await (supabase as any)
              .from('community_channels')
              .select('id')
              .eq('hub_id', hubId)).data ?? []).map((ch: { id: string }) => ch.id)
          ),
        (supabase as any)
          .from('community_qa_questions')
          .select('*', { count: 'exact', head: true })
          .eq('hub_id', hubId),
        (supabase as any)
          .from('community_payments')
          .select('amount')
          .eq('hub_id', hubId)
          .eq('status', 'completed'),
      ]);

      const courseIds = (courses ?? []).map((c: { id: string }) => c.id);
      const totalEnrollments = (enrollments ?? []).length;
      const completedCount = (enrollments ?? []).filter(
        (e: { completed_at: string | null }) => e.completed_at != null
      ).length;
      const avgCompletionRate =
        totalEnrollments > 0
          ? Math.round((completedCount / totalEnrollments) * 100)
          : 0;

      const totalRevenue = (payments ?? []).reduce(
        (sum: number, p: { amount: number }) => sum + (p.amount ?? 0),
        0
      );

      return {
        totalMembers: totalMembers ?? 0,
        newMembersThisWeek: newMembersThisWeek ?? 0,
        totalCourses: courseIds.length,
        totalEnrollments,
        avgCompletionRate,
        totalEvents: totalEvents ?? 0,
        totalRegistrations: totalRegistrations ?? 0,
        totalMessages: totalMessages ?? 0,
        totalQuestions: totalQuestions ?? 0,
        totalRevenue,
      };
    },
  });

  const { data: activityFeed, isLoading: isLoadingFeed } = useQuery({
    queryKey: ['community-activity-feed', hubId],
    enabled: isAdmin,
    queryFn: async (): Promise<ActivityEvent[]> => {
      const { data } = await (supabase as any)
        .from('community_analytics_events')
        .select('id, event_type, created_at, metadata')
        .eq('hub_id', hubId)
        .order('created_at', { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        <div className="text-center space-y-2">
          <BarChart3 className="w-8 h-8 mx-auto opacity-40" />
          <p className="text-sm">{isRTL ? 'הצגת אנליטיקס למנהלים בלבד' : 'Analytics visible to admins only'}</p>
        </div>
      </div>
    );
  }

  const statCards: StatCard[] = analytics
    ? [
        {
          titleHe: 'חברי קהילה',
          titleEn: 'Members',
          value: analytics.totalMembers.toLocaleString(),
          subHe: `+${analytics.newMembersThisWeek} השבוע`,
          subEn: `+${analytics.newMembersThisWeek} this week`,
          icon: <Users className="w-5 h-5" />,
          color: 'text-blue-500',
        },
        {
          titleHe: 'קורסים',
          titleEn: 'Courses',
          value: analytics.totalCourses,
          subHe: `${analytics.totalEnrollments} הרשמות · ${analytics.avgCompletionRate}% סיום`,
          subEn: `${analytics.totalEnrollments} enrollments · ${analytics.avgCompletionRate}% completion`,
          icon: <GraduationCap className="w-5 h-5" />,
          color: 'text-purple-500',
        },
        {
          titleHe: 'אירועים',
          titleEn: 'Events',
          value: analytics.totalEvents,
          subHe: `${analytics.totalRegistrations} רשומים`,
          subEn: `${analytics.totalRegistrations} registrations`,
          icon: <Calendar className="w-5 h-5" />,
          color: 'text-green-500',
        },
        {
          titleHe: 'מעורבות',
          titleEn: 'Engagement',
          value: (analytics.totalMessages + analytics.totalQuestions).toLocaleString(),
          subHe: `${analytics.totalMessages} הודעות · ${analytics.totalQuestions} שאלות`,
          subEn: `${analytics.totalMessages} messages · ${analytics.totalQuestions} Q&A`,
          icon: <MessageSquare className="w-5 h-5" />,
          color: 'text-orange-500',
        },
        ...(analytics.totalRevenue > 0
          ? [
              {
                titleHe: 'הכנסות',
                titleEn: 'Revenue',
                value: `$${analytics.totalRevenue.toLocaleString()}`,
                subHe: 'תשלומים שהושלמו',
                subEn: 'Completed payments',
                icon: <DollarSign className="w-5 h-5" />,
                color: 'text-emerald-500',
              },
            ]
          : []),
      ]
    : [];

  const eventTypeLabel = (type: string, rtl: boolean): string => {
    const labels: Record<string, [string, string]> = {
      member_joined:    ['הצטרף חבר',       'Member joined'],
      member_left:      ['חבר עזב',          'Member left'],
      message_sent:     ['הודעה נשלחה',      'Message sent'],
      course_enrolled:  ['הרשמה לקורס',      'Course enrollment'],
      course_completed: ['קורס הושלם',       'Course completed'],
      event_registered: ['הרשמה לאירוע',     'Event registration'],
      question_posted:  ['שאלה פורסמה',      'Question posted'],
      payment_completed:['תשלום הושלם',      'Payment completed'],
    };
    const pair = labels[type];
    if (!pair) return type.replace(/_/g, ' ');
    return rtl ? pair[0] : pair[1];
  };

  return (
    <div className={cn('space-y-6', isRTL && 'rtl')} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">
          {isRTL ? 'לוח בקרה — אנליטיקס' : 'Analytics Dashboard'}
        </h2>
      </div>

      {/* Stat Cards Grid */}
      {isLoadingAnalytics ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="pt-5 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((card, idx) => (
            <Card
              key={idx}
              className="bg-card border-border hover:shadow-md transition-shadow"
            >
              <CardContent className="pt-5">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    {isRTL ? card.titleHe : card.titleEn}
                  </span>
                  <span className={cn('opacity-70', card.color)}>{card.icon}</span>
                </div>
                <p className="text-2xl font-bold tracking-tight">{card.value}</p>
                {(card.subHe || card.subEn) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {isRTL ? card.subHe : card.subEn}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Activity Feed */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            {isRTL ? 'פעילות אחרונה' : 'Recent Activity'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingFeed ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-2 w-2 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : !activityFeed || activityFeed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground space-y-2">
              <Activity className="w-6 h-6 opacity-30" />
              <p className="text-sm">
                {isRTL ? 'אין פעילות עדיין' : 'No activity yet'}
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {activityFeed.map((event) => (
                <li
                  key={event.id}
                  className="flex items-center justify-between gap-3 py-1.5 border-b border-border/50 last:border-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <span className="text-sm truncate">
                      {eventTypeLabel(event.event_type, isRTL)}
                    </span>
                    <Badge variant="outline" className="text-xs shrink-0 hidden sm:inline-flex">
                      {event.event_type}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {formatDistanceToNow(new Date(event.created_at), {
                      addSuffix: true,
                      locale: dateLocale,
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
