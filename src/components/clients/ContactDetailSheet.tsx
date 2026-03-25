import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Mail, Phone, Linkedin, Calendar, MessageSquare, Briefcase, Plus, Clock,
  CheckCircle, Video, MapPin, User, Bell, Trash2, AlertCircle, CalendarPlus, ChevronDown, UserPlus, X, Send
} from 'lucide-react';
import { format, addDays } from 'date-fns';

interface Contact {
  id: string;
  full_name: string;
  role_title: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  is_primary: boolean | null;
  notes: string | null;
}

interface ContactDetailSheetProps {
  contact: Contact | null;
  companyId: string;
  companyName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactDetailSheet({ contact, companyId, companyName, open, onOpenChange }: ContactDetailSheetProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const queryClient = useQueryClient();

  const [showAddActivity, setShowAddActivity] = useState(false);
  const [showLinkProject, setShowLinkProject] = useState(false);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [newEvent, setNewEvent] = useState({ event_type: 'call', title: '', description: '', event_date: '', location: '', meeting_link: '' });
  const [newReminder, setNewReminder] = useState({ title: '', description: '', remind_at: '', reminder_type: 'both' });

  // External attendees for meeting invitations
  const [externalAttendees, setExternalAttendees] = useState<{ name: string; email: string }[]>([]);
  const [newAttendee, setNewAttendee] = useState({ name: '', email: '' });
  const [sendingInvites, setSendingInvites] = useState(false);

  // "Create task from activity" inline mini-form
  const [lastAddedActivity, setLastAddedActivity] = useState<{ id: string; title: string; type: string } | null>(null);
  const [showCreateTaskFromActivity, setShowCreateTaskFromActivity] = useState(false);
  const [taskFromActivity, setTaskFromActivity] = useState({
    title: '',
    due_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    due_time: '09:00',
    priority: 'high',
  });

  // Fetch contact's conversations & meetings from timeline
  const { data: contactTimeline = [] } = useQuery({
    queryKey: ['contact-timeline', contact?.id],
    queryFn: async () => {
      if (!contact?.id) return [];
      const { data, error } = await supabase
        .from('client_timeline')
        .select('*')
        .eq('contact_id', contact.id)
        .order('event_date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!contact?.id,
  });

  // Fetch contact's linked projects
  const { data: contactProjects = [] } = useQuery({
    queryKey: ['contact-projects', contact?.id],
    queryFn: async () => {
      if (!contact?.id) return [];
      const { data, error } = await supabase
        .from('client_contact_projects')
        .select('*, jobs:job_id(id, title, status, location, job_type)')
        .eq('contact_id', contact.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!contact?.id,
  });

  // Fetch contact's reminders
  const { data: reminders = [] } = useQuery({
    queryKey: ['contact-reminders', contact?.id],
    queryFn: async () => {
      if (!contact?.id) return [];
      const { data, error } = await supabase
        .from('client_reminders')
        .select('*')
        .eq('contact_id', contact.id)
        .order('remind_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!contact?.id,
  });

  // Available jobs for linking
  const { data: availableJobs = [] } = useQuery({
    queryKey: ['available-jobs-for-contact', companyId, contact?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, status')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const linkedIds = contactProjects.map((cp: any) => cp.job_id);
      return (data || []).filter(j => !linkedIds.includes(j.id));
    },
    enabled: !!contact?.id && showLinkProject,
  });

  // "Create task from activity" mutation
  const createTaskFromActivityMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !lastAddedActivity) throw new Error('Missing data');
      const { error } = await supabase.from('schedule_tasks' as any).insert({
        user_id: user.id,
        title: taskFromActivity.title,
        due_date: taskFromActivity.due_date,
        due_time: taskFromActivity.due_time,
        priority: taskFromActivity.priority,
        task_type: lastAddedActivity.type === 'meeting' ? 'meeting' : 'followup',
        is_completed: false,
        source: 'crm_activity',
        source_id: lastAddedActivity.id,
        source_table: 'client_timeline',
        external_attendees: contact?.email ? [{ name: contact.full_name, email: contact.email }] : [],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'משימה נוצרה ביומן!' : 'Task added to calendar!');
      setShowCreateTaskFromActivity(false);
      setLastAddedActivity(null);
      queryClient.invalidateQueries({ queryKey: ['schedule-tasks'] });
    },
  });

  // Add activity for this contact
  const addActivityMutation = useMutation({
    mutationFn: async (event: typeof newEvent) => {
      if (!user?.id || !contact?.id) throw new Error('Missing data');
      const eventDate = event.event_date || new Date().toISOString();
      const { data: inserted, error } = await supabase.from('client_timeline').insert({
        event_type: event.event_type, title: event.title, description: event.description, event_date: eventDate,
        company_id: companyId, recruiter_id: user.id, contact_id: contact.id,
      }).select('id').single();
      if (error) throw error;
      await supabase.from('companies').update({ last_contact_at: new Date().toISOString() }).eq('id', companyId);
      if (event.event_type === 'meeting') {
        await supabase.from('client_tasks').insert({
          title: isRTL ? `פולואפ: ${event.title}` : `Follow up: ${event.title}`,
          description: isRTL ? `נוצר אוטומטית עבור ${contact.full_name}` : `Auto-created for ${contact.full_name}`,
          company_id: companyId, recruiter_id: user.id, priority: 'high', source: 'automation',
          due_date: new Date(Date.now() + 3 * 86400000).toISOString(),
        });
      }
      return { id: inserted?.id, title: event.title, type: event.event_type };
    },
    onSuccess: (returned) => {
      queryClient.invalidateQueries({ queryKey: ['contact-timeline', contact?.id] });
      queryClient.invalidateQueries({ queryKey: ['client-timeline', companyId] });
      queryClient.invalidateQueries({ queryKey: ['client-tasks', companyId] });
      setShowAddActivity(false);
      setNewEvent({ event_type: 'call', title: '', description: '', event_date: '', location: '', meeting_link: '' });
      setExternalAttendees([]);
      toast.success(isRTL ? 'פעילות נוספה' : 'Activity added');
      // Show "create task from activity" CTA
      if (returned?.id) {
        setLastAddedActivity(returned);
        setTaskFromActivity({
          title: isRTL ? `פולואפ: ${returned.title}` : `Follow up: ${returned.title}`,
          due_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
          due_time: '09:00',
          priority: returned.type === 'meeting' ? 'high' : 'medium',
        });
        setShowCreateTaskFromActivity(true);
      }
    },
  });

  // Link a project to this contact
  const linkProjectMutation = useMutation({
    mutationFn: async (jobId: string) => {
      if (!user?.id || !contact?.id) throw new Error('Missing data');
      const { error } = await supabase.from('client_contact_projects').insert({
        contact_id: contact.id, job_id: jobId, company_id: companyId, recruiter_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-projects', contact?.id] });
      queryClient.invalidateQueries({ queryKey: ['company-contact-projects', companyId] });
      setShowLinkProject(false);
      toast.success(isRTL ? 'פרויקט קושר' : 'Project linked');
    },
  });

  // Add reminder
  const addReminderMutation = useMutation({
    mutationFn: async (reminder: typeof newReminder) => {
      if (!user?.id || !contact?.id) throw new Error('Missing data');
      const { error } = await supabase.from('client_reminders').insert({
        title: reminder.title,
        description: reminder.description || null,
        remind_at: reminder.remind_at,
        reminder_type: reminder.reminder_type,
        contact_id: contact.id,
        company_id: companyId,
        recruiter_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-reminders', contact?.id] });
      setShowAddReminder(false);
      setNewReminder({ title: '', description: '', remind_at: '', reminder_type: 'both' });
      toast.success(isRTL ? 'תזכורת נוספה' : 'Reminder added');
    },
  });

  // Dismiss reminder
  const dismissReminderMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      const { error } = await supabase.from('client_reminders').update({ status: 'dismissed' }).eq('id', reminderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-reminders', contact?.id] });
      toast.success(isRTL ? 'תזכורת בוטלה' : 'Reminder dismissed');
    },
  });

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="w-4 h-4 text-blue-500" />;
      case 'meeting': return <Calendar className="w-4 h-4 text-primary" />;
      case 'call': return <Phone className="w-4 h-4 text-amber-500" />;
      case 'video_call': return <Video className="w-4 h-4 text-purple-500" />;
      default: return <MessageSquare className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getReminderTypeLabel = (type: string) => {
    if (isRTL) {
      return type === 'email' ? '📧 מייל' : type === 'in_app' ? '🔔 מערכת' : '📧🔔 שניהם';
    }
    return type === 'email' ? '📧 Email' : type === 'in_app' ? '🔔 In-App' : '📧🔔 Both';
  };

  const conversations = contactTimeline.filter(e => ['call', 'email', 'video_call', 'note'].includes(e.event_type));
  const meetings = contactTimeline.filter(e => e.event_type === 'meeting');
  const pendingReminders = reminders.filter(r => r.status === 'pending');
  const pastReminders = reminders.filter(r => r.status !== 'pending');

  if (!contact) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={isRTL ? 'left' : 'right'} className="w-full sm:max-w-lg overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
        <SheetHeader className="mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-lg">{contact.full_name}</SheetTitle>
              <p className="text-sm text-muted-foreground">{contact.role_title || companyName}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
                <Mail className="w-3 h-3" />{contact.email}
              </a>
            )}
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
                <Phone className="w-3 h-3" />{contact.phone}
              </a>
            )}
            {contact.linkedin_url && (
              <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                <Linkedin className="w-3 h-3" />LinkedIn
              </a>
            )}
            {contact.is_primary && <Badge variant="secondary" className="text-[10px]">{isRTL ? 'איש קשר ראשי' : 'Primary Contact'}</Badge>}
          </div>
        </SheetHeader>

        <Tabs defaultValue="conversations" className="w-full">
          <TabsList className="w-full h-10 p-1 bg-muted/60 rounded-lg gap-0.5">
            <TabsTrigger value="conversations" className="flex-1 gap-1 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md">
              <MessageSquare className="w-3.5 h-3.5" />
              {isRTL ? 'שיחות' : 'Chats'}
              {conversations.length > 0 && <Badge variant="secondary" className="text-[9px] px-1 h-4 ml-1">{conversations.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="meetings" className="flex-1 gap-1 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md">
              <Calendar className="w-3.5 h-3.5" />
              {isRTL ? 'פגישות' : 'Meets'}
              {meetings.length > 0 && <Badge variant="secondary" className="text-[9px] px-1 h-4 ml-1">{meetings.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex-1 gap-1 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md">
              <Briefcase className="w-3.5 h-3.5" />
              {isRTL ? 'פרויקטים' : 'Projects'}
              {contactProjects.length > 0 && <Badge variant="secondary" className="text-[9px] px-1 h-4 ml-1">{contactProjects.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="reminders" className="flex-1 gap-1 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md">
              <Bell className="w-3.5 h-3.5" />
              {isRTL ? 'תזכורות' : 'Remind'}
              {pendingReminders.length > 0 && <Badge variant="destructive" className="text-[9px] px-1 h-4 ml-1">{pendingReminders.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* Conversations Tab */}
          <TabsContent value="conversations" className="space-y-3 mt-3">
            <Button size="sm" className="gap-1.5 w-full" variant="outline" onClick={() => { setNewEvent({ event_type: 'call', title: '', description: '', event_date: '', location: '', meeting_link: '' }); setExternalAttendees([]); setShowAddActivity(true); }}>
              <Plus className="w-3.5 h-3.5" />{isRTL ? 'הוסף שיחה' : 'Log Conversation'}
            </Button>
            {conversations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{isRTL ? 'אין שיחות מתועדות' : 'No conversations logged'}</p>
            ) : conversations.map(event => (
              <div key={event.id} className="flex gap-3 p-3 rounded-lg bg-card border border-border">
                <div className="mt-0.5">{getEventIcon(event.event_type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{event.title}</p>
                    <Badge variant="outline" className="text-[10px] h-4">{event.event_type}</Badge>
                  </div>
                  {event.description && <p className="text-xs text-muted-foreground mt-1">{event.description}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />{format(new Date(event.event_date), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
              </div>
            ))}
          </TabsContent>

          {/* Meetings Tab */}
          <TabsContent value="meetings" className="space-y-3 mt-3">
            <Button size="sm" className="gap-1.5 w-full" variant="outline" onClick={() => { setNewEvent({ event_type: 'meeting', title: '', description: '', event_date: '', location: '', meeting_link: '' }); setExternalAttendees([]); setShowAddActivity(true); }}>
              <Plus className="w-3.5 h-3.5" />{isRTL ? 'הוסף פגישה' : 'Log Meeting'}
            </Button>
            {meetings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{isRTL ? 'אין פגישות מתועדות' : 'No meetings logged'}</p>
            ) : meetings.map(event => (
              <div key={event.id} className="flex gap-3 p-3 rounded-lg bg-card border border-border">
                <div className="mt-0.5"><Calendar className="w-4 h-4 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{event.title}</p>
                  {event.description && <p className="text-xs text-muted-foreground mt-1">{event.description}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />{format(new Date(event.event_date), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] h-5 shrink-0">
                  {isRTL ? '⚡ פולואפ' : '⚡ Follow-up'}
                </Badge>
              </div>
            ))}
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-3 mt-3">
            <Dialog open={showLinkProject} onOpenChange={setShowLinkProject}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5 w-full" variant="outline">
                  <Plus className="w-3.5 h-3.5" />{isRTL ? 'קשר פרויקט' : 'Link Project'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{isRTL ? 'קשר פרויקט לאיש קשר' : 'Link Project to Contact'}</DialogTitle></DialogHeader>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {availableJobs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">{isRTL ? 'אין פרויקטים זמינים' : 'No available projects'}</p>
                  ) : availableJobs.map(job => (
                    <div key={job.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 cursor-pointer" onClick={() => linkProjectMutation.mutate(job.id)}>
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">{job.title}</span>
                      </div>
                      <Badge variant={job.status === 'active' ? 'default' : 'secondary'} className="text-xs">{job.status}</Badge>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
            {contactProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{isRTL ? 'אין פרויקטים מקושרים' : 'No linked projects'}</p>
            ) : contactProjects.map((cp: any) => (
              <Card key={cp.id} className="bg-card">
                <CardContent className="p-3 flex items-center gap-3">
                  <Briefcase className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{cp.jobs?.title || 'Unknown'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {cp.jobs?.location && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><MapPin className="w-3 h-3" />{cp.jobs.location}</span>}
                      {cp.role_in_project && <Badge variant="outline" className="text-[9px] h-4">{cp.role_in_project}</Badge>}
                    </div>
                  </div>
                  <Badge variant={cp.jobs?.status === 'active' ? 'default' : 'secondary'} className="text-xs shrink-0">{cp.jobs?.status}</Badge>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Reminders Tab */}
          <TabsContent value="reminders" className="space-y-3 mt-3">
            <Button size="sm" className="gap-1.5 w-full" variant="outline" onClick={() => setShowAddReminder(true)}>
              <Plus className="w-3.5 h-3.5" />{isRTL ? 'הוסף תזכורת' : 'Add Reminder'}
            </Button>

            {/* Pending Reminders */}
            {pendingReminders.length === 0 && pastReminders.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">{isRTL ? 'אין תזכורות' : 'No reminders'}</p>
            )}

            {pendingReminders.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{isRTL ? 'תזכורות פעילות' : 'Active Reminders'}</p>
                {pendingReminders.map(r => {
                  const isOverdue = new Date(r.remind_at) < new Date();
                  return (
                    <div key={r.id} className={`flex gap-3 p-3 rounded-lg border ${isOverdue ? 'bg-destructive/5 border-destructive/30' : 'bg-card border-border'}`}>
                      <div className="mt-0.5">
                        {isOverdue ? <AlertCircle className="w-4 h-4 text-destructive" /> : <Bell className="w-4 h-4 text-primary" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{r.title}</p>
                          {isOverdue && <Badge variant="destructive" className="text-[9px] h-4">{isRTL ? 'איחור' : 'Overdue'}</Badge>}
                        </div>
                        {r.description && <p className="text-xs text-muted-foreground mt-1">{r.description}</p>}
                        <div className="flex items-center gap-3 mt-1.5">
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />{format(new Date(r.remind_at), 'dd/MM/yyyy HH:mm')}
                          </p>
                          <Badge variant="outline" className="text-[9px] h-4">{getReminderTypeLabel(r.reminder_type)}</Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => dismissReminderMutation.mutate(r.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Past/Dismissed Reminders */}
            {pastReminders.length > 0 && (
              <div className="space-y-2 mt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{isRTL ? 'היסטוריה' : 'History'}</p>
                {pastReminders.slice(0, 5).map(r => (
                  <div key={r.id} className="flex gap-3 p-3 rounded-lg bg-muted/30 border border-border opacity-60">
                    <div className="mt-0.5">
                      {r.status === 'sent' ? <CheckCircle className="w-4 h-4 text-primary" /> : <Bell className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-through">{r.title}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />{format(new Date(r.remind_at), 'dd/MM/yyyy HH:mm')}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[9px] h-4 shrink-0">{r.status === 'sent' ? (isRTL ? 'נשלח' : 'Sent') : (isRTL ? 'בוטל' : 'Dismissed')}</Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Add Activity Dialog */}
        <Dialog open={showAddActivity} onOpenChange={(open) => { setShowAddActivity(open); if (!open) setExternalAttendees([]); }}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{isRTL ? 'פעילות חדשה' : 'New Activity'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Select value={newEvent.event_type} onValueChange={(v) => setNewEvent(p => ({ ...p, event_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">{isRTL ? '📞 שיחה' : '📞 Call'}</SelectItem>
                  <SelectItem value="email">{isRTL ? '📧 אימייל' : '📧 Email'}</SelectItem>
                  <SelectItem value="meeting">{isRTL ? '📅 פגישה' : '📅 Meeting'}</SelectItem>
                  <SelectItem value="video_call">{isRTL ? '📹 שיחת וידאו' : '📹 Video Call'}</SelectItem>
                  <SelectItem value="note">{isRTL ? '📝 הערה' : '📝 Note'}</SelectItem>
                </SelectContent>
              </Select>
              <Input value={newEvent.title} onChange={(e) => setNewEvent(p => ({ ...p, title: e.target.value }))} placeholder={isRTL ? 'כותרת' : 'Title'} />
              <div>
                <label className="text-sm font-medium mb-1.5 block">{isRTL ? 'תאריך ושעה' : 'Date & Time'}</label>
                <Input type="datetime-local" value={newEvent.event_date} onChange={(e) => setNewEvent(p => ({ ...p, event_date: e.target.value }))} />
              </div>
              <Textarea value={newEvent.description} onChange={(e) => setNewEvent(p => ({ ...p, description: e.target.value }))} placeholder={isRTL ? 'סיכום / תיאור' : 'Summary / Description'} rows={3} />

              {/* Meeting-specific fields */}
              {(newEvent.event_type === 'meeting' || newEvent.event_type === 'video_call') && (
                <>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                      {isRTL ? 'מיקום' : 'Location'}
                    </label>
                    <Input
                      value={newEvent.location}
                      onChange={(e) => setNewEvent(p => ({ ...p, location: e.target.value }))}
                      placeholder={isRTL ? 'כתובת / שם המקום' : 'Address or place name'}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-muted-foreground" />
                      {isRTL ? 'לינק לפגישה' : 'Meeting Link'}
                    </label>
                    <Input
                      value={newEvent.meeting_link}
                      onChange={(e) => setNewEvent(p => ({ ...p, meeting_link: e.target.value }))}
                      placeholder="https://meet.google.com/..."
                      type="url"
                    />
                  </div>

                  {/* External attendees */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <UserPlus className="w-3.5 h-3.5 text-muted-foreground" />
                      {isRTL ? 'משתתפים חיצוניים' : 'External Attendees'}
                    </label>

                    {externalAttendees.length > 0 && (
                      <div className="space-y-1.5">
                        {externalAttendees.map((att, i) => (
                          <div key={i} className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
                            <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="text-sm font-medium flex-1 truncate">{att.name}</span>
                            <span className="text-xs text-muted-foreground truncate">{att.email}</span>
                            <button
                              onClick={() => setExternalAttendees(prev => prev.filter((_, idx) => idx !== i))}
                              className="text-muted-foreground hover:text-destructive shrink-0"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Input
                        value={newAttendee.name}
                        onChange={(e) => setNewAttendee(p => ({ ...p, name: e.target.value }))}
                        placeholder={isRTL ? 'שם' : 'Name'}
                        className="h-8 text-sm"
                      />
                      <Input
                        value={newAttendee.email}
                        onChange={(e) => setNewAttendee(p => ({ ...p, email: e.target.value }))}
                        placeholder={isRTL ? 'מייל' : 'Email'}
                        type="email"
                        className="h-8 text-sm"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 shrink-0"
                        disabled={!newAttendee.name.trim() || !newAttendee.email.includes('@')}
                        onClick={() => {
                          setExternalAttendees(prev => [...prev, { ...newAttendee }]);
                          setNewAttendee({ name: '', email: '' });
                        }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {contact?.email && externalAttendees.length === 0 && (
                      <button
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                        onClick={() => setExternalAttendees([{ name: contact.full_name, email: contact.email! }])}
                      >
                        <Plus className="w-3 h-3" />
                        {isRTL ? `הוסף את ${contact.full_name}` : `Add ${contact.full_name}`}
                      </button>
                    )}

                    {externalAttendees.length > 0 && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Send className="w-3 h-3" />
                        {isRTL ? 'הזמנה תישלח במייל לכל המשתתפים' : 'Invitation will be emailed to all attendees'}
                      </p>
                    )}
                  </div>
                </>
              )}

              <Button
                onClick={async () => {
                  // Capture attendees and event data before mutation clears state
                  const attendeesToInvite = [...externalAttendees];
                  const eventData = { ...newEvent };
                  try {
                    await addActivityMutation.mutateAsync(eventData);
                    // onSuccess already closes dialog & clears state. Send invites after.
                    if (attendeesToInvite.length > 0 && user) {
                      setSendingInvites(true);
                      try {
                        await supabase.functions.invoke('send-meeting-invite', {
                          body: {
                            title: eventData.title,
                            description: eventData.description,
                            event_date: eventData.event_date || new Date().toISOString(),
                            location: eventData.location || undefined,
                            meeting_link: eventData.meeting_link || undefined,
                            organizer_name: user.email || 'Recruiter',
                            company_name: companyName,
                            external_attendees: attendeesToInvite,
                          },
                        });
                        toast.success(isRTL ? `✉️ הזמנות נשלחו ל-${attendeesToInvite.length} משתתפים` : `✉️ Invitations sent to ${attendeesToInvite.length} attendees`);
                      } catch (e) {
                        console.error('Failed to send invites:', e);
                        toast.error(isRTL ? 'שגיאה בשליחת הזמנות' : 'Failed to send invitations');
                      } finally {
                        setSendingInvites(false);
                      }
                    }
                  } catch (e) {
                    // mutation error handled by mutation itself
                  }
                }}
                disabled={!newEvent.title.trim() || addActivityMutation.isPending || sendingInvites}
                className="w-full gap-2"
              >
                {sendingInvites
                  ? (isRTL ? 'שולח הזמנות...' : 'Sending invitations...')
                  : externalAttendees.length > 0
                    ? (isRTL ? `הוסף ושלח ${externalAttendees.length} הזמנות` : `Add & Send ${externalAttendees.length} Invites`)
                    : (isRTL ? 'הוסף' : 'Add')
                }
                {externalAttendees.length > 0 && <Send className="w-3.5 h-3.5" />}
              </Button>

            </div>
          </DialogContent>
        </Dialog>


        {/* Add Reminder Dialog */}
        <Dialog open={showAddReminder} onOpenChange={setShowAddReminder}>
          <DialogContent>
            <DialogHeader><DialogTitle>{isRTL ? 'תזכורת חדשה' : 'New Reminder'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input
                value={newReminder.title}
                onChange={(e) => setNewReminder(p => ({ ...p, title: e.target.value }))}
                placeholder={isRTL ? 'על מה להזכיר? *' : 'What to remind about? *'}
              />
              <Textarea
                value={newReminder.description}
                onChange={(e) => setNewReminder(p => ({ ...p, description: e.target.value }))}
                placeholder={isRTL ? 'פרטים נוספים (אופציונלי)' : 'Additional details (optional)'}
                rows={2}
              />
              <div>
                <label className="text-sm font-medium mb-1.5 block">{isRTL ? 'תאריך ושעה' : 'Date & Time'}</label>
                <Input
                  type="datetime-local"
                  value={newReminder.remind_at}
                  onChange={(e) => setNewReminder(p => ({ ...p, remind_at: e.target.value }))}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">{isRTL ? 'סוג התראה' : 'Notification Type'}</label>
                <Select value={newReminder.reminder_type} onValueChange={(v) => setNewReminder(p => ({ ...p, reminder_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">{isRTL ? '📧🔔 מייל + מערכת' : '📧🔔 Email + In-App'}</SelectItem>
                    <SelectItem value="email">{isRTL ? '📧 מייל בלבד' : '📧 Email Only'}</SelectItem>
                    <SelectItem value="in_app">{isRTL ? '🔔 מערכת בלבד' : '🔔 In-App Only'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => addReminderMutation.mutate(newReminder)}
                disabled={!newReminder.title.trim() || !newReminder.remind_at}
                className="w-full gap-2"
              >
                <Bell className="w-4 h-4" />
                {isRTL ? 'צור תזכורת' : 'Create Reminder'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* "Create Task from Activity" inline CTA */}
        {showCreateTaskFromActivity && lastAddedActivity && (
          <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 bg-card border border-primary/40 rounded-xl shadow-xl p-4 space-y-3" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <CalendarPlus className="w-4 h-4 text-primary shrink-0" />
                <p className="text-sm font-semibold">{isRTL ? '✅ פעילות נוספה — צור משימה?' : '✅ Activity logged — Create a task?'}</p>
              </div>
              <button onClick={() => { setShowCreateTaskFromActivity(false); setLastAddedActivity(null); }} className="text-muted-foreground hover:text-foreground shrink-0">
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              <Input
                value={taskFromActivity.title}
                onChange={(e) => setTaskFromActivity(p => ({ ...p, title: e.target.value }))}
                placeholder={isRTL ? 'כותרת המשימה...' : 'Task title...'}
                className="h-8 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={taskFromActivity.due_date} onChange={(e) => setTaskFromActivity(p => ({ ...p, due_date: e.target.value }))} className="h-8 text-xs" />
                <Input type="time" value={taskFromActivity.due_time} onChange={(e) => setTaskFromActivity(p => ({ ...p, due_time: e.target.value }))} className="h-8 text-xs" />
              </div>
              <Select value={taskFromActivity.priority} onValueChange={(v) => setTaskFromActivity(p => ({ ...p, priority: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{isRTL ? 'נמוכה' : 'Low'}</SelectItem>
                  <SelectItem value="medium">{isRTL ? 'בינונית' : 'Medium'}</SelectItem>
                  <SelectItem value="high">{isRTL ? 'גבוהה' : 'High'}</SelectItem>
                  <SelectItem value="urgent">{isRTL ? 'דחוף' : 'Urgent'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 gap-1.5 text-xs" onClick={() => createTaskFromActivityMutation.mutate()} disabled={!taskFromActivity.title.trim() || createTaskFromActivityMutation.isPending}>
                <CalendarPlus className="w-3.5 h-3.5" />
                {isRTL ? '+ צור משימה ביומן' : '+ Add to Calendar'}
              </Button>
              <Button size="sm" variant="ghost" className="text-xs" onClick={() => { setShowCreateTaskFromActivity(false); setLastAddedActivity(null); }}>
                {isRTL ? 'בסדר' : 'Dismiss'}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

