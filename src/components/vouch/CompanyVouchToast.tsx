import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, Fuel, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CompanyVouchToastProps {
  companyName: string;
  reward: number;
  onAccept: () => void;
  onDismiss: () => void;
  visible: boolean;
}

export function CompanyVouchToast({
  companyName,
  reward,
  onAccept,
  onDismiss,
  visible,
}: CompanyVouchToastProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50"
        >
          <Card className="border-primary/30 bg-card/95 backdrop-blur-sm shadow-xl">
            <CardContent className="p-4">
              <div className="flex items-start gap-3" dir={isHebrew ? 'rtl' : 'ltr'}>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm mb-1">
                    {isHebrew 
                      ? `איך התהליך ב-${companyName}?`
                      : `How's the process with ${companyName}?`}
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    {isHebrew 
                      ? `שתף את החוויה שלך וקבל דלק!`
                      : `Share your experience and earn Fuel!`}
                  </p>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={onAccept}
                      className="gap-1.5 text-xs"
                    >
                      <Fuel className="h-3.5 w-3.5" />
                      {isHebrew ? `קבל +${reward}` : `Earn +${reward}`}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={onDismiss}
                      className="text-xs"
                    >
                      {isHebrew ? 'לא עכשיו' : 'Not now'}
                    </Button>
                  </div>
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={onDismiss}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
