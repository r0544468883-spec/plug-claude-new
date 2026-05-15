import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MessageSquare, Hash, Webhook, Trash2, Save, Send,
  Loader2, Plus, ShieldAlert, Eye, EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface IntegrationsPanelProps {
  hubId: string;
  isAdmin: boolean;
}

type Provider = 'slack' | 'teams' | 'discord';

const PROVIDERS: { key: Provider; label: string; labelHe: string; icon: typeof MessageSquare; color: string }[] = [
  { key: 'slack', label: 'Slack', labelHe: 'Slack', icon: MessageSquare, color: 'text-[#4A154B]' },
  { key: 'teams', label: 'Microsoft Teams', labelHe: 'Microsoft Teams', icon: Hash, color: 'text-[#6264A7]' },
  { key: 'discord', label: 'Discord', labelHe: 'Discord', icon: Webhook, color: 'text-[#5865F2]' },
];

const EVENT_TYPES = [
  { key: 'new_post', label: 'New Post', labelHe: 'פוסט חדש' },
  { key: 'new_event', label: 'New Event', labelHe: 'אירוע חדש' },
  { key: 'new_course', label: 'New Course', labelHe: 'קורס חדש' },
  { key: 'new_member', label: 'New Member', labelHe: 'חבר חדש' },
  { key: 'mentorship_match', label: 'Mentorship Match', labelHe: 'התאמת מנטורינג' },
];

const t = (isRTL: boolean, en: string, he: string) => (isRTL ? he : en);

