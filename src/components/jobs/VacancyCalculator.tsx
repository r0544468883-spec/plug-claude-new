import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Calculator, TrendingDown } from 'lucide-react';

interface VacancyCalculatorProps {
  daysOpen?: number;
  defaultSalary?: number;
}

export function VacancyCalculator({ daysOpen = 0, defaultSalary = 0 }: VacancyCalculatorProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const [salary, setSalary] = useState(defaultSalary || 300000);
  const [impactMultiplier, setImpactMultiplier] = useState([1.5]);

  const dailyCost = Math.round((salary / 365) * impactMultiplier[0]);
  const totalCost = dailyCost * daysOpen;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="w-4 h-4 text-primary" />
          {isHebrew ? 'עלות משרה פתוחה' : 'Cost of Vacancy'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">{isHebrew ? 'שכר שנתי (₪)' : 'Annual Salary (₪)'}</Label>
          <Input
            type="number"
            value={salary}
            onChange={(e) => setSalary(Number(e.target.value))}
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">
            {isHebrew ? `מכפיל השפעה: x${impactMultiplier[0]}` : `Impact Multiplier: x${impactMultiplier[0]}`}
          </Label>
          <Slider
            value={impactMultiplier}
            onValueChange={setImpactMultiplier}
            min={1}
            max={3}
            step={0.5}
            className="w-full"
          />
        </div>

        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-destructive" />
            <span className="text-sm font-medium text-destructive">
              {isHebrew ? 'עלות מוערכת' : 'Estimated Cost'}
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            ₪{totalCost.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">
            {isHebrew
              ? `₪${dailyCost.toLocaleString()} ליום × ${daysOpen} ימים פתוחים`
              : `₪${dailyCost.toLocaleString()}/day × ${daysOpen} days open`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
