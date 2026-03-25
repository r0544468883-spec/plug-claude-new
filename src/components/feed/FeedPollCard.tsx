import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCredits } from '@/contexts/CreditsContext';
import { toast } from 'sonner';
import { SparkleAnimation } from './SparkleAnimation';
import { PollOption } from './feedMockData';
import { cn } from '@/lib/utils';
import { BarChart3 } from 'lucide-react';

interface FeedPollCardProps {
  options: PollOption[];
  postId: string;
}

export function FeedPollCard({ options, postId }: FeedPollCardProps) {
  const { language } = useLanguage();
  const { awardCredits } = useCredits();
  const isRTL = language === 'he';
  const [voted, setVoted] = useState<string | null>(null);
  const [sparkle, setSparkle] = useState(false);
  const [localOptions, setLocalOptions] = useState(options);

  const totalVotes = localOptions.reduce((sum, o) => sum + o.votes, 0);

  const handleVote = useCallback(async (optionId: string) => {
    if (voted) return;
    setVoted(optionId);
    setLocalOptions(prev =>
      prev.map(o => o.id === optionId ? { ...o, votes: o.votes + 1 } : o)
    );

    // Award credit
    const result = await awardCredits('feed_poll_vote');
    if (result.success) {
      setSparkle(true);
      toast.success(isRTL ? '⚡ +1 דלק יומי!' : '⚡ +1 Daily Fuel earned!', {
        duration: 2000,
        style: { background: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' },
      });
      setTimeout(() => setSparkle(false), 600);
    }
  }, [voted, awardCredits, isRTL]);

  return (
    <div className="space-y-2 mt-3 relative">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <BarChart3 className="w-3.5 h-3.5" />
        <span>{isRTL ? `${totalVotes + (voted ? 1 : 0)} הצבעות` : `${totalVotes + (voted ? 1 : 0)} votes`}</span>
        <SparkleAnimation show={sparkle} />
      </div>
      {localOptions.map((option) => {
        const pct = totalVotes > 0 ? Math.round((option.votes / (totalVotes + (voted ? 1 : 0))) * 100) : 0;
        const isSelected = voted === option.id;
        return (
          <motion.button
            key={option.id}
            whileTap={!voted ? { scale: 0.98 } : {}}
            onClick={() => handleVote(option.id)}
            disabled={!!voted}
            className={cn(
              'w-full relative rounded-lg border p-3 text-start text-sm transition-colors overflow-hidden',
              voted
                ? isSelected
                  ? 'border-primary/50 bg-primary/10'
                  : 'border-border bg-muted/30'
                : 'border-border hover:border-primary/40 hover:bg-primary/5 cursor-pointer'
            )}
          >
            {voted && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="absolute inset-y-0 start-0 bg-primary/10 rounded-lg"
              />
            )}
            <span className="relative z-10 flex items-center justify-between">
              <span>{isRTL ? option.textHe : option.text}</span>
              {voted && <span className="text-xs font-medium text-muted-foreground">{pct}%</span>}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
