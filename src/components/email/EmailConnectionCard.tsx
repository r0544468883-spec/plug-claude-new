import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, CheckCircle2, XCircle, Loader2, RefreshCw, Unlink } from 'lucide-react';
import { toast } from 'sonner';

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

  // Handle OAuth callback params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('email_connected') === 'true') {
      const provider = params.get('provider') || '';
      toast.success(
        isHebrew
          ? `חשבון ${provider === 'gmail' ? 'Gmail' : 'Outlook'} חובר בהצלחה!`
          : `${provider === 'gmail' ? 'Gmail' : 'Outlook'} connected successfully!`
      );
      window.history.replaceState({}, '', window.location.pathname);
      queryClient.invalidateQueries({ queryKey: ['email-oauth-tokens'] });
    } else if (params.get('email_error')) {
      toast.error(isHebrew ? 'שגיאה בחיבור מייל' : 'Email connection failed');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

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

  const connectGmail = () => {
    if (!GOOGLE_CLIENT_ID) {
      toast.error(isHebrew ? 'Google Client ID לא מוגדר' : 'Google Client ID not configured');
      return;
    }
    const state = `${user?.id}:gmail`;
    const scopes = 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly';
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${state}&access_type=offline&prompt=consent`;
    window.location.href = url;
  };

  const connectOutlook = () => {
    if (!MICROSOFT_CLIENT_ID) {
      toast.error(isHebrew ? 'Microsoft Client ID לא מוגדר' : 'Microsoft Client ID not configured');
      return;
    }
    const state = `${user?.id}:outlook`;
    const scopes = 'Mail.Send Mail.Read offline_access User.Read';
    const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${MICROSOFT_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${state}`;
    window.location.href = url;
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
      <div>
        {token ? (
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

        {(gmailToken || outlookToken) && (
          <div className="pt-2 text-xs text-muted-foreground flex items-center gap-1">
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
