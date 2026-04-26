import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { STAGE_MAP } from './stageConfig';
import { Badge } from '@/components/ui/badge';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const KANBAN_COLUMNS = [
  { id: 'application', he: 'הגשה',    en: 'Applied',     targetStage: 'applied',         groups: ['application'], accent: 'border-t-indigo-400' },
  { id: 'screening',   he: 'סינון',   en: 'Screening',   targetStage: 'screening',        groups: ['screening'],   accent: 'border-t-blue-400' },
  { id: 'interview',   he: 'ראיונות', en: 'Interview',   targetStage: 'interview',        groups: ['interview'],   accent: 'border-t-purple-400' },
  { id: 'assignment',  he: 'מטלות',   en: 'Assignment',  targetStage: 'home_assignment',  groups: ['assignment'],  accent: 'border-t-orange-400' },
  { id: 'final',       he: 'הצעה',    en: 'Offer',       targetStage: 'offer',            groups: ['final'],       accent: 'border-t-emerald-400' },
  { id: 'terminal',    he: 'נדחה',    en: 'Rejected',    targetStage: 'rejected',         groups: ['terminal'],    accent: 'border-t-red-400' },
];

interface KanbanApplication {
  id: string;
  current_stage: string;
  match_score: number | null;
  job_title?: string | null;
  job_company?: string | null;
  job: {
    title: string;
    company: { name: string; logo_url: string | null } | null;
  } | null;
}

interface KanbanViewProps {
  applications: KanbanApplication[];
  onStageChange: (id: string, stage: string) => void;
  onViewDetails: (app: KanbanApplication) => void;
}

export function KanbanView({ applications, onStageChange, onViewDetails }: KanbanViewProps) {
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const getColApps = (groups: string[]) =>
    applications.filter(app => {
      const stage = STAGE_MAP[app.current_stage];
      return stage && groups.includes(stage.group);
    });

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(colId);
  };

  const handleDrop = (e: React.DragEvent, col: typeof KANBAN_COLUMNS[0]) => {
    e.preventDefault();
    if (draggedId) onStageChange(draggedId, col.targetStage);
    setDraggedId(null);
    setDragOverCol(null);
  };

  return (
    <div className="overflow-x-auto pb-2" dir="ltr">
      <div className="flex gap-3 min-w-[960px]">
        {KANBAN_COLUMNS.map(col => {
          const colApps = getColApps(col.groups);
          const isOver = dragOverCol === col.id;

          return (
            <div
              key={col.id}
              className={cn(
                'flex-1 min-w-[150px] rounded-lg border border-border bg-muted/30 flex flex-col border-t-2 transition-colors',
                col.accent,
                isOver && 'bg-primary/5 border-primary/30',
              )}
              onDragOver={e => handleDragOver(e, col.id)}
              onDrop={e => handleDrop(e, col)}
              onDragLeave={() => setDragOverCol(null)}
            >
              {/* Column header */}
              <div className="px-3 py-2 border-b border-border/50 flex items-center justify-between">
                <span className="text-xs font-semibold">{isRTL ? col.he : col.en}</span>
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal">
                  {colApps.length}
                </Badge>
              </div>

              {/* Cards */}
              <div className="p-2 space-y-2 flex-1 min-h-[180px]">
                {colApps.map(app => {
                  const title = app.job?.title || app.job_title || (isRTL ? 'משרה לא ידועה' : 'Unknown job');
                  const company = app.job?.company?.name || app.job_company || '';
                  const logo = app.job?.company?.logo_url;

                  return (
                    <div
                      key={app.id}
                      draggable
                      onDragStart={e => handleDragStart(e, app.id)}
                      onDragEnd={() => { setDraggedId(null); setDragOverCol(null); }}
                      onClick={() => onViewDetails(app as any)}
                      className={cn(
                        'bg-card border border-border rounded-lg p-2.5 cursor-grab active:cursor-grabbing',
                        'hover:border-primary/40 hover:shadow-sm transition-all select-none',
                        draggedId === app.id && 'opacity-40 scale-95',
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {logo ? (
                          <img src={logo} alt={company} className="w-6 h-6 rounded object-contain flex-shrink-0 mt-0.5" />
                        ) : (
                          <div className="w-6 h-6 rounded bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium leading-snug line-clamp-2">{title}</p>
                          {company && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{company}</p>}
                        </div>
                      </div>
                      {app.match_score != null && (
                        <div className={cn(
                          'mt-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full w-fit',
                          app.match_score >= 80 ? 'bg-emerald-500/10 text-emerald-600' :
                          app.match_score >= 60 ? 'bg-blue-500/10 text-blue-600' :
                          'bg-amber-500/10 text-amber-600'
                        )}>
                          {app.match_score}%
                        </div>
                      )}
                    </div>
                  );
                })}

                {colApps.length === 0 && (
                  <div className={cn(
                    'min-h-[80px] rounded border-2 border-dashed border-border/40 flex items-center justify-center transition-colors',
                    isOver && 'border-primary/50 bg-primary/5'
                  )}>
                    <span className="text-[10px] text-muted-foreground/40">
                      {isRTL ? 'גרור לכאן' : 'Drop here'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
