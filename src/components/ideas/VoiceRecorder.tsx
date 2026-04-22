import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Play, Pause, Trash2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  onClear?: () => void;
  maxDurationMs?: number;
}

export function VoiceRecorder({ onRecordingComplete, onClear, maxDurationMs = 120000 }: VoiceRecorderProps) {
  const { language } = useLanguage();
  const isHe = language === 'he';

  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });

      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType });
        setRecordedBlob(blob);
        onRecordingComplete(blob);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(prev => {
          if ((prev + 1) * 1000 >= maxDurationMs) {
            recorder.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      // Microphone not available
    }
  }, [maxDurationMs, onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const togglePlayback = useCallback(() => {
    if (!recordedBlob) return;
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }
    const url = URL.createObjectURL(recordedBlob);
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => setIsPlaying(false);
    audio.play();
    setIsPlaying(true);
  }, [recordedBlob, isPlaying]);

  const clearRecording = useCallback(() => {
    setRecordedBlob(null);
    setDuration(0);
    setIsPlaying(false);
    if (audioRef.current) audioRef.current.pause();
    onClear?.();
  }, [onClear]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (!navigator.mediaDevices?.getUserMedia) {
    return null; // Browser doesn't support recording
  }

  return (
    <div className="flex items-center gap-2">
      {!recordedBlob ? (
        <>
          <Button
            type="button"
            variant={isRecording ? 'destructive' : 'outline'}
            size="sm"
            onClick={isRecording ? stopRecording : startRecording}
            className="gap-1.5"
          >
            {isRecording ? (
              <>
                <Square className="w-3.5 h-3.5" />
                <span className="text-xs">{formatTime(duration)}</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5" />
                <span className="text-xs">{isHe ? 'הקלט' : 'Record'}</span>
              </>
            )}
          </Button>
          {isRecording && (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          )}
        </>
      ) : (
        <>
          <Button type="button" variant="outline" size="sm" onClick={togglePlayback} className="gap-1.5">
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="text-xs">{formatTime(duration)}</span>
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={clearRecording}>
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </Button>
          <span className="text-[10px] text-muted-foreground">
            {isHe ? 'הקלטה שמורה' : 'Recording saved'}
          </span>
        </>
      )}
    </div>
  );
}
