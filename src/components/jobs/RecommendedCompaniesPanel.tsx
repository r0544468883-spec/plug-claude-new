import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Building2, Briefcase, Flame, Target, ExternalLink, Loader2, Calendar, TrendingUp, Sparkles } from 'lucide-react';

interface JobRow {
  id: string;
  title: string;
  description: string | null;
  requirements: string | null;
  location: string | null;
  salary_range: string | null;
  status: string;
  source_url: string | null;
  created_at: string;
  company_name: string | null;
  company: { id: string; name: string; logo_url: string | null; website: string | null } | null;
}

interface CompanyAggregate {
  name: string;
  logo: string | null;
  website: string | null;
  activeJobs: JobRow[];
  pastJobs: JobRow[];
  totalPostings60d: number;
  matchingJobsCount: number;
  matchScore: number; // 0-100
  lastPostingDate: string;
  hiringVelocity: 'hot' | 'steady' | 'rare';
}

interface Props {
  onOpenJob?: (job: JobRow) => void;
}

const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

export function RecommendedCompaniesPanel({ onOpenJob }: Props) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  // Fetch user profile (for matching)
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile-for-companies', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('preferred_fields, preferred_roles, cv_data')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch jobs from last 60 days
  const { data: jobs = [], isLoading } = useQuery<JobRow[]>({
    queryKey: ['recommended-companies-jobs'],
    queryFn: async () => {
      const sinceIso = new Date(Date.now() - SIXTY_DAYS_MS).toISOString();
      const { data, error } = await supabase
        .from('jobs')
        .select(`id, title, description, requirements, location, salary_range, status, source_url, created_at, company_name, company:companies(id, name, logo_url, website)`)
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as unknown as JobRow[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Build user keywords for matching
  const userKeywords = useMemo(() => {
    if (!userProfile) return { skills: [] as string[], roles: [] as string[] };
    const cvData = userProfile.cv_data as { skills?: { technical?: string[] } } | null;
    const skills = (cvData?.skills?.technical || []).map(s => s.toLowerCase());
    const roles = ((userProfile.preferred_roles as string[]) || []).map(r => r.toLowerCase());
    return { skills, roles };
  }, [userProfile]);

  // Aggregate by company
  const companies = useMemo<CompanyAggregate[]>(() => {
    if (!jobs.length) return [];

    const map = new Map<string, CompanyAggregate>();

    const matchesUser = (job: JobRow): boolean => {
      const haystack = `${job.title || ''} ${job.description || ''} ${job.requirements || ''}`.toLowerCase();
      const skillHit = userKeywords.skills.some(s => s && haystack.includes(s));
      const roleHit = userKeywords.roles.some(r => r && haystack.includes(r));
      return skillHit || roleHit;
    };

    for (const job of jobs) {
      const name = (job.company?.name || job.company_name || '').trim();
      if (!name || name === 'hr_recruiter') continue;

      const existing = map.get(name) || {
        name,
        logo: job.company?.logo_url || null,
        website: job.company?.website || null,
        activeJobs: [],
        pastJobs: [],
        totalPostings60d: 0,
        matchingJobsCount: 0,
        matchScore: 0,
        lastPostingDate: job.created_at,
        hiringVelocity: 'rare' as const,
      };

      if (job.status === 'active') existing.activeJobs.push(job);
      else existing.pastJobs.push(job);

      existing.totalPostings60d++;
      if (matchesUser(job)) existing.matchingJobsCount++;
      if (job.created_at > existing.lastPostingDate) existing.lastPostingDate = job.created_at;
      if (!existing.logo && job.company?.logo_url) existing.logo = job.company.logo_url;
      if (!existing.website && job.company?.website) existing.website = job.company.website;

      map.set(name, existing);
    }

    // Compute scores + velocity, then filter & sort
    const result = Array.from(map.values()).map(c => {
      const matchPct = c.totalPostings60d > 0 ? Math.round((c.matchingJobsCount / c.totalPostings60d) * 100) : 0;
      const velocity: CompanyAggregate['hiringVelocity'] =
        c.totalPostings60d >= 5 ? 'hot' :
        c.totalPostings60d >= 2 ? 'steady' : 'rare';
      return { ...c, matchScore: matchPct, hiringVelocity: velocity };
    });

    // Filter: only companies that hire frequently (≥2 jobs) OR have at least 1 matching job
    return result
      .filter(c => c.totalPostings60d >= 2 || c.matchingJobsCount >= 1)
      .sort((a, b) => {
        // Score: matching jobs * 10 + frequency
        const scoreA = a.matchingJobsCount * 10 + a.totalPostings60d;
        const scoreB = b.matchingJobsCount * 10 + b.totalPostings60d;
        return scoreB - scoreA;
      })
      .slice(0, 30);
  }, [jobs, userKeywords]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <h3 className="text-sm font-medium text-muted-foreground mb-1">
          {isHebrew ? 'אין חברות מומלצות עדיין' : 'No recommended companies yet'}
        </h3>
        <p className="text-xs text-muted-foreground/60">
          {isHebrew
            ? 'השלם את הפרופיל שלך כדי לקבל המלצות מותאמות אישית'
            : 'Complete your profile to get personalized recommendations'}
        </p>
      </div>
    );
  }

  return (
    <div dir={isHebrew ? 'rtl' : 'ltr'} className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {isHebrew
            ? `${companies.length} חברות שמגייסות בתדירות גבוהה או עם משרות שמתאימות לך`
            : `${companies.length} companies hiring frequently or with jobs matching your profile`}
        </p>
      </div>

      <ScrollArea className="h-[60vh] pr-2">
        <Accordion type="single" collapsible className="space-y-2">
          {companies.map((company) => (
            <AccordionItem
              key={company.name}
              value={company.name}
              className="border border-border rounded-lg bg-card px-3 data-[state=open]:bg-muted/30"
            >
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar className="w-9 h-9 rounded-lg flex-shrink-0">
                    <AvatarImage src={company.logo || undefined} />
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs font-bold">
                      {company.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0 text-start">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="font-medium text-sm truncate">{company.name}</h4>
                      {company.hiringVelocity === 'hot' && (
                        <Badge className="gap-0.5 bg-orange-500/15 text-orange-600 border-orange-500/30 text-[10px] h-4 px-1.5">
                          <Flame className="w-2.5 h-2.5" />
                          {isHebrew ? 'מגייסת חזק' : 'Hot'}
                        </Badge>
                      )}
                      {company.matchScore >= 50 && (
                        <Badge className="gap-0.5 bg-green-500/15 text-green-600 border-green-500/30 text-[10px] h-4 px-1.5">
                          <Target className="w-2.5 h-2.5" />
                          {company.matchScore}%
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3 h-3" />
                        {company.activeJobs.length} {isHebrew ? 'משרות פתוחות' : 'open'}
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {company.totalPostings60d} {isHebrew ? 'ב-60 יום' : 'in 60d'}
                      </span>
                      {company.matchingJobsCount > 0 && (
                        <span className="flex items-center gap-1 text-primary">
                          <Sparkles className="w-3 h-3" />
                          {company.matchingJobsCount} {isHebrew ? 'מתאימות לך' : 'match you'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="pb-3">
                {company.activeJobs.length > 0 ? (
                  /* ── Has open positions ── */
                  <div className="space-y-2 pt-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      {isHebrew ? 'משרות פתוחות:' : 'Open positions:'}
                    </p>
                    {company.activeJobs.map((job) => (
                      <button
                        key={job.id}
                        onClick={() => onOpenJob?.(job)}
                        className="w-full flex items-start gap-2 p-2 rounded-md border border-border hover:border-primary/40 hover:bg-muted/50 transition-colors text-start"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs truncate">{job.title}</p>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                            {job.location && <span>{job.location}</span>}
                            {job.salary_range && <span>• {job.salary_range}</span>}
                          </div>
                        </div>
                        {job.source_url && <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-1" />}
                      </button>
                    ))}
                  </div>
                ) : (
                  /* ── No open positions: show summary + market stats ── */
                  <div className="space-y-3 pt-1">
                    <div className="rounded-md bg-muted/50 p-2.5 space-y-1">
                      <p className="text-xs font-medium">
                        {isHebrew ? 'אין כרגע משרות פתוחות, אבל...' : 'No open positions right now, but...'}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {isHebrew ? 'פרסום אחרון: ' : 'Last posted: '}
                          {new Date(company.lastPostingDate).toLocaleDateString(isHebrew ? 'he-IL' : 'en-US')}
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {company.totalPostings60d} {isHebrew ? 'משרות ב-60 יום' : 'jobs in 60d'}
                        </div>
                      </div>
                    </div>

                    {company.pastJobs.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">
                          {isHebrew ? 'משרות אחרונות שפורסמו:' : 'Recent past postings:'}
                        </p>
                        {company.pastJobs.slice(0, 5).map((job) => (
                          <div
                            key={job.id}
                            className="flex items-start gap-2 p-2 rounded-md border border-dashed border-border/60 text-[11px]"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{job.title}</p>
                              <p className="text-muted-foreground mt-0.5">
                                {job.location && <span>{job.location} • </span>}
                                {new Date(job.created_at).toLocaleDateString(isHebrew ? 'he-IL' : 'en-US')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {company.website && (
                  <div className="mt-3 pt-2 border-t border-border">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 w-full" asChild>
                      <a href={company.website} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3" />
                        {isHebrew ? 'אתר החברה' : 'Company website'}
                      </a>
                    </Button>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </ScrollArea>
    </div>
  );
}
