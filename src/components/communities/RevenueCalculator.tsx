import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { TrendingUp, Users, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RevenueCalculatorProps {
  onCTA?: () => void;
  className?: string;
}

function useCountUp(target: number, duration = 600) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    const start = value;
    const diff = target - start;
    if (diff === 0) return;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + diff * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return value;
}

export function RevenueCalculator({ onCTA, className }: RevenueCalculatorProps) {
  const { language, direction } = useLanguage();
  const isHe = language === 'he';

  const [members, setMembers] = useState(100);
  const [monthlyPrice, setMonthlyPrice] = useState(99);

  const monthlyRevenue = members * monthlyPrice;
  const yearlyRevenue = monthlyRevenue * 12;

  const animatedMonthly = useCountUp(monthlyRevenue);
  const animatedYearly = useCountUp(yearlyRevenue);

  return (
    <Card
      dir={direction}
      className={cn(
        'relative overflow-hidden border-0 shadow-xl',
        className
      )}
    >
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-purple-700 to-pink-600 opacity-95" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />

      <CardContent className="relative z-10 p-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 text-white/90 text-sm">
            <TrendingUp className="w-4 h-4" />
            {isHe ? 'מחשבון הכנסות' : 'Revenue Calculator'}
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-white">
            {isHe ? 'כמה תוכל להרוויח?' : 'How much can you earn?'}
          </h3>
        </div>

        {/* Sliders */}
        <div className="space-y-6">
          {/* Members slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-white">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Users className="w-4 h-4" />
                {isHe ? 'מספר חברים' : 'Number of Members'}
              </label>
              <span className="text-lg font-bold bg-white/20 backdrop-blur-sm rounded-lg px-3 py-0.5">
                {members.toLocaleString()}
              </span>
            </div>
            <Slider
              value={[members]}
              onValueChange={([v]) => setMembers(v)}
              min={10}
              max={1000}
              step={10}
              className="[&_[role=slider]]:bg-white [&_[role=slider]]:border-purple-300 [&_[role=slider]]:shadow-lg [&_[role=slider]]:w-5 [&_[role=slider]]:h-5 [&_.bg-primary]:bg-white/60"
            />
            <div className="flex justify-between text-xs text-white/60">
              <span>10</span>
              <span>1,000</span>
            </div>
          </div>

          {/* Price slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-white">
              <label className="flex items-center gap-2 text-sm font-medium">
                <DollarSign className="w-4 h-4" />
                {isHe ? 'מחיר חודשי למנוי' : 'Monthly Subscription Price'}
              </label>
              <span className="text-lg font-bold bg-white/20 backdrop-blur-sm rounded-lg px-3 py-0.5">
                {isHe ? `${monthlyPrice} \u20AA` : `\u20AA${monthlyPrice}`}
              </span>
            </div>
            <Slider
              value={[monthlyPrice]}
              onValueChange={([v]) => setMonthlyPrice(v)}
              min={29}
              max={499}
              step={10}
              className="[&_[role=slider]]:bg-white [&_[role=slider]]:border-purple-300 [&_[role=slider]]:shadow-lg [&_[role=slider]]:w-5 [&_[role=slider]]:h-5 [&_.bg-primary]:bg-white/60"
            />
            <div className="flex justify-between text-xs text-white/60">
              <span>{isHe ? '29 \u20AA' : '\u20AA29'}</span>
              <span>{isHe ? '499 \u20AA' : '\u20AA499'}</span>
            </div>
          </div>
        </div>

        {/* Revenue display */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 text-center space-y-1">
            <p className="text-white/70 text-sm">
              {isHe ? 'הכנסה חודשית' : 'Monthly Revenue'}
            </p>
            <p className="text-2xl md:text-3xl font-extrabold text-white tabular-nums">
              {isHe ? `${animatedMonthly.toLocaleString()} \u20AA` : `\u20AA${animatedMonthly.toLocaleString()}`}
            </p>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 text-center space-y-1">
            <p className="text-white/70 text-sm">
              {isHe ? 'הכנסה שנתית' : 'Yearly Revenue'}
            </p>
            <p className="text-2xl md:text-3xl font-extrabold text-yellow-300 tabular-nums">
              {isHe ? `${animatedYearly.toLocaleString()} \u20AA` : `\u20AA${animatedYearly.toLocaleString()}`}
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center pt-2">
          <Button
            onClick={onCTA}
            size="lg"
            className="bg-white text-purple-700 hover:bg-white/90 font-bold text-base px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            {isHe ? 'התחל להרוויח עכשיו' : 'Start Earning Now'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
