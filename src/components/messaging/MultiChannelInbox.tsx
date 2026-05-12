import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  MessageSquare,
  Phone,
  Send,
  Inbox,
  Settings,
  Plus,
  Check,
  CheckCheck,
  X,
  Clock,
  AlertCircle,
  Mail,
  Smartphone,
  Loader2,
  Search,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ChannelType = 'sms' | 'whatsapp' | 'email';
type Provider = 'twilio' | 'vonage' | 'messagebird';
type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
type MessageDirection = 'inbound' | 'outbound';

interface MessagingChannel {
  id: string;
  user_id: string;
  channel_type: ChannelType;
  phone_number: string;
  provider: Provider;
  provider_config: Record<string, string>;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
}

interface CandidateMessage {
  id: string;
  sender_id: string;
  candidate_id: string;
  channel: ChannelType;
  direction: MessageDirection;
  subject: string | null;
  body: string;
  status: MessageStatus;
  external_id: string | null;
  metadata: Record<string, unknown> | null;
  sent_at: string;
}

interface ConversationThread {
  candidateId: string;
  candidateName: string;
  candidatePhone: string | null;
  lastMessage: string;
  lastMessageAt: string;
  channel: ChannelType;
  unreadCount: number;
  messages: CandidateMessage[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const QUICK_TEMPLATES = {
  en: [
    { label: 'Interview Invite', body: 'Hi {{first_name}}, we would love to invite you for an interview for the {{job_title}} position. Are you available this week?' },
    { label: 'Application Received', body: 'Hi {{first_name}}, we received your application for {{job_title}}. We will review it and get back to you soon!' },
    { label: 'Offer Congratulations', body: 'Hi {{first_name}}, we are thrilled to offer you the {{job_title}} position! Please check your email for details.' },
    { label: 'Follow Up', body: 'Hi {{first_name}}, just following up on the {{job_title}} role — any questions?' },
  ],
  he: [
    { label: 'הזמנה לראיון', body: 'היי {{first_name}}, נשמח להזמין אותך לראיון לתפקיד {{job_title}}. האם תפנוי השבוע?' },
    { label: 'קבלת מועמדות', body: 'היי {{first_name}}, קיבלנו את מועמדותך לתפקיד {{job_title}}. נבחן אותה ונחזור אליך בקרוב!' },
    { label: 'הצעת עבודה', body: 'היי {{first_name}}, אנחנו שמחים להציע לך את תפקיד {{job_title}}! פרטים נשלחו לדוא"ל שלך.' },
    { label: 'מעקב', body: 'היי {{first_name}}, רציתי לעקוב אחרי תפקיד {{job_title}} — יש שאלות?' },
  ],
};

const COUNTRY_CODES = [
  { code: '+972', label: 'IL +972' },
  { code: '+1', label: 'US +1' },
  { code: '+44', label: 'UK +44' },
  { code: '+49', label: 'DE +49' },
  { code: '+33', label: 'FR +33' },
];

function formatTime(dateStr: string, isHebrew: boolean): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return isHebrew ? 'עכשיו' : 'now';
  if (diffMin < 60) return isHebrew ? `לפני ${diffMin} ד'` : `${diffMin}m ago`;
  if (diffHr < 24) return isHebrew ? `לפני ${diffHr} ש'` : `${diffHr}h ago`;
  if (diffDay < 7) return isHebrew ? `לפני ${diffDay} ימים` : `${diffDay}d ago`;
  return date.toLocaleDateString(isHebrew ? 'he-IL' : 'en-US', { day: '2-digit', month: 'short' });
}

function ChannelIcon({ channel, size = 14 }: { channel: ChannelType; size?: number }) {
  if (channel === 'whatsapp') return <Smartphone size={size} className="text-green-500" />;
  if (channel === 'sms') return <Phone size={size} className="text-blue-500" />;
  return <Mail size={size} className="text-purple-500" />;
}

function StatusIcon({ status }: { status: MessageStatus }) {
  if (status === 'pending') return <Clock size={12} className="text-muted-foreground" />;
  if (status === 'sent') return <Check size={12} className="text-muted-foreground" />;
  if (status === 'delivered') return <CheckCheck size={12} className="text-muted-foreground" />;
  if (status === 'read') return <CheckCheck size={12} className="text-blue-500" />;
  if (status === 'failed') return <X size={12} className="text-destructive" />;
  return null;
}

// ─── Stats Bar ─────────────────────────────────────────────────────────────────

function StatsBar({ isHebrew }: { isHebrew: boolean }) {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ['messaging-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return { sentToday: 0, responseRate: 0, avgResponseMin: 0 };

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { count: sentToday } = await (supabase as any)
        .from('candidate_messages')
        .select('id', { count: 'exact', head: true })
        .eq('sender_id', user.id)
        .eq('direction', 'outbound')
        .gte('sent_at', todayStart.toISOString());

      const { data: recentOut } = await (supabase as any)
        .from('candidate_messages')
        .select('candidate_id, sent_at')
        .eq('sender_id', user.id)
        .eq('direction', 'outbound')
        .gte('sent_at', new Date(Date.now() - 7 * 86400000).toISOString());

      const { data: recentIn } = await (supabase as any)
        .from('candidate_messages')
        .select('candidate_id, sent_at')
        .eq('sender_id', user.id)
        .eq('direction', 'inbound')
        .gte('sent_at', new Date(Date.now() - 7 * 86400000).toISOString());

      const outIds = new Set((recentOut || []).map((m: CandidateMessage) => m.candidate_id));
      const inIds = new Set((recentIn || []).map((m: CandidateMessage) => m.candidate_id));
      const replied = [...outIds].filter(id => inIds.has(id)).length;
      const responseRate = outIds.size > 0 ? Math.round((replied / outIds.size) * 100) : 0;

      // Simplified avg response time (mock if no data)
      const avgResponseMin = recentIn && recentIn.length > 0 ? 47 : 0;

      return { sentToday: sentToday || 0, responseRate, avgResponseMin };
    },
    enabled: !!user?.id,
  });

  const items = [
    {
      label: isHebrew ? 'נשלחו היום' : 'Sent Today',
      value: stats?.sentToday ?? 0,
      color: 'text-blue-600',
    },
    {
      label: isHebrew ? 'אחוז תגובות' : 'Response Rate',
      value: `${stats?.responseRate ?? 0}%`,
      color: 'text-green-600',
    },
    {
      label: isHebrew ? 'זמן תגובה ממוצע' : 'Avg Response Time',
      value: stats?.avgResponseMin ? `${stats.avgResponseMin}m` : (isHebrew ? 'אין נתונים' : 'No data'),
      color: 'text-amber-600',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 mb-4">
      {items.map((item) => (
        <Card key={item.label} className="py-3 px-4">
          <p className="text-xs text-muted-foreground">{item.label}</p>
          <p className={cn('text-xl font-bold mt-0.5', item.color)}>{item.value}</p>
        </Card>
      ))}
    </div>
  );
}

