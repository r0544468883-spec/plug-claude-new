import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { X, Zap, UserCircle, MessageCircle, Gift } from 'lucide-react';
import { NUDGES, type NudgeConfig } from './nudgeConfig';

const STORAGE_KEY_TIME  = 'plug_last_nudge';
const STORAGE_KEY_INDEX = 'plug_nudge_index';

const PERIODIC_MS   = 2 * 60 * 60 * 1000;  // show every 2h of use
const INACTIVITY_MS = 15 * 60 * 1000;       // show after 15min idle
const MIN_COOLDOWN  = 30 * 60 * 1000;       // never show twice within 30min

const ICONS: Record<NudgeConfig['type'], React.ElementType> = {
  credits:  Zap,
  profile:  UserCircle,
  chat:     MessageCircle,
  referral: Gift,
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
  const [visible, setVisible]     = useState(false);
  const [nudge, setNudge]         = useState<NudgeConfig>(NUDGES[0]);
  const lastActivityRef           = useRef<number>(Date.now());

  // ── Track user activity ──────────────────────────────────
  useEffect(() => {
    const update = () => { lastActivityRef.current = Date.now(); };
    const events = ['mousemove', 'keydown', 'touchstart', 'click', 'scroll'];
    events.forEach(e => window.addEventListener(e, update, { passive: true }));
    return () => events.forEach(e => window.removeEventListener(e, update));
  }, []);

  // ── Check if we should show ──────────────────────────────
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

  if (!visible) return null;

  const Icon = ICONS[nudge.type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={dismiss} />

      {/* Card — uses CSS gradient class from index.css */}
      <div
        className={`relative w-full max-w-sm rounded-2xl ${nudge.gradientClass} p-6 shadow-2xl text-white animate-in fade-in zoom-in-95 duration-200`}
        style={{ direction: isHe ? 'rtl' : 'ltr' }}
      >
        {/* Close */}
        <button
          onClick={dismiss}
          className="absolute top-4 end-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        {/* Icon + badge */}
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-12 h-12 rounded-xl ${nudge.iconBg} flex items-center justify-center shrink-0`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          {(nudge.badgeHe || nudge.badgeEn) && (
            <span className="mt-1 px-2 py-0.5 bg-white/20 text-white text-xs font-bold rounded-full border border-white/30">
              {isHe ? nudge.badgeHe : nudge.badgeEn}
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold mb-2 leading-snug pe-8">
          {isHe ? nudge.titleHe : nudge.titleEn}
        </h2>

        {/* Description */}
        <p className="text-white/80 text-sm leading-relaxed mb-6">
          {isHe ? nudge.descHe : nudge.descEn}
        </p>

        {/* CTA */}
        <button
          onClick={handleCta}
          className="w-full py-3 px-4 bg-white text-gray-900 font-semibold rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all text-sm"
        >
          {isHe ? nudge.ctaHe : nudge.ctaEn}
        </button>

        {/* Dismiss */}
        <button
          onClick={dismiss}
          className="w-full mt-3 text-center text-xs text-white/50 hover:text-white/80 transition-colors"
        >
          {isHe ? 'לא עכשיו' : 'Not now'}
        </button>
      </div>
    </div>
  );
}
