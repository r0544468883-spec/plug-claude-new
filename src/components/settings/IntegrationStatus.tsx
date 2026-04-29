import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Settings2,
  CheckCircle2,
  XCircle,
  Mail,
  Calendar,
  Bell,
  Webhook,
  MessageSquare,
  Linkedin,
  Copy,
  Loader2,
  Unlink,
  Plus,
  Trash2,
  BellRing,
  BellOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { EmailConnectionCard } from '@/components/email/EmailConnectionCard';
import { EmailAnalytics } from '@/components/email/EmailAnalytics';
import { TemplateEditor } from '@/components/email/TemplateEditor';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const LINKEDIN_CLIENT_ID = import.meta.env.VITE_LINKEDIN_CLIENT_ID || '';

// ─── Webhook Card ───────────────────────────────────────────────
function WebhookCard() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isHebrew = language === 'he';
  const [newUrl, setNewUrl] = useState('');
  const [adding, setAdding] = useState(false);

  const { data: webhooks = [], isLoading } = useQuery({
    queryKey: ['webhook-subscriptions', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('webhook_subscriptions')
        .select('id, url, events, is_active, secret, last_triggered_at, fail_count')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const addWebhook = async () => {
    if (!newUrl.trim() || !user) return;
    setAdding(true);
    try {
      const { error } = await (supabase as any)
        .from('webhook_subscriptions')
        .insert({
          user_id: user.id,
          url: newUrl.trim(),
          events: ['new_application', 'status_update', 'interview_scheduled', 'candidate_feedback'],
          is_active: true,
        });
      if (error) throw error;
      setNewUrl('');
      toast.success(isHebrew ? 'Webhook נוסף!' : 'Webhook added!');
      queryClient.invalidateQueries({ queryKey: ['webhook-subscriptions'] });
    } catch {
      toast.error(isHebrew ? 'שגיאה בהוספת Webhook' : 'Failed to add webhook');
    } finally {
      setAdding(false);
    }
  };

  const deleteWebhook = async (id: string) => {
    const { error } = await (supabase as any)
      .from('webhook_subscriptions')
      .delete()
      .eq('id', id);
    if (error) {
      toast.error(isHebrew ? 'שגיאה במחיקה' : 'Failed to delete');
    } else {
      toast.success(isHebrew ? 'Webhook הוסר' : 'Webhook removed');
      queryClient.invalidateQueries({ queryKey: ['webhook-subscriptions'] });
    }
  };

  const toggleWebhook = async (id: string, active: boolean) => {
    await (supabase as any)
      .from('webhook_subscriptions')
      .update({ is_active: active })
      .eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['webhook-subscriptions'] });
  };

  const copySecret = async (secret: string) => {
    await navigator.clipboard.writeText(secret);
    toast.success(isHebrew ? 'Secret הועתק!' : 'Secret copied!');
  };

  const connected = webhooks.some((w: any) => w.is_active);

  return (
    <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Webhook className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h4 className="font-medium">Webhooks (Make / n8n / Zapier)</h4>
            <p className="text-xs text-muted-foreground">
              {isHebrew ? 'שלח עדכונים למערכות חיצוניות' : 'Send updates to external systems'}
            </p>
          </div>
        </div>
        {connected ? (
          <Badge className="gap-1 bg-green-500/20 text-green-700 border-green-500/30 dark:text-green-300">
            <CheckCircle2 className="w-3 h-3" />
            {isHebrew ? 'פעיל' : 'Active'}
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <XCircle className="w-3 h-3" />
            {isHebrew ? 'לא מוגדר' : 'Not configured'}
          </Badge>
        )}
      </div>

      {/* Existing webhooks */}
      {webhooks.map((wh: any) => (
        <div key={wh.id} className="flex items-center gap-2 p-2 rounded bg-muted/40 border border-border text-sm">
          <Switch checked={wh.is_active} onCheckedChange={(v) => toggleWebhook(wh.id, v)} />
          <code className="flex-1 truncate text-xs">{wh.url}</code>
          {wh.fail_count > 0 && (
            <Badge variant="destructive" className="text-xs">{wh.fail_count} fails</Badge>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copySecret(wh.secret)} title="Copy secret">
            <Copy className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteWebhook(wh.id)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      ))}

      {/* Add new webhook */}
      <div className="flex gap-2">
        <Input
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="https://hooks.zapier.com/..."
          className="text-xs h-9"
          dir="ltr"
        />
        <Button size="sm" onClick={addWebhook} disabled={adding || !newUrl.trim()} className="gap-1 shrink-0">
          {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          {isHebrew ? 'הוסף' : 'Add'}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {isHebrew
          ? 'כל webhook מקבל HMAC secret לאימות. לחץ על הקופי כדי להעתיק.'
          : 'Each webhook gets an HMAC secret for verification. Click copy to get it.'}
      </p>
    </div>
  );
}

// ─── Push Notifications Card ────────────────────────────────────
function PushNotificationsCard() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isHebrew = language === 'he';
  const [loading, setLoading] = useState(false);

  const { data: subscription } = useQuery({
    queryKey: ['push-subscription', user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('push_subscriptions')
        .select('id, endpoint, created_at')
        .eq('user_id', user?.id)
        .limit(1)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const isSubscribed = !!subscription;

  const subscribe = async () => {
    setLoading(true);
    try {
      if (!('Notification' in window)) {
        toast.error(isHebrew ? 'הדפדפן לא תומך בהתראות' : 'Browser does not support notifications');
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error(isHebrew ? 'ההרשאה נדחתה. אפשר בהגדרות הדפדפן.' : 'Permission denied. Enable in browser settings.');
        return;
      }

      // Register service worker if needed
      const reg = await navigator.serviceWorker.ready;
      const pushSub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY,
      });

      const subJson = pushSub.toJSON();
      const { data: { session } } = await supabase.auth.getSession();

      // Register in our Edge Function
      await fetch(`${SUPABASE_URL}/functions/v1/push-notifications?action=register`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: {
            endpoint: subJson.endpoint,
            keys: subJson.keys,
          },
        }),
      });

      toast.success(isHebrew ? 'התראות Push הופעלו!' : 'Push notifications enabled!');
      queryClient.invalidateQueries({ queryKey: ['push-subscription'] });
    } catch (err: any) {
      console.error('Push subscribe error:', err);
      toast.error(isHebrew ? 'שגיאה בהפעלת התראות' : 'Failed to enable notifications');
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${SUPABASE_URL}/functions/v1/push-notifications?action=unregister`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ endpoint: subscription?.endpoint }),
      });
      toast.success(isHebrew ? 'התראות Push כובו' : 'Push notifications disabled');
      queryClient.invalidateQueries({ queryKey: ['push-subscription'] });
    } catch {
      toast.error(isHebrew ? 'שגיאה בכיבוי התראות' : 'Failed to disable notifications');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{isHebrew ? 'התראות Push' : 'Push Notifications'}</h4>
            {isSubscribed ? (
              <Badge className="gap-1 bg-green-500/20 text-green-700 border-green-500/30 dark:text-green-300">
                <CheckCircle2 className="w-3 h-3" />
                {isHebrew ? 'פעיל' : 'Active'}
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                <XCircle className="w-3 h-3" />
                {isHebrew ? 'כבוי' : 'Off'}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {isHebrew ? 'קבל התראות בזמן אמת בדפדפן' : 'Receive real-time browser notifications'}
          </p>
        </div>
      </div>
      <Button
        variant={isSubscribed ? 'outline' : 'default'}
        size="sm"
        onClick={isSubscribed ? unsubscribe : subscribe}
        disabled={loading}
        className="gap-1.5 shrink-0"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isSubscribed ? (
          <BellOff className="w-4 h-4" />
        ) : (
          <BellRing className="w-4 h-4" />
        )}
        {isSubscribed
          ? (isHebrew ? 'כבה' : 'Disable')
          : (isHebrew ? 'הפעל' : 'Enable')}
      </Button>
    </div>
  );
}

// ─── Google Calendar Card ───────────────────────────────────────
function GoogleCalendarCard() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isHebrew = language === 'he';
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('gcal_connected') === 'true') {
      toast.success(isHebrew ? 'Google Calendar חובר בהצלחה!' : 'Google Calendar connected!');
      window.history.replaceState({}, '', window.location.pathname);
      queryClient.invalidateQueries({ queryKey: ['gcal-token'] });
    } else if (params.get('gcal_error')) {
      toast.error(isHebrew ? 'שגיאה בחיבור יומן Google' : 'Google Calendar connection failed');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const { data: calToken } = useQuery({
    queryKey: ['gcal-token', user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('google_calendar_tokens')
        .select('user_id, last_synced_at, scope')
        .eq('user_id', user?.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const isConnected = !!calToken;

  const connectCalendar = () => {
    if (!GOOGLE_CLIENT_ID || !user) {
      toast.error(isHebrew ? 'Google Client ID לא מוגדר' : 'Google Client ID not configured');
      return;
    }
    const redirectUri = `${SUPABASE_URL}/functions/v1/google-calendar-callback`;
    const scopes = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events';
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${user.id}&access_type=offline&prompt=consent`;
    window.location.href = url;
  };

  const syncNow = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/google-calendar-sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: user?.id }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success(isHebrew ? `סונכרנו ${data.synced || 0} אירועים` : `Synced ${data.synced || 0} events`);
      queryClient.invalidateQueries({ queryKey: ['gcal-token'] });
    } catch {
      toast.error(isHebrew ? 'שגיאה בסנכרון' : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const disconnect = async () => {
    setDisconnecting(true);
    try {
      const { error } = await (supabase as any)
        .from('google_calendar_tokens')
        .delete()
        .eq('user_id', user?.id);
      if (error) throw error;
      toast.success(isHebrew ? 'היומן נותק' : 'Calendar disconnected');
      queryClient.invalidateQueries({ queryKey: ['gcal-token'] });
    } catch {
      toast.error(isHebrew ? 'שגיאה בניתוק' : 'Error disconnecting');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Calendar className="w-5 h-5 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{isHebrew ? 'Google Calendar' : 'Google Calendar'}</h4>
            {isConnected ? (
              <Badge className="gap-1 bg-green-500/20 text-green-700 border-green-500/30 dark:text-green-300">
                <CheckCircle2 className="w-3 h-3" />
                {isHebrew ? 'מחובר' : 'Connected'}
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                <XCircle className="w-3 h-3" />
                {isHebrew ? 'לא מחובר' : 'Not connected'}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {isHebrew ? 'סנכרון ראיונות ואירועים מהיומן' : 'Sync interviews and events from your calendar'}
          </p>
          {isConnected && calToken.last_synced_at && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {isHebrew ? 'סונכרן לאחרונה: ' : 'Last synced: '}
              {new Date(calToken.last_synced_at).toLocaleString(isHebrew ? 'he-IL' : 'en-US')}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {isConnected ? (
          <>
            <Button variant="ghost" size="sm" onClick={syncNow} disabled={syncing} className="gap-1 text-primary">
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
              {isHebrew ? 'סנכרן' : 'Sync'}
            </Button>
            <Button variant="ghost" size="sm" onClick={disconnect} disabled={disconnecting} className="gap-1 text-destructive">
              {disconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
              {isHebrew ? 'נתק' : 'Disconnect'}
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={connectCalendar} className="gap-1.5">
            <Calendar className="w-4 h-4" />
            {isHebrew ? 'חבר' : 'Connect'}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── LinkedIn Card ──────────────────────────────────────────────
function LinkedInCard() {
  const { language } = useLanguage();
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const isHebrew = language === 'he';
  const [disconnecting, setDisconnecting] = useState(false);

  const isConnected = !!(profile as any)?.linkedin_connected;
  const displayName = (profile as any)?.linkedin_display_name || '';
  const picture = (profile as any)?.linkedin_picture || '';

  // Listen for OAuth popup success
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'PLUG_OAUTH_SUCCESS' && e.data?.provider === 'linkedin') {
        toast.success(isHebrew ? 'LinkedIn חובר בהצלחה!' : 'LinkedIn connected!');
        refreshProfile?.();
        queryClient.invalidateQueries({ queryKey: ['profile'] });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [isHebrew]);

  const connect = () => {
    if (!LINKEDIN_CLIENT_ID || !user) {
      toast.error(isHebrew ? 'LinkedIn Client ID לא מוגדר' : 'LinkedIn Client ID not configured');
      return;
    }
    const redirectUri = `${SUPABASE_URL}/functions/v1/linkedin-callback`;
    const scopes = 'openid profile email';
    const url = `https://www.linkedin.com/oauth/v2/authorization?client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${user.id}`;
    const popup = window.open(url, '_blank', 'width=600,height=700');
    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      toast.error(isHebrew ? 'הדפדפן חסם את החלון — אפשר popups לאתר זה ונסה שוב' : 'Browser blocked the popup — allow popups and try again');
    }
  };

  const disconnect = async () => {
    if (!user) return;
    setDisconnecting(true);
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({
          linkedin_connected: false,
          linkedin_access_token: null,
          linkedin_token_expires_at: null,
          linkedin_sub: null,
        })
        .eq('user_id', user.id);
      if (error) throw error;
      toast.success(isHebrew ? 'LinkedIn נותק' : 'LinkedIn disconnected');
      refreshProfile?.();
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch {
      toast.error(isHebrew ? 'שגיאה בניתוק' : 'Error disconnecting');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#0077B5]/10 flex items-center justify-center">
          {picture && isConnected ? (
            <img src={picture} alt="" className="w-10 h-10 rounded-lg object-cover" />
          ) : (
            <Linkedin className="w-5 h-5 text-[#0077B5]" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-medium">LinkedIn</h4>
            {isConnected ? (
              <Badge className="gap-1 bg-green-500/20 text-green-700 border-green-500/30 dark:text-green-300">
                <CheckCircle2 className="w-3 h-3" />
                {isHebrew ? 'מחובר' : 'Connected'}
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                <XCircle className="w-3 h-3" />
                {isHebrew ? 'לא מחובר' : 'Not connected'}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {isConnected && displayName
              ? displayName
              : isHebrew ? 'ייבא פרטי פרופיל מ-LinkedIn' : 'Import profile data from LinkedIn'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {isConnected ? (
          <Button variant="ghost" size="sm" onClick={disconnect} disabled={disconnecting} className="gap-1 text-destructive">
            {disconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
            {isHebrew ? 'נתק' : 'Disconnect'}
          </Button>
        ) : (
          <Button size="sm" onClick={connect} className="gap-1.5 bg-[#0077B5] hover:bg-[#006399]">
            <Linkedin className="w-4 h-4" />
            {isHebrew ? 'חבר' : 'Connect'}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Coming Soon Card ───────────────────────────────────────────
function ComingSoonCard({ icon: Icon, name, description }: {
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  description: string;
}) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20 opacity-60">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
          <Icon className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-muted-foreground">{name}</h4>
            <Badge variant="outline" className="text-xs">
              {isHebrew ? 'בקרוב' : 'Coming soon'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main IntegrationStatus ─────────────────────────────────────
export function IntegrationStatus() {
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" />
            {isHebrew ? 'אינטגרציות' : 'Integrations'}
          </CardTitle>
          <CardDescription>
            {isHebrew
              ? 'חבר שירותים חיצוניים למערכת'
              : 'Connect external services to the platform'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Gmail / Outlook — already functional */}
          <EmailConnectionCard />

          {/* Email performance analytics */}
          <EmailAnalytics />

          {/* Email Templates */}
          <TemplateEditor />

          {/* Google Calendar — functional */}
          <GoogleCalendarCard />

          {/* Push Notifications — functional */}
          <PushNotificationsCard />

          {/* Webhooks — functional */}
          <WebhookCard />

          {/* Coming Soon */}
          <ComingSoonCard
            icon={MessageSquare}
            name="WhatsApp"
            description={isHebrew ? 'שלח הודעות WhatsApp אוטומטיות' : 'Send automated WhatsApp messages'}
          />
          <LinkedInCard />
        </CardContent>
      </Card>
    </div>
  );
}
