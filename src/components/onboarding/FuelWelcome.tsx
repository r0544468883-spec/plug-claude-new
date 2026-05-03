import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useCredits } from '@/contexts/CreditsContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { SOCIAL_TASK_REWARDS, TOTAL_SOCIAL_CREDITS } from '@/lib/credit-costs';
import { FuelCard } from '@/components/credits/FuelCard';
import { Button } from '@/components/ui/button';
import { Rocket, ArrowLeft, ArrowRight, Sparkles, Gem, Users, Heart, ChevronDown } from 'lucide-react';

interface FuelWelcomeProps {
  onComplete: () => void;
}

type Phase = 'reveal' | 'community' | 'spread' | 'grow';

// Phase 1 tasks (Distribution)
const SPREAD_TASK_IDS = ['invite_friend', 'whatsapp_join', 'linkedin_follow', 'instagram_follow'];
// Phase 2 tasks (Growth)
const GROW_TASK_IDS = ['linkedin_post_share', 'facebook_follow', 'tiktok_follow', 'youtube_subscribe'];

// ── Typewriter hook ────────────────────────────────────────────────────────────
function useTypewriter(text: string, speed = 25, startDelay = 0, enabled = true) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!enabled) { setDisplayed(''); setDone(false); return; }
    setDisplayed('');
    setDone(false);
    let i = 0;
    const delayTimer = setTimeout(() => {
      const timer = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(timer);
          setDone(true);
        }
      }, speed);
      return () => clearInterval(timer);
    }, startDelay);
    return () => clearTimeout(delayTimer);
  }, [text, speed, startDelay, enabled]);

  return { displayed, done };
}

// ── Typewriter component ───────────────────────────────────────────────────────
function TypewriterText({
  text, speed = 25, delay = 0, className, onDone,
}: {
  text: string; speed?: number; delay?: number; className?: string; onDone?: () => void;
}) {
  const { displayed, done } = useTypewriter(text, speed, delay, true);
  useEffect(() => { if (done && onDone) onDone(); }, [done, onDone]);
  return (
    <span className={className}>
      {displayed}
      {!done && <span className="inline-block w-[2px] h-[1em] bg-[#00FF9D] ml-0.5 animate-pulse align-text-bottom" />}
    </span>
  );
}

