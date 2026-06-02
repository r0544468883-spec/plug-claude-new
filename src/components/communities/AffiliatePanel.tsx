import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import {
  Link2, Copy, CheckCircle, Users, DollarSign,
  TrendingUp, MousePointerClick, Share2, Loader2,
  Shield, Ban, CreditCard, ExternalLink,
} from 'lucide-react';

interface AffiliatePanelProps {
  hubId: string;
  isAdmin: boolean;
}

type AffiliateStatus = 'active' | 'pending' | 'rejected' | 'suspended';
type ConversionStatus = 'pending' | 'approved' | 'paid' | 'rejected';

export function AffiliatePanel({ hubId, isAdmin }: AffiliatePanelProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [adminCommissionRate, setAdminCommissionRate] = useState('20');

  // Fetch hub data for slug
  const { data: hub } = useQuery({
    queryKey: ['community-hub', hubId],
    queryFn: async () => {
      const { data } = await supabase.from('community_hubs').select('*').eq('id', hubId).single();
      return data;
    },
  });

  // Fetch hub landing page slug
  const { data: landingPage } = useQuery({
    queryKey: ['community-landing-page-slug', hubId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('community_landing_pages')
        .select('slug')
        .eq('hub_id', hubId)
        .maybeSingle();
      return data;
    },
  });

  // Fetch current user's affiliate record
  const { data: myAffiliate, isLoading: affiliateLoading } = useQuery({
    queryKey: ['my-affiliate', hubId, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await (supabase as any)
        .from('affiliates')
        .select('*')
        .eq('hub_id', hubId)
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id && !isAdmin,
  });

  // Fetch conversions for affiliate
  const { data: conversions = [] } = useQuery({
    queryKey: ['affiliate-conversions', myAffiliate?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('affiliate_conversions')
        .select('*')
        .eq('affiliate_id', myAffiliate.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!myAffiliate?.id,
  });

  // Admin: fetch all affiliates
  const { data: allAffiliates = [], isLoading: allAffiliatesLoading } = useQuery({
    queryKey: ['all-affiliates', hubId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('affiliates')
        .select('*, profiles:user_id(full_name, avatar_url, email)')
        .eq('hub_id', hubId)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: isAdmin,
  });

  // Admin: fetch all conversions
  const { data: allConversions = [] } = useQuery({
    queryKey: ['all-affiliate-conversions', hubId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('affiliate_conversions')
        .select('*, affiliates!inner(hub_id, code, user_id, profiles:user_id(full_name))')
        .eq('affiliates.hub_id', hubId)
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: isAdmin,
  });

  // Join as affiliate
  const joinMutation = useMutation({
    mutationFn: async () => {
      const code = generateCode();
      const { data, error } = await (supabase as any)
        .from('affiliates')
        .insert({
          hub_id: hubId,
          user_id: user?.id,
          code,
          commission_rate: 20,
          status: 'active',
          total_clicks: 0,
          total_conversions: 0,
          total_earned: 0,
          pending_payout: 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-affiliate', hubId, user?.id] });
      toast.success(isRTL ? 'הצטרפת לתוכנית השותפים!' : 'You joined the affiliate program!');
    },
    onError: () => {
      toast.error(isRTL ? 'שגיאה בהצטרפות' : 'Failed to join');
    },
  });

  // Admin: update affiliate status
  const updateAffiliateMutation = useMutation({
    mutationFn: async ({ affiliateId, updates }: { affiliateId: string; updates: Record<string, any> }) => {
      const { error } = await (supabase as any)
        .from('affiliates')
        .update(updates)
        .eq('id', affiliateId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-affiliates', hubId] });
      toast.success(isRTL ? 'עודכן בהצלחה' : 'Updated successfully');
    },
  });

  // Admin: process payout
  const payoutMutation = useMutation({
    mutationFn: async (affiliateId: string) => {
      const affiliate = allAffiliates.find((a: any) => a.id === affiliateId);
      if (!affiliate || affiliate.pending_payout <= 0) throw new Error('No pending payout');

      await (supabase as any).from('affiliate_payouts').insert({
        affiliate_id: affiliateId,
        amount: affiliate.pending_payout,
        currency: 'ILS',
        status: 'completed',
      });

      await (supabase as any)
        .from('affiliates')
        .update({ pending_payout: 0 })
        .eq('id', affiliateId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-affiliates', hubId] });
      toast.success(isRTL ? 'התשלום בוצע' : 'Payout processed');
    },
    onError: () => {
      toast.error(isRTL ? 'שגיאה בביצוע תשלום' : 'Payout failed');
    },
  });

  function generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  const affiliateLink = myAffiliate
    ? `${window.location.origin}/c/${landingPage?.slug || hub?.name?.toLowerCase().replace(/\s+/g, '-') || hubId}?ref=${myAffiliate.code}`
    : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(affiliateLink);
    setCopied(true);
    toast.success(isRTL ? 'הקישור הועתק' : 'Link copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: hub?.name || 'Community',
        url: affiliateLink,
      });
    } else {
      handleCopy();
    }
  };

  const statusBadge = (status: AffiliateStatus) => {
    const config: Record<AffiliateStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; labelHe: string; labelEn: string }> = {
      active: { variant: 'default', labelHe: 'פעיל', labelEn: 'Active' },
      pending: { variant: 'secondary', labelHe: 'ממתין', labelEn: 'Pending' },
      rejected: { variant: 'destructive', labelHe: 'נדחה', labelEn: 'Rejected' },
      suspended: { variant: 'outline', labelHe: 'מושעה', labelEn: 'Suspended' },
    };
    const c = config[status] || config.pending;
    return <Badge variant={c.variant}>{isRTL ? c.labelHe : c.labelEn}</Badge>;
  };

  const conversionStatusBadge = (status: ConversionStatus) => {
    const config: Record<ConversionStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; labelHe: string; labelEn: string }> = {
      pending: { variant: 'secondary', labelHe: 'ממתין', labelEn: 'Pending' },
      approved: { variant: 'default', labelHe: 'אושר', labelEn: 'Approved' },
      paid: { variant: 'outline', labelHe: 'שולם', labelEn: 'Paid' },
      rejected: { variant: 'destructive', labelHe: 'נדחה', labelEn: 'Rejected' },
    };
    const c = config[status] || config.pending;
    return <Badge variant={c.variant}>{isRTL ? c.labelHe : c.labelEn}</Badge>;
  };

  // ─── Admin View ─────────────────────────────────────────────────
  if (isAdmin) {
    return (
      <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-green-600" />
          <h2 className="text-xl font-bold">{isRTL ? 'ניהול שותפים' : 'Affiliate Management'}</h2>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-5 h-5 mx-auto mb-1 text-blue-600" />
              <p className="text-2xl font-bold">{allAffiliates.length}</p>
              <p className="text-xs text-muted-foreground">{isRTL ? 'שותפים' : 'Affiliates'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <MousePointerClick className="w-5 h-5 mx-auto mb-1 text-purple-600" />
              <p className="text-2xl font-bold">
                {allAffiliates.reduce((sum: number, a: any) => sum + (a.total_clicks || 0), 0)}
              </p>
              <p className="text-xs text-muted-foreground">{isRTL ? 'קליקים' : 'Clicks'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-5 h-5 mx-auto mb-1 text-green-600" />
              <p className="text-2xl font-bold">
                {allAffiliates.reduce((sum: number, a: any) => sum + (a.total_conversions || 0), 0)}
              </p>
              <p className="text-xs text-muted-foreground">{isRTL ? 'המרות' : 'Conversions'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="w-5 h-5 mx-auto mb-1 text-yellow-600" />
              <p className="text-2xl font-bold">
                {'\u20AA'}{allAffiliates.reduce((sum: number, a: any) => sum + (a.total_earned || 0), 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">{isRTL ? 'שולם' : 'Total Paid'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Affiliates Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{isRTL ? 'כל השותפים' : 'All Affiliates'}</CardTitle>
          </CardHeader>
          <CardContent>
            {allAffiliatesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : allAffiliates.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {isRTL ? 'אין שותפים עדיין' : 'No affiliates yet'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isRTL ? 'שם' : 'Name'}</TableHead>
                      <TableHead>{isRTL ? 'קוד' : 'Code'}</TableHead>
                      <TableHead>{isRTL ? 'סטטוס' : 'Status'}</TableHead>
                      <TableHead>{isRTL ? 'עמלה %' : 'Commission %'}</TableHead>
                      <TableHead>{isRTL ? 'קליקים' : 'Clicks'}</TableHead>
                      <TableHead>{isRTL ? 'המרות' : 'Conv.'}</TableHead>
                      <TableHead>{isRTL ? 'ממתין' : 'Pending'}</TableHead>
                      <TableHead>{isRTL ? 'פעולות' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allAffiliates.map((aff: any) => (
                      <TableRow key={aff.id}>
                        <TableCell className="font-medium">
                          {aff.profiles?.full_name || aff.profiles?.email || '-'}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{aff.code}</code>
                        </TableCell>
                        <TableCell>{statusBadge(aff.status)}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            max="80"
                            className="w-16 h-8 text-xs"
                            defaultValue={aff.commission_rate || 20}
                            onBlur={e => {
                              const val = parseInt(e.target.value);
                              if (val && val !== aff.commission_rate) {
                                updateAffiliateMutation.mutate({
                                  affiliateId: aff.id,
                                  updates: { commission_rate: val },
                                });
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>{aff.total_clicks || 0}</TableCell>
                        <TableCell>{aff.total_conversions || 0}</TableCell>
                        <TableCell>{'\u20AA'}{(aff.pending_payout || 0).toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {aff.status !== 'active' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateAffiliateMutation.mutate({
                                  affiliateId: aff.id,
                                  updates: { status: 'active' },
                                })}
                                title={isRTL ? 'אשר' : 'Approve'}
                              >
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              </Button>
                            )}
                            {aff.status === 'active' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateAffiliateMutation.mutate({
                                  affiliateId: aff.id,
                                  updates: { status: 'suspended' },
                                })}
                                title={isRTL ? 'השעה' : 'Suspend'}
                              >
                                <Ban className="w-4 h-4 text-red-600" />
                              </Button>
                            )}
                            {(aff.pending_payout || 0) > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => payoutMutation.mutate(aff.id)}
                                title={isRTL ? 'שלם' : 'Payout'}
                              >
                                <CreditCard className="w-4 h-4 text-blue-600" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Affiliate / User View ──────────────────────────────────────
  if (affiliateLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // Not yet an affiliate
  if (!myAffiliate) {
    return (
      <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <Card className="border-dashed">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 mx-auto flex items-center justify-center">
              <Share2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold">{isRTL ? 'הצטרפו לתוכנית השותפים' : 'Join Our Affiliate Program'}</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              {isRTL
                ? 'הרוויחו עמלה על כל מנוי חדש שמצטרף דרך הקישור שלכם. קבלו קישור ייחודי, שתפו, והרוויחו!'
                : 'Earn commission on every new subscriber who joins through your link. Get a unique link, share it, and earn!'}
            </p>
            <div className="flex items-center justify-center gap-8 pt-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">20%</p>
                <p className="text-xs text-muted-foreground">{isRTL ? 'עמלה' : 'Commission'}</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">30</p>
                <p className="text-xs text-muted-foreground">{isRTL ? 'ימי Cookie' : 'Cookie Days'}</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-600">{'\u20AA'}</p>
                <p className="text-xs text-muted-foreground">{isRTL ? 'ללא הגבלה' : 'No Cap'}</p>
              </div>
            </div>
            <Button
              size="lg"
              onClick={() => joinMutation.mutate()}
              disabled={joinMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white mt-4"
            >
              {joinMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Share2 className="w-4 h-4 mr-2" />
              )}
              {isRTL ? 'הצטרף עכשיו' : 'Become an Affiliate'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Active affiliate dashboard
  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Share2 className="w-6 h-6 text-green-600" />
          <h2 className="text-xl font-bold">{isRTL ? 'לוח שותפים' : 'Affiliate Dashboard'}</h2>
        </div>
        {statusBadge(myAffiliate.status)}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <MousePointerClick className="w-5 h-5 mx-auto mb-1 text-purple-600" />
            <p className="text-2xl font-bold">{myAffiliate.total_clicks || 0}</p>
            <p className="text-xs text-muted-foreground">{isRTL ? 'קליקים' : 'Clicks'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-5 h-5 mx-auto mb-1 text-green-600" />
            <p className="text-2xl font-bold">{myAffiliate.total_conversions || 0}</p>
            <p className="text-xs text-muted-foreground">{isRTL ? 'המרות' : 'Conversions'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="w-5 h-5 mx-auto mb-1 text-yellow-600" />
            <p className="text-2xl font-bold">{'\u20AA'}{(myAffiliate.total_earned || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{isRTL ? 'סה"כ הרווחת' : 'Total Earned'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CreditCard className="w-5 h-5 mx-auto mb-1 text-blue-600" />
            <p className="text-2xl font-bold">{'\u20AA'}{(myAffiliate.pending_payout || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{isRTL ? 'ממתין לתשלום' : 'Pending Payout'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Affiliate Link */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            {isRTL ? 'הקישור שלך' : 'Your Affiliate Link'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Input value={affiliateLink} readOnly dir="ltr" className="font-mono text-xs" />
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {isRTL
              ? `עמלה: ${myAffiliate.commission_rate || 20}% על כל המרה`
              : `Commission: ${myAffiliate.commission_rate || 20}% per conversion`}
          </p>
        </CardContent>
      </Card>

      {/* Conversions Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{isRTL ? 'היסטוריית המרות' : 'Conversion History'}</CardTitle>
        </CardHeader>
        <CardContent>
          {conversions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {isRTL ? 'אין המרות עדיין. שתפו את הקישור!' : 'No conversions yet. Share your link!'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isRTL ? 'תאריך' : 'Date'}</TableHead>
                    <TableHead>{isRTL ? 'סוג' : 'Type'}</TableHead>
                    <TableHead>{isRTL ? 'סכום' : 'Amount'}</TableHead>
                    <TableHead>{isRTL ? 'עמלה' : 'Commission'}</TableHead>
                    <TableHead>{isRTL ? 'סטטוס' : 'Status'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conversions.map((conv: any) => (
                    <TableRow key={conv.id}>
                      <TableCell className="text-sm">
                        {format(new Date(conv.created_at), 'dd/MM/yyyy', { locale: isRTL ? he : enUS })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {conv.type === 'subscription' ? (isRTL ? 'מנוי' : 'Subscription') : (isRTL ? 'רכישה' : 'Purchase')}
                        </Badge>
                      </TableCell>
                      <TableCell>{'\u20AA'}{(conv.amount || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-green-600 font-medium">
                        {'\u20AA'}{(conv.commission_amount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>{conversionStatusBadge(conv.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
