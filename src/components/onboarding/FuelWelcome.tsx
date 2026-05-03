import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useCredits } from '@/contexts/CreditsContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { SOCIAL_TASK_REWARDS, TOTAL_SOCIAL_CREDITS } from '@/lib/credit-costs';
import { FuelCard } from '@/components/credits/FuelCard';
import { Button } from '@/components/ui/button';
import { Zap, Rocket, ArrowLeft, ArrowRight, Sparkles, Gem, Users, Heart, ChevronDown } from 'lucide-react';

interface FuelWelcomeProps {
  onComplete: () => void;
}

type Phase = 'reveal' | 'community' | 'spread' | 'grow';

// Phase 1 tasks (Distribution / הפצה)
const SPREAD_TASK_IDS = ['invite_friend', 'whatsapp_join', 'linkedin_follow', 'instagram_follow'];
// Phase 2 tasks (Growth)
const GROW_TASK_IDS = ['linkedin_post_share', 'facebook_follow', 'tiktok_follow', 'youtube_subscribe'];

export function FuelWelcome({ onComplete }: FuelWelcomeProps) {
  const { credits, totalCredits, markOnboarded } = useCredits();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isHebrew = language === 'he';
  const isRTL = isHebrew;

  const [phase, setPhase] = useState<Phase>('reveal');
  const [countUp, setCountUp] = useState(0);
  const [showContent, setShowContent] = useState(false);

  const targetCredits = totalCredits || 15;
  useEffect(() => {
    if (phase !== 'reveal') return;
    const duration = 1200;
    const steps = 30;
    const increment = targetCredits / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= targetCredits) {
        setCountUp(targetCredits);
        clearInterval(timer);
        setTimeout(() => setShowContent(true), 400);
      } else {
        setCountUp(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [phase, targetCredits]);

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

  const spreadTasks = SPREAD_TASK_IDS
    .map(id => [id, SOCIAL_TASK_REWARDS[id]] as const)
    .filter(([, t]) => t);

  const growTasks = GROW_TASK_IDS
    .map(id => [id, SOCIAL_TASK_REWARDS[id]] as const)
    .filter(([, t]) => t);

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
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="relative mb-6"
              >
                <div className="absolute inset-0 w-24 h-24 rounded-full bg-[#00FF9D]/20 blur-xl" />
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#00FF9D] to-emerald-600 flex items-center justify-center shadow-[0_0_60px_rgba(0,255,157,0.3)]">
                  <Gem className="w-12 h-12 text-black" />
                </div>
              </motion.div>

              <motion.div
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                className="text-6xl font-black text-[#00FF9D] mb-2 tabular-nums"
              >
                {countUp}
              </motion.div>
              <p className="text-lg text-white/60 font-medium mb-2">
                {isHebrew ? 'קרדיטים' : 'credits'}
              </p>

              <AnimatePresence>
                {showContent && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mt-4 space-y-4"
                  >
                    <h2 className="text-2xl font-bold text-white">
                      {isHebrew ? 'ברוכים הבאים למערכת הקרדיטים!' : 'Welcome to your Credits!'}
                    </h2>
                    <p className="text-white/50 text-sm leading-relaxed max-w-sm mx-auto">
                      {isHebrew
                        ? 'הקרדיטים מאפשרים לך להשתמש ביכולות ה-AI של PLUG — בניית קורות חיים, הכנה לראיונות, התאמת משרות ועוד.'
                        : 'Credits power all of PLUG\'s AI features — CV building, interview prep, job matching and more.'}
                    </p>

                    <Button
                      onClick={() => setPhase('community')}
                      size="lg"
                      className="mt-6 min-h-[52px] gap-2 rounded-full px-8 text-base font-semibold bg-[#00FF9D] text-black hover:bg-[#00FF9D]/90 hover:shadow-[0_0_30px_rgba(0,255,157,0.3)]"
                    >
                      {isHebrew ? 'למה קרדיטים?' : 'Why credits?'}
                      <ArrowIcon className="w-5 h-5" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── Phase 2: Community Story ── */}
          {phase === 'community' && (
            <motion.div
              initial={{ opacity: 0, x: isRTL ? -40 : 40 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col items-center text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className="relative mb-6"
              >
                <div className="absolute inset-0 w-20 h-20 rounded-full bg-purple-500/20 blur-xl" />
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-[#00FF9D] flex items-center justify-center">
                  <Users className="w-10 h-10 text-white" />
                </div>
              </motion.div>

              <h2 className="text-2xl font-bold text-white mb-3">
                {isHebrew ? 'PLUG הוא מנוע חברתי' : 'PLUG is a Social Engine'}
              </h2>

              <p className="text-white/50 text-sm leading-relaxed max-w-sm mx-auto mb-6">
                {isHebrew
                  ? 'PLUG לא עובד לבד — הוא גדל בזכות הקהילה. כל שיתוף, כל הזמנה, כל עוקב חדש הופך את המערכת לחכמה יותר, לרלוונטית יותר, ולמדויקת יותר. ככל שיותר אנשים מצטרפים ומשתפים — כולם מרוויחים.'
                  : 'PLUG doesn\'t work alone — it grows through community. Every share, every invite, every new follower makes the system smarter, more relevant, and more accurate. The more people join and share — everyone wins.'}
              </p>

              <div className="w-full space-y-3 mb-8">
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
                      {isHebrew ? 'קרדיטים יומיים' : 'Daily Credits'}
                    </p>
                    <p className="text-xs text-white/40 mt-0.5">
                      {isHebrew
                        ? 'מתחדשים כל יום — 15 יחידות (יותר ככל שתתקדמו בדרגה)'
                        : 'Refill every day — 15 units (more as you level up)'}
                    </p>
                  </div>
                </motion.div>

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
                      {isHebrew ? 'קרדיטים קבועים' : 'Permanent Credits'}
                    </p>
                    <p className="text-xs text-white/40 mt-0.5">
                      {isHebrew
                        ? 'נצברים ממשימות שיתוף, הזמנות חברים, ומעקבים — לא נעלמים!'
                        : 'Earned from sharing tasks, inviting friends, and follows — never expire!'}
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  className="flex items-center gap-4 p-4 rounded-xl border border-[#00FF9D]/20 bg-[#00FF9D]/[0.03]"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#00FF9D]/10 flex items-center justify-center shrink-0">
                    <Heart className="w-6 h-6 text-[#00FF9D]" />
                  </div>
                  <div className="text-start flex-1">
                    <p className="font-semibold text-white text-sm">
                      {isHebrew ? 'שיתוף = צמיחה' : 'Sharing = Growth'}
                    </p>
                    <p className="text-xs text-white/40 mt-0.5">
                      {isHebrew
                        ? 'כל שיתוף שלכם מחזק את PLUG, מביא חברים חדשים, ומזכה אתכם בקרדיטים'
                        : 'Every share strengthens PLUG, brings new members, and earns you credits'}
                    </p>
                  </div>
                </motion.div>
              </div>

              <Button
                onClick={() => setPhase('spread')}
                size="lg"
                className="min-h-[52px] gap-2 rounded-full px-8 text-base font-semibold bg-[#00FF9D] text-black hover:bg-[#00FF9D]/90 hover:shadow-[0_0_30px_rgba(0,255,157,0.3)]"
              >
                {isHebrew ? 'בואו נתחיל להפיץ!' : 'Let\'s start spreading!'}
                <ArrowIcon className="w-5 h-5" />
              </Button>
            </motion.div>
          )}

          {/* ── Phase 3: Spread (Distribution) ── */}
          {phase === 'spread' && (
            <motion.div
              initial={{ opacity: 0, x: isRTL ? -40 : 40 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col items-center"
            >
              <Sparkles className="w-10 h-10 text-[#00FF9D] mb-3" />
              <h2 className="text-2xl font-bold text-white mb-2 text-center">
                {isHebrew ? 'שלב 1: הפצה' : 'Step 1: Spread the Word'}
              </h2>
              <p className="text-sm text-white/40 mb-1 text-center max-w-sm">
                {isHebrew
                  ? 'הזמינו חברים, הצטרפו לקהילה, ועקבו אחרינו. כל פעולה מזכה בקרדיטים!'
                  : 'Invite friends, join the community, and follow us. Every action earns credits!'}
              </p>
              <p className="text-xs text-white/30 mb-6 text-center">
                {isHebrew ? 'תמיד אפשר לחזור ולהשלים' : 'You can always come back later'}
              </p>

              <div className="w-full space-y-3 mb-6">
                {spreadTasks.map(([taskId, task]) => (
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

              <Button
                onClick={() => setPhase('grow')}
                size="lg"
                className="w-full min-h-[52px] gap-2 rounded-full text-base font-semibold bg-[#00FF9D] text-black hover:bg-[#00FF9D]/90 hover:shadow-[0_0_30px_rgba(0,255,157,0.3)]"
              >
                {isHebrew ? 'המשך לשלב 2' : 'Continue to Step 2'}
                <ArrowIcon className="w-5 h-5" />
              </Button>
            </motion.div>
          )}

          {/* ── Phase 4: Grow (Follow & Share) ── */}
          {phase === 'grow' && (
            <motion.div
              initial={{ opacity: 0, x: isRTL ? -40 : 40 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col items-center"
            >
              <Rocket className="w-10 h-10 text-purple-400 mb-3" />
              <h2 className="text-2xl font-bold text-white mb-2 text-center">
                {isHebrew ? 'שלב 2: צמיחה' : 'Step 2: Grow Together'}
              </h2>
              <p className="text-sm text-white/40 mb-1 text-center max-w-sm">
                {isHebrew
                  ? 'שתפו את PLUG ברשתות, עקבו והרשמו — ככה כולנו גדלים ביחד.'
                  : 'Share PLUG on social, follow and subscribe — that\'s how we all grow together.'}
              </p>
              <p className="text-xs text-white/30 mb-6 text-center">
                {isHebrew
                  ? `סה"כ ${TOTAL_SOCIAL_CREDITS} קרדיטים מחכים לכם`
                  : `${TOTAL_SOCIAL_CREDITS} total credits are waiting for you`}
              </p>

              <div className="w-full space-y-3 mb-6">
                {growTasks.map(([taskId, task]) => (
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
