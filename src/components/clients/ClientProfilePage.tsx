import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ClientPlugChat } from '@/components/clients/ClientPlugChat';
import { ContactDetailSheet } from '@/components/clients/ContactDetailSheet';
import {
  Building2, Clock, Users, DollarSign, TrendingUp, FileText, Upload, Plus, Loader2, CheckCircle, Mail, Phone, Linkedin,
  Calendar, MessageSquare, Briefcase, FolderOpen, Sparkles, ExternalLink, BarChart3, Target, Presentation, User, ChevronRight, CalendarPlus
} from 'lucide-react';
import { format } from 'date-fns';

interface ClientProfilePageProps {
  companyId: string;
  onBack: () => void;
}

export function ClientProfilePage({ companyId, onBack }: ClientProfilePageProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const queryClient = useQueryClient();

  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddTimeline, setShowAddTimeline] = useState(false);
  const [showMeetingPrep, setShowMeetingPrep] = useState(false);
  const [meetingBrief, setMeetingBrief] = useState<string | null>(null);
  const [generatingBrief, setGeneratingBrief] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [showContactDetail, setShowContactDetail] = useState(false);
  const [newContact, setNewContact] = useState({ full_name: '', role_title: '', email: '', phone: '', linkedin_url: '' });
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', due_date: '', due_time: '' });
  const [newEvent, setNewEvent] = useState({ event_type: 'note', title: '', description: '', event_date: '' });
  const [showAddJob, setShowAddJob] = useState(false);
  const [newJob, setNewJob] = useState({ title: '', location: '', job_type: 'full_time', description: '' });
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [showForwardJob, setShowForwardJob] = useState(false);
  const [forwardJobId, setForwardJobId] = useState<string | null>(null);

  // Fetch company
  const { data: company } = useQuery({
    queryKey: ['client-company', companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from('companies').select('*').eq('id', companyId).single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch contacts
  const { data: contacts = [] } = useQuery({
    queryKey: ['client-contacts', companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from('client_contacts').select('*').eq('company_id', companyId).order('is_primary', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch timeline
  const { data: timeline = [] } = useQuery({
    queryKey: ['client-timeline', companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from('client_timeline').select('*').eq('company_id', companyId).order('event_date', { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });

  // Fetch tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ['client-tasks', companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from('client_tasks').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch vault files
  const { data: vaultFiles = [] } = useQuery({
    queryKey: ['client-vault', companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from('client_vault').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch active jobs
  const { data: activeJobs = [] } = useQuery({
    queryKey: ['client-active-jobs', companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from('jobs').select('id, title, status, created_at, location, job_type').eq('company_id', companyId).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch applications per job
  const { data: jobApplications = {} } = useQuery({
    queryKey: ['client-job-applications', companyId, activeJobs],
    queryFn: async () => {
      if (activeJobs.length === 0) return {};
      const { data, error } = await supabase.from('applications').select('id, job_id, current_stage, candidate_id, created_at').in('job_id', activeJobs.map(j => j.id));
      if (error) throw error;
      const grouped: Record<string, any[]> = {};
      (data || []).forEach(a => { if (!grouped[a.job_id]) grouped[a.job_id] = []; grouped[a.job_id].push(a); });
      return grouped;
    },
    enabled: activeJobs.length > 0,
  });

  // Company-level contact-project links (shared projects)
  const { data: companyContactProjects = [] } = useQuery({
    queryKey: ['company-contact-projects', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_contact_projects')
        .select('*, jobs:job_id(id, title, status, location), client_contacts:contact_id(full_name, role_title)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch candidate profiles for selected job
  const { data: jobCandidates = [] } = useQuery({
    queryKey: ['client-job-candidates', selectedJobId],
    queryFn: async () => {
      if (!selectedJobId) return [];
      const { data, error } = await supabase
        .from('applications')
        .select('id, current_stage, created_at, candidate_id, match_score, status')
        .eq('job_id', selectedJobId);
      if (error) throw error;
      if (!data || data.length === 0) return [];
      const candidateIds = data.map(a => a.candidate_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url, phone, bio, linkedin_url, experience_years')
        .in('user_id', candidateIds);
      return data.map(a => ({ ...a, profile: (profiles || []).find(p => p.user_id === a.candidate_id) }));
    },
    enabled: !!selectedJobId,
  });

  // Placements
  const { data: placements = [] } = useQuery({
    queryKey: ['client-placements', companyId],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: jobs } = await supabase.from('jobs').select('id, title').eq('company_id', companyId);
      if (!jobs || jobs.length === 0) return [];
      const { data, error } = await supabase.from('applications').select('id, current_stage, created_at, job_id').in('job_id', jobs.map(j => j.id)).eq('current_stage', 'hired');
      if (error) throw error;
      return (data || []).map(a => ({ ...a, job: jobs.find(j => j.id === a.job_id) }));
    },
    enabled: !!user?.id,
  });

  // Mutations
  const addContactMutation = useMutation({
    mutationFn: async (contact: typeof newContact) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase.from('client_contacts').insert({ ...contact, company_id: companyId, recruiter_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-contacts', companyId] });
      setShowAddContact(false);
      setNewContact({ full_name: '', role_title: '', email: '', phone: '', linkedin_url: '' });
      toast.success(isRTL ? 'איש קשר נוסף' : 'Contact added');
    },
  });

  const addTaskMutation = useMutation({
    mutationFn: async (task: typeof newTask) => {
      if (!user?.id) throw new Error('Not authenticated');
      let dueDateTime: string | null = null;
      if (task.due_date) {
        dueDateTime = task.due_time ? `${task.due_date}T${task.due_time}:00` : `${task.due_date}T09:00:00`;
      }
      const { error } = await supabase.from('client_tasks').insert({ title: task.title, description: task.description, priority: task.priority, company_id: companyId, recruiter_id: user.id, due_date: dueDateTime });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-tasks', companyId] });
      setShowAddTask(false);
      setNewTask({ title: '', description: '', priority: 'medium', due_date: '', due_time: '' });
      toast.success(isRTL ? 'משימה נוספה' : 'Task added');
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from('client_tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['client-tasks', companyId] }),
  });

  const addToCalendarMutation = useMutation({
    mutationFn: async (task: any) => {
      if (!user?.id) throw new Error('Not authenticated');
      const dueDate = task.due_date ? new Date(task.due_date) : null;
      const { error } = await supabase.from('schedule_tasks' as any).insert({
        user_id: user.id,
        title: task.title,
        description: task.description || null,
        due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
        due_time: dueDate ? format(dueDate, 'HH:mm') : '09:00',
        priority: task.priority || 'medium',
        task_type: 'task',
        is_completed: false,
        source: 'crm_activity',
        source_table: 'client_tasks',
        related_job: company?.name || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'נוסף ליומן!' : 'Added to calendar!');
      queryClient.invalidateQueries({ queryKey: ['schedule-tasks'] });
    },
    onError: () => toast.error(isRTL ? 'שגיאה בהוספה ליומן' : 'Error adding to calendar'),
  });

  const addTimelineMutation = useMutation({
    mutationFn: async (event: typeof newEvent) => {
      if (!user?.id) throw new Error('Not authenticated');
      const eventDate = event.event_date || new Date().toISOString();
      const { error } = await supabase.from('client_timeline').insert({ event_type: event.event_type, title: event.title, description: event.description, event_date: eventDate, company_id: companyId, recruiter_id: user.id });
      if (error) throw error;
      await supabase.from('companies').update({ last_contact_at: new Date().toISOString() }).eq('id', companyId);
      if (event.event_type === 'meeting') {
        await supabase.from('client_tasks').insert({
          title: isRTL ? `פולואפ: ${event.title}` : `Follow up: ${event.title}`,
          description: isRTL ? 'נוצר אוטומטית לאחר רישום פגישה' : 'Auto-created after meeting log',
          company_id: companyId, recruiter_id: user.id, priority: 'high', source: 'automation',
          due_date: new Date(Date.now() + 3 * 86400000).toISOString(),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-timeline', companyId] });
      queryClient.invalidateQueries({ queryKey: ['client-company', companyId] });
      queryClient.invalidateQueries({ queryKey: ['client-tasks', companyId] });
      setShowAddTimeline(false);
      setNewEvent({ event_type: 'note', title: '', description: '', event_date: '' });
      toast.success(isRTL ? 'פעילות נוספה' : 'Activity added');
    },
  });

  // Add job for this company
  const addJobMutation = useMutation({
    mutationFn: async (job: typeof newJob) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase.from('jobs').insert({
        title: job.title, location: job.location, job_type: job.job_type, description: job.description,
        company_id: companyId, created_by: user.id, status: 'active',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-active-jobs', companyId] });
      setShowAddJob(false);
      setNewJob({ title: '', location: '', job_type: 'full_time', description: '' });
      toast.success(isRTL ? 'משרה נוספה' : 'Job added');
    },
  });

  // Forward job to client (add timeline entry + reminder)
  const forwardJobToClient = async (jobId: string) => {
    if (!user?.id) return;
    const job = activeJobs.find(j => j.id === jobId);
    if (!job) return;
    // Add timeline entry
    await supabase.from('client_timeline').insert({
      event_type: 'note', title: isRTL ? `משרה הועברה ללקוח: ${job.title}` : `Job forwarded to client: ${job.title}`,
      description: isRTL ? 'המשרה הועברה ללקוח לבדיקה' : 'Job forwarded to client for review',
      company_id: companyId, recruiter_id: user.id,
    });
    // Create reminder for follow-up
    const primaryContact = contacts.find(c => c.is_primary) || contacts[0];
    if (primaryContact) {
      await supabase.from('client_reminders').insert({
        title: isRTL ? `פולואפ: האם ${company?.name} בדקו את המשרה "${job.title}"?` : `Follow-up: Did ${company?.name} review "${job.title}"?`,
        remind_at: new Date(Date.now() + 2 * 86400000).toISOString(),
        reminder_type: 'both', contact_id: primaryContact.id, company_id: companyId, recruiter_id: user.id,
      });
    }
    queryClient.invalidateQueries({ queryKey: ['client-timeline', companyId] });
    toast.success(isRTL ? 'המשרה הועברה ונוצרה תזכורת' : 'Job forwarded & reminder created');
    setShowForwardJob(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    try {
      const path = `${user.id}/${companyId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('client-vault').upload(path, file);
      if (uploadError) throw uploadError;
      const { error: dbError } = await supabase.from('client_vault').insert({
        company_id: companyId, recruiter_id: user.id, file_name: file.name, file_path: path, file_type: file.type, file_size: file.size,
      });
      if (dbError) throw dbError;
      queryClient.invalidateQueries({ queryKey: ['client-vault', companyId] });
      toast.success(isRTL ? 'קובץ הועלה' : 'File uploaded');
    } catch { toast.error(isRTL ? 'שגיאה בהעלאה' : 'Upload error'); }
  };

  const handleMeetingPrep = async () => {
    setGeneratingBrief(true); setMeetingBrief(null); setShowMeetingPrep(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-meeting-prep', {
        body: {
          companyId, companyName: company?.name,
          timeline: timeline.slice(0, 10).map(e => ({ type: e.event_type, title: e.title, date: e.event_date })),
          activeJobs: activeJobs.map(j => ({ title: j.title, status: j.status, candidates: (jobApplications[j.id] || []).length })),
          placements: placements.length,
          pendingTasks: tasks.filter(t => t.status === 'pending').map(t => t.title),
        },
      });
      if (error) throw error;
      setMeetingBrief(data?.brief || (isRTL ? 'לא הצלחתי ליצור סיכום' : 'Could not generate brief'));
    } catch { setMeetingBrief(isRTL ? 'שגיאה ביצירת הסיכום. נסי שוב.' : 'Error generating brief. Please try again.'); }
    finally { setGeneratingBrief(false); }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="w-4 h-4 text-blue-500" />;
      case 'meeting': return <Calendar className="w-4 h-4 text-primary" />;
      case 'call': return <Phone className="w-4 h-4 text-amber-500" />;
      case 'placement': return <CheckCircle className="w-4 h-4 text-primary" />;
      case 'contract': return <FileText className="w-4 h-4 text-purple-500" />;
      default: return <MessageSquare className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const slaScore = company?.avg_hiring_speed_days ? Math.min(100, Math.max(0, 100 - (Number(company.avg_hiring_speed_days) - 14) * 5)) : null;
  const stages = ['applied', 'screening', 'interview', 'technical', 'offer', 'hired'];
  const stageLabels: Record<string, string> = isRTL
    ? { applied: 'הגשה', screening: 'סינון', interview: 'ראיון', technical: 'טכני', offer: 'הצעה', hired: 'נשכר' }
    : { applied: 'Applied', screening: 'Screen', interview: 'Interview', technical: 'Technical', offer: 'Offer', hired: 'Hired' };

  const tabItems = [
    { value: 'timeline', icon: Clock, label: isRTL ? 'ציר זמן' : 'Timeline' },
    { value: 'contacts', icon: Users, label: isRTL ? 'אנשי קשר' : 'Contacts', count: contacts.length },
    { value: 'projects', icon: Briefcase, label: isRTL ? 'פרויקטים' : 'Projects', count: activeJobs.length },
    { value: 'analytics', icon: BarChart3, label: isRTL ? 'אנליטיקס' : 'Analytics' },
    { value: 'tasks', icon: CheckCircle, label: isRTL ? 'משימות' : 'Tasks', count: tasks.filter(t => t.status === 'pending').length },
    { value: 'vault', icon: FolderOpen, label: isRTL ? 'כספת' : 'Vault' },
    { value: 'plug', icon: Sparkles, label: isRTL ? 'שאל את Plug' : 'Ask Plug' },
  ];

  // Group contact-project links by job for company-level view
  const projectStakeholders: Record<string, any[]> = {};
  companyContactProjects.forEach((cp: any) => {
    const jobId = cp.jobs?.id;
    if (jobId) {
      if (!projectStakeholders[jobId]) projectStakeholders[jobId] = [];
      projectStakeholders[jobId].push(cp);
    }
  });

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            {company?.logo_url ? <img src={company.logo_url} alt="" className="w-10 h-10 rounded-lg object-contain" /> : <Building2 className="w-7 h-7 text-primary" />}
          </div>
          <div className="min-w-0">
            <h2 className="text-2xl font-bold truncate">{company?.name || '...'}</h2>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {company?.industry && <span className="text-sm text-muted-foreground">{company.industry}</span>}
              {company?.lead_status && (
                <Badge className={company.lead_status === 'active' ? 'bg-primary/20 text-primary' : company.lead_status === 'cold' ? 'bg-muted text-muted-foreground' : ''}>
                  {company.lead_status === 'active' ? (isRTL ? 'פעיל' : 'Active') : company.lead_status === 'cold' ? (isRTL ? 'קר' : 'Cold') : (isRTL ? 'ליד' : 'Lead')}
                </Badge>
              )}
              {company?.website && (
                <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline" onClick={e => e.stopPropagation()}>
                  <ExternalLink className="w-3 h-3" />{(() => { try { return new URL(company.website).hostname; } catch { return company.website; } })()}
                </a>
              )}
            </div>
            {company?.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{company.description}</p>}
          </div>
        </div>
        <Button onClick={handleMeetingPrep} className="gap-2 shrink-0 bg-accent text-accent-foreground hover:bg-accent/90">
          <Presentation className="w-4 h-4" />{isRTL ? 'הכנה לפגישה' : 'Prep Meeting'}
        </Button>
      </div>

      {/* AI Summary */}
      {company?.ai_summary && (
        <Card className="plug-ai-highlight"><CardContent className="p-4 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-accent shrink-0 mt-0.5" />
          <div><p className="text-sm font-medium mb-1">{isRTL ? 'סיכום AI אחרון' : 'AI Last Status'}</p><p className="text-sm text-muted-foreground">{company.ai_summary}</p></div>
        </CardContent></Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { v: placements.length, l: isRTL ? 'גיוסים' : 'Placements', color: 'text-primary' },
          { v: activeJobs.filter(j => j.status === 'active').length, l: isRTL ? 'משרות פעילות' : 'Active Jobs', color: '' },
          { v: `₪${(Number(company?.historical_value) || 0).toLocaleString()}`, l: isRTL ? 'ערך היסטורי' : 'Historical Value', color: '' },
          { v: `₪${(Number(company?.estimated_revenue) || 0).toLocaleString()}`, l: isRTL ? 'הכנסה צפויה' : 'Est. Revenue', color: '' },
          { v: contacts.length, l: isRTL ? 'אנשי קשר' : 'Contacts', color: '' },
        ].map(s => (
          <Card key={s.l} className="bg-card"><CardContent className="p-3 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.v}</p>
            <p className="text-xs text-muted-foreground">{s.l}</p>
          </CardContent></Card>
        ))}
      </div>

      {/* SLA Gauge */}
      {slaScore !== null && (
        <Card className="bg-card"><CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium flex items-center gap-2"><Clock className="w-4 h-4" />{isRTL ? 'זמן תגובה (SLA)' : 'Response Time (SLA)'}</span>
            <span className="text-sm text-muted-foreground">{company?.avg_hiring_speed_days} {isRTL ? 'ימים' : 'days'}</span>
          </div>
          <Progress value={slaScore} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">{slaScore >= 70 ? (isRTL ? 'מצוין' : 'Excellent') : slaScore >= 40 ? (isRTL ? 'סביר' : 'Fair') : (isRTL ? 'דורש שיפור' : 'Needs improvement')}</p>
        </CardContent></Card>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="contacts" className="w-full">
        <TabsList className="w-full h-auto p-1.5 bg-muted/60 rounded-xl flex flex-wrap gap-1">
          {tabItems.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all flex-1 min-w-0">
              <tab.icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && <Badge variant="secondary" className="text-[9px] px-1 h-4">{tab.count}</Badge>}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Contacts Tab - CRM style with drill-down */}
        <TabsContent value="contacts" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{isRTL ? 'לחצו על איש קשר לניהול שיחות, פגישות ופרויקטים' : 'Click a contact to manage conversations, meetings & projects'}</p>
            <Dialog open={showAddContact} onOpenChange={setShowAddContact}>
              <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="w-4 h-4" />{isRTL ? 'הוסף' : 'Add Contact'}</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{isRTL ? 'איש קשר חדש' : 'New Contact'}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input value={newContact.full_name} onChange={(e) => setNewContact(p => ({ ...p, full_name: e.target.value }))} placeholder={isRTL ? 'שם מלא *' : 'Full Name *'} />
                  <Input value={newContact.role_title} onChange={(e) => setNewContact(p => ({ ...p, role_title: e.target.value }))} placeholder={isRTL ? 'תפקיד' : 'Role'} />
                  <Input value={newContact.email} onChange={(e) => setNewContact(p => ({ ...p, email: e.target.value }))} placeholder="Email" type="email" />
                  <Input value={newContact.phone} onChange={(e) => setNewContact(p => ({ ...p, phone: e.target.value }))} placeholder={isRTL ? 'טלפון' : 'Phone'} />
                  <Input value={newContact.linkedin_url} onChange={(e) => setNewContact(p => ({ ...p, linkedin_url: e.target.value }))} placeholder="LinkedIn URL" />
                  <Button onClick={() => addContactMutation.mutate(newContact)} disabled={!newContact.full_name.trim()} className="w-full">{isRTL ? 'הוסף' : 'Add'}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {contacts.length === 0 ? (
            <Card className="bg-card"><CardContent className="p-8 text-center text-muted-foreground">{isRTL ? 'אין אנשי קשר' : 'No contacts'}</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {contacts.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/40 hover:bg-muted/30 cursor-pointer transition-all group"
                  onClick={() => { setSelectedContact(c); setShowContactDetail(true); }}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{c.full_name}</p>
                      {c.is_primary && <Badge variant="secondary" className="text-[10px]">{isRTL ? 'ראשי' : 'Primary'}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{c.role_title || (isRTL ? 'ללא תפקיד' : 'No role')}</p>
                    <div className="flex gap-3 mt-1">
                      {c.email && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Mail className="w-3 h-3" />{c.email}</span>}
                      {c.phone && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Phone className="w-3 h-3" />{c.phone}</span>}
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors ${isRTL ? 'rotate-180' : ''}`} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Dialog open={showAddTimeline} onOpenChange={setShowAddTimeline}>
              <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="w-4 h-4" />{isRTL ? 'הוסף פעילות' : 'Add Activity'}</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{isRTL ? 'פעילות חדשה' : 'New Activity'}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Select value={newEvent.event_type} onValueChange={(v) => setNewEvent(p => ({ ...p, event_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">{isRTL ? '📧 אימייל' : '📧 Email'}</SelectItem>
                      <SelectItem value="meeting">{isRTL ? '📅 פגישה' : '📅 Meeting'}</SelectItem>
                      <SelectItem value="call">{isRTL ? '📞 שיחה' : '📞 Call'}</SelectItem>
                      <SelectItem value="note">{isRTL ? '📝 הערה' : '📝 Note'}</SelectItem>
                      <SelectItem value="contract">{isRTL ? '📄 חוזה' : '📄 Contract'}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input value={newEvent.title} onChange={(e) => setNewEvent(p => ({ ...p, title: e.target.value }))} placeholder={isRTL ? 'כותרת' : 'Title'} />
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">{isRTL ? 'תאריך ושעה' : 'Date & Time'}</label>
                    <Input type="datetime-local" value={newEvent.event_date} onChange={(e) => setNewEvent(p => ({ ...p, event_date: e.target.value }))} />
                  </div>
                  <Textarea value={newEvent.description} onChange={(e) => setNewEvent(p => ({ ...p, description: e.target.value }))} placeholder={isRTL ? 'תיאור' : 'Description'} rows={3} />
                  <Button onClick={() => addTimelineMutation.mutate(newEvent)} disabled={!newEvent.title.trim()} className="w-full">{isRTL ? 'הוסף' : 'Add'}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {timeline.length === 0 ? (
            <Card className="bg-card"><CardContent className="p-8 text-center text-muted-foreground">{isRTL ? 'אין פעילות עדיין' : 'No activity yet'}</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {timeline.map((event) => (
                <div key={event.id} className="flex gap-3 p-3 rounded-lg bg-card border border-border">
                  <div className="mt-1">{getEventIcon(event.event_type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{event.title}</p>
                    {event.description && <p className="text-xs text-muted-foreground mt-1">{event.description}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{format(new Date(event.event_date), 'dd/MM/yyyy HH:mm')}</p>
                  </div>
                  {event.event_type === 'meeting' && <Badge variant="outline" className="text-[10px] shrink-0 h-5">{isRTL ? '⚡ פולואפ אוטומטי' : '⚡ Auto follow-up'}</Badge>}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Projects Tab - shows all company projects + stakeholders */}
        <TabsContent value="projects" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{isRTL ? 'לחצו על משרה לצפייה במועמדים' : 'Click a job to view candidates'}</p>
            <Dialog open={showAddJob} onOpenChange={setShowAddJob}>
              <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="w-4 h-4" />{isRTL ? 'הוסף משרה' : 'Add Job'}</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{isRTL ? 'משרה חדשה' : 'New Job'}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input value={newJob.title} onChange={(e) => setNewJob(p => ({ ...p, title: e.target.value }))} placeholder={isRTL ? 'שם המשרה *' : 'Job Title *'} />
                  <Input value={newJob.location} onChange={(e) => setNewJob(p => ({ ...p, location: e.target.value }))} placeholder={isRTL ? 'מיקום' : 'Location'} />
                  <Select value={newJob.job_type} onValueChange={(v) => setNewJob(p => ({ ...p, job_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">{isRTL ? 'משרה מלאה' : 'Full Time'}</SelectItem>
                      <SelectItem value="part_time">{isRTL ? 'חצי משרה' : 'Part Time'}</SelectItem>
                      <SelectItem value="freelance">{isRTL ? 'פרילנס' : 'Freelance'}</SelectItem>
                      <SelectItem value="hybrid">{isRTL ? 'היברידי' : 'Hybrid'}</SelectItem>
                      <SelectItem value="remote">{isRTL ? 'מרחוק' : 'Remote'}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea value={newJob.description} onChange={(e) => setNewJob(p => ({ ...p, description: e.target.value }))} placeholder={isRTL ? 'תיאור המשרה' : 'Job Description'} rows={3} />
                  <Button onClick={() => addJobMutation.mutate(newJob)} disabled={!newJob.title.trim()} className="w-full">{isRTL ? 'הוסף משרה' : 'Add Job'}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {activeJobs.length === 0 ? (
            <Card className="bg-card"><CardContent className="p-8 text-center text-muted-foreground">{isRTL ? 'אין משרות' : 'No jobs'}</CardContent></Card>
          ) : (
            <div className="space-y-4">
              {activeJobs.map(job => {
                const apps = jobApplications[job.id] || [];
                const stageCounts: Record<string, number> = {};
                apps.forEach((a: any) => { stageCounts[a.current_stage || 'applied'] = (stageCounts[a.current_stage || 'applied'] || 0) + 1; });
                const stakeholders = projectStakeholders[job.id] || [];
                const isExpanded = selectedJobId === job.id;
                return (
                  <Card key={job.id} className={`bg-card border-border cursor-pointer transition-all ${isExpanded ? 'ring-2 ring-primary/30' : 'hover:border-primary/30'}`}>
                    <CardHeader className="pb-2" onClick={() => setSelectedJobId(isExpanded ? null : job.id)}>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2"><Briefcase className="w-4 h-4 text-primary" />{job.title}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={(e) => { e.stopPropagation(); forwardJobToClient(job.id); }}>
                            <Mail className="w-3 h-3" />{isRTL ? 'העבר ללקוח' : 'Forward'}
                          </Button>
                          <Badge variant={job.status === 'active' ? 'default' : 'secondary'}>{job.status}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        {job.location && <span>{job.location}</span>}
                        {job.job_type && <span>{job.job_type}</span>}
                        <span>{apps.length} {isRTL ? 'מועמדים' : 'candidates'}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Stage pipeline */}
                      <div className="grid grid-cols-6 gap-1">
                        {stages.map(stage => (
                          <div key={stage} className="text-center">
                            <div className={`h-8 rounded flex items-center justify-center text-sm font-bold ${(stageCounts[stage] || 0) > 0 ? 'bg-primary/15 text-primary' : 'bg-muted/50 text-muted-foreground'}`}>
                              {stageCounts[stage] || 0}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1 truncate">{stageLabels[stage]}</p>
                          </div>
                        ))}
                      </div>
                      {/* Stakeholders for this project */}
                      {stakeholders.length > 0 && (
                        <div className="pt-2 border-t border-border">
                          <p className="text-[10px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">{isRTL ? 'בעלי עניין' : 'Stakeholders'}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {stakeholders.map((s: any) => (
                              <Badge key={s.id} variant="outline" className="text-[10px] gap-1 cursor-pointer hover:bg-muted/50" onClick={(e) => {
                                e.stopPropagation();
                                const c = contacts.find(ct => ct.id === s.contact_id);
                                if (c) { setSelectedContact(c); setShowContactDetail(true); }
                              }}>
                                <User className="w-3 h-3" />
                                {s.client_contacts?.full_name}
                                {s.role_in_project && <span className="text-muted-foreground">· {s.role_in_project}</span>}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Candidate drill-down */}
                      {isExpanded && (
                        <div className="pt-3 border-t border-border space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{isRTL ? 'מועמדים' : 'Candidates'}</p>
                          {jobCandidates.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-3">{isRTL ? 'אין מועמדים למשרה זו' : 'No candidates for this job'}</p>
                          ) : jobCandidates.map((candidate: any) => (
                            <div key={candidate.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                                {candidate.profile?.avatar_url ? <img src={candidate.profile.avatar_url} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-primary" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold">{candidate.profile?.full_name || (isRTL ? 'אנונימי' : 'Anonymous')}</p>
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                  {candidate.profile?.email && <span className="flex items-center gap-0.5"><Mail className="w-3 h-3" />{candidate.profile.email}</span>}
                                  {candidate.profile?.experience_years && <span>{candidate.profile.experience_years} {isRTL ? 'שנות ניסיון' : 'yrs exp'}</span>}
                                </div>
                                {candidate.profile?.bio && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{candidate.profile.bio}</p>}
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <Badge variant={candidate.current_stage === 'hired' ? 'default' : 'outline'} className="text-[10px]">{stageLabels[candidate.current_stage || 'applied']}</Badge>
                                {candidate.match_score && <span className="text-[10px] text-primary font-bold">{candidate.match_score}%</span>}
                              </div>
                              {candidate.profile?.linkedin_url && (
                                <a href={candidate.profile.linkedin_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                  <Linkedin className="w-4 h-4 text-muted-foreground hover:text-primary" />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-card">
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" />{isRTL ? 'צינור הכנסות' : 'Revenue Pipeline'}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">{isRTL ? 'ערך היסטורי' : 'Historical'}</span><span className="font-bold text-primary">₪{(Number(company?.historical_value) || 0).toLocaleString()}</span></div>
                <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">{isRTL ? 'הכנסה צפויה' : 'Pipeline'}</span><span className="font-bold">₪{(Number(company?.estimated_revenue) || 0).toLocaleString()}</span></div>
                <Progress value={Number(company?.historical_value) && Number(company?.estimated_revenue) ? Math.min(100, (Number(company.historical_value) / (Number(company.historical_value) + Number(company.estimated_revenue))) * 100) : 0} className="h-2" />
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />{isRTL ? 'מהירות גיוס' : 'Hiring Velocity'}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">{isRTL ? 'זמן ממוצע' : 'Avg. Time'}</span><span className="font-bold">{company?.avg_hiring_speed_days || '—'} {isRTL ? 'ימים' : 'days'}</span></div>
                <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">{isRTL ? 'שיעור תגובה' : 'Response Rate'}</span><span className="font-bold">{company?.response_rate ? `${Number(company.response_rate)}%` : '—'}</span></div>
                <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">{isRTL ? 'סה"כ גיוסים' : 'Total Hires'}</span><span className="font-bold text-primary">{company?.total_hires || 0}</span></div>
              </CardContent>
            </Card>
          </div>
          <Card className="bg-muted/30 border-dashed"><CardContent className="p-6 text-center">
            <Target className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">{isRTL ? 'השוואת שוק' : 'Market Benchmark'}</p>
            <p className="text-sm text-muted-foreground mt-1">{isRTL ? 'בקרוב' : 'Coming soon'}</p>
          </CardContent></Card>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
              <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="w-4 h-4" />{isRTL ? 'משימה חדשה' : 'New Task'}</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{isRTL ? 'משימה חדשה' : 'New Task'}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input value={newTask.title} onChange={(e) => setNewTask(p => ({ ...p, title: e.target.value }))} placeholder={isRTL ? 'כותרת *' : 'Title *'} />
                  <Textarea value={newTask.description} onChange={(e) => setNewTask(p => ({ ...p, description: e.target.value }))} placeholder={isRTL ? 'תיאור' : 'Description'} rows={2} />
                  <Select value={newTask.priority} onValueChange={(v) => setNewTask(p => ({ ...p, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{isRTL ? 'נמוך' : 'Low'}</SelectItem>
                      <SelectItem value="medium">{isRTL ? 'בינוני' : 'Medium'}</SelectItem>
                      <SelectItem value="high">{isRTL ? 'גבוה' : 'High'}</SelectItem>
                      <SelectItem value="urgent">{isRTL ? 'דחוף' : 'Urgent'}</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">{isRTL ? 'תאריך' : 'Date'}</label>
                      <Input type="date" value={newTask.due_date} onChange={(e) => setNewTask(p => ({ ...p, due_date: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">{isRTL ? 'שעה' : 'Time'}</label>
                      <Input type="time" value={newTask.due_time} onChange={(e) => setNewTask(p => ({ ...p, due_time: e.target.value }))} />
                    </div>
                  </div>
                  <Button onClick={() => addTaskMutation.mutate(newTask)} disabled={!newTask.title.trim()} className="w-full">{isRTL ? 'הוסף' : 'Add'}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {tasks.length === 0 ? (
            <Card className="bg-card"><CardContent className="p-8 text-center text-muted-foreground">{isRTL ? 'אין משימות' : 'No tasks'}</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div key={task.id} className={`flex items-center gap-3 p-3 rounded-lg border ${task.status === 'completed' ? 'bg-muted/30 opacity-60' : 'bg-card'}`}>
                  <Button variant="ghost" size="icon" className="shrink-0" onClick={() => completeTaskMutation.mutate(task.id)} disabled={task.status === 'completed'}>
                    <CheckCircle className={`w-5 h-5 ${task.status === 'completed' ? 'text-primary' : 'text-muted-foreground'}`} />
                  </Button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through' : ''}`}>{task.title}</p>
                    {task.due_date && <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{format(new Date(task.due_date), 'dd/MM/yyyy HH:mm')}</p>}
                  </div>
                  <Badge variant={task.priority === 'urgent' ? 'destructive' : task.priority === 'high' ? 'default' : 'secondary'} className="text-xs shrink-0">{task.priority}</Badge>
                  {(task.source === 'ai_suggested' || task.source === 'automation') && <Sparkles className="w-3.5 h-3.5 text-accent shrink-0" />}
                  <Button
                    variant="ghost" size="sm"
                    className="h-7 px-2 text-[10px] gap-1 text-muted-foreground hover:text-primary shrink-0"
                    title={isRTL ? 'הוסף ליומן' : 'Add to Calendar'}
                    onClick={() => addToCalendarMutation.mutate(task)}
                    disabled={addToCalendarMutation.isPending}
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Vault Tab */}
        <TabsContent value="vault" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <label>
              <Button size="sm" className="gap-2" asChild><span><Upload className="w-4 h-4" />{isRTL ? 'העלה קובץ' : 'Upload File'}</span></Button>
              <input type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx" onChange={handleFileUpload} />
            </label>
          </div>
          {vaultFiles.length === 0 ? (
            <Card className="bg-card"><CardContent className="p-8 text-center text-muted-foreground">{isRTL ? 'אין קבצים' : 'No files'}</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {vaultFiles.map((file) => (
                <div key={file.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border">
                  <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.file_name}</p>
                    <p className="text-xs text-muted-foreground">{file.file_size ? `${(file.file_size / 1024).toFixed(0)} KB` : ''} · {format(new Date(file.created_at), 'dd/MM/yyyy')}</p>
                  </div>
                  {file.category && <Badge variant="outline" className="text-xs shrink-0">{file.category}</Badge>}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Plug AI Tab */}
        <TabsContent value="plug" className="space-y-4 mt-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-4 h-4 text-accent" />{isRTL ? `שוחח עם Plug על ${company?.name || 'הלקוח'}` : `Chat with Plug about ${company?.name || 'this client'}`}</CardTitle>
              <p className="text-xs text-muted-foreground">{isRTL ? 'Plug מכיר את כל הנתונים על הלקוח' : 'Plug knows all client data'}</p>
            </CardHeader>
            <CardContent>
              <ClientPlugChat companyId={companyId} companyName={company?.name || ''} companyData={{
                industry: company?.industry, lead_status: company?.lead_status,
                historical_value: Number(company?.historical_value) || 0, total_hires: company?.total_hires,
                avg_hiring_speed_days: company?.avg_hiring_speed_days ? Number(company.avg_hiring_speed_days) : null,
              }} activeJobsCount={activeJobs.length} contactsCount={contacts.length} pendingTasksCount={tasks.filter(t => t.status === 'pending').length} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Contact Detail Sheet */}
      <ContactDetailSheet
        contact={selectedContact}
        companyId={companyId}
        companyName={company?.name || ''}
        open={showContactDetail}
        onOpenChange={setShowContactDetail}
      />

      {/* Meeting Prep Dialog */}
      <Dialog open={showMeetingPrep} onOpenChange={setShowMeetingPrep}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Presentation className="w-5 h-5 text-accent" />{isRTL ? 'תדריך הכנה לפגישה' : 'Meeting Prep Brief'}</DialogTitle>
          </DialogHeader>
          {generatingBrief ? (
            <div className="p-8 text-center space-y-3"><Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" /><p className="text-sm text-muted-foreground">{isRTL ? 'Plug AI מכין תדריך...' : 'Plug AI generating brief...'}</p></div>
          ) : meetingBrief ? (
            <div className="prose prose-sm max-w-none dark:prose-invert"><div className="whitespace-pre-wrap text-sm leading-relaxed">{meetingBrief}</div></div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
