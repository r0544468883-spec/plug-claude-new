import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Mail,
  MessageSquare,
  Bell,
  Smartphone,
  Play,
  Pause,
  Eye,
  BarChart2,
  Users,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Send,
  Pencil,
  CheckCircle2,
  Clock,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────

type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';
type TargetAudience =
  | 'talent_pool'
  | 'rejected'
  | 'interviewed'
  | 'all_candidates'
  | 'custom';
type Channel = 'email' | 'sms' | 'whatsapp' | 'in_app';

interface SequenceStep {
  id?: string;
  campaign_id?: string;
  step_order: number;
  delay_days: number;
  delay_hours: number;
  channel: Channel;
  subject: string;
  body: string;
  template_variables: string[];
  is_active: boolean;
}

interface Campaign {
  id: string;
  created_by: string;
  name: string;
  description: string;
  target_audience: TargetAudience;
  status: CampaignStatus;
  total_enrolled: number;
  total_completed: number;
  open_rate: number;
  reply_rate: number;
  created_at?: string;
}

interface StepFunnelStat {
  step_order: number;
  channel: Channel;
  subject: string;
  sent: number;
  opened: number;
  replied: number;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const TEMPLATE_VARS = [
  '{{first_name}}',
  '{{company_name}}',
  '{{job_title}}',
  '{{recruiter_name}}',
];

const STATUS_CONFIG: Record<
  CampaignStatus,
  { labelEn: string; labelHe: string; color: string }
> = {
  draft: { labelEn: 'Draft', labelHe: 'טיוטה', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  active: { labelEn: 'Active', labelHe: 'פעיל', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  paused: { labelEn: 'Paused', labelHe: 'מושהה', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  completed: { labelEn: 'Completed', labelHe: 'הושלם', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  archived: { labelEn: 'Archived', labelHe: 'בארכיון', color: 'bg-muted/50 text-muted-foreground border-border' },
};

const AUDIENCE_CONFIG: Record<
  TargetAudience,
  { labelEn: string; labelHe: string }
> = {
  talent_pool: { labelEn: 'Talent Pool', labelHe: 'מאגר כישרונות' },
  rejected: { labelEn: 'Rejected Candidates', labelHe: 'מועמדים שנדחו' },
  interviewed: { labelEn: 'Interviewed Candidates', labelHe: 'מועמדים שרואיינו' },
  all_candidates: { labelEn: 'All Candidates', labelHe: 'כל המועמדים' },
  custom: { labelEn: 'Custom', labelHe: 'מותאם אישית' },
};

const CHANNEL_CONFIG: Record<
  Channel,
  { labelEn: string; labelHe: string; icon: React.ElementType; color: string }
> = {
  email: { labelEn: 'Email', labelHe: 'אימייל', icon: Mail, color: 'text-blue-400' },
  sms: { labelEn: 'SMS', labelHe: 'SMS', icon: Smartphone, color: 'text-green-400' },
  whatsapp: { labelEn: 'WhatsApp', labelHe: 'וואטסאפ', icon: MessageSquare, color: 'text-emerald-400' },
  in_app: { labelEn: 'In-App', labelHe: 'בתוך האפליקציה', icon: Bell, color: 'text-purple-400' },
};

const DEFAULT_STEP: Omit<SequenceStep, 'step_order'> = {
  delay_days: 1,
  delay_hours: 0,
  channel: 'email',
  subject: '',
  body: '',
  template_variables: TEMPLATE_VARS,
  is_active: true,
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function buildPreviewBody(body: string): string {
  return body
    .replace(/\{\{first_name\}\}/g, 'Dana')
    .replace(/\{\{company_name\}\}/g, 'PLUG')
    .replace(/\{\{job_title\}\}/g, 'Software Engineer')
    .replace(/\{\{recruiter_name\}\}/g, 'Yael Cohen');
}

function ProgressBar({ value, color = 'bg-blue-500' }: { value: number; color?: string }) {
  return (
    <div className="w-full bg-muted rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: CampaignStatus }) {
  const { labelEn, labelHe, color } = STATUS_CONFIG[status];
  const { language } = useLanguage();
  return (
    <Badge variant="outline" className={`text-xs font-medium ${color}`}>
      {language === 'he' ? labelHe : labelEn}
    </Badge>
  );
}

// ─── Campaign Stats View ───────────────────────────────────────────────────────

function CampaignStatsView({
  campaign,
  isRTL,
}: {
  campaign: Campaign;
  isRTL: boolean;
}) {
  const { data: steps, isLoading } = useQuery({
    queryKey: ['nurture-steps', campaign.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('nurture_sequence_steps')
        .select('*')
        .eq('campaign_id', campaign.id)
        .order('step_order');
      if (error) throw error;
      return (data ?? []) as SequenceStep[];
    },
  });

  // Simulate per-step funnel stats from the flat step list (real data would come from enrollments)
  const funnelStats: StepFunnelStat[] = (steps ?? []).map((s, i) => {
    const base = campaign.total_enrolled * Math.pow(0.85, i);
    return {
      step_order: s.step_order,
      channel: s.channel,
      subject: s.subject || (isRTL ? 'ללא נושא' : 'No subject'),
      sent: Math.round(base),
      opened: Math.round(base * (campaign.open_rate / 100)),
      replied: Math.round(base * (campaign.reply_rate / 100)),
    };
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: isRTL ? 'נרשמו' : 'Enrolled', value: campaign.total_enrolled, icon: Users, color: 'text-blue-400' },
          { label: isRTL ? 'הושלמו' : 'Completed', value: campaign.total_completed, icon: CheckCircle2, color: 'text-green-400' },
          { label: isRTL ? 'שיעור פתיחה' : 'Open Rate', value: `${campaign.open_rate}%`, icon: Eye, color: 'text-yellow-400' },
          { label: isRTL ? 'שיעור תגובה' : 'Reply Rate', value: `${campaign.reply_rate}%`, icon: Send, color: 'text-purple-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="bg-card/50 border-border/50">
            <CardContent className="pt-4 pb-3 px-4">
              <div className={`flex items-center gap-2 mb-1 ${color}`}>
                <Icon size={16} />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <p className="text-2xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress bars */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            {isRTL ? 'שיעורי ביצוע' : 'Performance Rates'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">{isRTL ? 'שיעור פתיחה' : 'Open Rate'}</span>
              <span className="font-medium">{campaign.open_rate}%</span>
            </div>
            <ProgressBar value={campaign.open_rate} color="bg-yellow-500" />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">{isRTL ? 'שיעור תגובה' : 'Reply Rate'}</span>
              <span className="font-medium">{campaign.reply_rate}%</span>
            </div>
            <ProgressBar value={campaign.reply_rate} color="bg-purple-500" />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">{isRTL ? 'שיעור השלמה' : 'Completion Rate'}</span>
              <span className="font-medium">
                {campaign.total_enrolled > 0
                  ? Math.round((campaign.total_completed / campaign.total_enrolled) * 100)
                  : 0}
                %
              </span>
            </div>
            <ProgressBar
              value={
                campaign.total_enrolled > 0
                  ? (campaign.total_completed / campaign.total_enrolled) * 100
                  : 0
              }
              color="bg-green-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Per-step funnel */}
      {funnelStats.length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart2 size={16} />
              {isRTL ? 'משפך לפי שלב' : 'Per-Step Funnel'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {funnelStats.map((stat) => {
              const ChannelIcon = CHANNEL_CONFIG[stat.channel].icon;
              const channelColor = CHANNEL_CONFIG[stat.channel].color;
              return (
                <div key={stat.step_order} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground w-5">
                      #{stat.step_order}
                    </span>
                    <ChannelIcon size={14} className={channelColor} />
                    <span className="text-sm font-medium truncate flex-1">{stat.subject}</span>
                    <span className="text-xs text-muted-foreground">{stat.sent} sent</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 ps-7">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{isRTL ? 'נפתחו' : 'Opened'}</span>
                        <span>{stat.opened}</span>
                      </div>
                      <ProgressBar
                        value={stat.sent > 0 ? (stat.opened / stat.sent) * 100 : 0}
                        color="bg-yellow-500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{isRTL ? 'הגיבו' : 'Replied'}</span>
                        <span>{stat.replied}</span>
                      </div>
                      <ProgressBar
                        value={stat.sent > 0 ? (stat.replied / stat.sent) * 100 : 0}
                        color="bg-purple-500"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Sequence Step Editor ──────────────────────────────────────────────────────

function SequenceStepCard({
  step,
  index,
  total,
  isRTL,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  previewMode,
}: {
  step: SequenceStep;
  index: number;
  total: number;
  isRTL: boolean;
  onChange: (s: SequenceStep) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  previewMode: boolean;
}) {
  const ChannelIcon = CHANNEL_CONFIG[step.channel].icon;
  const channelColor = CHANNEL_CONFIG[step.channel].color;

  if (previewMode) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
            {index + 1}
          </div>
          <ChannelIcon size={16} className={channelColor} />
          <span className="text-sm font-semibold">{step.subject || (isRTL ? 'ללא נושא' : 'No subject')}</span>
          <span className="ms-auto text-xs text-muted-foreground">
            {isRTL
              ? `אחרי ${step.delay_days}ד ${step.delay_hours}ש`
              : `After ${step.delay_days}d ${step.delay_hours}h`}
          </span>
        </div>
        <div
          className="text-sm text-muted-foreground whitespace-pre-wrap bg-background/60 rounded p-3 border border-border/50 min-h-[60px]"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          {buildPreviewBody(step.body) || (isRTL ? 'גוף ההודעה יופיע כאן...' : 'Message body will appear here...')}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card/50 p-4 space-y-4">
      {/* Step header */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
          {index + 1}
        </div>
        <ChannelIcon size={16} className={`${channelColor} shrink-0`} />
        <span className="text-sm font-semibold flex-1">
          {isRTL ? `שלב ${index + 1}` : `Step ${index + 1}`}
        </span>

        {/* Move up/down */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={index === 0}
            onClick={onMoveUp}
            aria-label={isRTL ? 'הזז למעלה' : 'Move up'}
          >
            <ChevronUp size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={index === total - 1}
            onClick={onMoveDown}
            aria-label={isRTL ? 'הזז למטה' : 'Move down'}
          >
            <ChevronDown size={14} />
          </Button>
        </div>

        {/* Active toggle */}
        <Switch
          checked={step.is_active}
          onCheckedChange={(v) => onChange({ ...step, is_active: v })}
          aria-label={isRTL ? 'פעיל' : 'Active'}
        />

        {/* Remove */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={onRemove}
          aria-label={isRTL ? 'מחק שלב' : 'Remove step'}
        >
          <Trash2 size={14} />
        </Button>
      </div>

      {/* Delay + Channel row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <Label className="text-xs mb-1 block">
            {isRTL ? 'עיכוב (ימים)' : 'Delay (days)'}
          </Label>
          <Input
            type="number"
            min={0}
            value={step.delay_days}
            onChange={(e) => onChange({ ...step, delay_days: parseInt(e.target.value) || 0 })}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs mb-1 block">
            {isRTL ? 'שעות' : 'Hours'}
          </Label>
          <Input
            type="number"
            min={0}
            max={23}
            value={step.delay_hours}
            onChange={(e) => onChange({ ...step, delay_hours: parseInt(e.target.value) || 0 })}
            className="h-8 text-sm"
          />
        </div>
        <div className="col-span-2">
          <Label className="text-xs mb-1 block">
            {isRTL ? 'ערוץ' : 'Channel'}
          </Label>
          <Select
            value={step.channel}
            onValueChange={(v) => onChange({ ...step, channel: v as Channel })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(CHANNEL_CONFIG) as Channel[]).map((ch) => (
                <SelectItem key={ch} value={ch}>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const { icon: Icon, labelEn, labelHe } = CHANNEL_CONFIG[ch];
                      return (
                        <>
                          <Icon size={14} />
                          <span>{isRTL ? labelHe : labelEn}</span>
                        </>
                      );
                    })()}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Subject (email only) */}
      {step.channel === 'email' && (
        <div>
          <Label className="text-xs mb-1 block">
            {isRTL ? 'נושא' : 'Subject'}
          </Label>
          <Input
            value={step.subject}
            onChange={(e) => onChange({ ...step, subject: e.target.value })}
            placeholder={isRTL ? 'נושא האימייל...' : 'Email subject...'}
            className="h-8 text-sm"
            dir={isRTL ? 'rtl' : 'ltr'}
          />
        </div>
      )}

      {/* Body */}
      <div>
        <Label className="text-xs mb-1 block">
          {isRTL ? 'גוף ההודעה' : 'Message Body'}
        </Label>
        <Textarea
          value={step.body}
          onChange={(e) => onChange({ ...step, body: e.target.value })}
          placeholder={
            isRTL
              ? 'שלום {{first_name}}, אני רוצה ליצור איתך קשר לגבי...'
              : 'Hi {{first_name}}, I wanted to reach out regarding...'
          }
          className="min-h-[120px] text-sm resize-none"
          dir={isRTL ? 'rtl' : 'ltr'}
        />
        {/* Template variable chips */}
        <div className="flex flex-wrap gap-1 mt-2">
          {TEMPLATE_VARS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange({ ...step, body: step.body + v })}
              className="text-xs bg-primary/10 hover:bg-primary/20 text-primary px-2 py-0.5 rounded-full transition-colors font-mono"
              title={isRTL ? 'לחץ להוספה' : 'Click to insert'}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Campaign Editor ───────────────────────────────────────────────────────────

function CampaignEditor({
  editingCampaign,
  isRTL,
  onBack,
}: {
  editingCampaign: Campaign | null;
  isRTL: boolean;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [name, setName] = useState(editingCampaign?.name ?? '');
  const [description, setDescription] = useState(editingCampaign?.description ?? '');
  const [targetAudience, setTargetAudience] = useState<TargetAudience>(
    editingCampaign?.target_audience ?? 'talent_pool'
  );
  const [steps, setSteps] = useState<SequenceStep[]>([
    { ...DEFAULT_STEP, step_order: 1 },
  ]);
  const [previewMode, setPreviewMode] = useState(false);
  const [editorTab, setEditorTab] = useState<'build' | 'preview'>('build');

  // Load existing steps when editing
  useQuery({
    queryKey: ['nurture-steps-edit', editingCampaign?.id],
    enabled: !!editingCampaign?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('nurture_sequence_steps')
        .select('*')
        .eq('campaign_id', editingCampaign!.id)
        .order('step_order');
      if (error) throw error;
      const loaded = (data ?? []) as SequenceStep[];
      if (loaded.length > 0) setSteps(loaded);
      return loaded;
    },
  });

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      { ...DEFAULT_STEP, step_order: prev.length + 1 },
    ]);
  };

  const removeStep = (i: number) => {
    setSteps((prev) => {
      const next = prev.filter((_, idx) => idx !== i);
      return next.map((s, idx) => ({ ...s, step_order: idx + 1 }));
    });
  };

  const updateStep = (i: number, updated: SequenceStep) => {
    setSteps((prev) => prev.map((s, idx) => (idx === i ? updated : s)));
  };

  const moveStep = (i: number, dir: 'up' | 'down') => {
    setSteps((prev) => {
      const arr = [...prev];
      const target = dir === 'up' ? i - 1 : i + 1;
      if (target < 0 || target >= arr.length) return arr;
      [arr[i], arr[target]] = [arr[target], arr[i]];
      return arr.map((s, idx) => ({ ...s, step_order: idx + 1 }));
    });
  };

  const saveMutation = useMutation({
    mutationFn: async (targetStatus: CampaignStatus) => {
      if (!user) throw new Error('Not authenticated');
      if (!name.trim()) throw new Error(isRTL ? 'יש למלא שם קמפיין' : 'Campaign name is required');

      let campaignId = editingCampaign?.id;

      if (campaignId) {
        const { error } = await (supabase as any)
          .from('nurture_campaigns')
          .update({
            name: name.trim(),
            description: description.trim(),
            target_audience: targetAudience,
            status: targetStatus,
          })
          .eq('id', campaignId);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase as any)
          .from('nurture_campaigns')
          .insert({
            created_by: user.id,
            name: name.trim(),
            description: description.trim(),
            target_audience: targetAudience,
            status: targetStatus,
            total_enrolled: 0,
            total_completed: 0,
            open_rate: 0,
            reply_rate: 0,
          })
          .select('id')
          .single();
        if (error) throw error;
        campaignId = data.id;
      }

      // Delete old steps and re-insert
      await (supabase as any)
        .from('nurture_sequence_steps')
        .delete()
        .eq('campaign_id', campaignId);

      if (steps.length > 0) {
        const { error: stepsError } = await (supabase as any)
          .from('nurture_sequence_steps')
          .insert(
            steps.map((s, idx) => ({
              campaign_id: campaignId,
              step_order: idx + 1,
              delay_days: s.delay_days,
              delay_hours: s.delay_hours,
              channel: s.channel,
              subject: s.subject,
              body: s.body,
              template_variables: s.template_variables,
              is_active: s.is_active,
            }))
          );
        if (stepsError) throw stepsError;
      }

      return campaignId;
    },
    onSuccess: (_, targetStatus) => {
      queryClient.invalidateQueries({ queryKey: ['nurture-campaigns'] });
      toast.success(
        isRTL
          ? targetStatus === 'active'
            ? 'הקמפיין הופעל!'
            : 'הקמפיין נשמר!'
          : targetStatus === 'active'
          ? 'Campaign activated!'
          : 'Campaign saved!'
      );
      onBack();
    },
    onError: (e: any) => {
      toast.error(e?.message ?? (isRTL ? 'שגיאה בשמירה' : 'Failed to save'));
    },
  });

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <BackIcon size={18} />
        </Button>
        <h2 className="text-lg font-bold flex-1">
          {editingCampaign
            ? isRTL ? 'עריכת קמפיין' : 'Edit Campaign'
            : isRTL ? 'קמפיין חדש' : 'New Campaign'}
        </h2>
      </div>

      {/* Campaign metadata */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            {isRTL ? 'פרטי קמפיין' : 'Campaign Details'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs mb-1 block">
              {isRTL ? 'שם הקמפיין *' : 'Campaign Name *'}
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isRTL ? 'למשל: חימום מועמדים למשרות חדשות' : 'e.g. Warm up candidates for new roles'}
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>
          <div>
            <Label className="text-xs mb-1 block">
              {isRTL ? 'תיאור' : 'Description'}
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isRTL ? 'תיאור קצר של מטרת הקמפיין...' : 'Brief description of the campaign goal...'}
              className="min-h-[72px] resize-none"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>
          <div>
            <Label className="text-xs mb-1 block">
              {isRTL ? 'קהל יעד' : 'Target Audience'}
            </Label>
            <Select value={targetAudience} onValueChange={(v) => setTargetAudience(v as TargetAudience)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(AUDIENCE_CONFIG) as TargetAudience[]).map((a) => (
                  <SelectItem key={a} value={a}>
                    {isRTL ? AUDIENCE_CONFIG[a].labelHe : AUDIENCE_CONFIG[a].labelEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sequence builder */}
      <div>
        <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Clock size={16} className="text-primary" />
            {isRTL ? 'שלבי הרצף' : 'Sequence Steps'}
            <Badge variant="outline" className="text-xs">{steps.length}</Badge>
          </h3>
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditorTab(editorTab === 'build' ? 'preview' : 'build')}
              className="text-xs h-8"
            >
              {editorTab === 'build' ? (
                <>
                  <Eye size={13} className="me-1" />
                  {isRTL ? 'תצוגה מקדימה' : 'Preview'}
                </>
              ) : (
                <>
                  <Pencil size={13} className="me-1" />
                  {isRTL ? 'עריכה' : 'Edit'}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Timeline visual */}
        <div className="space-y-0">
          {steps.map((step, i) => (
            <div key={i} className="relative">
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="absolute left-[13px] top-[56px] w-0.5 h-6 bg-border z-10 rtl:left-auto rtl:right-[13px]" />
              )}
              <div className="mb-2">
                <SequenceStepCard
                  step={step}
                  index={i}
                  total={steps.length}
                  isRTL={isRTL}
                  onChange={(updated) => updateStep(i, updated)}
                  onRemove={() => removeStep(i)}
                  onMoveUp={() => moveStep(i, 'up')}
                  onMoveDown={() => moveStep(i, 'down')}
                  previewMode={editorTab === 'preview'}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Add step */}
        {editorTab === 'build' && (
          <Button
            variant="outline"
            className="w-full mt-2 border-dashed h-10 text-sm"
            onClick={addStep}
          >
            <Plus size={16} className="me-2" />
            {isRTL ? 'הוסף שלב' : 'Add Step'}
          </Button>
        )}
      </div>

      {/* Template variables legend */}
      {editorTab === 'build' && (
        <Card className="bg-muted/30 border-border/50">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {isRTL ? 'משתני תבנית זמינים:' : 'Available template variables:'}
            </p>
            <div className="flex flex-wrap gap-1">
              {TEMPLATE_VARS.map((v) => (
                <code key={v} className="text-xs bg-background border border-border rounded px-1.5 py-0.5 font-mono text-primary">
                  {v}
                </code>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action buttons */}
      <div className={`flex items-center gap-3 pt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <Button
          variant="outline"
          className="flex-1"
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate('draft')}
        >
          {saveMutation.isPending && <Loader2 size={14} className="animate-spin me-2" />}
          {isRTL ? 'שמור כטיוטה' : 'Save as Draft'}
        </Button>
        <Button
          className="flex-1"
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate('active')}
        >
          {saveMutation.isPending ? (
            <Loader2 size={14} className="animate-spin me-2" />
          ) : (
            <Play size={14} className="me-2" />
          )}
          {isRTL ? 'הפעל קמפיין' : 'Activate Campaign'}
        </Button>
      </div>

      {/* Pause (edit only + active) */}
      {editingCampaign?.status === 'active' && (
        <Button
          variant="ghost"
          className="w-full text-yellow-400 hover:text-yellow-300 text-sm"
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate('paused')}
        >
          <Pause size={14} className="me-2" />
          {isRTL ? 'השהה קמפיין' : 'Pause Campaign'}
        </Button>
      )}
    </div>
  );
}

// ─── Campaigns List ────────────────────────────────────────────────────────────

function CampaignsList({
  isRTL,
  onEdit,
  onCreate,
}: {
  isRTL: boolean;
  onEdit: (c: Campaign) => void;
  onCreate: () => void;
}) {
  const [filterStatus, setFilterStatus] = useState<CampaignStatus | 'all'>('all');
  const [statsDialogCampaign, setStatsDialogCampaign] = useState<Campaign | null>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['nurture-campaigns'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('nurture_campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Campaign[];
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CampaignStatus }) => {
      const { error } = await (supabase as any)
        .from('nurture_campaigns')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurture-campaigns'] });
      toast.success(isRTL ? 'סטטוס עודכן' : 'Status updated');
    },
    onError: () => toast.error(isRTL ? 'שגיאה בעדכון' : 'Update failed'),
  });

  const filtered =
    filterStatus === 'all'
      ? (campaigns ?? [])
      : (campaigns ?? []).filter((c) => c.status === filterStatus);

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className={`flex items-center justify-between gap-3 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
          {(['all', 'active', 'draft', 'paused', 'completed', 'archived'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filterStatus === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border text-muted-foreground hover:border-primary/40'
              }`}
            >
              {s === 'all'
                ? isRTL ? 'הכל' : 'All'
                : isRTL
                ? STATUS_CONFIG[s].labelHe
                : STATUS_CONFIG[s].labelEn}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={onCreate} className="h-9 gap-1.5">
          <Plus size={15} />
          {isRTL ? 'קמפיין חדש' : 'Create Campaign'}
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
            <Send size={24} className="text-muted-foreground" />
          </div>
          <p className="font-medium">
            {isRTL ? 'אין קמפיינים עדיין' : 'No campaigns yet'}
          </p>
          <p className="text-sm text-muted-foreground max-w-xs">
            {isRTL
              ? 'צור קמפיין חימום ראשון כדי לשמור על קשר עם המועמדים שלך'
              : 'Create your first nurture campaign to stay in touch with your candidates'}
          </p>
          <Button size="sm" onClick={onCreate} className="mt-2">
            <Plus size={14} className="me-1.5" />
            {isRTL ? 'צור קמפיין' : 'Create Campaign'}
          </Button>
        </div>
      )}

      {/* Grid */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((campaign) => (
            <Card
              key={campaign.id}
              className="bg-card/60 border-border/60 hover:border-primary/30 transition-colors flex flex-col"
            >
              <CardHeader className="pb-2">
                <div className={`flex items-start justify-between gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <CardTitle className="text-sm font-semibold leading-snug flex-1 line-clamp-2">
                    {campaign.name}
                  </CardTitle>
                  <StatusBadge status={campaign.status} />
                </div>
                {campaign.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {campaign.description}
                  </p>
                )}
              </CardHeader>

              <CardContent className="flex-1 pb-3 space-y-3">
                {/* Audience */}
                <div className={`flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Users size={13} className="text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">
                    {isRTL
                      ? AUDIENCE_CONFIG[campaign.target_audience]?.labelHe
                      : AUDIENCE_CONFIG[campaign.target_audience]?.labelEn}
                  </span>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-muted/40 rounded-lg p-2 text-center">
                    <p className="text-base font-bold">{campaign.total_enrolled}</p>
                    <p className="text-xs text-muted-foreground">
                      {isRTL ? 'נרשמו' : 'Enrolled'}
                    </p>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-2 text-center">
                    <p className="text-base font-bold">{campaign.open_rate}%</p>
                    <p className="text-xs text-muted-foreground">
                      {isRTL ? 'פתיחות' : 'Open Rate'}
                    </p>
                  </div>
                </div>

                {/* Mini progress bars */}
                <div className="space-y-1.5">
                  <div>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-muted-foreground">{isRTL ? 'שיעור תגובה' : 'Reply Rate'}</span>
                      <span>{campaign.reply_rate}%</span>
                    </div>
                    <ProgressBar value={campaign.reply_rate} color="bg-purple-500" />
                  </div>
                </div>
              </CardContent>

              {/* Actions */}
              <div className={`px-4 pb-4 flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={() => onEdit(campaign)}
                >
                  <Pencil size={12} className="me-1" />
                  {isRTL ? 'ערוך' : 'Edit'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={() => setStatsDialogCampaign(campaign)}
                >
                  <BarChart2 size={12} className="me-1" />
                  {isRTL ? 'סטטיסטיקות' : 'Stats'}
                </Button>
                {campaign.status === 'active' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-yellow-400 hover:text-yellow-300"
                    title={isRTL ? 'השהה' : 'Pause'}
                    onClick={() =>
                      toggleStatusMutation.mutate({ id: campaign.id, status: 'paused' })
                    }
                  >
                    <Pause size={13} />
                  </Button>
                )}
                {campaign.status === 'paused' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-green-400 hover:text-green-300"
                    title={isRTL ? 'הפעל' : 'Resume'}
                    onClick={() =>
                      toggleStatusMutation.mutate({ id: campaign.id, status: 'active' })
                    }
                  >
                    <Play size={13} />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Stats dialog */}
      <Dialog open={!!statsDialogCampaign} onOpenChange={(o) => !o && setStatsDialogCampaign(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className={isRTL ? 'text-right' : ''}>
              {statsDialogCampaign?.name}
            </DialogTitle>
          </DialogHeader>
          {statsDialogCampaign && (
            <CampaignStatsView campaign={statsDialogCampaign} isRTL={isRTL} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Root Component ────────────────────────────────────────────────────────────

export function NurtureCampaignBuilder() {
  const { language } = useLanguage();
  const isRTL = language === 'he';

  const [view, setView] = useState<'list' | 'editor'>('list');
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setView('editor');
  };

  const handleCreate = () => {
    setEditingCampaign(null);
    setView('editor');
  };

  const handleBack = () => {
    setEditingCampaign(null);
    setView('list');
  };

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Page header */}
      <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Send size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold leading-tight">
            {isRTL ? 'קמפיין חימום מועמדים' : 'Candidate Nurture Campaigns'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isRTL
              ? 'בנה רצפי הודעות אוטומטיים לשמירה על קשר עם מועמדים'
              : 'Build automated message sequences to stay connected with candidates'}
          </p>
        </div>
      </div>

      {/* Main content */}
      {view === 'list' ? (
        <CampaignsList
          isRTL={isRTL}
          onEdit={handleEdit}
          onCreate={handleCreate}
        />
      ) : (
        <CampaignEditor
          editingCampaign={editingCampaign}
          isRTL={isRTL}
          onBack={handleBack}
        />
      )}
    </div>
  );
}

export default NurtureCampaignBuilder;
