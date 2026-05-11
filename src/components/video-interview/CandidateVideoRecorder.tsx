import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2, Video, StopCircle, RefreshCw, ChevronRight,
  Play, FileText, Image, Link2, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Question {
  id: string;
  question_text: string;
  question_order: number;
  question_type: string;
  media_url?: string | null;
  media_type?: 'video' | 'image' | 'pdf' | 'link' | null;
}

interface Interview {
  id: string;
  title: string;
  instructions: string | null;
  think_time_seconds: number;
  answer_time_seconds: number;
  max_retakes: number;
  mode?: 'structured' | 'freeform';
}

interface CandidateVideoRecorderProps {
  interview: Interview;
  questions: Question[];
  onComplete?: () => void;
}

type RecordingState = 'thinking' | 'recording' | 'review' | 'done';

/* ── Media attachment viewer ── */
function MediaAttachment({ url, type, isHebrew }: { url: string; type: string; isHebrew: boolean }) {
  if (type === 'video') {
    return (
      <div className="rounded-lg overflow-hidden border border-border bg-black">
        <video src={url} controls className="w-full max-h-48 object-contain" />
      </div>
    );
  }
  if (type === 'image') {
    return (
      <div className="rounded-lg overflow-hidden border border-border">
        <img src={url} alt="" className="w-full max-h-48 object-contain bg-muted" />
      </div>
    );
  }
  if (type === 'pdf') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm hover:bg-muted/60 transition-colors"
      >
        <FileText className="w-4 h-4 text-red-500" />
        <span>{isHebrew ? 'צפה בקובץ PDF' : 'View PDF file'}</span>
        <ExternalLink className="w-3 h-3 ms-auto text-muted-foreground" />
      </a>
    );
  }
  if (type === 'link') {
    const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
    const isLoom = url.includes('loom.com');
    if (isYoutube || isLoom) {
      let embedUrl = url;
      if (isYoutube) {
        const match = url.match(/(?:youtu\.be\/|v=)([^&\s]+)/);
        if (match) embedUrl = `https://www.youtube.com/embed/${match[1]}`;
      }
      if (isLoom) {
        embedUrl = url.replace('/share/', '/embed/');
      }
      return (
        <div className="rounded-lg overflow-hidden border border-border aspect-video">
          <iframe src={embedUrl} className="w-full h-full" allowFullScreen allow="autoplay; encrypted-media" />
        </div>
      );
    }
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm hover:bg-muted/60 transition-colors"
      >
        <Link2 className="w-4 h-4 text-blue-500" />
        <span className="truncate flex-1">{url}</span>
        <ExternalLink className="w-3 h-3 text-muted-foreground" />
      </a>
    );
  }
  return null;
}

