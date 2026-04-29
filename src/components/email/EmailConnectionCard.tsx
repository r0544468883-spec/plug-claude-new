import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, CheckCircle2, XCircle, Loader2, RefreshCw, Unlink, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { FollowUpReminder } from './FollowUpReminder';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const MICROSOFT_CLIENT_ID = import.meta.env.VITE_MICROSOFT_CLIENT_ID || '';
const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/connect-email-callback`;

export function EmailConnectionCard() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isHebrew = language === 'he';
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Handle OAuth popup postMessage
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type !== 'PLUG_OAUTH_SUCCESS') return;
      const { provider } = e.data;
      if (provider === 'gmail' || provider === 'outlook') {
        toast.success(
          isHebrew
            ? `${provider === 'gmail' ? 'Gmail' : 'Outlook'} חובר בהצלחה!`
            : `${provider === 'gmail' ? 'Gmail' : 'Outlook'} connected successfully!`
        );
        queryClient.invalidateQueries({ queryKey: ['email-oauth-tokens'] });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [isHebrew]);

  const { data: tokens, isLoading } = useQuery({
    queryKey: ['email-oauth-tokens', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('email_oauth_tokens')
        .select('provider, email_address, sync_enabled, last_synced_at, created_at')
        .eq('user_id', user?.id);
      if (error) throw error;
      return data as Array<{
        provider: string;
        email_address: string;
        sync_enabled: boolean;
        last_synced_at: string | null;
        created_at: string;
      }>;
    },
    enabled: !!user?.id,
  });

  const gmailToken = tokens?.find(t => t.provider === 'gmail');
  const outlookToken = tokens?.find(t => t.provider === 'outlook');

  // Unmatched job emails that need manual review (Feature 1)
  const { data: unmatchedEmails } = useQuery({
    queryKey: ['unmatched-emails', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('application_emails')
        .select('id, subject, from_email, created_at')
        .eq('user_id', user?.id)
        .eq('needs_review', true)
        .is('application_id', null)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as Array<{ id: string; subject: string; from_email: string; created_at: string }>;
    },
    enabled: !!user?.id && (tokens?.length ?? 0) > 0,
  });

  const connectGmail = () => {
    if (!GOOGLE_CLIENT_ID) {
      toast.error(isHebrew ? 'Google Client ID לא מוגדר' : 'Google Client ID not configured');
      return;
    }
    const state = `${user?.id}:gmail`;
    const scopes = 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${state}&access_type=offline&prompt=consent`;
    const popup = window.open(url, '_blank', 'width=600,height=700');
    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      toast.error(isHebrew ? 'הדפדפן חסם את החלון — אפשר popups לאתר זה ונסה שוב' : 'Browser blocked the popup — allow popups and try again');
    }
  };

  const connectOutlook = () => {
    if (!MICROSOFT_CLIENT_ID) {
      toast.error(isHebrew ? 'Microsoft Client ID לא מוגדר' : 'Microsoft Client ID not configured');
      return;
    }
    const state = `${user?.id}:outlook`;
    const scopes = 'Mail.Send Mail.Read offline_access User.Read';
    const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${MICROSOFT_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${state}`;
    const popupO = window.open(url, '_blank', 'width=600,height=700');
    if (!popupO || popupO.closed || typeof popupO.closed === 'undefined') {
      toast.error(isHebrew ? 'הדפדפן חסם את החלון — אפשר popups לאתר זה ונסה שוב' : 'Browser blocked the popup — allow popups and try again');
    }
  };

  const disconnect = async (provider: string) => {
    setDisconnecting(provider);
    try {
      const { error } = await (supabase as any)
        .from('email_oauth_tokens')
        .delete()
        .eq('user_id', user?.id)
        .eq('provider', provider);
      if (error) throw error;
      toast.success(isHebrew ? 'החשבון נותק בהצלחה' : 'Account disconnected');
      queryClient.invalidateQueries({ queryKey: ['email-oauth-tokens'] });
    } catch {
      toast.error(isHebrew ? 'שגיאה בניתוק' : 'Error disconnecting');
    } finally {
      setDisconnecting(null);
    }
  };

  const doSync = useCallback(async (silent = false, forceFull = false) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/sync-emails`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user_id: user?.id, force_full: forceFull }),
        }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!silent) {
        toast.success(
          isHebrew
            ? `סונכרנו ${data.synced || 0} מיילים חדשים`
            : `Synced ${data.synced || 0} new emails`
        );
      }
      queryClient.invalidateQueries({ queryKey: ['email-oauth-tokens'] });
    } catch (err: any) {
      if (!silent) {
        toast.error(isHebrew ? 'שגיאה בסנכרון' : 'Sync failed');
      }
      console.error('Sync error:', err);
    }
  }, [user?.id, isHebrew, queryClient]);

  const syncNow = async () => {
    setSyncing(true);
    // First sync is always force_full to catch all recent emails
    await doSync(false, true);
    setSyncing(false);
  };

  // Auto-sync every 15 minutes when email is connected
  const autoSyncRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    const hasConnectedEmail = tokens?.some(t => t.sync_enabled);
    if (hasConnectedEmail) {
      // Initial sync on mount (silent)
      doSync(true);
      // Then every 15 minutes
      autoSyncRef.current = setInterval(() => doSync(true), 15 * 60 * 1000);
    }
    return () => {
      if (autoSyncRef.current) clearInterval(autoSyncRef.current);
    };
  }, [tokens, doSync]);

  const renderProviderCard = (
    provider: 'gmail' | 'outlook',
    token: typeof gmailToken,
    connectFn: () => void,
    label: string,
    color: string
  ) => (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${color}`}>
          <Mail className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-medium text-sm">{label}</p>
          {token ? (
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">{token.email_address}</p>
              <Badge className="gap-1 bg-green-500/20 text-green-700 border-green-500/30 text-xs">
                <CheckCircle2 className="w-2.5 h-2.5" />
                {isHebrew ? 'מחובר' : 'Connected'}
              </Badge>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <XCircle className="w-3 h-3" />
              {isHebrew ? 'לא מחובר' : 'Not connected'}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {token ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={syncNow}
              disabled={syncing}
              className="text-primary"
            >
              {syncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-1" />
                  {isHebrew ? 'סנכרן' : 'Sync'}
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => disconnect(provider)}
              disabled={disconnecting === provider}
              className="text-destructive hover:text-destructive"
            >
              {disconnecting === provider ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Unlink className="w-4 h-4 mr-1" />
                  {isHebrew ? 'נתק' : 'Disconnect'}
                </>
              )}
            </Button>
          </>
        ) : (
          <Button variant="outline" size="sm" onClick={connectFn}>
            {isHebrew ? 'חבר' : 'Connect'}
          </Button>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Mail className="w-5 h-5 text-primary" />
          {isHebrew ? 'חיבור מייל' : 'Email Connection'}
        </CardTitle>
        <CardDescription>
          {isHebrew
            ? 'חבר את חשבון המייל שלך לשליחה וקבלת מיילים ישירות מהמערכת'
            : 'Connect your email account to send and receive emails directly from the platform'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {renderProviderCard('gmail', gmailToken, connectGmail, 'Gmail', 'bg-red-500')}
        {renderProviderCard('outlook', outlookToken, connectOutlook, 'Outlook', 'bg-blue-600')}

        <FollowUpReminder />

        {unmatchedEmails && unmatchedEmails.length > 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {isHebrew
                ? `${unmatchedEmails.length} מיילים לא זוהו — נדרשת תשומת לב`
                : `${unmatchedEmails.length} email${unmatchedEmails.length > 1 ? 's' : ''} couldn't be matched to an application`}
            </div>
            <ul className="space-y-1">
              {unmatchedEmails.slice(0, 3).map(e => (
                <li key={e.id} className="text-xs text-muted-foreground truncate">
                  <span className="font-medium text-foreground">{e.from_email}</span>
                  {' — '}{e.subject}
                </li>
              ))}
              {unmatchedEmails.length > 3 && (
                <li className="text-xs text-muted-foreground">
                  {isHebrew ? `ועוד ${unmatchedEmails.length - 3}...` : `and ${unmatchedEmails.length - 3} more...`}
                </li>
              )}
            </ul>
            <p className="text-xs text-muted-foreground">
              {isHebrew
                ? 'עבור לטאב "מיילים" בדף המשרה הרלוונטית וקשר ידנית'
                : 'Go to the relevant application\'s "Emails" tab to link manually'}
            </p>
          </div>
        )}

        {(gmailToken || outlookToken) && (
          <div className="pt-2 text-xs text-muted-foreground flex items-center gap-1" data-tour="email-digest">
            <RefreshCw className="w-3 h-3" />
            {isHebrew
              ? 'מיילים נסרקים כל 15 דקות אוטומטית'
              : 'Emails are synced automatically every 15 minutes'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