export function FuelWelcome({ onComplete }: FuelWelcomeProps) {
  const { credits, totalCredits, markOnboarded } = useCredits();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isHebrew = language === 'he';
  const isRTL = isHebrew;

  const [phase, setPhase] = useState<Phase>('reveal');
  const [countUp, setCountUp] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [titleDone, setTitleDone] = useState(false);
  const [descDone, setDescDone] = useState(false);

  // Lower z-index when invite dialog opens so it's visible
  const [inviteOpen, setInviteOpen] = useState(false);
  useEffect(() => {
    const onOpen = () => setInviteOpen(true);
    const onClose = () => setInviteOpen(false);
    window.addEventListener('open-invite-friend', onOpen);
    window.addEventListener('close-invite-friend', onClose);
    return () => {
      window.removeEventListener('open-invite-friend', onOpen);
      window.removeEventListener('close-invite-friend', onClose);
    };
  }, []);

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
    if (credits && !credits.is_onboarded) markOnboarded();
  }, [credits, markOnboarded]);

  // Reset typewriter state on phase change
  useEffect(() => {
    setTitleDone(false);
    setDescDone(false);
  }, [phase]);

  const handleFinish = () => onComplete();
  const handleGoToFuelUp = () => { onComplete(); navigate('/fuel-up'); };

  const spreadTasks = SPREAD_TASK_IDS
    .map(id => [id, SOCIAL_TASK_REWARDS[id]] as const)
    .filter(([, t]) => t);

  const growTasks = GROW_TASK_IDS
    .map(id => [id, SOCIAL_TASK_REWARDS[id]] as const)
    .filter(([, t]) => t);

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  // ── Copy variants for reveal phase ──
  const revealTitle = isHebrew ? 'הקרדיטים הראשונים שלכם מוכנים!' : 'Your first credits are ready!';
  const revealDesc = isHebrew
    ? 'כל קרדיט הוא צעד קדימה בקריירה — בניית קורות חיים חכמים, הכנה אישית לראיונות, חיפוש משרות ממוקד, וניתוח התאמה. אבל הכוח האמיתי הוא בקהילה: ככל שיותר אנשים מצטרפים ומשתפים, המערכת משתפרת וכולם מרוויחים יותר.'
    : 'Each credit is a step forward in your career — smart CV building, personalized interview prep, targeted job search, and match analysis. But the real power is in the community: the more people join and share, the better the system gets for everyone.';

  const communityTitle = isHebrew ? 'PLUG הוא מנוע חברתי' : 'PLUG is a Social Engine';
  const communityDesc = isHebrew
    ? 'PLUG לא עובד לבד — הוא גדל בזכות הקהילה. כל שיתוף, כל הזמנה, כל עוקב חדש הופך את המערכת לחכמה יותר, לרלוונטית יות��, ולמדויקת יותר. ככל שיותר אנשים מצטרפים ומשתפים — כולם מרוויחים.'
    : 'PLUG doesn\'t work alone — it grows through community. Every share, invite, and new follower makes the platform smarter, more relevant, and more accurate. The more people join and share — everyone wins.';

  const spreadTitle = isHebrew ? 'שלב 1: הפצה' : 'Step 1: Spread the Word';
  const spreadDesc = isHebrew
    ? 'הזמינו חברים, הצטרפו לקהילה, ועקבו אחרינו — כל פעולה מזכה בקרדיטים!'
    : 'Invite friends, join the community, and follow us — every action earns credits!';

  const growTitle = isHebrew ? 'שלב 2: צמיחה' : 'Step 2: Grow Together';
  const growDesc = isHebrew
    ? 'שתפו את PLUG ברשתות, עקבו והרשמו — ככה כולנו גדלים ביחד.'
    : 'Share PLUG on social, follow and subscribe — that\'s how we all grow together.';

  const onTitleDone = useCallback(() => setTitleDone(true), []);
  const onDescDone = useCallback(() => setDescDone(true), []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 flex items-center justify-center overflow-y-auto"
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{ background: 'hsl(220 47% 5.5%)', zIndex: inviteOpen ? 40 : 110 }}
      >
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-120px] right-[-120px] w-[400px] h-[400px] rounded-full bg-[#00FF9D]/5 blur-[120px]" />
          <div className="absolute bottom-[-120px] left-[-120px] w-[400px] h-[400px] rounded-full bg-purple-500/5 blur-[120px]" />
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-[#00FF9D]/30"
              animate={{ y: [0, -200, 0], x: [0, (i % 2 ? 30 : -30), 0], opacity: [0, 0.6, 0] }}
              transition={{ duration: 4 + i, repeat: Infinity, delay: i * 0.7 }}
              style={{ left: `${15 + i * 14}%`, top: `${60 + (i % 3) * 10}%` }}
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
                className="text-7xl font-black text-[#00FF9D] mb-2 tabular-nums"
              >
                {countUp}
              </motion.div>
              <p className="text-xl text-white/70 font-semibold mb-2">
                {isHebrew ? 'קרדיטים' : 'credits'}
              </p>

              <AnimatePresence>
                {showContent && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mt-6 space-y-5"
                  >
                    <h2 className="text-3xl font-bold text-white min-h-[2.4em]">
                      <TypewriterText text={revealTitle} speed={40} onDone={onTitleDone} />
                    </h2>

                    {titleDone && (
                      <p className="text-white/80 text-base leading-relaxed max-w-md mx-auto min-h-[4em]">
                        <TypewriterText text={revealDesc} speed={18} delay={200} onDone={onDescDone} />
                      </p>
                    )}

                    {descDone && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <Button
                          onClick={() => setPhase('community')}
                          size="lg"
                          className="mt-4 min-h-[52px] gap-2 rounded-full px-8 text-base font-semibold bg-[#00FF9D] text-black hover:bg-[#00FF9D]/90 hover:shadow-[0_0_30px_rgba(0,255,157,0.3)]"
                        >
                          {isHebrew ? 'איך מרוויחים עוד?' : 'How to earn more?'}
                          <ArrowIcon className="w-5 h-5" />
                        </Button>
                      </motion.div>
                    )}
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

              <h2 className="text-3xl font-bold text-white mb-4 min-h-[1.5em]">
                <TypewriterText text={communityTitle} speed={40} onDone={onTitleDone} />
              </h2>

              {titleDone && (
                <p className="text-white/80 text-base leading-relaxed max-w-md mx-auto mb-8 min-h-[4em]">
                  <TypewriterText text={communityDesc} speed={15} delay={200} onDone={onDescDone} />
                </p>
              )}

              {descDone && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full space-y-3 mb-8"
                >
                  {[
                    {
                      icon: <Gem className="w-6 h-6 text-amber-400" />,
                      bg: 'bg-amber-500/10',
                      titleText: isHebrew ? 'קרדיטים יומיים' : 'Daily Credits',
                      desc: isHebrew ? 'מתחדשים כל יום — 15 יחידות (יותר ככל שתתקדמו בדרגה)' : 'Refill every day — 15 units (more as you level up)',
                    },
                    {
                      icon: <Sparkles className="w-6 h-6 text-purple-400" />,
                      bg: 'bg-purple-500/10',
                      titleText: isHebrew ? 'קרדיטים קבועים' : 'Permanent Credits',
                      desc: isHebrew ? 'נצברים ממשימות שיתוף, הזמנות חברים, ומעקבים — לא נעלמים!' : 'Earned from sharing tasks, inviting friends, and follows — never expire!',
                    },
                    {
                      icon: <Heart className="w-6 h-6 text-[#00FF9D]" />,
                      bg: 'bg-[#00FF9D]/10',
                      titleText: isHebrew ? 'ש��תוף = צמיחה' : 'Sharing = Growth',
                      desc: isHebrew ? 'כל שיתוף שלכם מחזק את PLUG, מביא חברים חדשים, ומזכה אתכם בקרדיטים' : 'Every share strengthens PLUG, brings new members, and earns you credits',
                      border: 'border-[#00FF9D]/20',
                    },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.15 }}
                      className={`flex items-center gap-4 p-4 rounded-xl border ${item.border || 'border-white/10'} bg-white/[0.03]`}
                    >
                      <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>
                        {item.icon}
                      </div>
                      <div className="text-start flex-1">
                        <p className="font-semibold text-white text-sm">{item.titleText}</p>
                        <p className="text-xs text-white/50 mt-0.5">{item.desc}</p>
                      </div>
                    </motion.div>
                  ))}

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="pt-2"
                  >
                    <Button
                      onClick={() => setPhase('spread')}
                      size="lg"
                      className="w-full min-h-[52px] gap-2 rounded-full text-base font-semibold bg-[#00FF9D] text-black hover:bg-[#00FF9D]/90 hover:shadow-[0_0_30px_rgba(0,255,157,0.3)]"
                    >
                      {isHebrew ? 'בואו נתחיל להפיץ!' : 'Let\'s start spreading!'}
                      <ArrowIcon className="w-5 h-5" />
                    </Button>
                  </motion.div>
                </motion.div>
              )}
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

              <h2 className="text-3xl font-bold text-white mb-2 text-center min-h-[1.5em]">
                <TypewriterText text={spreadTitle} speed={40} onDone={onTitleDone} />
              </h2>

              {titleDone && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
                  <p className="text-base text-white/70 mb-1 text-center max-w-sm mx-auto min-h-[1.5em]">
                    <TypewriterText text={spreadDesc} speed={18} delay={100} onDone={onDescDone} />
                  </p>
                </motion.div>
              )}

              {descDone && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full">
                  <p className="text-sm text-white/40 mb-6 text-center">
                    {isHebrew ? 'תמיד אפשר לחזור ולהשלים' : 'You can always come back later'}
                  </p>

                  <div className="w-full space-y-3 mb-6">
                    {spreadTasks.map(([taskId, task], i) => (
                      <motion.div
                        key={taskId}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <FuelCard
                          taskId={taskId}
                          credits={task.credits}
                          label={isHebrew ? task.labelHe : task.label}
                          url={task.url}
                          icon={task.icon}
                        />
                      </motion.div>
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

              <h2 className="text-3xl font-bold text-white mb-2 text-center min-h-[1.5em]">
                <TypewriterText text={growTitle} speed={40} onDone={onTitleDone} />
              </h2>

              {titleDone && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
                  <p className="text-base text-white/70 mb-1 text-center max-w-sm mx-auto min-h-[1.5em]">
                    <TypewriterText text={growDesc} speed={18} delay={100} onDone={onDescDone} />
                  </p>
                </motion.div>
              )}

              {descDone && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full">
                  <p className="text-sm text-white/40 mb-6 text-center">
                    {isHebrew
                      ? `סה"כ ${TOTAL_SOCIAL_CREDITS} קרדיטים מחכים לכם`
                      : `${TOTAL_SOCIAL_CREDITS} total credits are waiting for you`}
                  </p>

                  <div className="w-full space-y-3 mb-6">
                    {growTasks.map(([taskId, task], i) => (
                      <motion.div
                        key={taskId}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <FuelCard
                          taskId={taskId}
                          credits={task.credits}
                          label={isHebrew ? task.labelHe : task.label}
                          url={task.url}
                          icon={task.icon}
                        />
                      </motion.div>
                    ))}
                  </div>

                  <button
                    onClick={handleGoToFuelUp}
                    className="flex items-center justify-center gap-1.5 text-sm text-[#00FF9D]/70 hover:text-[#00FF9D] transition-colors mb-6 w-full"
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
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
