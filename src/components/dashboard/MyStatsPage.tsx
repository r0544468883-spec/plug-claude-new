import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Briefcase, TrendingUp, Target, Clock, BarChart3, Activity } from 'lucide-react';

// Personal charts
import { ReportWeeklyActivity } from '@/components/reports/job-seeker/ReportWeeklyActivity';
import { ReportStageConversion } from '@/components/reports/job-seeker/ReportStageConversion';
import { ReportApplications } from '@/components/reports/job-seeker/ReportApplications';
import { ReportChannels } from '@/components/reports/job-seeker/ReportChannels';
import { ReportAIMatch } from '@/components/reports/job-seeker/ReportAIMatch';
import { ReportVouches } from '@/components/reports/job-seeker/ReportVouches';

// Market intelligence
import { ReportSalary } from '@/components/reports/job-seeker/ReportSalary';
import { ReportSkillsVsMarket } from '@/components/reports/job-seeker/ReportSkillsVsMarket';
import { ReportMarketFit } from '@/components/reports/job-seeker/ReportMarketFit';
import { ReportCareerLevel } from '@/components/reports/job-seeker/ReportCareerLevel';
import { ReportRolesFields } from '@/components/reports/job-seeker/ReportRolesFields';

// Credits
import { ReportCredits } from '@/components/reports/job-seeker/ReportCredits';

export function MyStatsPage() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';

  // Personal KPIs
  const { data: kpis } = useQuery({
    queryKey: ['my-stats-kpis', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;

      const { data: apps } = await supabase
        .from('applications')
        .select('id, status, match_score, created_at, interview_date')
        .eq('user_id', profile.id) as any;

      const allApps = apps || [];
      const total = allApps.length;
      const withResponse = allApps.filter((a: any) => a.status && a.status !== 'applied' && a.status !== 'pending').length;
      const withInterview = allApps.filter((a: any) => a.interview_date || a.status === 'interview').length;
      const scores = allApps.filter((a: any) => a.match_score != null).map((a: any) => a.match_score);
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((s: number, v: number) => s + v, 0) / scores.length) : 0;

      const firstApp = allApps.length > 0
        ? new Date(allApps.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0].created_at)
        : new Date();
      const daysActive = Math.max(1, Math.ceil((Date.now() - firstApp.getTime()) / (1000 * 60 * 60 * 24)));

      return {
        total,
        responseRate: total > 0 ? Math.round((withResponse / total) * 100) : 0,
        interviewRate: total > 0 ? Math.round((withInterview / total) * 100) : 0,
        avgScore,
        daysActive,
      };
    },
    enabled: !!profile?.id,
  });

  const kpiCards = [
    {
      icon: Briefcase,
      label: isRTL ? 'סה"כ הגשות' : 'Total Applications',
      value: kpis?.total ?? '—',
      color: 'text-blue-500 bg-blue-500/10',
    },
    {
      icon: TrendingUp,
      label: isRTL ? 'אחוז מענה' : 'Response Rate',
      value: kpis ? `${kpis.responseRate}%` : '—',
      color: 'text-emerald-500 bg-emerald-500/10',
    },
    {
      icon: Target,
      label: isRTL ? 'אחוז ראיונות' : 'Interview Rate',
      value: kpis ? `${kpis.interviewRate}%` : '—',
      color: 'text-violet-500 bg-violet-500/10',
    },
    {
      icon: Activity,
      label: isRTL ? 'ציון התאמה ממוצע' : 'Avg Match Score',
      value: kpis?.avgScore ?? '—',
      color: 'text-amber-500 bg-amber-500/10',
    },
    {
      icon: Clock,
      label: isRTL ? 'ימים פעילים' : 'Days Active',
      value: kpis?.daysActive ?? '—',
      color: 'text-rose-500 bg-rose-500/10',
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {isRTL ? 'נתוני החיפוש שלי' : 'My Stats'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isRTL ? 'סטטיסטיקות אישיות ונתוני שוק העבודה' : 'Personal statistics & job market data'}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label} className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${kpi.color}`}>
                <kpi.icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{kpi.label}</p>
                <p className="text-xl font-bold text-foreground">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="w-full justify-start bg-muted/50 rounded-lg p-1">
          <TabsTrigger value="personal" className="rounded-md">
            <BarChart3 className="w-4 h-4 me-1.5" />
            {isRTL ? 'נתונים אישיים' : 'Personal'}
          </TabsTrigger>
          <TabsTrigger value="market" className="rounded-md">
            <TrendingUp className="w-4 h-4 me-1.5" />
            {isRTL ? 'נתוני שוק' : 'Market'}
          </TabsTrigger>
          <TabsTrigger value="credits" className="rounded-md">
            {isRTL ? 'קרדיטים' : 'Credits'}
          </TabsTrigger>
        </TabsList>

        {/* Personal Charts */}
        <TabsContent value="personal" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ReportWeeklyActivity />
            <ReportStageConversion />
            <ReportApplications />
            <ReportChannels />
            <ReportAIMatch />
            <ReportVouches />
          </div>
        </TabsContent>

        {/* Market Intelligence */}
        <TabsContent value="market" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ReportSalary />
            <ReportSkillsVsMarket />
            <ReportMarketFit />
            <ReportCareerLevel />
            <ReportRolesFields />
          </div>
        </TabsContent>

        {/* Credits Usage */}
        <TabsContent value="credits" className="mt-4">
          <div className="max-w-3xl">
            <ReportCredits />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}