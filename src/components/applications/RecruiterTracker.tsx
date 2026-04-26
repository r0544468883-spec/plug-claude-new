import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Plus, Linkedin, Mail, Phone, Building2, Pencil, Trash2, Users } from 'lucide-react';
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
  last_contact_at: string;
  created_at: string;
}

const STATUS_CONFIG: Record<Status, { he: string; en: string; color: string }> = {
  contacted:        { he: 'פנייה נשלחה',    en: 'Contacted',        color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  replied:          { he: 'ענה',            en: 'Replied',          color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  meeting_scheduled:{ he: 'פגישה נקבעה',   en: 'Meeting Scheduled',color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  offer_received:   { he: 'הצעה התקבלה',   en: 'Offer Received',   color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  cold:             { he: 'לא ענה',         en: 'Cold',             color: 'bg-muted text-muted-foreground border-border' },
};

const EMPTY_FORM = { name: '', company: '', title: '', linkedin_url: '', email: '', phone: '', status: 'contacted' as Status, notes: '' };

export function RecruiterTracker() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const qc = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RecruiterContact | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filterStatus, setFilterStatus] = useState<Status | 'all'>('all');

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
      setDialogOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
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

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

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
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterStatus('all')}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors', filterStatus === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-muted-foreground hover:bg-muted')}
          >
            {isRTL ? 'הכל' : 'All'} ({contacts.length})
          </button>
          {(Object.keys(STATUS_CONFIG) as Status[]).map(s => {
            const cnt = contacts.filter(c => c.status === s).length;
            if (cnt === 0) return null;
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors', filterStatus === s ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-muted-foreground hover:bg-muted')}
              >
                {isRTL ? STATUS_CONFIG[s].he : STATUS_CONFIG[s].en} ({cnt})
              </button>
            );
          })}
        </div>
        <Button size="sm" className="gap-1.5 h-8 flex-shrink-0" onClick={openNew}>
          <Plus className="w-3.5 h-3.5" />
          {isRTL ? 'הוסף ריקרוטר' : 'Add Recruiter'}
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

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(c => {
          const cfg = STATUS_CONFIG[c.status];
          return (
            <Card key={c.id} className="bg-card border-border hover:border-primary/30 transition-colors group">
              <CardContent className="p-3.5 space-y-2.5">
                {/* Top row */}
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

                {/* Links */}
                <div className="flex items-center gap-2 flex-wrap">
                  {c.linkedin_url && (
                    <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-blue-500 hover:text-blue-400">
                      <Linkedin className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {c.email && (
                    <a href={`mailto:${c.email}`} className="text-muted-foreground hover:text-foreground">
                      <Mail className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {c.phone && (
                    <a href={`tel:${c.phone}`} className="text-muted-foreground hover:text-foreground">
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <span className="text-[10px] text-muted-foreground ms-auto">
                    {format(new Date(c.last_contact_at), 'dd/MM/yy')}
                  </span>
                </div>

                {c.notes && (
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{c.notes}</p>
                )}

                {/* Actions (visible on hover) */}
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1 flex-1" onClick={() => openEdit(c)}>
                    <Pencil className="w-3 h-3" />
                    {isRTL ? 'עריכה' : 'Edit'}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 px-0 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => deleteMutation.mutate(c.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={o => { if (!o) { setDialogOpen(false); setEditing(null); setForm(EMPTY_FORM); } }}>
        <DialogContent className="max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{editing ? (isRTL ? 'עריכת ריקרוטר' : 'Edit Recruiter') : (isRTL ? 'ריקרוטר חדש' : 'New Recruiter')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{isRTL ? 'שם *' : 'Name *'}</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-8 text-xs" placeholder={isRTL ? 'שם הריקרוטר' : 'Recruiter name'} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{isRTL ? 'חברה' : 'Company'}</Label>
                <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className="h-8 text-xs" placeholder={isRTL ? 'שם החברה' : 'Company name'} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{isRTL ? 'תפקיד' : 'Title'}</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="h-8 text-xs" placeholder="HR Manager" />
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
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="text-xs resize-none h-16" placeholder={isRTL ? 'פרטים נוספים...' : 'Additional notes...'} />
            </div>

            <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={!form.name.trim() || saveMutation.isPending}>
              {saveMutation.isPending ? (isRTL ? 'שומר...' : 'Saving...') : (isRTL ? 'שמור' : 'Save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
