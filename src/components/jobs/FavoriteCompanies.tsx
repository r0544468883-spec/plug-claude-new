import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2, Briefcase, CheckCircle2, Clock, XCircle, Star,
  ExternalLink, Loader2, ChevronRight, Trophy, Send
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Application {
  id: string;
  job_title: string | null;
  job_company: string | null;
  status: string;
  applied_at: string;
  job_url: string | null;
  job?: {
    id: string;
    title: string;
    company_name: string | null;
    source_url: string | null;
  } | null;
}

interface CompanyJob {
  id: string;
  title: string;
  company_name: string;
  source_url: string | null;
  external_source: string | null;
  created_at: string;
}

interface CompanyGroup {
  name: string;
  applications: Application[];
  openJobs: CompanyJob[];
  latestStage: string;
  score: number; // higher = more active / later stage
}

const STAGE_ORDER: Record<string, number> = {
  offer: 5,
  hired: 6,
  interview: 4,
  screening: 3,
  applied: 2,
  saved: 1,
  rejected: 0,
  withdrawn: 0,
};

const STAGE_LABEL: Record<string, { he: string; en: string; color: string }> = {
  offer:      { he: 'הצעה!', en: 'Offer!', color: 'text-green-500 bg-green-500/10 border-green-500/30' },
  hired:      { he: 'התקבלת!', en: 'Hired!', color: 'text-green-600 bg-green-600/10 border-green-600/30' },
  interview:  { he: 'ראיון', en: 'Interview', color: 'text-blue-500 bg-blue-500/10 border-blue-500/30' },
  screening:  { he: 'סינון', en: 'Screening', color: 'text-purple-500 bg-purple-500/10 border-purple-500/30' },
  applied:    { he: 'הוגש', en: 'Applied', color: 'text-primary bg-primary/10 border-primary/30' },
  saved:      { he: 'שמור', en: 'Saved', color: 'text-muted-foreground bg-muted border-border' },
  rejected:   { he: 'נדחה', en: 'Rejected', color: 'text-red-500 bg-red-500/10 border-red-500/30' },
  withdrawn:  { he: 'נסגר', en: 'Withdrawn', color: 'text-muted-foreground bg-muted border-border' },
};

function StatusIcon({ status }: { status: string }) {
  if (status === 'offer' || status === 'hired') return <Trophy className="w-3 h-3" />;
  if (status === 'interview') return <Star className="w-3 h-3" />;
  if (status === 'applied' || status === 'screening') return <Send className="w-3 h-3" />;
  if (status === 'rejected' || status === 'withdrawn') return <XCircle className="w-3 h-3" />;
  return <Clock className="w-3 h-3" />;
}

