import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { ReportShell } from '../ReportShell';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, eachDayOfInterval } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  applied: 'bg-blue-500/20 text-blue-400',
  viewed: 'bg-yellow-500/20 text-yellow-400',
  screening: 'bg-purple-500/20 text-purple-400',
  interview: 'bg-green-500/20 text-green-400',
  rejected: 'bg-red-500/20 text-red-400',
  offer: 'bg-primary/20 text-primary',
  hired: 'bg-emerald-500/20 text-emerald-400',
};

export function ReportApplications() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState(subDays(new Date(), 30));

  useEffect(() => { fetchData(); }, [dateFrom]);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    const { data: apps } = await supabase
      .from('applications')
      .select('*, jobs(title, company_name, location, job_type)')
      .eq('candidate_id', user.id)
      .gte('created_at', dateFrom.toISOString())
      .order('created_at', { ascending: false });
    setData(apps || []);
    setIsLoading(false);
  };

  const filtered = data.filter(a =>
    !search || (a.jobs?.company_name || '').toLowerCase().includes(search.toLowerCase())
  );

  // Stats
  const total = data.length;
  const inProgress = data.filter(a => !['rejected', 'hired'].includes(a.status)).length;
  const interviews = data.filter(a => a.current_stage === 'interview' || a.status === 'interview').length;
  const rejected = data.filter(a => a.status === 'rejected').length;

  // Chart data — applications per day
  const days = eachDayOfInterval({ start: dateFrom, end: new Date() });
  const chartData = days.map(day => ({
    date: format(day, 'dd/MM'),
    count: data.filter(a => format(new Date(a.created_at), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')).length,
  }));

  const stats = [
    { label: isHebrew ? 'סה"כ הוגשו' : 'Total Applied', value: total },
    { label: isHebrew ? 'בתהליך' : 'In Progress', value: inProgress },
    { label: isHebrew ? 'ראיונות' : 'Interviews', value: interviews },
    { label: isHebrew ? 'נדחו' : 'Rejected', value: rejected },
  ];

  return (
    <ReportShell
      title={isHebrew ? 'דוח מועמדויות' : 'Applications Report'}
      description={isHebrew ? 'מעקב אחר כל ההגשות שלך' : 'Track all your applications'}
      data={filtered}
      columns={[
        { key: 'job_title', label: isHebrew ? 'משרה' : 'Job' },
        { key: 'company', label: isHebrew ? 'חברה' : 'Company' },
        { key: 'created_at', label: isHebrew ? 'תאריך' : 'Date' },
        { key: 'status', label: isHebrew ? 'סטטוס' : 'Status' },
        { key: 'match_score', label: 'Match' },
      ]}
      isLoading={isLoading}
      onDateRangeChange={(r) => setDateFrom(r.from)}
    >
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-primary">{s.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-medium mb-4">{isHebrew ? 'הגשות לפי יום' : 'Applications by Day'}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.2)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-4">
          <Input
            placeholder={isHebrew ? 'חיפוש לפי חברה...' : 'Search by company...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="mb-4 max-w-sm"
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-right">
                  <th className="pb-2 pe-4">{isHebrew ? 'משרה' : 'Job'}</th>
                  <th className="pb-2 pe-4">{isHebrew ? 'חברה' : 'Company'}</th>
                  <th className="pb-2 pe-4">{isHebrew ? 'תאריך' : 'Date'}</th>
                  <th className="pb-2 pe-4">{isHebrew ? 'סטטוס' : 'Status'}</th>
                  <th className="pb-2">Match</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 20).map((app) => (
                  <tr key={app.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 pe-4 font-medium">{app.jobs?.title || '—'}</td>
                    <td className="py-2 pe-4 text-muted-foreground">{app.jobs?.company_name || '—'}</td>
                    <td className="py-2 pe-4 text-muted-foreground">{format(new Date(app.created_at), 'dd/MM/yy')}</td>
                    <td className="py-2 pe-4">
                      <Badge className={STATUS_COLORS[app.status] || 'bg-muted text-muted-foreground'}>
                        {app.status || 'applied'}
                      </Badge>
                    </td>
                    <td className="py-2">
                      {app.match_score ? <span className="text-primary font-semibold">{app.match_score}%</span> : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </ReportShell>
  );
}