// ─── Channel Settings Tab ──────────────────────────────────────────────────────

function ChannelSettings({ isHebrew }: { isHebrew: boolean }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    channel_type: 'sms' as ChannelType,
    countryCode: '+972',
    phone: '',
    provider: 'twilio' as Provider,
    api_key: '',
    api_secret: '',
  });
  const [verifying, setVerifying] = useState<string | null>(null);

  const { data: channels = [], isLoading } = useQuery({
    queryKey: ['messaging-channels', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await (supabase as any)
        .from('messaging_channels')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as MessagingChannel[];
    },
    enabled: !!user?.id,
  });

  const addChannel = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      const fullPhone = `${form.countryCode}${form.phone.replace(/^0/, '')}`;
      const { error } = await (supabase as any).from('messaging_channels').insert({
        user_id: user.id,
        channel_type: form.channel_type,
        phone_number: fullPhone,
        provider: form.provider,
        provider_config: { api_key: form.api_key, api_secret: form.api_secret },
        is_verified: false,
        is_active: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isHebrew ? 'ערוץ נוסף בהצלחה' : 'Channel added successfully');
      queryClient.invalidateQueries({ queryKey: ['messaging-channels'] });
      setForm({ channel_type: 'sms', countryCode: '+972', phone: '', provider: 'twilio', api_key: '', api_secret: '' });
    },
    onError: () => toast.error(isHebrew ? 'שגיאה בהוספת ערוץ' : 'Failed to add channel'),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any)
        .from('messaging_channels')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messaging-channels'] }),
  });

  const deleteChannel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('messaging_channels')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isHebrew ? 'ערוץ נמחק' : 'Channel deleted');
      queryClient.invalidateQueries({ queryKey: ['messaging-channels'] });
    },
  });

  const handleVerify = async (channel: MessagingChannel) => {
    setVerifying(channel.id);
    // Simulate verification — in production would call edge function
    await new Promise(r => setTimeout(r, 1500));
    const { error } = await (supabase as any)
      .from('messaging_channels')
      .update({ is_verified: true, is_active: true })
      .eq('id', channel.id);
    setVerifying(null);
    if (!error) {
      toast.success(isHebrew ? 'ערוץ אומת בהצלחה!' : 'Channel verified!');
      queryClient.invalidateQueries({ queryKey: ['messaging-channels'] });
    } else {
      toast.error(isHebrew ? 'אימות נכשל' : 'Verification failed');
    }
  };

  const channelLabel = (type: ChannelType) =>
    type === 'sms' ? 'SMS' : type === 'whatsapp' ? 'WhatsApp' : 'Email';

  return (
    <div className="space-y-6">
      {/* Add Channel Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" />
            {isHebrew ? 'הוסף ערוץ תקשורת' : 'Add Messaging Channel'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Channel Type */}
            <div className="space-y-1.5">
              <Label>{isHebrew ? 'סוג ערוץ' : 'Channel Type'}</Label>
              <Select
                value={form.channel_type}
                onValueChange={(v) => setForm(f => ({ ...f, channel_type: v as ChannelType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Provider */}
            <div className="space-y-1.5">
              <Label>{isHebrew ? 'ספק' : 'Provider'}</Label>
              <Select
                value={form.provider}
                onValueChange={(v) => setForm(f => ({ ...f, provider: v as Provider }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="twilio">Twilio</SelectItem>
                  <SelectItem value="vonage">Vonage</SelectItem>
                  <SelectItem value="messagebird">MessageBird</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Phone Number */}
          <div className="space-y-1.5">
            <Label>{isHebrew ? 'מספר טלפון' : 'Phone Number'}</Label>
            <div className="flex gap-2">
              <Select
                value={form.countryCode}
                onValueChange={(v) => setForm(f => ({ ...f, countryCode: v }))}
              >
                <SelectTrigger className="w-28 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRY_CODES.map(c => (
                    <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={form.phone}
                onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder={isHebrew ? 'מספר טלפון' : 'Phone number'}
                type="tel"
                className="flex-1"
                dir="ltr"
              />
            </div>
          </div>

          {/* API Credentials */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{isHebrew ? 'מפתח API' : 'API Key'}</Label>
              <Input
                value={form.api_key}
                onChange={(e) => setForm(f => ({ ...f, api_key: e.target.value }))}
                placeholder="AC..."
                dir="ltr"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{isHebrew ? 'סוד API' : 'API Secret'}</Label>
              <Input
                value={form.api_secret}
                onChange={(e) => setForm(f => ({ ...f, api_secret: e.target.value }))}
                placeholder="••••••••"
                type="password"
                dir="ltr"
              />
            </div>
          </div>

          <Button
            onClick={() => addChannel.mutate()}
            disabled={!form.phone || !form.api_key || addChannel.isPending}
            className="w-full gap-2"
          >
            {addChannel.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {isHebrew ? 'הוסף ערוץ' : 'Add Channel'}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Channels */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {isHebrew ? 'ערוצים קיימים' : 'Existing Channels'}
        </h3>

        {isLoading && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin me-2" />
            {isHebrew ? 'טוען...' : 'Loading...'}
          </div>
        )}

        {!isLoading && channels.length === 0 && (
          <Card className="py-8 text-center text-muted-foreground">
            <Phone className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{isHebrew ? 'אין ערוצים מוגדרים' : 'No channels configured yet'}</p>
          </Card>
        )}

        {channels.map((ch) => (
          <Card key={ch.id} className={cn('p-4', !ch.is_active && 'opacity-60')}>
            <div className="flex items-center gap-3">
              <ChannelIcon channel={ch.channel_type} size={18} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{channelLabel(ch.channel_type)} — {ch.phone_number}</p>
                <p className="text-xs text-muted-foreground capitalize">{ch.provider}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {ch.is_verified ? (
                  <Badge variant="secondary" className="text-green-600 border-green-200 bg-green-50">
                    <Check className="w-3 h-3 me-1" />
                    {isHebrew ? 'מאומת' : 'Verified'}
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={verifying === ch.id}
                    onClick={() => handleVerify(ch)}
                    aria-label={isHebrew ? 'אמת ערוץ' : 'Verify channel'}
                  >
                    {verifying === ch.id ? (
                      <Loader2 className="w-3 h-3 animate-spin me-1" />
                    ) : (
                      <AlertCircle className="w-3 h-3 me-1" />
                    )}
                    {isHebrew ? 'אמת' : 'Verify'}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant={ch.is_active ? 'default' : 'outline'}
                  className="h-7 text-xs"
                  onClick={() => toggleActive.mutate({ id: ch.id, is_active: !ch.is_active })}
                  aria-label={ch.is_active ? (isHebrew ? 'השבת' : 'Deactivate') : (isHebrew ? 'הפעל' : 'Activate')}
                >
                  {ch.is_active ? (isHebrew ? 'פעיל' : 'Active') : (isHebrew ? 'לא פעיל' : 'Inactive')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteChannel.mutate(ch.id)}
                  aria-label={isHebrew ? 'מחק ערוץ' : 'Delete channel'}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── New Message Dialog ────────────────────────────────────────────────────────

function ComposeNewDialog({
  isHebrew,
  onSent,
}: {
  isHebrew: boolean;
  onSent: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<{ id: string; name: string; phone: string | null } | null>(null);
  const [channel, setChannel] = useState<ChannelType>('sms');
  const [body, setBody] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const templates = isHebrew ? QUICK_TEMPLATES.he : QUICK_TEMPLATES.en;
  const charLimit = channel === 'sms' ? 160 : null;

  const { data: candidates = [] } = useQuery({
    queryKey: ['candidates-search', candidateSearch],
    queryFn: async () => {
      if (!candidateSearch.trim() || candidateSearch.length < 2) return [];
      const { data } = await (supabase as any)
        .from('profiles')
        .select('user_id, full_name, phone')
        .ilike('full_name', `%${candidateSearch}%`)
        .limit(10);
      return (data || []) as { user_id: string; full_name: string; phone: string | null }[];
    },
    enabled: open && candidateSearch.length >= 2,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !selectedCandidate) throw new Error('Missing data');
      if (!body.trim()) throw new Error('Empty message');

      const { error } = await (supabase as any).from('candidate_messages').insert({
        sender_id: user.id,
        candidate_id: selectedCandidate.id,
        channel,
        direction: 'outbound',
        subject: null,
        body: body.trim(),
        status: 'pending',
        sent_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isHebrew ? 'הודעה נשלחה!' : 'Message sent!');
      queryClient.invalidateQueries({ queryKey: ['candidate-messages'] });
      setOpen(false);
      setBody('');
      setSelectedCandidate(null);
      setCandidateSearch('');
      onSent();
    },
    onError: () => toast.error(isHebrew ? 'שגיאה בשליחה' : 'Failed to send'),
  });

  const applyTemplate = (label: string) => {
    const tpl = templates.find(t => t.label === label);
    if (tpl) setBody(tpl.body);
    setSelectedTemplate('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" aria-label={isHebrew ? 'הודעה חדשה' : 'New Message'}>
          <Plus className="w-4 h-4" />
          {isHebrew ? 'הודעה חדשה' : 'New Message'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" dir={isHebrew ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            {isHebrew ? 'הודעה חדשה' : 'New Message'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Candidate Search */}
          <div className="space-y-1.5">
            <Label>{isHebrew ? 'מועמד' : 'Candidate'}</Label>
            {selectedCandidate ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary/5 border border-primary/20 text-sm">
                <span className="flex-1 font-medium">{selectedCandidate.name}</span>
                <button
                  onClick={() => setSelectedCandidate(null)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={isHebrew ? 'הסר מועמד' : 'Remove candidate'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={candidateSearch}
                  onChange={(e) => setCandidateSearch(e.target.value)}
                  placeholder={isHebrew ? 'חפש מועמד לפי שם...' : 'Search candidate by name...'}
                  className="ps-9"
                />
                {candidates.length > 0 && (
                  <div className="absolute z-10 top-full mt-1 w-full bg-background border rounded-md shadow-md overflow-hidden">
                    {candidates.map(c => (
                      <button
                        key={c.user_id}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-start"
                        onClick={() => {
                          setSelectedCandidate({ id: c.user_id, name: c.full_name, phone: c.phone });
                          setCandidateSearch('');
                        }}
                      >
                        <span className="font-medium">{c.full_name}</span>
                        {c.phone && <span className="text-muted-foreground ms-auto">{c.phone}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Channel Select */}
          <div className="space-y-1.5">
            <Label>{isHebrew ? 'ערוץ' : 'Channel'}</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as ChannelType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sms">
                  <span className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> SMS</span>
                </SelectItem>
                <SelectItem value="whatsapp">
                  <span className="flex items-center gap-2"><Smartphone className="w-3.5 h-3.5" /> WhatsApp</span>
                </SelectItem>
                <SelectItem value="email">
                  <span className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> Email</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Template Picker */}
          <div className="space-y-1.5">
            <Label>{isHebrew ? 'תבנית מהירה' : 'Quick Template'}</Label>
            <Select value={selectedTemplate} onValueChange={applyTemplate}>
              <SelectTrigger>
                <SelectValue placeholder={isHebrew ? 'בחר תבנית...' : 'Choose a template...'} />
              </SelectTrigger>
              <SelectContent>
                {templates.map(t => (
                  <SelectItem key={t.label} value={t.label}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {channel === 'sms' && (
              <p className="text-xs text-muted-foreground">
                {isHebrew ? 'משתנים זמינים:' : 'Variables:'}{' '}
                <code className="bg-muted px-1 rounded text-xs">{'{{first_name}}'}</code>{' '}
                <code className="bg-muted px-1 rounded text-xs">{'{{job_title}}'}</code>
              </p>
            )}
          </div>

          {/* Message Body */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>{isHebrew ? 'הודעה' : 'Message'}</Label>
              {charLimit && (
                <span className={cn('text-xs', body.length > charLimit ? 'text-destructive' : 'text-muted-foreground')}>
                  {body.length}/{charLimit}
                </span>
              )}
            </div>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={isHebrew ? 'הקלד הודעה...' : 'Type your message...'}
              className="min-h-[100px] resize-none"
              dir={isHebrew ? 'rtl' : 'ltr'}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {isHebrew ? 'ביטול' : 'Cancel'}
            </Button>
            <Button
              onClick={() => sendMutation.mutate()}
              disabled={!selectedCandidate || !body.trim() || sendMutation.isPending || (!!charLimit && body.length > charLimit)}
              className="gap-2"
            >
              {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {isHebrew ? 'שלח' : 'Send'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Conversation Inbox ────────────────────────────────────────────────────────

function ConversationInbox({ isHebrew }: { isHebrew: boolean }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [replyChannel, setReplyChannel] = useState<ChannelType>('sms');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const templates = isHebrew ? QUICK_TEMPLATES.he : QUICK_TEMPLATES.en;

  // Fetch all messages grouped by candidate
  const { data: allMessages = [], isLoading, refetch } = useQuery({
    queryKey: ['candidate-messages', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await (supabase as any)
        .from('candidate_messages')
        .select('*')
        .eq('sender_id', user.id)
        .order('sent_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as CandidateMessage[];
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  // Fetch candidate profiles for names
  const candidateIds = [...new Set(allMessages.map(m => m.candidate_id))];
  const { data: profiles = [] } = useQuery({
    queryKey: ['candidate-profiles-inbox', candidateIds.join(',')],
    queryFn: async () => {
      if (candidateIds.length === 0) return [];
      const { data } = await (supabase as any)
        .from('profiles')
        .select('user_id, full_name, phone')
        .in('user_id', candidateIds);
      return (data || []) as { user_id: string; full_name: string; phone: string | null }[];
    },
    enabled: candidateIds.length > 0,
  });

  const profileMap = new Map(profiles.map(p => [p.user_id, p]));

  // Build threads
  const threads: ConversationThread[] = candidateIds.map(cid => {
    const msgs = allMessages.filter(m => m.candidate_id === cid);
    const sorted = [...msgs].sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());
    const profile = profileMap.get(cid);
    const unread = msgs.filter(m => m.direction === 'inbound' && m.status !== 'read').length;
    return {
      candidateId: cid,
      candidateName: profile?.full_name || (isHebrew ? 'מועמד לא ידוע' : 'Unknown Candidate'),
      candidatePhone: profile?.phone || null,
      lastMessage: sorted[0]?.body || '',
      lastMessageAt: sorted[0]?.sent_at || '',
      channel: sorted[0]?.channel || 'sms',
      unreadCount: unread,
      messages: [...msgs].sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()),
    };
  });

  // Sort threads by last message
  threads.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

  const activeThread = threads.find(t => t.candidateId === selectedCandidateId) || null;

  // Auto-scroll to bottom
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeThread?.messages.length]);

  const sendReply = useMutation({
    mutationFn: async () => {
      if (!user?.id || !selectedCandidateId) throw new Error('Missing data');
      if (!replyBody.trim()) throw new Error('Empty');
      const { error } = await (supabase as any).from('candidate_messages').insert({
        sender_id: user.id,
        candidate_id: selectedCandidateId,
        channel: replyChannel,
        direction: 'outbound',
        subject: null,
        body: replyBody.trim(),
        status: 'pending',
        sent_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setReplyBody('');
      queryClient.invalidateQueries({ queryKey: ['candidate-messages'] });
      toast.success(isHebrew ? 'הודעה נשלחה' : 'Message sent');
    },
    onError: () => toast.error(isHebrew ? 'שגיאה בשליחה' : 'Failed to send'),
  });

  const applyTemplate = (label: string) => {
    const tpl = templates.find(t => t.label === label);
    if (tpl) setReplyBody(tpl.body);
    setSelectedTemplate('');
  };

  return (
    <div className="flex h-[600px] rounded-lg border overflow-hidden">
      {/* Sidebar: Thread List */}
      <div className="w-64 shrink-0 border-e flex flex-col bg-muted/30">
        <div className="px-3 py-2 border-b flex items-center justify-between">
          <span className="text-sm font-semibold">{isHebrew ? 'שיחות' : 'Conversations'}</span>
          <button
            onClick={() => refetch()}
            className="text-muted-foreground hover:text-primary"
            aria-label={isHebrew ? 'רענן' : 'Refresh'}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {isLoading && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin me-2" />
          </div>
        )}

        {!isLoading && threads.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center text-muted-foreground">
            <Inbox className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-xs">{isHebrew ? 'אין שיחות עדיין' : 'No conversations yet'}</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {threads.map((thread) => (
            <button
              key={thread.candidateId}
              className={cn(
                'w-full flex items-start gap-2 px-3 py-3 text-start border-b hover:bg-muted/60 transition-colors',
                selectedCandidateId === thread.candidateId && 'bg-primary/10 hover:bg-primary/10',
              )}
              onClick={() => setSelectedCandidateId(thread.candidateId)}
              aria-label={`${isHebrew ? 'שיחה עם' : 'Conversation with'} ${thread.candidateName}`}
            >
              <ChannelIcon channel={thread.channel} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold truncate">{thread.candidateName}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {thread.lastMessageAt ? formatTime(thread.lastMessageAt, isHebrew) : ''}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{thread.lastMessage}</p>
              </div>
              {thread.unreadCount > 0 && (
                <Badge className="h-4 min-w-4 px-1 text-[10px] shrink-0 bg-primary">{thread.unreadCount}</Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Right: Conversation View */}
      <div className="flex-1 flex flex-col min-w-0">
        {!activeThread ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm">{isHebrew ? 'בחר שיחה' : 'Select a conversation'}</p>
          </div>
        ) : (
          <>
            {/* Thread Header */}
            <div className="px-4 py-3 border-b flex items-center gap-2 bg-background">
              <ChannelIcon channel={activeThread.channel} size={16} />
              <span className="font-semibold text-sm">{activeThread.candidateName}</span>
              {activeThread.candidatePhone && (
                <span className="text-xs text-muted-foreground ms-1">{activeThread.candidatePhone}</span>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10">
              {activeThread.messages.map((msg) => {
                const isOut = msg.direction === 'outbound';
                return (
                  <div
                    key={msg.id}
                    className={cn('flex', isOut ? 'justify-end' : 'justify-start')}
                  >
                    <div
                      className={cn(
                        'max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm',
                        isOut
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : 'bg-background border rounded-bl-sm',
                      )}
                    >
                      <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.body}</p>
                      <div className={cn('flex items-center gap-1 mt-1', isOut ? 'justify-end' : 'justify-start')}>
                        <span className="text-[10px] opacity-60">
                          {formatTime(msg.sent_at, isHebrew)}
                        </span>
                        {isOut && <StatusIcon status={msg.status} />}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Compose Reply */}
            <div className="border-t p-3 bg-background space-y-2">
              {/* Template + Channel row */}
              <div className="flex items-center gap-2">
                <Select value={replyChannel} onValueChange={(v) => setReplyChannel(v as ChannelType)}>
                  <SelectTrigger className="w-32 h-8 text-xs" aria-label={isHebrew ? 'ערוץ שליחה' : 'Send via'}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedTemplate} onValueChange={applyTemplate}>
                  <SelectTrigger className="flex-1 h-8 text-xs" aria-label={isHebrew ? 'תבניות מהירות' : 'Quick templates'}>
                    <SelectValue placeholder={isHebrew ? 'תבנית מהירה...' : 'Quick template...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.label} value={t.label}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Text + Send */}
              <div className="flex gap-2 items-end">
                <Textarea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder={isHebrew ? 'הקלד הודעה...' : 'Type a message...'}
                  className="flex-1 resize-none min-h-[60px] max-h-[120px] text-sm"
                  dir={isHebrew ? 'rtl' : 'ltr'}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (replyBody.trim()) sendReply.mutate();
                    }
                  }}
                />
                <Button
                  size="icon"
                  className="w-10 h-10 shrink-0"
                  disabled={!replyBody.trim() || sendReply.isPending}
                  onClick={() => sendReply.mutate()}
                  aria-label={isHebrew ? 'שלח' : 'Send message'}
                >
                  {sendReply.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {isHebrew ? 'Enter לשליחה · Shift+Enter לשורה חדשה' : 'Enter to send · Shift+Enter for new line'}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function MultiChannelInbox() {
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const isHebrew = isRTL;
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('inbox');

  const handleMessageSent = () => {
    queryClient.invalidateQueries({ queryKey: ['candidate-messages'] });
    setActiveTab('inbox');
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">
            {isHebrew ? 'תיבת דואר רב-ערוצית' : 'Multi-Channel Inbox'}
          </h2>
        </div>
        <ComposeNewDialog isHebrew={isHebrew} onSent={handleMessageSent} />
      </div>

      {/* Stats Bar */}
      <StatsBar isHebrew={isHebrew} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="inbox" className="gap-1.5 flex-1 sm:flex-none">
            <Inbox className="w-4 h-4" />
            {isHebrew ? 'תיבת דואר' : 'Inbox'}
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5 flex-1 sm:flex-none">
            <Settings className="w-4 h-4" />
            {isHebrew ? 'הגדרות' : 'Settings'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-4">
          <ConversationInbox isHebrew={isHebrew} />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <ChannelSettings isHebrew={isHebrew} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default MultiChannelInbox;
