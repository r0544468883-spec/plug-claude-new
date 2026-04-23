import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { FollowButton } from '@/components/feed/FollowButton';
import { CompanyClaimDialog } from '@/components/company/CompanyClaimDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { getCompanyLogoUrl } from '@/lib/company-logo';
import {
  ArrowLeft, ArrowRight, Building2, Briefcase, Globe, TrendingUp,
  Flame, Target, Sparkles, Calendar, ExternalLink, MapPin, DollarSign,
  Pencil, ShieldCheck,
} from 'lucide-react';

const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

export default function CompanyProfile() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { language, direction } = useLanguage();
  const isHe = language === 'he';
  const { user } = useAuth();
  const BackIcon = direction === 'rtl' ? ArrowRight : ArrowLeft;

  // Fetch company record
  const { data: company, isLoading: loadingCompany } = useQuery({
    queryKey: ['company', companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId!)
        .single();
      return data as any;
    },
    enabled: !!companyId,
  });

  // Fetch all jobs for this company
  const { data: jobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ['company-jobs', companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from('jobs')
        .select('id, title, description, requirements, location, salary_range, job_type, status, source_url, created_at, company_name')
        .eq('company_id', companyId!)
        .order('created_at', { ascending: false })
        .limit(100);
      return (data || []) as any[];
    },
    enabled: !!companyId,
  });

  // Fetch user profile for match scoring
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile-match', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('preferred_fields, preferred_roles, cv_data')
        .eq('user_id', user.id)
        .single();
      return data as any;
    },
    enabled: !!user?.id,
  });

  const userKeywords = useMemo(() => {
    if (!userProfile) return { skills: [] as string[], roles: [] as string[] };
    const cvData = userProfile.cv_data as { skills?: { technical?: string[] } } | null;
    const skills = (cvData?.skills?.technical || []).map((s: string) => s.toLowerCase());
    const roles = ((userProfile.preferred_roles as string[]) || []).map((r: string) => r.toLowerCase());
    return { skills, roles };
  }, [userProfile]);

  const matchesUser = (job: any): boolean => {
    const haystack = `${job.title || ''} ${job.description || ''} ${job.requirements || ''}`.toLowerCase();
    return userKeywords.skills.some(s => s && haystack.includes(s)) ||
           userKeywords.roles.some(r => r && haystack.includes(r));
  };

  const activeJobs = jobs.filter(j => j.status === 'active');
  const since60d = jobs.filter(j => Date.now() - new Date(j.created_at).getTime() < SIXTY_DAYS_MS);
  const matchingJobs = activeJobs.filter(matchesUser);
  const matchScore = activeJobs.length > 0
    ? Math.round((matchingJobs.length / activeJobs.length) * 100)
    : 0;
  const hiringVelocity: 'hot' | 'steady' | 'rare' =
    since60d.length >= 5 ? 'hot' : since60d.length >= 2 ? 'steady' : 'rare';

  const loading = loadingCompany || loadingJobs;

  return (
    <DashboardLayout currentSection="network" onSectionChange={() => {}}>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Back button */}
        <Button variant="ghost" size="sm" className="gap-1.5 -ms-2" onClick={() => navigate(-1)}>
          <BackIcon className="w-4 h-4" />
          {isHe ? 'חזרה' : 'Back'}
        </Button>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : !company ? (
          <div className="text-center py-16">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">{isHe ? 'חברה לא נמצאה' : 'Company not found'}</p>
          </div>
        ) : (
          <>
            {/* ── Claim / Edit Banner ── */}
            {!company.is_claimed && user && user.id !== company.claimed_by && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-amber-700">
                    {isHe ? 'האם זו החברה שלך?' : 'Is this your company?'}
                  </p>
                  <p className="text-xs text-amber-600/80">
                    {isHe ? 'תבע את הדף ונהל אותו בעצמך' : 'Claim this page and manage it yourself'}
                  </p>
                </div>
                <CompanyClaimDialog companyId={companyId!} companyName={company.name} />
              </div>
            )}
            {company.is_claimed && user?.id === company.claimed_by && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <p className="text-sm font-medium text-primary">
                    {isHe ? 'זה הדף שלך' : 'This is your company page'}
                  </p>
                </div>
                <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => navigate(`/company/${companyId}/dashboard`)}>
                  <Pencil className="w-3.5 h-3.5" />
                  {isHe ? 'ערוך' : 'Edit'}
                </Button>
              </div>
            )}

            {/* ── Company Header ── */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <Avatar className="w-16 h-16 rounded-xl flex-shrink-0">
                    <AvatarImage src={getCompanyLogoUrl(company) || undefined} />
                    <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-xl font-bold">
                      {company.name?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h1 className="text-xl font-bold">{company.name}</h1>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {company.industry && (
                            <span className="text-xs text-muted-foreground">{company.industry}</span>
                          )}
                          {company.size && (
                            <span className="text-xs text-muted-foreground">· {company.size}</span>
                          )}
                          {hiringVelocity === 'hot' && (
                            <Badge className="gap-0.5 bg-orange-500/15 text-orange-600 border-orange-500/30 text-[10px]">
                              <Flame className="w-2.5 h-2.5" />
                              {isHe ? 'מגייסת חזק' : 'Hot Hiring'}
                            </Badge>
                          )}
                          {matchScore >= 50 && (
                            <Badge className="gap-0.5 bg-green-500/15 text-green-600 border-green-500/30 text-[10px]">
                              <Target className="w-2.5 h-2.5" />
                              {matchScore}% {isHe ? 'התאמה' : 'match'}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <FollowButton targetCompanyId={companyId} size="sm" />
                    </div>

                    {company.tagline && (
                      <p className="text-sm font-medium text-foreground/80 mt-2 italic">{company.tagline}</p>
                    )}
                    {company.description && (
                      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{company.description}</p>
                    )}

                    {company.website && (
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline"
                      >
                        <Globe className="w-3 h-3" />
                        {company.website.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Stats Row ── */}
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  icon: Briefcase,
                  value: activeJobs.length,
                  label: isHe ? 'משרות פתוחות' : 'Open Jobs',
                  color: 'text-primary',
                },
                {
                  icon: TrendingUp,
                  value: since60d.length,
                  label: isHe ? 'פרסומים ב-60 יום' : 'Posted 60d',
                  color: 'text-orange-500',
                },
                {
                  icon: Sparkles,
                  value: matchingJobs.length,
                  label: isHe ? 'מתאימות לך' : 'Match You',
                  color: 'text-green-500',
                },
              ].map((s, i) => (
                <Card key={i}>
                  <CardContent className="p-3 text-center">
                    <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
                    <p className="text-lg font-bold">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* ── Open Positions ── */}
            <div className="space-y-2">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" />
                {isHe ? 'משרות פתוחות' : 'Open Positions'}
                <span className="text-muted-foreground font-normal">({activeJobs.length})</span>
              </h2>

              {activeJobs.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      {isHe ? 'אין כרגע משרות פתוחות' : 'No open positions right now'}
                    </p>
                    {jobs.length > 0 && (
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        {isHe
                          ? `פרסום אחרון: ${new Date(jobs[0].created_at).toLocaleDateString('he-IL')}`
                          : `Last posted: ${new Date(jobs[0].created_at).toLocaleDateString('en-US')}`}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {activeJobs.map(job => {
                    const isMatch = matchesUser(job);
                    return (
                      <Card
                        key={job.id}
                        className={`transition-colors hover:border-primary/30 ${isMatch ? 'border-green-500/30 bg-green-500/5' : ''}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-medium text-sm">{job.title}</h3>
                                {isMatch && (
                                  <Badge className="gap-0.5 bg-green-500/15 text-green-600 border-green-500/30 text-[10px] h-4 px-1.5">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    {isHe ? 'מתאים לך' : 'Matches you'}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                                {job.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {job.location}
                                  </span>
                                )}
                                {job.job_type && <span>{job.job_type}</span>}
                                {job.salary_range && (
                                  <span className="flex items-center gap-1">
                                    <DollarSign className="w-3 h-3" />
                                    {job.salary_range}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(job.created_at).toLocaleDateString(isHe ? 'he-IL' : 'en-US')}
                                </span>
                              </div>
                              {job.description && (
                                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                                  {job.description}
                                </p>
                              )}
                            </div>
                            {job.source_url && (
                              <a
                                href={job.source_url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="flex-shrink-0"
                              >
                                <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
                                  <ExternalLink className="w-3 h-3" />
                                  {isHe ? 'הגש מועמדות' : 'Apply'}
                                </Button>
                              </a>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Hiring History ── */}
            {jobs.length > activeJobs.length && (
              <div className="space-y-2">
                <h2 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="w-4 h-4" />
                  {isHe ? 'היסטוריית גיוס' : 'Hiring History'}
                </h2>
                <Card>
                  <CardContent className="p-4 space-y-2">
                    {jobs.filter(j => j.status !== 'active').slice(0, 5).map(job => (
                      <div key={job.id} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">{job.title}</p>
                          <p className="text-[10px] text-muted-foreground/60">
                            {new Date(job.created_at).toLocaleDateString(isHe ? 'he-IL' : 'en-US')}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {isHe ? 'סגורה' : 'Closed'}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
