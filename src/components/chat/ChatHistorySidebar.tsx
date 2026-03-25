import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Search, Plus, MessageSquare, Sparkles, X, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { he } from 'date-fns/locale';

export interface ChatSession {
  session_id: string;
  title: string;
  last_message: string;
  last_message_at: string;
  message_count: number;
}

interface ChatHistorySidebarProps {
  activeSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onNewChat: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function ChatHistorySidebar({ 
  activeSessionId, 
  onSessionSelect, 
  onNewChat,
  isOpen,
  onToggle,
}: ChatHistorySidebarProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'he';

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loadSessions = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Get distinct sessions with their latest message
      const { data, error } = await supabase
        .from('chat_history')
        .select('session_id, session_title, message, created_at, sender')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) {
        setSessions([]);
        return;
      }

      // Group by session_id
      const sessionMap = new Map<string, {
        title: string;
        lastMessage: string;
        lastMessageAt: string;
        count: number;
        firstUserMessage: string;
      }>();

      for (const msg of data) {
        const sid = msg.session_id || 'default';
        const existing = sessionMap.get(sid);
        if (!existing) {
          sessionMap.set(sid, {
            title: msg.session_title || '',
            lastMessage: msg.message,
            lastMessageAt: msg.created_at,
            count: 1,
            firstUserMessage: msg.sender === 'user' ? msg.message : '',
          });
        } else {
          existing.count++;
          // Capture first user message for title fallback
          if (msg.sender === 'user' && !existing.firstUserMessage) {
            existing.firstUserMessage = msg.message;
          }
        }
      }

      const sessionList: ChatSession[] = [];
      for (const [sid, info] of sessionMap) {
        // Generate title from first user message if no explicit title
        const title = info.title || 
          (info.firstUserMessage 
            ? info.firstUserMessage.slice(0, 50) + (info.firstUserMessage.length > 50 ? '...' : '')
            : (isRTL ? 'שיחה חדשה' : 'New Chat'));

        sessionList.push({
          session_id: sid,
          title,
          last_message: info.lastMessage.slice(0, 80),
          last_message_at: info.lastMessageAt,
          message_count: info.count,
        });
      }

      // Sort by most recent
      sessionList.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

      setSessions(sessionList);
    } catch (err) {
      console.error('Failed to load chat sessions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, isRTL]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const filteredSessions = search.trim()
    ? sessions.filter(s => 
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.last_message.toLowerCase().includes(search.toLowerCase())
      )
    : sessions;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return isRTL ? 'היום' : 'Today';
    if (isYesterday(date)) return isRTL ? 'אתמול' : 'Yesterday';
    return format(date, 'dd/MM', { locale: isRTL ? he : undefined });
  };

  // Group sessions by date
  const groupedSessions = filteredSessions.reduce<Record<string, ChatSession[]>>((acc, session) => {
    const key = formatDate(session.last_message_at);
    if (!acc[key]) acc[key] = [];
    acc[key].push(session);
    return acc;
  }, {});

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="absolute top-3 ltr:right-3 rtl:left-3 z-10 h-8 w-8 text-muted-foreground hover:text-foreground"
        title={isRTL ? 'היסטוריית שיחות' : 'Chat History'}
      >
        <PanelRightOpen className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className={cn(
      "w-72 border-s border-border bg-card/50 flex flex-col h-full",
    )}>
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{isRTL ? 'היסטוריה' : 'History'}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={onNewChat}
            title={isRTL ? 'שיחה חדשה' : 'New Chat'}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 text-muted-foreground"
            onClick={onToggle}
          >
            <PanelRightClose className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="p-2">
        <div className="relative">
          <Search className="absolute start-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isRTL ? 'חפש בשיחות...' : 'Search chats...'}
            className="h-8 ps-8 text-xs"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute end-1 top-1 h-6 w-6"
              onClick={() => setSearch('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Sessions List */}
      <ScrollArea className="flex-1">
        <div className="p-1.5 space-y-1">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-pulse text-xs text-muted-foreground">
                {isRTL ? 'טוען...' : 'Loading...'}
              </div>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-8 px-3">
              <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">
                {search 
                  ? (isRTL ? 'לא נמצאו שיחות' : 'No chats found')
                  : (isRTL ? 'אין שיחות עדיין' : 'No chats yet')}
              </p>
            </div>
          ) : (
            Object.entries(groupedSessions).map(([dateLabel, dateSessions]) => (
              <div key={dateLabel}>
                <div className="px-2 py-1.5">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    {dateLabel}
                  </span>
                </div>
                {dateSessions.map((session) => (
                  <button
                    key={session.session_id}
                    onClick={() => onSessionSelect(session.session_id)}
                    className={cn(
                      "w-full text-start rounded-lg px-2.5 py-2 transition-colors text-xs group",
                      activeSessionId === session.session_id
                        ? "bg-primary/10 text-foreground"
                        : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className={cn(
                        "font-medium truncate flex-1",
                        activeSessionId === session.session_id && "text-primary"
                      )}>
                        {session.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {format(new Date(session.last_message_at), 'HH:mm')}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5 leading-tight">
                      {session.last_message}
                    </p>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
