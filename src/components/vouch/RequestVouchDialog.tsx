import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { HandHeart, Copy, Check, Send, Loader2, Share2, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RequestVouchDialogProps {
  trigger?: React.ReactNode;
}

export function RequestVouchDialog({ trigger }: RequestVouchDialogProps) {
  const { user, profile } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const createLinkMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      // Generate a short link code
      const code = Math.random().toString(36).substring(2, 10);

      const { error } = await (supabase.from('vouch_requests') as any).insert({
        from_user_id: user.id,
        link_code: code,
        message: message.trim() || null,
      });

      if (error) throw error;
      return code;
    },
    onSuccess: (code) => {
      setLinkCode(code);
    },
    onError: () => {
      toast.error(isHebrew ? 'שגיאה ביצירת הלינק' : 'Failed to create link');
    },
  });

  const vouchUrl = linkCode ? `${window.location.origin}/vouch/${linkCode}` : '';

  const copyLink = () => {
    navigator.clipboard.writeText(vouchUrl);
    setCopied(true);
    toast.success(isHebrew ? 'הלינק הועתק!' : 'Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const text = isHebrew
      ? `היי, אשמח אם תוכל/י לכתוב עלי המלצה (Vouch) ב-PLUG:\n${vouchUrl}`
      : `Hey, I'd appreciate if you could write me a recommendation (Vouch) on PLUG:\n${vouchUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareLinkedIn = () => {
    const text = isHebrew
      ? `אשמח לקבל ממך המלצה ב-PLUG! ${vouchUrl}`
      : `I'd love to get your recommendation on PLUG! ${vouchUrl}`;
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(vouchUrl)}`, '_blank');
  };

  const handleReset = () => {
    setLinkCode(null);
    setMessage('');
    setCopied(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) handleReset(); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <HandHeart className="h-4 w-4" />
            {isHebrew ? 'בקש המלצה' : 'Request Vouch'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" dir={isHebrew ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HandHeart className="w-5 h-5 text-primary" />
            {isHebrew ? 'בקש המלצה' : 'Request a Vouch'}
          </DialogTitle>
        </DialogHeader>

        {!linkCode ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {isHebrew
                ? 'צור לינק אישי ושלח לאנשים שעבדו איתך. הם יוכלו לכתוב עליך המלצה גם אם הם לא רשומים ל-PLUG (ויוזמנו להירשם!).'
                : 'Create a personal link and send it to people who worked with you. They can vouch for you even if they\'re not on PLUG (they\'ll be invited to join!).'}
            </p>

            <div className="space-y-2">
              <Label>{isHebrew ? 'הודעה אישית (אופציונלי)' : 'Personal message (optional)'}</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={isHebrew
                  ? 'היי, אשמח אם תוכל/י לכתוב עלי המלצה קצרה...'
                  : 'Hey, I\'d appreciate a short recommendation about our work together...'}
                className="min-h-[80px] resize-none"
              />
            </div>

            <Button
              onClick={() => createLinkMutation.mutate()}
              disabled={createLinkMutation.isPending}
              className="w-full gap-2"
            >
              {createLinkMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {isHebrew ? 'צור לינק המלצה' : 'Create Vouch Link'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-2">
                {isHebrew ? 'הלינק שלך מוכן!' : 'Your link is ready!'}
              </p>
              <code className="text-xs bg-muted px-2 py-1 rounded break-all">{vouchUrl}</code>
            </div>

            <div className="flex gap-2">
              <Button onClick={copyLink} variant="outline" className="flex-1 gap-2">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {isHebrew ? 'העתק' : 'Copy'}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={shareWhatsApp} variant="outline" className="gap-2 text-green-600 hover:text-green-700">
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </Button>
              <Button onClick={shareLinkedIn} variant="outline" className="gap-2 text-blue-600 hover:text-blue-700">
                <Share2 className="w-4 h-4" />
                LinkedIn
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              {isHebrew
                ? 'אנשים שלא רשומים ל-PLUG יוזמנו להירשם → vouch = referral!'
                : 'Non-PLUG users will be invited to sign up → vouch = referral!'}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
