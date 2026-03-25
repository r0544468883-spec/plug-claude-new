import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Search, Heart, ArrowRight, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function EmptySavedJobsState() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isRTL = language === 'he';
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const handleGoToJobs = () => {
    navigate('/?section=job-search');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="bg-gradient-to-br from-destructive/5 via-primary/5 to-background border-destructive/20">
        <CardContent className="p-8 text-center">
          {/* Animated heart icon */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="relative mx-auto w-24 h-24 mb-6"
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-destructive/20 to-primary/20 animate-pulse" />
            <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-destructive/10 to-primary/10 flex items-center justify-center">
              <Heart className="w-10 h-10 text-primary fill-primary" />
            </div>
            <motion.div
              className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center"
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0]
              }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Sparkles className="w-4 h-4 text-accent" />
            </motion.div>
          </motion.div>

          {/* Plug's message */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-xl font-bold mb-2">
              {isRTL ? 'עוד לא שמרת משרות ❤️' : "No saved jobs yet ❤️"}
            </h3>
            
            <p className="text-muted-foreground max-w-md mx-auto mb-2">
              {isRTL 
                ? 'ראית משרה מעניינת? לחץ על הלב כדי לשמור אותה כאן ולחזור אליה אחר כך!'
                : "Found an interesting job? Click the heart to save it here and come back to it later!"}
            </p>

            <p className="text-sm text-primary font-medium mb-6">
              {isRTL 
                ? '💡 טיפ: שמירת משרות עוזרת לי להבין מה אתה מחפש'
                : '💡 Tip: Saving jobs helps me understand what you\'re looking for'}
            </p>
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Button 
              onClick={handleGoToJobs}
              size="lg"
              className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
            >
              <Search className="w-4 h-4" />
              {isRTL ? 'גלה משרות חדשות' : 'Discover New Jobs'}
              <ArrowIcon className="w-4 h-4" />
            </Button>
          </motion.div>

          {/* How to save hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 p-4 rounded-lg bg-muted/50 inline-flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary fill-primary" />
            </div>
            <p className="text-sm text-muted-foreground text-start">
              {isRTL 
                ? 'לחץ על סמל הלב בכרטיס משרה כדי לשמור'
                : 'Click the heart icon on any job card to save it'}
            </p>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
