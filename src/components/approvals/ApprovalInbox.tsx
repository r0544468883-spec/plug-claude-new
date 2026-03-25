import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Clock, Inbox } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he, enUS } from 'date-fns/locale';

const TYPE_LABELS: Record<string, { en: string; he: string }> = {
  new_job: { en: 'New Job', he: 'משרה חדשה' },
  offer: { en: 'Job Offer', he: 'הצעת עבודה' },
  budget: { en: 'Budget Request', he: 'בקשת תקציב' },
  hire: { en: 'Hire Approval', he: 'אישור גיוס' },
};

const DEMO_INCOMING = [
  { id: 'd1', request_type: 'new_job', requester: { full_name: 'ירדן כהן' }, notes: 'משרת DevOps Senior — דחוף', created_at: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: 'd2', request_type: 'offer', requester: { full_name: 'מאיה לוי' }, notes: 'הצעת שכר ₪32,000 לדנה פרידמן', created_at: new Date(Date.now() - 18 * 3600000).toISOString() },
  { id: 'd3', request_type: 'budget', requester: { full_name: 'עמית ברק' }, notes: 'תקציב לכנס HR 2026', created_at: new Date(Date.now() - 48 * 3600000).toISOString() },
];
const DEMO_OUTGOING = [
  { id: 'o1', request_type: 'hire', status: 'approved', approver: { full_name: 'CEO' } },
  { id: 'o2', request_type: 'new_job', status: 'pending', approver: { full_name: 'VP R&D' } },
];

export function ApprovalInbox() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const queryClient = useQueryClient();

  const { data: incoming = [], isLoading: loadingIncoming } = useQuery({
    queryKey: ['approval-inbox', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('approval_requests')
        .select('*, requester:profiles!approval_requests_requester_id_fkey(full_name, avatar_url)')
        .eq('approver_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: outgoing = [], isLoading: loadingOutgoing } = useQuery({
    queryKey: ['approval-outbox', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('approval_requests')
        .select('*, approver:profiles!approval_requests_approver_id_fkey(full_name)')
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const decideMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const { error } = await supabase.from('approval_requests').update({ status, decided_at: new Date().toISOString() } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.status === 'approved' ? (isHebrew ? 'אושר!' : 'Approved!') : (isHebrew ? 'נדחה' : 'Rejected'));
      queryClient.invalidateQueries({ queryKey: ['approval-inbox'] });
      queryClient.invalidateQueries({ queryKey: ['approval-outbox'] });
    },
  });

  const statusBadge = (status: string) => {
    if (status === 'approved') return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">{isHebrew ? 'אושר' : 'Approved'}</Badge>;
    if (status === 'rejected') return <Badge variant="destructive">{isHebrew ? 'נדחה' : 'Rejected'}</Badge>;
    return <Badge variant="secondary"><Clock className="w-3 h-3 me-1 inline" />{isHebrew ? 'ממתין' : 'Pending'}</Badge>;
  };

  const isDemo = incoming.length === 0 && outgoing.length === 0 && !loadingIncoming && !loadingOutgoing;
  const displayIncoming = isDemo ? DEMO_INCOMING : incoming;
  const displayOutgoing = isDemo ? DEMO_OUTGOING : outgoing;

  return (
    <div className="space-y-6" dir={isHebrew ? 'rtl' : 'ltr'}>
      {isDemo && (
        <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-600">
          ✨ {isHebrew ? 'נתוני דוגמה — בקשות אמיתיות יופיעו כשישלחו בקשות אישור' : 'Demo data — real requests appear once approval flows are used'}
        </div>
      )}

      {/* Incoming */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Inbox className="w-4 h-4 text-primary" />
            {isHebrew ? 'ממתין לאישורך' : 'Awaiting Your Approval'}
            {displayIncoming.length > 0 && <Badge variant="destructive" className="text-xs">{displayIncoming.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingIncoming ? (
            <Skeleton className="h-20" />
          ) : (
            <div className="space-y-3">
              {displayIncoming.map((req: any) => {
                const typeLabel = TYPE_LABELS[req.request_type] || { en: req.request_type, he: req.request_type };
                return (
                  <div key={req.id} className="p-3 rounded-lg bg-muted/30 border border-border space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">{isHebrew ? typeLabel.he : typeLabel.en}</Badge>
                          <span className="text-sm font-medium">{req.requester?.full_name}</span>
                        </div>
                        {req.notes && <p className="text-xs text-muted-foreground mt-1">{req.notes}</p>}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDistanceToNow(new Date(req.created_at), { addSuffix: true, locale: isHebrew ? he : enUS })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 gap-1.5"
                        onClick={() => !isDemo && decideMutation.mutate({ id: req.id, status: 'approved' })}
                        disabled={decideMutation.isPending}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                        {isHebrew ? 'אשר' : 'Approve'}
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 gap-1.5"
                        onClick={() => !isDemo && decideMutation.mutate({ id: req.id, status: 'rejected' })}
                        disabled={decideMutation.isPending}
                      >
                        <XCircle className="w-3.5 h-3.5 text-destructive" />
                        {isHebrew ? 'דחה' : 'Reject'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Outgoing */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground">{isHebrew ? 'הבקשות שלי' : 'My Requests'}</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingOutgoing ? (
            <Skeleton className="h-20" />
          ) : (
            <div className="space-y-2">
              {displayOutgoing.map((req: any) => {
                const typeLabel = TYPE_LABELS[req.request_type] || { en: req.request_type, he: req.request_type };
                return (
                  <div key={req.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/20 gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs shrink-0">{isHebrew ? typeLabel.he : typeLabel.en}</Badge>
                        <span className="text-xs text-muted-foreground truncate">→ {req.approver?.full_name}</span>
                      </div>
                    </div>
                    {statusBadge(req.status)}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
