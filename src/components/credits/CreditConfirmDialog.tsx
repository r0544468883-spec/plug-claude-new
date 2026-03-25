import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { Zap, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CREDIT_ACTION_LABELS } from '@/lib/credit-costs';

interface CreditConfirmDialogProps {
  open: boolean;
  action: string;
  cost: number;
  dailyFuel: number;
  permanentFuel: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const CreditConfirmDialog = ({
  open,
  action,
  cost,
  dailyFuel,
  permanentFuel,
  onConfirm,
  onCancel,
}: CreditConfirmDialogProps) => {
  const { language } = useLanguage();
  const isRTL = language === 'he';

  const actionLabel = CREDIT_ACTION_LABELS[action as keyof typeof CREDIT_ACTION_LABELS];
  const displayName = actionLabel 
    ? (isRTL ? actionLabel.he : actionLabel.en) 
    : action.replace(/_/g, ' ');

  // Calculate how credits will be deducted
  const dailyDeduct = Math.min(dailyFuel, cost);
  const permanentDeduct = cost - dailyDeduct;
  const totalAfter = (dailyFuel - dailyDeduct) + (permanentFuel - permanentDeduct);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          />
          
          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={cn(
              "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
              "w-[90%] max-w-sm p-6 rounded-2xl",
              "bg-card border border-border shadow-2xl"
            )}
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            {/* Header with icon */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00FF9D]/20 to-[#B794F4]/20 flex items-center justify-center">
                <Zap className="w-6 h-6 text-[#00FF9D]" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  {isRTL ? 'אישור שימוש בדלק' : 'Confirm Fuel Usage'}
                </h3>
                <p className="text-sm text-muted-foreground">{displayName}</p>
              </div>
            </div>

            {/* Cost display */}
            <div className="bg-muted/50 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">
                  {isRTL ? 'פעולה זו דורשת' : 'This action requires'}
                </span>
                <span className="text-2xl font-bold text-[#00FF9D]">{cost}</span>
              </div>
              
              {/* Breakdown */}
              <div className="space-y-2 text-sm">
                {dailyDeduct > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-[#00FF9D]" />
                      {isRTL ? 'דלק יומי' : 'Daily Fuel'}
                    </span>
                    <span className="text-destructive">-{dailyDeduct}</span>
                  </div>
                )}
                {permanentDeduct > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#B794F4]" />
                      {isRTL ? 'דלק קבוע' : 'Permanent Fuel'}
                    </span>
                    <span className="text-destructive">-{permanentDeduct}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-border flex items-center justify-between font-medium">
                  <span>{isRTL ? 'יתרה אחרי' : 'Balance after'}</span>
                  <span className={cn(
                    totalAfter < 10 ? 'text-orange-500' : 'text-muted-foreground'
                  )}>
                    {totalAfter}
                  </span>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onCancel}
                className="flex-1"
              >
                {isRTL ? 'ביטול' : 'Cancel'}
              </Button>
              <Button
                onClick={onConfirm}
                className="flex-1 bg-gradient-to-r from-[#00FF9D] to-[#00DD88] text-black hover:opacity-90"
              >
                {isRTL ? 'המשך' : 'Continue'}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
