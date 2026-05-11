import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Layers, Briefcase, ChevronRight, Eye } from 'lucide-react';
import { JOB_FIELDS } from '@/lib/job-taxonomy';
import { cn } from '@/lib/utils';

interface CandidateHierarchyWidgetProps {
  onNavigateToCandidates: () => void;
}

type ViewMode = 'individual' | 'by-field' | 'by-job';

interface CandidateRow {
  id: string;
  candidate_id: string;
  current_stage: string;
  job_id: string;
  job_title: string;
  full_name: string;
  avatar_url: string | null;
  preferred_fields: string[] | null;
}

const STAGE_COLORS: Record<string, string> = {
  applied: 'bg-blue-500/15 text-blue-400',
  screening: 'bg-amber-500/15 text-amber-400',
  interview: 'bg-violet-500/15 text-violet-400',
  offer: 'bg-emerald-500/15 text-emerald-400',
  hired: 'bg-primary/15 text-primary',
  rejected: 'bg-red-500/15 text-red-400',
};

export function CandidateHierarchyWidget({ onNavigateToCandidates }: CandidateHierarchyWidgetProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [viewMode, setViewMode] = useState<ViewMode>('individual');

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ['hr-hierarchy-widget', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: myJobs } = await supabase
        .from('jobs')
        .select('id, title')
        .or(`created_by.eq.${user.id},shared_by_user_id.eq.${user.id}`);
      if (!myJobs || myJobs.length === 0) return [];
      const jobIds = myJobs.map(j => j.id);
      const { data: apps } = await supabase
        .from('applications')
        .select('id, candidate_id, current_stage, job_id')
        .in('job_id', jobIds)
        .order('created_at', { ascending: false })
        .limit(100);
      if (!apps || apps.length === 0) return [];

      const candidateIds = [...new Set(apps.map(a => a.candidate_id))];
      const { data: profiles } = await supabase
        .from('profiles_secure')
        .select('user_id, full_name, avatar_url, preferred_fields')
        .in('user_id', candidateIds);

      const jobMap = Object.fromEntries(myJobs.map(j => [j.id, j.title]));
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));

      return apps.map(a => ({
        id: a.id,
        candidate_id: a.candidate_id,
        current_stage: a.current_stage,
        job_id: a.job_id,
        job_title: jobMap[a.job_id] || '',
        full_name: profileMap[a.candidate_id]?.full_name || '',
        avatar_url: profileMap[a.candidate_id]?.avatar_url || null,
        preferred_fields: profileMap[a.candidate_id]?.preferred_fields || null,
      })) as CandidateRow[];
    },
    enabled: !!user?.id,
  });

  // Grouped data
  const { byField, byJob } = useMemo(() => {
    const fieldGroups: Record<string, CandidateRow[]> = {};
    const jobGroups: Record<string, { title: string; candidates: CandidateRow[] }> = {};

    candidates.forEach(c => {
      // By job
      if (!jobGroups[c.job_id]) jobGroups[c.job_id] = { title: c.job_title, candidates: [] };
      jobGroups[c.job_id].candidates.push(c);

      // By field
      const fields = c.preferred_fields;
      if (fields && fields.length > 0) {
        fields.forEach(f => {
          if (!fieldGroups[f]) fieldGroups[f] = [];
          fieldGroups[f].push(c);
        });
      } else {
        if (!fieldGroups['_none']) fieldGroups['_none'] = [];
        fieldGroups['_none'].push(c);
      }
    });

    return {
      byField: Object.entries(fieldGroups).sort((a, b) => b[1].length - a[1].length),
      byJob: Object.values(jobGroups).sort((a, b) => b.candidates.length - a.candidates.length),
    };
  }, [candidates]);

  if (isLoading) {
    return <Skeleton className="h-48 rounded-xl" />;
  }

  if (candidates.length === 0) return null;

  const viewModes: { key: ViewMode; icon: typeof Users; labelHe: string; labelEn: string; descHe: string; descEn: string }[] = [
    { key: 'individual', icon: Users, labelHe: 'מועמדים', labelEn: 'Candidates', descHe: 'כל המועמדים', descEn: 'All candidates' },
    { key: 'by-field', icon: Layers, labelHe: 'לפי תחום', labelEn: 'By Field', descHe: 'מקובצים לפי תחום מקצועי', descEn: 'Grouped by professional field' },
    { key: 'by-job', icon: Briefcase, labelHe: 'לפי משרה', labelEn: 'By Job', descHe: 'מקובצים לפי המשרה', descEn: 'Grouped by job posting' },
  ];

  const renderMiniAvatarStack = (items: CandidateRow[], max = 5) => (
    <div className="flex -space-x-2 rtl:space-x-reverse">
      {items.slice(0, max).map((c, i) => (
        <Avatar key={c.id} className="w-7 h-7 border-2 border-background">
          <AvatarImage src={c.avatar_url || undefined} />
          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
            {c.full_name?.charAt(0)?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
      ))}
      {items.length > max && (
        <div className="w-7 h-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-medium text-muted-foreground">
          +{items.length - max}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header with view mode tabs */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" />
          {isHebrew ? 'מועמדים — מבט רחב' : 'Candidates — Overview'}
        </h3>
        <Button variant="link" size="sm" className="text-xs px-0 text-muted-foreground h-auto gap-0.5" onClick={onNavigateToCandidates}>
          {isHebrew ? 'צפה בהכל' : 'View all'}
          <ChevronRight className="w-3 h-3" />
        </Button>
      </div>

      {/* Horizontal view mode cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {viewModes.map(({ key, icon: Icon, labelHe, labelEn, descHe, descEn }) => {
          const isActive = viewMode === key;
          return (
            <button
              key={key}
              onClick={() => setViewMode(key)}
              className={cn(
                'p-4 rounded-xl border text-start transition-all',
                isActive
                  ? 'border-primary/40 bg-primary/5 shadow-sm'
                  : 'border-border bg-card hover:border-primary/20 hover:bg-muted/50'
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                  'p-1.5 rounded-lg',
                  isActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={cn('text-sm font-semibold', isActive ? 'text-primary' : 'text-foreground')}>
                  {isHebrew ? labelHe : labelEn}
                </span>
                <Badge variant="secondary" className="text-[10px] ms-auto">
                  {key === 'individual' ? candidates.length :
                   key === 'by-field' ? byField.length :
                   byJob.length}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {isHebrew ? descHe : descEn}
              </p>
            </button>
          );
        })}
      </div>

      {/* Content based on selected view */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {viewMode === 'individual' && candidates.slice(0, 6).map(c => (
          <Card key={c.id} className="bg-card border-border">
            <CardContent className="p-3 flex items-center gap-3">
              <Avatar className="w-9 h-9">
                <AvatarImage src={c.avatar_url || undefined} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">{c.full_name?.charAt(0)?.toUpperCase() || '?'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.full_name || (isHebrew ? 'ללא שם' : 'No name')}</p>
                <p className="text-xs text-muted-foreground truncate">{c.job_title}</p>
              </div>
              <Badge className={cn('text-[10px] shrink-0', STAGE_COLORS[c.current_stage] || 'bg-muted text-muted-foreground')}>
                {c.current_stage}
              </Badge>
            </CardContent>
          </Card>
        ))}

        {viewMode === 'by-field' && byField.slice(0, 6).map(([slug, items]) => {
          const field = JOB_FIELDS.find(f => f.slug === slug);
          const label = slug === '_none'
            ? (isHebrew ? 'לא צוין תחום' : 'No field')
            : field ? (isHebrew ? field.name_he : field.name_en) : slug;
          return (
            <Card key={slug} className="bg-card border-border">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">{label}</Badge>
                  <span className="text-xs text-muted-foreground font-medium">{items.length}</span>
                </div>
                {renderMiniAvatarStack(items)}
              </CardContent>
            </Card>
          );
        })}

        {viewMode === 'by-job' && byJob.slice(0, 6).map(({ title, candidates: jobCandidates }) => (
          <Card key={title} className="bg-card border-border">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium truncate flex-1">{title}</p>
                <span className="text-xs text-muted-foreground font-medium shrink-0 ms-2">{jobCandidates.length}</span>
              </div>
              {renderMiniAvatarStack(jobCandidates)}
            </CardContent>
          </Card>
        ))}
      </div>

      {candidates.length > 6 && (
        <div className="text-center">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1" onClick={onNavigateToCandidates}>
            {isHebrew ? `+ ${candidates.length - 6} מועמדים נוספים` : `+ ${candidates.length - 6} more candidates`}
            <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
