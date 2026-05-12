import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { CreditCard, Lock, CheckCircle, Loader2, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentGateProps {
  hubId: string;
  courseId: string;
  courseTitle: string;
  price: number;
  currency?: string;
  onPaymentComplete?: () => void;
}

export function PaymentGate({
  hubId,
  courseId,
  courseTitle,
  price,
  currency = 'ILS',
  onPaymentComplete,
}: PaymentGateProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const queryClient = useQueryClient();

  // Check if user already paid
  const { data: existingPayment, isLoading } = useQuery({
    queryKey: ['course-payment', courseId, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await (supabase as any)
        .from('community_payments')
        .select('id, status')
        .eq('course_id', courseId)
        .eq('user_id', user.id)
        .in('status', ['completed', 'pending'])
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // Check if hub has payment account
  const { data: paymentAccount } = useQuery({
    queryKey: ['hub-payment-account', hubId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('community_payment_accounts')
        .select('id, provider, is_active')
        .eq('hub_id', hubId)
        .eq('is_active', true)
        .maybeSingle();
      return data;
    },
  });

  const createPayment = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      // Create payment record
      const { data: payment, error } = await (supabase as any)
        .from('community_payments')
        .insert({
          hub_id: hubId,
          user_id: user.id,
          course_id: courseId,
          amount: price,
          currency,
          status: 'pending',
          provider: paymentAccount?.provider || 'stripe',
        })
        .select('id')
        .single();
      if (error) throw error;

      // Call edge function to create Stripe session
      const { data, error: fnError } = await supabase.functions.invoke('create-payment-session', {
        body: {
          payment_id: payment.id,
          course_title: courseTitle,
          amount: price,
          currency,
        },
      });
      if (fnError) throw fnError;

      // Redirect to Stripe checkout
      if (data?.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      toast.error(isRTL ? 'שגיאה ביצירת תשלום' : 'Failed to create payment');
    },
  });

  if (isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  // Already paid
  if (existingPayment?.status === 'completed') {
    return (
      <Card className="border-green-200 bg-green-50/30">
        <CardContent className="p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-700">
              {isRTL ? 'תשלום אושר' : 'Payment confirmed'}
            </p>
            <p className="text-xs text-green-600/70">
              {isRTL ? 'יש לך גישה מלאה לקורס' : 'You have full access to this course'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Pending payment
  if (existingPayment?.status === 'pending') {
    return (
      <Card className="border-yellow-200 bg-yellow-50/30">
        <CardContent className="p-4 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-yellow-500 animate-spin shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-700">
              {isRTL ? 'תשלום בהמתנה' : 'Payment pending'}
            </p>
            <p className="text-xs text-yellow-600/70">
              {isRTL ? 'ממתין לאישור תשלום' : 'Waiting for payment confirmation'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Payment required
  const formattedPrice = new Intl.NumberFormat(isRTL ? 'he-IL' : 'en-US', {
    style: 'currency',
    currency,
  }).format(price);

  return (
    <Card className="border-primary/20">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-primary" />
          <h4 className="text-sm font-semibold">
            {isRTL ? 'קורס בתשלום' : 'Paid Course'}
          </h4>
          <Badge variant="outline" className="text-xs ms-auto">
            {formattedPrice}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground">
          {isRTL
            ? 'קורס זה דורש תשלום. לאחר התשלום תקבל גישה מלאה לכל השיעורים והחומרים.'
            : 'This course requires payment. After payment you will get full access to all lessons and materials.'}
        </p>

        <Button
          className="w-full gap-2"
          onClick={() => createPayment.mutate()}
          disabled={createPayment.isPending || !paymentAccount}
        >
          {createPayment.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CreditCard className="w-4 h-4" />
          )}
          {isRTL ? `שלם ${formattedPrice}` : `Pay ${formattedPrice}`}
        </Button>

        {!paymentAccount && (
          <p className="text-xs text-muted-foreground text-center">
            {isRTL ? 'תשלומים לא מוגדרים עדיין' : 'Payments not configured yet'}
          </p>
        )}

        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5" />
          {isRTL ? 'תשלום מאובטח' : 'Secure payment'}
        </div>
      </CardContent>
    </Card>
  );
}
