import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PlugLogo } from '@/components/PlugLogo';
import {
  Users, Activity, TrendingUp, Zap, Globe, BarChart3,
  CheckCircle2, XCircle, AlertTriangle, RefreshCw, Search,
  ArrowLeft, Monitor, Smartphone, Mail, Calendar, Brain,
  Briefcase, Download, Eye, Clock, UserPlus, Loader2
} from 'lucide-react';

// ============================================================
// PLUG Admin Dashboard — restricted to authorized admins
// ============================================================

const ADMIN_EMAILS = ['r0544468883@gmail.com'];

interface UserRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  created_at: string;
  has_gmail: boolean;
  has_extension: boolean;
  applications_count: number;
  last_active: string | null;
  consent_marketing: boolean;
}

interface HealthCheck {
  name: string;
  status: 'ok' | 'error' | 'warning';
  details: string;
  checked_at: string;
}

interface OverviewStats {
  totalUsers: number;
  newToday: number;
  newThisWeek: number;
  newThisMonth: number;
  activeThisWeek: number;
  extensionUsers: number;
  totalApplications: number;
  totalJobs: number;
  gmailConnected: number;
}

export default function Admin() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  // Overview
  const [stats, setStats] = useState<OverviewStats | null>(null);

  // Users
  const [users, setUsers] = useState<UserRow[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);

  // Health
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [healthLoading, setHealthLoading] = useState(false);

  // Extension & Jobs
  const [jobStats, setJobStats] = useState<any>(null);

  // Auth check — wait for auth to finish loading before deciding
  useEffect(() => {
    if (authLoading) return; // still loading, wait
    if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  const loading = authLoading || !user || !ADMIN_EMAILS.includes(user.email || '');

  // Load overview stats
  const loadOverview = useCallback(async () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: totalUsers },
      { count: newToday },
      { count: newThisWeek },
      { count: newThisMonth },
      { count: totalApplications },
      { count: totalJobs },
      { count: gmailConnected },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', monthAgo),
      supabase.from('applications').select('*', { count: 'exact', head: true }),
      supabase.from('jobs').select('*', { count: 'exact', head: true }),
      supabase.from('email_oauth_tokens').select('*', { count: 'exact', head: true }),
    ]);

    // Extension users: those with job_history entries
    const { data: extUsers } = await (supabase as any).from('job_history').select('user_id').limit(1000);
    const uniqueExtUsers = new Set((extUsers || []).map((r: any) => r.user_id));

    // Active this week: profiles with updated_at in last 7 days (approximation)
    const { count: activeThisWeek } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('updated_at', weekAgo);

    setStats({
      totalUsers: totalUsers || 0,
      newToday: newToday || 0,
      newThisWeek: newThisWeek || 0,
      newThisMonth: newThisMonth || 0,
      activeThisWeek: activeThisWeek || 0,
      extensionUsers: uniqueExtUsers.size,
      totalApplications: totalApplications || 0,
      totalJobs: totalJobs || 0,
      gmailConnected: gmailConnected || 0,
    });
  }, []);

  // Load users
  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, email, phone, created_at, consent_marketing')
      .order('created_at', { ascending: false });

    if (!profiles) { setUsersLoading(false); return; }

    // Get roles
    const { data: roles } = await (supabase as any).from('user_roles').select('user_id, role');
    const roleMap = new Map((roles || []).map((r: any) => [r.user_id, r.role]));

    // Get gmail connections
    const { data: gmailTokens } = await supabase.from('email_oauth_tokens').select('user_id');
    const gmailSet = new Set((gmailTokens || []).map((r: any) => r.user_id));

    // Get extension users
    const { data: extHistory } = await (supabase as any).from('job_history').select('user_id').limit(5000);
    const extSet = new Set((extHistory || []).map((r: any) => r.user_id));

    // Get application counts
    const { data: apps } = await supabase.from('applications').select('user_id');
    const appCounts = new Map<string, number>();
    (apps || []).forEach((a: any) => {
      appCounts.set(a.user_id, (appCounts.get(a.user_id) || 0) + 1);
    });

    const userRows: UserRow[] = profiles.map((p: any) => ({
      user_id: p.user_id,
      full_name: p.full_name,
      email: p.email,
      phone: p.phone,
      role: roleMap.get(p.user_id) || 'unknown',
      created_at: p.created_at,
      has_gmail: gmailSet.has(p.user_id),
      has_extension: extSet.has(p.user_id),
      applications_count: appCounts.get(p.user_id) || 0,
      last_active: null,
      consent_marketing: p.consent_marketing || false,
    }));

    setUsers(userRows);
    setUsersLoading(false);
  }, []);

  // Load job/extension stats
  const loadJobStats = useCallback(async () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: jobsToday },
      { count: jobsThisWeek },
      { count: appsToday },
      { count: appsThisWeek },
      { count: extApps },
    ] = await Promise.all([
      supabase.from('jobs').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
      supabase.from('jobs').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
      supabase.from('applications').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
      supabase.from('applications').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
      supabase.from('applications').select('*', { count: 'exact', head: true }).eq('source', 'extension'),
    ]);

    // Jobs by source
    const { data: allJobsSrc } = await supabase.from('jobs').select('external_source').not('external_source', 'is', null);
    const srcCounts: Record<string, number> = {};
    (allJobsSrc || []).forEach((j: any) => {
      const src = j.external_source || 'manual';
      srcCounts[src] = (srcCounts[src] || 0) + 1;
    });

    setJobStats({
      jobsToday: jobsToday || 0,
      jobsThisWeek: jobsThisWeek || 0,
      appsToday: appsToday || 0,
      appsThisWeek: appsThisWeek || 0,
      extApps: extApps || 0,
      jobsBySource: srcCounts,
    });
  }, []);

  // Run health check
  const runHealthCheck = useCallback(async () => {
    setHealthLoading(true);
    const checks: HealthCheck[] = [];
    const now = new Date().toISOString();

    // 1. AI (check if we can reach the edge function)
    try {
      const { data, error } = await supabase.functions.invoke('ai-proxy', {
        body: { messages: [{ role: 'user', content: 'ping' }], maxTokens: 5 },
        headers: { 'X-Plug-Key': 'health-check' },
      });
      checks.push({ name: 'AI (Anthropic)', status: error ? 'error' : 'ok', details: error ? String(error) : 'Responding', checked_at: now });
    } catch (e: any) {
      checks.push({ name: 'AI (Anthropic)', status: 'error', details: e.message, checked_at: now });
    }

    // 2. Gmail
    const { count: gmailCount } = await supabase.from('email_oauth_tokens').select('*', { count: 'exact', head: true });
    checks.push({ name: 'Gmail OAuth', status: (gmailCount || 0) > 0 ? 'ok' : 'warning', details: `${gmailCount || 0} tokens connected`, checked_at: now });

    // 3. Calendar
    const { count: calCount } = await (supabase as any).from('google_calendar_tokens').select('*', { count: 'exact', head: true });
    checks.push({ name: 'Google Calendar', status: (calCount || 0) > 0 ? 'ok' : 'warning', details: `${calCount || 0} synced`, checked_at: now });

    // 4. AllJobs
    const todayStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).toISOString();
    const { count: alljobsToday } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('external_source', 'alljobs').gte('created_at', todayStart);
    checks.push({ name: 'AllJobs Scraping', status: (alljobsToday || 0) > 0 ? 'ok' : 'warning', details: `${alljobsToday || 0} jobs today`, checked_at: now });

    // 5. LinkedIn
    const { count: linkedinToday } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('external_source', 'linkedin').gte('created_at', todayStart);
    checks.push({ name: 'LinkedIn Scraping', status: (linkedinToday || 0) > 0 ? 'ok' : 'warning', details: `${linkedinToday || 0} jobs today`, checked_at: now });

    // 6. Extension
    const { count: extToday } = await (supabase as any).from('job_history').select('*', { count: 'exact', head: true }).gte('created_at', todayStart);
    checks.push({ name: 'Extension Activity', status: (extToday || 0) > 0 ? 'ok' : 'warning', details: `${extToday || 0} events today`, checked_at: now });

    // 7. Clarity (just check if snippet is present — always ok since we embed it)
    checks.push({ name: 'Microsoft Clarity', status: 'ok', details: 'Snippet embedded', checked_at: now });

    setHealthChecks(checks);
    setHealthLoading(false);
  }, []);

  // Load data on tab change
  useEffect(() => {
    if (loading) return;
    if (activeTab === 'overview' && !stats) loadOverview();
    if (activeTab === 'users' && users.length === 0) loadUsers();
    if (activeTab === 'jobs' && !jobStats) loadJobStats();
    if (activeTab === 'integrations' && healthChecks.length === 0) runHealthCheck();
  }, [activeTab, loading, stats, users.length, jobStats, healthChecks.length, loadOverview, loadUsers, loadJobStats, runHealthCheck]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredUsers = users.filter(u => {
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return (u.full_name?.toLowerCase().includes(q)) ||
      (u.email?.toLowerCase().includes(q)) ||
      (u.phone?.includes(q));
  });

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <PlugLogo size="sm" />
            <h1 className="text-lg font-bold">Admin Dashboard</h1>
          </div>
          <Badge variant="outline" className="text-xs">{user?.email}</Badge>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-6 w-full mb-6">
            <TabsTrigger value="overview" className="flex items-center gap-1.5 text-xs">
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">סקירה</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-1.5 text-xs">
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">משתמשים</span>
            </TabsTrigger>
            <TabsTrigger value="engagement" className="flex items-center gap-1.5 text-xs">
              <Activity className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">אנגייג'מנט</span>
            </TabsTrigger>
            <TabsTrigger value="jobs" className="flex items-center gap-1.5 text-xs">
              <Briefcase className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">תוסף ומשרות</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-1.5 text-xs">
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">אינטגרציות</span>
            </TabsTrigger>
            <TabsTrigger value="growth" className="flex items-center gap-1.5 text-xs">
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">צמיחה</span>
            </TabsTrigger>
          </TabsList>

          {/* ==================== OVERVIEW ==================== */}
          <TabsContent value="overview">
            {!stats ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : (
              <div className="space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard icon={Users} label="סה״כ משתמשים" value={stats.totalUsers} />
                  <StatCard icon={UserPlus} label="חדשים היום" value={stats.newToday} accent />
                  <StatCard icon={UserPlus} label="חדשים השבוע" value={stats.newThisWeek} />
                  <StatCard icon={UserPlus} label="חדשים החודש" value={stats.newThisMonth} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard icon={Activity} label="פעילים השבוע" value={stats.activeThisWeek} />
                  <StatCard icon={Download} label="משתמשי תוסף" value={stats.extensionUsers} />
                  <StatCard icon={Mail} label="Gmail מחובר" value={stats.gmailConnected} />
                  <StatCard icon={Briefcase} label="סה״כ משרות" value={stats.totalJobs} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard icon={CheckCircle2} label="סה״כ הגשות" value={stats.totalApplications} />
                  <StatCard icon={Brain} label="Activation Rate" value={stats.totalApplications > 0 ? `${Math.round((stats.totalApplications / stats.totalUsers) * 100)}%` : '0%'} />
                  <StatCard icon={Monitor} label="Extension %" value={`${Math.round((stats.extensionUsers / stats.totalUsers) * 100)}%`} />
                  <StatCard icon={TrendingUp} label="Gmail %" value={`${Math.round((stats.gmailConnected / stats.totalUsers) * 100)}%`} />
                </div>

                {/* Activation Funnel */}
                <Card>
                  <CardHeader><CardTitle className="text-base">Activation Funnel</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <FunnelBar label="הרשמה" value={stats.totalUsers} max={stats.totalUsers} />
                      <FunnelBar label="Gmail מחובר" value={stats.gmailConnected} max={stats.totalUsers} />
                      <FunnelBar label="תוסף מותקן" value={stats.extensionUsers} max={stats.totalUsers} />
                      <FunnelBar label="הגשה ראשונה" value={Math.min(stats.totalApplications, stats.totalUsers)} max={stats.totalUsers} />
                    </div>
                  </CardContent>
                </Card>

                <div className="text-center">
                  <Button variant="outline" onClick={() => { setStats(null); loadOverview(); }}>
                    <RefreshCw className="w-4 h-4 me-2" /> רענן נתונים
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ==================== USERS ==================== */}
          <TabsContent value="users">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="חיפוש לפי שם, מייל או טלפון..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pr-10"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={loadUsers} disabled={usersLoading}>
                  <RefreshCw className={`w-4 h-4 ${usersLoading ? 'animate-spin' : ''}`} />
                </Button>
                <Badge variant="secondary">{filteredUsers.length} משתמשים</Badge>
              </div>

              {usersLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="py-2 px-2 text-right font-medium">שם</th>
                        <th className="py-2 px-2 text-right font-medium">מייל</th>
                        <th className="py-2 px-2 text-right font-medium">טלפון</th>
                        <th className="py-2 px-2 text-center font-medium">תפקיד</th>
                        <th className="py-2 px-2 text-center font-medium">Gmail</th>
                        <th className="py-2 px-2 text-center font-medium">תוסף</th>
                        <th className="py-2 px-2 text-center font-medium">הגשות</th>
                        <th className="py-2 px-2 text-center font-medium">שיווק</th>
                        <th className="py-2 px-2 text-right font-medium">הצטרף</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => (
                        <tr key={u.user_id} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-2 px-2 font-medium">{u.full_name || '—'}</td>
                          <td className="py-2 px-2 text-xs text-muted-foreground" dir="ltr">{u.email}</td>
                          <td className="py-2 px-2 text-xs" dir="ltr">{u.phone || '—'}</td>
                          <td className="py-2 px-2 text-center">
                            <Badge variant="outline" className="text-[10px]">{u.role}</Badge>
                          </td>
                          <td className="py-2 px-2 text-center">
                            {u.has_gmail ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /> : <XCircle className="w-4 h-4 text-muted-foreground/40 mx-auto" />}
                          </td>
                          <td className="py-2 px-2 text-center">
                            {u.has_extension ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /> : <XCircle className="w-4 h-4 text-muted-foreground/40 mx-auto" />}
                          </td>
                          <td className="py-2 px-2 text-center font-mono">{u.applications_count}</td>
                          <td className="py-2 px-2 text-center">
                            {u.consent_marketing ? <Mail className="w-4 h-4 text-blue-500 mx-auto" /> : <XCircle className="w-4 h-4 text-muted-foreground/40 mx-auto" />}
                          </td>
                          <td className="py-2 px-2 text-xs text-muted-foreground">
                            {new Date(u.created_at).toLocaleDateString('he-IL')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ==================== ENGAGEMENT ==================== */}
          <TabsContent value="engagement">
            <EngagementTab />
          </TabsContent>

          {/* ==================== EXTENSION & JOBS ==================== */}
          <TabsContent value="jobs">
            {!jobStats ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard icon={Briefcase} label="משרות היום" value={jobStats.jobsToday} accent />
                  <StatCard icon={Briefcase} label="משרות השבוע" value={jobStats.jobsThisWeek} />
                  <StatCard icon={CheckCircle2} label="הגשות היום" value={jobStats.appsToday} accent />
                  <StatCard icon={CheckCircle2} label="הגשות השבוע" value={jobStats.appsThisWeek} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <StatCard icon={Download} label="הגשות מתוסף" value={jobStats.extApps} />
                  <StatCard icon={Monitor} label="AllJobs" value={jobStats.jobsBySource?.alljobs || 0} />
                  <StatCard icon={Globe} label="LinkedIn" value={jobStats.jobsBySource?.linkedin || 0} />
                </div>

                <Card>
                  <CardHeader><CardTitle className="text-base">משרות לפי מקור</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(jobStats.jobsBySource || {}).map(([src, count]) => (
                        <div key={src} className="flex items-center justify-between">
                          <span className="text-sm capitalize">{src}</span>
                          <Badge variant="secondary">{count as number}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* ==================== INTEGRATIONS ==================== */}
          <TabsContent value="integrations">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">בריאות אינטגרציות</h2>
                <Button variant="outline" size="sm" onClick={runHealthCheck} disabled={healthLoading}>
                  <RefreshCw className={`w-4 h-4 me-2 ${healthLoading ? 'animate-spin' : ''}`} />
                  הרץ בדיקה
                </Button>
              </div>

              {healthLoading && healthChecks.length === 0 ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
              ) : (
                <div className="grid gap-3">
                  {healthChecks.map((check) => (
                    <Card key={check.name} className={`border-s-4 ${check.status === 'ok' ? 'border-s-green-500' : check.status === 'warning' ? 'border-s-yellow-500' : 'border-s-red-500'}`}>
                      <CardContent className="py-3 px-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {check.status === 'ok' ? <CheckCircle2 className="w-5 h-5 text-green-500" /> :
                            check.status === 'warning' ? <AlertTriangle className="w-5 h-5 text-yellow-500" /> :
                              <XCircle className="w-5 h-5 text-red-500" />}
                          <div>
                            <p className="font-medium text-sm">{check.name}</p>
                            <p className="text-xs text-muted-foreground">{check.details}</p>
                          </div>
                        </div>
                        <Badge variant={check.status === 'ok' ? 'default' : check.status === 'warning' ? 'secondary' : 'destructive'}>
                          {check.status === 'ok' ? 'תקין' : check.status === 'warning' ? 'אזהרה' : 'תקלה'}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Clarity Section */}
              <Card>
                <CardHeader><CardTitle className="text-base">Microsoft Clarity</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Clarity מוטמע באתר ומספק heatmaps, הקלטות sessions, וזיהוי dead clicks.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://clarity.microsoft.com" target="_blank" rel="noreferrer">
                      <Eye className="w-4 h-4 me-2" /> פתח Clarity Dashboard
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ==================== GROWTH ==================== */}
          <TabsContent value="growth">
            <GrowthTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number | string; accent?: boolean }) {
  return (
    <Card className={accent ? 'border-primary/30 bg-primary/5' : ''}>
      <CardContent className="py-4 px-4 flex items-center gap-3">
        <Icon className={`w-5 h-5 ${accent ? 'text-primary' : 'text-muted-foreground'}`} />
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function FunnelBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-mono text-muted-foreground">{value} ({pct}%)</span>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function EngagementTab() {
  const [cohortData, setCohortData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCohortData();
  }, []);

  async function loadCohortData() {
    setLoading(true);
    // Get all profiles grouped by registration week
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, created_at, updated_at')
      .order('created_at', { ascending: true });

    if (!profiles) { setLoading(false); return; }

    // Group by week
    const weeks = new Map<string, { total: number; active7: number; active30: number }>();
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    profiles.forEach((p: any) => {
      const d = new Date(p.created_at);
      const weekStart = new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay());
      const key = weekStart.toISOString().split('T')[0];

      if (!weeks.has(key)) weeks.set(key, { total: 0, active7: 0, active30: 0 });
      const w = weeks.get(key)!;
      w.total++;

      const lastActive = new Date(p.updated_at || p.created_at);
      if (lastActive >= weekAgo) w.active7++;
      if (lastActive >= monthAgo) w.active30++;
    });

    const cohorts = Array.from(weeks.entries()).map(([week, data]) => ({
      week,
      ...data,
      retention7: data.total > 0 ? Math.round((data.active7 / data.total) * 100) : 0,
      retention30: data.total > 0 ? Math.round((data.active30 / data.total) * 100) : 0,
    }));

    setCohortData(cohorts);
    setLoading(false);
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Cohort Retention (לפי שבוע הרשמה)</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2 px-3 text-right font-medium">שבוע</th>
                  <th className="py-2 px-3 text-center font-medium">נרשמו</th>
                  <th className="py-2 px-3 text-center font-medium">פעילים 7 ימים</th>
                  <th className="py-2 px-3 text-center font-medium">Retention 7d</th>
                  <th className="py-2 px-3 text-center font-medium">פעילים 30 ימים</th>
                  <th className="py-2 px-3 text-center font-medium">Retention 30d</th>
                </tr>
              </thead>
              <tbody>
                {cohortData.map((c) => (
                  <tr key={c.week} className="border-b border-border/50">
                    <td className="py-2 px-3 font-mono text-xs">{c.week}</td>
                    <td className="py-2 px-3 text-center font-bold">{c.total}</td>
                    <td className="py-2 px-3 text-center">{c.active7}</td>
                    <td className="py-2 px-3 text-center">
                      <Badge variant={c.retention7 > 50 ? 'default' : c.retention7 > 20 ? 'secondary' : 'destructive'}>
                        {c.retention7}%
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-center">{c.active30}</td>
                    <td className="py-2 px-3 text-center">
                      <Badge variant={c.retention30 > 50 ? 'default' : c.retention30 > 20 ? 'secondary' : 'destructive'}>
                        {c.retention30}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Key Engagement Metrics</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Total Registered</p>
              <p className="text-xl font-bold">{cohortData.reduce((s, c) => s + c.total, 0)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Active (7d)</p>
              <p className="text-xl font-bold">{cohortData.reduce((s, c) => s + c.active7, 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function GrowthTab() {
  const [signupsByDay, setSignupsByDay] = useState<{ date: string; count: number }[]>([]);
  const [referralStats, setReferralStats] = useState<{ total: number; withReferral: number }>({ total: 0, withReferral: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGrowthData();
  }, []);

  async function loadGrowthData() {
    setLoading(true);

    // Signups by day (last 30 days)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('created_at, referred_by')
      .order('created_at', { ascending: true });

    if (profiles) {
      const dayCounts = new Map<string, number>();
      let withRef = 0;
      profiles.forEach((p: any) => {
        const day = new Date(p.created_at).toISOString().split('T')[0];
        dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
        if (p.referred_by) withRef++;
      });

      const last30 = Array.from(dayCounts.entries())
        .map(([date, count]) => ({ date, count }))
        .slice(-30);

      setSignupsByDay(last30);
      setReferralStats({ total: profiles.length, withReferral: withRef });
    }

    setLoading(false);
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Growth velocity */}
      <Card>
        <CardHeader><CardTitle className="text-base">הרשמות לפי יום (30 ימים אחרונים)</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-32">
            {signupsByDay.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-primary rounded-t min-h-[4px] transition-all"
                  style={{ height: `${Math.max(d.count * 20, 4)}px` }}
                  title={`${d.date}: ${d.count}`}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>{signupsByDay[0]?.date}</span>
            <span>{signupsByDay[signupsByDay.length - 1]?.date}</span>
          </div>
        </CardContent>
      </Card>

      {/* Channel metrics */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="py-4 px-4">
            <p className="text-xs text-muted-foreground">Referral Rate</p>
            <p className="text-2xl font-bold">
              {referralStats.total > 0 ? `${Math.round((referralStats.withReferral / referralStats.total) * 100)}%` : '0%'}
            </p>
            <p className="text-xs text-muted-foreground">{referralStats.withReferral} מתוך {referralStats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 px-4">
            <p className="text-xs text-muted-foreground">Avg Signups / Day (30d)</p>
            <p className="text-2xl font-bold">
              {signupsByDay.length > 0 ? (signupsByDay.reduce((s, d) => s + d.count, 0) / Math.max(signupsByDay.length, 1)).toFixed(1) : '0'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* PLG Insights */}
      <Card>
        <CardHeader><CardTitle className="text-base">PLG Insights</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="font-medium text-primary mb-1">Time to First Value (TTFV)</p>
            <p className="text-muted-foreground">מדוד כמה זמן עובר מהרשמה עד הגשה ראשונה. Target: פחות מ-10 דקות.</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="font-medium mb-1">Activation Checklist</p>
            <ul className="text-muted-foreground space-y-1">
              <li>1. הרשמה</li>
              <li>2. אונבורדינג מלא</li>
              <li>3. חיבור Gmail</li>
              <li>4. התקנת תוסף</li>
              <li>5. הגשת מועמדות ראשונה (Aha moment)</li>
            </ul>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="font-medium mb-1">Growth Equation</p>
            <p className="text-muted-foreground">
              משתמש חדש = הפניה (referral) + אורגני (LinkedIn post) + direct<br />
              כל משתמש שמשתמש בתוסף → מגיש יותר → שבע יותר → ממליץ לחברים
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
