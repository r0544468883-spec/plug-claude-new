import { useLanguage } from '@/contexts/LanguageContext';
import { ReportShell } from '../ReportShell';
import { Card, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const MONTHLY_DATA = Array.from({ length: 12 }, (_, i) => ({
  month: `${i + 1}/${new Date().getFullYear()}`,
  revenue: Math.floor(Math.random() * 50000) + 20000,
}));

export function ReportRevenue() {
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const total = MONTHLY_DATA.reduce((s, m) => s + m.revenue, 0);
  const thisMonth = MONTHLY_DATA[MONTHLY_DATA.length - 1]?.revenue || 0;

  return (
    <ReportShell
      title={isHebrew ? 'דוח הכנסות' : 'Revenue Report'}
      description={isHebrew ? 'placements והכנסות לפי לקוח' : 'Placements and revenue by client'}
      data={MONTHLY_DATA}
      columns={[
        { key: 'month', label: isHebrew ? 'חודש' : 'Month' },
        { key: 'revenue', label: isHebrew ? 'הכנסה (₪)' : 'Revenue (₪)' },
      ]}
    >
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: isHebrew ? 'סה"כ YTD' : 'Total YTD', value: `₪${total.toLocaleString()}` },
          { label: isHebrew ? 'החודש' : 'This Month', value: `₪${thisMonth.toLocaleString()}` },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{s.value}</div>
            <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
          </CardContent></Card>
        ))}
      </div>
      <Card><CardContent className="p-4">
        <h3 className="font-medium mb-4">{isHebrew ? 'הכנסות לפי חודש' : 'Revenue by Month'}</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={MONTHLY_DATA}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={v => `₪${(v/1000).toFixed(0)}K`} tick={{ fontSize: 10 }} />
            <Tooltip formatter={v => `₪${(v as number).toLocaleString()}`} />
            <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent></Card>
    </ReportShell>
  );
}
