import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Video,
  VideoOff,
  Play,
  Square,
  RotateCcw,
  Loader2,
  Camera,
  Lightbulb,
  ArrowRight,
  ArrowLeft,
  Download,
  Volume2,
  VolumeX,
  Languages,
  Sparkles,
  Star,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface InterviewQuestion {
  id: string;
  question: string;
  category: 'behavioral' | 'technical' | 'situational';
  tip?: string;
}

interface FeedbackResult {
  score: number;
  feedback: string;
  improvements: string[];
}

interface VideoPracticeSessionProps {
  questions: InterviewQuestion[];
  onComplete: () => void;
  onBack: () => void;
  jobTitle?: string;
  questionLanguage?: 'he' | 'en';
}

export function VideoPracticeSession({
  questions,
  onComplete,
  onBack,
  jobTitle,
  questionLanguage,
}: VideoPracticeSessionProps) {
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const qLang = questionLanguage ?? (isRTL ? 'he' : 'en');

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<Blob | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [recognitionLang, setRecognitionLang] = useState<'he' | 'en'>(qLang);
  const [ttsVoices, setTtsVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Feedback state per question
  const [feedbacks, setFeedbacks] = useState<Record<number, FeedbackResult>>({});
  const [isGettingFeedback, setIsGettingFeedback] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playbackVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const currentFeedback = feedbacks[currentQuestionIndex] ?? null;

  // ── Preload TTS voices ───────────────────────────────────────────────────────
  useEffect(() => {
    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length) setTtsVoices(v);
    };
    loadVoices();
    window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', loadVoices);
  }, []);

  const getSpeechRecognition = () => {
    if (typeof window === 'undefined') return null;
    return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  };

  const initRecognition = useCallback(() => {
    const SpeechRecognitionClass = getSpeechRecognition();
    if (!SpeechRecognitionClass) return null;

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = recognitionLang === 'he' ? 'he-IL' : 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalTranscript += result[0].transcript;
        else interim += result[0].transcript;
      }
      if (finalTranscript) setTranscript(prev => prev + ' ' + finalTranscript);
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
    };

    recognition.onend = () => {
      if (isListening && recognitionRef.current) {
        try { recognitionRef.current.start(); } catch { /* ignore */ }
      }
    };

    return recognition;
  }, [recognitionLang, isListening]);

  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, [recognitionLang]);

  // ── Text-to-Speech (fixed: voices preloaded + 50ms delay) ───────────────────
  const speakQuestion = useCallback(() => {
    if (!currentQuestion) return;

    window.speechSynthesis.cancel();
    setIsSpeaking(false);

    const utterance = new SpeechSynthesisUtterance(currentQuestion.question);
    utterance.lang = qLang === 'he' ? 'he-IL' : 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1;

    const voice = ttsVoices.find(v => v.lang.startsWith(qLang === 'he' ? 'he' : 'en'));
    if (voice) utterance.voice = voice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
      setIsSpeaking(false);
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        toast.error(isRTL ? 'שגיאה בהקראה' : 'Speech error');
      }
    };

    utteranceRef.current = utterance;
    setTimeout(() => {
      if (utteranceRef.current === utterance) window.speechSynthesis.speak(utterance);
    }, 50);
  }, [currentQuestion, ttsVoices, qLang, isRTL]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const toggleRecognitionLang = () => {
    const newLang = recognitionLang === 'he' ? 'en' : 'he';
    setRecognitionLang(newLang);
    toast.info(newLang === 'he' ? 'שפת זיהוי: עברית 🇮🇱' : 'Recognition: English 🇬🇧');
  };

  const startCamera = useCallback(async () => {
    setIsInitializing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      setPermissionGranted(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        await videoRef.current.play();
      }
      setIsPreviewing(true);
      toast.success(isRTL ? 'המצלמה מוכנה!' : 'Camera ready!');
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        toast.error(isRTL ? 'נא לאשר גישה למצלמה ולמיקרופון' : 'Please allow camera and microphone access');
        setPermissionGranted(false);
      } else {
        toast.error(isRTL ? 'שגיאה בהפעלת המצלמה' : 'Error starting camera');
      }
    } finally {
      setIsInitializing(false);
    }
  }, [isRTL]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsPreviewing(false);
  }, []);

  const handleStartRecording = async () => {
    if (!streamRef.current) { await startCamera(); return; }
    try {
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4';

      const recorder = new MediaRecorder(streamRef.current, { mimeType });
      videoChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) videoChunksRef.current.push(e.data); };
      recorder.onstop = () => setRecordedVideo(new Blob(videoChunksRef.current, { type: mimeType }));
      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setIsRecording(true);

      if (!recognitionRef.current) recognitionRef.current = initRecognition();
      if (recognitionRef.current) {
        setTranscript('');
        setInterimTranscript('');
        setIsListening(true);
        recognitionRef.current.start();
      }
      toast.success(isRTL ? 'ההקלטה החלה!' : 'Recording started!');
    } catch {
      toast.error(isRTL ? 'שגיאה בהפעלת ההקלטה' : 'Error starting recording');
    }
  };

  const handleStopRecording = () => {
    if (recognitionRef.current) { setIsListening(false); recognitionRef.current.stop(); }
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
    setIsRecording(false);
    toast.success(isRTL ? 'ההקלטה הסתיימה' : 'Recording stopped');
  };

  const handlePlayRecording = () => {
    if (!recordedVideo || !playbackVideoRef.current) return;
    const videoUrl = URL.createObjectURL(recordedVideo);
    playbackVideoRef.current.src = videoUrl;
    playbackVideoRef.current.play();
  };

  const handleDownload = () => {
    if (!recordedVideo) return;
    const url = URL.createObjectURL(recordedVideo);
    const a = document.createElement('a');
    a.href = url; a.download = `interview-practice-q${currentQuestionIndex + 1}.webm`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(isRTL ? 'הסרטון הורד!' : 'Video downloaded!');
  };

  const handleReset = () => {
    setRecordedVideo(null);
    setTranscript('');
    setInterimTranscript('');
    if (playbackVideoRef.current) playbackVideoRef.current.src = '';
  };

  // ── AI Feedback ─────────────────────────────────────────────────────────────
  const handleGetFeedback = async () => {
    const answerText = transcript.trim();
    if (!answerText) {
      toast.error(isRTL ? 'אין תמלול. הקלט תשובה קודם.' : 'No transcript yet. Record your answer first.');
      return;
    }
    setIsGettingFeedback(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(`${supabaseUrl}/functions/v1/interview-answer-feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${session?.access_token || anonKey}`,
        },
        body: JSON.stringify({
          question: currentQuestion.question,
          answer: answerText,
          category: currentQuestion.category,
          language: qLang,
          jobTitle,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFeedbacks(prev => ({ ...prev, [currentQuestionIndex]: data }));
    } catch {
      toast.error(isRTL ? 'שגיאה בקבלת משוב AI' : 'Error getting AI feedback');
    } finally {
      setIsGettingFeedback(false);
    }
  };

  const handleNextQuestion = () => {
    stopSpeaking();
    handleReset();
    if (currentQuestionIndex < questions.length - 1) setCurrentQuestionIndex(prev => prev + 1);
    else { stopCamera(); onComplete(); }
  };

  const handlePrevQuestion = () => {
    stopSpeaking();
    handleReset();
    if (currentQuestionIndex > 0) setCurrentQuestionIndex(prev => prev - 1);
  };

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
      window.speechSynthesis.cancel();
    };
  }, []);

  const scoreColor = (s: number) => s >= 7 ? 'text-green-500' : s >= 4 ? 'text-yellow-500' : 'text-red-500';
  const scoreBg = (s: number) =>
    s >= 7 ? 'border-green-500/30 bg-green-500/5' : s >= 4 ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-red-500/30 bg-red-500/5';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => { stopCamera(); stopSpeaking(); onBack(); }} className="gap-2">
          {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          {isRTL ? 'חזור' : 'Back'}
        </Button>
        <Badge variant="outline" className="gap-1">
          <Video className="w-3 h-3" />
          {isRTL ? 'אימון וידאו' : 'Video Practice'}
        </Badge>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {isRTL ? `שאלה ${currentQuestionIndex + 1} מתוך ${questions.length}` : `Question ${currentQuestionIndex + 1} of ${questions.length}`}
          </span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} />
      </div>

      {/* Current Question */}
      <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Badge variant="outline">
              {currentQuestion?.category === 'behavioral' && (isRTL ? 'התנהגותי' : 'Behavioral')}
              {currentQuestion?.category === 'technical' && (isRTL ? 'טכני' : 'Technical')}
              {currentQuestion?.category === 'situational' && (isRTL ? 'סיטואציוני' : 'Situational')}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={isSpeaking ? stopSpeaking : speakQuestion}
              className="gap-2"
            >
              {isSpeaking
                ? <><VolumeX className="w-4 h-4" />{isRTL ? 'עצור' : 'Stop'}</>
                : <><Volume2 className="w-4 h-4" />{isRTL ? 'הקרא בקול' : 'Read Aloud'}</>}
            </Button>
          </div>
          <h2 className="text-xl font-semibold mb-4" dir={qLang === 'he' ? 'rtl' : 'ltr'}>
            {currentQuestion?.question}
          </h2>
          {currentQuestion?.tip && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/10 border border-accent/20">
              <Lightbulb className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">{currentQuestion.tip}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Video Display */}
      <Card className="bg-card border-border overflow-hidden">
        <CardContent className="p-0">
          <div className="relative aspect-video bg-muted">
            <video
              ref={videoRef}
              className={cn('absolute inset-0 w-full h-full object-cover', recordedVideo ? 'hidden' : 'block')}
              playsInline muted
            />
            <video
              ref={playbackVideoRef}
              className={cn('absolute inset-0 w-full h-full object-cover', recordedVideo ? 'block' : 'hidden')}
              playsInline controls
            />
            {!isPreviewing && !recordedVideo && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                {isInitializing ? (
                  <>
                    <Loader2 className="w-12 h-12 text-muted-foreground animate-spin" />
                    <p className="text-muted-foreground">{isRTL ? 'מפעיל מצלמה...' : 'Starting camera...'}</p>
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 rounded-full bg-muted-foreground/10 flex items-center justify-center">
                      <VideoOff className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground text-center px-4">
                      {isRTL ? 'לחץ על "הפעל מצלמה" להתחלה' : 'Click "Start Camera" to begin'}
                    </p>
                  </>
                )}
              </div>
            )}
            {isRecording && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive text-destructive-foreground"
              >
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-sm font-medium">REC</span>
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transcript */}
      {(transcript || interimTranscript || isRecording) && (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Volume2 className="w-4 h-4 text-primary" />
                {isRTL ? 'תמלול' : 'Transcript'}
                {isRecording && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                    {isRTL ? 'מקליט...' : 'Recording...'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {transcript.trim() && !isRecording && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleGetFeedback}
                    disabled={isGettingFeedback}
                    className="gap-1 text-xs border-primary/40 text-primary hover:bg-primary/10"
                  >
                    {isGettingFeedback ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    {isRTL ? 'קבל משוב AI' : 'AI Feedback'}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleRecognitionLang}
                  disabled={isRecording}
                  className="gap-1"
                >
                  <Languages className="w-4 h-4" />
                  {recognitionLang === 'he' ? '🇮🇱' : '🇬🇧'}
                </Button>
              </div>
            </div>
            <div
              className="p-3 rounded-lg bg-muted/50 min-h-[60px] max-h-[150px] overflow-y-auto"
              dir={recognitionLang === 'he' ? 'rtl' : 'ltr'}
            >
              <p className="text-sm leading-relaxed">
                {transcript + (interimTranscript ? ' ' + interimTranscript : '') || (
                  <span className="text-muted-foreground italic">{isRTL ? 'התחל לדבר...' : 'Start speaking...'}</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Feedback Card */}
      {currentFeedback && (
        <Card className={`border-2 ${scoreBg(currentFeedback.score)}`}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`text-2xl font-bold ${scoreColor(currentFeedback.score)}`}>
                {currentFeedback.score}/10
              </span>
              <div className="flex gap-0.5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn('w-3 h-3', i < currentFeedback.score ? scoreColor(currentFeedback.score) : 'text-muted-foreground/30')}
                    fill={i < currentFeedback.score ? 'currentColor' : 'none'}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground ms-auto flex items-center gap-1">
                <Sparkles className="w-3 h-3" />{isRTL ? 'משוב AI' : 'AI Feedback'}
              </span>
            </div>
            <p className="text-sm leading-relaxed">{currentFeedback.feedback}</p>
            {currentFeedback.improvements?.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">{isRTL ? 'להשתפר:' : 'To improve:'}</p>
                {currentFeedback.improvements.map((imp, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-primary" />
                    <span>{imp}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Control Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {!isPreviewing && !recordedVideo ? (
          <Button
            size="lg"
            onClick={startCamera}
            disabled={isInitializing}
            className="gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground"
          >
            {isInitializing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
            {isRTL ? 'הפעל מצלמה' : 'Start Camera'}
          </Button>
        ) : !isRecording && !recordedVideo ? (
          <>
            <Button
              size="lg"
              onClick={handleStartRecording}
              className="gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground"
            >
              <Video className="w-5 h-5" />{isRTL ? 'התחל הקלטה' : 'Start Recording'}
            </Button>
            <Button variant="outline" size="lg" onClick={stopCamera} className="gap-2">
              <VideoOff className="w-5 h-5" />{isRTL ? 'כבה מצלמה' : 'Stop Camera'}
            </Button>
          </>
        ) : isRecording ? (
          <Button size="lg" variant="destructive" onClick={handleStopRecording} className="gap-2">
            <Square className="w-5 h-5" />{isRTL ? 'עצור הקלטה' : 'Stop Recording'}
          </Button>
        ) : recordedVideo ? (
          <>
            <Button variant="outline" size="lg" onClick={handlePlayRecording} className="gap-2">
              <Play className="w-5 h-5" />{isRTL ? 'נגן' : 'Play'}
            </Button>
            <Button variant="outline" size="lg" onClick={handleDownload} className="gap-2">
              <Download className="w-5 h-5" />{isRTL ? 'הורד' : 'Download'}
            </Button>
            <Button variant="ghost" size="lg" onClick={handleReset} className="gap-2">
              <RotateCcw className="w-5 h-5" />{isRTL ? 'נקה' : 'Reset'}
            </Button>
          </>
        ) : null}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handlePrevQuestion} disabled={currentQuestionIndex === 0} className="gap-2">
          {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          {isRTL ? 'הקודם' : 'Previous'}
        </Button>
        <Button onClick={handleNextQuestion} className="gap-2">
          {currentQuestionIndex === questions.length - 1 ? (isRTL ? 'סיים' : 'Finish') : (isRTL ? 'הבא' : 'Next')}
          {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
