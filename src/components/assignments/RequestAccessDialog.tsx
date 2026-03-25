import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Lock, Send } from 'lucide-react';
import type { AssignmentTemplate } from './AssignmentCard';

interface RequestAccessDialogProps {
  template: AssignmentTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (templateId: string) => void;
}

export function RequestAccessDialog({ template, open, onOpenChange, onSuccess }: RequestAccessDialogProps) {
  const { user, profile } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const reset = () => setMessage('');

  const handleSubmit = async () => {
    if (!user || !template) return;
    setIsSending(true);
    try {
      const { error } = await supabase
        .from('assignment_access_requests' as any)
        .insert({
          template_id: template.id,
          requester_id: user.id,
          message: message.trim() || null,
        });

      if (error) throw error;

      // Notify template owner
      const requesterName = (profile as any)?.full_name || (isHebrew ? 'משתמש' : 'User');
      await supabase.from('notifications' as any).insert({
        user_id: template.created_by,
        type: 'access_request',
        title: isHebrew ? 'בקשת גישה למטלה' : 'Access request for your assignment',
        message: isHebrew
          ? `${requesterName} מבקש/ת גישה למטלה: "${template.title}"`
          : `${requesterName} requested access to: "${template.title}"`,
        metadata: { template_id: template.id, requester_id: user.id },
      }).catch(() => {});

      toast.success(isHebrew ? 'הבקשה נשלחה!' : 'Request sent!');
      onSuccess(template.id);
      reset();
      onOpenChange(false);
    } catch (err: any) {
      if (err?.code === '23505') {
        // Duplicate — already requested
        toast.info(isHebrew ? 'כבר שלחת בקשה למטלה הזו' : 'You already requested access to this assignment');
      } else {
        toast.error(isHebrew ? 'שגיאה בשליחת הבקשה' : 'Failed to send request');
      }
    } finally {
      setIsSending(false);
    }
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md" dir={isHebrew ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-500" />
            {isHebrew ? 'בקשת גישה למטלה' : 'Request Access'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Assignment info */}
          <div className="p-3 rounded-lg bg-muted/30 border">
            <p className="font-medium text-sm">{template.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isHebrew ? 'פורסם על ידי:' : 'Posted by:'}{' '}
              {template.profiles?.full_name || (isHebrew ? 'משתמש' : 'User')}
            </p>
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <Label>{isHebrew ? 'הסבר קצר (אופציונלי)' : 'Short explanation (optional)'}</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={isHebrew ? 'למה אתה מתאים למטלה הזו?' : 'Why are you a good fit for this assignment?'}
              rows={3}
              maxLength={300}
            />
            <p className="text-xs text-muted-foreground text-end">{message.length}/300</p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              {isHebrew ? 'ביטול' : 'Cancel'}
            </Button>
            <Button onClick={handleSubmit} disabled={isSending} className="flex-1 gap-2">
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {isHebrew ? 'שלח בקשה' : 'Send Request'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
