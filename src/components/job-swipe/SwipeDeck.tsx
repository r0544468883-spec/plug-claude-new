import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { SwipeCard } from './SwipeCard';
import { MatchSummary } from './MatchSummary';
import type { SwipeJob } from '@/hooks/useJobSwipeBatch';

interface SwipeDeckProps {
  jobs: SwipeJob[];
  batchId: string;
  onAction: (jobId: string, action: 'apply' | 'skip' | 'save') => Promise<void>;
  onRefresh: () => void;
  hasFreeBatch: boolean;
}

export function SwipeDeck({ jobs, batchId, onAction, onRefresh, hasFreeBatch }: SwipeDeckProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [currentIndex, setCurrentIndex] = useState(0);
  const [actions, setActions] = useState<Record<string, 'apply' | 'skip' | 'save'>>({});

  const remainingJobs = jobs.filter(j => !j.acted && !actions[j.id]);
  const isComplete = remainingJobs.length === 0 && jobs.length > 0;

  const handleSwipe = async (action: 'apply' | 'skip' | 'save') => {
    const job = remainingJobs[0];
    if (!job) return;

    setActions(prev => ({ ...prev, [job.id]: action }));

    try {
      await onAction(job.id, action);
    } catch (err) {
      console.error('Failed to record action:', err);
    }
  };

  if (isComplete) {
    const applied = Object.values(actions).filter(a => a === 'apply').length +
      jobs.filter(j => j.acted).length; // include pre-acted
    const saved = Object.values(actions).filter(a => a === 'save').length;
    const skipped = Object.values(actions).filter(a => a === 'skip').length;

    return (
      <MatchSummary
        applied={applied}
        saved={saved}
        skipped={skipped}
        total={jobs.length}
        onRefresh={onRefresh}
        hasFreeBatch={hasFreeBatch}
      />
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Progress */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{isHebrew ? 'משרה' : 'Job'} {jobs.length - remainingJobs.length + 1}/{jobs.length}</span>
        <div className="flex gap-1">
          {jobs.map((j, i) => (
            <div
              key={j.id}
              className={`w-2 h-2 rounded-full transition-colors ${
                j.acted || actions[j.id]
                  ? actions[j.id] === 'apply' ? 'bg-emerald-500'
                  : actions[j.id] === 'save' ? 'bg-amber-500'
                  : 'bg-red-400'
                  : i === jobs.length - remainingJobs.length ? 'bg-primary'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Card Stack */}
      <div className="relative w-full max-w-[340px] aspect-[1/2] mx-auto">
        <AnimatePresence>
          {remainingJobs.slice(0, 2).map((job, i) => (
            <SwipeCard
              key={job.id}
              job={job}
              isTop={i === 0}
              onSwipe={handleSwipe}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Swipe hints */}
      <div className="flex items-center justify-between w-full max-w-[340px] text-xs text-muted-foreground px-4">
        <span>{isHebrew ? '← דלג' : '← Skip'}</span>
        <span>{isHebrew ? 'הגש →' : 'Apply →'}</span>
      </div>
    </div>
  );
}
