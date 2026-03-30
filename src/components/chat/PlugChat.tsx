import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Sparkles, User, Loader2, Paperclip, Mic, Image } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { ChatHistorySidebar } from './ChatHistorySidebar';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface PlugChatProps {
  initialMessage?: string;
  /** A monotonically increasing key to force re-processing of the same initialMessage (e.g. repeated Quick Action clicks) */
  initialMessageKey?: number;
  onMessageSent?: () => void;
  contextPage?: 'dashboard' | 'cv-builder' | 'applications' | 'jobs' | 'default';
}

export function PlugChat({ initialMessage, initialMessageKey, onMessageSent, contextPage = 'default' }: PlugChatProps) {
  const { t, direction, language } = useLanguage();
  const isRTL = language === 'he';
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [uploadedAttachmentSummary, setUploadedAttachmentSummary] = useState<any>(null);
  const [hasProcessedInitial, setHasProcessedInitial] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const lastContextPageRef = useRef<PlugChatProps['contextPage']>(contextPage);

  // Session management for chat history sidebar
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => crypto.randomUUID());
  const [historySidebarOpen, setHistorySidebarOpen] = useState(false);
  const sidebarRefreshRef = useRef(0);

  // Fetch user's resume for context
  const { data: existingResume } = useQuery({
    queryKey: ['resume-for-chat', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('documents')
        .select('*')
        .eq('owner_id', user.id)
        .eq('doc_type', 'cv')
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch user's applications with job details
  const { data: userApplications } = useQuery({
    queryKey: ['applications-for-chat', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      // Note: Explicitly exclude internal_notes from candidate queries for security
      const { data } = await supabase
        .from('applications')
        .select(`
          id, status, current_stage, match_score, notes, created_at,
          jobs:job_id (id, title, location, job_type, salary_range, company:company_id (name))
        `)
        .eq('candidate_id', user.id)
        .order('created_at', { ascending: false });
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch upcoming interviews
  const { data: upcomingInterviews } = useQuery({
    queryKey: ['interviews-for-chat', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Get user's application IDs first
      const { data: apps } = await supabase
        .from('applications')
        .select('id')
        .eq('candidate_id', user.id);
      
      if (!apps || apps.length === 0) return [];
      
      const appIds = apps.map(a => a.id);
      
      const { data } = await supabase
        .from('interview_reminders')
        .select('*')
        .in('application_id', appIds)
        .gte('interview_date', new Date().toISOString())
        .order('interview_date', { ascending: true });
      
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch user's vouches
  const { data: userVouches } = useQuery({
    queryKey: ['vouches-for-chat', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('vouches')
        .select('id, vouch_type, skills, message')
        .eq('to_user_id', user.id)
        .eq('is_public', true);
      return data;
    },
    enabled: !!user?.id,
  });

  // Load latest session on mount
  useEffect(() => {
    if (user) {
      loadLatestSession();
    }
  }, [user]);

  // Handle initial message from Quick Actions / WelcomeCard - fill input instead of auto-send
  useEffect(() => {
    if (initialMessage && !hasProcessedInitial && user) {
      setHasProcessedInitial(true);
      // Pre-fill the input so the user can review/edit before sending
      setInput(initialMessage);
      // Don't call onMessageSent here - it clears pendingMessage in parent
      // We only want to clear it after the user actually sends
    }
  }, [initialMessage, initialMessageKey, hasProcessedInitial, user]);

  // Reset hasProcessedInitial when initialMessage changes (or when a new key is provided)
  const prevInitialMessageRef = useRef<string | undefined>(undefined);
  const prevInitialMessageKeyRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    const messageChanged = initialMessage !== prevInitialMessageRef.current;
    const keyChanged = initialMessageKey !== prevInitialMessageKeyRef.current;
    if (messageChanged || keyChanged) {
      prevInitialMessageRef.current = initialMessage;
      prevInitialMessageKeyRef.current = initialMessageKey;
      if (initialMessage) {
        // New message arrived, reset so we can process it
        setHasProcessedInitial(false);
      }
    }
  }, [initialMessage, initialMessageKey]);

  // Scroll to bottom when messages change - ONLY within chat container, not the page
  useEffect(() => {
    if (chatContainerRef.current) {
      // Scroll only within the chat container, not the whole page
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Get contextual greeting based on current page - moved before useEffect that uses it
  const getContextualGreeting = () => {
    const isRTL = direction === 'rtl';
    switch (contextPage) {
      case 'cv-builder':
        return {
          title: isRTL ? 'היי! אני כאן לשפר את קורות החיים שלך 📄' : "Hey! I'm here to improve your CV 📄",
          subtitle: isRTL 
            ? 'איך אני יכול לעזור? אוכל לשפר ניסוחים, להציע מילות מפתח, או לסקור את התוכן שלך.'
            : 'How can I help? I can improve phrasing, suggest keywords, or review your content.',
        };
      case 'applications':
        return {
          title: isRTL ? 'מה שלום המשרות שלך? 💼' : 'How are your applications going? 💼',
          subtitle: isRTL 
            ? 'רוצה שאסכם את המשרות ששלחת? או אולי להכין אותך לראיון?'
            : 'Want me to summarize your applications? Or maybe prepare you for an interview?',
        };
      case 'jobs':
        return {
          title: isRTL ? 'בוא נמצא לך את המשרה המושלמת! 🎯' : "Let's find you the perfect job! 🎯",
          subtitle: isRTL 
            ? 'ספר לי מה אתה מחפש ואני אעזור למצוא התאמות.'
            : 'Tell me what you are looking for and I will help find matches.',
        };
      case 'dashboard':
      default:
        return {
          title: t('plug.greeting') || "Hey there! I'm Plug 👋",
          subtitle: isRTL 
            ? 'שאל אותי על משרות, קורות חיים, ראיונות או כל דבר אחר!'
            : 'Ask me about jobs, resumes, interviews, or anything else!',
        };
    }
  };

  // When the user navigates between pages, inject a contextual Plug message
  // so the chat feels page-aware even when there is existing history.
  useEffect(() => {
    if (!user) return;
    // Skip if context didn't change
    if (lastContextPageRef.current === contextPage) return;

    console.log("PlugChat: context changed from", lastContextPageRef.current, "to", contextPage);
    lastContextPageRef.current = contextPage;
    
    // Get the greeting for current context
    const g = getContextualGreeting();
    const content = `${g.title}\n${g.subtitle}`;
    
    // Always add a context message when navigating to a new page
    setMessages((prev) => {
      // If no messages, we'll show the greeting panel instead, but also add a context message
      // so the next interaction has context
      
      // Avoid duplicate context messages
      const lastMsg = prev[prev.length - 1];
      if (lastMsg?.id?.startsWith('ctx-') && lastMsg.content === content) {
        return prev;
      }
      
      // For empty chat, don't add context message (greeting panel shows instead)
      if (prev.length === 0) return prev;
      
      return [
        ...prev,
        {
          id: `ctx-${Date.now()}`,
          content,
          sender: 'ai',
          timestamp: new Date(),
        },
      ];
    });
  }, [contextPage, user, direction, t]);

  const loadChatHistory = async (sessionId?: string) => {
    if (!user) return;

    const targetSession = sessionId || currentSessionId;

    const { data, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', user.id)
      .eq('session_id', targetSession)
      .order('created_at', { ascending: true })
      .limit(100);

    if (!error && data && data.length > 0) {
      setMessages(data.map(msg => ({
        id: msg.id,
        content: msg.message,
        sender: msg.sender as 'user' | 'ai',
        timestamp: new Date(msg.created_at),
      })));
    } else if (!sessionId) {
      // New session, no history - keep empty
      setMessages([]);
    }
  };

  const loadLatestSession = async () => {
    if (!user) return;
    // Load the most recent session
    const { data } = await supabase
      .from('chat_history')
      .select('session_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (data && data.length > 0 && data[0].session_id) {
      setCurrentSessionId(data[0].session_id);
      await loadChatHistory(data[0].session_id);
    }
  };

  const saveMessage = async (content: string, sender: 'user' | 'ai', isFirstInSession?: boolean) => {
    if (!user) return;

    await supabase
      .from('chat_history')
      .insert({
        user_id: user.id,
        message: content,
        sender,
        session_id: currentSessionId,
        // Set title on first user message of session
        ...(isFirstInSession && sender === 'user' ? { session_title: content.slice(0, 60) } : {}),
      });
  };

  const analyzeUploadedFile = async (documentId: string, filePath: string, fileName: string) => {
    // Reuse the existing resume analyzer to extract structured content.
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    if (!accessToken) throw new Error('No active session - please log in');

    const { data: signedData, error: signedErr } = await supabase.storage
      .from('resumes')
      .createSignedUrl(filePath, 60 * 5);

    if (signedErr || !signedData?.signedUrl) {
      throw new Error('Failed to get file URL');
    }

    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        fileUrl: signedData.signedUrl,
        fileName,
        documentId,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || 'Failed to analyze file');
    }

    const json = await res.json();
    return json?.analysis;
  };

  const handleAttachmentPicked = async (file: File) => {
    if (!user?.id) {
      toast.error(direction === 'rtl' ? 'צריך להתחבר כדי להעלות קובץ' : 'Please log in to upload files');
      return;
    }

    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ];

    if (!validTypes.includes(file.type)) {
      toast.error(direction === 'rtl' ? 'אפשר להעלות PDF / Word / Excel / TXT' : 'Please upload PDF / Word / Excel / TXT');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error(direction === 'rtl' ? 'הקובץ גדול מדי (מקסימום 10MB)' : 'File is too large (max 10MB)');
      return;
    }

    setIsUploadingAttachment(true);
    setUploadedAttachmentSummary(null);

    try {
      const fileExt = file.name.split('.').pop() || 'bin';
      const safeBase = file.name.replace(/\.[^.]+$/, '').replace(/[^\x00-\x7F]/g, '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '') || 'file';
      const storagePath = `${user.id}/plug/${Date.now()}_${safeBase}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(storagePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: newDoc, error: dbError } = await supabase
        .from('documents')
        .insert({
          owner_id: user.id,
          file_name: file.name,
          file_path: storagePath,
          file_type: fileExt,
          doc_type: 'plug_attachment',
        })
        .select('id')
        .single();

      if (dbError) throw dbError;

      // Show success immediately — analysis happens in the background
      setUploadedAttachmentSummary({ fileName: file.name, analysis: null });
      toast.success(direction === 'rtl' ? `הקובץ "${file.name}" הועלה ✅` : `File "${file.name}" uploaded ✅`);
      setIsUploadingAttachment(false);

      // Analyze in background (best effort)
      analyzeUploadedFile(newDoc.id, storagePath, file.name)
        .then((analysis) => {
          setUploadedAttachmentSummary({ fileName: file.name, analysis });
          toast.success(direction === 'rtl' ? 'ניתוח הקובץ הושלם ✅' : 'File analyzed ✅', { id: 'analysis-done' });
        })
        .catch((err) => {
          console.warn('Background analysis failed (file still uploaded):', err);
        });

      return; // skip finally setIsUploadingAttachment
    } catch (e: any) {
      console.error('Plug attachment upload error:', e);
      toast.error(direction === 'rtl' ? 'שגיאה בהעלאת הקובץ' : 'Failed to upload file');
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error(direction === 'rtl' ? 'הדפדפן שלך לא תומך בהקלטה קולית' : 'Your browser does not support voice input');
      return;
    }
    if (isRecording) return;

    setIsRecording(true);
    const recognition = new SpeechRecognition();
    recognition.lang = isRTL ? 'he-IL' : 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => (prev ? prev + ' ' + transcript : transcript));
      setIsRecording(false);
    };
    recognition.onerror = () => {
      toast.error(direction === 'rtl' ? 'שגיאה בהקלטה, נסה שוב' : 'Recording failed, please try again');
      setIsRecording(false);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.start();
  };

  const handleImagePicked = async (file: File) => {
    if (!user?.id) {
      toast.error(direction === 'rtl' ? 'צריך להתחבר כדי להעלות תמונה' : 'Please log in to upload images');
      return;
    }

    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validImageTypes.includes(file.type)) {
      toast.error(direction === 'rtl' ? 'אפשר להעלות JPG / PNG / GIF / WebP' : 'Please upload JPG / PNG / GIF / WebP');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(direction === 'rtl' ? 'התמונה גדולה מדי (מקסימום 5MB)' : 'Image is too large (max 5MB)');
      return;
    }

    setIsUploadingAttachment(true);
    setUploadedAttachmentSummary(null);
    try {
      const storagePath = `${user.id}/plug/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(storagePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const fileExt = file.name.split('.').pop();
      const { data: newDoc, error: dbError } = await supabase
        .from('documents')
        .insert({
          owner_id: user.id,
          file_name: file.name,
          file_path: storagePath,
          file_type: fileExt,
          doc_type: 'plug_image',
        })
        .select('id')
        .single();
      if (dbError) throw dbError;

      setUploadedAttachmentSummary({ fileName: file.name, analysis: null, isImage: true });
      toast.success(direction === 'rtl' ? `התמונה "${file.name}" הועלתה ✅` : `Image "${file.name}" uploaded ✅`);
      setIsUploadingAttachment(false);

      // Add a message notifying the user the image is ready to discuss
      const imageMsg = direction === 'rtl'
        ? `📸 העלאתי תמונה: "${file.name}". תוכל לשאול אותי לגבי התמונה הזו.`
        : `📸 Image uploaded: "${file.name}". You can now ask me about this image.`;
      setInput(prev => prev || imageMsg);
    } catch (e) {
      console.error('Image upload error:', e);
      toast.error(direction === 'rtl' ? 'שגיאה בהעלאת התמונה' : 'Failed to upload image');
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const streamAIResponse = async (userMessages: { role: string; content: string }[]): Promise<string> => {
    abortControllerRef.current = new AbortController();
    
    // Build comprehensive context with all user data
    const context: Record<string, unknown> = {};
    
    // Add resume summary
    if (existingResume?.ai_summary && typeof existingResume.ai_summary === 'object') {
      context.resumeSummary = existingResume.ai_summary;
    }

    // Add applications data
    if (userApplications && userApplications.length > 0) {
      context.applications = userApplications.map(app => ({
        jobTitle: (app.jobs as any)?.title || 'Unknown',
        company: (app.jobs as any)?.company?.name || 'Unknown',
        location: (app.jobs as any)?.location,
        jobType: (app.jobs as any)?.job_type,
        status: app.status,
        stage: app.current_stage,
        matchScore: app.match_score,
        appliedAt: app.created_at,
        notes: app.notes,
      }));
    }

    // Add upcoming interviews
    if (upcomingInterviews && upcomingInterviews.length > 0) {
      context.upcomingInterviews = upcomingInterviews.map(i => ({
        date: i.interview_date,
        type: i.interview_type,
        location: i.location,
        notes: i.notes,
      }));
    }

    // Add vouches summary
    if (userVouches && userVouches.length > 0) {
      context.vouches = {
        total: userVouches.length,
        types: userVouches.reduce((acc, v) => {
          acc[v.vouch_type] = (acc[v.vouch_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        skills: [...new Set(userVouches.flatMap(v => v.skills || []))],
      };
    }

    // Add any uploaded attachment summary (from Plug attachments)
    if (uploadedAttachmentSummary?.analysis) {
      context.uploadedAttachment = uploadedAttachmentSummary;
    }

    // Get the user's session token for authentication
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    
    if (!accessToken) {
      throw new Error('No active session - please log in');
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/plug-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ 
        messages: userMessages,
        context: Object.keys(context).length > 0 ? context : undefined,
      }),
      signal: abortControllerRef.current.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const status = response.status;
      const serverMsg = errorData.error || errorData.message || '';

      // Build a clear, user-friendly error message
      if (status === 401 || status === 403) {
        throw new Error('AUTH_ERROR');
      } else if (status === 429) {
        throw new Error('RATE_LIMIT');
      } else if (serverMsg.includes('CLAUDE_API_KEY') || serverMsg.includes('not configured')) {
        throw new Error('API_KEY_MISSING');
      } else if (status === 500 || status === 502 || status === 503) {
        throw new Error(`SERVER_ERROR:${status}:${serverMsg}`);
      } else {
        throw new Error(`UNKNOWN_ERROR:${status}:${serverMsg}`);
      }
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
            // Update the last message with streaming content
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.sender === 'ai') {
                return prev.map((m, i) => 
                  i === prev.length - 1 ? { ...m, content: fullContent } : m
                );
              }
              return [...prev, {
                id: (Date.now() + 1).toString(),
                content: fullContent,
                sender: 'ai' as const,
                timestamp: new Date(),
              }];
            });
          }
        } catch {
          // Incomplete JSON, put back and wait
          buffer = line + '\n' + buffer;
          break;
        }
      }
    }

    return fullContent;
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: content.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    // Let parent clear pendingMessage only when the user actually sends.
    // This keeps Quick Actions reliable across repeated opens.
    onMessageSent?.();

    try {
      const isFirstMessage = messages.length === 0;
      await saveMessage(userMessage.content, 'user', isFirstMessage);

      // Build message history for context
      const recentMessages = messages.slice(-10).map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.content,
      }));
      recentMessages.push({ role: 'user', content: userMessage.content });

      const aiResponse = await streamAIResponse(recentMessages);
      await saveMessage(aiResponse, 'ai');
      // Bump sidebar refresh
      sidebarRefreshRef.current++;
    } catch (error) {
      console.error('Error sending message:', error);
      const errorCode = error instanceof Error ? error.message : 'UNKNOWN';
      const isRTL = direction === 'rtl';

      // Map error codes to clear user-facing messages
      let toastTitle: string;
      let toastDesc: string;
      let chatMessage: string;

      if (errorCode === 'AUTH_ERROR' || errorCode.includes('No active session')) {
        toastTitle = isRTL ? '🔌 נותקת מהמערכת' : '🔌 Session expired';
        toastDesc = isRTL ? 'רענן את הדף והתחבר מחדש' : 'Refresh the page and log in again';
        chatMessage = isRTL
          ? '🔌 נראה שהחיבור שלך פג. רענן את הדף והתחבר מחדש כדי להמשיך.'
          : '🔌 Your session expired. Refresh the page and log in again to continue.';
      } else if (errorCode === 'RATE_LIMIT') {
        toastTitle = isRTL ? '⏳ יותר מדי בקשות' : '⏳ Too many requests';
        toastDesc = isRTL ? 'המתן כמה שניות ונסה שוב' : 'Wait a few seconds and try again';
        chatMessage = isRTL
          ? '⏳ שלחת יותר מדי הודעות ברצף. חכה כמה שניות ונסה שוב.'
          : '⏳ Too many messages in a row. Wait a few seconds and try again.';
      } else if (errorCode === 'API_KEY_MISSING') {
        toastTitle = isRTL ? '⚙️ שגיאת הגדרות שרת' : '⚙️ Server configuration error';
        toastDesc = isRTL ? 'מפתח ה-AI לא מוגדר. פנה למנהל המערכת' : 'AI API key is not configured. Contact the admin';
        chatMessage = isRTL
          ? '⚙️ יש בעיית הגדרות בשרת — מפתח ה-AI (CLAUDE_API_KEY) לא מוגדר. פנה למנהל המערכת.'
          : '⚙️ Server configuration issue — the AI API key (CLAUDE_API_KEY) is not set. Contact the admin.';
      } else if (errorCode.startsWith('SERVER_ERROR')) {
        const parts = errorCode.split(':');
        const statusCode = parts[1] || '500';
        const serverDetail = parts.slice(2).join(':') || '';
        toastTitle = isRTL ? '🔥 שגיאת שרת' : '🔥 Server error';
        toastDesc = isRTL
          ? `שרת ה-AI החזיר שגיאה (${statusCode}). נסה שוב בעוד רגע.`
          : `The AI server returned an error (${statusCode}). Try again in a moment.`;
        chatMessage = isRTL
          ? `🔥 שגיאת שרת (${statusCode})${serverDetail ? ': ' + serverDetail : ''}. נסה שוב בעוד רגע.`
          : `🔥 Server error (${statusCode})${serverDetail ? ': ' + serverDetail : ''}. Try again in a moment.`;
      } else if (errorCode.startsWith('UNKNOWN_ERROR')) {
        const parts = errorCode.split(':');
        const statusCode = parts[1] || '?';
        const serverDetail = parts.slice(2).join(':') || '';
        toastTitle = isRTL ? '❌ שגיאה לא צפויה' : '❌ Unexpected error';
        toastDesc = isRTL
          ? `קוד שגיאה: ${statusCode}${serverDetail ? ' — ' + serverDetail : ''}`
          : `Error code: ${statusCode}${serverDetail ? ' — ' + serverDetail : ''}`;
        chatMessage = isRTL
          ? `❌ שגיאה לא צפויה (${statusCode})${serverDetail ? ': ' + serverDetail : ''}. נסה שוב או פנה לתמיכה.`
          : `❌ Unexpected error (${statusCode})${serverDetail ? ': ' + serverDetail : ''}. Try again or contact support.`;
      } else {
        // Fallback for network errors, aborted requests, etc.
        const rawMsg = error instanceof Error ? error.message : String(error);
        toastTitle = isRTL ? '❌ שגיאה' : '❌ Error';
        toastDesc = rawMsg;
        chatMessage = isRTL
          ? `❌ ${rawMsg || 'שגיאה לא ידועה. בדוק את חיבור האינטרנט ונסה שוב.'}`
          : `❌ ${rawMsg || 'Unknown error. Check your internet connection and try again.'}`;
      }

      toast.error(toastTitle, { description: toastDesc });

      // Add error message to chat so the user sees it inline too
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        content: chatMessage,
        sender: 'ai',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleSend = async () => {
    await sendMessage(input);
  };

  const showGreeting = messages.length === 0;

  const greeting = getContextualGreeting();

  const handleSessionSelect = useCallback(async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setMessages([]);
    // Load that session's messages
    const { data } = await supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', user!.id)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (data && data.length > 0) {
      setMessages(data.map(msg => ({
        id: msg.id,
        content: msg.message,
        sender: msg.sender as 'user' | 'ai',
        timestamp: new Date(msg.created_at),
      })));
    }
  }, [user]);

  const handleNewChat = useCallback(() => {
    const newId = crypto.randomUUID();
    setCurrentSessionId(newId);
    setMessages([]);
  }, []);

  return (
    <div data-tour="plug-chat" className="flex h-[600px] rounded-2xl border border-border bg-card overflow-hidden relative">
      {/* Main Chat Area */}
      <div ref={chatContainerRef} className="flex flex-col flex-1 min-w-0">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h3 className="font-semibold">Plug</h3>
          <p className="text-xs text-muted-foreground">Your AI HR Assistant</p>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs text-muted-foreground">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {showGreeting && (
          <div className="flex justify-center py-8">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-primary-foreground" />
              </div>
              <h4 className="font-semibold text-lg mb-2">{greeting.title}</h4>
              <p className="text-muted-foreground text-sm">
                {greeting.subtitle}
              </p>
            </div>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ 
                duration: 0.3,
                delay: index === messages.length - 1 ? 0 : 0,
                ease: 'easeOut'
              }}
              className={cn(
                'flex gap-3',
                message.sender === 'user' ? 'flex-row-reverse' : ''
              )}
            >
              <motion.div 
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1 }}
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                  message.sender === 'user' 
                    ? 'bg-primary/20 text-primary' 
                    : 'bg-accent/20 text-accent'
                )}
              >
                {message.sender === 'user' ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, x: message.sender === 'user' ? 10 : -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05, duration: 0.25 }}
                className={cn(
                  'max-w-[75%] rounded-2xl px-4 py-2.5',
                  message.sender === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-sm rtl:rounded-tr-2xl rtl:rounded-tl-sm'
                    : 'bg-muted text-foreground rounded-tl-sm rtl:rounded-tl-2xl rtl:rounded-tr-sm plug-ai-highlight'
                )}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                <p className={cn(
                  'text-[10px] mt-1',
                  message.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                )}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </motion.div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && messages[messages.length - 1]?.sender !== 'ai' && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-accent" />
            </div>
            <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-accent" />
                <span className="text-sm text-muted-foreground">{t('plug.thinking')}</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input with function buttons */}
      <div className="p-4 border-t border-border bg-card/80 backdrop-blur-sm space-y-3">
        {/* Function buttons row */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingAttachment}
          >
            <Paperclip className="w-4 h-4 me-1" />
            <span className="text-xs">
              {isUploadingAttachment
                ? (direction === 'rtl' ? 'מעלה…' : 'Uploading…')
                : (direction === 'rtl' ? 'קובץ' : 'File')}
            </span>
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleAttachmentPicked(f);
              e.target.value = '';
            }}
          />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
            onClick={() => imageInputRef.current?.click()}
            disabled={isUploadingAttachment}
          >
            <Image className="w-4 h-4 me-1" />
            <span className="text-xs">{direction === 'rtl' ? 'תמונה' : 'Image'}</span>
          </Button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImagePicked(f);
              e.target.value = '';
            }}
          />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              'h-8 px-2',
              isRecording
                ? 'text-red-500 animate-pulse'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={handleVoiceInput}
            disabled={isLoading}
          >
            <Mic className="w-4 h-4 me-1" />
            <span className="text-xs">
              {isRecording
                ? (direction === 'rtl' ? 'מקליט…' : 'Recording…')
                : (direction === 'rtl' ? 'קול' : 'Voice')}
            </span>
          </Button>
        </div>

        {/* Input row */}
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('plug.placeholder')}
            className="flex-1 h-11 rounded-xl"
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            size="icon" 
            className="h-11 w-11 rounded-xl"
            disabled={!input.trim() || isLoading}
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>
      </div>

      {/* Chat History Sidebar */}
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
