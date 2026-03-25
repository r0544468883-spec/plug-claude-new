import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { ApplicationsStatsPanel } from './ApplicationsStatsPanel';
import { ApplicationsFilters, StatusFilter, StageFilter, SortOption } from './ApplicationsFilters';
import VerticalApplicationCard from './VerticalApplicationCard';
import AnalysisHistory from '@/components/jobs/AnalysisHistory';
import { ExtensionJobHistory } from '@/components/extension/ExtensionJobHistory';
import AddApplicationForm from './AddApplicationForm';
import { ApplicationDetailsSheet } from './ApplicationDetailsSheet';
import { InterviewFlowDialog } from './InterviewFlowDialog';
// PlugBubble removed - using inline Plug banner instead
import { EmptyApplicationsState } from './EmptyApplicationsState';
import { BulkImportDialog } from './BulkImportDialog';
import { CompanyVouchModal } from '@/components/vouch/CompanyVouchModal';
import { CompanyVouchToast } from '@/components/vouch/CompanyVouchToast';
import { useCompanyVouchPrompts } from '@/hooks/useCompanyVouchPrompts';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Briefcase, Loader2, Sparkles, FileSpreadsheet, Bookmark, ExternalLink, Heart, Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface Application {
  id: string;
  status: string;
  current_stage: string;
  match_score: number | null;
  created_at: string;
  last_interaction: string;
  notes: string | null;
  source: string | null;
  job_url: string | null;
  job_title?: string | null;
  job_company?: string | null;
  job: {
    id: string;
    title: string;
    location: string | null;
    job_type: string | null;
    salary_range: string | null;
    description: string | null;
    requirements: string | null;
    source_url: string | null;
    company: {
      id: string;
      name: string;
      logo_url: string | null;
    } | null;
  } | null;
}

interface ApplicationsPageProps {
  initialStageFilter?: string;
}

