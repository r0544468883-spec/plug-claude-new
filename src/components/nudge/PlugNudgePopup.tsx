import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  X, Zap, UserCircle, MessageCircle, Gift,
  ClipboardList, Users, Puzzle, CreditCard,
  Award, Mail, Check,
} from 'lucide-react';
import { NUDGES, type NudgeConfig } from './nudgeConfig';

// ── Timing constants ───────────────────────────────────────
const STORAGE_KEY_TIME  = 'plug_last_nudge';
const STORAGE_KEY_SHOWN = 'plug_nudge_shown';
const PERIODIC_MS   = 4 * 60 * 60 * 1000;  // every 4h of active use
const INACTIVITY_MS = 30 * 60 * 1000;       // after 30min idle
const MIN_COOLDOWN  = 60 * 60 * 1000;       // never closer than 1h apart

// ── Icons ─────────────────────────────────────────────────
const ICONS: Record<NudgeConfig['type'], React.ElementType> = {
  credits:       Zap,
  profile:       UserCircle,
  chat:          MessageCircle,
  assignments:   ClipboardList,
  community:     Users,
  extension:     Puzzle,
  personal_card: CreditCard,
  vouch:         Award,
  ambassador:    Zap,
  whatsapp:      MessageCircle,
  newsletter:    Mail,
  referral:      Gift,
};

// ── Accent colours per type ────────────────────────────────
const ACCENT_COLOR: Record<NudgeConfig['type'], string> = {
  credits:       'hsl(var(--primary))',
  profile:       'hsl(var(--accent))',
  chat:          '#38bdf8',
  assignments:   'hsl(var(--primary))',
  community:     'hsl(var(--accent))',
  extension:     '#38bdf8',
  personal_card: 'hsl(var(--accent))',
  vouch:         '#f59e0b',
  ambassador:    'hsl(var(--primary))',
  whatsapp:      '#25d366',
  newsletter:    'hsl(var(--accent))',
  referral:      'hsl(var(--primary))',
};

const ICON_CLASS: Record<NudgeConfig['type'], string> = {
  credits:       'text-primary',
  profile:       'text-accent',
  chat:          'text-sky-400',
  assignments:   'text-primary',
  community:     'text-accent',
  extension:     'text-sky-400',
  personal_card: 'text-accent',
  vouch:         'text-amber-400',
  ambassador:    'text-primary',
  whatsapp:      'text-green-400',
  newsletter:    'text-accent',
  referral:      'text-primary',
};

// ── Random selection — each nudge shown once before repeat ─
function pickNudge(): NudgeConfig {
  const shown: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY_SHOWN) || '[]');
  const unshown = NUDGES.filter(n => !shown.includes(n.type));
  const pool    = unshown.length > 0 ? unshown : NUDGES;

  if (unshown.length === 0) localStorage.removeItem(STORAGE_KEY_SHOWN);

  const nudge   = pool[Math.floor(Math.random() * pool.length)];
  const newShown = unshown.length > 0 ? [...shown, nudge.type] : [nudge.type];
  localStorage.setItem(STORAGE_KEY_SHOWN, JSON.stringify(newShown));
  return nudge;
}

function lastNudgeTime(): number {
  return parseInt(localStorage.getItem(STORAGE_KEY_TIME) || '0', 10);
}

// ── Preview mode — ?nudge_preview=1 in URL ─────────────────
const IS_PREVIEW = new URLSearchParams(window.location.search).has('nudge_preview');

