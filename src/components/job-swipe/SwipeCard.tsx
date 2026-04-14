import { useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Briefcase, Clock, DollarSign, X, Bookmark, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SwipeJob } from '@/hooks/useJobSwipeBatch';

interface SwipeCardProps {
  job: SwipeJob;
  onSwipe: (action: 'apply' | 'skip' | 'save') => void;
  isTop: boolean;
}

const SWIPE_THRESHOLD = 100;

export function SwipeCard({ job, onSwipe, isTop }: SwipeCardProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [exiting, setExiting] = useState<'left' | 'right' | null>(null);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-15, 0, 15]);
  const opacity = useTransform(x, [-300, -150, 0, 150, 300], [0.5, 1, 1, 1, 0.5]);

  // Overlay indicators
  const applyOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const skipOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > SWIPE_THRESHOLD) {
      setExiting('right');
      setTimeout(() => onSwipe('apply'), 300);
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      setExiting('left');
      setTimeout(() => onSwipe('skip'), 300);
    }
  };

  const handleButtonAction = (action: 'apply' | 'skip' | 'save') => {
    if (action === 'apply') setExiting('right');
    else if (action === 'skip') setExiting('left');
    setTimeout(() => onSwipe(action), 200);
  };

  const scoreColor = job.match_score >= 80 ? 'text-emerald-500' : job.match_score >= 70 ? 'text-blue-500' : 'text-amber-500';
  const scoreBg = job.match_score >= 80 ? 'bg-emerald-500/10 border-emerald-500/30' : job.match_score >= 70 ? 'bg-blue-500/10 border-blue-500/30' : 'bg-amber-500/10 border-amber-500/30';

  return (
    <motion.div
      className={cn(
        'absolute inset-0 touch-none',
        !isTop && 'pointer-events-none'
      )}
      style={{ x: isTop ? x : 0, rotate: isTop ? rotate : 0, opacity: isTop ? opacity : 0.6, zIndex: isTop ? 10 : 1 }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={isTop ? handleDragEnd : undefined}
      animate={
        exiting === 'right' ? { x: 500, opacity: 0 } :
        exiting === 'left' ? { x: -500, opacity: 0 } :
        { x: 0, scale: isTop ? 1 : 0.95 }
      }
      transition={{ type: 'spring', damping: 20 }}
    >
      <div className={cn(
        'w-full h-full rounded-2xl border bg-card shadow-xl overflow-hidden flex flex-col',
        'select-none'
      )}>
        {/* Swipe Indicators */}
        {isTop && (
          <>
            <motion.div
              className="absolute top-6 left-6 z-20 px-4 py-2 rounded-xl bg-emerald-500 text-white font-bold text-lg rotate-[-12deg] border-2 border-white"
              style={{ opacity: applyOpacity }}
            >
              {isHebrew ? 'הגשה!' : 'APPLY!'}
            </motion.div>
            <motion.div
              className="absolute top-6 right-6 z-20 px-4 py-2 rounded-xl bg-red-500 text-white font-bold text-lg rotate-[12deg] border-2 border-white"
              style={{ opacity: skipOpacity }}
            >
              {isHebrew ? 'דלג' : 'SKIP'}
            </motion.div>
          </>
        )}

        {/* Match Score Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-b from-primary/5 to-transparent">
          <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full border', scoreBg)}>
            <Sparkles className={cn('w-4 h-4', scoreColor)} />
            <span className={cn('font-bold text-sm', scoreColor)}>{job.match_score}%</span>
          </div>
          {job.job_type && (
            <Badge variant="outline" className="text-xs">
              {job.job_type}
            </Badge>
          )}
        </div>

        {/* Job Content */}
        <div className="flex-1 p-5 space-y-4 overflow-y-auto">
          {/* Title */}
          <h2 className="text-xl font-bold leading-tight line-clamp-2">
            {job.title}
          </h2>

          {/* Meta */}
          <div className="flex flex-wrap gap-2">
            {job.location && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />
                <span className="line-clamp-1">{job.location}</span>
              </div>
            )}
            {job.salary_range && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <DollarSign className="w-3.5 h-3.5" />
                <span>{job.salary_range}</span>
              </div>
            )}
            {job.field && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Briefcase className="w-3.5 h-3.5" />
                <span>{job.field}</span>
              </div>
            )}
          </div>

          {/* AI Recommendation */}
          {job.recommendation && (
            <div className="bg-primary/5 border border-primary/10 rounded-lg p-3">
              <p className="text-sm font-medium text-primary mb-1">
                {isHebrew ? 'למה זה מתאים לך?' : 'Why this matches you'}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {job.recommendation}
              </p>
            </div>
          )}

          {/* Description */}
          {job.description && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                {isHebrew ? 'תיאור המשרה' : 'Job Description'}
              </p>
              <p className="text-sm text-foreground/80 line-clamp-4 whitespace-pre-wrap">
                {job.description}
              </p>
            </div>
          )}

          {/* Requirements */}
          {job.requirements && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                {isHebrew ? 'דרישות' : 'Requirements'}
              </p>
              <p className="text-sm text-foreground/80 line-clamp-3 whitespace-pre-wrap">
                {job.requirements}
              </p>
            </div>
          )}

          {/* Posted date */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {new Date(job.created_at).toLocaleDateString(isHebrew ? 'he-IL' : 'en-US')}
          </div>
        </div>

        {/* Action Buttons */}
        {isTop && (
          <div className="flex items-center justify-center gap-4 p-4 border-t bg-card">
            <Button
              size="lg"
              variant="outline"
              className="h-14 w-14 rounded-full border-2 border-red-300 text-red-500 hover:bg-red-50 hover:border-red-400"
              onClick={() => handleButtonAction('skip')}
            >
              <X className="w-6 h-6" />
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="h-12 w-12 rounded-full border-2 border-amber-300 text-amber-500 hover:bg-amber-50 hover:border-amber-400"
              onClick={() => handleButtonAction('save')}
            >
              <Bookmark className="w-5 h-5" />
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="h-14 w-14 rounded-full border-2 border-emerald-300 text-emerald-500 hover:bg-emerald-50 hover:border-emerald-400"
              onClick={() => handleButtonAction('apply')}
            >
              <Check className="w-6 h-6" />
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
