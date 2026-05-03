import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCredits } from '@/contexts/CreditsContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Gift, Loader2, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function PromoCodeInput() {
  const { language } = useLanguage();
  const { refreshCredits } = useCredits();
  const isRTL = language === 'he';
  
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      toast.error(isRTL ? 'נא להזין קוד' : 'Please enter a code');
      return;
    }

    setIsLoading(true);
    setStatus('idle');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error(isRTL ? 'יש להתחבר תחילה' : 'Please log in first');
        return;
      }

      const { data, error } = await supabase.functions.invoke('redeem-promo-code', {
        body: { code: code.trim() }
      });

      if (error || !data?.success) {
        setStatus('error');
        const errorMsg = data?.error || error?.message || 'Invalid code';
        
        if (errorMsg.includes('already redeemed')) {
          toast.error(isRTL ? 'הקוד כבר מומש!' : 'Code already redeemed!');
        } else {
          toast.error(isRTL ? 'קוד לא תקין' : 'Invalid code');
        }
        return;
      }

      setStatus('success');
      setCode('');
      
      // Refresh credits to show new balance
      await refreshCredits();
      
      toast.success(
        isRTL ? '🚀 קרדיטים ללא הגבלה הופעלו!' : '🚀 Unlimited credits activated!',
        {
          description: isRTL 
            ? 'תהנה מגישה מלאה לכל הפיצ\'רים!' 
            : 'Enjoy full access to all features!',
          duration: 5000,
        }
      );

    } catch (error) {
      console.error('Promo code error:', error);
      setStatus('error');
      toast.error(isRTL ? 'שגיאה במימוש הקוד' : 'Error redeeming code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-[#B794F4]/10 to-[#00FF9D]/10 border-[#B794F4]/30">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#B794F4] to-[#00FF9D] flex items-center justify-center">
            <Gift className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">
              {isRTL ? 'יש לך קוד פרומו?' : 'Have a promo code?'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isRTL ? 'הזן אותו כאן לקבלת קרדיטים!' : 'Enter it here to get credits!'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Input
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setStatus('idle');
              }}
              placeholder={isRTL ? 'הזן קוד פרומו...' : 'Enter promo code...'}
              className={cn(
                "pe-10",
                status === 'success' && "border-green-500 focus-visible:ring-green-500",
                status === 'error' && "border-destructive focus-visible:ring-destructive"
              )}
              disabled={isLoading}
            />
            <AnimatePresence>
              {status !== 'idle' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="absolute end-3 top-1/2 -translate-y-1/2"
                >
                  {status === 'success' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                  {status === 'error' && <XCircle className="w-5 h-5 text-destructive" />}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <Button 
            type="submit" 
            disabled={isLoading || !code.trim()}
            className="gap-2 bg-gradient-to-r from-[#B794F4] to-[#00FF9D] text-white hover:opacity-90"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {isRTL ? 'מימוש' : 'Redeem'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