// ── Component ──────────────────────────────────────────────
export function PlugNudgePopup() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isHe = language === 'he';

  const [visible, setVisible]       = useState(false);
  const [nudge, setNudge]           = useState<NudgeConfig>(NUDGES[0]);
  const lastActivityRef             = useRef<number>(Date.now());
  const previewIdxRef               = useRef(0);

  // Track user activity to detect idle
  useEffect(() => {
    const update = () => { lastActivityRef.current = Date.now(); };
    const events = ['mousemove', 'keydown', 'touchstart', 'click', 'scroll'];
    events.forEach(e => window.addEventListener(e, update, { passive: true }));
    return () => events.forEach(e => window.removeEventListener(e, update));
  }, []);

  const showNudge = useCallback((n: NudgeConfig) => {
    setNudge(n);
    setVisible(true);
  }, []);

  const checkAndShow = useCallback(() => {
    if (visible) return;

    // Preview mode: show all nudges in order
    if (IS_PREVIEW) {
      if (previewIdxRef.current >= NUDGES.length) return;
      showNudge(NUDGES[previewIdxRef.current]);
      return;
    }

    const now        = Date.now();
    const sinceShown = now - lastNudgeTime();
    if (sinceShown < MIN_COOLDOWN) return;

    const periodic = sinceShown >= PERIODIC_MS;
    const idle     = (now - lastActivityRef.current) >= INACTIVITY_MS;

    if (periodic || idle) {
      showNudge(pickNudge());
    }
  }, [visible, showNudge]);

  useEffect(() => {
    const delay   = IS_PREVIEW ? 800 : 5_000;
    const initial = setTimeout(checkAndShow, delay);
    const interval = setInterval(checkAndShow, 60_000);
    return () => { clearTimeout(initial); clearInterval(interval); };
  }, [checkAndShow]);

  const dismiss = useCallback(() => {
    if (IS_PREVIEW) {
      previewIdxRef.current += 1;
      setVisible(false);
      if (previewIdxRef.current < NUDGES.length) {
        setTimeout(() => showNudge(NUDGES[previewIdxRef.current]), 350);
      }
      return;
    }

    localStorage.setItem(STORAGE_KEY_TIME, Date.now().toString());
    lastActivityRef.current = Date.now();
    setVisible(false);
  }, [showNudge]);

  const handleCta = useCallback(() => {
    dismiss();
    if (nudge.externalUrl) {
      window.open(nudge.externalUrl, '_blank', 'noopener,noreferrer');
    } else {
      navigate(nudge.route);
    }
  }, [dismiss, navigate, nudge]);

  const Icon        = ICONS[nudge.type];
  const accentColor = ACCENT_COLOR[nudge.type];
  const iconClass   = ICON_CLASS[nudge.type];

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop — click does NOT dismiss */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60"
          />

          {/* Card */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className="w-full max-w-sm pointer-events-auto"
              dir={isHe ? 'rtl' : 'ltr'}
            >
              <div
                className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
                style={{ borderTopWidth: '4px', borderTopColor: accentColor }}
              >
                <div className="p-5">

                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center shrink-0">
                        <Icon className={`w-5 h-5 ${iconClass}`} />
                      </div>
                      {(nudge.badgeHe || nudge.badgeEn) && (
                        <span
                          className="px-2.5 py-1 text-xs font-bold rounded-full"
                          style={{
                            background: `${accentColor}22`,
                            color: accentColor,
                            border: `1px solid ${accentColor}44`,
                          }}
                        >
                          {isHe ? nudge.badgeHe : nudge.badgeEn}
                        </span>
                      )}
                    </div>

                    {/* Preview counter */}
                    {IS_PREVIEW && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {previewIdxRef.current + 1} / {NUDGES.length}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h2 className="text-lg font-bold text-foreground mb-2 leading-snug">
                    {isHe ? nudge.titleHe : nudge.titleEn}
                  </h2>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    {isHe ? nudge.descHe : nudge.descEn}
                  </p>

                  {/* Feature bullets */}
                  {nudge.featuresHe.length > 0 && (
                    <ul className="space-y-1.5 mb-5">
                      {(isHe ? nudge.featuresHe : nudge.featuresEn).map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Check className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor }} />
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* CTA */}
                  <button
                    onClick={handleCta}
                    className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 cursor-pointer mb-2"
                    style={{ background: accentColor, color: nudge.type === 'credits' || nudge.type === 'assignments' || nudge.type === 'ambassador' || nudge.type === 'referral' ? 'hsl(var(--primary-foreground))' : '#fff' }}
                  >
                    {isHe ? nudge.ctaHe : nudge.ctaEn}
                  </button>

                  {/* Dismiss */}
                  <button
                    onClick={dismiss}
                    className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-center"
                  >
                    {isHe ? (nudge.dismissHe ?? 'לא עכשיו') : (nudge.dismissEn ?? 'Not now')}
                  </button>

                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
