import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Clock, Mail } from 'lucide-react';

export function EmailAnalytics() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isHebrew = language === 'he';

  const { data: stats } = useQuery({
    queryKey: ['email-analytics', user?.id],
    queryFn: async () => {
      // Total applications
      const { count: totalApps } = await (supabase as any)
        .from('applications')
        .select('id', { count: 'exact', head: true })
        .eq('candidate_id', user?.id);

      // Applications that received at least one email back
      const { data: receivedEmails } = await (supabase as any)
        .from('application_emails')
        .select('application_id, ai_classification, created_at, ai_extracted_data')
        .eq('user_id', user?.id)
        .eq('direction', 'received')
        .not('application_id', 'is', null);

      const emails = receivedEmails || [];
      const respondedApps = new Set(emails.map((e: any) => e.application_id));
      const responseRate = totalApps ? Math.round((respondedApps.size / totalApps) * 100) : 0;

      // Count by classification
      const counts: Record<string, number> = {};
      for (const e of emails) {
        const c = e.ai_classification || 'general';
        counts[c] = (counts[c] || 0) + 1;
      }

      // Average response time (days between application created_at and first email)
      const { data: apps } = await (supabase as any)
        .from('applications')
        .select('id, created_at')
        .eq('candidate_id', user?.id)
        .in('id', [...respondedApps]);

      const appDateMap: Record<string, string> = {};
      for (const a of (apps || [])) appDateMap[a.id] = a.created_at;

      const firstEmailByApp: Record<string, string> = {};
      for (const e of emails) {
        const aid = e.application_id;
        if (!firstEmailByApp[aid] || e.created_at < firstEmailByApp[aid]) {
          firstEmailByApp[aid] = e.created_at;
        }
      }

      let totalDays = 0, count = 0;
      for (const [appId, firstEmail] of Object.entries(firstEmailByApp)) {
        const appDate = appDateMap[appId];
        if (appDate) {
          const days = (new Date(firstEmail).getTime() - new Date(appDate).getTime()) / (1000 * 60 * 60 * 24);
          if (days >= 0 && days < 60) { totalDays += days; count++; }
        }
      }
      const avgResponseDays = count > 0 ? Math.round(totalDays / count) : null;

      return {
        totalApps: totalApps || 0,
        respondedCount: respondedApps.size,
        responseRate,
        avgResponseDays,
        rejections: counts['rejection'] || 0,
        interviews: counts['interview_invitation'] || 0,
        offers: counts['offer'] || 0,
        acks: counts['acknowledgment'] || 0,
      };
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
  });

  if (!stats || stats.totalApps === 0) return null;

  const items = [
    {
      label: isHebrew ? 'אחוז מענה' : 'Response rate',
      value: `${stats.responseRate}%`,
      sub: isHebrew ? `${stats.respondedCount} מתוך ${stats.totalApps}` : `${stats.respondedCount} of ${stats.totalApps}`,
      icon: TrendingUp,
      color: 'text-green-500',
    },
    {
      label: isHebrew ? 'זמן מענה ממוצע' : 'Avg response time',
      value: stats.avgResponseDays !== null ? (isHebrew ? `${stats.avgResponseDays} ימים` : `${stats.avgResponseDays} days`) : '—',
      sub: isHebrew ? 'מרגע ההגשה' : 'from application',
      icon: Clock,
      color: 'text-blue-500',
    },
    {
      label: isHebrew ? 'ראיונות' : 'Interviews',
      value: String(stats.interviews),
      sub: isHebrew ? 'הזמנות שהתקבלו' : 'invites received',
      icon: Mail,
      color: 'text-purple-500',
    },
    {
      label: isHebrew ? 'דחיות' : 'Rejections',
      value: String(stats.rejections),
      sub: isHebrew ? `${stats.offers} הצעות עבודה` : `${stats.offers} job offer${stats.offers !== 1 ? 's' : ''}`,
      icon: BarChart3,
      color: 'text-red-400',
    },
  ];

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <BarChart3 className="w-4 h-4" />
          {isHebrew ? 'ביצועי מייל' : 'Email Performance'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {items.map(item => (
            <div key={item.label} className="rounded-lg bg-muted/30 p-3 space-y-1">
              <div className="flex items-center gap-1.5">
                <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </div>
              <p className="text-xl font-bold">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.sub}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
