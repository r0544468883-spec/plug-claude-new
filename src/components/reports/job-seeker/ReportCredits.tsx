import { useLanguage } from '@/contexts/LanguageContext';
import { useCredits } from '@/contexts/CreditsContext';
import { ReportShell } from '../ReportShell';
import { Card, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function ReportCredits() {
  const { language } = useLanguage();
  const { credits } = useCredits();
  const dailyFuel = credits?.daily_fuel || 0;
  const permanentFuel = credits?.permanent_fuel || 0;
  const isHebrew = language === 'he';

  const total = (dailyFuel || 0) + (permanentFuel || 0);
  const dummyTrend = Array.from({ length: 30 }, (_, i) => ({
    day: `${i + 1}`,
    balance: Math.max(0, total - Math.floor(Math.random() * 50) + i * 2),
  }));

  return (
    <ReportShell
      title={isHebrew ? 'דוח קרדיטים' : 'Credits Report'}
      description={isHebrew ? 'יתרה, הוצאות וצבירה' : 'Balance, expenses, and earnings'}
      data={dummyTrend}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: isHebrew ? 'דלק יומי' : 'Daily Fuel', value: dailyFuel || 0 },
          { label: isHebrew ? 'דלק קבוע' : 'Permanent Fuel', value: permanentFuel || 0 },
          { label: isHebrew ? 'סה"כ' : 'Total', value: total },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-primary">{s.value}</div>
            <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
          </CardContent></Card>
        ))}
      </div>
      <Card><CardContent className="p-4">
        <h3 className="font-medium mb-4">{isHebrew ? 'יתרה לאורך זמן' : 'Balance Over Time'}</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={dummyTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="day" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Line type="monotone" dataKey="balance" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent></Card>
    </ReportShell>
  );
}
