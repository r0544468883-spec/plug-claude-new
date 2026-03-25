import { useLanguage } from '@/contexts/LanguageContext';
import { ReportShell } from '../ReportShell';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const SALARY_DATA = [
  { role: 'Frontend Dev', min: 18000, median: 28000, max: 45000, samples: 142 },
  { role: 'Backend Dev', min: 20000, median: 32000, max: 50000, samples: 98 },
  { role: 'Full Stack', min: 22000, median: 34000, max: 52000, samples: 120 },
  { role: 'Product Manager', min: 25000, median: 40000, max: 60000, samples: 75 },
  { role: 'UX/UI Designer', min: 16000, median: 26000, max: 42000, samples: 88 },
  { role: 'DevOps', min: 25000, median: 38000, max: 58000, samples: 62 },
  { role: 'Data Scientist', min: 24000, median: 38000, max: 60000, samples: 55 },
];

export function ReportSalary() {
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  return (
    <ReportShell
      title={isHebrew ? 'דוח שכר' : 'Salary Report'}
      description={isHebrew ? 'נתוני שכר לפי תפקיד' : 'Salary data by role'}
      data={SALARY_DATA}
      columns={[
        { key: 'role', label: 'Role' },
        { key: 'min', label: 'Min (₪)' },
        { key: 'median', label: 'Median (₪)' },
        { key: 'max', label: 'Max (₪)' },
      ]}
    >
      <Card><CardContent className="p-4">
        <h3 className="font-medium mb-4">{isHebrew ? 'שכר ממוצע לפי תפקיד (₪/חודש)' : 'Average Salary by Role (₪/month)'}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart layout="vertical" data={SALARY_DATA}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" tickFormatter={v => `₪${(v/1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
            <YAxis dataKey="role" type="category" width={90} tick={{ fontSize: 10 }} />
            <Tooltip formatter={v => `₪${v?.toLocaleString()}`} />
            <Bar dataKey="min" fill="hsl(var(--muted))" radius={[0, 4, 4, 0]} name={isHebrew ? 'מינימום' : 'Min'} />
            <Bar dataKey="median" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name={isHebrew ? 'חציון' : 'Median'} />
            <Bar dataKey="max" fill="hsl(var(--primary)/0.4)" radius={[0, 4, 4, 0]} name={isHebrew ? 'מקסימום' : 'Max'} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent></Card>
      <Card><CardContent className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-muted-foreground text-right">
              <th className="pb-2 pe-3">{isHebrew ? 'תפקיד' : 'Role'}</th>
              <th className="pb-2 pe-3">{isHebrew ? 'מינימום' : 'Min'}</th>
              <th className="pb-2 pe-3">{isHebrew ? 'חציון' : 'Median'}</th>
              <th className="pb-2 pe-3">{isHebrew ? 'מקסימום' : 'Max'}</th>
              <th className="pb-2">{isHebrew ? 'דגימות' : 'Samples'}</th>
            </tr></thead>
            <tbody>
              {SALARY_DATA.map((r, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-2 pe-3 font-medium">{r.role}</td>
                  <td className="py-2 pe-3 text-muted-foreground">₪{r.min.toLocaleString()}</td>
                  <td className="py-2 pe-3 text-primary font-semibold">₪{r.median.toLocaleString()}</td>
                  <td className="py-2 pe-3 text-muted-foreground">₪{r.max.toLocaleString()}</td>
                  <td className="py-2 text-muted-foreground">{r.samples}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent></Card>
    </ReportShell>
  );
}
