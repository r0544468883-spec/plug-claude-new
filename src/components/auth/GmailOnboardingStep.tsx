import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PlugLogo } from '@/components/PlugLogo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, ArrowRight, ArrowLeft, Shield, Bell, Sparkles, Loader2, AlertCircle, Calendar, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const EMAIL_REDIRECT_URI = `${SUPABASE_URL}/functions/v1/connect-email-callback`;
const CALENDAR_REDIRECT_URI = `${SUPABASE_URL}/functions/v1/google-calendar-callback`;

interface GmailOnboardingStepProps {
  onSkip: () => void;
}

interface ConnectionItem {
  id: string;
  icon: typeof Mail;
  titleHe: string;
  titleEn: string;
  descHe: string;
  descEn: string;
  connected: boolean;
  loading: boolean;
  onConnect: () => void;
  available: boolean;
}

export function GmailOnboardingStep({ onSkip }: GmailOnboardingStepProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isHebrew = language === 'he';
  const ArrowBackIcon = isHebrew ? ArrowRight : ArrowLeft;

  const [gmailConnecting, setGmailConnecting] = useState(false);
  const [calendarConnecting, setCalendarConnecting] = useState(false);
  const [pushConnecting, setPushConnecting] = useState(false);
  const [gmailDone, setGmailDone] = useState(false);
  const [calendarDone, setCalendarDone] = useState(false);
  const [pushDone, setPushDone] = useState(false);

  const isGoogleAvailable = !!GOOGLE_CLIENT_ID && !!user;

  const connectGmail = () => {
    if (!GOOGLE_CLIENT_ID || !user) return;
    setGmailConnecting(true);
    const state = `${user.id}:gmail`;
    const scopes = 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly';
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(EMAIL_REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${state}&access_type=offline&prompt=consent`;
    window.location.href = url;
  };

  const connectCalendar = () => {
    if (!GOOGLE_CLIENT_ID || !user) return;
    setCalendarConnecting(true);
    const scopes = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events';
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(CALENDAR_REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${user.id}&access_type=offline&prompt=consent`;
    window.location.href = url;
  };

  const connectPush = async () => {
    setPushConnecting(true);
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
      const reg = await navigator.serviceWorker.ready;
      const pushSub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY,
      });
      const subJson = pushSub.toJSON();
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${SUPABASE_URL}/functions/v1/push-notifications?action=register`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscription: { endpoint: subJson.endpoint, keys: subJson.keys } }),
      });
      setPushDone(true);
      toast.success(isHebrew ? 'התראות Push הופעלו!' : 'Push notifications enabled!');
    } catch (err) {
      console.error('Push subscribe error:', err);
      toast.error(isHebrew ? 'שגיאה בהפעלת התראות' : 'Failed to enable notifications');
    } finally {
      setPushConnecting(false);
    }
  };

  const connections: ConnectionItem[] = [
    {
      id: 'gmail',
      icon: Mail,
      titleHe: 'Gmail — מיילים ומעקב דחיות',
      titleEn: 'Gmail — Emails & Rejection Tracking',
      descHe: 'שלח מיילים למגייסים וזהה דחיות אוטומטית',
      descEn: 'Send emails to recruiters and detect rejections automatically',
      connected: gmailDone,
      loading: gmailConnecting,
      onConnect: connectGmail,
      available: isGoogleAvailable,
    },
    {
      id: 'calendar',
      icon: Calendar,
      titleHe: 'Google Calendar — סנכרון ראיונות',
      titleEn: 'Google Calendar — Interview Sync',
      descHe: 'סנכרן ראיונות ליומן שלך אוטומטית',
      descEn: 'Sync interviews to your calendar automatically',
      connected: calendarDone,
      loading: calendarConnecting,
      onConnect: connectCalendar,
      available: isGoogleAvailable,
    },
    {
      id: 'push',
      icon: Bell,
      titleHe: 'התראות Push — עדכונים בזמן אמת',
      titleEn: 'Push Notifications — Real-time Updates',
      descHe: 'קבל התראות על סטטוס מועמדויות, הודעות וראיונות',
      descEn: 'Get notified about application status, messages and interviews',
      connected: pushDone,
      loading: pushConnecting,
      onConnect: connectPush,
      available: 'Notification' in window,
    },
  ];

  const connectedCount = connections.filter(c => c.connected).length;

  return (
    <div className="min-h-screen flex flex-col bg-background" dir={isHebrew ? 'rtl' : 'ltr'}>
      <header className="flex items-center justify-between p-4 md:p-6">
        <button
          onClick={onSkip}
          aria-label={isHebrew ? 'דלג' : 'Skip'}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px]"
        >
          <ArrowBackIcon className="w-5 h-5" />
          <span>{isHebrew ? 'דלג' : 'Skip'}</span>
        </button>
        <div />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <PlugLogo size="lg" />
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              {isHebrew ? 'שלב אחרון!' : 'One more step!'}
            </div>
            <h1 className="text-2xl font-bold mb-2">
              {isHebrew ? 'חבר את החשבונות שלך' : 'Connect your accounts'}
            </h1>
            <p className="text-muted-foreground">
              {isHebrew
                ? 'חיבור החשבונות מאפשר ל-PLUG לעקוב אחרי תהליכי הגיוס שלך אוטומטית'
                : 'Connecting your accounts lets PLUG automatically track your recruitment process'}
            </p>
          </div>

          {/* Connection cards */}
          <div className="space-y-3">
            {connections.map((c) => (
              <Card key={c.id} className={`bg-card border-border transition-all ${c.connected ? 'border-green-500/30 bg-green-500/5' : ''}`}>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className={`p-2 rounded-lg shrink-0 ${c.connected ? 'bg-green-500/10' : 'bg-primary/10'}`}>
                    {c.connected ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <c.icon className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">
                      {isHebrew ? c.titleHe : c.titleEn}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isHebrew ? c.descHe : c.descEn}
                    </p>
                  </div>
                  {c.connected ? (
                    <span className="text-xs text-green-600 font-medium shrink-0">
                      {isHebrew ? 'מחובר ✓' : 'Connected ✓'}
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={c.onConnect}
                      disabled={c.loading || !c.available}
                      className="shrink-0 gap-1.5"
                    >
                      {c.loading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <c.icon className="w-3.5 h-3.5" />
                      )}
                      {isHebrew ? 'חבר' : 'Connect'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Security note */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground">
            <Shield className="w-4 h-4 shrink-0" />
            {isHebrew
              ? 'כל החיבורים מאובטחים עם OAuth — אנחנו לא שומרים סיסמאות'
              : 'All connections are secured with OAuth — we never store passwords'}
          </div>

          {!isGoogleAvailable && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border text-sm text-muted-foreground">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {isHebrew
                ? 'חיבורי Google לא זמינים כרגע. תוכל לחבר מאוחר יותר מההגדרות.'
                : 'Google connections are not available right now. You can connect later from settings.'}
            </div>
          )}

          <div className="space-y-3 pt-2">
            <Button
              onClick={onSkip}
              className="w-full h-12 text-base gap-2"
              size="lg"
            >
              {connectedCount > 0
                ? (isHebrew ? `סיום (${connectedCount}/${connections.length} מחוברים)` : `Continue (${connectedCount}/${connections.length} connected)`)
                : (isHebrew ? 'המשך בלי חיבורים' : 'Continue without connecting')}
            </Button>

            {connectedCount === 0 && (
              <p className="text-center text-xs text-muted-foreground">
                {isHebrew
                  ? 'תוכל תמיד לחבר מהגדרות הפרופיל'
                  : 'You can always connect from your profile settings'}
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
