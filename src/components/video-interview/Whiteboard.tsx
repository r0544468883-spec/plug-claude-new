import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Pen, Eraser, Trash2, Undo2, Palette } from 'lucide-react';

/* ── Types ── */
interface Stroke {
  points: { x: number; y: number }[];
  color: string;
  width: number;
  isEraser: boolean;
}

interface WhiteboardProps {
  width?: number;
  height?: number;
  visible?: boolean;
  isHebrew?: boolean;
  onExport?: (dataUrl: string) => void;
}

/* ── Constants ── */
const COLORS = [
  { value: '#000000', label: 'Black', labelHe: 'שחור' },
  { value: '#ef4444', label: 'Red', labelHe: 'אדום' },
  { value: '#3b82f6', label: 'Blue', labelHe: 'כחול' },
  { value: '#22c55e', label: 'Green', labelHe: 'ירוק' },
  { value: '#eab308', label: 'Yellow', labelHe: 'צהוב' },
  { value: '#ffffff', label: 'White', labelHe: 'לבן' },
];

const BRUSH_SIZES = [
  { value: 2, label: 'Thin', labelHe: 'דק' },
  { value: 5, label: 'Medium', labelHe: 'בינוני' },
  { value: 10, label: 'Thick', labelHe: 'עבה' },
];

const MAX_UNDO = 20;

/* ── Helpers ── */
function getPointerPos(
  e: React.MouseEvent | React.TouchEvent,
  canvas: HTMLCanvasElement
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  if ('touches' in e) {
    const touch = e.touches[0] ?? e.changedTouches[0];
    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY,
    };
  }
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
}

function redraw(ctx: CanvasRenderingContext2D, strokes: Stroke[]) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  for (const stroke of strokes) {
    if (stroke.points.length < 2) continue;
    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = stroke.width;

    if (stroke.isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color;
    }

    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
}