export function CandidateVideoRecorder({ interview, questions, onComplete }: CandidateVideoRecorderProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const isFreeform = interview.mode === 'freeform';

  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase] = useState<RecordingState>(isFreeform ? 'thinking' : 'thinking');
  const [countdown, setCountdown] = useState(isFreeform ? 0 : interview.think_time_seconds);
  const [retakesLeft, setRetakesLeft] = useState(interview.max_retakes);
  const [recordedBlobs, setRecordedBlobs] = useState<Record<string, Blob>>({});
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [allDone, setAllDone] = useState(false);
  const [recordingElapsed, setRecordingElapsed] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobEvent['data'][]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentQuestion = questions[currentIdx];
  const freeformKey = 'freeform';

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
      toast.error(isHebrew ? 'לא ניתן לגשת למצלמה. אנא אפשר גישה.' : 'Cannot access camera. Please allow access.');
    }
  }, [isHebrew]);

  useEffect(() => {
    startStream();
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    };
  }, [startStream]);

  // Countdown logic — only for structured mode
  useEffect(() => {
    if (isFreeform) return;

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
  }, [phase, isFreeform]);

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    setRecordingElapsed(0);
    const mr = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const key = isFreeform ? freeformKey : currentQuestion.id;
      setRecordedBlobs(prev => ({ ...prev, [key]: blob }));
      setPhase('review');
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    };
    mr.start();
    mediaRecorderRef.current = mr;
    setPhase('recording');

    // Elapsed timer for freeform
    if (isFreeform) {
      elapsedRef.current = setInterval(() => {
        setRecordingElapsed(prev => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const retake = () => {
    setRetakesLeft(prev => prev - 1);
    setPhase(isFreeform ? 'thinking' : 'thinking');
    setRecordingElapsed(0);
  };

  const submitAndNext = async () => {
    const key = isFreeform ? freeformKey : currentQuestion.id;
    const blob = recordedBlobs[key];
    if (!blob || !user) return;

    setUploadingIdx(isFreeform ? -1 : currentIdx);
    try {
      const path = `${user.id}/${interview.id}/${key}-${Date.now()}.webm`;
      const { error: uploadErr } = await supabase.storage
        .from('video-interviews')
        .upload(path, blob, { contentType: 'video/webm' });

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from('video-interviews').getPublicUrl(path);

      if (isFreeform) {
        // Single response for freeform
        await (supabase as any).from('video_interview_responses').insert({
          interview_id: interview.id,
          candidate_id: user.id,
          question_id: null,
          video_url: publicUrl,
          duration_seconds: recordingElapsed,
          retake_number: interview.max_retakes - retakesLeft + 1,
        });
        setAllDone(true);
      } else {
        await (supabase as any).from('video_interview_responses').insert({
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
      }
    } catch (e: any) {
      toast.error((isHebrew ? 'שגיאה בהעלאה: ' : 'Upload error: ') + e.message);
    } finally {
      setUploadingIdx(null);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  /* ── Done screen ── */
  if (allDone) {
    return (
      <div className="min-h-screen bg-[#0A1128] flex items-center justify-center" dir={isHebrew ? 'rtl' : 'ltr'}>
        <div className="text-center space-y-6">
          <CheckCircle2 className="w-20 h-20 text-primary mx-auto" />
          <h2 className="text-3xl font-bold text-foreground">
            {isHebrew ? 'תודה! תשובותיך נשלחו בהצלחה' : 'Thank you! Your responses have been submitted'}
          </h2>
          <p className="text-muted-foreground text-lg">
            {isHebrew ? 'המגייס יצפה בתשובות ויחזור אליך בהקדם' : 'The recruiter will review your responses and get back to you soon'}
          </p>
          <Button onClick={onComplete} className="bg-primary text-primary-foreground px-8">
            {isHebrew ? 'חזור לדף הבית' : 'Back to Dashboard'}
          </Button>
        </div>
      </div>
    );
  }

  const isRecording = phase === 'recording';
  const isAnswerTimeLow = !isFreeform && isRecording && countdown <= 10;
  const maxDuration = interview.answer_time_seconds;

  /* ── Freeform mode UI ── */
  if (isFreeform) {
    return (
      <div className="min-h-screen bg-[#0A1128] flex flex-col" dir={isHebrew ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-border">
          <h1 className="font-bold text-foreground">{interview.title}</h1>
          <Badge variant="outline" className="text-primary border-primary/30">
            {isHebrew ? 'ראיון חופשי' : 'Free-form Interview'}
          </Badge>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
          {/* Instructions */}
          {interview.instructions && (
            <div className="w-full max-w-2xl bg-muted/20 rounded-xl p-4 border border-border">
              <p className="text-sm font-medium text-muted-foreground mb-1">
                {isHebrew ? 'הנחיות מהמגייס' : 'Instructions from recruiter'}
              </p>
              <p className="text-foreground">{interview.instructions}</p>
            </div>
          )}

          {/* Camera */}
          <div className={cn(
            'relative w-full max-w-2xl aspect-video rounded-xl overflow-hidden transition-all',
            isRecording ? 'border-2 border-primary shadow-[0_0_20px_rgba(0,255,157,0.3)]' : 'border border-border'
          )}>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

            {/* Elapsed timer */}
            {isRecording && (
              <div className="absolute top-4 right-4">
                <div className="bg-primary/80 border-2 border-primary text-black px-3 py-1.5 rounded-full text-lg font-bold">
                  {formatTime(recordingElapsed)}
                </div>
              </div>
            )}

            {/* Max duration hint */}
            {isRecording && maxDuration > 0 && (
              <div className="absolute top-4 left-4 bg-black/60 text-white px-3 py-1 rounded-full text-xs">
                {isHebrew ? 'מקסימום: ' : 'Max: '}{formatTime(maxDuration)}
              </div>
            )}

            {/* Recording indicator */}
            {isRecording && (
              <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-red-500 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-white text-sm font-medium">{isHebrew ? 'מקליט' : 'Recording'}</span>
              </div>
            )}

            {/* Pre-recording info */}
            {phase === 'thinking' && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm">
                {isHebrew ? 'לחץ להתחלת הקלטה כשתהיה מוכן' : 'Click to start recording when ready'}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            {phase === 'thinking' && (
              <Button onClick={startRecording} className="bg-primary text-primary-foreground gap-2 px-6">
                <Video className="w-4 h-4" />
                {isHebrew ? 'התחל הקלטה' : 'Start Recording'}
              </Button>
            )}
            {phase === 'recording' && (
              <Button onClick={stopRecording} variant="destructive" className="gap-2 px-6">
                <StopCircle className="w-4 h-4" />
                {isHebrew ? 'סיים הקלטה' : 'Stop Recording'}
              </Button>
            )}
            {phase === 'review' && (
              <>
                <Button variant="outline" onClick={retake} disabled={retakesLeft <= 0} className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  {isHebrew ? 'הקלט מחדש' : 'Re-record'} {retakesLeft > 0 ? `(${retakesLeft})` : `(${isHebrew ? 'נגמר' : 'none'})`}
                </Button>
                <Button
                  onClick={submitAndNext}
                  disabled={uploadingIdx === -1}
                  className="bg-primary text-primary-foreground gap-2 px-6"
                >
                  {uploadingIdx === -1 ? (isHebrew ? 'שולח...' : 'Submitting...') : (
                    <>
                      {isHebrew ? 'שלח וסיים' : 'Submit'}
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── Structured mode UI (question-by-question) ── */
  return (
    <div className="min-h-screen bg-[#0A1128] flex flex-col" dir={isHebrew ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-border">
        <h1 className="font-bold text-foreground">{interview.title}</h1>
        <Badge variant="outline" className="text-primary border-primary/30">
          {isHebrew ? 'שאלה' : 'Question'} {currentIdx + 1} {isHebrew ? 'מתוך' : 'of'} {questions.length}
        </Badge>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        {/* Question + media */}
        <div className="w-full max-w-2xl space-y-3">
          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">
            {currentQuestion?.question_type === 'technical' ? (isHebrew ? 'שאלה טכנית' : 'Technical Question') :
             currentQuestion?.question_type === 'behavioral' ? (isHebrew ? 'שאלה התנהגותית' : 'Behavioral Question') :
             currentQuestion?.question_type === 'situational' ? (isHebrew ? 'שאלה מצבית' : 'Situational Question') :
             (isHebrew ? 'שאלה פתוחה' : 'Open Question')}
          </p>
          <h2 className="text-xl font-semibold text-foreground">{currentQuestion?.question_text}</h2>

          {/* Media attachment */}
          {currentQuestion?.media_url && currentQuestion?.media_type && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                {currentQuestion.media_type === 'video' && <Video className="w-3 h-3" />}
                {currentQuestion.media_type === 'image' && <Image className="w-3 h-3" />}
                {currentQuestion.media_type === 'pdf' && <FileText className="w-3 h-3" />}
                {currentQuestion.media_type === 'link' && <Link2 className="w-3 h-3" />}
                {isHebrew ? 'חומר מצורף מהמגייס' : 'Attachment from recruiter'}
              </p>
              <MediaAttachment url={currentQuestion.media_url} type={currentQuestion.media_type} isHebrew={isHebrew} />
            </div>
          )}
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
              <span className="text-white text-sm font-medium">{isHebrew ? 'מקליט' : 'Recording'}</span>
            </div>
          )}

          {/* Phase label */}
          {phase === 'thinking' && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm">
              {isHebrew ? 'זמן חשיבה — ההקלטה תתחיל אוטומטית' : 'Think time — recording starts automatically'}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-3">
          {phase === 'thinking' && (
            <Button onClick={startRecording} className="bg-primary text-primary-foreground gap-2">
              <Video className="w-4 h-4" />
              {isHebrew ? 'התחל הקלטה עכשיו' : 'Start Recording Now'}
            </Button>
          )}
          {phase === 'recording' && (
            <Button onClick={stopRecording} variant="destructive" className="gap-2">
              <StopCircle className="w-4 h-4" />
              {isHebrew ? 'סיים הקלטה' : 'Stop Recording'}
            </Button>
          )}
          {phase === 'review' && (
            <>
              <Button variant="outline" onClick={retake} disabled={retakesLeft <= 0} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                {isHebrew ? 'הקלט מחדש' : 'Re-record'} {retakesLeft > 0 ? `(${retakesLeft})` : `(${isHebrew ? 'נגמר' : 'none'})`}
              </Button>
              <Button
                onClick={submitAndNext}
                disabled={uploadingIdx === currentIdx}
                className="bg-primary text-primary-foreground gap-2"
              >
                {uploadingIdx === currentIdx ? (isHebrew ? 'שולח...' : 'Submitting...') : (
                  <>
                    {currentIdx < questions.length - 1
                      ? (isHebrew ? 'שלח ועבור לשאלה הבאה' : 'Submit & Next')
                      : (isHebrew ? 'שלח וסיים' : 'Submit & Finish')}
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </>
          )}
        </div>

        {/* Progress dots */}
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
