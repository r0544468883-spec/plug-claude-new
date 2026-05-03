import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useCredits } from '@/contexts/CreditsContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { SOCIAL_TASK_REWARDS, TOTAL_SOCIAL_CREDITS } from '@/lib/credit-costs';
import { FuelCard } from '@/components/credits/FuelCard';
import { Button } from '@/components/ui/button';
import { Zap, Rocket, ArrowLeft, ArrowRight, Sparkles, Gem, ChevronDown } from 'lucide-react';

interface FuelWelcomeProps {
  onComplete: () => void;
}

type Phase = 'reveal' | 'explain' | 'earn';

export function FuelWelcome({ onComplete }: FuelWelcomeProps) {
  const { credits, totalCredits, markOnboarded } = useCredits();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isHebrew = language === 'he';
  const isRTL = isHebrew;

  const [phase, setPhase] = useState<Phase>('reveal');
  const [countUp, setCountUp] = useState(0);
  const [showContent, setShowContent] = useState(false);

  // Animate count-up for the fuel number
  const targetFuel = totalCredits || 15;
  useEffect(() => {
    if (phase !== 'reveal') return;
    const duration = 1200;
    const steps = 30;
    const increment = targetFuel / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= targetFuel) {
        setCountUp(targetFuel);
        clearInterval(timer);
        setTimeout(() => setShowContent(true), 400);
      } else {
        setCountUp(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [phase, targetFuel]);

  // Mark onboarded on mount
  useEffect(() => {
    if (credits && !credits.is_onboarded) {
      markOnboarded();
    }
  }, [credits, markOnboarded]);

  const handleFinish = () => {
    onComplete();
  };

  const handleGoToFuelUp = () => {
    onComplete();
    navigate('/fuel-up');
  };

  // Get top 3 high-value tasks for the quick-earn section
  const topTasks = Object.entries(SOCIAL_TASK_REWARDS)
    .filter(([, t]) => t.credits >= 50)
    .slice(0, 3);

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto"
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{ background: 'hsl(220 47% 5.5%)' }}
      >
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-120px] right-[-120px] w-[400px] h-[400px] rounded-full bg-[#00FF9D]/5 blur-[120px]" />
          <div className="absolute bottom-[-120px] left-[-120px] w-[400px] h-[400px] rounded-full bg-purple-500/5 blur-[120px]" />
          {/* Floating particles */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-[#00FF9D]/30"
              animate={{
                y: [0, -200, 0],
                x: [0, (i % 2 ? 30 : -30), 0],
                opacity: [0, 0.6, 0],
              }}
              transition={{
                duration: 4 + i,
                repeat: Infinity,
                delay: i * 0.7,
              }}
              style={{
                left: `${15 + i * 14}%`,
                top: `${60 + (i % 3) * 10}%`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 w-full max-w-lg mx-auto px-6 py-10">
          {/* ── Phase 1: Reveal ── */}
          {phase === 'reveal' && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center text-center"
            >
              {/* Fuel icon with glow */}
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="relative mb-6"
              >
                <div className="absolute inset-0 w-24 h-24 rounded-full bg-[#00FF9D]/20 blur-xl" />
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#00FF9D] to-emerald-600 flex items-center justify-center shadow-[0_0_60px_rgba(0,255,157,0.3)]">
                  <Zap className="w-12 h-12 text-black" />
                </div>
              </motion.div>

              {/* Count-up number */}
              <motion.div
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                className="text-6xl font-black text-[#00FF9D] mb-2 tabular-nums"
              >
                {countUp}
              </motion.div>
              <p className="text-lg text-white/60 font-medium mb-2">
                {isHebrew ? 'יחידות דלק' : 'fuel units'}
              </p>

              {/* Explanation text */}
              <AnimatePresence>
                {showContent && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mt-4 space-y-4"
                  >
                    <h2 className="text-2xl font-bold text-white">
                      {isHebrew ? 'ברוכים הבאים למערכת הדלק!' : 'Welcome to your Fuel System!'}
                    </h2>
                    <p className="text-white/50 text-sm leading-relaxed max-w-sm mx-auto">
                      {isHebrew
                        ? 'הדלק מאפשר לך להשתמש ביכולות ה-AI של PLUG — בניית קורות חיים, הכנה לראיונות, התאמת משרות ועוד. ככל שתצבור יותר דלק, תוכל לעשות יותר.'
                        : 'Fuel powers all of PLUG\'s AI features — CV building, interview prep, job matching and more. The more fuel you have, the more you can do.'}
                    </p>

                    <Button
                      onClick={() => setPhase('explain')}
                      size="lg"
                      className="mt-6 min-h-[52px] gap-2 rounded-full px-8 text-base font-semibold bg-[#00FF9D] text-black hover:bg-[#00FF9D]/90 hover:shadow-[0_0_30px_rgba(0,255,157,0.3)]"
                    >
                      {isHebrew ? 'איך זה עובד?' : 'How does it work?'}
                      <ArrowIcon className="w-5 h-5" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── Phase 2: Explain ── */}
          {phase === 'explain' && (
            <motion.div
              initial={{ opacity: 0, x: isRTL ? -40 : 40 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col items-center text-center"
            >
              <Sparkles className="w-10 h-10 text-[#00FF9D] mb-4" />
              <h2 className="text-2xl font-bold text-white mb-6">
                {isHebrew ? 'שני סוגי דלק' : 'Two Types of Fuel'}
              </h2>

              <div className="w-full space-y-3 mb-8">
                {/* Daily fuel */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="flex items-center gap-4 p-4 rounded-xl border border-border/30 bg-white/[0.03]"
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Zap className="w-6 h-6 text-amber-400" />
                  </div>
                  <div className="text-start flex-1">
                    <p className="font-semibold text-white text-sm">
                      {isHebrew ? 'דלק יומי' : 'Daily Fuel'}
                    </p>
                    <p className="text-xs text-white/40 mt-0.5">
                      {isHebrew
                        ? 'מתחדש כל יום — 15 יחידות (יותר ככל שתתקדמו בדרגה)'
                        : 'Refills every day — 15 units (more as you level up)'}
                    </p>
                  </div>
                </motion.div>

                {/* Permanent fuel */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center gap-4 p-4 rounded-xl border border-border/30 bg-white/[0.03]"
                >
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                    <Gem className="w-6 h-6 text-purple-400" />
                  </div>
                  <div className="text-start flex-1">
                    <p className="font-semibold text-white text-sm">
                      {isHebrew ? 'דלק קבוע' : 'Permanent Fuel'}
                    </p>
                    <p className="text-xs text-white/40 mt-0.5">
                      {isHebrew
                        ? 'נצבר ממשימות חברתיות, הזמנות חברים, ושיתופי משרות — לא נעלם!'
                        : 'Earned from social tasks, inviting friends, sharing jobs — never expires!'}
                    </p>
                  </div>
                </motion.div>

                {/* What it powers */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  className="flex items-center gap-4 p-4 rounded-xl border border-[#00FF9D]/20 bg-[#00FF9D]/[0.03]"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#00FF9D]/10 flex items-center justify-center shrink-0">
                    <Rocket className="w-6 h-6 text-[#00FF9D]" />
                  </div>
                  <div className="text-start flex-1">
                    <p className="font-semibold text-white text-sm">
                      {isHebrew ? 'מה דלק מפעיל?' : 'What does fuel power?'}
                    </p>
                    <p className="text-xs text-white/40 mt-0.5">
                      {isHebrew
                        ? 'בניית CV, ניתוח קורות חיים, הכנה לראיון, התאמת משרות, חיפוש חכם ועוד'
                        : 'CV builder, resume analysis, interview prep, job matching, smart search & more'}
                    </p>
                  </div>
                </motion.div>
              </div>

              <Button
                onClick={() => setPhase('earn')}
                size="lg"
                className="min-h-[52px] gap-2 rounded-full px-8 text-base font-semibold bg-[#00FF9D] text-black hover:bg-[#00FF9D]/90 hover:shadow-[0_0_30px_rgba(0,255,157,0.3)]"
              >
                {isHebrew ? 'רוצה עוד דלק? בואו נתחיל!' : 'Want more fuel? Let\'s go!'}
                <ArrowIcon className="w-5 h-5" />
              </Button>
            </motion.div>
          )}

          {/* ── Phase 3: Earn — quick social tasks ── */}
          {phase === 'earn' && (
            <motion.div
              initial={{ opacity: 0, x: isRTL ? -40 : 40 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col items-center"
            >
              <h2 className="text-2xl font-bold text-white mb-2 text-center">
                {isHebrew ? 'צברו דלק עכשיו!' : 'Earn fuel now!'}
              </h2>
              <p className="text-sm text-white/40 mb-1 text-center">
                {isHebrew
                  ? `יש ${TOTAL_SOCIAL_CREDITS} יחידות דלק שמחכות לכם`
                  : `${TOTAL_SOCIAL_CREDITS} fuel units are waiting for you`}
              </p>
              <p className="text-xs text-white/30 mb-6 text-center">
                {isHebrew ? 'תמיד אפשר לחזור ולהשלים' : 'You can always come back later'}
              </p>

              {/* Top 3 social tasks */}
              <div className="w-full space-y-3 mb-6">
                {topTasks.map(([taskId, task]) => (
                  <FuelCard
                    key={taskId}
                    taskId={taskId}
                    credits={task.credits}
                    label={isHebrew ? task.labelHe : task.label}
                    url={task.url}
                    icon={task.icon}
                  />
                ))}
              </div>

              {/* See all tasks link */}
              <button
                onClick={handleGoToFuelUp}
                className="flex items-center gap-1.5 text-sm text-[#00FF9D]/70 hover:text-[#00FF9D] transition-colors mb-6"
              >
                <ChevronDown className="w-4 h-4" />
                {isHebrew
                  ? `ראו את כל ${Object.keys(SOCIAL_TASK_REWARDS).length} המשימות`
                  : `See all ${Object.keys(SOCIAL_TASK_REWARDS).length} tasks`}
              </button>

              {/* CTA */}
              <Button
                onClick={handleFinish}
                size="lg"
                className="w-full min-h-[52px] gap-2 rounded-full text-base font-semibold bg-[#00FF9D] text-black hover:bg-[#00FF9D]/90 hover:shadow-[0_0_30px_rgba(0,255,157,0.3)]"
              >
                <Rocket className="w-5 h-5" />
                {isHebrew ? 'קדימה לדשבורד!' : 'Go to Dashboard!'}
              </Button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
