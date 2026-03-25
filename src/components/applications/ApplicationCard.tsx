import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Briefcase, Zap, Eye, X, MessageSquare, Building2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDistanceToNow } from 'date-fns';
import { he, enUS } from 'date-fns/locale';

interface ApplicationCardProps {
  application: {
    id: string;
    status: string;
    current_stage: string;
    match_score: number | null;
    created_at: string;
    last_interaction: string;
    notes: string | null;
    job: {
      id: string;
      title: string;
      location: string | null;
      job_type: string | null;
      salary_range: string | null;
      company_name?: string | null;
      company: {
        id: string;
        name: string;
        logo_url: string | null;
      } | null;
    } | null;
  };
  onViewDetails?: (id: string) => void;
  onWithdraw?: (id: string) => void;
  onAddNote?: (id: string) => void;
}

const stageColors: Record<string, { bg: string; text: string }> = {
  applied: { bg: 'bg-muted', text: 'text-muted-foreground' },
  screening: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
  interview: { bg: 'bg-amber-500/10', text: 'text-amber-500' },
  technical: { bg: 'bg-purple-500/10', text: 'text-purple-500' },
  offer: { bg: 'bg-primary/10', text: 'text-primary' },
  accepted: { bg: 'bg-primary/20', text: 'text-primary' },
  rejected: { bg: 'bg-destructive/10', text: 'text-destructive' },
};

const stageLabels: Record<string, { en: string; he: string }> = {
  applied: { en: 'Applied', he: 'הוגש' },
  screening: { en: 'Screening', he: 'סינון' },
  interview: { en: 'Interview', he: 'ראיון' },
  technical: { en: 'Technical', he: 'טכני' },
  offer: { en: 'Offer', he: 'הצעה' },
  accepted: { en: 'Accepted', he: 'התקבל' },
  rejected: { en: 'Rejected', he: 'נדחה' },
};

export function ApplicationCard({ application, onViewDetails, onWithdraw, onAddNote }: ApplicationCardProps) {
  const { language, t } = useLanguage();
  const locale = language === 'he' ? he : enUS;

  const stage = application.current_stage || 'applied';
  const stageColor = stageColors[stage] || stageColors.applied;
  const stageLabel = stageLabels[stage]?.[language] || stage;

  const timeAgo = formatDistanceToNow(new Date(application.created_at), {
    addSuffix: true,
    locale,
  });

  return (
    <Card className="bg-card border-border plug-card-hover group">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Company Logo & Info */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
              {application.job?.company?.logo_url ? (
                <img
                  src={application.job.company.logo_url}
                  alt={application.job.company.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-6 h-6 text-muted-foreground" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-foreground truncate">
                {application.job?.title || t('applications.unknownJob') || 'Unknown Position'}
              </h3>
              <p className="text-sm text-muted-foreground truncate">
                {application.job?.company?.name || application.job?.company_name || t('applications.unknownCompany') || 'Unknown Company'}
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                {application.job?.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {application.job.location}
                  </span>
                )}
                {application.job?.job_type && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    {application.job.job_type}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {timeAgo}
                </span>
              </div>
            </div>
          </div>

          {/* Match Score */}
          {application.match_score && (
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20">
                <Zap className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium text-accent">{application.match_score}%</span>
              </div>
            </div>
          )}

          {/* Stage Badge */}
          <Badge className={`${stageColor.bg} ${stageColor.text} border-0 shrink-0`}>
            {stageLabel}
          </Badge>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => onViewDetails?.(application.id)}
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">{t('applications.view') || 'View'}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => onAddNote?.(application.id)}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">{t('applications.note') || 'Note'}</span>
            </Button>
            {application.status === 'active' && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => onWithdraw?.(application.id)}
              >
                <X className="w-4 h-4" />
                <span className="hidden sm:inline">{t('applications.withdraw') || 'Withdraw'}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Notes Preview */}
        {application.notes && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-sm text-muted-foreground line-clamp-1">
              <span className="font-medium text-foreground">{t('applications.myNote') || 'Note'}:</span>{' '}
              {application.notes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
