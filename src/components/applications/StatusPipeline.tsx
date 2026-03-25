import { cn } from '@/lib/utils';

interface Stage {
  key: string;
  label: string;
  timestamp?: string | null;
}

interface StatusPipelineProps {
  currentStage: string;
  updatedAt?: string;
}

const STAGES: Stage[] = [
  { key: 'applied', label: 'הוגש' },
  { key: 'viewed', label: 'נצפה' },
  { key: 'screening', label: 'בסינון' },
  { key: 'interview', label: 'ראיון' },
  { key: 'offer', label: 'הצעה' },
  { key: 'hired', label: 'התקבלת!' },
];

const STAGE_ORDER = STAGES.map(s => s.key);

export function StatusPipeline({ currentStage, updatedAt }: StatusPipelineProps) {
  const currentIdx = STAGE_ORDER.indexOf(currentStage);
  const isRejected = currentStage === 'rejected' || currentStage === 'withdrawn';

  return (
    <div className="w-full py-3" dir="rtl">
      {isRejected ? (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <div className="w-3 h-3 rounded-full bg-destructive" />
          {currentStage === 'rejected' ? 'מועמדות נדחתה' : 'מועמדות בוטלה'}
        </div>
      ) : (
        <div className="relative">
          {/* Connector line */}
          <div className="absolute top-4 right-4 left-4 h-0.5 bg-muted" />
          <div
            className="absolute top-4 right-4 h-0.5 bg-primary transition-all duration-500"
            style={{ width: currentIdx > 0 ? `${(currentIdx / (STAGES.length - 1)) * 100}%` : '0%' }}
          />
          <div className="relative flex justify-between">
            {STAGES.map((stage, idx) => {
              const isPast = idx < currentIdx;
              const isCurrent = idx === currentIdx;
              return (
                <div key={stage.key} className="flex flex-col items-center gap-1.5">
                  <div className={cn(
                    'w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 z-10',
                    isPast ? 'bg-primary border-primary text-primary-foreground' :
                    isCurrent ? 'border-primary bg-primary/20 text-primary animate-pulse' :
                    'border-muted-foreground/30 bg-background text-muted-foreground border-dashed'
                  )}>
                    {isPast ? '✓' : <span className="text-xs">{idx + 1}</span>}
                  </div>
                  <span className={cn(
                    'text-xs font-medium whitespace-nowrap',
                    isCurrent ? 'text-primary' : isPast ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {updatedAt && (
        <p className="text-xs text-muted-foreground mt-2 text-center">
          עודכן: {new Date(updatedAt).toLocaleDateString('he-IL')}
        </p>
      )}
    </div>
  );
}