export function ApplicationsPage({ initialStageFilter }: ApplicationsPageProps = {}) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const isRTL = language === 'he';

  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [stageFilter, setStageFilter] = useState<StageFilter>((initialStageFilter as StageFilter) || 'all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [savedJobs, setSavedJobs] = useState<any[]>([]);

  // Interview flow dialog
  const [interviewFlowApp, setInterviewFlowApp] = useState<Application | null>(null);
  const [interviewFlowStage, setInterviewFlowStage] = useState<string>('interview');

  // Sheet state
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  
  // Company vouch prompt state
  const [showVouchModal, setShowVouchModal] = useState(false);
  const [directVouchPrompt, setDirectVouchPrompt] = useState<{
    applicationId: string;
    companyId: string;
    companyName: string;
    triggerType: 'time_based' | 'stage_change' | 'completion';
    triggerStage?: string;
  } | null>(null);

  // Company vouch prompts hook (for time-based triggers)
  const { pendingPrompt, triggerStagePrompt, clearPrompt } = useCompanyVouchPrompts(applications);

  // Fetch applications
  const fetchApplications = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Try full query first (includes source/job_url added by extension integration migration)
      let { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          current_stage,
          match_score,
          created_at,
          last_interaction,
          notes,
          source,
          job_url,
          job_title,
          job_company,
          job:jobs (
            id,
            title,
            location,
            job_type,
            salary_range,
            description,
            requirements,
            source_url,
            company_name,
            company:companies (
              id,
              name,
              logo_url
            )
          )
        `)
        .eq('candidate_id', user.id)
        .order('created_at', { ascending: false });

      // Fallback: if job join fails (missing FK constraint in DB), fetch jobs separately
      if (error) {
        console.warn('[Applications] Main query error:', error, '— fetching jobs separately');
        ({ data, error } = await supabase
          .from('applications')
          .select('id, status, current_stage, match_score, created_at, last_interaction, notes, source, job_url, job_id, job_title, job_company')
          .eq('candidate_id', user.id)
          .order('created_at', { ascending: false }));

        if (!error && data && data.length > 0) {
          // Fetch job details separately and merge
          const jobIds = [...new Set((data as any[]).map((a: any) => a.job_id).filter(Boolean))];
          if (jobIds.length > 0) {
            const { data: jobsData } = await supabase
              .from('jobs')
              .select('id, title, location, job_type, salary_range, description, requirements, source_url, company_id, company_name')
              .in('id', jobIds);

            // Fetch companies for these jobs
            const companyIds = [...new Set((jobsData || []).map((j: any) => j.company_id).filter(Boolean))];
            let companiesMap: Record<string, any> = {};
            if (companyIds.length > 0) {
              const { data: companiesData } = await supabase
                .from('companies')
                .select('id, name, logo_url')
                .in('id', companyIds);
              (companiesData || []).forEach((c: any) => { companiesMap[c.id] = c; });
            }

            const jobsMap: Record<string, any> = {};
            (jobsData || []).forEach((j: any) => {
              jobsMap[j.id] = { ...j, company: companiesMap[j.company_id] || null };
            });
            data = (data as any[]).map((app: any) => ({
              ...app,
              job: jobsMap[app.job_id] || null,
              // preserve direct fields for apps whose job was not found (extension apps)
              job_title: app.job_title || jobsMap[app.job_id]?.title || null,
              job_company: app.job_company || jobsMap[app.job_id]?.company?.name || jobsMap[app.job_id]?.company_name || null,
            })) as any;
          }
        }
      }

      if (error) throw error;
      setFetchError(null);

      // Transform the data to match our interface
      const transformedData = (data || []).map((app: any) => ({
        ...app,
        job: app.job ? {
          ...app.job,
          company: Array.isArray(app.job.company) ? app.job.company[0] : app.job.company
        } : null
      }));

      setApplications(transformedData);
    } catch (error: any) {
      console.error('Error fetching applications:', error);
      setFetchError(error?.message || error?.code || JSON.stringify(error));
      toast.error(t('common.error') || 'Failed to load applications');
    } finally {
      setIsLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Real-time: refresh when any application is added or updated
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`applications-rt-${user.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'applications', filter: `candidate_id=eq.${user.id}` },
        () => { fetchApplications(); }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'applications', filter: `candidate_id=eq.${user.id}` },
        () => { fetchApplications(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, fetchApplications]);

  // Fetch saved jobs
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('saved_jobs')
      .select('job_id')
      .eq('user_id', user.id)
      .then(async ({ data: savedData }) => {
        if (!savedData?.length) { setSavedJobs([]); return; }
        const jobIds = savedData.map((s: any) => s.job_id);
        const { data: jobs } = await supabase
          .from('jobs')
          .select('id, title, source_url, company:companies(id, name, logo_url)')
          .in('id', jobIds)
          .eq('status', 'active');
        setSavedJobs(jobs || []);
      });
  }, [user?.id]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = applications.length;
    const active = applications.filter((a) => a.status === 'active').length;
    const interviews = applications.filter((a) => 
      ['interview', 'technical'].includes(a.current_stage || '')
    ).length;
    const rejected = applications.filter((a) => 
      a.current_stage === 'rejected' || a.status === 'rejected'
    ).length;

    return { total, active, interviews, rejected };
  }, [applications]);

  // Filtered and sorted applications
  const filteredApplications = useMemo(() => {
    let result = [...applications];

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter((app) =>
        app.job?.title?.toLowerCase().includes(searchLower) ||
        app.job?.company?.name?.toLowerCase().includes(searchLower) ||
        (app.job_title || '').toLowerCase().includes(searchLower) ||
        (app.job_company || '').toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((app) => app.status === statusFilter);
    }

    // Stage filter
    if (stageFilter !== 'all') {
      result = result.filter((app) => app.current_stage === stageFilter);
    }

    // Sort - prioritize interviews first, then by selected sort
    result.sort((a, b) => {
      // Urgent items first (interviews)
      const aUrgent = a.current_stage === 'interview' ? 1 : 0;
      const bUrgent = b.current_stage === 'interview' ? 1 : 0;
      if (bUrgent !== aUrgent) return bUrgent - aUrgent;

      // Then by selected sort
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortBy === 'match_score') {
        return (b.match_score || 0) - (a.match_score || 0);
      }
      return 0;
    });

    return result;
  }, [applications, search, statusFilter, stageFilter, sortBy]);

  // Handlers
  const handleViewDetails = useCallback((application: Application) => {
    setSelectedApplication(application);
    setSheetOpen(true);
  }, []);

  const handleWithdraw = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: 'withdrawn', current_stage: 'withdrawn' })
        .eq('id', id)
        .eq('candidate_id', user?.id);

      if (error) throw error;

      setApplications((prev) =>
        prev.map((app) =>
          app.id === id ? { ...app, status: 'withdrawn', current_stage: 'withdrawn' } : app
        )
      );

      toast.success(isRTL ? 'המועמדות בוטלה' : 'Application withdrawn');
    } catch (error) {
      console.error('Error withdrawing application:', error);
      toast.error(t('common.error') || 'Failed to withdraw application');
    }
  }, [user?.id, isRTL, t]);

  const handleStageChange = useCallback(async (id: string, newStage: string) => {
    // Stages that trigger the interview flow dialog
    const INTERVIEW_FLOW_STAGES = ['interview', 'screening', 'technical'];
    // Stages that trigger vouch prompts (interview/technical now use interview flow instead)
    const VOUCH_STAGES = ['offer'];
    const COMPLETION_STAGES = ['hired', 'rejected', 'withdrawn'];

    try {
      const updateData: Record<string, string> = {
        current_stage: newStage,
        last_interaction: new Date().toISOString(),
      };

      // Update status based on stage
      if (newStage === 'rejected' || newStage === 'withdrawn') {
        updateData.status = newStage;
      } else if (newStage === 'hired') {
        updateData.status = 'hired';
      } else {
        updateData.status = 'active';
      }

      const { error } = await supabase
        .from('applications')
        .update(updateData)
        .eq('id', id)
        .eq('candidate_id', user?.id);

      if (error) throw error;

      // Find the application to get company info
      const app = applications.find(a => a.id === id);

      // Update local state
      setApplications((prev) =>
        prev.map((a) =>
          a.id === id 
            ? { ...a, current_stage: newStage, status: updateData.status } 
            : a
        )
      );

      toast.success(isRTL ? 'השלב עודכן' : 'Stage updated');

      // Show interview flow dialog for interview-related stages
      if (INTERVIEW_FLOW_STAGES.includes(newStage) && app) {
        setInterviewFlowApp(app);
        setInterviewFlowStage(newStage);
      }

      // Show vouch modal directly for relevant stage changes
      if (app?.job?.company?.id) {
        if (COMPLETION_STAGES.includes(newStage)) {
          setDirectVouchPrompt({
            applicationId: id,
            companyId: app.job.company.id,
            companyName: app.job.company.name,
            triggerType: 'completion',
            triggerStage: newStage,
          });
          setShowVouchModal(true);
        } else if (VOUCH_STAGES.includes(newStage)) {
          setDirectVouchPrompt({
            applicationId: id,
            companyId: app.job.company.id,
            companyName: app.job.company.name,
            triggerType: 'stage_change',
            triggerStage: newStage,
          });
          setShowVouchModal(true);
        }
      }
    } catch (error) {
      console.error('Error updating stage:', error);
      toast.error(t('common.error') || 'Failed to update stage');
    }
  }, [user?.id, isRTL, t, applications]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', id)
        .eq('candidate_id', user?.id);

      if (error) throw error;

      setApplications((prev) => prev.filter((app) => app.id !== id));
      toast.success(isRTL ? 'המועמדות נמחקה' : 'Application deleted');
    } catch (error) {
      console.error('Error deleting application:', error);
      toast.error(t('common.error') || 'Failed to delete application');
    }
  }, [user?.id, isRTL, t]);


  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Briefcase className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold">
          {isRTL ? 'משרות שהגשתי' : 'Jobs I Applied To'}
        </h2>
      </div>

      {/* Job Search Roadmap */}
      {applications.length > 0 && (() => {
        const stages = [
          { slug: 'applied',          he: 'הגשתי',        en: 'Applied' },
          { slug: 'phone_screen',     he: 'שיחת טלפון',   en: 'Phone Screen' },
          { slug: 'interview',        he: 'ראיון',         en: 'Interview' },
          { slug: 'home_assignment',  he: 'מטלת בית',     en: 'Home Assignment' },
          { slug: 'second_interview', he: 'ראיון נוסף',   en: '2nd Interview' },
          { slug: 'offer',            he: 'הצעה',          en: 'Offer' },
        ];
        const counts = applications.reduce<Record<string, number>>((acc, app) => {
          const s = app.current_stage || 'applied';
          acc[s] = (acc[s] || 0) + 1;
          return acc;
        }, {});
        return (
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-3 font-medium">
                {isRTL ? 'מסלול חיפוש עבודה' : 'Job Search Roadmap'}
              </p>
              <div className="flex items-start gap-0 overflow-x-auto">
                {stages.map((stage, i) => {
                  const count = counts[stage.slug] || 0;
                  const isActive = count > 0;
                  return (
                    <div key={stage.slug} className="flex items-center flex-shrink-0">
                      <div className="flex flex-col items-center text-center w-20">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                          isActive
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'bg-muted border-muted-foreground/20 text-muted-foreground'
                        }`}>
                          {isActive ? count : i + 1}
                        </div>
                        <p className={`text-[10px] mt-1 leading-tight ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                          {isRTL ? stage.he : stage.en}
                        </p>
                      </div>
                      {i < stages.length - 1 && (
                        <div className="w-4 h-0.5 bg-muted-foreground/20 flex-shrink-0 mb-4" />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Add Application Form - Always Visible */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              <span className="font-medium">
                {isRTL ? 'הדבק לינק ופלאג יעשה את השאר' : 'Paste a link and Plug will do the rest'}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBulkImport(true)}
              className="gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {isRTL ? 'יבוא מרובה' : 'Bulk Import'}
            </Button>
          </div>
          <AddApplicationForm onApplicationAdded={fetchApplications} />
        </CardContent>
      </Card>

      {/* Stats Panel — 3 tabs: Personal / Benchmark / Market */}
      {user && (
        <ApplicationsStatsPanel applications={applications} userId={user.id} />
      )}

      {/* Filters */}
      <ApplicationsFilters
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        stageFilter={stageFilter}
        onStageChange={setStageFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {/* Applications List */}
      {filteredApplications.length === 0 ? (
        applications.length === 0 ? (
          <EmptyApplicationsState onNavigateToJobs={() => {
            // Navigate to job search - this is handled by parent Dashboard
            window.dispatchEvent(new CustomEvent('plug:navigate', { detail: 'job-search' }));
          }} />
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="p-8 text-center">
              <h3 className="text-lg font-medium text-foreground mb-2">
                {isRTL ? 'לא נמצאו תוצאות' : 'No matching applications'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {isRTL ? 'נסה לשנות את הסינון' : 'Try adjusting your filters'}
              </p>
            </CardContent>
          </Card>
        )
      ) : (
        <div className="space-y-3">
          {filteredApplications.map((application) => (
            <VerticalApplicationCard
              key={application.id}
              application={{
                ...application,
                job: application.job ? {
                  ...application.job,
                  company: application.job.company || null
                } : {
                  id: '',
                  title: application.job_title
                    || (application.job_url ? (isRTL ? 'משרה חיצונית' : 'External Job') : (isRTL ? 'משרה לא ידועה' : 'Unknown Job')),
                  location: null,
                  job_type: null,
                  salary_range: null,
                  description: null,
                  requirements: null,
                  source_url: application.job_url || null,
                  company_name: application.job_company || null,
                  company: null,
                },
                hasUpcomingInterview: application.current_stage === 'interview',
              }}
              onViewDetails={() => handleViewDetails(application)}
              onWithdraw={() => handleWithdraw(application.id)}
              onStageChange={(stage) => handleStageChange(application.id, stage)}
              onDelete={() => handleDelete(application.id)}
            />
          ))}
        </div>
      )}

      {/* Job Analyses from Extension */}
      {user && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-semibold">
              {isRTL ? 'ניתוחי משרות מהתוסף' : 'Job Analyses from Extension'}
            </h3>
          </div>
          <AnalysisHistory userId={user.id} language={language} />
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-muted-foreground" />
              <h4 className="font-medium text-muted-foreground text-sm">
                {isRTL ? 'משרות שנצפו בתוסף' : 'Browsed via Extension'}
              </h4>
            </div>
            <ExtensionJobHistory />
          </div>
        </div>
      )}

      {/* Saved Jobs Section */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Bookmark className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">
            {isRTL ? 'משרות שמורות' : 'Saved Jobs'}
          </h3>
          {savedJobs.length > 0 && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {savedJobs.length}
            </span>
          )}
        </div>
        {savedJobs.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="p-6 text-center">
              <Heart className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-sm text-muted-foreground">
                {isRTL ? 'לא שמרת משרות עדיין. לחץ על לב ליד משרה כדי לשמור אותה.' : 'No saved jobs yet. Click the heart on a job to save it.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {savedJobs.map((job: any) => {
              const company = Array.isArray(job.company) ? job.company[0] : job.company;
              return (
                <Card key={job.id} className="bg-card border-border hover:border-primary/40 transition-colors">
                  <CardContent className="p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {company?.logo_url ? (
                          <img src={company.logo_url} alt="" className="w-6 h-6 object-contain rounded" />
                        ) : (
                          <Building2 className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{job.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{company?.name || (isRTL ? 'חברה לא ידועה' : 'Unknown Company')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {job.source_url && (
                        <a href={job.source_url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
                            <ExternalLink className="w-3 h-3" />
                            {isRTL ? 'למשרה' : 'View'}
                          </Button>
                        </a>
                      )}
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => window.dispatchEvent(new CustomEvent('plug:navigate', { detail: 'job-search' }))}
                      >
                        {isRTL ? 'הגש' : 'Apply'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Interview Flow Dialog */}
      {interviewFlowApp && user && (
        <InterviewFlowDialog
          open={!!interviewFlowApp}
          onClose={() => setInterviewFlowApp(null)}
          application={{
            id: interviewFlowApp.id,
            job: {
              title: interviewFlowApp.job?.title || '',
              company: interviewFlowApp.job?.company
                ? { name: interviewFlowApp.job.company.name }
                : null,
            },
          }}
          userId={user.id}
          stage={interviewFlowStage}
        />
      )}

      {/* Application Details Sheet */}
      <ApplicationDetailsSheet
        application={selectedApplication}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onUpdate={fetchApplications}
      />

      {/* Plug Chat scroll target */}
      <div id="applications-plug-chat" />
      
      {/* Bulk Import Dialog */}
      <BulkImportDialog
        open={showBulkImport}
        onOpenChange={setShowBulkImport}
        onComplete={fetchApplications}
      />

      {/* Company Vouch Toast (notification) */}
      <CompanyVouchToast
        visible={!!pendingPrompt && !showVouchModal}
        companyName={pendingPrompt?.companyName || ''}
        reward={pendingPrompt?.triggerType === 'completion' ? 50 : 10}
        onAccept={() => setShowVouchModal(true)}
        onDismiss={clearPrompt}
      />

      {/* Company Vouch Modal - Direct from stage change */}
      {directVouchPrompt && (
        <CompanyVouchModal
          open={showVouchModal}
          onOpenChange={(open) => {
            setShowVouchModal(open);
            if (!open) setDirectVouchPrompt(null);
          }}
          applicationId={directVouchPrompt.applicationId}
          companyId={directVouchPrompt.companyId}
          companyName={directVouchPrompt.companyName}
          triggerType={directVouchPrompt.triggerType}
          triggerStage={directVouchPrompt.triggerStage}
          onComplete={() => {
            setDirectVouchPrompt(null);
            setShowVouchModal(false);
            fetchApplications();
          }}
        />
      )}

      {/* Company Vouch Modal - From time-based prompts */}
      {pendingPrompt && !directVouchPrompt && (
        <CompanyVouchModal
          open={showVouchModal && !directVouchPrompt}
          onOpenChange={(open) => {
            setShowVouchModal(open);
            if (!open) clearPrompt();
          }}
          applicationId={pendingPrompt.applicationId}
          companyId={pendingPrompt.companyId}
          companyName={pendingPrompt.companyName}
          triggerType={pendingPrompt.triggerType}
          triggerStage={pendingPrompt.triggerStage}
          onComplete={() => {
            clearPrompt();
            fetchApplications();
          }}
        />
      )}
    </div>
  );
}
