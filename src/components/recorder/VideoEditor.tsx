import { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Play, Pause, Scissors, Type, Pencil, Trash2,
  Download, Save, X, Maximize2, RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TextAnnotation {
  id: string;
  text: string;
  x: number; // percentage of video width
  y: number; // percentage of video height
  startTime: number;
  endTime: number;
}

interface DragState {
  handle: 'start' | 'end' | null;
  startX: number;
  startValue: number;
}

export interface VideoEditorProps {
  videoUrl: string;
  videoBlob: Blob;
  onSave?: (editedBlob: Blob) => void;
  onClose?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(seconds: number): string {
  if (isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VideoEditor({ videoUrl, videoBlob, onSave, onClose }: VideoEditorProps) {
  const { language } = useLanguage();
  const isRTL = language === 'he';

  // --- Video refs & state ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoWrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTimePct, setCurrentTimePct] = useState(0); // 0-100

  // --- Trim state ---
  const [trimStart, setTrimStart] = useState(0);   // percentage 0-100
  const [trimEnd, setTrimEnd] = useState(100);

  // --- Tool modes ---
  const [activeMode, setActiveMode] = useState<'none' | 'text' | 'draw'>('none');

  // --- Text annotations ---
  const [annotations, setAnnotations] = useState<TextAnnotation[]>([]);
  const [pendingAnnotation, setPendingAnnotation] = useState<Omit<TextAnnotation, 'text'> | null>(null);
  const [pendingText, setPendingText] = useState('');

  // --- Drawing ---
  const [isDrawing, setIsDrawing] = useState(false);
  const lastDrawPoint = useRef<{ x: number; y: number } | null>(null);

  // --- Saving state ---
  const [isSaving, setIsSaving] = useState(false);

  // --- Drag state for trim handles ---
  const dragState = useRef<DragState>({ handle: null, startX: 0, startValue: 0 });

  // ---------------------------------------------------------------------------
  // Video events
  // ---------------------------------------------------------------------------

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const pct = (video.currentTime / duration) * 100;
    setCurrentTimePct(pct);

    // Stop at trim end
    if (pct >= trimEnd) {
      video.pause();
      setIsPlaying(false);
    }
  }, [duration, trimEnd]);

  const handlePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      // Seek to trim start if at beginning or past trim end
      const pct = duration ? (video.currentTime / duration) * 100 : 0;
      if (pct < trimStart || pct >= trimEnd) {
        video.currentTime = (trimStart / 100) * duration;
      }
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [duration, trimStart, trimEnd]);

  const handleFullscreen = useCallback(() => {
    videoRef.current?.requestFullscreen?.();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', () => setIsPlaying(false));
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', () => setIsPlaying(false));
    };
  }, [handleLoadedMetadata, handleTimeUpdate]);

  // Sync canvas size with video
  useEffect(() => {
    const wrapper = videoWrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width = wrapper.clientWidth;
      canvas.height = wrapper.clientHeight;
    });
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, []);

  // ---------------------------------------------------------------------------
  // Timeline drag handlers
  // ---------------------------------------------------------------------------

  const pctFromMouseX = useCallback((clientX: number): number => {
    const el = timelineRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const raw = isRTL
      ? ((rect.right - clientX) / rect.width) * 100
      : ((clientX - rect.left) / rect.width) * 100;
    return Math.max(0, Math.min(100, raw));
  }, [isRTL]);

  const onHandleMouseDown = useCallback(
    (handle: 'start' | 'end', e: React.MouseEvent) => {
      e.preventDefault();
      dragState.current = {
        handle,
        startX: e.clientX,
        startValue: handle === 'start' ? trimStart : trimEnd,
      };

      const onMouseMove = (ev: MouseEvent) => {
        const pct = pctFromMouseX(ev.clientX);
        if (handle === 'start') {
          setTrimStart(Math.min(pct, trimEnd - 2));
        } else {
          setTrimEnd(Math.max(pct, trimStart + 2));
        }
      };

      const onMouseUp = () => {
        dragState.current.handle = null;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [trimStart, trimEnd, pctFromMouseX],
  );

  // Seek on timeline click (not on handles)
  const onTimelineClick = useCallback(
    (e: React.MouseEvent) => {
      if (dragState.current.handle) return;
      const pct = pctFromMouseX(e.clientX);
      if (!videoRef.current || !duration) return;
      videoRef.current.currentTime = (pct / 100) * duration;
    },
    [duration, pctFromMouseX],
  );

  // ---------------------------------------------------------------------------
  // Text annotation tool
  // ---------------------------------------------------------------------------

  const handleVideoClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (activeMode !== 'text') return;
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const xPct = ((e.clientX - rect.left) / rect.width) * 100;
      const yPct = ((e.clientY - rect.top) / rect.height) * 100;
      const currentTime = videoRef.current?.currentTime ?? 0;
      setPendingAnnotation({
        id: crypto.randomUUID(),
        x: xPct,
        y: yPct,
        startTime: currentTime,
        endTime: currentTime + 5,
      });
      setPendingText('');
    },
    [activeMode],
  );

  const commitAnnotation = useCallback(() => {
    if (!pendingAnnotation || !pendingText.trim()) {
      setPendingAnnotation(null);
      return;
    }
    setAnnotations(prev => [...prev, { ...pendingAnnotation, text: pendingText.trim() }]);
    setPendingAnnotation(null);
    setPendingText('');
  }, [pendingAnnotation, pendingText]);

  const removeAnnotation = useCallback((id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
  }, []);

  // ---------------------------------------------------------------------------
  // Drawing tool
  // ---------------------------------------------------------------------------

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeMode !== 'draw') return;
    setIsDrawing(true);
    lastDrawPoint.current = getCanvasPoint(e);
  };

  const onCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activeMode !== 'draw') return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !lastDrawPoint.current) return;
    const pt = getCanvasPoint(e);
    ctx.beginPath();
    ctx.moveTo(lastDrawPoint.current.x, lastDrawPoint.current.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
    lastDrawPoint.current = pt;
  };

  const onCanvasMouseUp = () => {
    setIsDrawing(false);
    lastDrawPoint.current = null;
  };

  const clearDrawings = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  // ---------------------------------------------------------------------------
  // Visible annotations at current time
  // ---------------------------------------------------------------------------
  const visibleAnnotations = annotations.filter(a => {
    const currentTime = videoRef.current?.currentTime ?? 0;
    return currentTime >= a.startTime && currentTime <= a.endTime;
  });

  // ---------------------------------------------------------------------------
  // Save / Download
  // ---------------------------------------------------------------------------

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (onSave) {
        onSave(videoBlob);
      }
      toast.success(isRTL ? 'הסרטון נשמר בהצלחה' : 'Video saved successfully');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = useCallback(() => {
    const url = URL.createObjectURL(videoBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plug-video-${Date.now()}.webm`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(isRTL ? 'ההורדה החלה' : 'Download started');
  }, [videoBlob, isRTL]);

  // ---------------------------------------------------------------------------
  // Derived display values
  // ---------------------------------------------------------------------------
  const currentTimeDisplay = formatTime(duration ? (currentTimePct / 100) * duration : 0);
  const durationDisplay = formatTime(duration);
  const trimStartTime = formatTime(duration ? (trimStart / 100) * duration : 0);
  const trimEndTime = formatTime(duration ? (trimEnd / 100) * duration : 0);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Card className="w-full bg-background border border-border shadow-xl overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      <CardContent className="p-0">

        {/* ------------------------------------------------------------------ */}
        {/* Header toolbar                                                       */}
        {/* ------------------------------------------------------------------ */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">
              {isRTL ? 'עריכת סרטון' : 'Video Editor'}
            </span>
            <Badge variant="secondary" className="text-xs">
              {isRTL ? 'בטא' : 'Beta'}
            </Badge>
          </div>

          <div className="flex items-center gap-1">
            {/* Tool toggles */}
            <Button
              variant={activeMode === 'text' ? 'default' : 'ghost'}
              size="sm"
              className="gap-1.5 h-8 text-xs"
              onClick={() => setActiveMode(prev => prev === 'text' ? 'none' : 'text')}
              title={isRTL ? 'הוסף טקסט' : 'Add text'}
            >
              <Type className="w-3.5 h-3.5" />
              {isRTL ? 'טקסט' : 'Text'}
            </Button>

            <Button
              variant={activeMode === 'draw' ? 'default' : 'ghost'}
              size="sm"
              className="gap-1.5 h-8 text-xs"
              onClick={() => setActiveMode(prev => prev === 'draw' ? 'none' : 'draw')}
              title={isRTL ? 'ציור חופשי' : 'Draw'}
            >
              <Pencil className="w-3.5 h-3.5" />
              {isRTL ? 'ציור' : 'Draw'}
            </Button>

            {activeMode === 'draw' && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 h-8 text-xs text-destructive hover:text-destructive"
                onClick={clearDrawings}
                title={isRTL ? 'נקה ציורים' : 'Clear drawings'}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {isRTL ? 'נקה' : 'Clear'}
              </Button>
            )}

            <div className="w-px h-5 bg-border mx-1" />

            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} title={isRTL ? 'סגור' : 'Close'}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Video area                                                           */}
        {/* ------------------------------------------------------------------ */}
        <div
          ref={videoWrapperRef}
          className="relative bg-black w-full"
          style={{ aspectRatio: '16/9' }}
          onClick={handleVideoClick}
        >
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain"
            preload="metadata"
            playsInline
          />

          {/* Canvas overlay for drawing */}
          <canvas
            ref={canvasRef}
            className={cn(
              'absolute inset-0 w-full h-full',
              activeMode === 'draw' ? 'cursor-crosshair' : 'pointer-events-none',
            )}
            onMouseDown={onCanvasMouseDown}
            onMouseMove={onCanvasMouseMove}
            onMouseUp={onCanvasMouseUp}
            onMouseLeave={onCanvasMouseUp}
          />

          {/* Text annotations overlay */}
          {visibleAnnotations.map(ann => (
            <div
              key={ann.id}
              className="absolute group"
              style={{ left: `${ann.x}%`, top: `${ann.y}%`, transform: 'translate(-50%, -50%)' }}
            >
              <div className="relative bg-black/70 text-white text-sm px-2 py-1 rounded shadow-lg whitespace-nowrap backdrop-blur-sm border border-white/20">
                {ann.text}
                <button
                  className="absolute -top-2 -right-2 hidden group-hover:flex w-4 h-4 rounded-full bg-destructive text-white items-center justify-center text-xs leading-none"
                  onClick={(e) => { e.stopPropagation(); removeAnnotation(ann.id); }}
                >
                  ×
                </button>
              </div>
            </div>
          ))}

          {/* Pending text input */}
          {pendingAnnotation && (
            <div
              className="absolute z-10"
              style={{ left: `${pendingAnnotation.x}%`, top: `${pendingAnnotation.y}%`, transform: 'translate(-50%, -50%)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-1 bg-background/95 border border-border rounded shadow-xl px-2 py-1.5 backdrop-blur">
                <Input
                  autoFocus
                  value={pendingText}
                  onChange={e => setPendingText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') commitAnnotation(); if (e.key === 'Escape') setPendingAnnotation(null); }}
                  placeholder={isRTL ? 'הקלד טקסט...' : 'Type text...'}
                  className="h-7 text-xs w-36 border-0 bg-transparent focus-visible:ring-0 p-0"
                />
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={commitAnnotation}>
                  <Save className="w-3 h-3 text-primary" />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setPendingAnnotation(null)}>
                  <X className="w-3 h-3 text-muted-foreground" />
                </Button>
              </div>
            </div>
          )}

          {/* Mode hint overlay */}
          {activeMode === 'text' && !pendingAnnotation && (
            <div className="absolute inset-x-0 bottom-4 flex justify-center pointer-events-none">
              <div className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
                {isRTL ? 'לחץ על הסרטון להוספת טקסט' : 'Click on the video to add text'}
              </div>
            </div>
          )}
          {activeMode === 'draw' && (
            <div className="absolute inset-x-0 bottom-4 flex justify-center pointer-events-none">
              <div className="bg-red-500/80 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
                {isRTL ? 'מצב ציור — גרור לציור' : 'Drawing mode — drag to draw'}
              </div>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Custom player controls                                               */}
        {/* ------------------------------------------------------------------ */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50 bg-muted/20">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={handlePlayPause}
            aria-label={isPlaying ? (isRTL ? 'השהה' : 'Pause') : (isRTL ? 'הפעל' : 'Play')}
          >
            {isPlaying
              ? <Pause className="w-4 h-4" />
              : <Play className="w-4 h-4" />
            }
          </Button>

          <span className="text-xs tabular-nums text-muted-foreground shrink-0 w-20 text-center">
            {currentTimeDisplay} / {durationDisplay}
          </span>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 ms-auto"
            onClick={handleFullscreen}
            aria-label={isRTL ? 'מסך מלא' : 'Fullscreen'}
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Timeline / Trim bar                                                  */}
        {/* ------------------------------------------------------------------ */}
        <div className="px-4 py-4 bg-muted/10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                {isRTL ? 'חיתוך' : 'Trim'}
              </span>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              {trimStartTime} – {trimEndTime}
            </span>
          </div>

          {/* The track */}
          <div
            ref={timelineRef}
            className="relative h-10 rounded-lg cursor-pointer select-none overflow-visible"
            onClick={onTimelineClick}
            style={{ background: 'hsl(var(--muted))' }}
          >
            {/* Dimmed left region (before trim start) */}
            <div
              className="absolute top-0 bottom-0 rounded-l-lg bg-background/60 pointer-events-none"
              style={{ [isRTL ? 'right' : 'left']: 0, width: `${trimStart}%` }}
            />

            {/* Highlighted selected region */}
            <div
              className="absolute top-0 bottom-0 pointer-events-none"
              style={{
                [isRTL ? 'right' : 'left']: `${trimStart}%`,
                width: `${trimEnd - trimStart}%`,
                background: 'linear-gradient(90deg, hsl(var(--primary)/0.25), hsl(var(--primary)/0.45))',
                borderTop: '2px solid hsl(var(--primary))',
                borderBottom: '2px solid hsl(var(--primary))',
              }}
            />

            {/* Dimmed right region (after trim end) */}
            <div
              className="absolute top-0 bottom-0 rounded-r-lg bg-background/60 pointer-events-none"
              style={{ [isRTL ? 'left' : 'right']: 0, width: `${100 - trimEnd}%` }}
            />

            {/* Trim start handle */}
            <div
              className="absolute top-0 bottom-0 z-20 flex items-center justify-center cursor-ew-resize group"
              style={{
                [isRTL ? 'right' : 'left']: `${trimStart}%`,
                transform: 'translateX(-50%)',
                width: 20,
              }}
              onMouseDown={e => onHandleMouseDown('start', e)}
            >
              <div className="w-3 h-full rounded-sm bg-primary shadow-md group-hover:bg-primary/80 transition-colors flex items-center justify-center">
                <div className="flex flex-col gap-0.5">
                  <div className="w-0.5 h-2.5 bg-white/70 rounded-full" />
                </div>
              </div>
            </div>

            {/* Trim end handle */}
            <div
              className="absolute top-0 bottom-0 z-20 flex items-center justify-center cursor-ew-resize group"
              style={{
                [isRTL ? 'right' : 'left']: `${trimEnd}%`,
                transform: 'translateX(-50%)',
                width: 20,
              }}
              onMouseDown={e => onHandleMouseDown('end', e)}
            >
              <div className="w-3 h-full rounded-sm bg-primary shadow-md group-hover:bg-primary/80 transition-colors flex items-center justify-center">
                <div className="flex flex-col gap-0.5">
                  <div className="w-0.5 h-2.5 bg-white/70 rounded-full" />
                </div>
              </div>
            </div>

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 z-10 pointer-events-none"
              style={{
                [isRTL ? 'right' : 'left']: `${currentTimePct}%`,
                transform: 'translateX(-50%)',
              }}
            >
              <div className="w-0.5 h-full bg-white/90 shadow-[0_0_4px_rgba(0,0,0,0.5)]" />
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-md border border-border" />
            </div>
          </div>

          {/* Tick labels */}
          <div className="flex justify-between mt-1.5 px-1">
            {[0, 25, 50, 75, 100].map(pct => (
              <span key={pct} className="text-[10px] text-muted-foreground tabular-nums">
                {formatTime(duration ? (pct / 100) * duration : 0)}
              </span>
            ))}
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Annotations list (if any)                                            */}
        {/* ------------------------------------------------------------------ */}
        {annotations.length > 0 && (
          <div className="px-4 pb-3">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">
              {isRTL ? `הערות טקסט (${annotations.length})` : `Text annotations (${annotations.length})`}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {annotations.map(ann => (
                <div
                  key={ann.id}
                  className="flex items-center gap-1 bg-muted/60 rounded px-2 py-0.5 text-xs border border-border/50"
                >
                  <Type className="w-3 h-3 text-muted-foreground" />
                  <span className="max-w-[100px] truncate">{ann.text}</span>
                  <button
                    className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                    onClick={() => removeAnnotation(ann.id)}
                    aria-label={isRTL ? 'הסר' : 'Remove'}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Action buttons                                                        */}
        {/* ------------------------------------------------------------------ */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border bg-muted/20">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
            {isRTL ? 'ביטול' : 'Cancel'}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleDownload}
            >
              <Download className="w-4 h-4" />
              {isRTL ? 'הורדה' : 'Download'}
            </Button>

            <Button
              size="sm"
              className="gap-2"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Save className="w-4 h-4" />
              {isSaving
                ? (isRTL ? 'שומר...' : 'Saving...')
                : (isRTL ? 'שמור' : 'Save')
              }
            </Button>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
