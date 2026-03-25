import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Zap, FileText, Loader2 } from 'lucide-react';

interface QuickPingButtonProps {
  toUserId: string;
  toUserName: string;
  /** Context for auto-generated message */
  context?: 'feed_post' | 'suggested' | 'people_you_know';
  size?: 'sm' | 'default';
  className?: string;
}

export function QuickPingButton({ toUserId, toUserName, context = 'suggested', size = 'sm', className }: QuickPingButtonProps) {
  const { user, profile } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingType, setPendingType] = useState<'ping' | 'ping_cv' | null>(null);

  const myName = (profile as any)?.full_name || '';

  const generateMessage = (type: 'ping' | 'ping_cv'): string => {
    if (isHebrew) {
      const greet = `היי ${toUserName},`;
      const contextLine = {
        feed_post: `ראיתי את הפוסט שלך ב-PLUG Social ורציתי ליצור קשר.`,
        suggested: `אני מחפש/ת עבודה ורציתי להציג את עצמי.`,
        people_you_know: `ראיתי שאנחנו בתחומים דומים ורציתי ליצור קשר.`,
      }[context];
      const cvLine = type === 'ping_cv' ? `\nמצורף קורות החיים שלי לעיון.` : '';
      return `${greet}\n${contextLine}${cvLine}\n\nבברכה,\n${myName}`;
    } else {
      const greet = `Hi ${toUserName},`;
      const contextLine = {
        feed_post: `I saw your post on PLUG Social and wanted to connect.`,
        suggested: `I'm looking for opportunities and wanted to introduce myself.`,
        people_you_know: `I noticed we're in similar fields and wanted to connect.`,
      }[context];
      const cvLine = type === 'ping_cv' ? `\nI've attached my resume for your review.` : '';
      return `${greet}\n${contextLine}${cvLine}\n\nBest,\n${myName}`;
    }
  };

  const sendPing = useMutation({
    mutationFn: async ({ type, cvFile }: { type: 'ping' | 'ping_cv'; cvFile?: File }) => {
      if (!user?.id) throw new Error('Not authenticated');

      let attachmentData: { url: string; name: string; type: string; size: number } | undefined;

      // Upload CV if provided
      if (cvFile) {
        const fileExt = cvFile.name.split('.').pop();
        const sanitizedName = cvFile.name.replace(/[^\x00-\x7F]/g, '').replace(/\s+/g, '_');
        const fileName = `${user.id}/${Date.now()}_${sanitizedName}`;
        const { error: uploadError } = await supabase.storage.from('message-attachments').upload(fileName, cvFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('message-attachments').getPublicUrl(fileName);
        attachmentData = { url: publicUrl, name: cvFile.name, type: cvFile.type, size: cvFile.size };
      }

      // Find or create conversation
      const participant1 = user.id < toUserId ? user.id : toUserId;
      const participant2 = user.id < toUserId ? toUserId : user.id;

      let { data: existingConvo } = await supabase
        .from('conversations')
        .select('id')
        .eq('participant_1', participant1)
        .eq('participant_2', participant2)
        .single();

      let conversationId: string;
      if (existingConvo) {
        conversationId = existingConvo.id;
      } else {
        const { data: newConvo, error: convoError } = await supabase
          .from('conversations')
          .insert({ participant_1: participant1, participant_2: participant2 })
          .select('id')
          .single();
        if (convoError) throw convoError;
        conversationId = newConvo.id;
      }

      const content = generateMessage(type);

      const { error: msgError } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        from_user_id: user.id,
        to_user_id: toUserId,
        content,
        attachment_url: attachmentData?.url || null,
        attachment_name: attachmentData?.name || null,
        attachment_type: attachmentData?.type || null,
        attachment_size: attachmentData?.size || null,
      });
      if (msgError) throw msgError;

      await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId);
    },
    onSuccess: () => {
      const msg = pendingType === 'ping_cv'
        ? (isHebrew ? `פינג + קו"ח נשלח ל-${toUserName}!` : `Ping + CV sent to ${toUserName}!`)
        : (isHebrew ? `פינג נשלח ל-${toUserName}!` : `Ping sent to ${toUserName}!`);
      toast.success(msg, {
        duration: 4000,
        action: {
          label: isHebrew ? 'צפה בשיחה' : 'View chat',
          onClick: () => {
            window.dispatchEvent(new CustomEvent('plug:navigate-messages', { detail: { userId: toUserId } }));
          },
        },
      });
      setPendingType(null);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: () => {
      toast.error(isHebrew ? 'שגיאה בשליחת הפינג' : 'Failed to send ping');
      setPendingType(null);
    },
  });

  const handlePing = () => {
    setPendingType('ping');
    sendPing.mutate({ type: 'ping' });
  };

  const handlePingWithCV = () => {
    setPendingType('ping_cv');
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) { setPendingType(null); return; }
    if (file.size > 10 * 1024 * 1024) {
      toast.error(isHebrew ? 'הקובץ גדול מדי (מקסימום 10MB)' : 'File too large (max 10MB)');
      setPendingType(null);
      return;
    }
    sendPing.mutate({ type: 'ping_cv', cvFile: file });
    e.target.value = '';
  };

  if (user?.id === toUserId) return null;

  const isPending = sendPing.isPending;

  return (
    <>
      <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleFileSelected} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size={size}
            disabled={isPending}
            className={`gap-1 border-primary/30 text-primary hover:bg-primary/5 ${className || ''}`}
          >
            {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
            <span className="text-xs">{isHebrew ? 'פינג' : 'Ping'}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handlePing} className="gap-2 cursor-pointer">
            <Zap className="w-4 h-4 text-primary" />
            {isHebrew ? 'פינג מהיר' : 'Quick Ping'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handlePingWithCV} className="gap-2 cursor-pointer">
            <FileText className="w-4 h-4 text-blue-500" />
            {isHebrew ? 'פינג + קורות חיים' : 'Ping + CV'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
