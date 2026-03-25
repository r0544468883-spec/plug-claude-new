import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Settings2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Mail,
  Calendar,
  Bell,
  Webhook,
  MessageSquare,
  Linkedin,
  ExternalLink,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'connected' | 'not_configured' | 'pending';
  requiredSecrets?: string[];
  webhookUrl?: string;
  docsUrl?: string;
}

export function IntegrationStatus() {
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  // In a real app, these statuses would come from the backend
  const integrations: Integration[] = [
    {
      id: 'email',
      name: isHebrew ? 'התראות מייל' : 'Email Notifications',
      description: isHebrew 
        ? 'שליחת מיילים אוטומטיים על שינויי סטטוס'
        : 'Send automated emails for status changes',
      icon: Mail,
      status: 'not_configured',
      requiredSecrets: ['RESEND_API_KEY'],
      docsUrl: 'https://resend.com/docs'
    },
    {
      id: 'calendar',
      name: isHebrew ? 'סנכרון יומן' : 'Calendar Sync',
      description: isHebrew
        ? 'סנכרון ראיונות עם Google/Microsoft Calendar'
        : 'Sync interviews with Google/Microsoft Calendar',
      icon: Calendar,
      status: 'not_configured',
      requiredSecrets: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
      docsUrl: 'https://developers.google.com/calendar'
    },
    {
      id: 'push',
      name: isHebrew ? 'התראות Push' : 'Push Notifications',
      description: isHebrew
        ? 'קבל התראות בזמן אמת בדפדפן'
        : 'Receive real-time browser notifications',
      icon: Bell,
      status: 'not_configured',
      requiredSecrets: ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY'],
    },
    {
      id: 'webhook',
      name: 'Webhooks (Make.com / n8n / Zapier)',
      description: isHebrew
        ? 'חבר מערכות חיצוניות לקבלת עדכונים'
        : 'Connect external systems to receive updates',
      icon: Webhook,
      status: 'connected',
      webhookUrl: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-handler`,
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      description: isHebrew
        ? 'שלח הודעות WhatsApp אוטומטיות'
        : 'Send automated WhatsApp messages',
      icon: MessageSquare,
      status: 'pending',
      requiredSecrets: ['WHATSAPP_API_KEY'],
    },
    {
      id: 'linkedin',
      name: 'LinkedIn Sync',
      description: isHebrew
        ? 'ייבא נתוני פרופיל מלינקדאין'
        : 'Import profile data from LinkedIn',
      icon: Linkedin,
      status: 'not_configured',
      requiredSecrets: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'],
    }
  ];

  const getStatusBadge = (status: Integration['status']) => {
    switch (status) {
      case 'connected':
        return (
          <Badge className="gap-1 bg-green-500/20 text-green-700 border-green-500/30 dark:text-green-300">
            <CheckCircle2 className="w-3 h-3" />
            {isHebrew ? 'מחובר' : 'Connected'}
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="gap-1 bg-yellow-500/20 text-yellow-700 border-yellow-500/30 dark:text-yellow-300">
            <AlertCircle className="w-3 h-3" />
            {isHebrew ? 'ממתין' : 'Pending'}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <XCircle className="w-3 h-3" />
            {isHebrew ? 'לא מוגדר' : 'Not Configured'}
          </Badge>
        );
    }
  };

  const copyWebhookUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast.success(isHebrew ? 'כתובת הועתקה!' : 'URL copied!');
  };

  const connectedCount = integrations.filter(i => i.status === 'connected').length;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-primary" />
          {isHebrew ? 'סטטוס אינטגרציות' : 'Integration Status'}
        </CardTitle>
        <CardDescription className="flex items-center gap-2">
          {isHebrew 
            ? `${connectedCount} מתוך ${integrations.length} אינטגרציות מחוברות`
            : `${connectedCount} of ${integrations.length} integrations connected`}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {integrations.map((integration) => (
          <div
            key={integration.id}
            className="flex items-start gap-4 p-4 rounded-lg border border-border bg-muted/20"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <integration.icon className="w-5 h-5 text-primary" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium text-foreground">
                  {integration.name}
                </h4>
                {getStatusBadge(integration.status)}
              </div>
              
              <p className="text-sm text-muted-foreground mt-1">
                {integration.description}
              </p>

              {/* Required Secrets */}
              {integration.status !== 'connected' && integration.requiredSecrets && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">
                    {isHebrew ? 'סודות נדרשים:' : 'Required secrets:'}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {integration.requiredSecrets.map((secret) => (
                      <Badge key={secret} variant="outline" className="text-xs font-mono">
                        {secret}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Webhook URL */}
              {integration.webhookUrl && (
                <div className="mt-2 flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[300px]">
                    {integration.webhookUrl}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyWebhookUrl(integration.webhookUrl!)}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-3">
                {integration.docsUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    asChild
                  >
                    <a href={integration.docsUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3 h-3" />
                      {isHebrew ? 'תיעוד' : 'Docs'}
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Webhook Actions Info */}
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <h4 className="font-medium text-foreground flex items-center gap-2 mb-2">
            <Webhook className="w-4 h-4 text-primary" />
            {isHebrew ? 'פעולות Webhook זמינות' : 'Available Webhook Actions'}
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <code className="bg-muted px-2 py-1 rounded">?action=new_application</code>
            <code className="bg-muted px-2 py-1 rounded">?action=status_update</code>
            <code className="bg-muted px-2 py-1 rounded">?action=interview_scheduled</code>
            <code className="bg-muted px-2 py-1 rounded">?action=candidate_feedback</code>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
