import { useRef, useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { JobFilters, JobFiltersState } from './JobFilters';
import { JobCard } from './JobCard';
import { JobDetailsSheet } from './JobDetailsSheet';
import { ShareJobForm } from './ShareJobForm';
import { CompanyRecommendations } from './CompanyRecommendations';
import { JobInsightsStats } from './JobInsightsStats';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Search, Briefcase, Users, Share2, Sparkles, MapPin, Building2, ChevronDown, Target, BarChart3, ChevronLeft, ChevronRight, Globe, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
const defaultFilters: JobFiltersState = {
  search: '',
  location: '',
  jobType: '',
  salaryRange: '',
  companySearch: '',
  industry: '',
  category: '',
  fieldSlug: '',
  roleSlug: '',
  experienceLevelSlug: '',
  userLatitude: null,
  userLongitude: null,
  maxDistance: 25,
  source: '',
};

// Haversine formula to calculate distance between two points
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}


export function JobSearchPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<JobFiltersState>(defaultFilters);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [matchMeActive, setMatchMeActive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const JOBS_PER_PAGE = 6;

  // Dismissed jobs — persisted to localStorage per user
  const dismissStorageKey = user ? `plug_dismissed_jobs_${user.id}` : null;
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    if (!user) return new Set();
    try {
      const raw = localStorage.getItem(`plug_dismissed_jobs_${user.id}`);
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch { return new Set(); }
  });

  // Applied jobs — track locally for UI feedback after Apply Now click
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  const [jobStats, setJobStats] = useState<{
    total: number
    community: number
    bySource: Record<string, number>
  } | null>(null)

  useEffect(() => {
    supabase
      .from('jobs')
      .select('is_community_shared, external_source')
      .eq('status', 'active')
      .then(({ data }) => {
        if (!data) return
        const total = data.length
        const community = data.filter((j: any) => j.is_community_shared).length
        const bySource: Record<string, number> = {}
        data.forEach((j: any) => {
          if (j.external_source) {
            bySource[j.external_source] = (bySource[j.external_source] ?? 0) + 1
          }
        })
        setJobStats({ total, community, bySource })
      })
  }, [])

  const recommendationsRef = useRef<HTMLDivElement | null>(null);
  const plugChatRef = useRef<HTMLDivElement | null>(null);
  const jobListRef = useRef<HTMLDivElement | null>(null);

  const toggleRecommendations = () => {
    setShowRecommendations((v) => {
      const next = !v;
      if (next) {
        // Scroll after the component renders
        setTimeout(() => {
          recommendationsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
      return next;
    });
  };

  // Fetch user profile for Match Me feature
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile-for-match', user?.id],
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

  // Fetch jobs with filters
  const { data: jobs = [], isLoading, error: jobsError, refetch } = useQuery({
    queryKey: ['jobs', filters],
    queryFn: async () => {
      let query = supabase
        .from('jobs')
        .select(`
          *,
          company:companies(id, name, logo_url, description, website),
          job_field:job_fields(id, slug, name_en, name_he),
          experience_level:experience_levels(id, slug, name_en, name_he)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      // Apply search filter
      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      // Apply location filter
      if (filters.location) {
        query = query.ilike('location', `%${filters.location}%`);
      }

      // Apply job type filter
      if (filters.jobType) {
        query = query.eq('job_type', filters.jobType);
      }

      // Apply salary range filter
      if (filters.salaryRange && filters.salaryRange !== 'any') {
        query = query.eq('salary_range', filters.salaryRange);
      }

      // Apply field filter (hierarchical)
      if (filters.fieldSlug) {
        // Get field_id from slug
        const { data: fieldData } = await supabase
          .from('job_fields')
          .select('id')
          .eq('slug', filters.fieldSlug)
          .single();
        
        if (fieldData) {
          // Show matching field + unclassified jobs (null field_id from extension)
          query = query.or(`field_id.eq.${fieldData.id},field_id.is.null`);
        }
      }

      // Apply role filter (hierarchical)
      if (filters.roleSlug) {
        const { data: roleData } = await supabase
          .from('job_roles')
          .select('id')
          .eq('slug', filters.roleSlug)
          .single();
        
        if (roleData) {
          query = query.eq('role_id', roleData.id);
        }
      }

      // Apply experience level filter
      if (filters.experienceLevelSlug) {
        const { data: expData } = await supabase
          .from('experience_levels')
          .select('id')
          .eq('slug', filters.experienceLevelSlug)
          .single();
        
        if (expData) {
          query = query.eq('experience_level_id', expData.id);
        }
      }

      // Legacy category filter (backward compatibility)
      if (filters.category) {
        query = query.eq('category', filters.category);
      }

      // Source filter (AllJobs / LinkedIn)
      if (filters.source === 'alljobs') {
        query = query.eq('external_source', 'alljobs');
      } else if (filters.source === 'linkedin') {
        query = query.eq('external_source', 'linkedin');
      }

      const { data, error } = await query.limit(50);

      if (error) {
        console.error('[JobSearch] query error:', error)
        throw error
      }
      console.log('[JobSearch] fetched', data?.length, 'jobs')

      let filteredData = data || [];

      // Client-side filter for company search
      if (filters.companySearch) {
        const searchLower = filters.companySearch.toLowerCase();
        filteredData = filteredData.filter(job => 
          (job.company as any)?.name?.toLowerCase().includes(searchLower)
        );
      }

      // Client-side filter for distance (GPS)
      if (filters.userLatitude && filters.userLongitude) {
        filteredData = filteredData.map(job => {
          const jobData = job as any;
          if (jobData.latitude && jobData.longitude) {
            const distance = calculateDistance(
              filters.userLatitude!,
              filters.userLongitude!,
              jobData.latitude,
              jobData.longitude
            );
            return { ...job, distance: Math.round(distance) };
          }
          return { ...job, distance: null };
        }).filter(job => {
          // Keep jobs without coordinates or within distance
          const jobData = job as any;
          return jobData.distance === null || jobData.distance <= filters.maxDistance;
        });
      }

      // Deduplication: same title + company → keep platform job over community job
      const seen = new Map<string, typeof filteredData[0]>()
      for (const job of filteredData) {
        const key = [
          (job.title || '').toLowerCase().trim().replace(/\s+/g, ' '),
          ((job.company as any)?.name || '').toLowerCase().trim(),
        ].join('::')
        if (!seen.has(key)) {
          seen.set(key, job)
        } else {
          const existing = seen.get(key)!
          // Non-community (platform-posted) wins over community-shared
          if ((job as any).is_community_shared === false && (existing as any).is_community_shared !== false) {
            seen.set(key, job)
          }
        }
      }
      filteredData = Array.from(seen.values())

      return filteredData;
    },
  });

  // Auto-refresh every 2 hours
  useEffect(() => {
    const interval = setInterval(() => refetch(), 2 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refetch]);

  // Count community shared jobs
  const communityJobsCount = jobs.filter(j => j.is_community_shared).length;

  // Apply Match Me filter based on user preferences
  const matchedJobs = useMemo(() => {
    if (!matchMeActive || !userProfile) return jobs;
    
    // Extract skills from cv_data if available
    const cvData = userProfile.cv_data as any;
    const skills = cvData?.skills?.technical || [];
    const preferredFields = userProfile.preferred_fields || [];
    const preferredRoles = userProfile.preferred_roles || [];
    
    if (skills.length === 0 && preferredFields.length === 0 && preferredRoles.length === 0) {
      toast.info(isHebrew 
        ? 'עדכן את הפרופיל שלך כדי לקבל התאמות טובות יותר' 
        : 'Update your profile for better matches');
      return jobs;
    }

    return jobs.filter(job => {
      const jobDesc = ((job.description || '') + ' ' + (job.title || '') + ' ' + (job.requirements || '')).toLowerCase();
      
      // Check if any skill matches
      const hasSkillMatch = skills.some((skill: string) => 
        jobDesc.includes(skill.toLowerCase())
      );
      
      // Check field match
      const hasFieldMatch = preferredFields.length === 0 || 
        preferredFields.some((field: string) => 
          (job as any).job_field?.slug === field || (job as any).field_id === field
        );

      return hasSkillMatch || hasFieldMatch;
    });
  }, [jobs, matchMeActive, userProfile, isHebrew]);

  const allDisplayedJobs = (matchMeActive ? matchedJobs : jobs).filter(
    j => !dismissedIds.has((j as any).id)
  );
  const totalPages = Math.ceil(allDisplayedJobs.length / JOBS_PER_PAGE);
  const displayedJobs = allDisplayedJobs.slice((currentPage - 1) * JOBS_PER_PAGE, currentPage * JOBS_PER_PAGE);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, matchMeActive]);

  // Scroll to top of job list when page changes
  useEffect(() => {
    jobListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [currentPage]);

  // Apply mutation
  const applyMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .from('applications')
        .insert({
          job_id: jobId,
          candidate_id: user!.id,
          status: 'active',
          current_stage: 'applied',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isHebrew ? 'המועמדות הוגשה בהצלחה!' : 'Application submitted!');
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setDetailsOpen(false);
    },
    onError: (error: any) => {
      if (error.message?.includes('duplicate')) {
        toast.error(isHebrew ? 'כבר הגשת מועמדות למשרה זו' : 'You already applied to this job');
      } else {
        toast.error(isHebrew ? 'שגיאה בהגשת המועמדות' : 'Failed to apply');
      }
    },
  });

  const handleViewDetails = (job: any) => {
    setSelectedJob(job);
    setDetailsOpen(true);
  };

  const handleApply = (job: any) => {
    if (!user) {
      toast.error(isHebrew ? 'יש להתחבר כדי להגיש מועמדות' : 'Please sign in to apply');
      return;
    }
    // Open job URL in new tab
    if (job.source_url) {
      window.open(job.source_url, '_blank', 'noopener,noreferrer');
    }
    applyMutation.mutate(job.id, {
      onSuccess: () => {
        setAppliedIds(prev => new Set([...prev, job.id]));
        // Dismiss card silently so it disappears from the list
        setDismissedIds(prev => {
          const next = new Set(prev);
          next.add(job.id);
          if (dismissStorageKey) localStorage.setItem(dismissStorageKey, JSON.stringify(Array.from(next)));
          return next;
        });
      },
    });
  };

  const handleDismiss = (job: any) => {
    const newSet = new Set(dismissedIds);
    newSet.add(job.id);
    setDismissedIds(newSet);
    if (dismissStorageKey) {
      localStorage.setItem(dismissStorageKey, JSON.stringify(Array.from(newSet)));
    }
    toast.info(
      isHebrew ? 'המשרה הוסתרה' : 'Job hidden',
      {
        action: {
          label: isHebrew ? 'בטל' : 'Undo',
          onClick: () => {
            const restored = new Set(newSet);
            restored.delete(job.id);
            setDismissedIds(restored);
            if (dismissStorageKey) {
              localStorage.setItem(dismissStorageKey, JSON.stringify(Array.from(restored)));
            }
          },
        },
      }
    );
  };

  const handleMarkApplied = (job: any) => {
    if (!user) {
      toast.error(isHebrew ? 'יש להתחבר כדי לסמן הגשה' : 'Please sign in');
      return;
    }
    applyMutation.mutate(job.id, {
      onSuccess: () => {
        setAppliedIds(prev => new Set([...prev, job.id]));
        // Dismiss card silently so it disappears from the list
        setDismissedIds(prev => {
          const next = new Set(prev);
          next.add(job.id);
          if (dismissStorageKey) localStorage.setItem(dismissStorageKey, JSON.stringify(Array.from(next)));
          return next;
        });
        toast.success(isHebrew ? 'סומן כהוגש!' : 'Marked as applied!');
      },
    });
  };

  const handleClearFilters = () => {
    setFilters(defaultFilters);
  };

  return (
    <div className="space-y-6" dir={isHebrew ? 'rtl' : 'ltr'}>
      {/* Community Sharing Banner */}
      <Card className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-primary/20">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/20">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">
                {isHebrew ? 'הכרת משרה טובה? שתף אותה עם הקהילה!' : 'Know a great job? Share it with the community!'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isHebrew 
                  ? 'כל משרה שתשתף תהיה זמינה לכל מחפשי העבודה במערכת' 
                  : 'Every job you share will be available to all job seekers'}
              </p>
            </div>
          </div>
          <ShareJobForm 
            trigger={
              <Button className="gap-2 bg-primary hover:bg-primary/90 shadow-lg">
                <Share2 className="w-4 h-4" />
                {isHebrew ? 'שתף משרה עכשיו' : 'Share a Job Now'}
              </Button>
            }
          />
        </CardContent>
      </Card>

      {/* Action Buttons Row */}
      <div className="flex flex-wrap gap-2" data-tour="company-recommendations">
        <Button
          variant={matchMeActive ? "default" : "outline"}
          onClick={() => setMatchMeActive(!matchMeActive)}
          className="gap-2"
        >
          <Target className="w-4 h-4" />
          {isHebrew ? (matchMeActive ? 'הצג הכל' : 'מתאים לי!') : (matchMeActive ? 'Show All' : 'Match Me!')}
          {matchMeActive && matchedJobs.length !== jobs.length && (
            <Badge variant="secondary" className="ms-1">
              {matchedJobs.length}
            </Badge>
          )}
        </Button>
        
        <Button
          variant="ghost"
          onClick={toggleRecommendations}
          className="gap-2 text-primary hover:text-primary/80"
        >
          <Building2 className="w-4 h-4" />
          {isHebrew ? 'חברות מומלצות' : 'Recommended Companies'}
          <ChevronDown className={cn("w-4 h-4 transition-transform", showRecommendations && "rotate-180")} />
        </Button>

        <Button
          variant="ghost"
          onClick={() => setShowStats(!showStats)}
          className="gap-2"
        >
          <BarChart3 className="w-4 h-4" />
          {isHebrew ? 'סטטיסטיקות' : 'Stats'}
          <ChevronDown className={cn("w-4 h-4 transition-transform", showStats && "rotate-180")} />
        </Button>
      </div>

      {/* Job Stats (collapsible) */}
      {showStats && (
        <JobInsightsStats jobs={jobs} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Search className="w-6 h-6 text-primary" />
            {isHebrew ? 'חיפוש משרות' : 'Job Search'}
          </h1>
          {dismissedIds.size > 0 && (
            <button
              className="text-xs text-muted-foreground hover:text-primary mt-0.5 flex items-center gap-1"
              onClick={() => {
                setDismissedIds(new Set());
                if (dismissStorageKey) localStorage.removeItem(dismissStorageKey);
              }}
            >
              <Undo2 className="w-3 h-3" />
              {isHebrew ? `הצג ${dismissedIds.size} משרות מוסתרות` : `Show ${dismissedIds.size} hidden jobs`}
            </button>
          )}
          <p className="text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
            {isHebrew 
              ? `${allDisplayedJobs.length} משרות נמצאו` 
              : `${allDisplayedJobs.length} jobs found`}
            {matchMeActive && (
              <Badge variant="default" className="gap-1 bg-primary/20 text-primary border-primary/20">
                <Target className="w-3 h-3" />
                {isHebrew ? 'מסונן לפי התאמה' : 'Matched to you'}
              </Badge>
            )}
            {communityJobsCount > 0 && (
              <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary border-primary/20">
                <Users className="w-3 h-3" />
                {isHebrew 
                  ? `${communityJobsCount} משיתוף קהילתי`
                  : `${communityJobsCount} community shared`}
              </Badge>
            )}
            {filters.userLatitude && (
              <Badge variant="outline" className="gap-1">
                <MapPin className="w-3 h-3" />
                {isHebrew ? 'מסונן לפי מיקום' : 'Filtered by location'}
              </Badge>
            )}
          </p>
        </div>
      </div>

      {/* Extension job stats */}
      {jobStats && (
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground px-1">
          <span className="flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5" />
            {isHebrew ? `${jobStats.total} משרות פעילות` : `${jobStats.total} active jobs`}
          </span>
          {jobStats.community > 0 && (
            <span className="flex items-center gap-1.5 text-primary">
              <Users className="w-3.5 h-3.5" />
              {isHebrew ? `${jobStats.community} נמצאו ע"י קהילה` : `${jobStats.community} found by community`}
            </span>
          )}
          {Object.entries(jobStats.bySource).map(([src, count]) => (
            <span key={src} className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              {src}: {count}
            </span>
          ))}
        </div>
      )}

      {/* Filters */}
      <JobFilters
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={handleClearFilters}
      />

      {/* Debug: query error */}
      {jobsError && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 text-xs font-mono break-all">
          Query error: {(jobsError as any)?.message || (jobsError as any)?.code || JSON.stringify(jobsError)}
          {(jobsError as any)?.details && <div>Details: {(jobsError as any).details}</div>}
          {(jobsError as any)?.hint && <div>Hint: {(jobsError as any).hint}</div>}
        </div>
      )}

      {/* Job List */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : allDisplayedJobs.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-12 text-center">
            <Briefcase className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {isHebrew ? 'לא נמצאו משרות' : 'No jobs found'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {matchMeActive 
                ? (isHebrew 
                    ? 'נסה לכבות את הסינון או לעדכן את הפרופיל שלך'
                    : 'Try turning off the filter or updating your profile')
                : (isHebrew 
                    ? 'נסה לשנות את הפילטרים או לחפש מונח אחר'
                    : 'Try adjusting your filters or search term')}
            </p>
            <Button variant="outline" onClick={() => { handleClearFilters(); setMatchMeActive(false); }}>
              {isHebrew ? 'נקה פילטרים' : 'Clear filters'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div ref={jobListRef} className="grid grid-cols-1 gap-4">
            {displayedJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job as any}
                onViewDetails={handleViewDetails}
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
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className={cn(currentPage === 1 && "pointer-events-none opacity-50", "cursor-pointer")}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      isActive={page === currentPage}
                      onClick={() => setCurrentPage(page)}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className={cn(currentPage === totalPages && "pointer-events-none opacity-50", "cursor-pointer")}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}

      {/* Company Recommendations (at bottom) */}
      {showRecommendations && (
        <div ref={recommendationsRef}>
          <CompanyRecommendations />
        </div>
      )}

      {/* Plug Chat scroll target */}
      <div ref={plugChatRef} />

      {/* Job Details Sheet */}
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
