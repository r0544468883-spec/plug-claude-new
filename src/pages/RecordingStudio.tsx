import { useState, useRef, useEffect } from 'react';
import { useScreenRecorder, RecordingMode, CameraShape } from '@/hooks/useScreenRecorder';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import {
  Monitor,
  Camera,
  MonitorPlay,
  Circle,
  Square,
  Play,
  Pause,
  StopCircle,
  Download,
  RotateCcw,
  Upload,
  Loader2,
  Radio,
  Pencil,
  Type,
  Eraser,
  Palette,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ─── Mode card config ────────────────────────────────────────────────────────

interface ModeOption {
  value: RecordingMode;
  iconEn: string;
  labelEn: string;
  labelHe: string;
  descEn: string;
  descHe: string;
  Icon: React.ElementType;
}

const MODE_OPTIONS: ModeOption[] = [
  {
    value: 'screen',
    labelEn: 'Screen Only',
    labelHe: 'מסך בלבד',
    descEn: 'Record your screen without camera',
    descHe: 'הקלט את המסך ללא מצלמה',
    iconEn: 'screen',
    Icon: Monitor,
  },
  {
    value: 'camera',
    labelEn: 'Camera Only',
    labelHe: 'מצלמה בלבד',
    descEn: 'Record yourself with webcam',
    descHe: 'הקלט את עצמך עם מצלמת הרשת',
    iconEn: 'camera',
    Icon: Camera,
  },
  {
    value: 'screen+camera',
    labelEn: 'Screen + Camera',
    labelHe: 'מסך + מצלמה',
    descEn: 'Screen with floating camera bubble',
    descHe: 'מסך עם בועת מצלמה צפה',
    iconEn: 'screen+camera',
    Icon: MonitorPlay,
  },
];

const COUNTDOWN_OPTIONS = [3, 5, 0];

// ─── Component ───────────────────────────────────────────────────────────────

export default function RecordingStudio() {
  const { user } = useAuth();
  const { direction } = useLanguage();
  const isRTL = direction === 'rtl';

  // Config state (mode selection phase)
  const [mode, setMode] = useState<RecordingMode>('screen');
  const [cameraShape, setCameraShape] = useState<CameraShape>('circle');
  const [countdownSeconds, setCountdownSeconds] = useState(3);

  // Upload state
  const [uploading, setUploading] = useState(false);

  // Bubble drag state
  const containerRef = useRef<HTMLDivElement>(null);
  const [bubblePos, setBubblePos] = useState({ x: 0, y: 0 });
  const bubbleInitialized = useRef(false);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Video element refs
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  // ── Live drawing / text annotation state ──────────────────────────────────
  type LiveTool = 'none' | 'draw' | 'text';
  const [liveTool, setLiveTool] = useState<LiveTool>('none');
  const [drawColor, setDrawColor] = useState('#ef4444'); // red
  const [drawSize, setDrawSize] = useState(3);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  // Text annotations placed during live recording
  interface LiveAnnotation {
    id: string;
    text: string;
    x: number; // percentage
    y: number; // percentage
  }
  const [liveAnnotations, setLiveAnnotations] = useState<LiveAnnotation[]>([]);
  const [pendingText, setPendingText] = useState<{ x: number; y: number } | null>(null);
  const [pendingTextValue, setPendingTextValue] = useState('');

  const DRAW_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ffffff', '#000000'];

  // Resize canvas to match container
  useEffect(() => {
    if (!containerRef.current || !drawCanvasRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      if (drawCanvasRef.current) {
        drawCanvasRef.current.width = entry.contentRect.width;
        drawCanvasRef.current.height = entry.contentRect.height;
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [state]);

  // ── Drawing handlers ──────────────────────────────────────────────────────
  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (liveTool !== 'draw' || !drawCanvasRef.current) return;
    isDrawing.current = true;
    const ctx = drawCanvasRef.current.getContext('2d');
    if (!ctx) return;
    const rect = drawCanvasRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = drawSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const moveDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current || liveTool !== 'draw' || !drawCanvasRef.current) return;
    const ctx = drawCanvasRef.current.getContext('2d');
    if (!ctx) return;
    const rect = drawCanvasRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const endDraw = () => { isDrawing.current = false; };

  const clearCanvas = () => {
    if (!drawCanvasRef.current) return;
    const ctx = drawCanvasRef.current.getContext('2d');
    ctx?.clearRect(0, 0, drawCanvasRef.current.width, drawCanvasRef.current.height);
    setLiveAnnotations([]);
  };

  // ── Text placement handler ────────────────────────────────────────────────
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (liveTool !== 'text' || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingText({ x, y });
    setPendingTextValue('');
  };

  const confirmText = () => {
    if (!pendingText || !pendingTextValue.trim()) {
      setPendingText(null);
      return;
    }
    setLiveAnnotations(prev => [
      ...prev,
      { id: Date.now().toString(), text: pendingTextValue.trim(), x: pendingText.x, y: pendingText.y },
    ]);
    setPendingText(null);
    setPendingTextValue('');
  };

  const {
    state,
    duration,
    videoUrl,
    videoBlob,
    screenStream,
    cameraStream,
    countdown,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    reset,
  } = useScreenRecorder({ mode, cameraShape, countdownSeconds });

  // ── Wire streams to video elements ──────────────────────────────────────

  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  useEffect(() => {
    if (cameraVideoRef.current && cameraStream) {
      cameraVideoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  // ── Initialize bubble position to bottom-right of preview container ──────

  useEffect(() => {
    if ((state === 'recording' || state === 'paused') && containerRef.current && !bubbleInitialized.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      const bubbleW = cameraShape === 'circle' ? 128 : 192;
      const bubbleH = cameraShape === 'circle' ? 128 : 144;
      setBubblePos({ x: width - bubbleW - 16, y: height - bubbleH - 16 });
      bubbleInitialized.current = true;
    }
    if (state === 'idle' || state === 'stopped') {
      bubbleInitialized.current = false;
    }
  }, [state, cameraShape]);

  // ── Drag handlers ────────────────────────────────────────────────────────

  const handleBubbleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    dragOffset.current = { x: e.clientX - bubblePos.x, y: e.clientY - bubblePos.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current || !containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const bubbleW = cameraShape === 'circle' ? 128 : 192;
    const bubbleH = cameraShape === 'circle' ? 128 : 144;
    const x = Math.max(0, Math.min(e.clientX - dragOffset.current.x, width - bubbleW));
    const y = Math.max(0, Math.min(e.clientY - dragOffset.current.y, height - bubbleH));
    setBubblePos({ x, y });
  };

  const handleMouseUp = () => {
    dragging.current = false;
  };

  // Touch equivalents
  const handleBubbleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    dragging.current = true;
    dragOffset.current = { x: touch.clientX - bubblePos.x, y: touch.clientY - bubblePos.y };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current || !containerRef.current) return;
    const touch = e.touches[0];
    const { width, height } = containerRef.current.getBoundingClientRect();
    const bubbleW = cameraShape === 'circle' ? 128 : 192;
    const bubbleH = cameraShape === 'circle' ? 128 : 144;
    const x = Math.max(0, Math.min(touch.clientX - dragOffset.current.x, width - bubbleW));
    const y = Math.max(0, Math.min(touch.clientY - dragOffset.current.y, height - bubbleH));
    setBubblePos({ x, y });
  };

  // ── Upload ───────────────────────────────────────────────────────────────

  const uploadRecording = async () => {
    if (!videoBlob || !user?.id) return;
    setUploading(true);
    const filename = `recordings/${user.id}/${Date.now()}.webm`;
    const { error: uploadError } = await supabase.storage
      .from('recordings')
      .upload(filename, videoBlob, { contentType: 'video/webm' });

    if (uploadError) {
      toast.error(isRTL ? 'שגיאה בהעלאה' : 'Upload failed', {
        description: uploadError.message,
      });
    } else {
      await (supabase as any).from('screen_recordings').insert({
        user_id: user.id,
        storage_path: filename,
        duration,
        mode,
      });
      toast.success(isRTL ? 'ההקלטה הועלתה בהצלחה!' : 'Recording uploaded successfully!');
    }
    setUploading(false);
  };

  // ── Download ─────────────────────────────────────────────────────────────

  const downloadRecording = () => {
    if (!videoUrl) return;
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `recording-${Date.now()}.webm`;
    a.click();
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Mode Selection
  // ─────────────────────────────────────────────────────────────────────────

  if (state === 'idle') {
    return (
      <div className={cn('min-h-screen bg-background p-6 flex flex-col items-center', isRTL && 'rtl')} dir={direction}>
        <div className="w-full max-w-3xl space-y-8">

          {/* Header */}
          <div className="text-center space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              {isRTL ? 'אולפן הקלטה' : 'Recording Studio'}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isRTL ? 'הקלט מסך, מצלמה, או שניהם יחד' : 'Record your screen, camera, or both'}
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Mode cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {MODE_OPTIONS.map((opt) => {
              const Icon = opt.Icon;
              const selected = mode === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setMode(opt.value)}
                  className={cn(
                    'group rounded-xl border-2 p-5 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    selected
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border hover:border-primary/40 hover:bg-muted/50',
                    isRTL && 'text-right'
                  )}
                  aria-pressed={selected}
                >
                  <div className={cn('flex flex-col gap-3', isRTL && 'items-end')}>
                    <span
                      className={cn(
                        'inline-flex h-11 w-11 items-center justify-center rounded-lg',
                        selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-semibold text-sm">{isRTL ? opt.labelHe : opt.labelEn}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{isRTL ? opt.descHe : opt.descEn}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Camera shape toggle — only when camera is included */}
          {(mode === 'camera' || mode === 'screen+camera') && (
            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-sm font-medium mb-3">
                  {isRTL ? 'צורת המצלמה' : 'Camera Shape'}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setCameraShape('circle')}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors',
                      cameraShape === 'circle'
                        ? 'border-primary bg-primary/5 text-primary font-medium'
                        : 'border-border hover:border-primary/40'
                    )}
                    aria-pressed={cameraShape === 'circle'}
                  >
                    <Circle className="h-4 w-4" />
                    {isRTL ? 'עיגול' : 'Circle'}
                  </button>
                  <button
                    onClick={() => setCameraShape('rectangle')}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors',
                      cameraShape === 'rectangle'
                        ? 'border-primary bg-primary/5 text-primary font-medium'
                        : 'border-border hover:border-primary/40'
                    )}
                    aria-pressed={cameraShape === 'rectangle'}
                  >
                    <Square className="h-4 w-4" />
                    {isRTL ? 'מלבן' : 'Rectangle'}
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Countdown picker */}
          <Card>
            <CardContent className="pt-5 pb-4">
              <p className="text-sm font-medium mb-3">
                {isRTL ? 'ספירה לאחור לפני ההקלטה' : 'Countdown Before Recording'}
              </p>
              <div className="flex gap-3">
                {COUNTDOWN_OPTIONS.map((sec) => (
                  <button
                    key={sec}
                    onClick={() => setCountdownSeconds(sec)}
                    className={cn(
                      'min-w-[44px] rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                      countdownSeconds === sec
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:border-primary/40'
                    )}
                    aria-pressed={countdownSeconds === sec}
                  >
                    {sec === 0 ? (isRTL ? 'ללא' : 'None') : `${sec}s`}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Start button */}
          <Button
            size="lg"
            className="w-full h-14 text-base font-semibold gap-2"
            onClick={startRecording}
          >
            <Radio className="h-5 w-5" />
            {isRTL ? 'התחל הקלטה' : 'Start Recording'}
          </Button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Countdown overlay + Recording view
  // ─────────────────────────────────────────────────────────────────────────

  if (state === 'countdown' || state === 'recording' || state === 'paused') {
    const withCamera = mode === 'camera' || mode === 'screen+camera';
    const screenOnly = mode === 'screen';

    return (
      <div
        className={cn('relative flex h-screen w-screen flex-col bg-black select-none', isRTL && 'rtl')}
        dir={direction}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
      >
        {/* Main preview */}
        <div ref={containerRef} className="relative flex-1 overflow-hidden">

          {/* Screen stream video */}
          {(screenOnly || mode === 'screen+camera') && (
            <video
              ref={screenVideoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-contain bg-black"
            />
          )}

          {/* Camera-only full view */}
          {mode === 'camera' && (
            <video
              ref={cameraVideoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-cover bg-black"
            />
          )}

          {/* Draggable camera bubble (screen+camera mode) */}
          {mode === 'screen+camera' && (
            <div
              className={cn(
                'absolute z-20 cursor-grab active:cursor-grabbing overflow-hidden shadow-2xl ring-2 ring-white/30',
                cameraShape === 'circle' ? 'rounded-full w-32 h-32' : 'rounded-xl w-48 h-36'
              )}
              style={{ left: bubblePos.x, top: bubblePos.y }}
              onMouseDown={handleBubbleMouseDown}
              onTouchStart={handleBubbleTouchStart}
              aria-label={isRTL ? 'בועת מצלמה — גרור למיקום' : 'Camera bubble — drag to reposition'}
            >
              <video
                ref={cameraVideoRef}
                autoPlay
                muted
                playsInline
                className="h-full w-full object-cover"
              />
            </div>
          )}

          {/* Countdown overlay */}
          {state === 'countdown' && countdown > 0 && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60">
              <span
                key={countdown}
                className="text-[120px] font-black text-white drop-shadow-2xl"
                style={{
                  animation: 'countdownPop 0.9s ease-out forwards',
                }}
              >
                {countdown}
              </span>
              <style>{`
                @keyframes countdownPop {
                  0%   { transform: scale(1.6); opacity: 1; }
                  80%  { transform: scale(0.9); opacity: 1; }
                  100% { transform: scale(1);   opacity: 0.2; }
                }
              `}</style>
            </div>
          )}

          {/* Live drawing canvas overlay */}
          <canvas
            ref={drawCanvasRef}
            className={cn(
              'absolute inset-0 z-25',
              liveTool === 'draw' ? 'cursor-crosshair pointer-events-auto' :
              liveTool === 'text' ? 'cursor-text pointer-events-auto' : 'pointer-events-none',
            )}
            onMouseDown={startDraw}
            onMouseMove={moveDraw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={moveDraw}
            onTouchEnd={endDraw}
            onClick={handleCanvasClick}
          />

          {/* Live text annotations */}
          {liveAnnotations.map(ann => (
            <div
              key={ann.id}
              className="absolute z-25 pointer-events-none px-2 py-1 rounded bg-black/60 text-white text-sm font-medium shadow-lg"
              style={{ left: `${ann.x}%`, top: `${ann.y}%`, transform: 'translate(-50%, -50%)' }}
            >
              {ann.text}
            </div>
          ))}

          {/* Pending text input */}
          {pendingText && (
            <div
              className="absolute z-30"
              style={{ left: `${pendingText.x}%`, top: `${pendingText.y}%`, transform: 'translate(-50%, -50%)' }}
            >
              <Input
                value={pendingTextValue}
                onChange={e => setPendingTextValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') confirmText(); if (e.key === 'Escape') setPendingText(null); }}
                onBlur={confirmText}
                autoFocus
                className="w-48 h-8 text-sm bg-black/80 text-white border-white/30 placeholder:text-white/50"
                placeholder={isRTL ? 'הקלד טקסט...' : 'Type text...'}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>
          )}
        </div>

        {/* Floating control bar */}
        {(state === 'recording' || state === 'paused') && (
          <div className="absolute bottom-6 left-1/2 z-40 -translate-x-1/2">
            <div className="flex items-center gap-3 rounded-2xl bg-black/80 px-5 py-3 shadow-2xl ring-1 ring-white/10 backdrop-blur-md">

              {/* Recording indicator */}
              <span className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'h-2.5 w-2.5 rounded-full bg-red-500',
                    state === 'recording' && 'animate-pulse'
                  )}
                />
                <span className="text-xs font-mono text-white/70 tabular-nums w-12">
                  {formatDuration(duration)}
                </span>
              </span>

              <div className="h-5 w-px bg-white/20" />

              {/* Draw tool */}
              <Button
                size="sm"
                variant="ghost"
                className={cn('h-9 w-9 p-0 text-white hover:bg-white/10', liveTool === 'draw' && 'bg-white/20 ring-1 ring-white/40')}
                onClick={() => setLiveTool(liveTool === 'draw' ? 'none' : 'draw')}
                aria-label={isRTL ? 'ציור' : 'Draw'}
              >
                <Pencil className="h-4 w-4" />
              </Button>

              {/* Text tool */}
              <Button
                size="sm"
                variant="ghost"
                className={cn('h-9 w-9 p-0 text-white hover:bg-white/10', liveTool === 'text' && 'bg-white/20 ring-1 ring-white/40')}
                onClick={() => setLiveTool(liveTool === 'text' ? 'none' : 'text')}
                aria-label={isRTL ? 'טקסט' : 'Text'}
              >
                <Type className="h-4 w-4" />
              </Button>

              {/* Clear drawings */}
              {(liveTool === 'draw' || liveAnnotations.length > 0) && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 w-9 p-0 text-white hover:bg-white/10"
                  onClick={clearCanvas}
                  aria-label={isRTL ? 'נקה ציורים' : 'Clear drawings'}
                >
                  <Eraser className="h-4 w-4" />
                </Button>
              )}

              {/* Color picker (visible when draw tool active) */}
              {liveTool === 'draw' && (
                <div className="flex items-center gap-1">
                  {DRAW_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setDrawColor(c)}
                      className={cn(
                        'h-5 w-5 rounded-full border-2 transition-transform',
                        drawColor === c ? 'border-white scale-125' : 'border-white/30 hover:scale-110'
                      )}
                      style={{ backgroundColor: c }}
                      aria-label={c}
                    />
                  ))}
                </div>
              )}

              <div className="h-5 w-px bg-white/20" />

              {/* Pause / Resume */}
              <Button
                size="sm"
                variant="ghost"
                className="h-9 w-9 p-0 text-white hover:bg-white/10"
                onClick={state === 'paused' ? resumeRecording : pauseRecording}
                aria-label={state === 'paused' ? (isRTL ? 'המשך' : 'Resume') : (isRTL ? 'השהה' : 'Pause')}
              >
                {state === 'paused' ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </Button>

              {/* Stop */}
              <Button
                size="sm"
                variant="ghost"
                className="h-9 w-9 p-0 text-red-400 hover:bg-red-500/20"
                onClick={stopRecording}
                aria-label={isRTL ? 'עצור הקלטה' : 'Stop Recording'}
              >
                <StopCircle className="h-5 w-5" />
              </Button>

              <div className="h-5 w-px bg-white/20" />

              {/* Status badge */}
              <Badge
                variant="outline"
                className={cn(
                  'border-0 text-xs font-medium',
                  state === 'paused'
                    ? 'bg-yellow-500/20 text-yellow-300'
                    : 'bg-red-500/20 text-red-300'
                )}
              >
                {state === 'paused'
                  ? (isRTL ? 'מושהה' : 'Paused')
                  : (isRTL ? 'מקליט' : 'Recording')}
              </Badge>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Preview (stopped)
  // ─────────────────────────────────────────────────────────────────────────

  if (state === 'stopped') {
    return (
      <div className={cn('min-h-screen bg-background p-6 flex flex-col items-center', isRTL && 'rtl')} dir={direction}>
        <div className="w-full max-w-4xl space-y-6">

          {/* Header */}
          <div className={cn('flex items-center justify-between', isRTL && 'flex-row-reverse')}>
            <div>
              <h1 className="text-2xl font-bold">{isRTL ? 'תצוגה מקדימה' : 'Preview'}</h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                {isRTL ? `משך: ${formatDuration(duration)}` : `Duration: ${formatDuration(duration)}`}
              </p>
            </div>
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {MODE_OPTIONS.find((o) => o.value === mode)?.[isRTL ? 'labelHe' : 'labelEn']}
            </Badge>
          </div>

          {/* Video preview */}
          <div className="w-full overflow-hidden rounded-2xl border bg-black shadow-lg aspect-video">
            {videoUrl ? (
              <video
                ref={previewVideoRef}
                src={videoUrl}
                controls
                autoPlay
                playsInline
                className="h-full w-full"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                {isRTL ? 'לא נמצא וידאו' : 'No video available'}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className={cn('flex flex-wrap gap-3', isRTL ? 'flex-row-reverse' : 'flex-row')}>

            {/* Download */}
            <Button
              variant="outline"
              className="gap-2 min-h-[44px]"
              onClick={downloadRecording}
              disabled={!videoUrl}
              aria-label={isRTL ? 'הורד הקלטה' : 'Download Recording'}
            >
              <Download className="h-4 w-4" />
              {isRTL ? 'הורדה' : 'Download'}
            </Button>

            {/* Record Again */}
            <Button
              variant="outline"
              className="gap-2 min-h-[44px]"
              onClick={reset}
              aria-label={isRTL ? 'הקלט שוב' : 'Record Again'}
            >
              <RotateCcw className="h-4 w-4" />
              {isRTL ? 'הקלטה מחדש' : 'Record Again'}
            </Button>

            {/* Upload to Supabase */}
            <Button
              className="gap-2 min-h-[44px]"
              onClick={uploadRecording}
              disabled={uploading || !videoBlob || !user?.id}
              aria-label={isRTL ? 'העלה לענן' : 'Upload to Cloud'}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploading
                ? (isRTL ? 'מעלה...' : 'Uploading...')
                : (isRTL ? 'העלה לענן' : 'Upload to Cloud')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
