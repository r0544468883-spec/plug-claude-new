import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Users,
  UserPlus,
  FileText,
  Phone,
  Gift,
  CheckCircle2,
  XCircle,
  Clock,
  Inbox,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STAGES = [
  { key: 'applied', labelHe: 'הגיש', labelEn: 'Applied', icon: FileText },
  { key: 'screening', labelHe: 'סינון', labelEn: 'Screening', icon: Users },
  { key: 'interview', labelHe: 'ראיון', labelEn: 'Interview', icon: Phone },
  { key: 'offer', labelHe: 'הצעה', labelEn: 'Offer', icon: Gift },
  { key: 'hired', labelHe: 'התקבל!', labelEn: 'Hired!', icon: CheckCircle2 },
];

const STAGE_INDEX: Record<string, number> = {
  applied: 0,
  screening: 1,
  interview: 2,
  technical: 2,
  offer: 3,
  hired: 4,
};

export function ReferralTracker() {
  const { user, profile } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const companyId = (profile as any)?.active_company_id;

  const { data, isLoading } = useQuery({
    queryKey: ['referral-tracker', user?.id, companyId],
    queryFn: async () => {
      // Get users I referred
      const { data: referrals } = await supabase
        .from('referrals')
        .select('referred_id, created_at')
        .eq('referrer_id', user!.id);

      if (!referrals || referrals.length === 0) return [];

      const referredIds = referrals.map((r) => r.referred_id);

      // Get their profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', referredIds);

      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

      // Get their applications at my company (if I have a company)
      let applications: any[] = [];
      if (companyId) {
        const { data: apps } = await supabase
          .from('applications')
          .select('id, candidate_id, current_stage, status, created_at, jobs!inner(title, company_id)')
          .in('candidate_id', referredIds)
          .eq('jobs.company_id', companyId)
          .order('created_at', { ascending: false });
        applications = apps || [];
      } else {
        // No company — just show all applications by referred users
        const { data: apps } = await supabase
          .from('applications')
          .select('id, candidate_id, current_stage, status, created_at, jobs!inner(title, company:companies(name))')
          .in('candidate_id', referredIds)
          .order('created_at', { ascending: false });
        applications = apps || [];
      }

      // Group applications by referred user
      const result = referrals.map((ref) => {
        const p = profileMap.get(ref.referred_id);
        const userApps = applications.filter((a: any) => a.candidate_id === ref.referred_id);
        return {
          userId: ref.referred_id,
          name: p?.full_name || (isHebrew ? 'משתמש' : 'User'),
          avatar: p?.avatar_url,
          referredAt: ref.created_at,
          applications: userApps,
        };
      });

      return result;
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center" dir={isHebrew ? 'rtl' : 'ltr'}>
        <Inbox className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-semibold mb-1">
          {isHebrew ? 'עדיין לא הפנית מועמדים' : 'No Referrals Yet'}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {isHebrew
            ? 'שלח את הקוד שלך לחברים — תוכל לעקוב אחרי ההתקדמות שלהם כאן.'
            : 'Share your referral code with friends — track their progress here.'}
        </p>
      </div>
    );
  }

  const totalReferred = data.length;
  const totalApplied = data.filter((r) => r.applications.length > 0).length;
  const totalHired = data.filter((r) =>
    r.applications.some((a: any) => a.current_stage === 'hired')
  ).length;

  return (
    <div className="space-y-6" dir={isHebrew ? 'rtl' : 'ltr'}>
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <UserPlus className="w-5 h-5 text-primary" />
        {isHebrew ? 'מעקב הפניות' : 'Referral Tracker'}
      </h2>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { labelHe: 'הופנו', labelEn: 'Referred', value: totalReferred, color: 'text-blue-500' },
          { labelHe: 'הגישו', labelEn: 'Applied', value: totalApplied, color: 'text-violet-500' },
          { labelHe: 'התקבלו', labelEn: 'Hired', value: totalHired, color: 'text-green-500' },
        ].map((stat) => (
          <Card key={stat.labelEn}>
            <CardContent className="p-4 text-center">
              <p className={cn('text-2xl font-bold', stat.color)}>{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isHebrew ? stat.labelHe : stat.labelEn}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Referral Cards */}
      {data.map((referral) => {
        const bestApp = referral.applications.reduce((best: any, app: any) => {
          if (!best) return app;
          const bestIdx = STAGE_INDEX[best.current_stage] ?? -1;
          const appIdx = STAGE_INDEX[app.current_stage] ?? -1;
          return appIdx > bestIdx ? app : best;
        }, null);

        const currentStageIdx = bestApp ? (STAGE_INDEX[bestApp.current_stage] ?? 0) : -1;
        const isRejected = bestApp?.status === 'rejected';

        return (
          <Card key={referral.userId} className="border overflow-hidden">
            <CardContent className="p-4 space-y-4">
              {/* Person */}
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {referral.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{referral.name}</p>
                  {bestApp && (
                    <p className="text-xs text-muted-foreground">
                      {companyId
                        ? (bestApp as any).jobs?.title
                        : `${(bestApp as any).jobs?.title} — ${(bestApp as any).jobs?.company?.name || ''}`}
                    </p>
                  )}
                </div>
                {isRejected ? (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="w-3 h-3" />
                    {isHebrew ? 'נדחה' : 'Rejected'}
                  </Badge>
                ) : bestApp?.current_stage === 'hired' ? (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {isHebrew ? 'התקבל!' : 'Hired!'}
                  </Badge>
                ) : !bestApp ? (
                  <Badge variant="outline" className="gap-1">
                    <Clock className="w-3 h-3" />
                    {isHebrew ? 'טרם הגיש' : 'Not applied'}
                  </Badge>
                ) : null}
              </div>

              {/* Stage Progress */}
              {bestApp && !isRejected && (
                <div className="flex items-center gap-1">
                  {STAGES.map((stage, idx) => {
                    const StageIcon = stage.icon;
                    const isActive = idx <= currentStageIdx;
                    const isCurrent = idx === currentStageIdx;

                    return (
                      <div key={stage.key} className="flex items-center flex-1 min-w-0">
                        <div
                          className={cn(
                            'flex flex-col items-center gap-1 flex-1',
                            isActive ? 'opacity-100' : 'opacity-30'
                          )}
                        >
                          <div
                            className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                              isCurrent
                                ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                                : isActive
                                  ? 'bg-primary/20 text-primary'
                                  : 'bg-muted text-muted-foreground'
                            )}
                          >
                            <StageIcon className="w-4 h-4" />
                          </div>
                          <span className="text-[10px] text-center leading-tight">
                            {isHebrew ? stage.labelHe : stage.labelEn}
                          </span>
                        </div>
                        {idx < STAGES.length - 1 && (
                          <div
                            className={cn(
                              'h-0.5 w-full mx-0.5 mt-[-12px]',
                              idx < currentStageIdx ? 'bg-primary' : 'bg-muted'
                            )}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
