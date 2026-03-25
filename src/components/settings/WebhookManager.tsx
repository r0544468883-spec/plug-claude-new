import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Webhook, Plus, Trash2, Copy, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';

const WEBHOOK_EVENTS = [
  'application.created',
  'application.status_changed',
  'offer.sent',
  'offer.accepted',
  'offer.declined',
  'interview.scheduled',
  'candidate.hired',
];

export function WebhookManager() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchWebhooks(); }, [user]);

  const fetchWebhooks = async () => {
    if (!user) return;
    setIsLoading(true);
    const { data } = await supabase
      .from('webhook_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setWebhooks(data || []);
    setIsLoading(false);
  };

  const addWebhook = async () => {
    if (!url || !selectedEvents.length) {
      toast.error(isHebrew ? 'נדרש URL ולפחות אירוע אחד' : 'URL and at least one event required');
      return;
    }
    if (!url.startsWith('https://')) {
      toast.error(isHebrew ? 'URL חייב להתחיל ב-https://' : 'URL must start with https://');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('webhook_subscriptions').insert({
      user_id: user!.id,
      url,
      events: selectedEvents,
    });
    if (error) toast.error(error.message);
    else {
      toast.success(isHebrew ? 'Webhook נוסף!' : 'Webhook added!');
      setOpen(false);
      setUrl('');
      setSelectedEvents([]);
      fetchWebhooks();
    }
    setSaving(false);
  };

  const deleteWebhook = async (id: string) => {
    await supabase.from('webhook_subscriptions').delete().eq('id', id);
    toast.success(isHebrew ? 'Webhook נמחק' : 'Webhook deleted');
    fetchWebhooks();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('webhook_subscriptions').update({ is_active: !current }).eq('id', id);
    fetchWebhooks();
  };

  const copySecret = (secret: string) => {
    navigator.clipboard.writeText(secret);
    toast.success(isHebrew ? 'Secret הועתק!' : 'Secret copied!');
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Webhook className="w-5 h-5 text-primary" />
          {isHebrew ? 'ניהול Webhooks' : 'Webhook Manager'}
        </CardTitle>
        <CardDescription>
          {isHebrew ? 'קבל עדכונים בזמן אמת למערכות חיצוניות' : 'Receive real-time updates to external systems'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" />
              {isHebrew ? 'הוסף Webhook' : 'Add Webhook'}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isHebrew ? 'הוסף Webhook חדש' : 'Add New Webhook'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>URL</Label>
                <Input
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://your-server.com/webhook"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>{isHebrew ? 'אירועים' : 'Events'}</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {WEBHOOK_EVENTS.map(ev => (
                    <div key={ev} className="flex items-center gap-2">
                      <Checkbox
                        id={ev}
                        checked={selectedEvents.includes(ev)}
                        onCheckedChange={checked => {
                          setSelectedEvents(prev =>
                            checked ? [...prev, ev] : prev.filter(e => e !== ev)
                          );
                        }}
                      />
                      <Label htmlFor={ev} className="font-mono text-sm cursor-pointer">{ev}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={addWebhook} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
                {isHebrew ? 'שמור' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {isLoading ? (
          <div className="text-center text-muted-foreground py-4">{isHebrew ? 'טוען...' : 'Loading...'}</div>
        ) : webhooks.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Webhook className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{isHebrew ? 'אין webhooks עדיין' : 'No webhooks yet'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {webhooks.map((wh) => (
              <div key={wh.id} className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
                <div className="flex items-center justify-between">
                  <code className="text-xs truncate max-w-[200px] text-muted-foreground">{wh.url}</code>
                  <div className="flex items-center gap-2">
                    {wh.is_active ? (
                      <Badge className="bg-green-500/20 text-green-400 gap-1"><CheckCircle2 className="w-3 h-3" />Active</Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1"><XCircle className="w-3 h-3" />Paused</Badge>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleActive(wh.id, wh.is_active)}>
                      {wh.is_active ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteWebhook(wh.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(wh.events || []).map((ev: string) => (
                    <Badge key={ev} variant="outline" className="text-xs font-mono">{ev}</Badge>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{isHebrew ? 'Secret:' : 'Secret:'}</span>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded truncate max-w-[120px]">
                    {wh.secret?.substring(0, 16)}...
                  </code>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copySecret(wh.secret)}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                {wh.fail_count > 0 && (
                  <p className="text-xs text-destructive">{isHebrew ? `נכשל ${wh.fail_count} פעמים` : `Failed ${wh.fail_count} times`}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
