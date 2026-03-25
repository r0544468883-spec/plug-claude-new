import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  Circle, 
  Upload, 
  User, 
  FileText, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  Rocket
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface ChecklistItem {
  id: string;
  titleHe: string;
  titleEn: string;
  descriptionHe: string;
  descriptionEn: string;
  icon: typeof Upload;
  completed: boolean;
  action: () => void;
}

interface OnboardingChecklistProps {
  onNavigate: (section: 'overview' | 'applications' | 'candidates' | 'jobs' | 'job-search' | 'profile-docs' | 'chat' | 'settings' | 'messages' | 'post-job' | 'saved-jobs' | 'cv-builder') => void;
  onShowResumeDialog: () => void;
}

export function OnboardingChecklist({ onNavigate, onShowResumeDialog }: OnboardingChecklistProps) {
  const { user, profile } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isRTL = language === 'he';
  const [isExpanded, setIsExpanded] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);

  // Check if user has uploaded CV
  const { data: hasCV } = useQuery({
    queryKey: ['has-cv', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase
        .from('documents')
        .select('id')
        .eq('owner_id', user.id)
        .eq('doc_type', 'cv')
        .limit(1);
      return (data && data.length > 0) || false;
    },
    enabled: !!user?.id,
  });

  // Check profile completion (query profiles table directly for bio and links)
  const { data: profileData } = useQuery({
    queryKey: ['profile-completion', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      // Use profiles_secure view for consistent security
      const { data } = await supabase
        .from('profiles_secure')
        .select('bio, linkedin_url, github_url, portfolio_url')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Check if user has submitted at least one application
  const { data: hasApplication } = useQuery({
    queryKey: ['has-application', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase
        .from('applications')
        .select('id')
        .eq('candidate_id', user.id)
        .limit(1);
      return (data && data.length > 0) || false;
    },
    enabled: !!user?.id,
  });

  // Check profile completion
  const isProfileComplete = !!(
    profile?.full_name &&
    profileData?.bio &&
    (profileData?.linkedin_url || profileData?.github_url || profileData?.portfolio_url)
  );

  // Define checklist items
  const items: ChecklistItem[] = [
    {
      id: 'cv',
      titleHe: 'העלה קורות חיים',
      titleEn: 'Upload your CV',
      descriptionHe: 'העלה את קורות החיים שלך כדי ש-Plug יוכל להתאים לך משרות',
      descriptionEn: 'Upload your CV so Plug can match you with jobs',
      icon: Upload,
      completed: !!hasCV,
      action: onShowResumeDialog,
    },
    {
      id: 'profile',
      titleHe: 'השלם את הפרופיל',
      titleEn: 'Complete your profile',
      descriptionHe: 'הוסף תיאור קצר וקישורים לפורטפוליו',
      descriptionEn: 'Add a short bio and portfolio links',
      icon: User,
      completed: isProfileComplete,
      action: () => navigate('/profile'),
    },
    {
      id: 'apply',
      titleHe: 'הגש מועמדות ראשונה',
      titleEn: 'Submit your first application',
      descriptionHe: 'חפש משרה והגש מועמדות - Plug יעזור לך לעקוב',
      descriptionEn: 'Search for a job and apply - Plug will help you track it',
      icon: FileText,
      completed: !!hasApplication,
      action: () => onNavigate('job-search'),
    },
  ];

  const completedCount = items.filter(item => item.completed).length;
  const progressPercent = (completedCount / items.length) * 100;
  const allCompleted = completedCount === items.length;

  // Show confetti when all items are completed
  useEffect(() => {
    if (allCompleted && !showConfetti) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
  }, [allCompleted, showConfetti]);

  // Don't show if all completed (collapsed mode available)
  if (allCompleted && !isExpanded) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      data-tour="onboarding-checklist"
    >
      <Card className="bg-gradient-to-br from-primary/5 via-accent/5 to-background border-primary/20 overflow-hidden">
        {/* Confetti animation when all complete */}
        <AnimatePresence>
          {showConfetti && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none overflow-hidden"
            >
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: ['#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#3b82f6'][i % 5],
                    left: `${Math.random() * 100}%`,
                  }}
                  initial={{ y: -20, opacity: 1 }}
                  animate={{ 
                    y: 400, 
                    opacity: 0,
                    rotate: Math.random() * 360,
                  }}
                  transition={{ 
                    duration: 2 + Math.random(),
                    delay: Math.random() * 0.5,
                    ease: 'easeOut'
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              {allCompleted ? (
                <Rocket className="w-5 h-5 text-primary" />
              ) : (
                <Sparkles className="w-5 h-5 text-accent" />
              )}
              {allCompleted 
                ? (isRTL ? '🎉 הכל מוכן!' : '🎉 All set!')
                : (isRTL ? 'בוא נתחיל!' : "Let's get started!")}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
          
          {/* Progress bar */}
          <div className="flex items-center gap-3 mt-2">
            <Progress value={progressPercent} className="h-2 flex-1" />
            <span className="text-sm text-muted-foreground font-medium">
              {completedCount}/{items.length}
            </span>
          </div>
        </CardHeader>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CardContent className="pt-2 space-y-2">
                {items.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <button
                      onClick={item.action}
                      disabled={item.completed}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg transition-all text-start',
                        item.completed 
                          ? 'bg-primary/10 opacity-60' 
                          : 'bg-card hover:bg-primary/10 hover:border-primary/30 border border-border cursor-pointer'
                      )}
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                        item.completed ? 'bg-primary/20' : 'bg-muted'
                      )}>
                        {item.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                        ) : (
                          <item.icon className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'font-medium text-sm',
                          item.completed && 'line-through text-muted-foreground'
                        )}>
                          {isRTL ? item.titleHe : item.titleEn}
                        </p>
                        {!item.completed && (
                          <p className="text-xs text-muted-foreground truncate">
                            {isRTL ? item.descriptionHe : item.descriptionEn}
                          </p>
                        )}
                      </div>

                      {!item.completed && (
                        <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </button>
                  </motion.div>
                ))}

                {allCompleted && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 rounded-lg bg-primary/10 text-center"
                  >
                    <Sparkles className="w-8 h-8 text-primary mx-auto mb-2" />
                    <p className="font-medium text-primary">
                      {isRTL ? 'מעולה! אתה מוכן להתחיל!' : "Awesome! You're ready to go!"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {isRTL ? 'Plug יעזור לך למצוא את העבודה הבאה' : 'Plug will help you find your next job'}
                    </p>
                  </motion.div>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
