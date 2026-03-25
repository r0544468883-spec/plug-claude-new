import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, BarChart3, ArrowLeft, ArrowRight, Briefcase, ClipboardList, Users, Eye, Star, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, FunnelChart, Funnel, LabelList, Legend
} from 'recharts';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6'];

function StatCard({ label, value, icon: Icon, color = 'text-primary' }: {
  label: string; value: string | number; icon: any; color?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Analytics() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as 'jobs' | 'assignments') ?? 'jobs';

  // Jobs data
  const [jobs, setJobs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  // Assignments data
  const [assignmentTemplates, setAssignmentTemplates] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [accessRequests, setAccessRequests] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      setIsLoading(true);
      try {
        const [jobsRes, assignmentsRes] = await Promise.all([
          // Jobs + applications
          supabase.from('jobs' as any)
            .select('id, title, created_at, status')
            .eq('created_by', user.id),
          // Assignments
          supabase.from('assignment_templates' as any)
            .select('id, title, created_at, difficulty, view_count, is_active')
            .eq('created_by', user.id),
        ]);

        const myJobs = (jobsRes.data as any[]) ?? [];
        const myAssignments = (assignmentsRes.data as any[]) ?? [];
        setJobs(myJobs);
        setAssignmentTemplates(myAssignments);

        if (myJobs.length > 0) {
          const { data: appsData } = await supabase
            .from('applications' as any)
            .select('id, job_id, current_stage, apply_method, created_at, status')
            .in('job_id', myJobs.map((j: any) => j.id));
          setApplications((appsData as any[]) ?? []);
        }

        if (myAssignments.length > 0) {
          const ids = myAssignments.map((a: any) => a.id);
          const [subsRes, reqsRes] = await Promise.all([
            supabase.from('assignment_submissions' as any)
              .select('id, template_id, created_at, recruiter_rating, status')
              .in('template_id', ids),
            supabase.from('assignment_access_requests' as any)
              .select('id, template_id, status, created_at')
              .in('template_id', ids),
          ]);
          setSubmissions((subsRes.data as any[]) ?? []);
          setAccessRequests((reqsRes.data as any[]) ?? []);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, [user]);

  // ---- JOBS ANALYTICS ----

  const jobsStats = useMemo(() => {
    const totalApps = applications.length;
    const stageCount: Record<string, number> = {};
    const sourceCount: Record<string, number> = {};
    applications.forEach((a: any) => {
      const stage = a.current_stage || 'applied';
      stageCount[stage] = (stageCount[stage] ?? 0) + 1;
      const src = a.apply_method || 'web';
      sourceCount[src] = (sourceCount[src] ?? 0) + 1;
    });

    const funnelData = [
      { name: isHebrew ? 'הגיש מועמדות' : 'Applied', value: totalApps, fill: COLORS[0] },
      { name: isHebrew ? 'נצפה' : 'Viewed', value: stageCount['viewed'] ?? Math.floor(totalApps * 0.6), fill: COLORS[1] },
      { name: isHebrew ? 'סינון' : 'Screened', value: stageCount['screening'] ?? Math.floor(totalApps * 0.3), fill: COLORS[2] },
      { name: isHebrew ? 'ראיון' : 'Interview', value: stageCount['interview'] ?? Math.floor(totalApps * 0.15), fill: COLORS[3] },
      { name: isHebrew ? 'הצעה' : 'Offer', value: stageCount['offer'] ?? Math.floor(totalApps * 0.05), fill: COLORS[4] },
    ].filter(s => s.value > 0);

    const sourceData = Object.entries(sourceCount).map(([name, value]) => ({ name, value }));

    // Applications per day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dayMap: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dayMap[d.toISOString().split('T')[0]] = 0;
    }
    applications.forEach((a: any) => {
      const day = a.created_at?.split('T')[0];
      if (day && dayMap[day] !== undefined) dayMap[day]++;
    });
    const trendData = Object.entries(dayMap).map(([date, count]) => ({
      date: date.slice(5), count
    }));

    const perJobData = jobs.map((j: any) => ({
      name: j.title?.slice(0, 20) + (j.title?.length > 20 ? '...' : '') || 'Job',
      applicants: applications.filter((a: any) => a.job_id === j.id).length,
    })).sort((a, b) => b.applicants - a.applicants).slice(0, 10);

    const conversionRate = totalApps > 0
      ? Math.round(((stageCount['interview'] ?? 0) / totalApps) * 100)
      : 0;

    return { totalApps, funnelData, sourceData, trendData, perJobData, conversionRate };
  }, [applications, jobs, isHebrew]);

  // ---- ASSIGNMENTS ANALYTICS ----

  const assignmentsStats = useMemo(() => {
    const totalViews = assignmentTemplates.reduce((sum: number, t: any) => sum + (t.view_count ?? 0), 0);
    const totalSubs = submissions.length;
    const ratings = submissions.map((s: any) => s.recruiter_rating).filter(Boolean);
    const avgRating = ratings.length > 0 ? (ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length).toFixed(1) : '—';
    const pendingRequests = accessRequests.filter((r: any) => r.status === 'pending').length;

    // Submissions per assignment
    const subsByTemplate: Record<string, number> = {};
    submissions.forEach((s: any) => {
      subsByTemplate[s.template_id] = (subsByTemplate[s.template_id] ?? 0) + 1;
    });
    const perAssignmentData = assignmentTemplates.map((t: any) => ({
      name: t.title?.slice(0, 20) + (t.title?.length > 20 ? '...' : '') || 'Task',
      submissions: subsByTemplate[t.id] ?? 0,
      views: t.view_count ?? 0,
    })).sort((a, b) => b.submissions - a.submissions).slice(0, 10);

    // Difficulty distribution
    const diffCount: Record<string, number> = {};
    assignmentTemplates.forEach((t: any) => {
      const d = t.difficulty || 'unknown';
      diffCount[d] = (diffCount[d] ?? 0) + 1;
    });
    const diffData = Object.entries(diffCount).map(([name, value]) => ({ name, value }));

    // Submissions over time (last 30 days)
    const dayMap: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dayMap[d.toISOString().split('T')[0]] = 0;
    }
    submissions.forEach((s: any) => {
      const day = s.created_at?.split('T')[0];
      if (day && dayMap[day] !== undefined) dayMap[day]++;
    });
    const trendData = Object.entries(dayMap).map(([date, count]) => ({
      date: date.slice(5), count
    }));

    // Access requests status
    const reqStatusData = [
      { name: isHebrew ? 'ממתין' : 'Pending', value: accessRequests.filter((r: any) => r.status === 'pending').length },
      { name: isHebrew ? 'אושר' : 'Approved', value: accessRequests.filter((r: any) => r.status === 'approved').length },
      { name: isHebrew ? 'נדחה' : 'Rejected', value: accessRequests.filter((r: any) => r.status === 'rejected').length },
    ].filter(d => d.value > 0);

    return { totalViews, totalSubs, avgRating, pendingRequests, perAssignmentData, diffData, trendData, reqStatusData };
  }, [assignmentTemplates, submissions, accessRequests, isHebrew]);

  return (
    <div className="min-h-screen bg-background" dir={isHebrew ? 'rtl' : 'ltr'}>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">

        {/* Page header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1 text-muted-foreground hover:text-foreground">
            {isHebrew ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            {isHebrew ? 'חזרה' : 'Back'}
          </Button>
          <BarChart3 className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">{isHebrew ? 'אנליטיקס' : 'Analytics'}</h1>
            <p className="text-sm text-muted-foreground">
              {isHebrew ? 'ביצועי משרות ומטלות' : 'Job and assignment performance'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b">
          {[
            { id: 'jobs', label: isHebrew ? 'משרות' : 'Jobs', icon: Briefcase },
            { id: 'assignments', label: isHebrew ? 'מטלות' : 'Assignments', icon: ClipboardList },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSearchParams({ tab: tab.id })}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 -mb-px ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : activeTab === 'jobs' ? (
          <JobsAnalytics stats={jobsStats} jobs={jobs} applications={applications} isHebrew={isHebrew} />
        ) : (
          <AssignmentsAnalytics
            stats={assignmentsStats}
            templates={assignmentTemplates}
            submissions={submissions}
            accessRequests={accessRequests}
            isHebrew={isHebrew}
          />
        )}
      </main>
    </div>
  );
}

function JobsAnalytics({ stats, jobs, applications, isHebrew }: any) {
  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
        <Briefcase className="w-14 h-14 opacity-20" />
        <p>{isHebrew ? 'לא פרסמת משרות עדיין' : 'No jobs posted yet'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label={isHebrew ? 'משרות פעילות' : 'Active Jobs'} value={jobs.filter((j: any) => j.status !== 'inactive').length} icon={Briefcase} />
        <StatCard label={isHebrew ? "סה\"כ מועמדים" : 'Total Applicants'} value={stats.totalApps} icon={Users} />
        <StatCard label={isHebrew ? 'שיעור ראיונות' : 'Interview Rate'} value={`${stats.conversionRate}%`} icon={TrendingUp} color="text-green-500" />
        <StatCard label={isHebrew ? 'מקורות' : 'Sources'} value={stats.sourceData.length} icon={BarChart3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel */}
        {stats.funnelData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{isHebrew ? 'משפך מועמדים' : 'Candidate Funnel'}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.funnelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={4}>
                    {stats.funnelData.map((entry: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Source pie */}
        {stats.sourceData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{isHebrew ? 'מקור מועמדים' : 'Application Sources'}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={stats.sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {stats.sourceData.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Trend line */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{isHebrew ? 'מועמדים לאורך זמן (30 יום)' : 'Applications over time (30 days)'}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={stats.trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke={COLORS[0]} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Per job table */}
      {stats.perJobData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{isHebrew ? 'מועמדים לפי משרה' : 'Applicants by Job'}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(200, stats.perJobData.length * 32)}>
              <BarChart data={stats.perJobData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="applicants" fill={COLORS[0]} radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AssignmentsAnalytics({ stats, templates, submissions, accessRequests, isHebrew }: any) {
  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
        <ClipboardList className="w-14 h-14 opacity-20" />
        <p>{isHebrew ? 'לא פרסמת מטלות עדיין' : 'No assignments posted yet'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label={isHebrew ? "סה\"כ צפיות" : 'Total Views'} value={stats.totalViews} icon={Eye} />
        <StatCard label={isHebrew ? "סה\"כ הגשות" : 'Total Submissions'} value={stats.totalSubs} icon={ClipboardList} />
        <StatCard label={isHebrew ? 'ציון ממוצע' : 'Avg Rating'} value={stats.avgRating} icon={Star} color="text-yellow-500" />
        {stats.pendingRequests > 0 && (
          <StatCard label={isHebrew ? 'בקשות ממתינות' : 'Pending Requests'} value={stats.pendingRequests} icon={AlertCircle} color="text-amber-500" />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Difficulty pie */}
        {stats.diffData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{isHebrew ? 'פיזור קושי' : 'Difficulty Distribution'}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={stats.diffData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {stats.diffData.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Access requests status */}
        {stats.reqStatusData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{isHebrew ? 'סטטוס בקשות גישה' : 'Access Request Status'}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={stats.reqStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {stats.reqStatusData.map((_: any, i: number) => (
                      <Cell key={i} fill={[COLORS[2], COLORS[1], COLORS[3]][i] ?? COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Trend line */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{isHebrew ? 'הגשות לאורך זמן (30 יום)' : 'Submissions over time (30 days)'}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={stats.trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke={COLORS[0]} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Submissions per assignment */}
      {stats.perAssignmentData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{isHebrew ? 'הגשות לפי מטלה' : 'Submissions by Assignment'}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(200, stats.perAssignmentData.length * 40)}>
              <BarChart data={stats.perAssignmentData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="submissions" name={isHebrew ? 'הגשות' : 'Submissions'} fill={COLORS[0]} radius={4} />
                <Bar dataKey="views" name={isHebrew ? 'צפיות' : 'Views'} fill={COLORS[1]} radius={4} />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Detailed table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{isHebrew ? 'פירוט מטלות' : 'Assignment Details'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-xs">
                  <th className="text-start py-2 pe-4">{isHebrew ? 'מטלה' : 'Assignment'}</th>
                  <th className="text-center py-2 px-2">{isHebrew ? 'צפיות' : 'Views'}</th>
                  <th className="text-center py-2 px-2">{isHebrew ? 'הגשות' : 'Submissions'}</th>
                  <th className="text-center py-2 px-2">{isHebrew ? 'ציון ממוצע' : 'Avg Rating'}</th>
                  <th className="text-center py-2 px-2">{isHebrew ? 'בקשות' : 'Requests'}</th>
                  <th className="text-center py-2 px-2">{isHebrew ? 'קושי' : 'Difficulty'}</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t: any) => {
                  const tmplSubs = submissions.filter((s: any) => s.template_id === t.id);
                  const tmplReqs = accessRequests.filter((r: any) => r.template_id === t.id);
                  const tmplRatings = tmplSubs.map((s: any) => s.recruiter_rating).filter(Boolean);
                  const avgR = tmplRatings.length > 0
                    ? (tmplRatings.reduce((a: number, b: number) => a + b, 0) / tmplRatings.length).toFixed(1)
                    : '—';
                  return (
                    <tr key={t.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 pe-4 font-medium max-w-[180px] truncate">{t.title}</td>
                      <td className="text-center py-2.5 px-2">{t.view_count ?? 0}</td>
                      <td className="text-center py-2.5 px-2">{tmplSubs.length}</td>
                      <td className="text-center py-2.5 px-2">{avgR}</td>
                      <td className="text-center py-2.5 px-2">
                        {tmplReqs.length > 0 ? (
                          <span className="flex items-center justify-center gap-1">
                            {tmplReqs.length}
                            {tmplReqs.some((r: any) => r.status === 'pending') && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1 text-amber-600 border-amber-500/30">
                                {isHebrew ? 'ממתין' : 'pending'}
                              </Badge>
                            )}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="text-center py-2.5 px-2">
                        {t.difficulty ? (
                          <Badge variant="outline" className="text-xs capitalize">{t.difficulty}</Badge>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
