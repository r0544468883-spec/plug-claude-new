import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Trash2, AtSign, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he, enUS } from 'date-fns/locale';

interface TeamNote {
  id: string;
  author_id: string;
  content: string;
  mentioned_user_ids: string[];
  created_at: string;
  author?: { full_name: string | null; avatar_url: string | null };
}

interface Hunter {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface TeamNotesTabProps {
  applicationId: string;
  jobId: string;
}

export function TeamNotesTab({ applicationId, jobId }: TeamNotesTabProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const isRTL = language === 'he';

  const [content, setContent] = useState('');
  const [mentionedIds, setMentionedIds] = useState<string[]>([]);
  const [showMentionPicker, setShowMentionPicker] = useState(false);

  // Fetch team notes
  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['team-notes', applicationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_notes')
        .select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: true });
      if (error) throw error;

      // Fetch author profiles
      if (!data?.length) return [];
      const authorIds = [...new Set(data.map(n => n.author_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', authorIds);

      return data.map(note => ({
        ...note,
        mentioned_user_ids: (note.mentioned_user_ids || []) as string[],
        author: profiles?.find(p => p.user_id === note.author_id) || null,
      })) as TeamNote[];
    },
  });

  // Fetch hunters linked to this job via missions + bids
  const { data: hunters = [] } = useQuery({
    queryKey: ['job-hunters', jobId],
    queryFn: async () => {
      // Find accepted/active bids on missions linked to this job
      const { data: missions } = await supabase
        .from('missions')
        .select('id')
        .eq('job_id', jobId);

      if (!missions?.length) return [];

      const missionIds = missions.map(m => m.id);
      const { data: bids } = await supabase
        .from('mission_bids')
        .select('hunter_id')
        .in('mission_id', missionIds)
        .in('status', ['accepted', 'active', 'pending']);

      if (!bids?.length) return [];

      const hunterIds = [...new Set(bids.map(b => b.hunter_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', hunterIds);

      return (profiles || []) as Hunter[];
    },
    enabled: !!jobId,
  });

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      if (!user || !content.trim()) return;
      const { error } = await supabase.from('team_notes').insert({
        application_id: applicationId,
        author_id: user.id,
        content: content.trim(),
        mentioned_user_ids: mentionedIds,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setContent('');
      setMentionedIds([]);
      setShowMentionPicker(false);
      queryClient.invalidateQueries({ queryKey: ['team-notes', applicationId] });
      toast.success(isRTL ? 'הערה נוספה' : 'Note added');
    },
    onError: () => toast.error(isRTL ? 'שגיאה בהוספת הערה' : 'Failed to add note'),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase.from('team_notes').delete().eq('id', noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-notes', applicationId] });
      toast.success(isRTL ? 'הערה נמחקה' : 'Note deleted');
    },
  });

  const toggleMention = (hunterId: string) => {
    setMentionedIds(prev =>
      prev.includes(hunterId) ? prev.filter(id => id !== hunterId) : [...prev, hunterId]
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>
          {isRTL ? 'הערות שיתוף פעולה — גלויות לצוות בלבד' : 'Collaboration notes — visible to team only'}
        </span>
      </div>

      {/* Notes list */}
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-6 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
          {isRTL ? 'אין הערות עדיין — התחל שיחה עם הצוות' : 'No notes yet — start a team conversation'}
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map(note => (
            <div key={note.id} className="flex gap-3 group">
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarImage src={note.author?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {note.author?.full_name?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium">
                    {note.author?.full_name || (isRTL ? 'משתמש' : 'User')}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(note.created_at), {
                      addSuffix: true,
                      locale: isRTL ? he : enUS,
                    })}
                  </span>
                  {note.author_id === user?.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100 ml-auto"
                      onClick={() => deleteNoteMutation.mutate(note.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  )}
                </div>
                <p className="text-sm text-foreground bg-muted/50 rounded-lg px-3 py-2 whitespace-pre-wrap">
                  {note.content}
                </p>
                {/* Mentioned hunters */}
                {note.mentioned_user_ids?.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {note.mentioned_user_ids.map(uid => {
                      const h = hunters.find(h => h.user_id === uid);
                      return h ? (
                        <Badge key={uid} variant="secondary" className="text-xs gap-1 h-5">
                          <AtSign className="h-2.5 w-2.5" />
                          {h.full_name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Compose area */}
      <div className="border border-border rounded-lg p-3 space-y-2 bg-card">
        <Textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder={isRTL ? 'כתוב הערה לצוות...' : 'Write a team note...'}
          className="min-h-[80px] resize-none border-0 p-0 bg-transparent focus-visible:ring-0"
          dir={isRTL ? 'rtl' : 'ltr'}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && content.trim()) {
              addNoteMutation.mutate();
            }
          }}
        />

        {/* Mention selected hunters */}
        {mentionedIds.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {mentionedIds.map(uid => {
              const h = hunters.find(h => h.user_id === uid);
              return h ? (
                <Badge
                  key={uid}
                  variant="secondary"
                  className="text-xs gap-1 cursor-pointer hover:bg-destructive/10"
                  onClick={() => toggleMention(uid)}
                >
                  <AtSign className="h-2.5 w-2.5" />
                  {h.full_name}
                  <span className="text-muted-foreground">×</span>
                </Badge>
              ) : null;
            })}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {/* @Mention hunters button */}
            {hunters.length > 0 && (
              <div className="relative">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => setShowMentionPicker(p => !p)}
                >
                  <AtSign className="h-3 w-3" />
                  {isRTL ? 'תייג האנטר' : 'Tag Hunter'}
                </Button>

                {showMentionPicker && (
                  <div className="absolute bottom-9 left-0 z-50 bg-popover border border-border rounded-lg shadow-lg p-2 min-w-[180px]">
                    <p className="text-xs text-muted-foreground mb-2 px-1">
                      {isRTL ? 'האנטרים המשויכים למשרה' : 'Hunters linked to this job'}
                    </p>
                    {hunters.map(h => (
                      <button
                        key={h.user_id}
                        type="button"
                        className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-muted text-sm"
                        onClick={() => {
                          toggleMention(h.user_id);
                          setShowMentionPicker(false);
                        }}
                      >
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={h.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">{h.full_name?.charAt(0) || '?'}</AvatarFallback>
                        </Avatar>
                        <span>{h.full_name}</span>
                        {mentionedIds.includes(h.user_id) && (
                          <span className="ml-auto text-primary text-xs">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <Button
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => addNoteMutation.mutate()}
            disabled={!content.trim() || addNoteMutation.isPending}
          >
            {addNoteMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Send className="h-3 w-3" />
            )}
            {isRTL ? 'שלח' : 'Send'}
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{isRTL ? 'Ctrl+Enter לשליחה מהירה' : 'Ctrl+Enter to send'}</p>
    </div>
  );
}
