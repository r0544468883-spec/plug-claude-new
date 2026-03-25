import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/contexts/CreditsContext';
import { CreditCostBanner } from '@/components/credits/CreditCostBadge';
import { VoicePracticeSession } from './VoicePracticeSession';
import { VideoPracticeSession } from './VideoPracticeSession';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Mic,
  Video,
  MessageSquare,
  Sparkles,
  Target,
  Clock,
  Play,
  BookOpen,
  Users,
  Briefcase,
  Brain,
  Loader2,
  Lightbulb,
  ArrowRight,
  Zap,
  Link,
  History,
  RefreshCw,
  Trash2,
  CalendarDays,
  ChevronRight,
  X,
  ExternalLink,
  Languages,
  Star,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface InterviewQuestion {
  id: string;
  question: string;
  category: 'behavioral' | 'technical' | 'situational';
  tip?: string;
}

interface PersonalizedTip {
  title: string;
  description: string;
}

interface HistoryEntry {
  id: string;
  jobTitle: string;
  companyName: string;
  mode: string;
  questionCount: number;
  date: string;
}

type PracticeMode = 'none' | 'text' | 'voice' | 'video';

const HISTORY_KEY = 'plug_interview_history';

const modeLabel = (mode: string, isRTL: boolean) => {
  const map: Record<string, [string, string]> = {
    text: ['טקסט', 'Text'],
    voice: ['קולי', 'Voice'],
    video: ['וידאו', 'Video'],
  };
  const [he, en] = map[mode] ?? ['לא ידוע', 'Unknown'];
  return isRTL ? he : en;
};

