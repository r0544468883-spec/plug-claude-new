import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/contexts/CreditsContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { FuelCard } from '@/components/credits/FuelCard';
import { PromoCodeInput } from '@/components/credits/PromoCodeInput';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { SOCIAL_TASK_REWARDS, TOTAL_SOCIAL_CREDITS } from '@/lib/credit-costs';
import { Zap, Gem, Rocket, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';

interface CompletedTask {
  task_id: string;
}

const FuelUp = () => {
  const { user } = useAuth();
  const { credits, markOnboarded, totalCredits } = useCredits();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isRTL = language === 'he';
  
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Fetch completed tasks
  useEffect(() => {
    const fetchCompletedTasks = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('social_task_completions')
        .select('task_id')
        .eq('user_id', user.id);
      
      if (data) {
        setCompletedTasks(new Set(data.map((t: CompletedTask) => t.task_id)));
      }
      setIsLoading(false);
    };

    fetchCompletedTasks();
  }, [user]);

  // Mark as onboarded when user interacts
  useEffect(() => {
    if (credits && !credits.is_onboarded) {
      markOnboarded();
    }
  }, [credits, markOnboarded]);

  const earnedFromTasks = Array.from(completedTasks).reduce((sum, taskId) => {
    return sum + (SOCIAL_TASK_REWARDS[taskId]?.credits || 0);
  }, 0);

  const progressPercentage = (earnedFromTasks / TOTAL_SOCIAL_CREDITS) * 100;

  const taskEntries = Object.entries(SOCIAL_TASK_REWARDS);
  const highValueTasks = taskEntries.filter(([, t]) => t.credits >= 50);
  const lowValueTasks = taskEntries.filter(([, t]) => t.credits < 50);

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Header />
      
      <main className="container max-w-6xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#00FF9D] to-[#B794F4] mb-6"
          >
            <Rocket className="w-10 h-10 text-white" />
          </motion.div>
          
          <h1 className="text-4xl font-bold mb-4">
            {isRTL ? '🚀 מרכז השליטה' : '🚀 Mission Control'}
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            {isRTL 
              ? 'השלם משימות כדי לצבור דלק קבוע! הדלק הזה לעולם לא נגמר.'
              : 'Complete tasks to earn Permanent Fuel! This fuel never expires.'}
          </p>

          {/* Progress Section */}
          <div className="mt-8 max-w-md mx-auto bg-card border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Gem className="w-5 h-5 text-[#B794F4]" />
                <span className="font-medium">
                  {isRTL ? 'התקדמות' : 'Progress'}
                </span>
              </div>
              <span className="text-2xl font-bold text-[#B794F4]">
                {earnedFromTasks}/{TOTAL_SOCIAL_CREDITS}
              </span>
            </div>
            <Progress 
              value={progressPercentage} 
              className="h-3 bg-muted"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {isRTL 
                ? `${completedTasks.size} מתוך ${taskEntries.length} משימות הושלמו`
                : `${completedTasks.size} of ${taskEntries.length} tasks completed`}
            </p>
          </div>

          {/* Current Credits Display */}
          {credits && (
            <div className="mt-6 inline-flex items-center gap-6 px-6 py-3 rounded-full bg-card border">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#00FF9D]" />
                <span className="font-bold text-[#00FF9D]">{credits.daily_fuel}</span>
                <span className="text-xs text-muted-foreground">{isRTL ? 'יומי' : 'daily'}</span>
              </div>
              <div className="w-px h-6 bg-border" />
              <div className="flex items-center gap-2">
                <Gem className="w-5 h-5 text-[#B794F4]" />
                <span className="font-bold text-[#B794F4]">{credits.permanent_fuel}</span>
                <span className="text-xs text-muted-foreground">{isRTL ? 'קבוע' : 'permanent'}</span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Promo Code Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="max-w-md mx-auto mb-12"
        >
          <PromoCodeInput />
        </motion.div>
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-[#00FF9D]" />
            <h2 className="text-xl font-bold">
              {isRTL ? 'משימות בעלות ערך גבוה' : 'High Value Tasks'}
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-[#00FF9D]/20 text-[#00FF9D] text-xs font-medium">
              50+ {isRTL ? 'דלק' : 'fuel'}
            </span>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {highValueTasks.map(([taskId, task], index) => (
              <motion.div
                key={taskId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <FuelCard
                  taskId={taskId}
                  credits={task.credits}
                  label={isRTL ? task.labelHe : task.label}
                  url={task.url}
                  icon={task.icon}
                  isCompleted={completedTasks.has(taskId)}
                />
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Regular Tasks */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <h2 className="text-xl font-bold mb-6">
            {isRTL ? 'עוד משימות' : 'More Tasks'}
          </h2>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lowValueTasks.map(([taskId, task], index) => (
              <motion.div
                key={taskId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.05 }}
              >
                <FuelCard
                  taskId={taskId}
                  credits={task.credits}
                  label={isRTL ? task.labelHe : task.label}
                  url={task.url}
                  icon={task.icon}
                  isCompleted={completedTasks.has(taskId)}
                />
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* CTA Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center py-12 border-t"
        >
          <h2 className="text-2xl font-bold mb-4">
            {isRTL ? 'מוכן להתחיל?' : 'Ready to get started?'}
          </h2>
          <p className="text-muted-foreground mb-6">
            {isRTL 
              ? 'השתמש בדלק שלך כדי לבנות קורות חיים מושלמים ולהתכונן לראיונות!'
              : 'Use your fuel to build the perfect CV and prepare for interviews!'}
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Button 
              onClick={() => navigate('/')}
              className="gap-2"
            >
              {isRTL ? 'לדשבורד' : 'Go to Dashboard'}
              {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/credits')}
              className="gap-2"
            >
              <Gem className="w-4 h-4" />
              {isRTL ? 'צפה בהיסטוריה' : 'View History'}
            </Button>
          </div>
        </motion.section>
      </main>
    </div>
  );
};

export default FuelUp;
