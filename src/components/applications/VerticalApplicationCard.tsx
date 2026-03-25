import { formatDistanceToNow, differenceInMonths } from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import { MapPin, Briefcase, Clock, Building2, Trash2, AlertTriangle, ExternalLink, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import MatchScoreCircle from './MatchScoreCircle';
import SwipeableCard from './SwipeableCard';
import { useIsMobile } from '@/hooks/use-mobile';
import { CompanyRatingBadge } from '@/components/vouch/CompanyRatingBadge';

export interface Application {
  id: string;
  status: string;
  current_stage: string;
  match_score: number | null;
  created_at: string;
  notes: string | null;
  source?: string | null;
  job_url?: string | null;
  job_title?: string | null;
  job_company?: string | null;
  job: {
    id: string;
    title: string;
    location: string | null;
    job_type: string | null;
    source_url?: string | null;
    company_name?: string | null;
    company: {
      id?: string;
      name: string;
      logo_url: string | null;
    } | null;
  } | null;
  hasUpcomingInterview?: boolean;
  interviewDate?: Date;
}

interface VerticalApplicationCardProps {
  application: Application;
  onViewDetails: () => void;
  onWithdraw: () => void;
  onStageChange?: (stage: string) => void;
  onDelete?: () => void;
}

const stageConfig: Record<string, { label: { en: string; he: string }; color: string }> = {
  applied: { 
    label: { en: 'Applied', he: 'הוגש' }, 
    color: 'bg-secondary text-secondary-foreground' 
  },
  screening: { 
    label: { en: 'Screening', he: 'סינון' }, 
    color: 'bg-blue-500/20 text-blue-400' 
  },
  interview: { 
    label: { en: 'Interview', he: 'ראיון' }, 
    color: 'bg-accent/20 text-accent' 
  },
  offer: { 
    label: { en: 'Offer', he: 'הצעה' }, 
    color: 'bg-primary/20 text-primary' 
  },
  rejected: { 
    label: { en: 'Rejected', he: 'נדחה' }, 
    color: 'bg-destructive/20 text-destructive' 
  },
  withdrawn: { 
    label: { en: 'Withdrawn', he: 'נמשך' }, 
    color: 'bg-muted text-muted-foreground' 
  },
};

const VerticalApplicationCard = ({
  application,
  onViewDetails,
  onWithdraw,
  onStageChange,
  onDelete,
}: VerticalApplicationCardProps) => {
  const { language } = useLanguage();
  const isMobile = useIsMobile();
  const isRTL = language === 'he';

  const stage = stageConfig[application.current_stage] || stageConfig.applied;
  const timeAgo = formatDistanceToNow(new Date(application.created_at), {
    addSuffix: true,
    locale: isRTL ? he : enUS,
  });

  // Derived values — fall back to direct columns when job record is null (extension apps)
  const jobTitle = application.job?.title || application.job_title || (isRTL ? 'משרה חיצונית' : 'External Job');
  const rawCompany = application.job?.company?.name || application.job?.company_name || application.job_company;
  const companyName = rawCompany === 'hr_recruiter'
    ? (isRTL ? 'חברת HR' : 'HR Recruiter')
    : (rawCompany || (isRTL ? 'חברה חסויה' : 'Confidential'));
  const jobSourceUrl = application.job?.source_url || application.job_url;

  // Check if interview is upcoming (today or tomorrow)
  const isUrgent = application.hasUpcomingInterview || application.current_stage === 'interview';

  // Check if application is older than 3 months
  const monthsOld = differenceInMonths(new Date(), new Date(application.created_at));
  const isOlderThan3Months = monthsOld >= 3;

  const cardContent = (
    <Card 
      className={`overflow-hidden transition-all cursor-pointer hover:border-primary/30 ${
        isUrgent ? 'plug-urgent-glow' : ''
      }`}
      onClick={!isMobile ? onViewDetails : undefined}
    >
      <CardContent className="p-4">
        <div className="flex gap-4" dir={isRTL ? 'rtl' : 'ltr'}>
          {/* Company Logo / Match Score */}
          <div className="flex-shrink-0">
            {application.match_score ? (
              <MatchScoreCircle score={application.match_score} size="md" />
            ) : (
              <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center">
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Job Info */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Title & Company */}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground truncate flex-1">
                  {jobTitle}
                </h3>
                {jobSourceUrl && (
                  <a
                    href={jobSourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
                    title={isRTL ? 'צפה במשרה המקורית' : 'View original job'}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-primary font-medium">
                  {companyName}
                </span>
                {application.job?.company?.id && (
                  <CompanyRatingBadge
                    companyId={application.job.company.id}
                    companyName={application.job.company.name}
                  />
                )}
              </div>
            </div>

            {/* Meta info */}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {application.job?.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {application.job.location}
                </span>
              )}
              {application.job?.job_type && (
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  {application.job.job_type}
                </span>
              )}
            </div>

            {/* Stage & Time */}
            <div className="flex items-center justify-between">
              {onStageChange ? (
                <Select
                  value={application.current_stage}
                  onValueChange={(value) => onStageChange(value)}
                >
                  <SelectTrigger 
                    className="w-auto h-7 gap-1 px-2 border-none bg-transparent hover:bg-muted"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <SelectValue>
                      <Badge variant="secondary" className={stage.color}>
                        {isRTL ? stage.label.he : stage.label.en}
                      </Badge>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent onClick={(e) => e.stopPropagation()}>
                    {Object.entries(stageConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <span className={`px-2 py-0.5 rounded text-xs ${config.color}`}>
                          {isRTL ? config.label.he : config.label.en}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="secondary" className={stage.color}>
                  {isRTL ? stage.label.he : stage.label.en}
                </Badge>
              )}
              <div className="flex items-center gap-2">
                {application.source === 'extension' && (
                  <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px] gap-0.5 px-1.5 py-0">
                    <Zap className="w-2.5 h-2.5" />
                    {isRTL ? 'תוסף' : 'Extension'}
                  </Badge>
                )}
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {timeAgo}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes preview */}
        {application.notes && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground line-clamp-1" dir={isRTL ? 'rtl' : 'ltr'}>
              📝 {application.notes}
            </p>
          </div>
        )}

        {/* 3-month warning banner */}
        {isOlderThan3Months && (
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs">
                {isRTL ? 'עברו 3 חודשים - מומלץ לעדכן או למחוק' : '3+ months old - consider updating or removing'}
              </span>
            </div>
            {onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {isRTL ? 'מחיקת מועמדות' : 'Delete Application'}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {isRTL 
                        ? `האם אתה בטוח שברצונך למחוק את המועמדות ל-${jobTitle}? פעולה זו לא ניתנת לביטול.`
                        : `Are you sure you want to delete your application for ${jobTitle}? This action cannot be undone.`}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{isRTL ? 'ביטול' : 'Cancel'}</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={onDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isRTL ? 'מחק' : 'Delete'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}

        {/* Delete button for all cards (not just old ones) */}
        {!isOlderThan3Months && onDelete && (
          <div className="mt-3 pt-3 border-t border-border flex justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Trash2 className="w-3.5 h-3.5 me-1" />
                  <span className="text-xs">{isRTL ? 'מחק' : 'Delete'}</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {isRTL ? 'מחיקת מועמדות' : 'Delete Application'}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {isRTL 
                      ? `האם אתה בטוח שברצונך למחוק את המועמדות ל-${jobTitle}?`
                      : `Are you sure you want to delete your application for ${jobTitle}?`}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{isRTL ? 'ביטול' : 'Cancel'}</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={onDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isRTL ? 'מחק' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // On mobile, wrap with swipeable
  if (isMobile) {
    return (
      <SwipeableCard
        onSwipeRight={onViewDetails}
        onSwipeLeft={onWithdraw}
        rightLabel={isRTL ? 'צפייה' : 'View'}
        leftLabel={isRTL ? 'משיכה' : 'Withdraw'}
      >
        {cardContent}
      </SwipeableCard>
    );
  }

  return cardContent;
};

export default VerticalApplicationCard;
