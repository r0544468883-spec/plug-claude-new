import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SalaryInsightsProps {
  jobRole?: string;
  compact?: boolean;
}

const roles = [
  'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
  'Product Manager', 'Data Analyst', 'DevOps Engineer', 'QA Engineer', 'UX Designer',
];

export function SalaryInsights({ jobRole: initialRole, compact }: SalaryInsightsProps) {
  const [role, setRole] = useState(initialRole || '');
  const [expYears, setExpYears] = useState(3);
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (role) fetchData(); }, [role, expYears]);

  const fetchData = async () => {
    setLoading(true);
    const { data: rows } = await supabase
      .from('salary_data' as any)
      .select('*')
      .eq('job_role', role)
      .order('experience_years', { ascending: true });

    if (rows?.length) {
      // Find closest experience match
      const sorted = (rows as any[]).sort((a, b) =>
        Math.abs((a.experience_years || 0) - expYears) - Math.abs((b.experience_years || 0) - expYears)
      );
      setData(sorted[0]);
    } else setData(null);
    setLoading(false);
  };

  if (compact && data) {
    return (
      <div className="text-xs text-muted-foreground">
        ממוצע שוק: <span className="text-primary font-medium">{data.salary_median?.toLocaleString()} ₪</span>
        {' '}({data.salary_min?.toLocaleString()} – {data.salary_max?.toLocaleString()})
      </div>
    );
  }

  return (
    <Card className="border-border bg-card" style={{ borderRadius: 12 }}>
      <CardContent className="p-4 space-y-4" dir="rtl">
        <h3 className="font-semibold text-foreground">💰 תובנות שכר</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">תפקיד</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground"
            >
              <option value="">בחר תפקיד</option>
              {roles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">שנות ניסיון: {expYears}</label>
            <input
              type="range" min={0} max={15} value={expYears}
              onChange={e => setExpYears(parseInt(e.target.value))}
              className="w-full mt-2 accent-primary"
            />
          </div>
        </div>

        {loading && <div className="text-muted-foreground text-sm text-center">טוען...</div>}

        {!loading && data && data.sample_size >= 5 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{data.salary_min?.toLocaleString()} ₪</span>
              <span className="font-bold text-foreground text-lg">{data.salary_median?.toLocaleString()} ₪</span>
              <span className="text-muted-foreground">{data.salary_max?.toLocaleString()} ₪</span>
            </div>
            {/* Visual bar */}
            <div className="relative h-3 bg-card border border-border rounded-full overflow-hidden">
              <div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(90deg, hsl(var(--muted)) 0%, hsl(var(--primary)) 100%)' }} />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md"
                style={{
                  left: `${((data.salary_median - data.salary_min) / (data.salary_max - data.salary_min)) * 100}%`,
                  background: 'hsl(var(--secondary))',
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">מבוסס על {data.sample_size} דגימות · תל אביב</p>
          </div>
        )}

        {!loading && data && data.sample_size < 5 && (
          <p className="text-muted-foreground text-sm text-center">אין מספיק נתונים לתפקיד זה</p>
        )}
        {!loading && !data && role && (
          <p className="text-muted-foreground text-sm text-center">לא נמצאו נתונים</p>
        )}
      </CardContent>
    </Card>
  );
}
