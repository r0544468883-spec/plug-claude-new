import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { OnlineIndicator, getTimeSinceActive } from './OnlineIndicator';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Send, Loader2, Paperclip, FileText, X, Download, Briefcase, Info, Check, CheckCheck, AlertCircle, Clock } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { he as heLocale } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  conversation_id: string;
  from_user_id: string;
  to_user_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  delivered_at?: string | null;
  read_at?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  attachment_size?: number | null;
  related_job_id?: string | null;
  // Optimistic-only client fields (not in DB):
  _pending?: boolean;
  _failed?: boolean;
}

interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  other_user: {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
    last_seen_at?: string | null;
  } | null;
}

interface ConversationThreadProps {
  conversation: Conversation;
  onBack: () => void;
  onToggleChatInfo?: () => void;
  showChatInfo?: boolean;
  messengerMode?: boolean;
}

export function ConversationThread({ conversation, onBack, onToggleChatInfo, showChatInfo, messengerMode }: ConversationThreadProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const openOtherUserProfile = () => {
    const otherId = conversation.other_user?.user_id;
    if (otherId) navigate(`/p/${otherId}`);
  };

  const BackIcon = isHebrew ? ArrowRight : ArrowLeft;

  const messagesQueryKey = ['messages', conversation.id];

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: messagesQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('id, conversation_id, from_user_id, to_user_id, content, is_read, created_at, delivered_at, read_at, attachment_url, attachment_name, attachment_type, attachment_size, related_job_id')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Message[];
    },
  });

  // Fetch related jobs
  const jobIds = [...new Set(messages.filter(m => m.related_job_id).map(m => m.related_job_id!))];
  const { data: relatedJobs = [] } = useQuery({
    queryKey: ['related-jobs-thread', jobIds],
    queryFn: async () => {
      if (jobIds.length === 0) return [];
      const { data } = await supabase.from('jobs').select('id, title, location').in('id', jobIds);
      return data || [];
    },
    enabled: jobIds.length > 0,
  });

  // Mark incoming messages as delivered (arrived at my client) + read (I opened the conversation)
  useEffect(() => {
    if (!user?.id || messages.length === 0) return;
    const nowIso = new Date().toISOString();

    const undelivered = messages.filter(m => m.to_user_id === user.id && !m.delivered_at && !m._pending);
    if (undelivered.length > 0) {
      supabase
        .from('messages')
        .update({ delivered_at: nowIso })
        .in('id', undelivered.map(m => m.id))
        .then(() => {});
    }

    const unread = messages.filter(m => m.to_user_id === user.id && !m.is_read && !m._pending);
    if (unread.length > 0) {
      supabase
        .from('messages')
        .update({ is_read: true, read_at: nowIso })
        .in('id', unread.map(m => m.id))
        .then(() => {});
    }
  }, [messages, user?.id]);

  // Realtime: merge changes directly into cache (avoids refetch + preserves optimistic state)
  useEffect(() => {
    const channel = supabase
      .channel(`conversation-${conversation.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversation.id}` },
        (payload) => {
          const incoming = payload.new as Message;
          queryClient.setQueryData<Message[]>(messagesQueryKey, (prev = []) => {
            // Already in cache (our own optimistic or prior INSERT)? skip
            if (prev.some(m => m.id === incoming.id)) return prev;
            // Remove any pending temp that matches (same sender + content) — it's now real
            const deduped = prev.filter(m => !(m._pending && m.from_user_id === incoming.from_user_id && m.content === incoming.content));
            return [...deduped, incoming].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          });
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversation.id}` },
        (payload) => {
          const updated = payload.new as Message;
          queryClient.setQueryData<Message[]>(messagesQueryKey, (prev = []) =>
            prev.map(m => m.id === updated.id ? { ...m, ...updated } : m)
          );
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversation.id, queryClient]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  type SendVars = {
    content: string;
    attachmentData?: { url: string; name: string; type: string; size: number };
    tempId?: string; // when retrying, reuse the failed temp message id
  };

  const sendMutation = useMutation({
    mutationFn: async ({ content, attachmentData, tempId }: SendVars) => {
      if (!user?.id) throw new Error('Not authenticated');
      const toUserId = conversation.participant_1 === user.id ? conversation.participant_2 : conversation.participant_1;
      const { data, error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          from_user_id: user.id,
          to_user_id: toUserId,
          content,
          attachment_url: attachmentData?.url || null,
          attachment_name: attachmentData?.name || null,
          attachment_type: attachmentData?.type || null,
          attachment_size: attachmentData?.size || null,
        })
        .select('id, conversation_id, from_user_id, to_user_id, content, is_read, created_at, delivered_at, read_at, attachment_url, attachment_name, attachment_type, attachment_size, related_job_id')
        .single();
      if (msgError) throw msgError;
      await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversation.id);
      return { real: data as Message, tempId };
    },
    onMutate: async ({ content, attachmentData, tempId }) => {
      if (!user?.id) return;
      const toUserId = conversation.participant_1 === user.id ? conversation.participant_2 : conversation.participant_1;
      const id = tempId || `temp-${crypto.randomUUID()}`;
      const tempMessage: Message = {
        id,
        conversation_id: conversation.id,
        from_user_id: user.id,
        to_user_id: toUserId,
        content,
        is_read: false,
        created_at: new Date().toISOString(),
        delivered_at: null,
        read_at: null,
        attachment_url: attachmentData?.url || null,
        attachment_name: attachmentData?.name || null,
        attachment_type: attachmentData?.type || null,
        attachment_size: attachmentData?.size || null,
        related_job_id: null,
        _pending: true,
        _failed: false,
      };
      queryClient.setQueryData<Message[]>(messagesQueryKey, (prev = []) => {
        // If retrying, replace the failed temp in place
        if (tempId && prev.some(m => m.id === tempId)) {
          return prev.map(m => m.id === tempId ? tempMessage : m);
        }
        return [...prev, tempMessage];
      });
      // Clear input immediately (optimistic)
      setNewMessage('');
      setSelectedFile(null);
      return { tempId: id };
    },
    onSuccess: ({ real, tempId: sentTempId }, _vars, ctx) => {
      const tempId = sentTempId || ctx?.tempId;
      queryClient.setQueryData<Message[]>(messagesQueryKey, (prev = []) => {
        // Replace temp with real; if real already arrived via realtime, drop the temp only
        const withoutTemp = prev.filter(m => m.id !== tempId);
        if (withoutTemp.some(m => m.id === real.id)) return withoutTemp;
        return [...withoutTemp, real].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      });
    },
    onError: (_err, vars, ctx) => {
      const tempId = ctx?.tempId;
      // Mark the temp as failed so UI can show retry
      queryClient.setQueryData<Message[]>(messagesQueryKey, (prev = []) =>
        prev.map(m => m.id === tempId ? { ...m, _pending: false, _failed: true } : m)
      );
      toast.error(isHebrew ? 'שגיאה בשליחת ההודעה' : 'Failed to send message', {
        action: {
          label: isHebrew ? 'נסה שוב' : 'Retry',
          onClick: () => sendMutation.mutate({ ...vars, tempId }),
        },
      });
    },
  });

  const retryFailedMessage = (msg: Message) => {
    sendMutation.mutate({
      content: msg.content,
      attachmentData: msg.attachment_url ? {
        url: msg.attachment_url,
        name: msg.attachment_name || 'file',
        type: msg.attachment_type || '',
        size: msg.attachment_size || 0,
      } : undefined,
      tempId: msg.id,
    });
  };

  const deleteFailedMessage = (msgId: string) => {
    queryClient.setQueryData<Message[]>(messagesQueryKey, (prev = []) => prev.filter(m => m.id !== msgId));
  };

  const acceptFile = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error(isHebrew ? 'הקובץ גדול מדי (מקסימום 10MB)' : 'File too large (max 10MB)');
      return;
    }
    setSelectedFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) acceptFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) acceptFile(file);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() && !selectedFile) return;
    let attachmentData: { url: string; name: string; type: string; size: number } | undefined;
    if (selectedFile && user?.id) {
      setUploading(true);
      try {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('message-attachments').upload(fileName, selectedFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('message-attachments').getPublicUrl(fileName);
        attachmentData = { url: publicUrl, name: selectedFile.name, type: selectedFile.type, size: selectedFile.size };
      } catch { toast.error(isHebrew ? 'שגיאה בהעלאת הקובץ' : 'Failed to upload file'); setUploading(false); return; }
      setUploading(false);
    }
    sendMutation.mutate({ content: newMessage.trim() || (selectedFile ? `📎 ${selectedFile.name}` : ''), attachmentData });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Date separator helpers
  const getDateLabel = (date: Date) => {
    if (isToday(date)) return isHebrew ? 'היום' : 'Today';
    if (isYesterday(date)) return isHebrew ? 'אתמול' : 'Yesterday';
    return format(date, 'dd MMMM yyyy', { locale: isHebrew ? heLocale : undefined });
  };

  const shouldShowDateSeparator = (current: Message, previous: Message | null) => {
    if (!previous) return true;
    return new Date(current.created_at).toDateString() !== new Date(previous.created_at).toDateString();
  };

  // Message grouping: same sender within 2 minutes
  const isGroupedWithPrevious = (current: Message, previous: Message | null) => {
    if (!previous) return false;
    if (current.from_user_id !== previous.from_user_id) return false;
    return new Date(current.created_at).getTime() - new Date(previous.created_at).getTime() < 2 * 60 * 1000;
  };

  const isLastInGroup = (current: Message, next: Message | null) => {
    if (!next) return true;
    if (current.from_user_id !== next.from_user_id) return true;
    return new Date(next.created_at).getTime() - new Date(current.created_at).getTime() >= 2 * 60 * 1000;
  };

  // Find last own message (excluding pending/failed) to anchor the "Read at HH:MM" label
  const lastReadOwnMessage = [...messages].reverse().find(
    m => m.from_user_id === user?.id && !m._pending && !m._failed && m.is_read
  );

  const Wrapper = messengerMode ? 'div' : Card;
  const wrapperClass = messengerMode
    ? 'h-full flex flex-col bg-card'
    : 'bg-card border-border h-full flex flex-col';

  return (
    <Wrapper
      className={cn(wrapperClass, 'relative')}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-xl pointer-events-none">
          <div className="text-center">
            <Paperclip className="w-10 h-10 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium text-primary">
              {isHebrew ? 'שחרר כדי לצרף קובץ' : 'Drop to attach file'}
            </p>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="md:hidden shrink-0"
          aria-label={isHebrew ? 'חזור לרשימת שיחות' : 'Back to conversation list'}
        >
          <BackIcon className="w-5 h-5" />
        </Button>
        <button
          type="button"
          onClick={openOtherUserProfile}
          className="flex items-center gap-3 flex-1 min-w-0 text-start rounded-lg -mx-1 px-1 py-1 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors"
          aria-label={isHebrew ? `פתח את הפרופיל של ${conversation.other_user?.full_name || 'משתמש'}` : `Open ${conversation.other_user?.full_name || 'user'}'s profile`}
          title={isHebrew ? 'צפה בפרופיל' : 'View profile'}
        >
          <Avatar className="w-9 h-9 shrink-0">
            <AvatarImage src={conversation.other_user?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {conversation.other_user?.full_name?.charAt(0)?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground text-sm truncate hover:underline">
              {conversation.other_user?.full_name || (isHebrew ? 'משתמש לא ידוע' : 'Unknown User')}
            </p>
            <OnlineIndicator
              lastSeenAt={(conversation.other_user as any)?.last_seen_at}
              showText
              size="sm"
            />
          </div>
        </button>
        {onToggleChatInfo && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleChatInfo}
            className={cn('shrink-0', showChatInfo && 'bg-primary/10 text-primary')}
            aria-label={isHebrew ? 'פרטי שיחה' : 'Conversation info'}
            aria-pressed={showChatInfo}
          >
            <Info className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Messages area */}
      <div className={cn('flex-1 overflow-hidden', !messengerMode && 'p-0')}>
        <div className={cn('overflow-y-auto p-4', messengerMode ? 'h-full' : 'h-[400px]')} ref={scrollRef}>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : ''}`}>
                  <Skeleton className="h-12 w-48 rounded-lg" />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {isHebrew ? 'אין הודעות עדיין. התחל שיחה!' : 'No messages yet. Start a conversation!'}
            </div>
          ) : (
            <div>
              {messages.map((message, index) => {
                const prev = index > 0 ? messages[index - 1] : null;
                const next = index < messages.length - 1 ? messages[index + 1] : null;
                const isOwn = message.from_user_id === user?.id;
                const job = message.related_job_id ? relatedJobs.find(j => j.id === message.related_job_id) : null;
                const showDate = shouldShowDateSeparator(message, prev);
                const grouped = isGroupedWithPrevious(message, prev);
                const lastInGroup = isLastInGroup(message, next);
                const showStateIcon = isOwn && lastInGroup;
                const isPending = !!message._pending;
                const isFailed = !!message._failed;
                const isDelivered = !!message.delivered_at;
                const isRead = message.is_read;
                const showReadAtLabel = isOwn && message.id === lastReadOwnMessage?.id && !!lastReadOwnMessage.read_at;

                return (
                  <div key={message.id}>
                    {/* Date separator */}
                    {showDate && (
                      <div className="flex items-center gap-3 py-3">
                        <div className="flex-1 border-t border-border" />
                        <span className="text-[11px] text-muted-foreground font-medium px-2">
                          {getDateLabel(new Date(message.created_at))}
                        </span>
                        <div className="flex-1 border-t border-border" />
                      </div>
                    )}

                    {/* Message bubble */}
                    <div className={cn(
                      'flex',
                      isOwn ? 'justify-end' : 'justify-start',
                      grouped ? 'mt-0.5' : 'mt-3',
                      index === 0 && 'mt-0'
                    )}>
                      <div className="max-w-[70%]">
                        <div className={cn(
                          'rounded-2xl px-3.5 py-2 space-y-1.5 transition-opacity',
                          isOwn
                            ? 'bg-primary text-primary-foreground rounded-ee-md'
                            : 'bg-muted rounded-es-md',
                          isPending && 'opacity-60',
                          isFailed && 'bg-destructive/20 text-foreground'
                        )}>
                          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>

                          {/* Attachment */}
                          {message.attachment_url && (
                            <a
                              href={message.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(
                                'flex items-center gap-2 px-3 py-2 rounded-md text-xs',
                                isOwn ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20' : 'bg-background/50 hover:bg-background/80'
                              )}
                            >
                              <FileText className="w-4 h-4 shrink-0" />
                              <span className="truncate flex-1">{message.attachment_name || 'File'}</span>
                              {message.attachment_size && <span className="shrink-0">{formatFileSize(message.attachment_size)}</span>}
                              <Download className="w-3 h-3 shrink-0" />
                            </a>
                          )}

                          {/* Related Job */}
                          {job && (
                            <div className={cn(
                              'flex items-center gap-2 px-3 py-2 rounded-md text-xs',
                              isOwn ? 'bg-primary-foreground/10' : 'bg-background/50'
                            )}>
                              <Briefcase className="w-4 h-4 shrink-0 text-primary" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{job.title}</p>
                                {job.location && <p className="text-xs opacity-70">{job.location}</p>}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Timestamp + State icon (only on last in group) */}
                        {lastInGroup && (
                          <div className={cn(
                            'flex items-center gap-1 mt-0.5 px-1',
                            isOwn ? 'justify-end' : 'justify-start'
                          )}>
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(message.created_at), 'HH:mm')}
                            </span>
                            {showStateIcon && (
                              <span
                                className="flex items-center gap-0.5 text-[10px] text-muted-foreground"
                                title={
                                  isFailed ? (isHebrew ? 'השליחה נכשלה' : 'Failed to send')
                                  : isPending ? (isHebrew ? 'שולח…' : 'Sending…')
                                  : isRead ? (isHebrew ? 'נקרא' : 'Read')
                                  : isDelivered ? (isHebrew ? 'נמסר' : 'Delivered')
                                  : (isHebrew ? 'נשלח' : 'Sent')
                                }
                              >
                                {isFailed ? (
                                  <AlertCircle className="w-3 h-3 text-destructive" />
                                ) : isPending ? (
                                  <Clock className="w-3 h-3" />
                                ) : isRead ? (
                                  <CheckCheck className="w-3 h-3 text-primary" />
                                ) : isDelivered ? (
                                  <CheckCheck className="w-3 h-3" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                )}
                              </span>
                            )}
                            {isFailed && (
                              <span className="flex items-center gap-2 ms-1">
                                <button
                                  type="button"
                                  onClick={() => retryFailedMessage(message)}
                                  className="text-[10px] text-primary hover:underline"
                                >
                                  {isHebrew ? 'נסה שוב' : 'Retry'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteFailedMessage(message.id)}
                                  className="text-[10px] text-muted-foreground hover:text-destructive"
                                >
                                  {isHebrew ? 'מחק' : 'Delete'}
                                </button>
                              </span>
                            )}
                          </div>
                        )}
                        {showReadAtLabel && lastReadOwnMessage?.read_at && (
                          <div className={cn('flex items-center gap-1 mt-0.5 px-1 text-[10px] text-muted-foreground', isOwn ? 'justify-end' : 'justify-start')}>
                            <CheckCheck className="w-3 h-3 text-primary" />
                            <span>
                              {isHebrew ? 'נקרא ב-' : 'Read at '}
                              {format(new Date(lastReadOwnMessage.read_at), 'HH:mm')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border bg-card space-y-2">
        {selectedFile && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted text-sm">
            <FileText className="w-4 h-4 text-primary" />
            <span className="truncate flex-1">{selectedFile.name}</span>
            <button
              type="button"
              onClick={() => setSelectedFile(null)}
              className="text-muted-foreground hover:text-destructive"
              aria-label={isHebrew ? 'הסר קובץ' : 'Remove file'}
              title={isHebrew ? 'הסר קובץ' : 'Remove file'}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            onChange={handleFileSelect}
            aria-label={isHebrew ? 'בחר קובץ לצירוף' : 'Choose file to attach'}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0"
            aria-label={isHebrew ? 'צרף קובץ' : 'Attach file'}
            title={isHebrew ? 'צרף קובץ' : 'Attach file'}
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isHebrew ? 'הקלד הודעה... (Enter לשליחה, Shift+Enter לשורה חדשה)' : 'Type a message... (Enter to send, Shift+Enter for new line)'}
            disabled={sendMutation.isPending || uploading}
            rows={1}
            className="rounded-2xl resize-none min-h-[40px] max-h-[120px] py-2"
            dir={isHebrew ? 'rtl' : 'ltr'}
            aria-label={isHebrew ? 'תוכן הודעה' : 'Message content'}
          />
          <Button
            type="submit"
            size="icon"
            className="rounded-full shrink-0"
            disabled={(!newMessage.trim() && !selectedFile) || sendMutation.isPending || uploading}
            aria-label={isHebrew ? 'שלח הודעה' : 'Send message'}
            title={isHebrew ? 'שלח' : 'Send'}
          >
            {(sendMutation.isPending || uploading) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </div>
    </Wrapper>
  );
}
