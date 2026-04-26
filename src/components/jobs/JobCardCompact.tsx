import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, Clock, Building2, Users, Globe } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useMatchScore, useStoredMatchScores } from '@/hooks/useMatchScore';

interface JobCardCompactProps {
  job: any;
  isSelected: boolean;
  onClick: () => void;
  matchScore?: number | null;
}

export function JobCardCompact({ job, isSelected, onClick, matchScore: propMatchScore }: JobCardCompactProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const calculatedMatchScore = useMatchScore(job);
  const storedScores = useStoredMatchScores([job.id]);
  const displayMatchScore = propMatchScore ?? storedScores[job.id] ?? calculatedMatchScore;

  const timeAgo = formatDistanceToNow(new Date(job.created_at), {
    addSuffix: true,
    locale: isHebrew ? he : enUS,
  });

  const companyName = job.company?.name || job.company_name || (isHebrew ? 'חברה חסויה' : 'Confidential');

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-3 border-b border-border cursor-pointer transition-colors hover:bg-muted/50',
        isSelected && 'bg-primary/5 border-s-2 border-s-primary'
      )}
    >
      <div className="flex gap-3">
        <Avatar className="w-10 h-10 rounded-lg flex-shrink-0">
          <AvatarImage src={job.company?.logo_url || undefined} />
          <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs">
            <Building2 className="w-5 h-5" />
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-foreground line-clamp-1">
            {job.title || (isHebrew ? 'משרה ללא כותרת' : 'Untitled Position')}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-1">{companyName}</p>

          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {job.location && (
              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                <MapPin className="w-3 h-3" />{job.location}
              </span>
            )}
            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
              <Clock className="w-3 h-3" />{timeAgo}
            </span>
          </div>

          <div className="flex items-center gap-1.5 mt-1.5">
            {displayMatchScore > 0 && (
              <Badge className={cn(
                'text-[10px] px-1.5 py-0 h-4',
                displayMatchScore >= 85 ? 'bg-green-500 text-white' :
                displayMatchScore >= 60 ? 'bg-yellow-500 text-white' :
                'bg-muted text-muted-foreground'
              )}>
                {displayMatchScore}%
              </Badge>
            )}
            {job.is_community_shared && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/20 gap-0.5">
                <Users className="w-2.5 h-2.5" />
              </Badge>
            )}
            {job.external_source === 'alljobs' && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-orange-500/10 text-orange-600 border-orange-500/30">AllJobs</Badge>
            )}
            {job.external_source === 'linkedin' && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-blue-500/10 text-blue-600 border-blue-500/30">LinkedIn</Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
