import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { MapPin, Clock, DollarSign, Building2, Briefcase, ExternalLink, Share2, Heart, CheckCircle2, Layers, X, CheckCheck, Sparkles, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import { toast } from 'sonner';
import { EditJobFieldForm } from './EditJobFieldForm';
import { formatSalaryRange, getILSFootnote } from '@/lib/salary-utils';
import { CompanyReviews } from '@/components/reviews/CompanyReviews';
import { SkillGapAnalysis } from '@/components/skills/SkillGapAnalysis';
import { useSavedJobs, useSaveJobMutation } from '@/hooks/useSavedJobs';

interface JobDetailsPanelProps {
  job: any;
  onApply: (job: any) => void;
  onDismiss?: (job: any) => void;
  onMarkApplied?: (job: any) => void;
  onRefresh?: () => void;
  isApplied?: boolean;
}

const jobTypeLabels: Record<string, { en: string; he: string }> = {
  'full-time': { en: 'Full-time', he: 'משרה מלאה' },
  'part-time': { en: 'Part-time', he: 'משרה חלקית' },
  'hybrid': { en: 'Hybrid', he: 'היברידי' },
  'contract': { en: 'Contract', he: 'חוזה' },
  'freelance': { en: 'Freelance', he: 'פרילנס' },
  'internship': { en: 'Internship', he: 'התמחות' },
};

export function JobDetailsPanel({ job, onApply, onDismiss, onMarkApplied, onRefresh, isApplied }: JobDetailsPanelProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isHebrew = language === 'he';
  const [showEditField, setShowEditField] = useState(false);
  const [scrapedDescription, setScrapedDescription] = useState<string | null>(null);
  const [scrapedRequirements, setScrapedRequirements] = useState<string | null>(null);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeAttempted, setScrapeAttempted] = useState<string | null>(null);

  const { data: savedJobIds = [] } = useSavedJobs();
  const saveJobMutation = useSaveJobMutation();
  const isSaved = savedJobIds.includes(job.id);

  // Auto-fetch description for jobs that don't have one but have a source_url
  useEffect(() => {
    if (job.description || !job.source_url || isScraping || scrapeAttempted === job.id) return;

    const fetchDescription = async () => {
      setIsScraping(true);
      setScrapedDescription(null);
      setScrapedRequirements(null);
      try {
        const { data, error } = await supabase.functions.invoke('scrape-job', {
          body: { url: job.source_url },
        });
        if (!error && data?.success && data?.job) {
          const desc = data.job.description || null;
          const reqs = data.job.requirements || null;
          setScrapedDescription(desc);
          setScrapedRequirements(reqs);

          // Save back to DB so we don't scrape again next time
          if (desc || reqs) {
            await supabase.from('jobs').update({
              ...(desc ? { description: desc } : {}),
              ...(reqs ? { requirements: reqs } : {}),
            }).eq('id', job.id) as any;
          }
        }
      } catch (e) {
        console.error('[JobDetailsPanel] scrape error:', e);
      } finally {
        setIsScraping(false);
        setScrapeAttempted(job.id);
      }
    };

    fetchDescription();
  }, [job.id, job.description, job.source_url]);

  // Reset scraped data when job changes
  useEffect(() => {
    if (scrapeAttempted !== job.id) {
      setScrapedDescription(null);
      setScrapedRequirements(null);
    }
  }, [job.id]);

  const displayDescription = job.description || scrapedDescription;
  const displayRequirements = job.requirements || scrapedRequirements;

  const isJobPoster = user && (job.shared_by_user_id === user.id || job.created_by === user.id);

  const timeAgo = formatDistanceToNow(new Date(job.created_at), {
    addSuffix: true,
    locale: isHebrew ? he : enUS,
  });

  const jobTypeLabel = job.job_type && jobTypeLabels[job.job_type]
    ? (isHebrew ? jobTypeLabels[job.job_type].he : jobTypeLabels[job.job_type].en)
    : job.job_type;

  const structuredSalary = formatSalaryRange(
    job.salary_min ?? null, job.salary_max ?? null,
    job.salary_currency ?? null, job.salary_period ?? null
  );
  const salaryDisplay = structuredSalary || job.salary_range;
  const ilsFootnote = isHebrew ? getILSFootnote(job.salary_min ?? null, job.salary_max ?? null, job.salary_currency ?? null, job.salary_period ?? null) : null;

  const hybridLabel = job.job_type === 'hybrid' && job.hybrid_office_days
    ? (isHebrew ? `היברידי (${job.hybrid_office_days} ימים מהמשרד)` : `Hybrid (${job.hybrid_office_days} days in office)`)
    : null;

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/job/${job.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(isHebrew ? 'הקישור הועתק!' : 'Link copied!');
    } catch {
      toast.error(isHebrew ? 'שגיאה בהעתקה' : 'Failed to copy');
    }
  };

  const handleSave = () => {
    if (!user) return;
    saveJobMutation.mutate({ jobId: job.id, isSaved });
  };

  const companyName = job.company?.name || job.company_name || (isHebrew ? 'חברה לא ידועה' : 'Unknown Company');

  return (
    <div className="p-6" dir={isHebrew ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <Avatar className="w-14 h-14 rounded-xl flex-shrink-0">
          <AvatarImage src={job.company?.logo_url || undefined} />
          <AvatarFallback className="rounded-xl bg-primary/10 text-primary">
            <Building2 className="w-7 h-7" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-foreground">{job.title}</h2>
          <p className="text-muted-foreground">{companyName}</p>
        </div>
      </div>

      {/* Quick Info Badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        {job.location && (
          <Badge variant="secondary" className="gap-1"><MapPin className="w-3 h-3" />{job.location}</Badge>
        )}
        {hybridLabel ? (
          <Badge variant="secondary" className="gap-1"><Building2 className="w-3 h-3" />{hybridLabel}</Badge>
        ) : jobTypeLabel ? (
          <Badge variant="secondary" className="gap-1"><Briefcase className="w-3 h-3" />{jobTypeLabel}</Badge>
        ) : null}
        {salaryDisplay && (
          <Badge variant="secondary" className="gap-1"><DollarSign className="w-3 h-3" />{salaryDisplay}</Badge>
        )}
        {ilsFootnote && <p className="w-full text-xs text-muted-foreground">* {ilsFootnote}</p>}
        <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" />{timeAgo}</Badge>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mb-4">
        {isApplied ? (
          <Button className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white" disabled>
            <CheckCircle2 className="w-4 h-4" />
            {isHebrew ? 'הוגש ✓' : 'Applied ✓'}
          </Button>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="flex-1 gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {isHebrew ? 'הגש מועמדות' : 'Apply Now'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {isHebrew ? `להגיש מועמדות ל-${job.title}?` : `Apply to ${job.title}?`}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {isHebrew
                    ? `ההגשה תירשם במערכת ודף המשרה ייפתח בטאב חדש ב-${companyName}.`
                    : `Your application will be recorded and the job posting will open in a new tab at ${companyName}.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{isHebrew ? 'ביטול' : 'Cancel'}</AlertDialogCancel>
                <AlertDialogAction onClick={() => onApply(job)}>
                  {isHebrew ? 'הגש מועמדות' : 'Apply'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        {onMarkApplied && !isApplied && (
          <Button variant="outline" size="icon" className="min-h-[44px] min-w-[44px]" title={isHebrew ? 'סמן כהוגש' : 'Mark as applied'} onClick={() => onMarkApplied(job)}>
            <CheckCheck className="w-4 h-4" />
          </Button>
        )}
        <Button variant="outline" size="icon" className="min-h-[44px] min-w-[44px]" onClick={handleShare}>
          <Share2 className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="icon" className={`min-h-[44px] min-w-[44px] ${isSaved ? 'text-red-500' : ''}`} onClick={handleSave}>
          <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
        </Button>
        {onDismiss && (
          <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px] text-muted-foreground hover:text-destructive" title={isHebrew ? 'הסתר משרה' : 'Hide job'} onClick={() => onDismiss(job)}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Edit Field - job poster only */}
      {isJobPoster && (
        <Button variant="outline" className="w-full gap-2 mb-4" onClick={() => setShowEditField(true)}>
          <Layers className="w-4 h-4" />
          {isHebrew ? 'ערוך תחום משרה' : 'Edit Job Field'}
        </Button>
      )}

      <Separator className="my-4" />

      {/* Description */}
      {isScraping ? (
        <div className="mb-4 space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            {isHebrew ? 'טוען פרטי משרה מאתר המקור...' : 'Loading job details from source...'}
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ) : displayDescription ? (
        <div className="mb-4">
          <h3 className="font-semibold mb-2 text-sm">{isHebrew ? 'תיאור המשרה' : 'Job Description'}</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-line">{displayDescription}</p>
        </div>
      ) : (
        <div className="mb-4 p-4 rounded-lg bg-muted/30 border border-dashed border-border text-center">
          <p className="text-sm text-muted-foreground">
            {isHebrew ? 'תיאור המשרה לא זמין.' : 'Job description is not available.'}
          </p>
          {job.source_url && (
            <a href={job.source_url} target="_blank" rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center justify-center gap-1 mt-2">
              <ExternalLink className="w-3.5 h-3.5" />
              {isHebrew ? 'צפה במשרה המלאה באתר המקור' : 'View full posting on source site'}
            </a>
          )}
        </div>
      )}

      {/* Requirements */}
      {displayRequirements && (
        <div className="mb-4">
          <h3 className="font-semibold mb-2 text-sm">{isHebrew ? 'דרישות' : 'Requirements'}</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-line">{displayRequirements}</p>
        </div>
      )}

      <Separator className="my-4" />

      {/* Company Info — always show if we have a name */}
      {(job.company || job.company_name) && (
        <div className="mb-4">
          <h3 className="font-semibold mb-2 text-sm">{isHebrew ? 'על החברה' : 'About the Company'}</h3>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-3 mb-2">
              <Avatar className="w-8 h-8 rounded-lg">
                <AvatarImage src={job.company?.logo_url || undefined} />
                <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                  <Building2 className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{job.company?.name || job.company_name}</p>
                {job.company?.website && (
                  <a href={job.company.website} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1">
                    {isHebrew ? 'לאתר החברה' : 'Visit website'}<ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
            {job.company?.description && (
              <p className="text-xs text-muted-foreground">{job.company.description}</p>
            )}
          </div>
        </div>
      )}

      {/* Source URL */}
      {job.source_url && (
        <a href={job.source_url} target="_blank" rel="noopener noreferrer"
          className="text-sm text-primary hover:underline flex items-center gap-1 mb-4">
          <ExternalLink className="w-4 h-4" />
          {isHebrew ? 'צפה במקור המשרה' : 'View original posting'}
        </a>
      )}

      {/* Skill Gap Analysis */}
      {user && (displayRequirements || displayDescription) && (
        <>
          <Separator className="my-4" />
          <div className="mb-4">
            <h3 className="font-semibold mb-2 text-sm">{isHebrew ? 'מה חסר לך?' : 'Your Skill Gap'}</h3>
            <SkillGapAnalysis jobTitle={job.title} jobRequirements={displayRequirements} jobDescription={displayDescription} />
          </div>
        </>
      )}

      {/* Company Reviews */}
      {job.company?.name && (
        <>
          <Separator className="my-4" />
          <CompanyReviews companyName={job.company.name} />
        </>
      )}

      {/* Edit Job Field Dialog */}
      <EditJobFieldForm
        open={showEditField}
        onOpenChange={setShowEditField}
        jobId={job.id}
        currentFieldId={job.field_id || null}
        currentRoleId={job.role_id || null}
        onSuccess={() => onRefresh?.()}
      />
    </div>
  );
}

export function JobDetailsPanelEmpty() {
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <Sparkles className="w-12 h-12 text-muted-foreground/30 mb-4" />
      <h3 className="text-lg font-medium text-muted-foreground mb-1">
        {isHebrew ? 'בחר משרה מהרשימה' : 'Select a job from the list'}
      </h3>
      <p className="text-sm text-muted-foreground/60">
        {isHebrew ? 'לחץ על משרה כדי לצפות בפרטים המלאים' : 'Click on a job to view full details'}
      </p>
    </div>
  );
}
