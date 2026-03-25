import { useRef, useState } from 'react';
import SignatureCanvasLib from 'react-signature-canvas';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Eraser, Check, X, Pen, RotateCcw } from 'lucide-react';

interface SignatureCanvasProps {
  open: boolean;
  onClose: () => void;
  onSave: (signatureData: string) => void;
  title?: string;
}

export function SignatureCanvas({ open, onClose, onSave, title }: SignatureCanvasProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const sigRef = useRef<SignatureCanvasLib>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const handleClear = () => {
    sigRef.current?.clear();
    setIsEmpty(true);
  };

  const handleSave = () => {
    if (sigRef.current && !sigRef.current.isEmpty()) {
      const signatureData = sigRef.current.getTrimmedCanvas().toDataURL('image/png');
      onSave(signatureData);
      onClose();
    }
  };

  const handleEnd = () => {
    if (sigRef.current) {
      setIsEmpty(sigRef.current.isEmpty());
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Pen className="w-5 h-5 text-primary" />
            {title || (isHebrew ? 'חתימה דיגיטלית' : 'Digital Signature')}
          </DialogTitle>
          <DialogDescription>
            {isHebrew 
              ? 'צייר את חתימתך באמצעות העכבר או המגע' 
              : 'Draw your signature using mouse or touch'}
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 py-2">
          <div className="border-2 border-dashed border-border rounded-lg bg-white dark:bg-slate-100 relative overflow-hidden">
            <SignatureCanvasLib
              ref={sigRef}
              penColor="#000"
              canvasProps={{
                className: 'w-full h-[200px] md:h-[250px] touch-none',
                style: { width: '100%', height: '100%' }
              }}
              onEnd={handleEnd}
            />
            
            {/* Signature line hint */}
            <div className="absolute bottom-8 left-4 right-4 border-b border-gray-300 pointer-events-none" />
            <span className="absolute bottom-2 left-4 text-xs text-gray-400 pointer-events-none">
              {isHebrew ? 'חתום כאן' : 'Sign here'}
            </span>

            {/* Clear button overlay */}
            {!isEmpty && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 bg-white/80 hover:bg-white shadow-sm"
                onClick={handleClear}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Mobile hint */}
          <p className="text-xs text-muted-foreground text-center mt-2 md:hidden">
            {isHebrew 
              ? '💡 סובב את המכשיר לרוחב לחוויה טובה יותר' 
              : '💡 Rotate device for better experience'}
          </p>
        </div>

        <DialogFooter className="p-4 pt-2 gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClear}
            className="gap-2"
            disabled={isEmpty}
          >
            <Eraser className="w-4 h-4" />
            {isHebrew ? 'נקה' : 'Clear'}
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={onClose}
              className="gap-2"
            >
              <X className="w-4 h-4" />
              {isHebrew ? 'ביטול' : 'Cancel'}
            </Button>
            
            <Button
              onClick={handleSave}
              disabled={isEmpty}
              className="gap-2"
            >
              <Check className="w-4 h-4" />
              {isHebrew ? 'שמור חתימה' : 'Save Signature'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
