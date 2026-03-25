import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VoicePracticeSession } from '@/components/interview/VoicePracticeSession';
import { VideoPracticeSession } from '@/components/interview/VideoPracticeSession';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/contexts/CreditsContext';
import { Header } from '@/components/Header';
import { CreditCostBanner } from '@/components/credits/CreditCostBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  ChevronRight,
  Play,
  BookOpen,
  Users,
  Briefcase,
  Brain,
  Loader2,
  CheckCircle2,
  Lightbulb,
  ArrowRight,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface InterviewQuestion {
  id: string;
  question: string;
  category: 'behavioral' | 'technical' | 'situational';
  tip?: string;
}

type PracticeMode = 'none' | 'text' | 'voice' | 'video';

export default function InterviewPrep() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { deductCredits, canAfford, getCost } = useCredits();
  const navigate = useNavigate();
  const isRTL = language === 'he';

  const [activeTab, setActiveTab] = useState('practice');
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('none');

  const cost = getCost('AI_INTERVIEW');

  const handleStartSession = async () => {
    if (!jobTitle.trim()) {
      toast.error(isRTL ? 'נא להזין שם תפקיד' : 'Please enter a job title');
      return;
    }

    if (!canAfford(cost)) {
      toast.error(isRTL ? 'אין מספיק דלק' : 'Not enough fuel');
      return;
    }

    // Deduct credits first
    const result = await deductCredits('ai_interview');
    if (!result.success) {
      return; // Dialog will be shown by context
    }

    setIsGenerating(true);

    try {
      // Generate interview questions using AI
      const { data, error } = await supabase.functions.invoke('generate-interview-questions', {
        body: {
          jobTitle,
          companyName,
          jobDescription,
          language: language,
        }
      });

      if (error) throw error;

      if (data?.questions) {
        setQuestions(data.questions);
        setSessionStarted(true);
        toast.success(isRTL ? 'השאלות מוכנות! בהצלחה!' : 'Questions ready! Good luck!');
      }
    } catch (error) {
      console.error('Error generating questions:', error);
      toast.error(isRTL ? 'שגיאה ביצירת שאלות' : 'Error generating questions');
    } finally {
      setIsGenerating(false);
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

  const handleBackToModeSelection = () => {
    setPracticeMode('none');
  };

  const handlePracticeComplete = () => {
    toast.success(isRTL ? 'כל הכבוד! סיימת את האימון' : 'Great job! You completed the practice');
    setSessionStarted(false);
    setPracticeMode('none');
    setQuestions([]);
    setCurrentQuestionIndex(0);
  };

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
                  : 'Tell me about the position you\'re preparing for'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  placeholder={isRTL 
                    ? 'הדבק כאן את תיאור המשרה לשאלות מותאמות יותר...'
                    : 'Paste the job description here for more tailored questions...'}
                  rows={4}
                />
              </div>

              <Button 
                onClick={handleStartSession}
                disabled={isGenerating || !jobTitle.trim()}
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

          {/* Practice Modes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-card/50 border-border hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">
                  {isRTL ? 'אימון טקסט' : 'Text Practice'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'ענה על שאלות בכתב' : 'Answer questions in writing'}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border hover:border-primary/50 transition-colors">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Mic className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">
                  {isRTL ? 'אימון קולי' : 'Voice Practice'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'דבר בקול ותמלל את התשובות' : 'Speak and transcribe your answers'}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border hover:border-primary/50 transition-colors">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Video className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">
                  {isRTL ? 'אימון וידאו' : 'Video Practice'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'הקלט את עצמך מול המצלמה' : 'Record yourself on camera'}
                </p>
              </CardContent>
            </Card>
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
            <Card
              className="bg-card/50 border-border hover:border-primary/50 transition-all cursor-pointer hover:scale-105"
              onClick={() => setPracticeMode('text')}
            >
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">{isRTL ? 'אימון טקסט' : 'Text Practice'}</h3>
                <p className="text-sm text-muted-foreground">{isRTL ? 'ענה על שאלות בכתב' : 'Answer questions in writing'}</p>
              </CardContent>
            </Card>

            <Card
              className="bg-card/50 border-border hover:border-primary/50 transition-all cursor-pointer hover:scale-105"
              onClick={() => setPracticeMode('voice')}
            >
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Mic className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">{isRTL ? 'אימון קולי' : 'Voice Practice'}</h3>
                <p className="text-sm text-muted-foreground">{isRTL ? 'דבר בקול ותמלל את התשובות' : 'Speak and transcribe your answers'}</p>
              </CardContent>
            </Card>

            <Card
              className="bg-card/50 border-border hover:border-primary/50 transition-all cursor-pointer hover:scale-105"
              onClick={() => setPracticeMode('video')}
            >
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Video className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">{isRTL ? 'אימון וידאו' : 'Video Practice'}</h3>
                <p className="text-sm text-muted-foreground">{isRTL ? 'הקלט את עצמך מול המצלמה' : 'Record yourself on camera'}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* Interview Session (text mode) */
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
                  {isRTL ? `שאלה ${currentQuestionIndex + 1} מתוך ${questions.length}` : `Question ${currentQuestionIndex + 1} of ${questions.length}`}
                </span>
                <span className="font-medium">{Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%</span>
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
              <CardContent className="p-6">
                <Label className="mb-2 block">
                  {isRTL ? 'התשובה שלך' : 'Your Answer'}
                </Label>
                <Textarea
                  placeholder={isRTL
                    ? 'הקלד את התשובה שלך כאן...'
                    : 'Type your answer here...'}
                  rows={6}
                  className="mb-4"
                />
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={handlePrevQuestion}
                    disabled={currentQuestionIndex === 0}
                  >
                    {isRTL ? 'הקודם' : 'Previous'}
                  </Button>
                  <Button
                    onClick={handleNextQuestion}
                    disabled={currentQuestionIndex === questions.length - 1}
                    className="gap-2"
                  >
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

  const renderTipsTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          {
            icon: Target,
            title: isRTL ? 'שיטת STAR' : 'STAR Method',
            description: isRTL 
              ? 'Situation, Task, Action, Result - מבנה מוכח לתשובות התנהגותיות'
              : 'Situation, Task, Action, Result - a proven structure for behavioral answers',
          },
          {
            icon: Clock,
            title: isRTL ? 'ניהול זמן' : 'Time Management',
            description: isRTL
              ? 'שמור על תשובות של 2-3 דקות. לא קצר מדי, לא ארוך מדי'
              : 'Keep answers 2-3 minutes. Not too short, not too long',
          },
          {
            icon: Users,
            title: isRTL ? 'חקור את החברה' : 'Research the Company',
            description: isRTL
              ? 'הכר את הערכים, התרבות והחדשות האחרונות של החברה'
              : 'Know the company\'s values, culture, and recent news',
          },
          {
            icon: Brain,
            title: isRTL ? 'שאל שאלות' : 'Ask Questions',
            description: isRTL
              ? 'הכן 3-5 שאלות חכמות לשאול את המראיין'
              : 'Prepare 3-5 smart questions to ask the interviewer',
          },
        ].map((tip, index) => (
          <Card key={index} className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <tip.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{tip.title}</h3>
                  <p className="text-sm text-muted-foreground">{tip.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  if (!user) {
    navigate('/');
    return null;
  }

  if (sessionStarted && practiceMode === 'voice') {
    return (
      <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
        <Header />
        <main className="container max-w-4xl py-6 px-4">
          <VoicePracticeSession
            questions={questions}
            onComplete={handlePracticeComplete}
            onBack={handleBackToModeSelection}
          />
        </main>
      </div>
    );
  }

  if (sessionStarted && practiceMode === 'video') {
    return (
      <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
        <Header />
        <main className="container max-w-4xl py-6 px-4">
          <VideoPracticeSession
            questions={questions}
            onComplete={handlePracticeComplete}
            onBack={handleBackToModeSelection}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Header />
      
      <main className="container max-w-4xl py-6 px-4 space-y-6">
        {/* Page Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            {isRTL ? 'הכנה לראיון עבודה' : 'Interview Preparation'}
          </h1>
          <p className="text-muted-foreground">
            {isRTL 
              ? 'התאמן על שאלות ראיון עם AI וקבל טיפים מקצועיים'
              : 'Practice interview questions with AI and get professional tips'}
          </p>
        </div>

        {/* Credit Cost Banner */}
        <CreditCostBanner 
          action="AI_INTERVIEW"
          description={isRTL 
            ? 'יצירת שאלות מותאמות אישית לתפקיד שלך'
            : 'Generating personalized questions for your role'}
        />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="practice" className="gap-2">
              <Play className="w-4 h-4" />
              {isRTL ? 'אימון' : 'Practice'}
            </TabsTrigger>
            <TabsTrigger value="tips" className="gap-2">
              <BookOpen className="w-4 h-4" />
              {isRTL ? 'טיפים' : 'Tips'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="practice" className="mt-6">
            {renderPracticeTab()}
          </TabsContent>

          <TabsContent value="tips" className="mt-6">
            {renderTipsTab()}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
