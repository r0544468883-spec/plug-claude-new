import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  ShieldCheck, Lock, CreditCard, CheckCircle2, Loader2, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PaymentPage() {
  const { slug } = useParams<{ slug: string }>();
  const { language } = useLanguage();
  const isRTL = language === 'he';

  const [payerName, setPayerName] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Fetch payment link by slug
  const { data: link, isLoading, error } = useQuery({
    queryKey: ['payment-link-public', slug],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('payment_links')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  // Submit payment mutation
  const payMutation = useMutation({
    mutationFn: async () => {
      if (!link) throw new Error('No link');
      const { error } = await (supabase as any)
        .from('payment_link_transactions')
        .insert({
          payment_link_id: link.id,
          payer_name: payerName,
          payer_email: payerEmail,
          payer_phone: payerPhone || null,
          amount: link.amount,
          currency: link.currency,
          status: 'pending',
        });
      if (error) throw error;
    },
    onSuccess: () => {
      setSubmitted(true);
      toast.success(isRTL ? 'התשלום התקבל!' : 'Payment submitted!');
    },
    onError: () => {
      toast.error(isRTL ? 'שגיאה בתשלום' : 'Payment failed');
    },
  });

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'ILS': return '\u20AA';
      case 'USD': return '$';
      case 'EUR': return '\u20AC';
      default: return currency;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 space-y-4">
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !link) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-bold mb-2">
              {isRTL ? 'קישור לא נמצא' : 'Link Not Found'}
            </h2>
            <p className="text-muted-foreground">
              {isRTL
                ? 'קישור התשלום לא קיים או שאינו פעיל יותר.'
                : 'This payment link does not exist or is no longer active.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check expiry
  const isExpired = link.expires_at && new Date(link.expires_at) < new Date();

  if (isExpired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="w-16 h-16 text-orange-400/60 mb-4" />
            <h2 className="text-xl font-bold mb-2">
              {isRTL ? 'קישור פג תוקף' : 'Link Expired'}
            </h2>
            <p className="text-muted-foreground">
              {isRTL
                ? 'קישור התשלום הזה כבר לא זמין.'
                : 'This payment link is no longer available.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayTitle = isRTL ? (link.title_he || link.title) : link.title;

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950 flex items-center justify-center p-4"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="w-full max-w-md space-y-4">
        {/* Main Card */}
        <Card className="overflow-hidden shadow-xl border-0 ring-1 ring-black/5">
          {/* Image */}
          {link.image_url && (
            <div className="h-48 overflow-hidden">
              <img
                src={link.image_url}
                alt={displayTitle}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <CardContent className="p-6 space-y-5">
            {/* Title & description */}
            <div className="text-center">
              <h1 className="text-2xl font-bold">{displayTitle}</h1>
              {link.description && (
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{link.description}</p>
              )}
            </div>

            {/* Price */}
            <div className="text-center py-3 bg-primary/5 rounded-xl">
              <span className="text-4xl font-bold text-primary">
                {getCurrencySymbol(link.currency)}{link.amount}
              </span>
            </div>

            <Separator />

            {submitted ? (
              /* Success state */
              <div className="text-center py-8 space-y-3">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold">
                  {isRTL ? 'התשלום נשלח בהצלחה!' : 'Payment Submitted!'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isRTL
                    ? 'תודה רבה. נעדכן אותך בקרוב.'
                    : 'Thank you! We will update you shortly.'}
                </p>
              </div>
            ) : (
              /* Payment form */
              <div className="space-y-4">
                <div>
                  <Label>{isRTL ? 'שם מלא' : 'Full Name'} *</Label>
                  <Input
                    value={payerName}
                    onChange={e => setPayerName(e.target.value)}
                    placeholder={isRTL ? 'ישראל ישראלי' : 'John Doe'}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>{isRTL ? 'אימייל' : 'Email'} *</Label>
                  <Input
                    type="email"
                    value={payerEmail}
                    onChange={e => setPayerEmail(e.target.value)}
                    placeholder="email@example.com"
                    dir="ltr"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>{isRTL ? 'טלפון (אופציונלי)' : 'Phone (optional)'}</Label>
                  <Input
                    type="tel"
                    value={payerPhone}
                    onChange={e => setPayerPhone(e.target.value)}
                    placeholder={isRTL ? '050-1234567' : '+1 555-0123'}
                    dir="ltr"
                    className="mt-1"
                  />
                </div>

                <Button
                  className="w-full h-12 text-base font-semibold"
                  onClick={() => payMutation.mutate()}
                  disabled={payMutation.isPending || !payerName.trim() || !payerEmail.trim()}
                >
                  {payMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <CreditCard className="w-5 h-5" />
                  )}
                  <span className={cn(isRTL ? 'mr-2' : 'ml-2')}>
                    {payMutation.isPending
                      ? (isRTL ? 'מעבד...' : 'Processing...')
                      : (isRTL ? `שלם ${getCurrencySymbol(link.currency)}${link.amount}` : `Pay ${getCurrencySymbol(link.currency)}${link.amount}`)}
                  </span>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trust badges */}
        {!submitted && (
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              {isRTL ? 'מאובטח' : 'Secure'}
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              {isRTL ? 'תשלום מוגן' : 'Protected'}
            </span>
            <span className="flex items-center gap-1">
              SSL 256-bit
            </span>
          </div>
        )}

        {/* Powered by */}
        <p className="text-center text-xs text-muted-foreground/60">
          Powered by PLUG
        </p>
      </div>
    </div>
  );
}