export function IntegrationsPanel({ hubId, isAdmin }: IntegrationsPanelProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const queryClient = useQueryClient();

  const [editDrafts, setEditDrafts] = useState<Record<string, any>>({});
  const [revealedUrls, setRevealedUrls] = useState<Record<string, boolean>>({});

  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ['community-integrations', hubId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('community_integrations')
        .select('*')
        .eq('hub_id', hubId)
        .order('created_at', { ascending: true });
      return data || [];
    },
    enabled: !!hubId && isAdmin,
  });

  const upsertMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await (supabase as any)
        .from('community_integrations')
        .upsert(payload, { onConflict: 'hub_id,provider' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_: any, vars: any) => {
      queryClient.invalidateQueries({ queryKey: ['community-integrations', hubId] });
      setEditDrafts((prev) => { const n = { ...prev }; delete n[vars.provider]; return n; });
      toast.success(t(isRTL, 'Integration saved', 'אינטגרציה נשמרה'));
    },
    onError: () => toast.error(t(isRTL, 'Failed to save', 'שמירה נכשלה')),
  });

  const deleteMutation = useMutation({
    mutationFn: async (provider: string) => {
      const { error } = await (supabase as any)
        .from('community_integrations')
        .delete()
        .eq('hub_id', hubId)
        .eq('provider', provider);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-integrations', hubId] });
      toast.success(t(isRTL, 'Integration removed', 'אינטגרציה הוסרה'));
    },
    onError: () => toast.error(t(isRTL, 'Failed to remove', 'הסרה נכשלה')),
  });

  const testMutation = useMutation({
    mutationFn: async (provider: string) => {
      const integration = integrations.find((i: any) => i.provider === provider);
      if (!integration) throw new Error('Not found');
      const { error } = await supabase.functions.invoke('test-webhook', {
        body: { hub_id: hubId, provider, webhook_url: integration.webhook_url },
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success(t(isRTL, 'Test sent!', 'בדיקה נשלחה!')),
    onError: () => toast.error(t(isRTL, 'Test failed', 'הבדיקה נכשלה')),
  });

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-sm text-muted-foreground">
            {t(isRTL, 'Only hub admins can manage integrations.', 'רק מנהלי הקהילה יכולים לנהל אינטגרציות.')}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const getDraft = (provider: Provider) => {
    if (editDrafts[provider]) return editDrafts[provider];
    const existing = integrations.find((i: any) => i.provider === provider);
    return {
      webhook_url: existing?.webhook_url || '',
      channel_name: existing?.channel_name || '',
      events: existing?.events || [],
      is_active: existing?.is_active ?? true,
    };
  };

  const updateDraft = (provider: Provider, patch: Record<string, any>) => {
    setEditDrafts((prev) => ({ ...prev, [provider]: { ...getDraft(provider), ...patch } }));
  };

  const maskUrl = (url: string) => {
    if (!url) return '';
    if (url.length <= 20) return url;
    return url.slice(0, 12) + '...' + url.slice(-8);
  };

  const handleSave = (provider: Provider) => {
    const draft = getDraft(provider);
    if (!draft.webhook_url) {
      toast.error(t(isRTL, 'Webhook URL is required', 'נדרש כתובת Webhook'));
      return;
    }
    upsertMutation.mutate({
      hub_id: hubId,
      provider,
      webhook_url: draft.webhook_url,
      channel_name: draft.channel_name,
      events: draft.events,
      is_active: draft.is_active,
      created_by: user?.id,
    });
  };

  const toggleEvent = (provider: Provider, eventKey: string) => {
    const draft = getDraft(provider);
    const events: string[] = draft.events || [];
    const updated = events.includes(eventKey)
      ? events.filter((e: string) => e !== eventKey)
      : [...events, eventKey];
    updateDraft(provider, { events: updated });
  };

  const isConnected = (provider: Provider) =>
    integrations.some((i: any) => i.provider === provider && i.webhook_url);

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Webhook className="w-5 h-5" />
          {t(isRTL, 'Integrations', 'אינטגרציות')}
        </h3>
        <Badge variant="outline" className="text-xs">
          {integrations.filter((i: any) => i.is_active).length}/{PROVIDERS.length}{' '}
          {t(isRTL, 'active', 'פעילות')}
        </Badge>
      </div>

      {PROVIDERS.map(({ key, label, labelHe, icon: Icon, color }) => {
        const draft = getDraft(key);
        const connected = isConnected(key);
        const revealed = revealedUrls[key] || false;

        return (
          <Card key={key}>
            <CardContent className="p-4 space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={cn('w-5 h-5', color)} />
                  <span className="font-medium text-sm">{isRTL ? labelHe : label}</span>
                  <Badge variant={connected ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                    {connected
                      ? t(isRTL, 'Connected', 'מחובר')
                      : t(isRTL, 'Disconnected', 'מנותק')}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`active-${key}`} className="text-xs text-muted-foreground">
                    {t(isRTL, 'Active', 'פעיל')}
                  </Label>
                  <Switch
                    id={`active-${key}`}
                    checked={draft.is_active}
                    onCheckedChange={(v: boolean) => updateDraft(key, { is_active: v })}
                  />
                </div>
              </div>

              {/* Webhook URL */}
              <div className="space-y-1">
                <Label className="text-xs">{t(isRTL, 'Webhook URL', 'כתובת Webhook')}</Label>
                <div className="flex gap-2">
                  <Input
                    type={connected && !revealed ? 'text' : 'url'}
                    placeholder="https://hooks.example.com/..."
                    value={connected && !revealed ? maskUrl(draft.webhook_url) : draft.webhook_url}
                    onChange={(e) => updateDraft(key, { webhook_url: e.target.value })}
                    onFocus={() => setRevealedUrls((p) => ({ ...p, [key]: true }))}
                    className="text-xs"
                    dir="ltr"
                  />
                  {connected && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-9 w-9"
                      onClick={() => setRevealedUrls((p) => ({ ...p, [key]: !p[key] }))}
                    >
                      {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  )}
                </div>
              </div>

              {/* Channel name */}
              <div className="space-y-1">
                <Label className="text-xs">{t(isRTL, 'Channel Name', 'שם ערוץ')}</Label>
                <Input
                  placeholder={t(isRTL, '#כללי', '#general')}
                  value={draft.channel_name}
                  onChange={(e) => updateDraft(key, { channel_name: e.target.value })}
                  className="text-xs"
                  dir="ltr"
                />
              </div>

              {/* Event toggles */}
              <div className="space-y-1.5">
                <Label className="text-xs">{t(isRTL, 'Events', 'אירועים')}</Label>
                <div className="flex flex-wrap gap-1.5">
                  {EVENT_TYPES.map((evt) => {
                    const selected = (draft.events || []).includes(evt.key);
                    return (
                      <Badge
                        key={evt.key}
                        variant={selected ? 'default' : 'outline'}
                        className={cn(
                          'cursor-pointer text-[11px] transition-colors',
                          selected && 'bg-primary text-primary-foreground',
                        )}
                        onClick={() => toggleEvent(key, evt.key)}
                      >
                        {isRTL ? evt.labelHe : evt.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  className="gap-1 text-xs h-8"
                  onClick={() => handleSave(key)}
                  disabled={upsertMutation.isPending}
                >
                  {upsertMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  {t(isRTL, 'Save', 'שמור')}
                </Button>

                {connected && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-xs h-8"
                      onClick={() => testMutation.mutate(key)}
                      disabled={testMutation.isPending}
                    >
                      {testMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      {t(isRTL, 'Test', 'בדיקה')}
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1 text-xs h-8 text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(key)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {t(isRTL, 'Remove', 'הסר')}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Empty state — when zero integrations exist */}
      {integrations.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <Plus className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
            <p className="text-sm text-muted-foreground">
              {t(isRTL,
                'Configure a webhook above to start sending notifications to Slack, Teams, or Discord.',
                'הגדר webhook למעלה כדי להתחיל לשלוח התראות ל-Slack, Teams או Discord.'
              )}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
