import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Plus, Crown, Check, Loader2, Users, CalendarDays, XCircle, Sparkles, Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addDays, addMonths, addYears } from 'date-fns';
import { he, enUS } from 'date-fns/locale';

interface SubscriptionsTabProps {
  hubId: string;
  isAdmin: boolean;
}

interface Plan {
  id: string;
  hub_id: string;
  name: string;
  name_he: string | null;
  price_monthly: number;
  price_yearly: number;
  trial_days: number;
  features: string[];
  is_active: boolean;
  created_at: string;
  subscriber_count?: number;
}

interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
}

export function SubscriptionsTab({ hubId, isAdmin }: SubscriptionsTabProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const queryClient = useQueryClient();
  const dateLocale = isRTL ? he : enUS;

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formNameHe, setFormNameHe] = useState('');
  const [formPriceMonthly, setFormPriceMonthly] = useState('');
  const [formPriceYearly, setFormPriceYearly] = useState('');
  const [formTrialDays, setFormTrialDays] = useState('0');
  const [formFeatures, setFormFeatures] = useState('');

  // Fetch plans
  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['subscription-plans', hubId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('community_subscription_plans')
        .select('*')
        .eq('hub_id', hubId)
        .order('price_monthly', { ascending: true });
      if (error) throw error;
      return (data || []) as Plan[];
    },
  });

  // Fetch subscriber counts (admin only)
  const { data: subscriberCounts = {} } = useQuery({
    queryKey: ['subscriber-counts', hubId],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      for (const plan of plans) {
        const { count } = await (supabase as any)
          .from('community_subscriptions')
          .select('id', { count: 'exact', head: true })
          .eq('plan_id', plan.id)
          .in('status', ['active', 'trialing']);
        counts[plan.id] = count || 0;
      }
      return counts;
    },
    enabled: isAdmin && plans.length > 0,
  });

  // Fetch user's subscription
  const { data: mySubscription } = useQuery({
    queryKey: ['my-subscription', hubId, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await (supabase as any)
        .from('community_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing', 'cancelled'])
        .order('created_at', { ascending: false })
        .limit(1);
      if (!data || data.length === 0) return null;
      // Check if this subscription belongs to a plan in this hub
      const sub = data[0] as Subscription;
      const belongsToHub = plans.some(p => p.id === sub.plan_id);
      return belongsToHub ? sub : null;
    },
    enabled: !!user?.id && plans.length > 0,
  });

  // Subscribe mutation
  const subscribeMutation = useMutation({
    mutationFn: async (planId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      const plan = plans.find(p => p.id === planId);
      if (!plan) throw new Error('Plan not found');

      const now = new Date();
      const hasTrial = plan.trial_days > 0;
      const periodStart = now.toISOString();
      const periodEnd = hasTrial
        ? addDays(now, plan.trial_days).toISOString()
        : billingCycle === 'monthly'
          ? addMonths(now, 1).toISOString()
          : addYears(now, 1).toISOString();

      const { error } = await (supabase as any)
        .from('community_subscriptions')
        .insert({
          user_id: user.id,
          plan_id: planId,
          status: hasTrial ? 'trialing' : 'active',
          current_period_start: periodStart,
          current_period_end: periodEnd,
          cancel_at_period_end: false,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-subscription', hubId] });
      queryClient.invalidateQueries({ queryKey: ['subscriber-counts', hubId] });
      toast.success(isRTL ? 'המנוי הופעל בהצלחה!' : 'Subscription activated!');
    },
    onError: () => {
      toast.error(isRTL ? 'שגיאה בהפעלת המנוי' : 'Failed to subscribe');
    },
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!mySubscription) throw new Error('No subscription');
      const { error } = await (supabase as any)
        .from('community_subscriptions')
        .update({ cancel_at_period_end: true })
        .eq('id', mySubscription.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-subscription', hubId] });
      toast.success(isRTL ? 'המנוי יבוטל בסוף התקופה' : 'Subscription will cancel at period end');
    },
    onError: () => {
      toast.error(isRTL ? 'שגיאה בביטול המנוי' : 'Failed to cancel subscription');
    },
  });

  // Create / update plan mutation
  const savePlanMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        hub_id: hubId,
        name: formName,
        name_he: formNameHe || null,
        price_monthly: parseFloat(formPriceMonthly) || 0,
        price_yearly: parseFloat(formPriceYearly) || 0,
        trial_days: parseInt(formTrialDays) || 0,
        features: formFeatures.split(',').map(f => f.trim()).filter(Boolean),
        is_active: true,
      };

      if (editingPlan) {
        const { error } = await (supabase as any)
          .from('community_subscription_plans')
          .update(payload)
          .eq('id', editingPlan.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('community_subscription_plans')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans', hubId] });
      setShowCreateDialog(false);
      setEditingPlan(null);
      resetForm();
      toast.success(isRTL
        ? (editingPlan ? 'התוכנית עודכנה' : 'התוכנית נוצרה בהצלחה')
        : (editingPlan ? 'Plan updated' : 'Plan created successfully'));
    },
    onError: () => {
      toast.error(isRTL ? 'שגיאה בשמירת התוכנית' : 'Failed to save plan');
    },
  });

  const resetForm = () => {
    setFormName('');
    setFormNameHe('');
    setFormPriceMonthly('');
    setFormPriceYearly('');
    setFormTrialDays('0');
    setFormFeatures('');
  };

  const openEditDialog = (plan: Plan) => {
    setEditingPlan(plan);
    setFormName(plan.name);
    setFormNameHe(plan.name_he || '');
    setFormPriceMonthly(String(plan.price_monthly));
    setFormPriceYearly(String(plan.price_yearly));
    setFormTrialDays(String(plan.trial_days));
    setFormFeatures((plan.features || []).join(', '));
    setShowCreateDialog(true);
  };

  const openCreateDialog = () => {
    setEditingPlan(null);
    resetForm();
    setShowCreateDialog(true);
  };

  const subscribedPlan = mySubscription ? plans.find(p => p.id === mySubscription.plan_id) : null;

  if (plansLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-80 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="space-y-6">
      {/* Current subscription status */}
      {mySubscription && subscribedPlan && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">
                    {isRTL ? (subscribedPlan.name_he || subscribedPlan.name) : subscribedPlan.name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant={mySubscription.status === 'active' ? 'default' : mySubscription.status === 'trialing' ? 'secondary' : 'destructive'}>
                      {mySubscription.status === 'active'
                        ? (isRTL ? 'פעיל' : 'Active')
                        : mySubscription.status === 'trialing'
                          ? (isRTL ? 'תקופת ניסיון' : 'Trial')
                          : (isRTL ? 'בוטל' : 'Cancelled')}
                    </Badge>
                    <span className="flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5" />
                      {format(new Date(mySubscription.current_period_start), 'dd/MM/yyyy', { locale: dateLocale })}
                      {' - '}
                      {format(new Date(mySubscription.current_period_end), 'dd/MM/yyyy', { locale: dateLocale })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {mySubscription.cancel_at_period_end ? (
                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                    {isRTL ? 'יבוטל בסוף התקופה' : 'Cancels at period end'}
                  </Badge>
                ) : mySubscription.status !== 'cancelled' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => cancelMutation.mutate()}
                    disabled={cancelMutation.isPending}
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    {cancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    <span className={cn(isRTL ? 'mr-1.5' : 'ml-1.5')}>
                      {isRTL ? 'ביטול מנוי' : 'Cancel'}
                    </span>
                  </Button>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin: Create plan button */}
      {isAdmin && (
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {isRTL ? 'תוכניות מנוי' : 'Subscription Plans'}
          </h2>
          <Button onClick={openCreateDialog} size="sm">
            <Plus className="w-4 h-4" />
            <span className={cn(isRTL ? 'mr-1.5' : 'ml-1.5')}>
              {isRTL ? 'תוכנית חדשה' : 'New Plan'}
            </span>
          </Button>
        </div>
      )}

      {/* Billing cycle toggle */}
      {plans.length > 0 && (
        <div className="flex items-center justify-center gap-3 py-2">
          <span className={cn('text-sm font-medium', billingCycle === 'monthly' ? 'text-foreground' : 'text-muted-foreground')}>
            {isRTL ? 'חודשי' : 'Monthly'}
          </span>
          <Switch
            checked={billingCycle === 'yearly'}
            onCheckedChange={(checked) => setBillingCycle(checked ? 'yearly' : 'monthly')}
          />
          <span className={cn('text-sm font-medium', billingCycle === 'yearly' ? 'text-foreground' : 'text-muted-foreground')}>
            {isRTL ? 'שנתי' : 'Yearly'}
          </span>
          {billingCycle === 'yearly' && (
            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
              {isRTL ? 'חסכו עד 20%' : 'Save up to 20%'}
            </Badge>
          )}
        </div>
      )}

      {/* Plans grid */}
      {plans.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Crown className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              {isRTL ? 'אין תוכניות מנוי עדיין' : 'No subscription plans yet'}
            </p>
            {isAdmin && (
              <Button variant="outline" className="mt-4" onClick={openCreateDialog}>
                <Plus className="w-4 h-4" />
                <span className={cn(isRTL ? 'mr-1.5' : 'ml-1.5')}>
                  {isRTL ? 'צור תוכנית ראשונה' : 'Create first plan'}
                </span>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.filter(p => p.is_active || isAdmin).map((plan, idx) => {
            const isPopular = idx === 1 && plans.length >= 3;
            const isSubscribed = mySubscription?.plan_id === plan.id;
            const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
            const perMonth = billingCycle === 'yearly'
              ? Math.round((plan.price_yearly / 12) * 100) / 100
              : plan.price_monthly;

            return (
              <Card
                key={plan.id}
                className={cn(
                  'relative overflow-hidden transition-all hover:shadow-lg',
                  isPopular && 'border-primary shadow-md scale-[1.02]',
                  isSubscribed && 'border-primary/50 bg-primary/5',
                  !plan.is_active && 'opacity-60',
                )}
              >
                {isPopular && (
                  <div className="absolute top-0 inset-x-0 bg-primary text-primary-foreground text-center text-xs font-bold py-1.5">
                    <Star className="w-3.5 h-3.5 inline-block mb-0.5" />{' '}
                    {isRTL ? 'הכי פופולרי' : 'Most Popular'}
                  </div>
                )}

                <CardHeader className={cn('text-center pb-2', isPopular && 'pt-10')}>
                  <CardTitle className="text-lg">
                    {isRTL ? (plan.name_he || plan.name) : plan.name}
                  </CardTitle>
                  {plan.trial_days > 0 && (
                    <Badge variant="outline" className="mx-auto mt-1 text-blue-600 border-blue-300">
                      <Sparkles className="w-3 h-3 mr-1" />
                      {isRTL ? `${plan.trial_days} ימי ניסיון חינם` : `${plan.trial_days}-day free trial`}
                    </Badge>
                  )}
                </CardHeader>

                <CardContent className="text-center space-y-4">
                  {/* Price */}
                  <div>
                    <span className="text-4xl font-bold">{price === 0 ? (isRTL ? 'חינם' : 'Free') : `${price}`}</span>
                    {price > 0 && (
                      <span className="text-muted-foreground text-sm">
                        {billingCycle === 'monthly'
                          ? (isRTL ? '/חודש' : '/mo')
                          : (isRTL ? '/שנה' : '/yr')}
                      </span>
                    )}
                    {billingCycle === 'yearly' && price > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {isRTL ? `${perMonth} לחודש` : `${perMonth}/mo`}
                      </p>
                    )}
                  </div>

                  <Separator />

                  {/* Features */}
                  <ul className="space-y-2.5 text-sm text-start">
                    {(plan.features || []).map((feature: string, fi: number) => (
                      <li key={fi} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Admin: subscriber count */}
                  {isAdmin && (
                    <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-2">
                      <Users className="w-3.5 h-3.5" />
                      {subscriberCounts[plan.id] || 0} {isRTL ? 'מנויים' : 'subscribers'}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-2 space-y-2">
                    {isSubscribed ? (
                      <Button variant="outline" className="w-full" disabled>
                        <Check className="w-4 h-4" />
                        <span className={cn(isRTL ? 'mr-1.5' : 'ml-1.5')}>
                          {isRTL ? 'מנוי נוכחי' : 'Current Plan'}
                        </span>
                      </Button>
                    ) : (
                      <Button
                        className={cn('w-full', isPopular && 'bg-primary')}
                        variant={isPopular ? 'default' : 'outline'}
                        onClick={() => subscribeMutation.mutate(plan.id)}
                        disabled={subscribeMutation.isPending || !!mySubscription}
                      >
                        {subscribeMutation.isPending
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : (isRTL ? 'הרשמה' : 'Subscribe')}
                      </Button>
                    )}

                    {isAdmin && (
                      <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => openEditDialog(plan)}>
                        {isRTL ? 'עריכה' : 'Edit'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => { setShowCreateDialog(open); if (!open) { setEditingPlan(null); resetForm(); } }}>
        <DialogContent className="max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>
              {editingPlan
                ? (isRTL ? 'עריכת תוכנית' : 'Edit Plan')
                : (isRTL ? 'תוכנית חדשה' : 'New Plan')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>{isRTL ? 'שם (אנגלית)' : 'Name (English)'}</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Pro" />
            </div>
            <div>
              <Label>{isRTL ? 'שם (עברית)' : 'Name (Hebrew)'}</Label>
              <Input value={formNameHe} onChange={e => setFormNameHe(e.target.value)} placeholder="e.g. פרו" dir="rtl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{isRTL ? 'מחיר חודשי' : 'Monthly Price'}</Label>
                <Input type="number" min="0" step="0.01" value={formPriceMonthly} onChange={e => setFormPriceMonthly(e.target.value)} placeholder="49" />
              </div>
              <div>
                <Label>{isRTL ? 'מחיר שנתי' : 'Yearly Price'}</Label>
                <Input type="number" min="0" step="0.01" value={formPriceYearly} onChange={e => setFormPriceYearly(e.target.value)} placeholder="470" />
              </div>
            </div>
            <div>
              <Label>{isRTL ? 'ימי ניסיון' : 'Trial Days'}</Label>
              <Input type="number" min="0" value={formTrialDays} onChange={e => setFormTrialDays(e.target.value)} placeholder="7" />
            </div>
            <div>
              <Label>{isRTL ? 'תכונות (מופרדות בפסיק)' : 'Features (comma-separated)'}</Label>
              <Textarea
                value={formFeatures}
                onChange={e => setFormFeatures(e.target.value)}
                placeholder={isRTL ? 'גישה לכל הקורסים, תמיכה VIP, ...' : 'All courses access, VIP support, ...'}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {isRTL ? 'ביטול' : 'Cancel'}
            </Button>
            <Button onClick={() => savePlanMutation.mutate()} disabled={savePlanMutation.isPending || !formName}>
              {savePlanMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span className={savePlanMutation.isPending ? (isRTL ? 'mr-1.5' : 'ml-1.5') : ''}>
                {editingPlan ? (isRTL ? 'עדכון' : 'Update') : (isRTL ? 'יצירה' : 'Create')}
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