export function InterviewPrepContent() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { deductCredits, canAfford, getCost, isLoading: isCreditsLoading } = useCredits();
  const isRTL = language === 'he';

  const [activeTab, setActiveTab] = useState('practice');
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('none');
  const [preferredMode, setPreferredMode] = useState<PracticeMode>('none');

  // Question language — independent of UI language
  const [questionLang, setQuestionLang] = useState<'he' | 'en'>(isRTL ? 'he' : 'en');

  // URL extraction state
  const [isExtractingUrl, setIsExtractingUrl] = useState(false);
  const [showUrlBlockedDialog, setShowUrlBlockedDialog] = useState(false);
  const [blockedUrl, setBlockedUrl] = useState('');

  // Text session answers + AI feedback
  const [textAnswers, setTextAnswers] = useState<Record<number, string>>({});
  const [textFeedbacks, setTextFeedbacks] = useState<Record<number, { score: number; feedback: string; improvements: string[] }>>({});
  const [isGettingFeedback, setIsGettingFeedback] = useState(false);

  // Tips state
  const [personalizedTips, setPersonalizedTips] = useState<PersonalizedTip[]>([]);
  const [isGeneratingTips, setIsGeneratingTips] = useState(false);

  // History state
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const cost = getCost('AI_INTERVIEW');
  const tipsCost = getCost('INTERVIEW_TIPS');

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) setHistory(JSON.parse(saved));
    } catch {
      // ignore parse errors
    }
  }, []);

  // Fetch user's submitted applications with job details
  const { data: myApplications } = useQuery({
    queryKey: ['my-applications-interview', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('applications')
        .select(`
          id, created_at,
          jobs:job_id (id, title, description, company:company_id (name))
        `)
        .eq('candidate_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  // Fetch user profile for personalized tips
  const { data: userProfile } = useQuery({
    queryKey: ['profile-for-interview-tips', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('bio, about_me, cv_data, experience_years, personal_tagline')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const handleSelectApplication = (appId: string) => {
    const app = myApplications?.find((a: any) => a.id === appId);
    if (!app) return;
    const job = (app as any).jobs;
    if (job) {
      setJobTitle(job.title ?? '');
      setCompanyName(job.company?.name ?? '');
      setJobDescription(job.description ?? '');
    }
  };

  const handleFetchUrl = async () => {
    const trimmedUrl = jobUrl.trim();
    if (!trimmedUrl || !trimmedUrl.startsWith('http')) {
      toast.error(isRTL ? 'נא להזין קישור תקין (https://...)' : 'Please enter a valid URL (https://...)');
      return;
    }

    // Warn about sites that block server-side scraping
    const blockedPatterns = ['linkedin.com', 'glassdoor.com', 'indeed.com', 'monster.com'];
    const isBlocked = blockedPatterns.some(p => trimmedUrl.includes(p));
    if (isBlocked) {
      toast.warning(
        isRTL
          ? 'LinkedIn/Glassdoor חוסמים גישה אוטומטית. העתק את תיאור המשרה והדבק בשדה "תיאור המשרה" למטה.'
          : 'LinkedIn/Glassdoor block automated access. Copy and paste the job description into the field below.',
        { duration: 6000 }
      );
      return;
    }

    setIsExtractingUrl(true);
    try {
      // Use direct fetch to avoid JWT session issues with supabase.functions.invoke
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(`${supabaseUrl}/functions/v1/extract-job-from-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${session?.access_token || anonKey}`,
        },
        body: JSON.stringify({ url: trimmedUrl, language }),
      });
      const data = await res.json();
      if (data?.error) throw new Error(data.error);

      let filled = 0;
      if (data.jobTitle)       { setJobTitle(data.jobTitle);            filled++; }
      if (data.companyName)    { setCompanyName(data.companyName);      filled++; }
      if (data.jobDescription) { setJobDescription(data.jobDescription); filled++; }

      if (filled > 0) {
        toast.success(isRTL ? 'פרטי המשרה חולצו בהצלחה!' : 'Job details extracted successfully!');
      } else {
        setBlockedUrl(trimmedUrl);
        setShowUrlBlockedDialog(true);
      }
    } catch (err: any) {
      console.error('URL fetch error:', err);
      const errMsg = err?.message || '';
      const isTimeout = errMsg.includes('timeout') || errMsg.includes('8000');
      toast.error(
        isRTL
          ? isTimeout
            ? 'האתר לא הגיב בזמן. העתק את תיאור המשרה ידנית.'
            : `שגיאה בניתוח הקישור: ${errMsg || 'האתר חוסם גישה אוטומטית'}. העתק ידנית.`
          : isTimeout
            ? 'The site did not respond in time. Copy the job description manually.'
            : `Error analyzing URL: ${errMsg || 'site blocks access'}. Please paste manually.`,
        { duration: 6000 }
      );
    } finally {
      setIsExtractingUrl(false);
    }
  };

  const saveToHistory = (mode: PracticeMode, count: number) => {
    const entry: HistoryEntry = {
      id: Date.now().toString(),
      jobTitle,
      companyName,
      mode: mode === 'none' ? 'text' : mode,
      questionCount: count,
      date: new Date().toISOString(),
    };
    const updated = [entry, ...history].slice(0, 30);
    setHistory(updated);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
    toast.success(isRTL ? 'ההיסטוריה נמחקה' : 'History cleared');
  };

  const restoreFromHistory = (entry: HistoryEntry) => {
    setJobTitle(entry.jobTitle);
    setCompanyName(entry.companyName);
    setActiveTab('practice');
    toast.info(isRTL ? 'הפרטים מולאו מההיסטוריה' : 'Details filled from history');
  };

  // ─── Start Practice Session ───────────────────────────────────────────────

  const handleStartSession = async () => {
    if (!jobTitle.trim()) {
      toast.error(isRTL ? 'נא להזין שם תפקיד' : 'Please enter a job title');
      return;
    }

    if (isCreditsLoading) {
      toast.info(isRTL ? 'טוען מידע... נסה שוב בעוד שנייה' : 'Loading... please try again in a moment');
      return;
    }

    if (!canAfford(cost)) {
      toast.error(isRTL ? 'אין מספיק דלק. עבור לדף הקרדיטים לטעינה.' : 'Not enough fuel. Go to Credits to top up.');
      return;
    }

    const result = await deductCredits('ai_interview');
    if (!result.success) {
      const errLower = result.error?.toLowerCase() ?? '';
      if (!errLower.includes('cancel') && !errLower.includes('insufficient')) {
        toast.error(
          isRTL
            ? `שגיאה בניכוי קרדיטים: ${result.error || 'נסה שוב'}`
            : `Credit deduction failed: ${result.error || 'Please try again'}`,
          { duration: 5000 }
        );
      }
      return;
    }

    setIsGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(`${supabaseUrl}/functions/v1/generate-interview-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${session?.access_token || anonKey}`,
        },
        body: JSON.stringify({ jobTitle, companyName, jobDescription, language: questionLang }),
      });
      const data = await res.json();

      if (data?.error) throw new Error(data.error);

      const qs: InterviewQuestion[] = data?.questions ?? [];
      if (qs.length === 0) throw new Error('No questions returned');

      setQuestions(qs);
      setSessionStarted(true);
      setTextAnswers({});
      setTextFeedbacks({});
      saveToHistory(preferredMode, qs.length);

      if (preferredMode !== 'none') {
        setPracticeMode(preferredMode);
      }

      toast.success(isRTL ? `${qs.length} שאלות מוכנות! בהצלחה!` : `${qs.length} questions ready! Good luck!`);
    } catch (err: any) {
      console.error('Error generating questions:', err);
      toast.error(
        isRTL
          ? `שגיאה ביצירת שאלות: ${err?.message || 'נסה שוב'}`
          : `Error generating questions: ${err?.message || 'Please try again'}`,
        { duration: 5000 }
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // ─── Generate Personalized Tips ──────────────────────────────────────────

  const handleGenerateTips = async () => {
    if (!canAfford(tipsCost)) {
      toast.error(isRTL ? 'אין מספיק דלק. עבור לדף הקרדיטים לטעינה.' : 'Not enough fuel. Go to Credits to top up.');
      return;
    }

    const result = await deductCredits('interview_tips');
    if (!result.success) {
      if (!result.error?.toLowerCase().includes('cancel')) {
        toast.error(isRTL ? 'שגיאה בניכוי קרדיטים. נסה שוב.' : 'Failed to deduct credits. Please try again.');
      }
      return;
    }

    setIsGeneratingTips(true);
    try {
      const cvData = (userProfile?.cv_data as any) ?? {};
      const { data, error } = await supabase.functions.invoke('generate-interview-tips', {
        body: {
          userContext: {
            bio: userProfile?.bio || userProfile?.about_me || '',
            summary: cvData?.personalInfo?.summary || '',
            experience: cvData?.experience?.slice(0, 3) || [],
            skills: cvData?.skills || [],
            experienceYears: userProfile?.experience_years || 0,
          },
          recentJobs: (myApplications ?? []).slice(0, 5).map((a: any) => ({
            title: a.jobs?.title || '',
            company: a.jobs?.company?.name || '',
          })),
          jobTitle,
          companyName,
          language,
        },
      });

      if (error) throw error;

      const tips: PersonalizedTip[] = data?.tips ?? [];
      if (tips.length === 0) throw new Error('No tips returned');

      setPersonalizedTips(tips);
      toast.success(isRTL ? 'טיפים חדשים נוצרו!' : 'New tips generated!');
    } catch (err) {
      console.error('Error generating tips:', err);
      toast.error(isRTL ? 'שגיאה ביצירת טיפים. נסה שוב.' : 'Error generating tips. Please try again.');
    } finally {
      setIsGeneratingTips(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleBackToModeSelection = () => setPracticeMode('none');

  const handleGetTextFeedback = async (questionIndex: number) => {
    const answerText = (textAnswers[questionIndex] ?? '').trim();
    if (!answerText) {
      toast.error(isRTL ? 'נא לכתוב תשובה קודם' : 'Please write an answer first');
      return;
    }
    const q = questions[questionIndex];
    if (!q) return;
    setIsGettingFeedback(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(`${supabaseUrl}/functions/v1/interview-answer-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': anonKey, 'Authorization': `Bearer ${session?.access_token || anonKey}` },
        body: JSON.stringify({ question: q.question, answer: answerText, category: q.category, language: questionLang, jobTitle }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTextFeedbacks(prev => ({ ...prev, [questionIndex]: data }));
    } catch {
      toast.error(isRTL ? 'שגיאה בקבלת משוב AI' : 'Error getting AI feedback');
    } finally {
      setIsGettingFeedback(false);
    }
  };

  const handlePracticeComplete = () => {
    toast.success(isRTL ? 'כל הכבוד! סיימת את האימון' : 'Great job! You completed the practice');
    setSessionStarted(false);
    setPracticeMode('none');
    setQuestions([]);
    setCurrentQuestionIndex(0);
  };

  // ─── Active session overlays ──────────────────────────────────────────────

  if (sessionStarted && practiceMode === 'voice') {
    return (
      <VoicePracticeSession
        questions={questions}
        onComplete={handlePracticeComplete}
        onBack={handleBackToModeSelection}
        jobTitle={jobTitle}
        questionLanguage={questionLang}
      />
    );
  }

  if (sessionStarted && practiceMode === 'video') {
    return (
      <VideoPracticeSession
        questions={questions}
        onComplete={handlePracticeComplete}
        onBack={handleBackToModeSelection}
        jobTitle={jobTitle}
        questionLanguage={questionLang}
      />
    );
  }

  // ─── Tab renderers ────────────────────────────────────────────────────────

  const renderPracticeTab = () => (
    <div className="space-y-6">
      {!sessionStarted ? (
        <>
          {/* Job Details Form */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" />
                {isRTL ? 'פרטי המשרה' : 'Job Details'}
              </CardTitle>
              <CardDescription>
                {isRTL
                  ? 'ספר לי על המשרה שאתה מתכונן אליה'
                  : "Tell me about the position you're preparing for"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quick fill from existing applications */}
              {myApplications && myApplications.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5" />
                    {isRTL ? 'בחר ממשרה שהגשת' : 'Fill from your applications'}
                  </Label>
                  <Select onValueChange={handleSelectApplication}>
                    <SelectTrigger>
                      <SelectValue placeholder={isRTL ? 'בחר משרה...' : 'Select an application...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {myApplications.map((app: any) => (
                        <SelectItem key={app.id} value={app.id}>
                          {app.jobs?.title ?? '—'}
                          {app.jobs?.company?.name ? ` · ${app.jobs.company.name}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* External URL + Fetch button */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Link className="w-3.5 h-3.5" />
                  {isRTL ? 'קישור למשרה — חלץ פרטים אוטומטית' : 'Job URL — auto-extract details'}
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={jobUrl}
                    onChange={(e) => setJobUrl(e.target.value)}
                    placeholder="https://..."
                    dir="ltr"
                    className="flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && handleFetchUrl()}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleFetchUrl}
                    disabled={isExtractingUrl || !jobUrl.trim()}
                    className="shrink-0 gap-2"
                  >
                    {isExtractingUrl ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    {isRTL ? 'נתח' : 'Fetch'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {isRTL ? 'הדבק קישור למשרה (LinkedIn, AllJobs וכד׳) ולחץ נתח' : 'Paste a job link (LinkedIn, AllJobs, etc.) and click Fetch'}
                </p>
              </div>

              {/* Question Language Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
                <div className="flex items-center gap-2 text-sm">
                  <Languages className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{isRTL ? 'שפת השאלות:' : 'Question language:'}</span>
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={questionLang === 'he' ? 'default' : 'outline'}
                    onClick={() => setQuestionLang('he')}
                    className="text-xs h-7 px-2"
                  >
                    🇮🇱 עברית
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={questionLang === 'en' ? 'default' : 'outline'}
                    onClick={() => setQuestionLang('en')}
                    className="text-xs h-7 px-2"
                  >
                    🇬🇧 English
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? 'תפקיד' : 'Job Title'} *</Label>
                  <Input
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder={isRTL ? 'לדוגמה: Frontend Developer' : 'e.g., Frontend Developer'}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? 'חברה' : 'Company'}</Label>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder={isRTL ? 'לדוגמה: Google' : 'e.g., Google'}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? 'תיאור המשרה (אופציונלי)' : 'Job Description (optional)'}</Label>
                <Textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder={
                    isRTL
                      ? 'הדבק כאן את תיאור המשרה לשאלות מותאמות יותר...'
                      : 'Paste the job description here for more tailored questions...'
                  }
                  rows={4}
                />
              </div>

              <Button
                onClick={handleStartSession}
                disabled={isGenerating}
                className="w-full gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {isRTL ? 'מכין שאלות...' : 'Preparing questions...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    {isRTL ? 'התחל אימון ראיון' : 'Start Interview Practice'}
                    <Badge variant="secondary" className="ms-2 bg-white/20">
                      <Zap className="w-3 h-3 me-1" />
                      {cost}
                    </Badge>
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Practice Mode Pre-selection */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground text-center">
              {isRTL
                ? 'בחר סגנון אימון (ניתן לשנות לאחר יצירת השאלות)'
                : 'Choose your practice style — you can change it after questions are generated'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(
                [
                  { mode: 'text' as PracticeMode, icon: MessageSquare, labelHe: 'אימון טקסט', labelEn: 'Text Practice', descHe: 'ענה על שאלות בכתב', descEn: 'Answer questions in writing' },
                  { mode: 'voice' as PracticeMode, icon: Mic, labelHe: 'אימון קולי', labelEn: 'Voice Practice', descHe: 'דבר בקול ותמלל את התשובות', descEn: 'Speak and transcribe your answers' },
                  { mode: 'video' as PracticeMode, icon: Video, labelHe: 'אימון וידאו', labelEn: 'Video Practice', descHe: 'הקלט את עצמך מול המצלמה', descEn: 'Record yourself on camera' },
                ] as const
              ).map(({ mode, icon: Icon, labelHe, labelEn, descHe, descEn }) => (
                <Card
                  key={mode}
                  className={`border transition-all cursor-pointer hover:scale-105 ${
                    preferredMode === mode
                      ? 'border-primary bg-primary/5'
                      : 'bg-card/50 border-border hover:border-primary/50'
                  }`}
                  onClick={() => setPreferredMode(preferredMode === mode ? 'none' : mode)}
                >
                  <CardContent className="p-6 text-center">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 ${
                        preferredMode === mode ? 'bg-primary/20' : 'bg-primary/10'
                      }`}
                    >
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-1">{isRTL ? labelHe : labelEn}</h3>
                    <p className="text-sm text-muted-foreground">{isRTL ? descHe : descEn}</p>
                    {preferredMode === mode && (
                      <Badge className="mt-2 bg-primary/10 text-primary border-primary/20">
                        {isRTL ? 'נבחר' : 'Selected'}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      ) : practiceMode === 'none' ? (
        /* Mode Selection after questions generated */
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
            <CardContent className="p-6 text-center">
              <Sparkles className="w-10 h-10 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-lg mb-2">
                {isRTL ? `${questions.length} שאלות מוכנות!` : `${questions.length} questions ready!`}
              </h3>
              <p className="text-muted-foreground">
                {isRTL ? 'בחר את סגנון האימון שלך' : 'Choose your practice style'}
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(
              [
                { mode: 'text' as PracticeMode, icon: MessageSquare, labelHe: 'אימון טקסט', labelEn: 'Text Practice', descHe: 'ענה על שאלות בכתב', descEn: 'Answer questions in writing' },
                { mode: 'voice' as PracticeMode, icon: Mic, labelHe: 'אימון קולי', labelEn: 'Voice Practice', descHe: 'דבר בקול ותמלל את התשובות', descEn: 'Speak and transcribe your answers' },
                { mode: 'video' as PracticeMode, icon: Video, labelHe: 'אימון וידאו', labelEn: 'Video Practice', descHe: 'הקלט את עצמך מול המצלמה', descEn: 'Record yourself on camera' },
              ] as const
            ).map(({ mode, icon: Icon, labelHe, labelEn, descHe, descEn }) => (
              <Card
                key={mode}
                className="bg-card/50 border-border hover:border-primary/50 transition-all cursor-pointer hover:scale-105"
                onClick={() => setPracticeMode(mode)}
              >
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">{isRTL ? labelHe : labelEn}</h3>
                  <p className="text-sm text-muted-foreground">{isRTL ? descHe : descEn}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        /* Text Interview Session */
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {isRTL
                    ? `שאלה ${currentQuestionIndex + 1} מתוך ${questions.length}`
                    : `Question ${currentQuestionIndex + 1} of ${questions.length}`}
                </span>
                <span className="font-medium">
                  {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%
                </span>
              </div>
              <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} />
            </div>

            {/* Current Question */}
            <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
              <CardContent className="p-6">
                <Badge variant="outline" className="mb-4">
                  {questions[currentQuestionIndex]?.category === 'behavioral' && (isRTL ? 'התנהגותי' : 'Behavioral')}
                  {questions[currentQuestionIndex]?.category === 'technical' && (isRTL ? 'טכני' : 'Technical')}
                  {questions[currentQuestionIndex]?.category === 'situational' && (isRTL ? 'סיטואציוני' : 'Situational')}
                </Badge>
                <h2 className="text-xl font-semibold mb-4">
                  {questions[currentQuestionIndex]?.question}
                </h2>
                {questions[currentQuestionIndex]?.tip && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <Lightbulb className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      {questions[currentQuestionIndex].tip}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Answer Area */}
            <Card className="bg-card border-border">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Label>{isRTL ? 'התשובה שלך' : 'Your Answer'}</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleGetTextFeedback(currentQuestionIndex)}
                    disabled={isGettingFeedback || !(textAnswers[currentQuestionIndex]?.trim())}
                    className="gap-1 text-xs border-primary/40 text-primary hover:bg-primary/10"
                  >
                    {isGettingFeedback ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    {isRTL ? 'קבל משוב AI' : 'AI Feedback'}
                  </Button>
                </div>
                <Textarea
                  value={textAnswers[currentQuestionIndex] ?? ''}
                  onChange={(e) => setTextAnswers(prev => ({ ...prev, [currentQuestionIndex]: e.target.value }))}
                  placeholder={isRTL ? 'הקלד את התשובה שלך כאן...' : 'Type your answer here...'}
                  rows={6}
                  dir={questionLang === 'he' ? 'rtl' : 'ltr'}
                />

                {/* AI Feedback for text mode */}
                {textFeedbacks[currentQuestionIndex] && (() => {
                  const fb = textFeedbacks[currentQuestionIndex];
                  const sc = fb.score;
                  const scoreCls = sc >= 7 ? 'text-green-500' : sc >= 4 ? 'text-yellow-500' : 'text-red-500';
                  const bgCls = sc >= 7 ? 'border-green-500/30 bg-green-500/5' : sc >= 4 ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-red-500/30 bg-red-500/5';
                  return (
                    <div className={`rounded-lg border-2 p-4 space-y-2 ${bgCls}`}>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`text-xl font-bold ${scoreCls}`}>{sc}/10</span>
                        <div className="flex gap-0.5">
                          {Array.from({ length: 10 }).map((_, i) => (
                            <Star key={i} className={`w-3 h-3 ${i < sc ? scoreCls : 'text-muted-foreground/30'}`} fill={i < sc ? 'currentColor' : 'none'} />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground ms-auto flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />{isRTL ? 'משוב AI' : 'AI Feedback'}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed">{fb.feedback}</p>
                      {fb.improvements?.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-muted-foreground">{isRTL ? 'להשתפר:' : 'To improve:'}</p>
                          {fb.improvements.map((imp, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                              <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-primary" />
                              <span>{imp}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="flex items-center justify-between">
                  <Button variant="outline" onClick={handlePrevQuestion} disabled={currentQuestionIndex === 0}>
                    {isRTL ? 'הקודם' : 'Previous'}
                  </Button>
                  <Button onClick={handleNextQuestion} disabled={currentQuestionIndex === questions.length - 1} className="gap-2">
                    {isRTL ? 'הבא' : 'Next'}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );

  // ─── Tips Tab ─────────────────────────────────────────────────────────────

  const staticTips = [
    {
      icon: Target,
      titleHe: 'שיטת STAR',
      titleEn: 'STAR Method',
      descHe: 'Situation, Task, Action, Result — מבנה מוכח לתשובות התנהגותיות שמראה חשיבה מסודרת.',
      descEn: 'Situation, Task, Action, Result — a proven structure for behavioral answers that shows organized thinking.',
    },
    {
      icon: Clock,
      titleHe: 'ניהול זמן',
      titleEn: 'Time Management',
      descHe: 'שמור על תשובות של 2–3 דקות. לא קצר מדי שנראה שאין לך מה לספר, לא ארוך מדי שתאבד את תשומת הלב.',
      descEn: 'Keep answers 2–3 minutes. Not too short (seems like nothing to say), not too long (loses attention).',
    },
    {
      icon: Users,
      titleHe: 'חקור את החברה',
      titleEn: 'Research the Company',
      descHe: 'הכר את הערכים, התרבות, המוצרים והחדשות האחרונות. שלב את הידע הזה בתשובותיך.',
      descEn: "Know the company's values, culture, products, and recent news. Weave this into your answers.",
    },
    {
      icon: Brain,
      titleHe: 'שאל שאלות חכמות',
      titleEn: 'Ask Smart Questions',
      descHe: 'הכן 3–5 שאלות שמראות עניין עמוק בתפקיד, בצוות ובאתגרים של החברה.',
      descEn: 'Prepare 3–5 questions that show genuine interest in the role, team, and company challenges.',
    },
  ];

  const renderTipsTab = () => (
    <div className="space-y-6">
      {/* Personalized Tips Section */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-5 h-5 text-primary" />
              {isRTL ? 'טיפים אישיים לפרופיל שלך' : 'Personalized Tips for Your Profile'}
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerateTips}
              disabled={isGeneratingTips}
              className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
            >
              {isGeneratingTips ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {isRTL ? 'רענן טיפים' : 'Refresh Tips'}
              <Badge variant="secondary" className="ms-1 text-xs">
                <Zap className="w-2.5 h-2.5 me-0.5" />
                {tipsCost}
              </Badge>
            </Button>
          </div>
          <CardDescription>
            {isRTL
              ? 'לחץ על "רענן טיפים" לקבלת המלצות ספציפיות מותאמות לקורות החיים והניסיון שלך'
              : 'Click "Refresh Tips" to get specific recommendations tailored to your CV and experience'}
          </CardDescription>
        </CardHeader>

        {personalizedTips.length > 0 && (
          <CardContent>
            <div className="space-y-4">
              {personalizedTips.map((tip, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-background/60 border border-primary/10">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">{i + 1}</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-1">{tip.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{tip.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}

        {personalizedTips.length === 0 && !isGeneratingTips && (
          <CardContent>
            <div className="text-center py-4 text-muted-foreground text-sm">
              <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>{isRTL ? 'לחץ על "רענן טיפים" לקבלת המלצות מותאמות אישית' : 'Click "Refresh Tips" to get personalized recommendations'}</p>
            </div>
          </CardContent>
        )}

        {isGeneratingTips && (
          <CardContent>
            <div className="text-center py-4 text-muted-foreground text-sm">
              <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-primary" />
              <p>{isRTL ? 'יוצר טיפים מותאמים אישית...' : 'Generating personalized tips...'}</p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Static Tips */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          {isRTL ? 'טיפים כלליים' : 'General Tips'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {staticTips.map((tip, index) => (
            <Card key={index} className="bg-card border-border">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <tip.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{isRTL ? tip.titleHe : tip.titleEn}</h3>
                    <p className="text-sm text-muted-foreground">{isRTL ? tip.descHe : tip.descEn}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );

  // ─── History Tab ──────────────────────────────────────────────────────────

  const renderHistoryTab = () => (
    <div className="space-y-4">
      {history.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <History className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">
              {isRTL ? 'עוד לא ביצעת אימון. התחל עכשיו!' : 'No practice sessions yet. Start one now!'}
            </p>
            <Button
              className="mt-4 gap-2"
              onClick={() => setActiveTab('practice')}
            >
              <Play className="w-4 h-4" />
              {isRTL ? 'לאימון' : 'Go to Practice'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {isRTL ? `${history.length} אימונים` : `${history.length} sessions`}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearHistory}
              className="gap-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
              {isRTL ? 'נקה הכל' : 'Clear All'}
            </Button>
          </div>

          <div className="space-y-3">
            {history.map((entry) => (
              <Card key={entry.id} className="bg-card border-border hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm truncate">{entry.jobTitle}</h4>
                        {entry.companyName && (
                          <span className="text-xs text-muted-foreground truncate">· {entry.companyName}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {new Date(entry.date).toLocaleDateString(isRTL ? 'he-IL' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <Badge variant="secondary" className="text-xs py-0">
                          {modeLabel(entry.mode, isRTL)}
                        </Badge>
                        <span>{entry.questionCount} {isRTL ? 'שאלות' : 'questions'}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => restoreFromHistory(entry)}
                      className="gap-1 shrink-0"
                    >
                      {isRTL ? 'חזור' : 'Redo'}
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'} data-tour="interview-prep">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          {isRTL ? 'הכנה לראיון עבודה' : 'Interview Preparation'}
        </h1>
        <p className="text-muted-foreground">
          {isRTL
            ? 'התאמן על שאלות ראיון עם AI וקבל טיפים מקצועיים מותאמים אישית'
            : 'Practice interview questions with AI and get personalized professional tips'}
        </p>
      </div>

      {/* Credit Cost Banner */}
      <CreditCostBanner
        action="AI_INTERVIEW"
        description={
          isRTL
            ? 'יצירת שאלות מותאמות אישית לתפקיד שלך'
            : 'Generating personalized questions for your role'
        }
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="practice" className="gap-2">
            <Play className="w-4 h-4" />
            {isRTL ? 'אימון' : 'Practice'}
          </TabsTrigger>
          <TabsTrigger value="tips" className="gap-2">
            <BookOpen className="w-4 h-4" />
            {isRTL ? 'טיפים' : 'Tips'}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            {isRTL ? 'היסטוריה' : 'History'}
            {history.length > 0 && (
              <Badge variant="secondary" className="ms-1 text-xs py-0 px-1.5">
                {history.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="practice" className="mt-6">
          {renderPracticeTab()}
        </TabsContent>

        <TabsContent value="tips" className="mt-6">
          {renderTipsTab()}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          {renderHistoryTab()}
        </TabsContent>
      </Tabs>

      {/* URL Blocked Dialog */}
      <Dialog open={showUrlBlockedDialog} onOpenChange={setShowUrlBlockedDialog}>
        <DialogContent className="p-0 border-0 overflow-hidden max-w-sm bg-transparent shadow-2xl">
          <div
            className="relative rounded-2xl p-6 text-white plug-nudge-gradient-chat"
            style={{ direction: isRTL ? 'rtl' : 'ltr' }}
          >
            {/* Close */}
            <button
              onClick={() => setShowUrlBlockedDialog(false)}
              className="absolute top-4 end-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>

            {/* Icon + badge */}
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <span className="text-2xl">🔒</span>
              </div>
              <span className="mt-2 px-2 py-0.5 bg-white/20 text-white text-xs font-bold rounded-full border border-white/30">
                {isRTL ? 'גישה נחסמה' : 'Access Blocked'}
              </span>
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold mb-2 leading-snug pe-8">
              {isRTL ? 'לא ניתן לגשת לדף החברה' : "Can't access the company's page"}
            </h2>

            {/* Description */}
            <p className="text-white/85 text-sm leading-relaxed mb-4">
              {isRTL
                ? 'האתר חוסם גישה אוטומטית. אין בעיה — תוכל להעתיק את תיאור המשרה ידנית ולהדביק בשדה למטה.'
                : 'The site blocks automated access. No problem — you can copy the job description manually and paste it below.'}
            </p>

            {/* Steps */}
            <div className="bg-white/15 rounded-xl p-4 mb-5 space-y-2 text-sm">
              <p className="font-semibold text-white/90 mb-1">
                {isRTL ? 'איך ממשיכים?' : 'How to continue:'}
              </p>
              {(isRTL ? [
                '1. פתח את דף המשרה בדפדפן',
                '2. סמן את כל הטקסט (Ctrl+A)',
                '3. העתק (Ctrl+C)',
                '4. חזור לכאן והדבק בשדה "תיאור המשרה"',
              ] : [
                '1. Open the job page in your browser',
                '2. Select all text (Ctrl+A)',
                '3. Copy (Ctrl+C)',
                '4. Come back here and paste in "Job Description"',
              ]).map((step, i) => (
                <p key={i} className="text-white/80">{step}</p>
              ))}
            </div>

            {/* CTA — open the URL */}
            {blockedUrl && (
              <a
                href={blockedUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowUrlBlockedDialog(false)}
                className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-white text-gray-900 font-semibold rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all text-sm mb-2"
              >
                <ExternalLink className="w-4 h-4" />
                {isRTL ? 'פתח דף המשרה' : 'Open Job Page'}
              </a>
            )}

            {/* Dismiss */}
            <button
              onClick={() => setShowUrlBlockedDialog(false)}
              className="w-full text-center text-xs text-white/50 hover:text-white/80 transition-colors"
            >
              {isRTL ? 'אסגור ואדביק ידנית' : "I'll paste it manually"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
