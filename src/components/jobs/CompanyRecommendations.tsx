import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Building2, ExternalLink, Briefcase, TrendingUp, Loader2, Sparkles } from 'lucide-react';

interface RecommendedCompany {
  name: string;
  logo_url: string | null;
  website: string | null;
  industry: string | null;
  size: string | null;
  activeJobsCount: number;
  relevantTitles: string[];
}

export function CompanyRecommendations() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isHebrew = language === 'he';

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['company-recommendations-personalized', user?.id],
    queryFn: async (): Promise<RecommendedCompany[]> => {
      if (!user) return [];

      // Get user profile to know their target roles
      const { data: profile } = await supabase
        .from('profiles')
        .select('target_roles, skills, job_field_id')
        .eq('id', user.id)
        .maybeSingle();

      const targetRoles: string[] = profile?.target_roles ?? [];
      const skills: string[] = profile?.skills ?? [];

      // Get jobs from DB that match user's target roles or skills
      // Focus on community-shared jobs (from extension) with company_name
      let jobQuery = supabase
        .from('jobs')
        .select('company_name, title, source_url')
        .eq('status', 'active')
        .not('company_name', 'is', null)
        .neq('company_name', '')
        .neq('company_name', 'hr_recruiter')
        .limit(200);

      // Filter by target roles if available
      if (targetRoles.length > 0) {
        const roleFilter = targetRoles.slice(0, 3).map(r => `title.ilike.%${r}%`).join(',');
        jobQuery = jobQuery.or(roleFilter);
      } else if (skills.length > 0) {
        const skillFilter = skills.slice(0, 3).map(s => `title.ilike.%${s}%`).join(',');
        jobQuery = jobQuery.or(skillFilter);
      }

      const { data: jobs } = await jobQuery;
      if (!jobs?.length) {
        // Fallback: top companies by job count (no filter)
        const { data: allJobs } = await supabase
          .from('jobs')
          .select('company_name, title')
          .eq('status', 'active')
          .not('company_name', 'is', null)
          .neq('company_name', '')
          .neq('company_name', 'hr_recruiter')
          .limit(300);
        if (!allJobs?.length) return [];
        return aggregateCompanies(allJobs, targetRoles);
      }

      return aggregateCompanies(jobs, targetRoles);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          {isHebrew ? 'חברות מגייסות עבורך' : 'Companies Hiring for You'}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {isHebrew
            ? 'חברות עם משרות שמתאימות לפרופיל שלך'
            : 'Companies with jobs matching your profile'}
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : companies.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {isHebrew
              ? 'השלם את הפרופיל שלך כדי לקבל המלצות מותאמות אישית'
              : 'Complete your profile to get personalized recommendations'}
          </div>
        ) : (
          <ScrollArea className="h-[380px] pr-2">
            <div className="space-y-2">
              {companies.map((company, i) => (
                <div
                  key={`${company.name}-${i}`}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="w-10 h-10 rounded-lg flex-shrink-0">
                    <AvatarImage src={company.logo_url || undefined} />
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs font-bold">
                      {company.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm truncate">{company.name}</h4>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {company.activeJobsCount} {isHebrew ? 'משרות' : 'jobs'}
                      </Badge>
                    </div>
                    {company.relevantTitles.length > 0 && (
                      <p className="text-xs text-muted-foreground truncate">
                        {company.relevantTitles.slice(0, 2).join(' · ')}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      {company.industry && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          {company.industry}
                        </span>
                      )}
                      {company.size && (
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {company.size}
                        </span>
                      )}
                    </div>
                  </div>

                  {company.website && (
                    <Button variant="ghost" size="icon" className="flex-shrink-0 w-8 h-8" asChild>
                      <a href={company.website} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

function aggregateCompanies(
  jobs: Array<{ company_name: string | null; title: string }>,
  targetRoles: string[]
): RecommendedCompany[] {
  const map = new Map<string, { count: number; titles: string[] }>();
  for (const j of jobs) {
    if (!j.company_name) continue;
    const name = j.company_name.trim();
    if (!name || name === 'hr_recruiter') continue;
    const existing = map.get(name) ?? { count: 0, titles: [] };
    existing.count++;
    if (existing.titles.length < 3 && j.title && !existing.titles.includes(j.title)) {
      existing.titles.push(j.title);
    }
    map.set(name, existing);
  }

  return Array.from(map.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 15)
    .map(([name, data]) => ({
      name,
      logo_url: null,
      website: null,
      industry: null,
      size: null,
      activeJobsCount: data.count,
      relevantTitles: data.titles,
    }));
}
