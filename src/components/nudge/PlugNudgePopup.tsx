import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { X, Zap, UserCircle, MessageCircle, Gift } from 'lucide-react';
import { NUDGES, type NudgeConfig } from './nudgeConfig';

const STORAGE_KEY_TIME  = 'plug_last_nudge';
const STORAGE_KEY_INDEX = 'plug_nudge_index';

const PERIODIC_MS   = 4 * 60 * 60 * 1000;  // every 4h of active use
const INACTIVITY_MS = 30 * 60 * 1000;       // after 30min idle
const MIN_COOLDOWN  = 60 * 60 * 1000;       // never closer than 1h apart

const ICONS: Record<NudgeConfig['type'], React.ElementType> = {
  credits:  Zap,
  profile:  UserCircle,
  chat:     MessageCircle,
  referral: Gift,
};

// Accent color per nudge type — applied as inline-start border + icon tint
const ACCENT_COLOR: Record<NudgeConfig['type'], string> = {
  credits:  'hsl(var(--primary))',
  profile:  'hsl(var(--accent))',
  chat:     '#38bdf8',
  referral: 'hsl(var(--primary))',
};

const ICON_CLASS: Record<NudgeConfig['type'], string> = {
  credits:  'text-primary',
  profile:  'text-accent',
  chat:     'text-sky-400',
  referral: 'text-primary',
};

function getNextNudge(): { nudge: NudgeConfig; nextIndex: number } {
  const idx = parseInt(localStorage.getItem(STORAGE_KEY_INDEX) || '0', 10) % NUDGES.length;
  return { nudge: NUDGES[idx], nextIndex: (idx + 1) % NUDGES.length };
}

function lastNudgeTime(): number {
  return parseInt(localStorage.getItem(STORAGE_KEY_TIME) || '0', 10);
}

export function PlugNudgePopup() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isHe = language === 'he';
  const [visible, setVisible] = useState(false);
  const [nudge, setNudge]     = useState<NudgeConfig>(NUDGES[0]);
  const lastActivityRef       = useRef<number>(Date.now());

  // Track user activity to detect idle
  useEffect(() => {
    const update = () => { lastActivityRef.current = Date.now(); };
    const events = ['mousemove', 'keydown', 'touchstart', 'click', 'scroll'];
    events.forEach(e => window.addEventListener(e, update, { passive: true }));
    return () => events.forEach(e => window.removeEventListener(e, update));
  }, []);

  const checkAndShow = useCallback(() => {
    if (visible) return;
    const now        = Date.now();
    const sinceShown = now - lastNudgeTime();
    if (sinceShown < MIN_COOLDOWN) return;

    const periodic = sinceShown >= PERIODIC_MS;
    const idle     = (now - lastActivityRef.current) >= INACTIVITY_MS;

    if (periodic || idle) {
      const { nudge: n } = getNextNudge();
      setNudge(n);
      setVisible(true);
    }
  }, [visible]);

  useEffect(() => {
    const initial  = setTimeout(checkAndShow, 5_000);
    const interval = setInterval(checkAndShow, 60_000);
    return () => { clearTimeout(initial); clearInterval(interval); };
  }, [checkAndShow]);

  const dismiss = () => {
    const { nextIndex } = getNextNudge();
    localStorage.setItem(STORAGE_KEY_TIME,  Date.now().toString());
    localStorage.setItem(STORAGE_KEY_INDEX, nextIndex.toString());
    lastActivityRef.current = Date.now();
    setVisible(false);
  };

  const handleCta = () => { dismiss(); navigate(nudge.route); };

  const Icon        = ICONS[nudge.type];
  const accentColor = ACCENT_COLOR[nudge.type];
  const iconClass   = ICON_CLASS[nudge.type];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: isHe ? -64 : 64, y: 8 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: isHe ? -64 : 64, y: 8 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          className="fixed bottom-6 end-6 z-50 w-80"
          dir={isHe ? 'rtl' : 'ltr'}
        >
          <div
            className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
            style={{
              borderInlineStartWidth: '4px',
              borderInlineStartColor: accentColor,
              borderInlineStartStyle: 'solid',
            }}
          >
            <div className="p-4">
              {/* Header row */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Icon className={`w-4 h-4 ${iconClass}`} />
                  </div>
                  {(nudge.badgeHe || nudge.badgeEn) && (
                    <span className="px-2 py-0.5 bg-primary/15 text-primary text-xs font-semibold rounded-full">
                      {isHe ? nudge.badgeHe : nudge.badgeEn}
                    </span>
                  )}
                </div>
                <button
                  onClick={dismiss}
                  className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
                  aria-label={isHe ? 'סגור' : 'Dismiss'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Content */}
              <h3 className="font-semibold text-sm text-foreground mb-1 leading-snug">
                {isHe ? nudge.titleHe : nudge.titleEn}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                {isHe ? nudge.descHe : nudge.descEn}
              </p>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCta}
                  className="flex-1 py-2 px-3 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
                >
                  {isHe ? nudge.ctaHe : nudge.ctaEn}
                </button>
                <button
                  onClick={dismiss}
                  className="py-2 px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
                >
                  {isHe ? 'לא עכשיו' : 'Later'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
