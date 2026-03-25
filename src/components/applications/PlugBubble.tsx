import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

interface Suggestion {
  id: string;
  message: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
  companyName?: string;
}

interface Application {
  id: string;
  status: string;
  current_stage: string;
  match_score: number | null;
  created_at: string;
  last_interaction: string;
  job: {
    title: string;
    company: {
      name: string;
    } | null;
  } | null;
}

interface PlugBubbleProps {
  applications?: Application[];
  onActionClick?: (action: string, data?: any) => void;
}

const BUBBLE_STORAGE_KEY = 'plug_bubble_last_shown';
const BUBBLE_DISMISSED_KEY = 'plug_bubble_dismissed_ids';
const MIN_HOURS_BETWEEN_BUBBLES = 2; // Show every 2 hours max
const SHOW_PROBABILITY = 0.5; // 50% chance to show when triggered

const PlugBubble = ({ applications = [], onActionClick }: PlugBubbleProps) => {
  const { language } = useLanguage();
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [currentSuggestion, setCurrentSuggestion] = useState<Suggestion | null>(null);
  const [shouldShowProactive, setShouldShowProactive] = useState(false);

  const isRTL = language === 'he';

  // Generate dynamic suggestions based on user's actual applications
  const dynamicSuggestions = useMemo((): Suggestion[] => {
    const suggestions: Suggestion[] = [];
    
    if (applications.length === 0) {
      // No applications - encourage to start
      suggestions.push({
        id: 'no_apps',
        message: isRTL 
          ? 'היי! 👋 בוא נתחיל לחפש משרות מתאימות בשבילך!'
          : 'Hey! 👋 Let\'s start finding matching jobs for you!',
        action: 'view_jobs',
        priority: 'high',
      });
      return suggestions;
    }

    // Find applications in interview stages
    const interviewApps = applications.filter(a => 
      ['interview', 'technical'].includes(a.current_stage)
    );
    
    if (interviewApps.length > 0) {
      const app = interviewApps[0];
      const companyName = app.job?.company?.name || '';
      suggestions.push({
        id: `interview_prep_${app.id}`,
        message: isRTL 
          ? `🎯 יש לך ראיון ב-${companyName}! רוצה שאעזור לך להתכונן?`
          : `🎯 You have an interview at ${companyName}! Want me to help you prepare?`,
        action: 'interview_prep',
        priority: 'high',
        companyName,
      });
    }

    // Find stale applications (no update in 2+ weeks)
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    const staleApps = applications.filter(a => {
      const lastUpdate = new Date(a.last_interaction || a.created_at);
      return lastUpdate < twoWeeksAgo && 
             !['rejected', 'withdrawn', 'hired'].includes(a.current_stage);
    });
    
    if (staleApps.length > 0) {
      const app = staleApps[0];
      const companyName = app.job?.company?.name || '';
      suggestions.push({
        id: `followup_${app.id}`,
        message: isRTL 
          ? `💡 לא היה עדכון מ-${companyName} זמן מה. אולי כדאי לעקוב?`
          : `💡 No update from ${companyName} in a while. Maybe follow up?`,
        action: 'followup',
        priority: 'medium',
        companyName,
      });
    }

    // Find applications with high match score
    const highMatchApps = applications.filter(a => 
      (a.match_score || 0) >= 80 && a.status === 'active'
    );
    
    if (highMatchApps.length > 0) {
      const app = highMatchApps[0];
      const companyName = app.job?.company?.name || '';
      suggestions.push({
        id: `high_match_${app.id}`,
        message: isRTL 
          ? `⭐ יש לך התאמה גבוהה ל-${companyName}! זה נראה מבטיח!`
          : `⭐ You have a high match with ${companyName}! This looks promising!`,
        action: 'view_application',
        priority: 'high',
        companyName,
      });
    }

    // Offer stage - celebration
    const offerApps = applications.filter(a => a.current_stage === 'offer');
    if (offerApps.length > 0) {
      const app = offerApps[0];
      const companyName = app.job?.company?.name || '';
      suggestions.push({
        id: `offer_${app.id}`,
        message: isRTL 
          ? `🎉 מזל טוב! יש לך הצעה מ-${companyName}! צריך עזרה בהחלטה?`
          : `🎉 Congrats! You got an offer from ${companyName}! Need help deciding?`,
        action: 'offer_help',
        priority: 'high',
        companyName,
      });
    }

    // Active applications encouragement
    const activeApps = applications.filter(a => a.status === 'active');
    if (activeApps.length > 0 && suggestions.length === 0) {
      suggestions.push({
        id: 'active_encouragement',
        message: isRTL 
          ? `💪 יש לך ${activeApps.length} מועמדויות פעילות! המשך כך!`
          : `💪 You have ${activeApps.length} active applications! Keep it up!`,
        action: 'view_applications',
        priority: 'medium',
      });
    }

    return suggestions;
  }, [applications, isRTL]);

  // Check if we should show the proactive bubble
  const shouldShowBubble = useCallback(() => {
    if (!user) return false;
    if (dynamicSuggestions.length === 0) return false;
    
    // Check last shown time
    const lastShown = localStorage.getItem(BUBBLE_STORAGE_KEY);
    if (lastShown) {
      const hoursSince = (Date.now() - parseInt(lastShown)) / (1000 * 60 * 60);
      if (hoursSince < MIN_HOURS_BETWEEN_BUBBLES) return false;
    }

    // Get dismissed suggestion IDs
    const dismissed = JSON.parse(localStorage.getItem(BUBBLE_DISMISSED_KEY) || '[]');
    
    // Filter out dismissed suggestions
    const availableSuggestions = dynamicSuggestions.filter(s => !dismissed.includes(s.id));
    if (availableSuggestions.length === 0) return false;

    // Random chance to show (to avoid being annoying)
    return Math.random() < SHOW_PROBABILITY;
  }, [user, dynamicSuggestions]);

  // Proactive bubble logic - appears occasionally
  useEffect(() => {
    if (!user || currentSuggestion || dynamicSuggestions.length === 0) return;

    // Initial delay before considering showing
    const initialDelay = setTimeout(() => {
      if (shouldShowBubble()) {
        // Get a random available suggestion
        const dismissed = JSON.parse(localStorage.getItem(BUBBLE_DISMISSED_KEY) || '[]');
        const available = dynamicSuggestions.filter(s => !dismissed.includes(s.id));
        
        if (available.length > 0) {
          // Prioritize high priority suggestions
          const highPriority = available.filter(s => s.priority === 'high');
          const suggestion = highPriority.length > 0 
            ? highPriority[Math.floor(Math.random() * highPriority.length)]
            : available[Math.floor(Math.random() * available.length)];
          
          setShouldShowProactive(true);
          setCurrentSuggestion(suggestion);
          localStorage.setItem(BUBBLE_STORAGE_KEY, Date.now().toString());
        }
      }
    }, 5000); // Wait 5 seconds before potentially showing

    return () => clearTimeout(initialDelay);
  }, [user, dynamicSuggestions, shouldShowBubble, currentSuggestion]);

  // Auto-hide after some time if not interacted with
  useEffect(() => {
    if (currentSuggestion && shouldShowProactive) {
      const autoHideTimer = setTimeout(() => {
        dismissSuggestion();
      }, 20000); // Hide after 20 seconds

      return () => clearTimeout(autoHideTimer);
    }
  }, [currentSuggestion, shouldShowProactive]);

  const handleAction = (action: string) => {
    setIsOpen(false);
    setCurrentSuggestion(null);
    setShouldShowProactive(false);
    onActionClick?.(action);
  };

  const dismissSuggestion = () => {
    if (currentSuggestion) {
      // Store dismissed suggestion
      const dismissed = JSON.parse(localStorage.getItem(BUBBLE_DISMISSED_KEY) || '[]');
      if (!dismissed.includes(currentSuggestion.id)) {
        dismissed.push(currentSuggestion.id);
        localStorage.setItem(BUBBLE_DISMISSED_KEY, JSON.stringify(dismissed));
      }
    }
    setCurrentSuggestion(null);
    setShouldShowProactive(false);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Floating suggestion bubble - appears proactively */}
      <AnimatePresence>
        {currentSuggestion && !isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={`fixed bottom-24 z-50 max-w-xs ${
              isRTL ? 'left-4' : 'right-4'
            }`}
          >
            <Card className="border-accent/30 bg-card/95 backdrop-blur shadow-lg">
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <motion.div 
                    className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Sparkles className="h-4 w-4 text-accent" />
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground" dir={isRTL ? 'rtl' : 'ltr'}>
                      {currentSuggestion.message}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-muted-foreground"
                        onClick={dismissSuggestion}
                      >
                        {isRTL ? 'לא עכשיו' : 'Not now'}
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => handleAction(currentSuggestion.action)}
                      >
                        {isRTL ? 'בוא נתחיל' : "Let's go"}
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <button
                    onClick={dismissSuggestion}
                    className="text-muted-foreground hover:text-foreground p-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main chat bubble */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 z-50 h-14 w-14 rounded-full bg-accent shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
          isRTL ? 'left-6' : 'right-6'
        }`}
        style={{
          boxShadow: '0 0 20px hsl(270 91% 65% / 0.4), 0 4px 12px rgba(0,0,0,0.3)',
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="h-6 w-6 text-accent-foreground" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <MessageCircle className="h-6 w-6 text-accent-foreground" />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Breathing animation - only when not open and no suggestion showing */}
        {!isOpen && !currentSuggestion && (
          <motion.span 
            className="absolute inset-0 rounded-full bg-accent"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* Notification dot when suggestion is available */}
        {currentSuggestion && !isOpen && (
          <motion.span
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`fixed bottom-24 z-50 w-80 max-h-96 ${
              isRTL ? 'left-4' : 'right-4'
            }`}
          >
            <Card className="border-border bg-card/95 backdrop-blur shadow-xl">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                  <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Plug</p>
                    <p className="text-xs text-muted-foreground">
                      {isRTL ? 'העוזר החכם שלך' : 'Your smart assistant'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground" dir={isRTL ? 'rtl' : 'ltr'}>
                    {isRTL ? 'מה אתה רוצה לעשות?' : 'What would you like to do?'}
                  </p>
                  
                  {dynamicSuggestions.slice(0, 4).map((suggestion) => (
                    <motion.button
                      key={suggestion.id}
                      onClick={() => handleAction(suggestion.action)}
                      className="w-full text-start p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-sm text-foreground"
                      dir={isRTL ? 'rtl' : 'ltr'}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {suggestion.message}
                    </motion.button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PlugBubble;