/* ── Component ── */
export function Whiteboard({
  width = 800,
  height = 600,
  visible = true,
  isHebrew = false,
  onExport,
}: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [showColors, setShowColors] = useState(false);
  const isDrawing = useRef(false);

  const t = useCallback(
    (en: string, he: string) => (isHebrew ? he : en),
    [isHebrew]
  );

  /* Redraw when strokes change */
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    redraw(ctx, strokes);
  }, [strokes]);

  /* ── Drawing handlers ── */
  const startDraw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      isDrawing.current = true;
      const pos = getPointerPos(e, canvas);
      const newStroke: Stroke = {
        points: [pos],
        color,
        width: brushSize,
        isEraser: tool === 'eraser',
      };
      setCurrentStroke(newStroke);
    },
    [color, brushSize, tool]
  );

  const moveDraw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (!isDrawing.current || !currentStroke) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const pos = getPointerPos(e, canvas);
      const updated = {
        ...currentStroke,
        points: [...currentStroke.points, pos],
      };
      setCurrentStroke(updated);

      // Live draw current stroke
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      redraw(ctx, strokes);
      // Draw current stroke on top
      if (updated.points.length >= 2) {
        ctx.beginPath();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = updated.width;
        if (updated.isEraser) {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.strokeStyle = 'rgba(0,0,0,1)';
        } else {
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = updated.color;
        }
        ctx.moveTo(updated.points[0].x, updated.points[0].y);
        for (let i = 1; i < updated.points.length; i++) {
          ctx.lineTo(updated.points[i].x, updated.points[i].y);
        }
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      }
    },
    [currentStroke, strokes]
  );

  const endDraw = useCallback(() => {
    if (!isDrawing.current || !currentStroke) return;
    isDrawing.current = false;
    setStrokes((prev) => {
      const next = [...prev, currentStroke];
      return next.length > MAX_UNDO ? next.slice(next.length - MAX_UNDO) : next;
    });
    setCurrentStroke(null);
  }, [currentStroke]);

  /* ── Actions ── */
  const handleUndo = useCallback(() => {
    setStrokes((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setStrokes([]);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }, []);

  const handleExport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !onExport) return;
    onExport(canvas.toDataURL('image/png'));
  }, [onExport]);

  if (!visible) return null;

  return (
    <div
      className="relative select-none"
      dir={isHebrew ? 'rtl' : 'ltr'}
      style={{ width, height }}
    >
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="absolute inset-0 w-full h-full cursor-crosshair touch-none rounded-lg"
        style={{ background: 'transparent' }}
        onMouseDown={startDraw}
        onMouseMove={moveDraw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={moveDraw}
        onTouchEnd={endDraw}
      />

      {/* Floating toolbar */}
      <div
        className={cn(
          'absolute bottom-3 left-1/2 -translate-x-1/2 z-10',
          'flex items-center gap-1.5 px-3 py-2 rounded-xl',
          'bg-background/90 backdrop-blur border border-border shadow-lg'
        )}
      >
        {/* Pen */}
        <Button
          variant={tool === 'pen' ? 'default' : 'ghost'}
          size="icon"
          className="h-11 w-11"
          onClick={() => setTool('pen')}
          title={t('Pen', 'עט')}
          aria-label={t('Pen', 'עט')}
        >
          <Pen className="h-5 w-5" />
        </Button>

        {/* Eraser */}
        <Button
          variant={tool === 'eraser' ? 'default' : 'ghost'}
          size="icon"
          className="h-11 w-11"
          onClick={() => setTool('eraser')}
          title={t('Eraser', 'מחק')}
          aria-label={t('Eraser', 'מחק')}
        >
          <Eraser className="h-5 w-5" />
        </Button>

        {/* Separator */}
        <div className="w-px h-7 bg-border mx-1" />

        {/* Color picker toggle */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            onClick={() => setShowColors((v) => !v)}
            title={t('Colors', 'צבעים')}
            aria-label={t('Colors', 'צבעים')}
          >
            <Palette className="h-5 w-5" />
            <span
              className="absolute bottom-1.5 right-1.5 h-3 w-3 rounded-full border border-border"
              style={{ backgroundColor: color }}
            />
          </Button>

          {showColors && (
            <div
              className={cn(
                'absolute bottom-full mb-2 left-1/2 -translate-x-1/2',
                'flex gap-1.5 p-2 rounded-lg',
                'bg-background/95 backdrop-blur border border-border shadow-lg'
              )}
            >
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  className={cn(
                    'h-8 w-8 rounded-full border-2 transition-transform',
                    color === c.value
                      ? 'border-primary scale-110'
                      : 'border-border hover:scale-105'
                  )}
                  style={{ backgroundColor: c.value }}
                  onClick={() => {
                    setColor(c.value);
                    setTool('pen');
                    setShowColors(false);
                  }}
                  title={isHebrew ? c.labelHe : c.label}
                  aria-label={isHebrew ? c.labelHe : c.label}
                />
              ))}
            </div>
          )}
        </div>

        {/* Brush sizes */}
        {BRUSH_SIZES.map((s) => (
          <button
            key={s.value}
            className={cn(
              'h-11 w-11 flex items-center justify-center rounded-md transition-colors',
              brushSize === s.value
                ? 'bg-primary/15 text-primary'
                : 'hover:bg-muted text-muted-foreground'
            )}
            onClick={() => setBrushSize(s.value)}
            title={isHebrew ? s.labelHe : s.label}
            aria-label={isHebrew ? s.labelHe : s.label}
          >
            <span
              className="rounded-full bg-current"
              style={{ width: s.value * 2, height: s.value * 2 }}
            />
          </button>
        ))}

        {/* Separator */}
        <div className="w-px h-7 bg-border mx-1" />

        {/* Undo */}
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11"
          onClick={handleUndo}
          disabled={strokes.length === 0}
          title={t('Undo', 'ביטול')}
          aria-label={t('Undo', 'ביטול')}
        >
          <Undo2 className="h-5 w-5" />
        </Button>

        {/* Clear */}
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11"
          onClick={handleClear}
          disabled={strokes.length === 0}
          title={t('Clear all', 'נקה הכל')}
          aria-label={t('Clear all', 'נקה הכל')}
        >
          <Trash2 className="h-5 w-5" />
        </Button>

        {/* Export (only if callback provided) */}
        {onExport && (
          <Button
            variant="outline"
            size="sm"
            className="h-11 text-xs px-3"
            onClick={handleExport}
          >
            {t('Save', 'שמור')}
          </Button>
        )}
      </div>
    </div>
  );
}
