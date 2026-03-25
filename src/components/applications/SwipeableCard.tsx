import { useState, useRef, ReactNode } from 'react';
import { Eye, X } from 'lucide-react';

interface SwipeableCardProps {
  children: ReactNode;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  rightLabel?: string;
  leftLabel?: string;
}

const SwipeableCard = ({
  children,
  onSwipeRight,
  onSwipeLeft,
  rightLabel = 'צפייה',
  leftLabel = 'משיכה',
}: SwipeableCardProps) => {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const SWIPE_THRESHOLD = 100;

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startXRef.current;
    // Limit the swipe distance
    const limitedDiff = Math.max(-150, Math.min(150, diff));
    setTranslateX(limitedDiff);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    
    if (translateX > SWIPE_THRESHOLD) {
      // Swipe right - View details
      onSwipeRight();
    } else if (translateX < -SWIPE_THRESHOLD) {
      // Swipe left - Withdraw
      onSwipeLeft();
    }
    
    setTranslateX(0);
  };

  const getBackgroundOpacity = () => {
    return Math.min(Math.abs(translateX) / SWIPE_THRESHOLD, 1);
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Right action background (View) */}
      <div 
        className="absolute inset-y-0 left-0 w-24 flex items-center justify-center bg-primary/20 transition-opacity"
        style={{ opacity: translateX > 0 ? getBackgroundOpacity() : 0 }}
      >
        <div className="flex flex-col items-center gap-1 text-primary">
          <Eye className="h-6 w-6" />
          <span className="text-xs font-medium">{rightLabel}</span>
        </div>
      </div>

      {/* Left action background (Withdraw) */}
      <div 
        className="absolute inset-y-0 right-0 w-24 flex items-center justify-center bg-destructive/20 transition-opacity"
        style={{ opacity: translateX < 0 ? getBackgroundOpacity() : 0 }}
      >
        <div className="flex flex-col items-center gap-1 text-destructive">
          <X className="h-6 w-6" />
          <span className="text-xs font-medium">{leftLabel}</span>
        </div>
      </div>

      {/* Card content */}
      <div
        ref={cardRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative bg-card transition-transform duration-200 ease-out touch-pan-y"
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeableCard;
