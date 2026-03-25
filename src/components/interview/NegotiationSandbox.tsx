import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Send, Bot, User, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Msg = { role: 'user' | 'assistant'; content: string };

export function NegotiationSandbox() {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Msg = { role: 'user', content: input };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    setLoading(true);

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/plug-chat`;
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages,
          context: { mode: 'negotiation_sandbox' },
        }),
      });

      if (!resp.ok || !resp.body) throw new Error('Stream failed');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantSoFar = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
                }
                return [...prev, { role: 'assistant', content: assistantSoFar }];
              });
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error('Negotiation chat error:', e);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: isHebrew ? 'שגיאה, נסה שוב.' : 'Error, please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4" dir={isHebrew ? 'rtl' : 'ltr'}>
      <h2 className="text-2xl font-bold flex items-center gap-3">
        <DollarSign className="w-6 h-6 text-primary" />
        {isHebrew ? 'סימולטור משא ומתן' : 'Negotiation Sandbox'}
      </h2>
      <p className="text-sm text-muted-foreground -mt-2">
        {isHebrew
          ? 'תרגל משא ומתן על שכר עם AI. אתה המועמד, ה-AI הוא מנהל הגיוס.'
          : 'Practice salary negotiation with AI. You play the candidate, AI plays the hiring manager.'}
      </p>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <ScrollArea className="h-[400px] p-4" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="text-center py-12 space-y-3">
                <Sparkles className="w-10 h-10 text-primary mx-auto" />
                <p className="text-muted-foreground text-sm">
                  {isHebrew
                    ? 'התחל את המשא ומתן! למשל: "קיבלתי הצעה של ₪25,000 לחודש, אבל אני חושב שאני שווה יותר."'
                    : 'Start negotiating! e.g. "I received an offer of $80,000/year but I think I deserve more."'}
                </p>
              </div>
            )}
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1">
                      <User className="w-4 h-4 text-secondary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-primary animate-pulse" />
                  </div>
                  <div className="bg-muted rounded-2xl px-4 py-2 text-sm text-muted-foreground">
                    {isHebrew ? 'חושב...' : 'Thinking...'}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="border-t border-border p-3 flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder={isHebrew ? 'הקלד את המשפט שלך...' : 'Type your response...'}
              disabled={loading}
            />
            <Button size="icon" onClick={sendMessage} disabled={loading || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
