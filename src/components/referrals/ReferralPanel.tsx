import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Copy, Share2, Users, Zap, Gift, CheckCircle2, Loader2 } from 'lucide-react';

function generateReferralCode(name: string): string {
  const prefix = (name || 'USER').replace(/\s+/g, '').toUpperCase().slice(0, 4);
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `PLUG-${prefix}-${suffix}`;
}

const STATUS_LABELS: Record<string, { en: string; he: string; color: string }> = {
  pending: { en: 'Pending', he: 'ממתין', color: 'secondary' },
  registered: { en: 'Registered', he: 'נרשם', color: 'default' },
  applied: { en: 'Applied', he: 'הגיש', color: 'default' },
  hired: { en: 'Hired', he: 'התקבל', color: 'default' },
  rewarded: { en: 'Rewarded', he: 'תוגמל', color: 'default' },
};

export function ReferralPanel() {
  const { user, profile } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const queryClient = useQueryClient();

  const [emailInput, setEmailInput] = useState('');
  const [copied, setCopied] = useState(false);

  const { data: credits } = useQuery({
    queryKey: ['user-credits', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('user_credits').select('referral_code').eq('user_id', user!.id).single();
      return data;
    },
    enabled: !!user?.id,
  });

  const referralCode = credits?.referral_code || generateReferralCode(profile?.full_name || '');
  const referralLink = `${window.location.origin}?ref=${referralCode}`;

  const { data: referrals = [] } = useQuery({
    queryKey: ['my-referrals', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('referrals').select('*').eq('referrer_id', user!.id).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  const inviteMutation = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.from('referrals').insert({
        referrer_id: user!.id,
        referred_email: email,
        referral_code: `${referralCode}-${Date.now()}`,
        status: 'pending',
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isHebrew ? 'ההזמנה נשלחה!' : 'Invitation sent!');
      setEmailInput('');
      queryClient.invalidateQueries({ queryKey: ['my-referrals'] });
    },
    onError: () => toast.error(isHebrew ? 'שגיאה בשליחת ההזמנה' : 'Failed to send invitation'),
  });

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success(isHebrew ? 'הלינק הועתק!' : 'Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const text = isHebrew
      ? `הצטרף אליי ל-PLUG — הפלטפורמה החכמה לחיפוש עבודה וגיוס! ${referralLink}`
      : `Join me on PLUG - the smart job search & recruitment platform! ${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const totalEarned = referrals.reduce((acc: number, r: any) => {
    if (r.status === 'registered') return acc + 20;
    if (r.status === 'applied') return acc + 50;
    if (r.status === 'hired' || r.status === 'rewarded') return acc + 100;
    return acc;
  }, 0);

  return (
    <div className="space-y-4" dir={isHebrew ? 'rtl' : 'ltr'}>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-card border-border text-center">
          <CardContent className="p-3">
            <Users className="w-5 h-5 text-primary mx-auto mb-1" />
            <div className="text-xl font-bold">{referrals.length}</div>
            <p className="text-xs text-muted-foreground">{isHebrew ? 'הוזמנו' : 'Invited'}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border text-center">
          <CardContent className="p-3">
            <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <div className="text-xl font-bold">{referrals.filter((r: any) => r.status !== 'pending').length}</div>
            <p className="text-xs text-muted-foreground">{isHebrew ? 'נרשמו' : 'Joined'}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border text-center">
          <CardContent className="p-3">
            <Zap className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
            <div className="text-xl font-bold">{totalEarned}</div>
            <p className="text-xs text-muted-foreground">{isHebrew ? 'Fuel הרווחת' : 'Fuel Earned'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Referral Link */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Gift className="w-4 h-4 text-primary" />
            {isHebrew ? 'הזמן חברים ל-PLUG' : 'Invite Friends to PLUG'}
          </CardTitle>
          <CardDescription className="text-xs">
            {isHebrew
              ? 'נרשם: 20 ⚡ | הגיש מועמדות: +30 ⚡ | התקבל לעבודה: +50 ⚡'
              : 'Joined: 20 ⚡ | Applied: +30 ⚡ | Hired: +50 ⚡'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={referralLink} readOnly className="text-xs font-mono" />
            <Button variant="outline" size="icon" onClick={copyLink}>
              {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 gap-2 text-green-600 border-green-200" onClick={shareWhatsApp}>
              <Share2 className="w-3 h-3" />
              WhatsApp
            </Button>
            <Button variant="outline" size="sm" className="flex-1 gap-2 text-blue-600 border-blue-200" onClick={() => {
              window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`, '_blank');
            }}>
              <Share2 className="w-3 h-3" />
              LinkedIn
            </Button>
          </div>

          {/* Invite by email */}
          <div className="flex gap-2">
            <Input
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder={isHebrew ? 'הזן אימייל לשליחת הזמנה' : 'Enter email to invite'}
              type="email"
              className="text-sm"
            />
            <Button
              onClick={() => emailInput && inviteMutation.mutate(emailInput)}
              disabled={!emailInput || inviteMutation.isPending}
              size="sm"
              className="gap-1"
            >
              {inviteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              {isHebrew ? 'הזמן' : 'Invite'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Referrals list */}
      {referrals.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{isHebrew ? 'ההפניות שלי' : 'My Referrals'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {referrals.map((r: any) => {
                const statusInfo = STATUS_LABELS[r.status] || STATUS_LABELS.pending;
                return (
                  <div key={r.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <span className="text-sm text-muted-foreground">{r.referred_email}</span>
                    <Badge variant="outline" className="text-xs">
                      {isHebrew ? statusInfo.he : statusInfo.en}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
