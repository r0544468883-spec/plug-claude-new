import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, Clock, DollarSign, Building2, Briefcase, ExternalLink, Share2, Heart, CheckCircle2, Layers } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import { toast } from 'sonner';
import { EditJobFieldForm } from './EditJobFieldForm';
import { formatSalaryRange, getILSFootnote } from '@/lib/salary-utils';
import { CompanyReviews } from '@/components/reviews/CompanyReviews';
import { SkillGapAnalysis } from '@/components/skills/SkillGapAnalysis';


interface Job {
  id: string;
  title: string;
  description: string | null;
  requirements: string | null;
  location: string | null;
  job_type: string | null;
  salary_range: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string | null;
  salary_period?: string | null;
  hybrid_office_days?: number | null;
  source_url: string | null;
  created_at: string;
  field_id?: string | null;
  role_id?: string | null;
  shared_by_user_id?: string | null;
  created_by?: string | null;
  company?: {
    id: string;
    name: string;
    logo_url: string | null;
    description: string | null;
    website: string | null;
  } | null;
  company_name?: string | null;
}

interface JobDetailsSheetProps {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (job: Job) => void;
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

export function JobDetailsSheet({ job, open, onOpenChange, onApply, onRefresh, isApplied }: JobDetailsSheetProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isHebrew = language === 'he';
  const [showEditField, setShowEditField] = useState(false);

  if (!job) return null;
  
  // Check if current user is the job poster
  const isJobPoster = user && (job.shared_by_user_id === user.id || job.created_by === user.id);

  const timeAgo = formatDistanceToNow(new Date(job.created_at), {
    addSuffix: true,
    locale: isHebrew ? he : enUS,
  });

  const jobTypeLabel = job.job_type && jobTypeLabels[job.job_type]
    ? (isHebrew ? jobTypeLabels[job.job_type].he : jobTypeLabels[job.job_type].en)
    : job.job_type;

  // Structured salary
  const structuredSalary = formatSalaryRange(
    job.salary_min ?? null, job.salary_max ?? null,
    job.salary_currency ?? null, job.salary_period ?? null
  );
  const salaryDisplay = structuredSalary || job.salary_range;
  const ilsFootnote = isHebrew ? getILSFootnote(job.salary_min ?? null, job.salary_max ?? null, job.salary_currency ?? null, job.salary_period ?? null) : null;

  // Hybrid
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={isHebrew ? 'left' : 'right'} className="w-full sm:max-w-lg p-0">
        <ScrollArea className="h-full">
          <div className="p-6" dir={isHebrew ? 'rtl' : 'ltr'}>
            <SheetHeader className="text-start mb-6">
              <div className="flex items-start gap-4">
                <Avatar className="w-16 h-16 rounded-xl flex-shrink-0">
                  <AvatarImage src={job.company?.logo_url || undefined} />
                  <AvatarFallback className="rounded-xl bg-primary/10 text-primary">
                    <Building2 className="w-8 h-8" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-xl mb-1">{job.title}</SheetTitle>
                  <p className="text-muted-foreground">
                    {job.company?.name || job.company_name || (isHebrew ? 'חברה לא ידועה' : 'Unknown Company')}
                  </p>
                </div>
              </div>
            </SheetHeader>

            {/* Quick Info */}
            <div className="flex flex-wrap gap-2 mb-6">
              {job.location && (
                <Badge variant="secondary" className="gap-1">
                  <MapPin className="w-3 h-3" />
                  {job.location}
                </Badge>
              )}
              {hybridLabel ? (
                <Badge variant="secondary" className="gap-1">
                  <Building2 className="w-3 h-3" />
                  {hybridLabel}
                </Badge>
              ) : jobTypeLabel ? (
                <Badge variant="secondary" className="gap-1">
                  <Briefcase className="w-3 h-3" />
                  {jobTypeLabel}
                </Badge>
              ) : null}
              {salaryDisplay && (
                <Badge variant="secondary" className="gap-1">
                  <DollarSign className="w-3 h-3" />
                  {salaryDisplay}
                </Badge>
              )}
              {ilsFootnote && (
                <p className="w-full text-xs text-muted-foreground">* {ilsFootnote}</p>
              )}
              <Badge variant="outline" className="gap-1">
                <Clock className="w-3 h-3" />
                {timeAgo}
              </Badge>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mb-6">
              {isApplied ? (
                <Button className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white" disabled>
                  <CheckCircle2 className="w-4 h-4" />
                  {isHebrew ? 'הוגש ✓' : 'Applied ✓'}
                </Button>
              ) : (
                <Button className="flex-1 gap-2" onClick={() => onApply(job)}>
                  <CheckCircle2 className="w-4 h-4" />
                  {isHebrew ? 'הגש מועמדות' : 'Apply Now'}
                </Button>
              )}
              <Button variant="outline" size="icon" onClick={handleShare}>
                <Share2 className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Heart className="w-4 h-4" />
              </Button>
            </div>

            {/* Edit Field Button - Only for job poster */}
            {isJobPoster && (
              <div className="mb-6">
                <Button 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={() => setShowEditField(true)}
                >
                  <Layers className="w-4 h-4" />
                  {isHebrew ? 'ערוך תחום משרה' : 'Edit Job Field'}
                </Button>
              </div>
            )}

            <Separator className="my-6" />

            {/* Description */}
            {job.description && (
              <div className="mb-6">
                <h3 className="font-semibold mb-3">
                  {isHebrew ? 'תיאור המשרה' : 'Job Description'}
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {job.description}
                </p>
              </div>
            )}

            {/* Requirements */}
            {job.requirements && (
              <div className="mb-6">
                <h3 className="font-semibold mb-3">
                  {isHebrew ? 'דרישות' : 'Requirements'}
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {job.requirements}
                </p>
              </div>
            )}

            <Separator className="my-6" />

            {/* Company Info */}
            {job.company && (
              <div>
                <h3 className="font-semibold mb-3">
                  {isHebrew ? 'על החברה' : 'About the Company'}
                </h3>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="w-10 h-10 rounded-lg">
                      <AvatarImage src={job.company.logo_url || undefined} />
                      <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                        <Building2 className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{job.company.name}</p>
                      {job.company.website && (
                        <a 
                          href={job.company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          {isHebrew ? 'לאתר החברה' : 'Visit website'}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                  {job.company.description && (
                    <p className="text-sm text-muted-foreground">
                      {job.company.description}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Source URL */}
            {job.source_url && (
              <div className="mt-6">
                <a
                  href={job.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-4 h-4" />
                  {isHebrew ? 'צפה במקור המשרה' : 'View original posting'}
                </a>
              </div>
            )}

            {/* Skill Gap Analysis - for logged-in job seekers */}
            {user && (job.requirements || job.description) && (
              <>
                <Separator className="my-6" />
                <div>
                  <h3 className="font-semibold mb-3">
                    {isHebrew ? 'מה חסר לך?' : 'Your Skill Gap'}
                  </h3>
                  <SkillGapAnalysis
                    jobTitle={job.title}
                    jobRequirements={job.requirements}
                    jobDescription={job.description}
                  />
                </div>
              </>
            )}

            {/* Company Reviews */}
            {job.company?.name && (
              <>
                <Separator className="my-6" />
                <CompanyReviews companyName={job.company.name} />
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>

      {/* Edit Job Field Dialog */}
      <EditJobFieldForm
        open={showEditField}
        onOpenChange={setShowEditField}
        jobId={job.id}
        currentFieldId={job.field_id || null}
        currentRoleId={job.role_id || null}
        onSuccess={() => {
          onRefresh?.();
        }}
      />
    </Sheet>
  );
}
