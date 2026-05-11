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
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  DollarSign,
  Calendar,
  MapPin,
  Loader2,
  Inbox,
  MessageSquare,
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
  sent: { labelHe: 'חדש', labelEn: 'New', variant: 'secondary' },
  viewed: { labelHe: 'נצפה', labelEn: 'Viewed', variant: 'outline' },
  accepted: { labelHe: 'אושר', labelEn: 'Acknowledged', variant: 'default' },
  declined: { labelHe: 'לא רלוונטי', labelEn: 'Not Relevant', variant: 'destructive' },
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
          ? isHebrew ? 'תודה! המגייס יקבל הודעה' : 'Thanks! The recruiter will be notified'
          : isHebrew ? 'סומן כלא רלוונטי' : 'Marked as not relevant'
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
          {isHebrew ? 'אין פרטי משרות' : 'No Job Details'}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {isHebrew
            ? 'כשמגייס ישלח לך פרטים על משרה, הם יופיעו כאן.'
            : 'When a recruiter sends you job details, they will appear here.'}
        </p>
      </div>
    );
  }

  // Parse additional_terms for structured display
  const parseTerms = (terms: string | null) => {
    if (!terms) return { lines: [], freeText: '' };
    const lines = terms.split('\n').filter(Boolean);
    return { lines };
  };

  return (
    <div className="space-y-4" dir={isHebrew ? 'rtl' : 'ltr'}>
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <FileText className="w-5 h-5 text-primary" />
        {isHebrew ? 'פרטי משרות' : 'Job Details'}
        {offers.filter((o: any) => o.status === 'sent' || o.status === 'viewed').length > 0 && (
          <Badge className="bg-primary/10 text-primary">
            {offers.filter((o: any) => o.status === 'sent' || o.status === 'viewed').length}{' '}
            {isHebrew ? 'חדשים' : 'new'}
          </Badge>
        )}
      </h2>

      {offers.map((offer: any) => {
        const job = offer.jobs;
        const company = job?.company;
        const currSymbol = CURRENCY_SYMBOLS[offer.salary_currency] || offer.salary_currency;
        const status = statusConfig[offer.status] || statusConfig.sent;
        const canRespond = ['sent', 'viewed'].includes(offer.status);
        const { lines } = parseTerms(offer.additional_terms);

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
                <Badge variant={status.variant}>
                  {isHebrew ? status.labelHe : status.labelEn}
                </Badge>
              </div>

              {/* Details Grid */}
              <div className="flex items-center gap-6 flex-wrap">
                {offer.salary_gross > 0 && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    <span className="font-bold text-lg">
                      {currSymbol}{offer.salary_gross?.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {isHebrew ? '/ חודש' : '/ month'}
                    </span>
                  </div>
                )}

                {offer.start_date && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    {isHebrew ? 'התחלה: ' : 'Start: '}
                    {format(new Date(offer.start_date), 'PP', { locale: isHebrew ? he : enUS })}
                  </div>
                )}

                {job?.location && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" />
                    {job.location}
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

              {/* Additional Terms (structured lines) */}
              {lines.length > 0 && (
                <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">
                    {isHebrew ? 'פרטים נוספים' : 'Additional Details'}
                  </p>
                  {lines.map((line: string, i: number) => (
                    <p key={i} className="text-sm text-foreground">{line}</p>
                  ))}
                </div>
              )}

              {/* Response Actions */}
              {canRespond && (
                <>
                  <Separator />
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 gap-2"
                      variant="outline"
                      onClick={() => {
                        setRespondingId(offer.id);
                        setResponseType('accept');
                      }}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {isHebrew ? 'קראתי, תודה' : 'Got it, thanks'}
                    </Button>
                    <Button
                      variant="ghost"
                      className="gap-2 text-muted-foreground"
                      onClick={() => {
                        setRespondingId(offer.id);
                        setResponseType('decline');
                      }}
                    >
                      <XCircle className="w-4 h-4" />
                      {isHebrew ? 'לא רלוונטי' : 'Not relevant'}
                    </Button>
                  </div>
                </>
              )}

              {/* Candidate response */}
              {offer.candidate_response && (
                <div className="bg-muted/30 p-3 rounded-lg text-sm">
                  <p className="font-medium text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
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

      {/* Response Dialog */}
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
                <XCircle className="w-5 h-5 text-muted-foreground" />
              )}
              {responseType === 'accept'
                ? isHebrew ? 'שלח תגובה למגייס' : 'Respond to Recruiter'
                : isHebrew ? 'סמן כלא רלוונטי' : 'Mark as Not Relevant'}
            </DialogTitle>
            <DialogDescription>
              {responseType === 'accept'
                ? isHebrew
                  ? 'אפשר להוסיף הודעה קצרה למגייס (אופציונלי)'
                  : 'You can add a short message to the recruiter (optional)'
                : isHebrew
                  ? 'אפשר להוסיף הערה למה זה לא מתאים (אופציונלי)'
                  : 'You can add a note about why it\'s not a fit (optional)'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Textarea
              value={responseNote}
              onChange={(e) => setResponseNote(e.target.value)}
              placeholder={
                responseType === 'accept'
                  ? isHebrew ? 'תודה, אשמח לשמוע עוד...' : 'Thanks, would love to hear more...'
                  : isHebrew ? 'למשל: מיקום רחוק, ציפיות שכר שונות...' : 'e.g. location too far, different salary expectations...'
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
              variant={responseType === 'accept' ? 'default' : 'secondary'}
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
                ? isHebrew ? 'שלח' : 'Send'
                : isHebrew ? 'אשר' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
