import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, MessageCircle, Send, Trash2 } from 'lucide-react';

interface Comment {
  id: string;
  created_at: string;
  template_id: string;
  user_id: string;
  content: string;
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
}

interface AssignmentCommentsDialogProps {
  templateId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignmentCommentsDialog({ templateId, open, onOpenChange }: AssignmentCommentsDialogProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !templateId) return;
    setIsLoading(true);
    supabase
      .from('assignment_comments' as any)
      .select('*')
      .eq('template_id', templateId)
      .order('created_at', { ascending: true })
      .then(async ({ data, error }) => {
        if (error) { console.error(error); setIsLoading(false); return; }
        const items = (data as Comment[]) ?? [];
        // Fetch profiles
        const userIds = [...new Set(items.map(c => c.user_id))];
        if (userIds.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds);
          const profileMap = new Map<string, any>();
          profiles?.forEach((p: any) => profileMap.set(p.id, p));
          items.forEach(c => { c.profiles = profileMap.get(c.user_id) ?? null; });
        }
        setComments(items);
        setIsLoading(false);
        setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 100);
      });
  }, [open, templateId]);

  const handleSend = async () => {
    if (!user || !templateId || !text.trim()) return;
    setIsSending(true);
    try {
      const { data, error } = await supabase
        .from('assignment_comments' as any)
        .insert({ template_id: templateId, user_id: user.id, content: text.trim() })
        .select('*')
        .single();
      if (error) throw error;

      const newComment: Comment = {
        ...(data as Comment),
        profiles: { full_name: (user as any)?.user_metadata?.full_name || null, avatar_url: null },
      };
      // Fetch current user profile for avatar
      const { data: myProfile } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).single();
      if (myProfile) newComment.profiles = myProfile as any;

      setComments(prev => [...prev, newComment]);
      setText('');
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 100);
    } catch (err: any) {
      console.error(err);
      toast.error(isHebrew ? 'שגיאה בשליחת תגובה' : 'Failed to send comment');
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    const { error } = await supabase.from('assignment_comments' as any).delete().eq('id', commentId);
    if (error) { toast.error(isHebrew ? 'שגיאה במחיקה' : 'Failed to delete'); return; }
    setComments(prev => prev.filter(c => c.id !== commentId));
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return isHebrew ? 'עכשיו' : 'now';
    if (diffMins < 60) return isHebrew ? `לפני ${diffMins} דק׳` : `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return isHebrew ? `לפני ${diffHours} שעות` : `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return isHebrew ? `לפני ${diffDays} ימים` : `${diffDays}d ago`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir={isHebrew ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            {isHebrew ? 'תגובות' : 'Comments'}
            {comments.length > 0 && <span className="text-sm text-muted-foreground">({comments.length})</span>}
          </DialogTitle>
        </DialogHeader>

        <div ref={scrollRef} className="max-h-[50vh] overflow-y-auto space-y-3 py-2">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              {isHebrew ? 'אין תגובות עדיין. היה הראשון!' : 'No comments yet. Be the first!'}
            </p>
          ) : (
            comments.map(c => (
              <div key={c.id} className="flex gap-2 group">
                <Avatar className="w-7 h-7 flex-shrink-0 mt-0.5">
                  <AvatarImage src={c.profiles?.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {(c.profiles?.full_name || '?').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{c.profiles?.full_name || (isHebrew ? 'משתמש' : 'User')}</span>
                    <span className="text-[10px] text-muted-foreground">{formatTime(c.created_at)}</span>
                    {c.user_id === user?.id && (
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">{c.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {user && (
          <div className="flex gap-2 pt-2 border-t">
            <Input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={isHebrew ? 'כתוב תגובה...' : 'Write a comment...'}
              disabled={isSending}
            />
            <Button size="icon" onClick={handleSend} disabled={isSending || !text.trim()} className="flex-shrink-0">
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
