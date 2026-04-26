import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useConnections } from '@/hooks/useConnections';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  Plus, Linkedin, Mail, Phone, Building2, Pencil, Trash2, Users,
  Briefcase, UserPlus, Check, X, Search, ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';

type Status = 'contacted' | 'replied' | 'meeting_scheduled' | 'offer_received' | 'cold';

interface RecruiterContact {
  id: string;
  name: string;
  company: string | null;
  title: string | null;
  linkedin_url: string | null;
  email: string | null;
  phone: string | null;
  status: Status;
  notes: string | null;
  job_ids: string[];
  linked_user_id: string | null;
  last_contact_at: string;
  created_at: string;
}

interface Job { id: string; title: string; company_name: string | null; company: { name: string } | null; }
interface PlugUser { user_id: string; full_name: string; avatar_url: string | null; personal_tagline: string | null; }

const STATUS_CONFIG: Record<Status, { he: string; en: string; color: string }> = {
  contacted:         { he: 'פנייה נשלחה',   en: 'Contacted',         color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  replied:           { he: 'ענה',            en: 'Replied',           color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  meeting_scheduled: { he: 'פגישה נקבעה',   en: 'Meeting Scheduled', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  offer_received:    { he: 'הצעה התקבלה',   en: 'Offer Received',    color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  cold:              { he: 'לא ענה',         en: 'Cold',              color: 'bg-muted text-muted-foreground border-border' },
};

const EMPTY_FORM = {
  name: '', company: '', title: '', linkedin_url: '', email: '',
  phone: '', status: 'contacted' as Status, notes: '',
};

export function RecruiterTracker() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const qc = useQueryClient();
  const { sendRequest } = useConnections();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RecruiterContact | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filterStatus, setFilterStatus] = useState<Status | 'all'>('all');

  // Job linking state
  const [jobDialogOpen, setJobDialogOpen] = useState(false);
  const [jobTarget, setJobTarget] = useState<RecruiterContact | null>(null);
  const [jobSearch, setJobSearch] = useState('');

  // User linking state
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [userTarget, setUserTarget] = useState<RecruiterContact | null>(null);
  const [userSearch, setUserSearch] = useState('');

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['recruiter-contacts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await (supabase as any)
        .from('recruiter_contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('last_contact_at', { ascending: false });
      return (data || []) as RecruiterContact[];
    },
    enabled: !!user,
  });

  // Jobs search
  const { data: jobResults = [] } = useQuery({
    queryKey: ['jobs-search-recruiter', jobSearch],
    queryFn: async () => {
      if (!jobSearch.trim()) return [];
      const { data } = await (supabase as any)
        .from('jobs')
        .select('id, title, company_name, company:companies(name)')
        .or(`title.ilike.%${jobSearch}%,company_name.ilike.%${jobSearch}%`)
        .eq('status', 'active')
        .limit(10);
      return (data || []) as Job[];
    },
    enabled: jobSearch.trim().length > 1,
  });

  // Jobs details for linked job_ids
  const allLinkedJobIds = [...new Set(contacts.flatMap(c => c.job_ids || []))];
  const { data: linkedJobsMap = {} } = useQuery({
    queryKey: ['linked-jobs', allLinkedJobIds.join(',')],
    queryFn: async () => {
      if (!allLinkedJobIds.length) return {};
      const { data } = await (supabase as any)
        .from('jobs')
        .select('id, title, company_name, company:companies(name)')
        .in('id', allLinkedJobIds);
      const map: Record<string, Job> = {};
      (data || []).forEach((j: Job) => { map[j.id] = j; });
      return map;
    },
    enabled: allLinkedJobIds.length > 0,
  });

  // PLUG user search
  const { data: userResults = [] } = useQuery({
    queryKey: ['plug-users-search', userSearch],
    queryFn: async () => {
      if (!userSearch.trim() || !user) return [];
      const { data } = await supabase
        .from('profiles_secure')
        .select('user_id, full_name, avatar_url, personal_tagline')
        .ilike('full_name', `%${userSearch}%`)
        .neq('user_id', user.id)
        .limit(8);
      return (data || []) as PlugUser[];
    },
    enabled: userSearch.trim().length > 1,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const payload = { ...form, user_id: user.id, last_contact_at: new Date().toISOString() };
      if (editing) {
        const { error } = await (supabase as any).from('recruiter_contacts').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('recruiter_contacts').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isRTL ? 'נשמר!' : 'Saved!');
      qc.invalidateQueries({ queryKey: ['recruiter-contacts'] });
      closeDialog();
    },
    onError: () => toast.error(isRTL ? 'שגיאה בשמירה' : 'Save failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('recruiter_contacts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'נמחק' : 'Deleted');
      qc.invalidateQueries({ queryKey: ['recruiter-contacts'] });
    },
  });

  const linkJobMutation = useMutation({
    mutationFn: async ({ contactId, jobId, currentIds }: { contactId: string; jobId: string; currentIds: string[] }) => {
      const newIds = currentIds.includes(jobId)
        ? currentIds.filter(id => id !== jobId)
        : [...currentIds, jobId];
      const { error } = await (supabase as any)
        .from('recruiter_contacts')
        .update({ job_ids: newIds })
        .eq('id', contactId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recruiter-contacts'] }),
  });

  const linkUserMutation = useMutation({
    mutationFn: async ({ contactId, targetUserId }: { contactId: string; targetUserId: string }) => {
      // 1. Store linked_user_id on recruiter contact
      const { error } = await (supabase as any)
        .from('recruiter_contacts')
        .update({ linked_user_id: targetUserId })
        .eq('id', contactId);
      if (error) throw error;
      // 2. Send connection request with circle = 'recruiter' (auto-accept)
      await sendRequest.mutateAsync({ targetUserId, circle: 'recruiter', source: 'recruiter_tracker' });
    },
    onSuccess: () => {
      toast.success(isRTL ? 'נוסף לרשת שלך!' : 'Added to your network!');
      qc.invalidateQueries({ queryKey: ['recruiter-contacts'] });
      setUserDialogOpen(false);
      setUserTarget(null);
      setUserSearch('');
    },
    onError: () => toast.error(isRTL ? 'שגיאה בחיבור' : 'Connection failed'),
  });

  const unlinkUserMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await (supabase as any)
        .from('recruiter_contacts')
        .update({ linked_user_id: null })
        .eq('id', contactId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recruiter-contacts'] }),
  });

  // ── Helpers ───────────────────────────────────────────────────────────────

  const closeDialog = () => { setDialogOpen(false); setEditing(null); setForm(EMPTY_FORM); };

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setDialogOpen(true); };

  const openEdit = (c: RecruiterContact) => {
    setEditing(c);
    setForm({ name: c.name, company: c.company || '', title: c.title || '', linkedin_url: c.linkedin_url || '', email: c.email || '', phone: c.phone || '', status: c.status, notes: c.notes || '' });
    setDialogOpen(true);
  };

  const filtered = filterStatus === 'all' ? contacts : contacts.filter(c => c.status === filterStatus);

  if (isLoading) {
    return <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">{isRTL ? 'טוען...' : 'Loading...'}</div>;
  }

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Filter + Add */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button onClick={() => setFilterStatus('all')} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors', filterStatus === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-muted-foreground hover:bg-muted')}>
            {isRTL ? 'הכל' : 'All'} ({contacts.length})
          </button>
          {(Object.keys(STATUS_CONFIG) as Status[]).map(s => {
            const cnt = contacts.filter(c => c.status === s).length;
            if (cnt === 0) return null;
            return (
              <button key={s} onClick={() => setFilterStatus(s)} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors', filterStatus === s ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-muted-foreground hover:bg-muted')}>
                {isRTL ? STATUS_CONFIG[s].he : STATUS_CONFIG[s].en} ({cnt})
              </button>
            );
          })}
        </div>
        <Button size="sm" className="gap-1.5 h-8 flex-shrink-0" onClick={openNew}>
          <Plus className="w-3.5 h-3.5" />{isRTL ? 'הוסף ריקרוטר' : 'Add Recruiter'}
        </Button>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <Card className="bg-card border-border">
          <CardContent className="p-10 text-center">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium mb-1">{isRTL ? 'אין ריקרוטרים עדיין' : 'No recruiters yet'}</p>
            <p className="text-xs text-muted-foreground mb-4">{isRTL ? 'הוסף ריקרוטרים שיצרו איתך קשר' : 'Add recruiters who reached out to you'}</p>
            <Button size="sm" onClick={openNew}><Plus className="w-3.5 h-3.5 me-1.5" />{isRTL ? 'הוסף ראשון' : 'Add first'}</Button>
          </CardContent>
        </Card>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(c => {
          const cfg = STATUS_CONFIG[c.status];
          const linkedJobs = (c.job_ids || []).map(id => linkedJobsMap[id]).filter(Boolean);
          const isLinked = !!c.linked_user_id;

          return (
            <Card key={c.id} className="bg-card border-border hover:border-primary/30 transition-colors group">
              <CardContent className="p-3.5 space-y-2.5">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{c.name}</p>
                    {(c.title || c.company) && (
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3 flex-shrink-0" />
                        {[c.title, c.company].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className={cn('text-[10px] whitespace-nowrap flex-shrink-0', cfg.color)}>
                    {isRTL ? cfg.he : cfg.en}
                  </Badge>
                </div>

                {/* Contact links */}
                <div className="flex items-center gap-2 flex-wrap">
                  {c.linkedin_url && (
                    <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-blue-500 hover:text-blue-400">
                      <Linkedin className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {c.email && <a href={`mailto:${c.email}`} className="text-muted-foreground hover:text-foreground"><Mail className="w-3.5 h-3.5" /></a>}
                  {c.phone && <a href={`tel:${c.phone}`} className="text-muted-foreground hover:text-foreground"><Phone className="w-3.5 h-3.5" /></a>}
                  <span className="text-[10px] text-muted-foreground ms-auto">{format(new Date(c.last_contact_at), 'dd/MM/yy')}</span>
                </div>

                {/* PLUG connection badge */}
                {isLinked && (
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px] gap-1 text-emerald-500 border-emerald-500/30 bg-emerald-500/5">
                      <Check className="w-2.5 h-2.5" />
                      {isRTL ? 'מחובר ב-PLUG' : 'Connected on PLUG'}
                    </Badge>
                    <button onClick={() => unlinkUserMutation.mutate(c.id)} className="text-muted-foreground/40 hover:text-destructive transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Linked jobs */}
                {linkedJobs.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      {isRTL ? 'משרות קשורות' : 'Linked jobs'}
                    </p>
                    {linkedJobs.map(j => (
                      <div key={j.id} className="flex items-center justify-between gap-1 px-2 py-1 rounded bg-muted/40 text-[11px]">
                        <span className="truncate">{j.title} · {j.company?.name || j.company_name}</span>
                        <button onClick={() => linkJobMutation.mutate({ contactId: c.id, jobId: j.id, currentIds: c.job_ids || [] })} className="text-muted-foreground hover:text-destructive flex-shrink-0">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {c.notes && <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{c.notes}</p>}

                {/* Actions */}
                <div className="flex gap-1.5 pt-0.5">
                  <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] gap-1 flex-1" onClick={() => openEdit(c)}>
                    <Pencil className="w-3 h-3" />{isRTL ? 'עריכה' : 'Edit'}
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] gap-1 flex-1" onClick={() => { setJobTarget(c); setJobSearch(''); setJobDialogOpen(true); }}>
                    <Briefcase className="w-3 h-3" />{isRTL ? 'משרות' : 'Jobs'}
                  </Button>
                  {!isLinked && (
                    <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] gap-1 flex-1" onClick={() => { setUserTarget(c); setUserSearch(''); setUserDialogOpen(true); }}>
                      <UserPlus className="w-3 h-3" />{isRTL ? 'PLUG' : 'PLUG'}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 w-7 px-0 text-destructive hover:bg-destructive/10 flex-shrink-0" onClick={() => deleteMutation.mutate(c.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Add/Edit dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={o => { if (!o) closeDialog(); }}>
        <DialogContent className="max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{editing ? (isRTL ? 'עריכת ריקרוטר' : 'Edit Recruiter') : (isRTL ? 'ריקרוטר חדש' : 'New Recruiter')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{isRTL ? 'שם *' : 'Name *'}</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{isRTL ? 'חברה' : 'Company'}</Label>
                <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className="h-8 text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{isRTL ? 'תפקיד' : 'Title'}</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{isRTL ? 'סטטוס' : 'Status'}</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as Status }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_CONFIG) as Status[]).map(s => (
                      <SelectItem key={s} value={s} className="text-xs">{isRTL ? STATUS_CONFIG[s].he : STATUS_CONFIG[s].en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">LinkedIn URL</Label>
              <Input value={form.linkedin_url} onChange={e => setForm(f => ({ ...f, linkedin_url: e.target.value }))} className="h-8 text-xs" placeholder="https://linkedin.com/in/..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{isRTL ? 'טלפון' : 'Phone'}</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="h-8 text-xs" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{isRTL ? 'הערות' : 'Notes'}</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="text-xs resize-none h-16" />
            </div>
            <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={!form.name.trim() || saveMutation.isPending}>
              {saveMutation.isPending ? (isRTL ? 'שומר...' : 'Saving...') : (isRTL ? 'שמור' : 'Save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Job linking dialog ── */}
      <Dialog open={jobDialogOpen} onOpenChange={o => { if (!o) { setJobDialogOpen(false); setJobTarget(null); setJobSearch(''); } }}>
        <DialogContent className="max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" />
              {isRTL ? `משרות של ${jobTarget?.name || ''}` : `Jobs by ${jobTarget?.name || ''}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-1">
            <div className="relative">
              <Search className="absolute start-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={jobSearch}
                onChange={e => setJobSearch(e.target.value)}
                placeholder={isRTL ? 'חפש משרה...' : 'Search jobs...'}
                className="h-8 text-xs ps-8"
                autoFocus
              />
            </div>

            {/* Already linked */}
            {(jobTarget?.job_ids || []).length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground font-medium">{isRTL ? 'קשורות כבר' : 'Already linked'}</p>
                {(jobTarget?.job_ids || []).map(id => {
                  const j = linkedJobsMap[id];
                  if (!j) return null;
                  return (
                    <div key={id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-primary/5 border border-primary/20 text-xs">
                      <span className="truncate">{j.title} · {j.company?.name || j.company_name}</span>
                      <button onClick={() => { linkJobMutation.mutate({ contactId: jobTarget!.id, jobId: id, currentIds: jobTarget!.job_ids || [] }); qc.invalidateQueries({ queryKey: ['recruiter-contacts'] }); }} className="text-destructive flex-shrink-0">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Search results */}
            {jobSearch.trim().length > 1 && (
              <div className="space-y-1 max-h-52 overflow-y-auto">
                {jobResults.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">{isRTL ? 'לא נמצאו משרות' : 'No jobs found'}</p>
                ) : jobResults.map(j => {
                  const isLinked = (jobTarget?.job_ids || []).includes(j.id);
                  return (
                    <button
                      key={j.id}
                      onClick={() => { if (jobTarget) linkJobMutation.mutate({ contactId: jobTarget.id, jobId: j.id, currentIds: jobTarget.job_ids || [] }); qc.invalidateQueries({ queryKey: ['recruiter-contacts'] }); }}
                      className={cn(
                        'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs text-start transition-colors',
                        isLinked ? 'bg-primary/5 border-primary/20' : 'border-border hover:bg-muted/50'
                      )}
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{j.title}</p>
                        <p className="text-muted-foreground text-[10px]">{j.company?.name || j.company_name}</p>
                      </div>
                      {isLinked ? <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" /> : <Plus className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── User linking dialog ── */}
      <Dialog open={userDialogOpen} onOpenChange={o => { if (!o) { setUserDialogOpen(false); setUserTarget(null); setUserSearch(''); } }}>
        <DialogContent className="max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" />
              {isRTL ? `חבר ${userTarget?.name || ''} לרשת שלך` : `Connect ${userTarget?.name || ''} on PLUG`}
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">{isRTL ? 'חפש משתמש PLUG שהוא הריקרוטר הזה' : 'Find this recruiter\'s PLUG account'}</p>
          <div className="space-y-3 mt-1">
            <div className="relative">
              <Search className="absolute start-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder={isRTL ? 'חפש לפי שם...' : 'Search by name...'}
                className="h-8 text-xs ps-8"
                autoFocus
              />
            </div>
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {userSearch.trim().length > 1 && userResults.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">{isRTL ? 'לא נמצא משתמש' : 'No user found'}</p>
              )}
              {userResults.map(u => (
                <button
                  key={u.user_id}
                  onClick={() => { if (userTarget) linkUserMutation.mutate({ contactId: userTarget.id, targetUserId: u.user_id }); }}
                  disabled={linkUserMutation.isPending}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg border border-border hover:bg-muted/50 hover:border-primary/30 transition-colors text-start"
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={u.avatar_url || ''} />
                    <AvatarFallback className="text-xs">{u.full_name?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{u.full_name}</p>
                    {u.personal_tagline && <p className="text-[10px] text-muted-foreground truncate">{u.personal_tagline}</p>}
                  </div>
                  <UserPlus className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 ms-auto" />
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
