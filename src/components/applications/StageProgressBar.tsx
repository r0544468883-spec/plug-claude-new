import { Check, Circle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface Stage {
  id: string;
  label: { en: string; he: string };
}

const stages: Stage[] = [
  { id: 'applied', label: { en: 'Applied', he: 'הוגש' } },
  { id: 'screening', label: { en: 'Screening', he: 'סינון' } },
  { id: 'interview', label: { en: 'Interview', he: 'ראיון' } },
  { id: 'offer', label: { en: 'Offer', he: 'הצעה' } },
  { id: 'hired', label: { en: 'Hired', he: 'התקבל' } },
];

interface StageProgressBarProps {
  currentStage: string;
  onStageChange: (stage: string) => void;
  disabled?: boolean;
}

export function StageProgressBar({ currentStage, onStageChange, disabled }: StageProgressBarProps) {
  const { language } = useLanguage();
  const isRTL = language === 'he';

  // Handle rejected/withdrawn as special cases
  const isRejected = currentStage === 'rejected';
  const isWithdrawn = currentStage === 'withdrawn';
  const isTerminal = isRejected || isWithdrawn;

  // Find current stage index
  const currentIndex = stages.findIndex((s) => s.id === currentStage);
  const activeIndex = currentIndex >= 0 ? currentIndex : 0;

  const handleStageClick = (stage: Stage, index: number) => {
    if (disabled || isTerminal) return;
    onStageChange(stage.id);
  };

  if (isTerminal) {
    return (
      <div className="flex flex-col items-center gap-2 py-4">
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center",
          isRejected ? "bg-destructive/20" : "bg-muted"
        )}>
          <X className={cn(
            "w-6 h-6",
            isRejected ? "text-destructive" : "text-muted-foreground"
          )} />
        </div>
        <span className={cn(
          "text-sm font-medium",
          isRejected ? "text-destructive" : "text-muted-foreground"
        )}>
          {isRejected 
            ? (isRTL ? 'נדחה' : 'Rejected')
            : (isRTL ? 'מועמדות בוטלה' : 'Withdrawn')
          }
        </span>
      </div>
    );
  }

  return (
    <div className="w-full py-4" dir="ltr">
      <div className="flex items-center justify-between relative">
        {/* Progress line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-secondary">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(activeIndex / (stages.length - 1)) * 100}%` }}
          />
        </div>

        {/* Stages */}
        {stages.map((stage, index) => {
          const isCompleted = index < activeIndex;
          const isCurrent = index === activeIndex;
          const isPending = index > activeIndex;

          return (
            <button
              key={stage.id}
              onClick={() => handleStageClick(stage, index)}
              disabled={disabled}
              className={cn(
                "relative z-10 flex flex-col items-center gap-1 transition-all",
                !disabled && !isTerminal && "cursor-pointer hover:scale-105",
                disabled && "cursor-not-allowed opacity-50"
              )}
            >
              {/* Circle */}
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all border-2",
                isCompleted && "bg-primary border-primary text-primary-foreground",
                isCurrent && "bg-primary/20 border-primary text-primary",
                isPending && "bg-secondary border-secondary text-muted-foreground"
              )}>
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Circle className={cn(
                    "w-3 h-3",
                    isCurrent && "fill-primary"
                  )} />
                )}
              </div>

              {/* Label */}
              <span className={cn(
                "text-xs font-medium whitespace-nowrap",
                isCompleted && "text-primary",
                isCurrent && "text-primary font-semibold",
                isPending && "text-muted-foreground"
              )}>
                {isRTL ? stage.label.he : stage.label.en}
              </span>
            </button>
          );
        })}
      </div>

      {/* Reject button */}
      <div className="mt-4 flex justify-center">
        <button
          onClick={() => onStageChange('rejected')}
          disabled={disabled}
          className={cn(
            "text-xs text-muted-foreground hover:text-destructive transition-colors",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          {isRTL ? 'סמן כנדחה' : 'Mark as Rejected'}
        </button>
      </div>
    </div>
  );
}
