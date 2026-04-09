import { useRef, useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { JobFilters, JobFiltersState } from './JobFilters';
import { JobCard } from './JobCard';
import { JobCardCompact } from './JobCardCompact';
import { JobDetailsPanel, JobDetailsPanelEmpty } from './JobDetailsPanel';
import { JobDetailsSheet } from './JobDetailsSheet';
import { ShareJobForm } from './ShareJobForm';
import { RecommendedCompaniesPanel } from './RecommendedCompaniesPanel';
import { JobInsightsStats } from './JobInsightsStats';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Search, Briefcase, Share2, Target, BarChart3, Building2, Undo2, ArrowDownUp, Loader2, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const defaultFilters: JobFiltersState = {
  search: '', location: '', jobType: '', salaryRange: '', companySearch: '',
  industry: '', category: '', fieldSlug: '', roleSlug: '', experienceLevelSlug: '',
  userLatitude: null, userLongitude: null, maxDistance: 25, source: '',
};

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type SortOption = 'newest' | 'match' | 'salary';

export function JobSearchPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<JobFiltersState>(() => {
    if (!user) return defaultFilters;
    try {
      const saved = sessionStorage.getItem(`plug_job_filters_${user.id}`);
      return saved ? { ...defaultFilters, ...JSON.parse(saved) } : defaultFilters;
    } catch { return defaultFilters; }
  });
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [matchMeActive, setMatchMeActive] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [visibleCount, setVisibleCount] = useState(20);

  const dismissStorageKey = user ? `plug_dismissed_jobs_${user.id}` : null;
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    if (!user) return new Set();
    try {
      const raw = localStorage.getItem(`plug_dismissed_jobs_${user.id}`);
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch { return new Set(); }
  });
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  // Persist filters to sessionStorage
  useEffect(() => {
    if (user) sessionStorage.setItem(`plug_job_filters_${user.id}`, JSON.stringify(filters));
  }, [filters, user]);

  // Fetch user profile for Match Me
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile-for-match', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from('profiles').select('preferred_fields, preferred_roles, cv_data').eq('user_id', user.id).single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch jobs
  const { data: jobs = [], isLoading, error: jobsError, refetch } = useQuery({
    queryKey: ['jobs', filters],
    queryFn: async () => {
      let query = supabase
        .from('jobs')
        .select(`*, company:companies(id, name, logo_url, description, website), job_field:job_fields(id, slug, name_en, name_he), experience_level:experience_levels(id, slug, name_en, name_he)`)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (filters.search) query = query.ilike('title', `%${filters.search}%`);
      if (filters.location) query = query.ilike('location', `%${filters.location}%`);
      if (filters.jobType) query = query.eq('job_type', filters.jobType);
      if (filters.salaryRange && filters.salaryRange !== 'any') query = query.eq('salary_range', filters.salaryRange);

      if (filters.fieldSlug) {
        const { data: fieldData } = await supabase.from('job_fields').select('id').eq('slug', filters.fieldSlug).single();
        if (fieldData) query = query.or(`field_id.eq.${fieldData.id},field_id.is.null`);
      }
      if (filters.roleSlug) {
        const { data: roleData } = await supabase.from('job_roles').select('id').eq('slug', filters.roleSlug).single();
        if (roleData) query = query.eq('role_id', roleData.id);
      }
      if (filters.experienceLevelSlug) {
        const { data: expData } = await supabase.from('experience_levels').select('id').eq('slug', filters.experienceLevelSlug).single();
        if (expData) query = query.eq('experience_level_id', expData.id);
      }
      if (filters.category) query = query.eq('category', filters.category);
      if (filters.source === 'alljobs') query = query.eq('external_source', 'alljobs');
      else if (filters.source === 'linkedin') query = query.eq('external_source', 'linkedin');

      const { data, error } = await query.limit(100);
      if (error) throw error;

      let filteredData = data || [];

      if (filters.companySearch) {
        const searchLower = filters.companySearch.toLowerCase();
        filteredData = filteredData.filter(job => (job.company as any)?.name?.toLowerCase().includes(searchLower));
      }

      if (filters.userLatitude && filters.userLongitude) {
        filteredData = filteredData.map(job => {
          const j = job as any;
          if (j.latitude && j.longitude) {
            return { ...job, distance: Math.round(calculateDistance(filters.userLatitude!, filters.userLongitude!, j.latitude, j.longitude)) };
          }
          return { ...job, distance: null };
        }).filter(job => (job as any).distance === null || (job as any).distance <= filters.maxDistance);
      }

      // Deduplicate
      const seen = new Map<string, typeof filteredData[0]>();
      for (const job of filteredData) {
        const key = [(job.title || '').toLowerCase().trim().replace(/\s+/g, ' '), ((job.company as any)?.name || '').toLowerCase().trim()].join('::');
        if (!seen.has(key)) seen.set(key, job);
        else {
          const existing = seen.get(key)!;
          if ((job as any).is_community_shared === false && (existing as any).is_community_shared !== false) seen.set(key, job);
        }
      }
      return Array.from(seen.values());
    },
  });

  // Auto-refresh every 2 hours
  useEffect(() => {
    const interval = setInterval(() => refetch(), 2 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refetch]);

  // Match Me filter
  const matchedJobs = useMemo(() => {
    if (!matchMeActive || !userProfile) return jobs;
    const cvData = userProfile.cv_data as any;
    const skills = cvData?.skills?.technical || [];
    const preferredFields = userProfile.preferred_fields || [];
    if (skills.length === 0 && preferredFields.length === 0) {
      toast.info(isHebrew ? 'עדכן את הפרופיל שלך כדי לקבל התאמות טובות יותר' : 'Update your profile for better matches');
      return jobs;
    }
    return jobs.filter(job => {
      const jobDesc = ((job.description || '') + ' ' + (job.title || '') + ' ' + (job.requirements || '')).toLowerCase();
      const hasSkillMatch = skills.some((skill: string) => jobDesc.includes(skill.toLowerCase()));
      const hasFieldMatch = preferredFields.length === 0 || preferredFields.some((field: string) => (job as any).job_field?.slug === field);
      return hasSkillMatch || hasFieldMatch;
    });
  }, [jobs, matchMeActive, userProfile, isHebrew]);

  // Filter dismissed + sort
  const allDisplayedJobs = useMemo(() => {
    let result = (matchMeActive ? matchedJobs : jobs).filter(j => !dismissedIds.has((j as any).id));

    if (sortBy === 'salary') {
      result = [...result].sort((a, b) => ((b as any).salary_max || 0) - ((a as any).salary_max || 0));
    } else if (sortBy === 'match') {
      result = [...result].sort((a, b) => ((b as any).match_score || 0) - ((a as any).match_score || 0));
    }
    // 'newest' is default from query order

    return result;
  }, [matchMeActive, matchedJobs, jobs, dismissedIds, sortBy]);

  const displayedJobs = allDisplayedJobs.slice(0, visibleCount);
  const hasMore = visibleCount < allDisplayedJobs.length;

  // Reset visible count when filters change
  useEffect(() => { setVisibleCount(20); }, [filters, matchMeActive]);

  // Apply mutation
  const applyMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase.from('applications').insert({ job_id: jobId, candidate_id: user!.id, status: 'active', current_stage: 'applied' });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isHebrew ? 'המועמדות הוגשה בהצלחה!' : 'Application submitted!');
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (error: any) => {
      if (error.message?.includes('duplicate')) {
        toast.error(isHebrew ? 'כבר הגשת מועמדות למשרה זו' : 'You already applied to this job');
      } else {
        toast.error(isHebrew ? 'שגיאה בהגשת המועמדות' : 'Failed to apply');
      }
    },
  });

  const handleApply = (job: any) => {
    if (!user) { toast.error(isHebrew ? 'יש להתחבר כדי להגיש מועמדות' : 'Please sign in to apply'); return; }
    if (job.source_url) window.open(job.source_url, '_blank', 'noopener,noreferrer');
    applyMutation.mutate(job.id, {
      onSuccess: () => {
        setAppliedIds(prev => new Set([...prev, job.id]));
        setDismissedIds(prev => {
          const next = new Set(prev); next.add(job.id);
          if (dismissStorageKey) localStorage.setItem(dismissStorageKey, JSON.stringify(Array.from(next)));
          return next;
        });
      },
    });
  };

  const handleDismiss = (job: any) => {
    const newSet = new Set(dismissedIds); newSet.add(job.id); setDismissedIds(newSet);
    if (dismissStorageKey) localStorage.setItem(dismissStorageKey, JSON.stringify(Array.from(newSet)));
    toast.info(isHebrew ? 'המשרה הוסתרה' : 'Job hidden', {
      action: {
        label: isHebrew ? 'בטל' : 'Undo',
        onClick: () => {
          const restored = new Set(newSet); restored.delete(job.id); setDismissedIds(restored);
          if (dismissStorageKey) localStorage.setItem(dismissStorageKey, JSON.stringify(Array.from(restored)));
        },
      },
    });
  };

  const handleMarkApplied = (job: any) => {
    if (!user) { toast.error(isHebrew ? 'יש להתחבר כדי לסמן הגשה' : 'Please sign in'); return; }
    applyMutation.mutate(job.id, {
      onSuccess: () => {
        setAppliedIds(prev => new Set([...prev, job.id]));
        setDismissedIds(prev => {
          const next = new Set(prev); next.add(job.id);
          if (dismissStorageKey) localStorage.setItem(dismissStorageKey, JSON.stringify(Array.from(next)));
          return next;
        });
        toast.success(isHebrew ? 'סומן כהוגש!' : 'Marked as applied!');
      },
    });
  };

  const handleClearFilters = () => setFilters(defaultFilters);

  const handleSelectJob = (job: any) => {
    setSelectedJob(job);
    // On mobile, open sheet
    if (window.innerWidth < 1024) setDetailsOpen(true);
  };

  return (
    <div className="space-y-3" dir={isHebrew ? 'rtl' : 'ltr'}>
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2 me-auto">
          <Search className="w-5 h-5 text-primary" />
          {isHebrew ? 'לוח המשרות שלי' : 'My Jobboard'}
          <Badge variant="secondary" className="text-xs font-normal">
            {allDisplayedJobs.length}
          </Badge>
        </h1>

        {/* New Search — opens full filters in right-side sheet */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {isHebrew ? 'חיפוש חדש' : 'New Search'}
            </Button>
          </SheetTrigger>
          <SheetContent side={isHebrew ? 'right' : 'right'} className="w-[360px] sm:w-[420px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{isHebrew ? 'חיפוש מתקדם' : 'Advanced Search'}</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <JobFilters filters={filters} onFiltersChange={setFilters} onClearFilters={handleClearFilters} />
            </div>
          </SheetContent>
        </Sheet>

        {/* Sort */}
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="h-8 w-auto gap-1.5 text-xs border-dashed">
            <ArrowDownUp className="w-3.5 h-3.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{isHebrew ? 'חדש ביותר' : 'Newest'}</SelectItem>
            <SelectItem value="match">{isHebrew ? 'התאמה' : 'Match'}</SelectItem>
            <SelectItem value="salary">{isHebrew ? 'שכר' : 'Salary'}</SelectItem>
          </SelectContent>
        </Select>

        {/* Match Me */}
        <Button variant={matchMeActive ? 'default' : 'outline'} size="sm" className="h-8 gap-1.5 text-xs"
          onClick={() => setMatchMeActive(!matchMeActive)}>
          <Target className="w-3.5 h-3.5" />
          {isHebrew ? (matchMeActive ? 'הצג הכל' : 'מתאים לי!') : (matchMeActive ? 'Show All' : 'Match Me!')}
          {matchMeActive && matchedJobs.length !== jobs.length && (
            <Badge variant="secondary" className="px-1 py-0 h-4 text-[10px] ms-0.5">{matchedJobs.length}</Badge>
          )}
        </Button>

        {/* Share Job */}
        <ShareJobForm
          trigger={
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <Share2 className="w-3.5 h-3.5" />
              {isHebrew ? 'שתף משרה' : 'Share Job'}
            </Button>
          }
        />

        {/* Stats Dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
              <BarChart3 className="w-3.5 h-3.5" />
              {isHebrew ? 'סטטיסטיקות' : 'Stats'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isHebrew ? 'סטטיסטיקות שוק העבודה' : 'Job Market Stats'}</DialogTitle>
            </DialogHeader>
            <JobInsightsStats jobs={jobs} />
          </DialogContent>
        </Dialog>

        {/* Companies Dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" data-tour="company-recommendations">
              <Building2 className="w-3.5 h-3.5" />
              {isHebrew ? 'חברות לעניין אותך' : 'Companies for You'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                {isHebrew ? 'חברות שיכולות לעניין אותך' : 'Companies That May Interest You'}
              </DialogTitle>
            </DialogHeader>
            <RecommendedCompaniesPanel
              onOpenJob={(job) => {
                setSelectedJob(job);
                setDetailsOpen(true);
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Hidden jobs restore */}
        {dismissedIds.size > 0 && (
          <button className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
            onClick={() => { setDismissedIds(new Set()); if (dismissStorageKey) localStorage.removeItem(dismissStorageKey); }}>
            <Undo2 className="w-3 h-3" />
            {isHebrew ? `${dismissedIds.size} מוסתרות` : `${dismissedIds.size} hidden`}
          </button>
        )}
      </div>

      {/* ── Compact Filters ── */}
      <JobFilters compact filters={filters} onFiltersChange={setFilters} onClearFilters={handleClearFilters} />

      {/* ── Error ── */}
      {jobsError && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 text-xs">
          {isHebrew ? 'שגיאה בטעינת משרות' : 'Error loading jobs'}: {(jobsError as any)?.message || 'Unknown error'}
        </div>
      )}

      {/* ── Loading ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex gap-3 p-3 border-b border-border">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : allDisplayedJobs.length === 0 ? (
        /* ── Empty State ── */
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Briefcase className="w-14 h-14 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-1">
            {isHebrew ? 'לא נמצאו משרות' : 'No jobs found'}
          </h3>
          <p className="text-sm text-muted-foreground/60 mb-4">
            {matchMeActive
              ? (isHebrew ? 'נסה לכבות את הסינון או לעדכן את הפרופיל' : 'Try disabling the filter or updating your profile')
              : (isHebrew ? 'נסה לשנות את הפילטרים' : 'Try adjusting your filters')}
          </p>
          <Button variant="outline" size="sm" onClick={() => { handleClearFilters(); setMatchMeActive(false); }}>
            {isHebrew ? 'נקה פילטרים' : 'Clear filters'}
          </Button>
        </div>
      ) : (
        <>
          {/* ══════ Desktop: Split-Pane ══════ */}
          <div className="hidden lg:block h-[calc(100vh-14rem)] rounded-lg border border-border overflow-hidden">
            <ResizablePanelGroup direction="horizontal">
              <ResizablePanel defaultSize={38} minSize={28}>
                <ScrollArea className="h-full">
                  {displayedJobs.map((job) => (
                    <JobCardCompact
                      key={job.id}
                      job={job}
                      isSelected={selectedJob?.id === job.id}
                      onClick={() => handleSelectJob(job)}
                    />
                  ))}
                  {hasMore && (
                    <div className="p-3 text-center">
                      <Button variant="ghost" size="sm" className="text-xs gap-1.5"
                        onClick={() => setVisibleCount(prev => prev + 20)}>
                        <Loader2 className="w-3.5 h-3.5" />
                        {isHebrew ? `טען עוד (${allDisplayedJobs.length - visibleCount} נוספות)` : `Load more (${allDisplayedJobs.length - visibleCount} remaining)`}
                      </Button>
                    </div>
                  )}
                </ScrollArea>
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel defaultSize={62} minSize={40}>
                <ScrollArea className="h-full">
                  {selectedJob ? (
                    <JobDetailsPanel
                      job={selectedJob}
                      onApply={handleApply}
                      onDismiss={handleDismiss}
                      onMarkApplied={handleMarkApplied}
                      onRefresh={() => refetch()}
                      isApplied={appliedIds.has(selectedJob.id)}
                    />
                  ) : (
                    <JobDetailsPanelEmpty />
                  )}
                </ScrollArea>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>

          {/* ══════ Mobile: Single column ══════ */}
          <div className="lg:hidden space-y-3">
            {displayedJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job as any}
                onViewDetails={handleSelectJob}
                onApply={handleApply}
                onDismiss={handleDismiss}
                onMarkApplied={handleMarkApplied}
                isCommunityShared={job.is_community_shared}
                sharerName={(job as any).sharer?.full_name}
                distance={(job as any).distance}
                category={(job as any).category}
                isApplied={appliedIds.has((job as any).id)}
              />
            ))}
            {hasMore && (
              <div className="text-center py-2">
                <Button variant="outline" size="sm" onClick={() => setVisibleCount(prev => prev + 20)}>
                  {isHebrew ? 'טען עוד' : 'Load More'}
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Mobile Job Details Sheet */}
      <JobDetailsSheet
        job={selectedJob}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onApply={handleApply}
        isApplied={selectedJob ? appliedIds.has(selectedJob.id) : false}
      />
    </div>
  );
}
