import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCredits } from '@/contexts/CreditsContext';
import { Share2, X, UserPlus, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface SharePromptProps {
  /** Trigger text shown to user (Hebrew / English) */
  messageHe: string;
  messageEn: string;
  /** Optional: pre-filled share text */
  shareText?: string;
  /** Show/hide */
  visible: boolean;
  onDismiss: () => void;
}

const PLUG_URL = 'https://www.plug-hr.com';

export function SharePrompt({ messageHe, messageEn, shareText, visible, onDismiss }: SharePromptProps) {
  const { language } = useLanguage();
  const { credits } = useCredits();
  const isHe = language === 'he';
  const [copied, setCopied] = useState(false);

  const referralCode = credits?.referral_code;
  const shareUrl = referralCode ? `${PLUG_URL}?ref=${referralCode}` : PLUG_URL;
  const defaultText = isHe
    ? `PLUG עזר לי במציאת עבודה עם AI! מומלץ בחום - ${shareUrl}`
    : `PLUG helped me with my job search using AI! Highly recommended - ${shareUrl}`;
  const text = shareText ? `${shareText}\n${shareUrl}` : defaultText;

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    onDismiss();
  };

  const shareLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
    onDismiss();
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success(isHe ? 'הקישור הועתק!' : 'Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="relative mt-3 p-4 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent"
          dir={isHe ? 'rtl' : 'ltr'}
        >
          <button
            onClick={onDismiss}
            className="absolute top-2 end-2 p-1 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <UserPlus className="w-4.5 h-4.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground leading-snug">
                {isHe ? messageHe : messageEn}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isHe ? 'שתפו חבר/ה וקבלו +5 קרדיטים לכל הזמנה' : 'Share with a friend and earn +5 credits per invite'}
              </p>

              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={shareWhatsApp}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors"
                >
                  <Share2 className="w-3 h-3" />
                  WhatsApp
                </button>
                <button
                  onClick={shareLinkedIn}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
                >
                  <Share2 className="w-3 h-3" />
                  LinkedIn
                </button>
                <button
                  onClick={copyLink}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
                  {isHe ? 'העתק' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
