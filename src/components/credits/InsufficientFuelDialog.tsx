import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { Fuel, Zap } from 'lucide-react';
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={cn(
              "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
              "w-[90%] max-w-sm p-6 rounded-2xl text-center",
              "bg-card border border-border shadow-2xl"
            )}
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            {/* Icon */}
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
              <Fuel className="w-8 h-8 text-orange-500" />
            </div>

            <h3 className="font-bold text-xl mb-2">
              {isRTL ? 'נגמר הדלק' : 'Out of fuel'}
            </h3>
            <p className="text-muted-foreground mb-4 text-sm">
              {isRTL
                ? 'אין מספיק דלק לפעולה זו. צבור דלק ממשימות או רכוש עוד.'
                : 'Not enough fuel for this action. Earn fuel from missions or purchase more.'}
            </p>

            <div className="bg-muted/50 rounded-xl p-4 mb-6 text-start">
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

            <div className="space-y-2">
              <Button onClick={handleFuelUp} className="w-full gap-2" size="lg">
                <Zap className="w-4 h-4" />
                {isRTL ? 'השג עוד דלק' : 'Get More Fuel'}
              </Button>
              <Button variant="ghost" onClick={onClose} className="w-full text-muted-foreground">
                {isRTL ? 'אולי מאוחר יותר' : 'Maybe later'}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
