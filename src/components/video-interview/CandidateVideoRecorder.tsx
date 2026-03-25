import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Video, StopCircle, RefreshCw, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Question {
  id: string;
  question_text: string;
  question_order: number;
  question_type: string;
}

interface Interview {
  id: string;
  title: string;
  instructions: string | null;
  think_time_seconds: number;
  answer_time_seconds: number;
  max_retakes: number;
}

interface CandidateVideoRecorderProps {
  interview: Interview;
  questions: Question[];
  onComplete?: () => void;
}

type RecordingState = 'thinking' | 'recording' | 'review' | 'done';

export function CandidateVideoRecorder({ interview, questions, onComplete }: CandidateVideoRecorderProps) {
  const { user } = useAuth();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase] = useState<RecordingState>('thinking');
  const [countdown, setCountdown] = useState(interview.think_time_seconds);
  const [retakesLeft, setRetakesLeft] = useState(interview.max_retakes);
  const [recordedBlobs, setRecordedBlobs] = useState<Record<string, Blob>>({});
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [allDone, setAllDone] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobEvent['data'][]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentQuestion = questions[currentIdx];

  const startStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.play();
      }
    } catch {
      toast.error('לא ניתן לגשת למצלמה. אנא אפשר גישה.');
    }
  }, []);

  useEffect(() => {
    startStream();
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startStream]);

  // Countdown logic
  useEffect(() => {
    if (phase === 'thinking') {
      setCountdown(interview.think_time_seconds);
      timerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            startRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    if (phase === 'recording') {
      setCountdown(interview.answer_time_seconds);
      timerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mr = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setRecordedBlobs(prev => ({ ...prev, [currentQuestion.id]: blob }));
      setPhase('review');
    };
    mr.start();
    mediaRecorderRef.current = mr;
    setPhase('recording');
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const retake = () => {
    setRetakesLeft(prev => prev - 1);
    setPhase('thinking');
  };

  const submitAndNext = async () => {
    const blob = recordedBlobs[currentQuestion.id];
    if (!blob || !user) return;

    setUploadingIdx(currentIdx);
    try {
      const path = `${user.id}/${interview.id}/${currentQuestion.id}-${Date.now()}.webm`;
      const { error: uploadErr } = await supabase.storage
        .from('video-interviews')
        .upload(path, blob, { contentType: 'video/webm' });

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from('video-interviews').getPublicUrl(path);

      await supabase.from('video_interview_responses' as any).insert({
        interview_id: interview.id,
        candidate_id: user.id,
        question_id: currentQuestion.id,
        video_url: publicUrl,
        duration_seconds: interview.answer_time_seconds - countdown,
        retake_number: interview.max_retakes - retakesLeft + 1,
      });

      if (currentIdx < questions.length - 1) {
        setCurrentIdx(prev => prev + 1);
        setRetakesLeft(interview.max_retakes);
        setPhase('thinking');
      } else {
        setAllDone(true);
      }
    } catch (e: any) {
      toast.error('שגיאה בהעלאה: ' + e.message);
    } finally {
      setUploadingIdx(null);
    }
  };

  if (allDone) {
    return (
      <div className="min-h-screen bg-[#0A1128] flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-6">
          <div className="text-8xl animate-bounce">🎉</div>
          <CheckCircle2 className="w-20 h-20 text-primary mx-auto" />
          <h2 className="text-3xl font-bold text-foreground">תודה! תשובותיך נשלחו בהצלחה</h2>
          <p className="text-muted-foreground text-lg">המגייס יצפה בתשובות ויחזור אליך בהקדם</p>
          <Button onClick={onComplete} className="bg-primary text-primary-foreground px-8">
            חזור לדף הבית
          </Button>
        </div>
      </div>
    );
  }

  const isRecording = phase === 'recording';
  const isAnswerTimeLow = isRecording && countdown <= 10;

  return (
    <div className="min-h-screen bg-[#0A1128] flex flex-col" dir="rtl">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-border">
        <h1 className="font-bold text-foreground">{interview.title}</h1>
        <Badge variant="outline" className="text-primary border-primary/30">
          שאלה {currentIdx + 1} מתוך {questions.length}
        </Badge>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        {/* Question */}
        <div className="w-full max-w-2xl">
          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">
            {currentQuestion?.question_type === 'technical' ? 'שאלה טכנית' :
             currentQuestion?.question_type === 'behavioral' ? 'שאלה התנהגותית' :
             currentQuestion?.question_type === 'situational' ? 'שאלה מצבית' : 'שאלה פתוחה'}
          </p>
          <h2 className="text-xl font-semibold text-foreground">{currentQuestion?.question_text}</h2>
        </div>

        {/* Camera */}
        <div className={cn(
          'relative w-full max-w-2xl aspect-video rounded-xl overflow-hidden transition-all',
          isRecording ? 'border-2 border-primary shadow-[0_0_20px_rgba(0,255,157,0.3)]' : 'border border-border'
        )}>
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

          {/* Countdown overlay */}
          <div className="absolute top-4 right-4">
            <div className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold border-2 transition-colors',
              phase === 'thinking' ? 'bg-secondary/80 border-secondary text-white' :
              isAnswerTimeLow ? 'bg-red-500/80 border-red-400 text-white animate-pulse' :
              'bg-primary/80 border-primary text-black'
            )}>
              {countdown}
            </div>
          </div>

          {/* Recording indicator */}
          {isRecording && (
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-white text-sm font-medium">מקליט</span>
            </div>
          )}

          {/* Phase label */}
          {phase === 'thinking' && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm">
              זמן חשיבה — ההקלטה תתחיל אוטומטית
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-3">
          {phase === 'thinking' && (
            <Button onClick={startRecording} className="bg-primary text-primary-foreground gap-2">
              <Video className="w-4 h-4" />
              התחל הקלטה עכשיו
            </Button>
          )}
          {phase === 'recording' && (
            <Button onClick={stopRecording} variant="destructive" className="gap-2">
              <StopCircle className="w-4 h-4" />
              סיים הקלטה
            </Button>
          )}
          {phase === 'review' && (
            <>
              <Button variant="outline" onClick={retake} disabled={retakesLeft <= 0} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                הקלט מחדש {retakesLeft > 0 ? `(${retakesLeft})` : '(נגמר)'}
              </Button>
              <Button
                onClick={submitAndNext}
                disabled={uploadingIdx === currentIdx}
                className="bg-primary text-primary-foreground gap-2"
              >
                {uploadingIdx === currentIdx ? 'שולח...' : (
                  <>
                    {currentIdx < questions.length - 1 ? 'שלח ועבור לשאלה הבאה' : 'שלח וסיים'}
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </>
          )}
        </div>

        {/* Progress */}
        <div className="flex gap-2">
          {questions.map((_, i) => (
            <div key={i} className={cn(
              'w-8 h-1.5 rounded-full transition-colors',
              i < currentIdx ? 'bg-primary' : i === currentIdx ? 'bg-primary/50' : 'bg-muted'
            )} />
          ))}
        </div>
      </div>
    </div>
  );
}
