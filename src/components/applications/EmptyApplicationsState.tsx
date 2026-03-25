import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Search, FolderOpen, ArrowRight, ArrowLeft } from 'lucide-react';

interface EmptyApplicationsStateProps {
  onNavigateToJobs: () => void;
}

export function EmptyApplicationsState({ onNavigateToJobs }: EmptyApplicationsStateProps) {
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="bg-gradient-to-br from-accent/5 via-primary/5 to-background border-accent/20">
        <CardContent className="p-8 text-center">
          {/* Animated icon */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="relative mx-auto w-24 h-24 mb-6"
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/20 to-primary/20 animate-pulse" />
            <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-accent/10 to-primary/10 flex items-center justify-center">
              <FolderOpen className="w-10 h-10 text-accent" />
            </div>
            <motion.div
              className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center"
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Sparkles className="w-4 h-4 text-primary" />
            </motion.div>
          </motion.div>

          {/* Plug's message */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-xl font-bold mb-2">
              {isRTL ? 'היי! עדיין אין לך מועמדויות 👋' : "Hey! No applications yet 👋"}
            </h3>
            
            <p className="text-muted-foreground max-w-md mx-auto mb-2">
              {isRTL 
                ? 'אני Plug, ואני כאן לעזור לך למצוא את העבודה הבאה שלך! בוא נחפש משרות שמתאימות לפרופיל שלך.'
                : "I'm Plug, and I'm here to help you find your next job! Let's search for positions that match your profile."}
            </p>

            <p className="text-sm text-accent font-medium mb-6">
              {isRTL 
                ? '💡 טיפ: אני יכול לעקוב אחרי כל המועמדויות שלך במקום אחד'
                : '💡 Tip: I can track all your applications in one place'}
            </p>
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Button 
              onClick={onNavigateToJobs}
              size="lg"
              className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
            >
              <Search className="w-4 h-4" />
              {isRTL ? 'חפש משרות עכשיו' : 'Search Jobs Now'}
              <ArrowIcon className="w-4 h-4" />
            </Button>
          </motion.div>

          {/* Features preview */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap justify-center gap-2 mt-6"
          >
            {[
              isRTL ? '📊 מעקב התקדמות' : '📊 Track Progress',
              isRTL ? '📅 תזכורות לראיונות' : '📅 Interview Reminders',
              isRTL ? '📝 הערות אישיות' : '📝 Personal Notes',
            ].map((feature, i) => (
              <span 
                key={i} 
                className="px-3 py-1 rounded-full bg-secondary text-xs text-muted-foreground"
              >
                {feature}
              </span>
            ))}
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
