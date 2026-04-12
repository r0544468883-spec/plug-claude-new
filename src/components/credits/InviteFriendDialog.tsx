import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCredits } from '@/contexts/CreditsContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Copy, Check, MessageCircle, Send, UserPlus, PartyPopper } from 'lucide-react';

/**
 * Dialog for the "Invite a Friend" social task.
 * Generates a personalized invite message with referral link.
 * Listens for 'open-invite-friend' custom event from FuelCard.
 */
export function InviteFriendDialog() {
  const { user, profile } = useAuth();
  const { language } = useLanguage();
  const { awardCredits } = useCredits();
  const isHebrew = language === 'he';
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);
  const [showReminder, setShowReminder] = useState(false);

  const inviteUrl = `${window.location.origin}/?ref=${user?.id?.slice(0, 8) || 'plug'}`;
  const senderName = profile?.full_name || 'PLUG';

  const inviteMessageHe = `היי! 👋\nאני משתמש/ת ב-PLUG — פלטפורמה חכמה לחיפוש עבודה עם AI, קהילה מקצועית והמלצות.\nהצטרף/י דרך הלינק שלי:\n${inviteUrl}\n\n💡 חשוב: אחרי ההרשמה, סמן/י שאני הפניתי אותך (${profile?.email || senderName}) כדי ששנינו נקבל בונוס!\n\n— ${senderName}`;

  const inviteMessageEn = `Hey! 👋\nI'm using PLUG — a smart job search platform with AI, professional community, and endorsements.\nJoin through my link:\n${inviteUrl}\n\n💡 Important: After signing up, mark that I referred you (${profile?.email || senderName}) so we both get a bonus!\n\n— ${senderName}`;

  const inviteMessage = isHebrew ? inviteMessageHe : inviteMessageEn;

  const handleOpen = useCallback(() => setOpen(true), []);

  useEffect(() => {
    const handler = () => handleOpen();
    window.addEventListener('open-invite-friend', handler);
    return () => window.removeEventListener('open-invite-friend', handler);
  }, [handleOpen]);

  const copyMessage = () => {
    navigator.clipboard.writeText(inviteMessage);
    setCopied(true);
    toast.success(isHebrew ? 'ההודעה הועתקה!' : 'Message copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(inviteMessage)}`, '_blank');
    // Show reminder popup after sharing
    setTimeout(() => setShowReminder(true), 2000);
  };

  const shareTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(inviteMessage)}`, '_blank');
    setTimeout(() => setShowReminder(true), 2000);
  };

  const handleConfirmSent = async () => {
    try {
      const result = await awardCredits('social_task', 'invite_friend');
      if (result.success) {
        setSent(true);
        setShowReminder(false);
        toast.success(isHebrew ? '🎉 קיבלת 150 דלק!' : '🎉 You earned 150 fuel!');
      } else if (result.error?.includes('already')) {
        toast.info(isHebrew ? 'כבר השלמת משימה זו!' : 'Already completed!');
      }
    } catch {
      toast.error(isHebrew ? 'שגיאה' : 'Error');
    }
  };

  const handleClose = () => {
    setOpen(false);
    setCopied(false);
    setSent(false);
    setShowReminder(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else setOpen(true); }}>
      <DialogContent className="sm:max-w-md" dir={isHebrew ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#00FF9D]" />
            {isHebrew ? 'הזמן חבר/ה ל-PLUG' : 'Invite a Friend to PLUG'}
            <span className="text-xs bg-[#00FF9D]/20 text-[#00FF9D] px-2 py-0.5 rounded-full font-bold">
              +150
            </span>
          </DialogTitle>
        </DialogHeader>

        {sent ? (
          <div className="text-center py-6 space-y-3">
            <PartyPopper className="w-12 h-12 text-[#00FF9D] mx-auto" />
            <h3 className="font-bold text-lg">
              {isHebrew ? 'מעולה! ההזמנה נשלחה' : 'Awesome! Invitation sent'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isHebrew
                ? 'כשהחבר/ה שלך יירשם ויציין שהפנית אותו/ה, שניכם תקבלו בונוס נוסף!'
                : "When your friend signs up and marks you as referrer, you'll both get an extra bonus!"}
            </p>
            <Button onClick={handleClose} className="mt-4">
              {isHebrew ? 'סגור' : 'Close'}
            </Button>
          </div>
        ) : showReminder ? (
          <div className="space-y-4">
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">
                {isHebrew ? '⚡ תזכורת חשובה!' : '⚡ Important reminder!'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isHebrew
                  ? 'אמור/י לחבר/ה שלך לסמן בהרשמה שאת/ה הפנית אותו/ה — ככה שניכם מקבלים בונוס!'
                  : 'Tell your friend to mark you as their referrer during sign-up — that way you both get a bonus!'}
              </p>
            </div>

            <p className="text-sm text-center text-muted-foreground">
              {isHebrew ? 'שלחת את ההזמנה?' : 'Did you send the invite?'}
            </p>

            <div className="flex gap-2">
              <Button onClick={handleConfirmSent} className="flex-1 gap-2 bg-[#00FF9D] text-black hover:bg-[#00FF9D]/90">
                <Check className="w-4 h-4" />
                {isHebrew ? 'כן, שלחתי!' : 'Yes, I sent it!'}
              </Button>
              <Button variant="outline" onClick={() => setShowReminder(false)} className="flex-1">
                {isHebrew ? 'חזרה' : 'Back'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {isHebrew
                ? 'העתק את ההודעה למטה ושלח לחבר/ה. ההודעה כוללת לינק הפניה אישי.'
                : 'Copy the message below and send it to a friend. It includes your personal referral link.'}
            </p>

            {/* Invite message preview */}
            <div className="p-3 bg-muted/50 border rounded-lg text-sm whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
              {inviteMessage}
            </div>

            {/* Copy button */}
            <Button onClick={copyMessage} variant="outline" className="w-full gap-2">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {isHebrew ? 'העתק הודעה' : 'Copy Message'}
            </Button>

            {/* Share buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={shareWhatsApp}
                variant="outline"
                className="gap-2 text-green-600 hover:text-green-700"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </Button>
              <Button
                onClick={shareTelegram}
                variant="outline"
                className="gap-2 text-blue-500 hover:text-blue-600"
              >
                <Send className="w-4 h-4" />
                Telegram
              </Button>
            </div>

            {/* Manual confirm */}
            <Button
              onClick={() => setShowReminder(true)}
              className="w-full gap-2 bg-[#00FF9D] text-black hover:bg-[#00FF9D]/90"
            >
              <Check className="w-4 h-4" />
              {isHebrew ? 'שלחתי — תן לי את הדלק!' : "I sent it — give me the fuel!"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
