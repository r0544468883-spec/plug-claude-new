import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { BarChart3, TrendingUp, Target, PieChart as PieChartIcon, Calendar } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from 'recharts';

interface Application {
  id: string;
  status: string | null;
  current_stage: string | null;
  created_at: string;
  job?: {
    title: string;
    company?: {
      name: string;
    };
  };
}

interface ApplicationsInsightsProps {
  applications: Application[];
}

const stageOrder = ['applied', 'screening', 'interview', 'offer', 'hired'];
const stageLabels: Record<string, { en: string; he: string }> = {
  applied: { en: 'Applied', he: 'הוגש' },
  screening: { en: 'Screening', he: 'סינון' },
  interview: { en: 'Interview', he: 'ראיון' },
  offer: { en: 'Offer', he: 'הצעה' },
  hired: { en: 'Hired', he: 'התקבל' },
  rejected: { en: 'Rejected', he: 'נדחה' },
};

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(142, 76%, 36%)', // emerald
  'hsl(45, 93%, 47%)',  // amber
  'hsl(262, 83%, 58%)', // violet
  'hsl(0, 72%, 51%)',   // red
];

export function ApplicationsInsights({ applications }: ApplicationsInsightsProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const insights = useMemo(() => {
    const total = applications.length;
    if (total === 0) return null;

    // Count by stage
    const stageCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    const companyCounts: Record<string, number> = {};
    const roleCounts: Record<string, number> = {};
    const dateApplications: Record<string, number> = {};

    applications.forEach((app) => {
      const stage = app.current_stage || 'applied';
      const status = app.status || 'active';
      const company = app.job?.company?.name || 'Unknown';
      const role = app.job?.title || 'Unknown';
      const date = new Date(app.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      stageCounts[stage] = (stageCounts[stage] || 0) + 1;
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      companyCounts[company] = (companyCounts[company] || 0) + 1;
      roleCounts[role] = (roleCounts[role] || 0) + 1;
      dateApplications[date] = (dateApplications[date] || 0) + 1;
    });

    // Pie chart data for stages
    const pieData = stageOrder
      .filter(stage => stageCounts[stage] > 0)
      .map((stage, index) => ({
        name: isHebrew ? stageLabels[stage]?.he : stageLabels[stage]?.en,
        value: stageCounts[stage] || 0,
        color: COLORS[index % COLORS.length],
      }));

    // Add rejected if exists
    if (stageCounts['rejected']) {
      pieData.push({
        name: isHebrew ? stageLabels['rejected'].he : stageLabels['rejected'].en,
        value: stageCounts['rejected'],
        color: COLORS[5],
      });
    }

    // Bar chart data for companies (top 5)
    const companyData = Object.entries(companyCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({
        name: name.length > 12 ? name.substring(0, 12) + '...' : name,
        fullName: name,
        count,
      }));

    // Timeline data
    const timelineData = Object.entries(dateApplications)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .slice(-14)
      .map(([date, count]) => ({
        date,
        applications: count,
      }));

    // Response rate (not rejected or still in applied)
    const responded = total - (stageCounts['applied'] || 0);
    const responseRate = Math.round((responded / total) * 100);

    // Rejected count
    const rejected = statusCounts['rejected'] || 0;

    // Top roles
    const topRoles = Object.entries(roleCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      total,
      pieData,
      companyData,
      timelineData,
      responseRate,
      rejected,
      topRoles,
      stageCounts,
    };
  }, [applications, isHebrew]);

  if (!insights) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {insights.responseRate}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {isHebrew ? 'אחוז תגובה' : 'Response Rate'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-destructive/20">
                <Target className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {insights.rejected}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isHebrew ? 'נדחו' : 'Rejected'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pie Chart - Stage Distribution */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <PieChartIcon className="h-5 w-5 text-primary" />
            {isHebrew ? 'התפלגות לפי שלב' : 'Stage Distribution'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={insights.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {insights.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Bar Chart - By Company */}
      {insights.companyData.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5 text-primary" />
              {isHebrew ? 'לפי חברה' : 'By Company'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={insights.companyData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={80}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value, name, props) => [value, props.payload.fullName]}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="hsl(var(--primary))" 
                    radius={[0, 4, 4, 0]}
                    barSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Area Chart - Timeline */}
      {insights.timelineData.length > 2 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5 text-primary" />
              {isHebrew ? 'היסטוריית הגשות' : 'Application Timeline'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={insights.timelineData}>
                  <defs>
                    <linearGradient id="colorApplications" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="applications"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorApplications)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Roles */}
      {insights.topRoles.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {isHebrew ? 'לפי תפקיד' : 'By Role'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {insights.topRoles.map(([role, count], index) => (
              <div key={role} className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                  {role}
                </span>
                <span 
                  className="text-sm font-medium px-2 py-0.5 rounded"
                  style={{ 
                    backgroundColor: `${COLORS[index % COLORS.length]}20`,
                    color: COLORS[index % COLORS.length],
                  }}
                >
                  {count}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
