import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ChatHistorySidebar } from '@/components/chat/ChatHistorySidebar';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface ClientPlugChatProps {
  companyId: string;
  companyName: string;
  companyData?: {
    industry?: string | null;
    lead_status?: string | null;
    historical_value?: number | null;
    total_hires?: number | null;
    avg_hiring_speed_days?: number | null;
  };
  activeJobsCount?: number;
  contactsCount?: number;
  pendingTasksCount?: number;
}

export function ClientPlugChat({ companyId, companyName, companyData, activeJobsCount = 0, contactsCount = 0, pendingTasksCount = 0 }: ClientPlugChatProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'he';

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Session management
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => crypto.randomUUID());
  const [historySidebarOpen, setHistorySidebarOpen] = useState(false);

  const suggestions = isRTL ? [
    'מה הסטטוס הנוכחי מול הלקוח?',
    'תציע לי אסטרטגיה לפיתוח הלקוח',
    'מה כדאי להציע בפגישה הבאה?',
    'תנתח את הביצועים של הלקוח',
  ] : [
    "What's the current status with this client?",
    'Suggest a strategy for growing this account',
    'What should I propose in the next meeting?',
    'Analyze this client\'s performance',
  ];

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('chat_history')
        .select('session_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0 && data[0].session_id) {
        setCurrentSessionId(data[0].session_id);
        const { data: msgs } = await supabase
          .from('chat_history')
          .select('*')
          .eq('user_id', user.id)
          .eq('session_id', data[0].session_id)
          .order('created_at', { ascending: true })
          .limit(100);
        if (msgs && msgs.length > 0) {
          setMessages(msgs.map(msg => ({
            id: msg.id,
            content: msg.message,
            sender: msg.sender as 'user' | 'ai',
            timestamp: new Date(msg.created_at),
          })));
          return;
        }
      }
      setMessages([{
        id: 'greeting',
        content: isRTL
          ? `היי! אני Plug 🔌 אני כאן לעזור לך לנהל את ${companyName}. יש לי גישה לכל הנתונים — שאל אותי הכל!`
          : `Hey! I'm Plug 🔌 I'm here to help you manage ${companyName}. I have access to all the data — ask me anything!`,
        sender: 'ai',
        timestamp: new Date(),
      }]);
    })();
  }, [user, companyId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const streamAIResponse = async (userMessages: { role: string; content: string }[]): Promise<string> => {
    abortControllerRef.current = new AbortController();
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    if (!accessToken) throw new Error('No active session');

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/plug-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify({
        messages: userMessages,
        context: { type: 'client_crm', companyName, companyId, industry: companyData?.industry, leadStatus: companyData?.lead_status, historicalValue: companyData?.historical_value, totalHires: companyData?.total_hires, avgHiringSpeedDays: companyData?.avg_hiring_speed_days, activeJobsCount, contactsCount, pendingTasksCount },
      }),
      signal: abortControllerRef.current.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to get AI response');
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') break;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullContent += content;
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.sender === 'ai' && last.id !== 'greeting') {
                return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: fullContent } : m);
              }
              return [...prev, { id: (Date.now() + 1).toString(), content: fullContent, sender: 'ai' as const, timestamp: new Date() }];
            });
          }
        } catch { buffer = line + '\n' + buffer; break; }
      }
    }
    return fullContent;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage: Message = { id: Date.now().toString(), content: input, sender: 'user', timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    const isFirstMessage = messages.length === 0 || (messages.length === 1 && messages[0].id === 'greeting');
    setInput('');
    setIsLoading(true);

    if (user) {
      await supabase.from('chat_history').insert({
        user_id: user.id, message: input, sender: 'user',
        context: { companyId, companyName, type: 'client_crm' },
        session_id: currentSessionId,
        ...(isFirstMessage ? { session_title: input.slice(0, 60) } : {}),
      });
    }

    try {
      const recentMessages = messages.slice(-10).map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.content }));
      recentMessages.push({ role: 'user', content: userMessage.content });
      const aiResponse = await streamAIResponse(recentMessages);
      if (user) {
        await supabase.from('chat_history').insert({
          user_id: user.id, message: aiResponse, sender: 'ai',
          context: { companyId, companyName, type: 'client_crm' },
          session_id: currentSessionId,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get response';
      if (errorMessage.includes('No active session')) {
        toast.error(isRTL ? '🔌 אופס! התנתקתי...' : '🔌 Oops! Got disconnected...');
      } else {
        toast.error(errorMessage);
      }
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), content: isRTL ? 'מצטער, נתקלתי בשגיאה. נסה שוב.' : 'Sorry, I encountered an error. Please try again.', sender: 'ai', timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleSessionSelect = useCallback(async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setMessages([]);
    const { data } = await supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', user!.id)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(100);
    if (data && data.length > 0) {
      setMessages(data.map(msg => ({ id: msg.id, content: msg.message, sender: msg.sender as 'user' | 'ai', timestamp: new Date(msg.created_at) })));
    }
  }, [user]);

  const handleNewChat = useCallback(() => {
    setCurrentSessionId(crypto.randomUUID());
    setMessages([{
      id: 'greeting',
      content: isRTL
        ? `היי! אני Plug 🔌 אני כאן לעזור לך לנהל את ${companyName}. שאל אותי הכל!`
        : `Hey! I'm Plug 🔌 I'm here to help you manage ${companyName}. Ask me anything!`,
      sender: 'ai',
      timestamp: new Date(),
    }]);
  }, [isRTL, companyName]);

  return (
    <div className="flex h-[400px] relative overflow-hidden rounded-lg border border-border">
      <div className="flex flex-col flex-1 min-w-0">
        <ScrollArea className="flex-1 pr-2" ref={scrollRef}>
          <div className="space-y-3 p-2">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${message.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                  {message.sender === 'ai' && (
                    <div className="flex items-center gap-1 mb-1 text-accent">
                      <Sparkles className="h-3 w-3" />
                      <span className="text-xs font-medium">Plug</span>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.sender !== 'ai' && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2"><Loader2 className="h-4 w-4 animate-spin text-accent" /></div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex flex-wrap gap-1 px-2 py-2">
          {suggestions.slice(0, 2).map((s, i) => (
            <button key={i} onClick={() => setInput(s)} className="text-xs px-2 py-1 rounded-full bg-secondary/50 hover:bg-secondary text-foreground transition-colors">{s}</button>
          ))}
        </div>

        <div className="flex gap-2 p-2 pt-2 border-t">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={isRTL ? 'שאל את Plug על הלקוח...' : 'Ask Plug about this client...'} onKeyDown={(e) => e.key === 'Enter' && handleSend()} dir={isRTL ? 'rtl' : 'ltr'} className="flex-1" />
          <Button size="icon" onClick={handleSend} disabled={!input.trim() || isLoading}><Send className="h-4 w-4" /></Button>
        </div>
      </div>

      <ChatHistorySidebar
        activeSessionId={currentSessionId}
        onSessionSelect={handleSessionSelect}
        onNewChat={handleNewChat}
        isOpen={historySidebarOpen}
        onToggle={() => setHistorySidebarOpen(prev => !prev)}
      />
    </div>
  );
}
