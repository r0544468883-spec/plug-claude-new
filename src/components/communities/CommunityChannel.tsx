import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Send, Loader2, Hash, Heart, Pin } from 'lucide-react';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';

const EMOJI_OPTIONS = ['👍', '❤️', '🔥', '👏', '😂', '🤔'];

interface HubSettings {
  allow_posts: boolean;
  allow_comments: boolean;
}

interface CommunityChannelProps {
  channelId: string;
  channelName: string;
  hubSettings?: HubSettings;
  isAdmin?: boolean;
}

export function CommunityChannel({ channelId, channelName, hubSettings, isAdmin }: CommunityChannelProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [newMessage, setNewMessage] = useState('');
  // Emoji reactions — local state only (no DB)
  const [reactions, setReactions] = useState<Record<string, Record<string, number>>>({});
  // Pinned messages — localStorage
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(`pinned-${channelId}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);

  const canPost = isAdmin || hubSettings?.allow_posts !== false;

  // Persist pins to localStorage
  useEffect(() => {
    localStorage.setItem(`pinned-${channelId}`, JSON.stringify([...pinnedIds]));
  }, [pinnedIds, channelId]);

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['community-messages', channelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_messages')
        .select('*')
        .eq('channel_id', channelId)
        .is('parent_message_id', null)
        .order('created_at', { ascending: true })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  // Fetch author profiles
  const authorIds = [...new Set(messages.map(m => m.author_id))];
  const { data: authors = [] } = useQuery({
    queryKey: ['community-authors', authorIds],
    queryFn: async () => {
      if (authorIds.length === 0) return [];
      const { data } = await supabase.from('profiles_secure').select('user_id, full_name, avatar_url').in('user_id', authorIds);
      return data || [];
    },
    enabled: authorIds.length > 0,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`community-channel-${channelId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_messages', filter: `channel_id=eq.${channelId}` },
        () => { queryClient.invalidateQueries({ queryKey: ['community-messages', channelId] }); }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [channelId, queryClient]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Update lastRead timestamp for unread tracking
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`channel-${channelId}-lastRead`, new Date().toISOString());
    }
  }, [channelId, messages.length]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !newMessage.trim()) return;
      const { error } = await supabase.from('community_messages').insert({
        channel_id: channelId,
        author_id: user.id,
        content: newMessage.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['community-messages', channelId] });
      if (user?.id) {
        supabase.functions.invoke('award-credits', { body: { action: 'feed_comment' } }).catch(() => {});
      }
    },
    onError: () => toast.error(isHebrew ? 'שגיאה בשליחת ההודעה' : 'Failed to send'),
  });

  const likeMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const msg = messages.find(m => m.id === messageId);
      if (!msg) return;
      await supabase.from('community_messages').update({ likes_count: msg.likes_count + 1 }).eq('id', messageId);
      if (user?.id) {
        supabase.functions.invoke('award-credits', { body: { action: 'feed_like' } }).catch(() => {});
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['community-messages', channelId] }),
  });

  const handleReaction = useCallback((messageId: string, emoji: string) => {
    setReactions(prev => {
      const msgReactions = { ...(prev[messageId] || {}) };
      msgReactions[emoji] = (msgReactions[emoji] || 0) + 1;
      return { ...prev, [messageId]: msgReactions };
    });
  }, []);

  const togglePin = useCallback((messageId: string) => {
    setPinnedIds(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  }, []);

  const formatDateLabel = (date: Date) => {
    if (isToday(date)) return isHebrew ? 'היום' : 'Today';
    if (isYesterday(date)) return isHebrew ? 'אתמול' : 'Yesterday';
    return format(date, 'dd/MM/yyyy');
  };

  const formatTime = (date: Date) => format(date, 'HH:mm');

  // Pinned messages
  const pinnedMessages = useMemo(() =>
    messages.filter(m => pinnedIds.has(m.id)),
    [messages, pinnedIds]
  );

  // Check if message should collapse avatar (same author within 5 min of previous)
  const shouldCollapseAvatar = (idx: number) => {
    if (idx === 0) return false;
    const curr = messages[idx];
    const prev = messages[idx - 1];
    if (curr.author_id !== prev.author_id) return false;
    const diff = new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime();
    return diff < 5 * 60 * 1000;
  };

  // Check if we need a date divider before this message
  const needsDateDivider = (idx: number) => {
    if (idx === 0) return true;
    const curr = new Date(messages[idx].created_at);
    const prev = new Date(messages[idx - 1].created_at);
    return !isSameDay(curr, prev);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Channel Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Hash className="w-5 h-5 text-muted-foreground" />
        <h3 className="font-semibold">{channelName}</h3>
      </div>

      {/* Pinned Messages Banner */}
      {pinnedMessages.length > 0 && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 space-y-1">
          <p className="text-xs font-medium text-amber-700 flex items-center gap-1">
            <Pin className="w-3 h-3" />
            {isHebrew ? `${pinnedMessages.length} הודעות מוצמדות` : `${pinnedMessages.length} pinned message${pinnedMessages.length > 1 ? 's' : ''}`}
          </p>
          {pinnedMessages.slice(0, 2).map(pm => {
            const author = authors.find(a => a.user_id === pm.author_id);
            return (
              <p key={pm.id} className="text-xs text-amber-800 truncate">
                <span className="font-medium">{author?.full_name || '?'}</span>: {pm.content}
              </p>
            );
          })}
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Hash className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{isHebrew ? 'אין הודעות עדיין — תהיה הראשון!' : 'No messages yet — be the first!'}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((msg, idx) => {
              const author = authors.find(a => a.user_id === msg.author_id);
              const collapsed = shouldCollapseAvatar(idx);
              const dateDivider = needsDateDivider(idx);
              const msgReactions = reactions[msg.id] || {};
              const isPinned = pinnedIds.has(msg.id);
              const isHovered = hoveredMsgId === msg.id;

              return (
                <div key={msg.id}>
                  {/* Date Divider */}
                  {dateDivider && (
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground font-medium px-2">
                        {formatDateLabel(new Date(msg.created_at))}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  )}

                  {/* Message */}
                  <div
                    className={cn(
                      'flex gap-3 group relative rounded-md px-2 py-1 -mx-2 hover:bg-muted/30 transition-colors',
                      isPinned && 'bg-amber-50/50 border-s-2 border-amber-400'
                    )}
                    onMouseEnter={() => setHoveredMsgId(msg.id)}
                    onMouseLeave={() => setHoveredMsgId(null)}
                  >
                    {/* Avatar or spacer */}
                    {collapsed ? (
                      <div className="w-8 shrink-0 flex items-center justify-center">
                        <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                          {formatTime(new Date(msg.created_at))}
                        </span>
                      </div>
                    ) : (
                      <Avatar className="w-8 h-8 shrink-0 mt-0.5">
                        <AvatarImage src={author?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {author?.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div className="flex-1 min-w-0">
                      {/* Name + time (only if not collapsed) */}
                      {!collapsed && (
                        <div className="flex items-baseline gap-2">
                          <span className="font-medium text-sm">{author?.full_name || (isHebrew ? 'משתמש' : 'User')}</span>
                          <span className="text-xs text-muted-foreground">{formatTime(new Date(msg.created_at))}</span>
                          {isPinned && <Pin className="w-3 h-3 text-amber-500" />}
                        </div>
                      )}

                      {/* Content */}
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>

                      {/* Reaction pills */}
                      {(Object.keys(msgReactions).length > 0 || msg.likes_count > 0) && (
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          {msg.likes_count > 0 && (
                            <button
                              onClick={() => likeMutation.mutate(msg.id)}
                              className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                            >
                              <Heart className="w-3 h-3" />
                              <span>{msg.likes_count}</span>
                            </button>
                          )}
                          {Object.entries(msgReactions).map(([emoji, count]) => (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(msg.id, emoji)}
                              className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                            >
                              <span>{emoji}</span>
                              <span className="text-muted-foreground">{count}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Hover action bar — emoji reactions + pin */}
                    {isHovered && (
                      <div className="absolute -top-3 end-2 flex items-center gap-0.5 bg-white border border-gray-200 rounded-md shadow-sm px-1 py-0.5 z-10">
                        {EMOJI_OPTIONS.map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(msg.id, emoji)}
                            className="hover:bg-gray-100 rounded px-1 py-0.5 text-sm transition-colors"
                          >
                            {emoji}
                          </button>
                        ))}
                        <button
                          onClick={() => likeMutation.mutate(msg.id)}
                          className="hover:bg-gray-100 rounded px-1 py-0.5 transition-colors"
                        >
                          <Heart className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => togglePin(msg.id)}
                            className={cn(
                              'hover:bg-gray-100 rounded px-1 py-0.5 transition-colors',
                              isPinned && 'text-amber-500'
                            )}
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      {canPost ? (
        <div className="p-4 border-t border-border">
          <form onSubmit={(e) => { e.preventDefault(); sendMutation.mutate(); }} className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={isHebrew ? `הודעה ב-${channelName}...` : `Message ${channelName}...`}
              disabled={sendMutation.isPending}
              dir={isHebrew ? 'rtl' : 'ltr'}
            />
            <Button type="submit" size="icon" disabled={!newMessage.trim() || sendMutation.isPending}>
              {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      ) : (
        <div className="p-4 border-t border-border text-center text-sm text-muted-foreground">
          {isHebrew ? 'פרסום הודעות מוגבל למנהלים בקהילה זו' : 'Posting is restricted to admins in this community'}
        </div>
      )}
    </div>
  );
}
