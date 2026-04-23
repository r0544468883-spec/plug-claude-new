import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getCompanyLogoUrl } from '@/lib/company-logo';
import {
  ArrowLeft, ArrowRight, Building2, Briefcase, Users, BarChart3,
  Globe, Linkedin, Save, Loader2, ExternalLink, Newspaper,
  PenLine, Eye, Flame, Calendar,
} from 'lucide-react';
import { toast } from 'sonner';

export default function CompanyDashboard() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { language, direction } = useLanguage();
  const isHe = language === 'he';
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const BackIcon = direction === 'rtl' ? ArrowRight : ArrowLeft;

  const [saving, setSaving] = useState(false);

  // Fetch company
  const { data: company, isLoading } = useQuery({
    queryKey: ['company-dashboard', companyId],
    queryFn: async () => {
      const { data } = await supabase.from('companies').select('*').eq('id', companyId!).single();
      return data as any;
    },
    enabled: !!companyId,
  });

  // Edit state — initialized from company data
  const [form, setForm] = useState<Record<string, string>>({});
  const getField = (key: string) =>
    key in form ? form[key] : (company?.[key] ?? '');
  const setField = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  // Fetch company jobs
  const { data: jobs = [] } = useQuery({
    queryKey: ['company-dashboard-jobs', companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from('jobs')
        .select('id, title, status, location, job_type, created_at, source_url')
        .eq('company_id', companyId!)
        .order('created_at', { ascending: false })
        .limit(50);
      return (data || []) as any[];
    },
    enabled: !!companyId,
  });

  // Fetch feed posts by this company
  const { data: feedPosts = [] } = useQuery({
    queryKey: ['company-dashboard-posts', companyId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('feed_posts')
        .select('id, post_type, content_en, content_he, likes_count, comments_count, created_at, is_published')
        .eq('company_id', companyId!)
        .order('created_at', { ascending: false })
        .limit(20);
      return (data || []) as any[];
    },
    enabled: !!companyId,
  });

  // Fetch followers count
  const { data: followersCount = 0 } = useQuery({
    queryKey: ['company-followers', companyId],
    queryFn: async () => {
      const { count } = await supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('followed_company_id', companyId!);
      return count || 0;
    },
    enabled: !!companyId,
  });

  // Fetch applications count for all company jobs
  const { data: applicationsCount = 0 } = useQuery({
    queryKey: ['company-applications', companyId],
    queryFn: async () => {
      const jobIds = jobs.map((j: any) => j.id);
      if (!jobIds.length) return 0;
      const { count } = await supabase
        .from('applications')
        .select('id', { count: 'exact', head: true })
        .in('job_id', jobIds);
      return count || 0;
    },
    enabled: jobs.length > 0,
  });

  const handleSave = async () => {
    if (!company) return;
    setSaving(true);
    try {
      const updates: Record<string, any> = {};
      const fields = ['name', 'tagline', 'description', 'industry', 'size', 'website', 'linkedin_url', 'founded_year', 'employee_count'];
      for (const f of fields) {
        if (f in form) updates[f] = form[f] || null;
      }
      const { error } = await supabase.from('companies').update(updates as any).eq('id', company.id);
      if (error) throw error;
      toast.success(isHe ? 'נשמר בהצלחה!' : 'Saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['company-dashboard', companyId] });
      queryClient.invalidateQueries({ queryKey: ['company', companyId] });
    } catch {
      toast.error(isHe ? 'שגיאה בשמירה' : 'Save error');
    }
    setSaving(false);
  };

  const activeJobs = jobs.filter((j: any) => j.status === 'active');

  if (isLoading) return (
    <DashboardLayout currentSection="network" onSectionChange={() => {}}>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
      </div>
    </DashboardLayout>
  );

  // Guard: only claimed owner can access
  if (company && user?.id !== company.claimed_by && user?.id !== company.created_by) {
    return (
      <DashboardLayout currentSection="network" onSectionChange={() => {}}>
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <Building2 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">{isHe ? 'אין לך גישה לניהול דף זה' : 'You do not have access to manage this page'}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate(`/company/${companyId}`)}>
            {isHe ? 'צפה בדף הציבורי' : 'View public page'}
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentSection="network" onSectionChange={() => {}}>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="gap-1.5 -ms-2" onClick={() => navigate(`/company/${companyId}`)}>
              <BackIcon className="w-4 h-4" />
              {isHe ? 'חזרה לדף הציבורי' : 'Back to public page'}
            </Button>
          </div>
          <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isHe ? 'שמור שינויים' : 'Save Changes'}
          </Button>
        </div>

        {/* Company avatar + name preview */}
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16 rounded-xl flex-shrink-0">
            <AvatarImage src={getCompanyLogoUrl({ logo_url: company?.logo_url, website: getField('website') || company?.website }) || undefined} />
            <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-xl font-bold">
              {(getField('name') || company?.name || '?').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-bold text-lg">{getField('name') || company?.name}</p>
            {(getField('tagline') || company?.tagline) && (
              <p className="text-sm text-muted-foreground italic">{getField('tagline') || company?.tagline}</p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              {isHe ? 'לוגו נשלף אוטומטית מאתר החברה' : 'Logo auto-fetched from company website'}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: Users, value: followersCount, label: isHe ? 'עוקבים' : 'Followers', color: 'text-primary' },
            { icon: Briefcase, value: activeJobs.length, label: isHe ? 'משרות פתוחות' : 'Open Jobs', color: 'text-orange-500' },
            { icon: BarChart3, value: applicationsCount, label: isHe ? 'מועמדויות' : 'Applications', color: 'text-green-500' },
            { icon: Newspaper, value: feedPosts.length, label: isHe ? 'פוסטים' : 'Posts', color: 'text-blue-500' },
          ].map((s, i) => (
            <Card key={i}>
              <CardContent className="p-3 text-center">
                <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="profile">
          <TabsList className="w-full">
            <TabsTrigger value="profile" className="flex-1 text-xs gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              {isHe ? 'פרופיל' : 'Profile'}
            </TabsTrigger>
            <TabsTrigger value="jobs" className="flex-1 text-xs gap-1.5">
              <Briefcase className="w-3.5 h-3.5" />
              {isHe ? 'משרות' : 'Jobs'} ({activeJobs.length})
            </TabsTrigger>
            <TabsTrigger value="feed" className="flex-1 text-xs gap-1.5">
              <Newspaper className="w-3.5 h-3.5" />
              {isHe ? 'פיד' : 'Feed'} ({feedPosts.length})
            </TabsTrigger>
          </TabsList>

          {/* ── Profile Tab ── */}
          <TabsContent value="profile" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{isHe ? 'פרטי חברה' : 'Company Details'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { key: 'name', label: isHe ? 'שם החברה *' : 'Company Name *', placeholder: 'WalkMe' },
                  { key: 'tagline', label: isHe ? 'סלוגן' : 'Tagline', placeholder: isHe ? 'המשפט שמגדיר אתכם' : 'Your defining phrase' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
                    <Input value={getField(key)} onChange={e => setField(key, e.target.value)} placeholder={placeholder} />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">{isHe ? 'תיאור' : 'Description'}</label>
                  <Textarea value={getField('description')} onChange={e => setField('description', e.target.value)} placeholder={isHe ? 'ספרו על החברה...' : 'Tell us about the company...'} rows={4} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'industry', label: isHe ? 'תעשייה' : 'Industry', placeholder: 'SaaS, FinTech...' },
                    { key: 'size', label: isHe ? 'גודל' : 'Size', placeholder: '50-200' },
                    { key: 'founded_year', label: isHe ? 'שנת הקמה' : 'Founded', placeholder: '2015' },
                    { key: 'employee_count', label: isHe ? 'עובדים' : 'Employees', placeholder: '200-500' },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
                      <Input value={getField(key)} onChange={e => setField(key, e.target.value)} placeholder={placeholder} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{isHe ? 'קישורים' : 'Links'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1 block">
                    <Globe className="w-3 h-3" /> {isHe ? 'אתר אינטרנט' : 'Website'}
                  </label>
                  <Input value={getField('website')} onChange={e => setField('website', e.target.value)} placeholder="https://walkme.com" type="url" />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {isHe ? 'הלוגו יישלף אוטומטית מהכתובת הזו' : 'Logo will be auto-fetched from this URL'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1 block">
                    <Linkedin className="w-3 h-3" /> LinkedIn
                  </label>
                  <Input value={getField('linkedin_url')} onChange={e => setField('linkedin_url', e.target.value)} placeholder="https://linkedin.com/company/walkme" type="url" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Jobs Tab ── */}
          <TabsContent value="jobs" className="space-y-3 mt-4">
            {jobs.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center">
                  <Briefcase className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">{isHe ? 'אין משרות עדיין' : 'No jobs yet'}</p>
                </CardContent>
              </Card>
            ) : jobs.map((job: any) => (
              <Card key={job.id}>
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{job.title}</p>
                      <Badge variant={job.status === 'active' ? 'default' : 'outline'} className="text-[10px] h-4 px-1.5">
                        {job.status === 'active' ? (isHe ? 'פתוחה' : 'Active') : (isHe ? 'סגורה' : 'Closed')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      {job.location && <span>{job.location}</span>}
                      {job.job_type && <span>· {job.job_type}</span>}
                      <span>· <Calendar className="w-3 h-3 inline" /> {new Date(job.created_at).toLocaleDateString(isHe ? 'he-IL' : 'en-US')}</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {job.source_url && (
                      <a href={job.source_url} target="_blank" rel="noreferrer">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ── Feed Tab ── */}
          <TabsContent value="feed" className="space-y-3 mt-4">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => navigate('/')}
            >
              <PenLine className="w-4 h-4" />
              {isHe ? 'כתוב פוסט חדש בפיד' : 'Write a new post in the feed'}
            </Button>
            {feedPosts.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center">
                  <Newspaper className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">{isHe ? 'אין פוסטים עדיין' : 'No posts yet'}</p>
                </CardContent>
              </Card>
            ) : feedPosts.map((post: any) => (
              <Card key={post.id}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm line-clamp-2 flex-1">
                      {isHe ? post.content_he : post.content_en}
                    </p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Badge variant="outline" className="text-[10px]">{post.post_type}</Badge>
                      {post.is_published
                        ? <Eye className="w-3.5 h-3.5 text-green-500" />
                        : <Flame className="w-3.5 h-3.5 text-muted-foreground" />}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>👍 {post.likes_count || 0}</span>
                    <span>💬 {post.comments_count || 0}</span>
                    <span>{new Date(post.created_at).toLocaleDateString(isHe ? 'he-IL' : 'en-US')}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
