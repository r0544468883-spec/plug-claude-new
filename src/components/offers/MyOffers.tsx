import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Gift,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  Briefcase,
  DollarSign,
  Calendar,
  Loader2,
  Inbox,
  AlertTriangle,
} from 'lucide-react';

const CURRENCY_SYMBOLS: Record<string, string> = { ILS: '₪', USD: '$', EUR: '€' };

const benefitLabels: Record<string, { he: string; en: string }> = {
  car: { he: 'רכב', en: 'Company Car' },
  vacation: { he: 'ימי חופשה', en: 'Vacation Days' },
  health: { he: 'ביטוח בריאות', en: 'Health Insurance' },
  training: { he: 'הכשרות', en: 'Training Budget' },
  bonus: { he: 'בונוס', en: 'Bonus' },
  stock: { he: 'אופציות', en: 'Stock Options' },
  wfh: { he: 'עבודה מהבית', en: 'Work From Home' },
  other: { he: 'אחר', en: 'Other' },
};

const statusConfig: Record<string, { labelHe: string; labelEn: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  sent: { labelHe: 'ממתין לתגובה', labelEn: 'Pending', variant: 'secondary' },
  viewed: { labelHe: 'נצפה', labelEn: 'Viewed', variant: 'outline' },
  accepted: { labelHe: 'התקבל', labelEn: 'Accepted', variant: 'default' },
  declined: { labelHe: 'נדחה', labelEn: 'Declined', variant: 'destructive' },
  expired: { labelHe: 'פג תוקף', labelEn: 'Expired', variant: 'outline' },
  countered: { labelHe: 'הצעה נגדית', labelEn: 'Countered', variant: 'secondary' },
};