export function FavoriteCompanies() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isHebrew = language === 'he';
  const [selectedCompany, setSelectedCompany] = useState<string>('');

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['favorite-companies', user?.id],
    queryFn: async (): Promise<CompanyGroup[]> => {
      if (!user) return [];

      // Fetch all user applications
      const { data: apps } = await supabase
        .from('applications')
        .select(`
          id, status, applied_at, job_url, job_title, job_company,
          job:job_id (id, title, company_name, source_url)
        `)
        .eq('user_id', user.id)
        .order('applied_at', { ascending: false });

      if (!apps?.length) return [];

      // Group applications by company
      const companyMap = new Map<string, { apps: Application[]; highestStage: number }>();

      for (const app of apps as Application[]) {
        const rawName =
          (app.job as CompanyJob | null)?.company_name ||
          app.job_company ||
          (isHebrew ? 'חברה לא ידועה' : 'Unknown Company');

        const displayName =
          rawName === 'hr_recruiter'
            ? (isHebrew ? 'חברת HR' : 'HR Recruiter')
            : rawName;

        const stage = STAGE_ORDER[app.status] ?? 1;
        const existing = companyMap.get(displayName) ?? { apps: [], highestStage: 0 };
        existing.apps.push(app);
        if (stage > existing.highestStage) existing.highestStage = stage;
        companyMap.set(displayName, existing);
      }

      // Fetch open jobs for companies with applications (by company_name)
      const companyNames = Array.from(companyMap.keys()).filter(n => n !== (isHebrew ? 'חברה לא ידועה' : 'Unknown Company') && n !== (isHebrew ? 'חברת HR' : 'HR Recruiter'));

      const openJobsByCompany = new Map<string, CompanyJob[]>();
      if (companyNames.length > 0) {
        const { data: openJobs } = await supabase
          .from('jobs')
          .select('id, title, company_name, source_url, external_source, created_at')
          .in('company_name', companyNames)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        for (const j of (openJobs ?? []) as CompanyJob[]) {
          if (!j.company_name) continue;
          const existing = openJobsByCompany.get(j.company_name) ?? [];
          existing.push(j);
          openJobsByCompany.set(j.company_name, existing);
        }
      }

      // Build final groups
      const groups: CompanyGroup[] = Array.from(companyMap.entries()).map(([name, data]) => {
        const latestApp = data.apps.find(a => STAGE_ORDER[a.status] === data.highestStage);
        return {
          name,
          applications: data.apps,
          openJobs: openJobsByCompany.get(name) ?? [],
          latestStage: latestApp?.status ?? 'applied',
          score: data.highestStage * 100 + data.apps.length,
        };
      });

      // Sort: active processes first (interview/offer), then by count
      groups.sort((a, b) => b.score - a.score);
      return groups;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const activeGroup = selectedCompany
    ? groups.find(g => g.name === selectedCompany) ?? groups[0]
    : groups[0];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!groups.length) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-16 text-center text-muted-foreground">
          <Building2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium mb-1">
            {isHebrew ? 'אין עדיין הגשות' : 'No applications yet'}
          </p>
          <p className="text-sm">
            {isHebrew
              ? 'התחל להגיש ומשרות יופיעו כאן מחולקות לפי חברה'
              : 'Start applying and jobs will appear here grouped by company'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            {isHebrew ? 'החברות שלי' : 'My Companies'}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isHebrew
              ? `${groups.length} חברות · ${groups.reduce((s, g) => s + g.applications.length, 0)} הגשות`
              : `${groups.length} companies · ${groups.reduce((s, g) => s + g.applications.length, 0)} applications`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Company List */}
        <div className="lg:col-span-1">
          <ScrollArea className="h-[560px]">
            <div className="space-y-1.5 pr-2">
              {groups.map(group => {
                const stageInfo = STAGE_LABEL[group.latestStage] ?? STAGE_LABEL['applied'];
                const isSelected = (selectedCompany || groups[0]?.name) === group.name;
                return (
                  <button
                    key={group.name}
                    onClick={() => setSelectedCompany(group.name)}
                    className={cn(
                      'w-full text-start p-3 rounded-lg border transition-all',
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card hover:bg-muted/50'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {group.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-sm truncate">{group.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Badge
                          variant="outline"
                          className={cn('text-xs px-1.5 py-0', stageInfo.color)}
                        >
                          <StatusIcon status={group.latestStage} />
                          <span className="ml-1">{isHebrew ? stageInfo.he : stageInfo.en}</span>
                        </Badge>
                        {isSelected && <ChevronRight className="w-3 h-3 text-primary" />}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Send className="w-3 h-3" />
                        {group.applications.length} {isHebrew ? 'הגשות' : 'apps'}
                      </span>
                      {group.openJobs.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          {group.openJobs.length} {isHebrew ? 'משרות פתוחות' : 'open'}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Company Detail */}
        <div className="lg:col-span-2">
          {activeGroup ? (
            <Card className="bg-card border-border h-[560px] flex flex-col">
              <CardHeader className="pb-2 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                      {activeGroup.name.slice(0, 2).toUpperCase()}
                    </div>
                    {activeGroup.name}
                  </CardTitle>
                  <div className="flex gap-1.5">
                    {(['offer', 'hired', 'interview', 'screening', 'applied', 'rejected'] as const).map(stage => {
                      const count = activeGroup.applications.filter(a => a.status === stage).length;
                      if (!count) return null;
                      const info = STAGE_LABEL[stage];
                      return (
                        <Badge
                          key={stage}
                          variant="outline"
                          className={cn('text-xs', info.color)}
                        >
                          {count} {isHebrew ? info.he : info.en}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <Tabs defaultValue="applications" className="h-full flex flex-col">
                  <TabsList className="mx-4 mt-1 w-fit">
                    <TabsTrigger value="applications" className="text-xs">
                      {isHebrew ? `הגשות (${activeGroup.applications.length})` : `Applications (${activeGroup.applications.length})`}
                    </TabsTrigger>
                    <TabsTrigger value="open-jobs" className="text-xs">
                      {isHebrew ? `משרות פתוחות (${activeGroup.openJobs.length})` : `Open Jobs (${activeGroup.openJobs.length})`}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="applications" className="flex-1 overflow-hidden mt-2">
                    <ScrollArea className="h-[440px] px-4">
                      <div className="space-y-2 pb-4">
                        {activeGroup.applications.map(app => {
                          const stageInfo = STAGE_LABEL[app.status] ?? STAGE_LABEL['applied'];
                          const title =
                            (app.job as CompanyJob | null)?.title || app.job_title || (isHebrew ? 'משרה' : 'Position');
                          const jobUrl =
                            (app.job as CompanyJob | null)?.source_url || app.job_url;
                          const date = new Date(app.applied_at).toLocaleDateString(
                            isHebrew ? 'he-IL' : 'en-US',
                            { day: 'numeric', month: 'short' }
                          );
                          return (
                            <div
                              key={app.id}
                              className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Briefcase className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <div className="min-w-0">
                                  <p className="font-medium text-sm truncate">{title}</p>
                                  <p className="text-xs text-muted-foreground">{date}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Badge
                                  variant="outline"
                                  className={cn('text-xs gap-1', stageInfo.color)}
                                >
                                  <StatusIcon status={app.status} />
                                  {isHebrew ? stageInfo.he : stageInfo.en}
                                </Badge>
                                {jobUrl && (
                                  <a
                                    href={jobUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-muted-foreground hover:text-primary"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="open-jobs" className="flex-1 overflow-hidden mt-2">
                    <ScrollArea className="h-[440px] px-4">
                      {activeGroup.openJobs.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground text-sm">
                          {isHebrew
                            ? 'לא נמצאו משרות פתוחות נוספות'
                            : 'No additional open jobs found'}
                        </div>
                      ) : (
                        <div className="space-y-2 pb-4">
                          {activeGroup.openJobs.map(job => (
                            <div
                              key={job.id}
                              className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Briefcase className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <div className="min-w-0">
                                  <p className="font-medium text-sm truncate">{job.title}</p>
                                  {job.external_source && (
                                    <p className="text-xs text-muted-foreground capitalize">
                                      {job.external_source}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {job.source_url && (
                                <a
                                  href={job.source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Button size="sm" variant="outline" className="text-xs h-7 gap-1">
                                    <ExternalLink className="w-3 h-3" />
                                    {isHebrew ? 'פתח' : 'Open'}
                                  </Button>
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
