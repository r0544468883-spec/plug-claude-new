import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { Fuel, Rocket, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface InsufficientFuelDialogProps {
  open: boolean;
  required: number;
  available: number;
  onClose: () => void;
}

export const InsufficientFuelDialog = ({
  open,
  required,
  available,
  onClose,
}: InsufficientFuelDialogProps) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isRTL = language === 'he';

  const handleFuelUp = () => {
    onClose();
    navigate('/fuel-up');
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          />
          
          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={cn(
              "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
              "w-[90%] max-w-sm p-6 rounded-2xl text-center",
              "bg-card border border-border shadow-2xl"
            )}
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            {/* Animated rocket icon */}
            <motion.div
              initial={{ y: 10 }}
              animate={{ y: [10, -5, 10] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center"
            >
              <Fuel className="w-10 h-10 text-orange-500" />
            </motion.div>

            {/* Message */}
            <h3 className="font-bold text-xl mb-2">
              {isRTL ? '🚀 הספינה שלך נגמר הדלק!' : '🚀 Your ship is out of fuel!'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {isRTL 
                ? 'השלם משימות כדי לתדלק מחדש ולהמשיך לטוס!'
                : 'Complete missions to refuel and keep flying!'}
            </p>

            {/* Stats */}
            <div className="bg-muted/50 rounded-xl p-4 mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  {isRTL ? 'נדרש' : 'Required'}
                </span>
                <span className="font-bold text-orange-500">{required}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  {isRTL ? 'יש לך' : 'You have'}
                </span>
                <span className="font-bold text-destructive">{available}</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleFuelUp}
                className="w-full gap-2 bg-gradient-to-r from-[#00FF9D] to-[#00DD88] text-black hover:opacity-90"
                size="lg"
              >
                <Rocket className="w-4 h-4" />
                {isRTL ? 'תדלוק עכשיו!' : 'Fuel Up Now!'}
              </Button>
              <Button
                variant="ghost"
                onClick={onClose}
                className="w-full text-muted-foreground"
              >
                {isRTL ? 'אולי מאוחר יותר' : 'Maybe later'}
              </Button>
            </div>

            {/* Sparkle decorations */}
            <motion.div
              className="absolute -top-2 -right-2"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            >
              <Sparkles className="w-6 h-6 text-[#00FF9D]/50" />
            </motion.div>
            <motion.div
              className="absolute -bottom-2 -left-2"
              animate={{ rotate: -360 }}
              transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
            >
              <Sparkles className="w-5 h-5 text-[#B794F4]/50" />
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