export function MyOffers() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const queryClient = useQueryClient();

  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [responseType, setResponseType] = useState<'accept' | 'decline' | null>(null);
  const [responseNote, setResponseNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: offers, isLoading } = useQuery({
    queryKey: ['my-offers', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('offers')
        .select('*, jobs(title, location, company:companies(name, logo_url))')
        .eq('candidate_id', user!.id)
        .neq('status', 'draft')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Mark unseen offers as viewed
      const unseenIds = (data || [])
        .filter((o: any) => o.status === 'sent')
        .map((o: any) => o.id);

      if (unseenIds.length > 0) {
        await (supabase as any)
          .from('offers')
          .update({ status: 'viewed' })
          .in('id', unseenIds);
      }

      return data || [];
    },
    enabled: !!user?.id,
  });

  const handleRespond = async () => {
    if (!respondingId || !responseType) return;

    setSubmitting(true);
    try {
      const newStatus = responseType === 'accept' ? 'accepted' : 'declined';

      const { error } = await (supabase as any)
        .from('offers')
        .update({
          status: newStatus,
          candidate_response: responseNote || null,
        })
        .eq('id', respondingId);

      if (error) throw error;

      toast.success(
        responseType === 'accept'
          ? isHebrew ? 'ההצעה התקבלה!' : 'Offer accepted!'
          : isHebrew ? 'ההצעה נדחתה' : 'Offer declined'
      );

      queryClient.invalidateQueries({ queryKey: ['my-offers'] });
      setRespondingId(null);
      setResponseType(null);
      setResponseNote('');
    } catch (e) {
      console.error(e);
      toast.error(isHebrew ? 'שגיאה' : 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  const activeOffer = offers?.find((o: any) => o.id === respondingId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (!offers || offers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center" dir={isHebrew ? 'rtl' : 'ltr'}>
        <Inbox className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-semibold mb-1">
          {isHebrew ? 'אין הצעות עבודה' : 'No Job Offers'}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {isHebrew
            ? 'כשמגייס ישלח לך הצעת עבודה, היא תופיע כאן.'
            : 'When a recruiter sends you a job offer, it will appear here.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir={isHebrew ? 'rtl' : 'ltr'}>
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Gift className="w-5 h-5 text-primary" />
        {isHebrew ? 'הצעות עבודה' : 'Job Offers'}
        {offers.filter((o: any) => o.status === 'sent' || o.status === 'viewed').length > 0 && (
          <Badge className="bg-primary/10 text-primary">
            {offers.filter((o: any) => o.status === 'sent' || o.status === 'viewed').length}{' '}
            {isHebrew ? 'פתוחות' : 'pending'}
          </Badge>
        )}
      </h2>

      {offers.map((offer: any) => {
        const job = offer.jobs;
        const company = job?.company;
        const currSymbol = CURRENCY_SYMBOLS[offer.salary_currency] || offer.salary_currency;
        const status = statusConfig[offer.status] || statusConfig.sent;
        const isExpired = offer.expiry_date && new Date(offer.expiry_date) < new Date() && offer.status !== 'accepted' && offer.status !== 'declined';
        const canRespond = ['sent', 'viewed'].includes(offer.status) && !isExpired;

        return (
          <Card
            key={offer.id}
            className={`border transition-colors ${
              canRespond ? 'border-primary/30 bg-primary/5' : 'border-border'
            }`}
          >
            <CardContent className="p-5 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {company?.logo_url ? (
                      <img src={company.logo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <Building2 className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">{job?.title || (isHebrew ? 'משרה' : 'Position')}</p>
                    <p className="text-sm text-muted-foreground">{company?.name || ''}</p>
                  </div>
                </div>
                <Badge variant={isExpired ? 'outline' : status.variant}>
                  {isExpired
                    ? isHebrew ? 'פג תוקף' : 'Expired'
                    : isHebrew ? status.labelHe : status.labelEn}
                </Badge>
              </div>

              {/* Salary */}
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <span className="font-bold text-lg">
                    {currSymbol}{offer.salary_gross?.toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {isHebrew ? '/ חודש' : '/ month'}
                  </span>
                </div>

                {offer.start_date && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    {isHebrew ? 'התחלה: ' : 'Start: '}
                    {format(new Date(offer.start_date), 'PP', { locale: isHebrew ? he : enUS })}
                  </div>
                )}

                {offer.expiry_date && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    {isHebrew ? 'תוקף: ' : 'Expires: '}
                    {format(new Date(offer.expiry_date), 'PP', { locale: isHebrew ? he : enUS })}
                  </div>
                )}
              </div>

              {/* Benefits */}
              {offer.benefits && offer.benefits.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {offer.benefits.map((b: any, i: number) => {
                    const label = benefitLabels[b.type];
                    return (
                      <Badge key={i} variant="outline" className="text-xs gap-1">
                        {isHebrew ? label?.he || b.type : label?.en || b.type}
                        {b.value && `: ${b.value}`}
                      </Badge>
                    );
                  })}
                </div>
              )}

              {/* Additional Terms */}
              {offer.additional_terms && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {offer.additional_terms}
                </p>
              )}

              {/* Expiry Warning */}
              {isExpired && (
                <div className="flex items-center gap-2 text-amber-600 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  {isHebrew ? 'ההצעה פגה תוקף' : 'This offer has expired'}
                </div>
              )}

              {/* Response Actions */}
              {canRespond && (
                <>
                  <Separator />
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 gap-2"
                      onClick={() => {
                        setRespondingId(offer.id);
                        setResponseType('accept');
                      }}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {isHebrew ? 'קבל הצעה' : 'Accept Offer'}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={() => {
                        setRespondingId(offer.id);
                        setResponseType('decline');
                      }}
                    >
                      <XCircle className="w-4 h-4" />
                      {isHebrew ? 'דחה הצעה' : 'Decline Offer'}
                    </Button>
                  </div>
                </>
              )}

              {/* Candidate response */}
              {offer.candidate_response && (
                <div className="bg-muted/30 p-3 rounded-lg text-sm">
                  <p className="font-medium text-xs text-muted-foreground mb-1">
                    {isHebrew ? 'התגובה שלך:' : 'Your response:'}
                  </p>
                  <p>{offer.candidate_response}</p>
                </div>
              )}

              {/* Timestamp */}
              <p className="text-xs text-muted-foreground">
                {isHebrew ? 'נשלח: ' : 'Sent: '}
                {format(new Date(offer.sent_at || offer.created_at), 'PPp', {
                  locale: isHebrew ? he : enUS,
                })}
              </p>
            </CardContent>
          </Card>
        );
      })}

      {/* Response Confirmation Dialog */}
      <Dialog
        open={!!respondingId && !!responseType}
        onOpenChange={(open) => {
          if (!open) {
            setRespondingId(null);
            setResponseType(null);
            setResponseNote('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md" dir={isHebrew ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {responseType === 'accept' ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-destructive" />
              )}
              {responseType === 'accept'
                ? isHebrew ? 'קבלת הצעה' : 'Accept Offer'
                : isHebrew ? 'דחיית הצעה' : 'Decline Offer'}
            </DialogTitle>
            <DialogDescription>
              {responseType === 'accept'
                ? isHebrew
                  ? `האם את/ה בטוח/ה שברצונך לקבל את ההצעה ל-${activeOffer?.jobs?.title || 'משרה'}?`
                  : `Are you sure you want to accept the offer for ${activeOffer?.jobs?.title || 'this position'}?`
                : isHebrew
                  ? 'אפשר להוסיף הערה למגייס (אופציונלי).'
                  : 'You can add a note to the recruiter (optional).'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Textarea
              value={responseNote}
              onChange={(e) => setResponseNote(e.target.value)}
              placeholder={
                responseType === 'accept'
                  ? isHebrew ? 'הערות (אופציונלי)...' : 'Notes (optional)...'
                  : isHebrew ? 'סיבת הדחייה (אופציונלי)...' : 'Reason for declining (optional)...'
              }
              rows={3}
              className="resize-none"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setRespondingId(null);
                setResponseType(null);
                setResponseNote('');
              }}
              disabled={submitting}
            >
              {isHebrew ? 'ביטול' : 'Cancel'}
            </Button>
            <Button
              variant={responseType === 'accept' ? 'default' : 'destructive'}
              onClick={handleRespond}
              disabled={submitting}
              className="gap-2"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : responseType === 'accept' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              {responseType === 'accept'
                ? isHebrew ? 'אשר קבלה' : 'Confirm Accept'
                : isHebrew ? 'אשר דחייה' : 'Confirm Decline'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
