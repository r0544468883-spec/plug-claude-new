import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { MessageSquare, Inbox, Search, Circle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import { ConversationThread } from './ConversationThread';
import { NewMessageDialog } from './NewMessageDialog';
import { ChatInfoSidebar } from './ChatInfoSidebar';
import { OnlineIndicator, isUserOnline } from './OnlineIndicator';
import { cn } from '@/lib/utils';

interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message_at: string;
  other_user: {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
    personal_tagline?: string | null;
    last_seen_at?: string | null;
  } | null;
  unread_count: number;
  last_message?: string;
  last_message_from_user_id?: string;
}

interface MessageInboxProps {
  initialConversationUserId?: string;
}

export function MessageInbox({ initialConversationUserId }: MessageInboxProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showChatInfo, setShowChatInfo] = useState(false);

  // Fetch conversations
  const { data: conversations = [], isLoading, refetch } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: convos, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      const otherUserIds = convos.map(c =>
        c.participant_1 === user.id ? c.participant_2 : c.participant_1
      );

      const { data: profiles } = await supabase
        .from('profiles_secure')
        .select('*')
        .in('user_id', otherUserIds);

      const conversationsWithDetails = await Promise.all(convos.map(async (convo) => {
        const otherId = convo.participant_1 === user.id ? convo.participant_2 : convo.participant_1;

        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', convo.id)
          .eq('to_user_id', user.id)
          .eq('is_read', false);

        const { data: lastMsg } = await supabase
          .from('messages')
          .select('content, from_user_id')
          .eq('conversation_id', convo.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        return {
          ...convo,
          other_user: (profiles as any)?.find((p: any) => p.user_id === otherId) || null,
          unread_count: count || 0,
          last_message: lastMsg?.content,
          last_message_from_user_id: lastMsg?.from_user_id,
        };
      }));

      return conversationsWithDetails;
    },
    enabled: !!user?.id,
  });

  // Deep-link: auto-open conversation with specific user
  useEffect(() => {
    if (initialConversationUserId && conversations.length > 0 && !selectedConversation) {
      const convo = conversations.find(c =>
        c.other_user?.user_id === initialConversationUserId
      );
      if (convo) setSelectedConversation(convo);
    }
  }, [initialConversationUserId, conversations, selectedConversation]);

  // Realtime
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('messages-inbox')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => { refetch(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, refetch]);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(c =>
      c.other_user?.full_name?.toLowerCase().includes(q) ||
      c.last_message?.toLowerCase().includes(q)
    );
  }, [conversations, searchQuery]);

  const handleSelectConversation = (convo: Conversation) => {
    setSelectedConversation(convo);
    setShowChatInfo(false);
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex overflow-hidden bg-card rounded-xl border border-border shadow-sm" dir={isHebrew ? 'rtl' : 'ltr'}>
      {/* LEFT: Conversations List */}
      <div className={cn(
        "flex flex-col border-e border-border bg-card shrink-0",
        selectedConversation ? "hidden md:flex w-[320px]" : "w-full md:w-[320px]"
      )}>
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              {isHebrew ? 'הודעות' : 'Messages'}
              {totalUnread > 0 && (
                <Badge className="bg-primary text-white text-xs px-1.5 min-w-[20px] h-5">
                  {totalUnread}
                </Badge>
              )}
            </h2>
            <NewMessageDialog />
          </div>
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isHebrew ? 'חפש שיחות...' : 'Search...'}
              className="ps-9 h-9 text-sm rounded-full"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-1 p-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
                  <Skeleton className="w-11 h-11 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Inbox className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? (isHebrew ? 'לא נמצאו תוצאות' : 'No results')
                  : (isHebrew ? 'אין שיחות עדיין' : 'No conversations yet')}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {isHebrew ? 'שלח הודעה ראשונה מהפיד או מפרופיל' : 'Send your first message from the feed or a profile'}
              </p>
            </div>
          ) : (
            <div className="p-1.5">
              {filteredConversations.map((convo) => {
                const isSelected = selectedConversation?.id === convo.id;
                const hasUnread = convo.unread_count > 0;
                const online = isUserOnline(convo.other_user?.last_seen_at);
                const youPrefix = convo.last_message_from_user_id === user?.id
                  ? (isHebrew ? 'את/ה: ' : 'You: ')
                  : '';

                return (
                  <button
                    key={convo.id}
                    onClick={() => handleSelectConversation(convo)}
                    className={cn(
                      "w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-start",
                      isSelected
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-muted/50 border border-transparent"
                    )}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="w-11 h-11">
                        <AvatarImage src={convo.other_user?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {convo.other_user?.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      {online && (
                        <span className="absolute bottom-0 end-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className={cn(
                          "text-sm truncate",
                          hasUnread ? "font-bold text-foreground" : "font-medium text-foreground/80"
                        )}>
                          {convo.other_user?.full_name || (isHebrew ? 'לא ידוע' : 'Unknown')}
                        </p>
                        <span className="text-[11px] text-muted-foreground flex-shrink-0 ms-2">
                          {formatDistanceToNow(new Date(convo.last_message_at), {
                            addSuffix: false,
                            locale: isHebrew ? he : enUS,
                          })}
                        </span>
                      </div>
                      <p className={cn(
                        "text-xs truncate",
                        hasUnread ? "text-foreground/70 font-medium" : "text-muted-foreground"
                      )}>
                        {youPrefix}{convo.last_message || (isHebrew ? 'שיחה חדשה' : 'New conversation')}
                      </p>
                    </div>

                    {hasUnread && (
                      <Badge className="bg-primary text-white text-[10px] h-5 min-w-[20px] px-1.5 flex-shrink-0">
                        {convo.unread_count}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* CENTER: Conversation Thread */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 bg-background",
        !selectedConversation ? "hidden md:flex" : "flex"
      )}>
        {selectedConversation ? (
          <ConversationThread
            conversation={selectedConversation}
            onBack={() => { setSelectedConversation(null); setShowChatInfo(false); }}
            onToggleChatInfo={() => setShowChatInfo(prev => !prev)}
            showChatInfo={showChatInfo}
            messengerMode
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-10 h-10 text-primary/60" />
              </div>
              <h3 className="text-lg font-semibold text-foreground/70 mb-1">
                {isHebrew ? 'בחר שיחה' : 'Select a conversation'}
              </h3>
              <p className="text-sm text-muted-foreground max-w-[240px] mx-auto">
                {isHebrew ? 'בחר שיחה מהרשימה כדי לצפות בהודעות' : 'Choose a conversation from the list to view messages'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: Chat Info Sidebar — Desktop */}
      {selectedConversation && showChatInfo && (
        <div className="hidden md:flex w-[280px] shrink-0">
          <ChatInfoSidebar
            conversation={selectedConversation}
            onClose={() => setShowChatInfo(false)}
          />
        </div>
      )}

      {/* RIGHT: Chat Info Sidebar — Mobile (Sheet) */}
      <Sheet open={showChatInfo && !!selectedConversation} onOpenChange={(o) => !o && setShowChatInfo(false)}>
        <SheetContent side={isHebrew ? 'left' : 'right'} className="p-0 w-[300px] md:hidden">
          {selectedConversation && (
            <ChatInfoSidebar
              conversation={selectedConversation}
              onClose={() => setShowChatInfo(false)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
