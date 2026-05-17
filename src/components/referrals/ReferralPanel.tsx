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
import { Copy, Share2, Users, Zap, Gift, CheckCircle2, Loader2, Trophy, Target, Crown, Star, Lock } from 'lucide-react';

// Milestones — tiered rewards
const MILESTONES = [
  { count: 1, fuel: 0, label: { he: 'שיתוף ראשון', en: 'First Share' }, icon: '🌱', unlocks: { he: 'תחילת הדרך', en: 'Getting started' } },
  { count: 3, fuel: 25, label: { he: 'חבר מביא חבר', en: 'Friend Magnet' }, icon: '🔥', unlocks: { he: '+25 Fuel בונוס', en: '+25 Fuel bonus' } },
  { count: 5, fuel: 50, label: { he: 'שגריר PLUG', en: 'PLUG Ambassador' }, icon: '⭐', unlocks: { he: 'ניתוח שכר מתקדם', en: 'Salary analysis' } },
  { count: 10, fuel: 100, label: { he: 'מגייס כוכב', en: 'Star Recruiter' }, icon: '🏆', unlocks: { he: 'פיצ\'רים בטא + 100 Fuel', en: 'Beta features + 100 Fuel' } },
  { count: 25, fuel: 250, label: { he: 'אגדת PLUG', en: 'PLUG Legend' }, icon: '👑', unlocks: { he: 'גישה VIP + 250 Fuel', en: 'VIP access + 250 Fuel' } },
];

const STATUS_LABELS: Record<string, { en: string; he: string }> = {
  pending: { en: 'Pending', he: 'ממתין' },
  clicked: { en: 'Clicked', he: 'לחץ' },
  signed_up: { en: 'Signed Up', he: 'נרשם' },
  activated: { en: 'Active', he: 'פעיל' },
  registered: { en: 'Registered', he: 'נרשם' },
  applied: { en: 'Applied', he: 'הגיש' },
  hired: { en: 'Hired!', he: 'התקבל!' },
};

export function ReferralPanel() {
  const { user, profile } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const queryClient = useQueryClient();
  const [emailInput, setEmailInput] = useState('');
  const [copied, setCopied] = useState(false);

  // Fetch referral code from profiles table
  const { data: profileData } = useQuery({
    queryKey: ['profile-referral', user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any).from('profiles').select('referral_code, referral_count').eq('user_id', user!.id).single();
      return data;
    },
    enabled: !!user?.id,
  });

  const referralCode = profileData?.referral_code || '';
  const referralCount = profileData?.referral_count || 0;
  const inviteLink = `${window.location.origin}/invite/${referralCode}`;

  // Fetch referral history
  const { data: referrals = [] } = useQuery({
    queryKey: ['my-referrals', user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('referrals')
        .select('*')
        .eq('referrer_id', user!.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch leaderboard
  const { data: leaderboard = [] } = useQuery({
    queryKey: ['referral-leaderboard'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('profiles')
        .select('full_name, referral_count, avatar_url')
        .gt('referral_count', 0)
        .order('referral_count', { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await (supabase as any).from('referrals').insert({
        referrer_id: user!.id,
        referral_code: referralCode,
        channel: 'email',
        status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isHebrew ? 'ההזמנה נשלחה!' : 'Invitation sent!');
      setEmailInput('');
      queryClient.invalidateQueries({ queryKey: ['my-referrals'] });
    },
    onError: () => toast.error(isHebrew ? 'שגיאה' : 'Error'),
  });

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success(isHebrew ? 'הלינק הועתק!' : 'Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const text = isHebrew
      ? `היי, יש תוסף AI חינמי שמנתח לך כל משרה בלינקדאין. תנסה:\n${inviteLink}`
      : `Hey, check out PLUG — free AI job matching:\n${inviteLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    supabase.functions.invoke('award-credits', { body: { action: 'job_share' } }).catch(() => {});
  };

  const shareLinkedIn = () => {
    const text = isHebrew
      ? `היי, יש תוסף AI חינמי שמנתח לך כל משרה בלינקדאין. תנסה:\n${inviteLink}`
      : `Hey, check out PLUG — free AI job matching:\n${inviteLink}`;
    window.open(`https://www.linkedin.com/messaging/compose/?body=${encodeURIComponent(text)}`, '_blank');
    supabase.functions.invoke('award-credits', { body: { action: 'job_share' } }).catch(() => {});
  };

  // Stats
  const clickedCount = referrals.filter((r: any) => r.status !== 'pending').length;
  const signedUpCount = referrals.filter((r: any) => ['signed_up', 'activated', 'registered', 'applied', 'hired'].includes(r.status)).length;

  // Current milestone
  const currentMilestone = [...MILESTONES].reverse().find(m => referralCount >= m.count);
  const nextMilestone = MILESTONES.find(m => referralCount < m.count);
  const progressToNext = nextMilestone ? (referralCount / nextMilestone.count) * 100 : 100;

  return (
    <div className="space-y-4 max-w-2xl mx-auto" dir={isHebrew ? 'rtl' : 'ltr'}>

      {/* Current badge + progress */}
      <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/30">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="text-4xl">{currentMilestone?.icon || '🌱'}</div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">
                {currentMilestone
                  ? (isHebrew ? currentMilestone.label.he : currentMilestone.label.en)
                  : (isHebrew ? 'מתחילים!' : 'Getting started!')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {referralCount} {isHebrew ? 'הפניות' : 'referrals'}
              </p>
            </div>
            {nextMilestone && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  {isHebrew ? 'הבא' : 'Next'}: {nextMilestone.icon}
                </p>
                <p className="text-xs font-semibold">{nextMilestone.count - referralCount} {isHebrew ? 'חסרים' : 'to go'}</p>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {nextMilestone && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{referralCount}/{nextMilestone.count}</span>
                <span>{isHebrew ? nextMilestone.unlocks.he : nextMilestone.unlocks.en}</span>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-green-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(progressToNext, 100)}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <CardContent className="p-3">
            <Share2 className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <div className="text-xl font-bold">{referrals.length}</div>
            <p className="text-xs text-muted-foreground">{isHebrew ? 'שותפו' : 'Shared'}</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-3">
            <Target className="w-5 h-5 text-orange-500 mx-auto mb-1" />
            <div className="text-xl font-bold">{clickedCount}</div>
            <p className="text-xs text-muted-foreground">{isHebrew ? 'לחצו' : 'Clicked'}</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-3">
            <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <div className="text-xl font-bold">{signedUpCount}</div>
            <p className="text-xs text-muted-foreground">{isHebrew ? 'נרשמו' : 'Signed up'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Invite link + share */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Gift className="w-4 h-4 text-primary" />
            {isHebrew ? 'הלינק שלך' : 'Your Invite Link'}
          </CardTitle>
          <CardDescription className="text-xs">
            {isHebrew
              ? 'כל חבר שנרשם = 10 ⚡ לך + 10 ⚡ לו'
              : 'Each signup = 10 ⚡ for you + 10 ⚡ for them'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={inviteLink} readOnly className="text-xs font-mono" />
            <Button variant="outline" size="icon" onClick={copyLink}>
              {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 gap-2 text-green-600 border-green-200 hover:bg-green-50" onClick={shareWhatsApp}>
              📱 WhatsApp
            </Button>
            <Button variant="outline" size="sm" className="flex-1 gap-2 text-blue-600 border-blue-200 hover:bg-blue-50" onClick={shareLinkedIn}>
              💼 LinkedIn
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Milestones */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            {isHebrew ? 'אבני דרך' : 'Milestones'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {MILESTONES.map((m) => {
              const achieved = referralCount >= m.count;
              return (
                <div
                  key={m.count}
                  className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
                    achieved ? 'bg-primary/10 border border-primary/30' : 'bg-muted/30 opacity-60'
                  }`}
                >
                  <span className="text-xl">{achieved ? m.icon : '🔒'}</span>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${achieved ? '' : 'text-muted-foreground'}`}>
                      {isHebrew ? m.label.he : m.label.en}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {m.count} {isHebrew ? 'הפניות' : 'referrals'} · {isHebrew ? m.unlocks.he : m.unlocks.en}
                    </p>
                  </div>
                  {achieved ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <span className="text-xs text-muted-foreground">{m.count - referralCount} {isHebrew ? 'חסרים' : 'to go'}</span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Crown className="w-4 h-4 text-yellow-500" />
              {isHebrew ? 'לוח המובילים' : 'Leaderboard'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {leaderboard.map((entry: any, i: number) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
                const isMe = entry.full_name === profile?.full_name;
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-2 rounded-lg ${isMe ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/30'}`}
                  >
                    <span className="text-sm w-6 text-center">{medal}</span>
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                      {entry.avatar_url ? (
                        <img src={entry.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold">{entry.full_name?.charAt(0)}</span>
                      )}
                    </div>
                    <span className={`text-sm flex-1 ${isMe ? 'font-bold' : ''}`}>
                      {entry.full_name} {isMe ? (isHebrew ? '(אתה!)' : '(you!)') : ''}
                    </span>
                    <span className="text-sm font-semibold text-primary">{entry.referral_count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Referral history */}
      {referrals.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{isHebrew ? 'היסטוריית הפניות' : 'Referral History'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {referrals.slice(0, 20).map((r: any) => {
                const statusInfo = STATUS_LABELS[r.status] || STATUS_LABELS.pending;
                const isSuccess = ['signed_up', 'activated', 'registered', 'applied', 'hired'].includes(r.status);
                return (
                  <div key={r.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      <span className="text-xs">{r.channel === 'whatsapp' ? '📱' : r.channel === 'linkedin' ? '💼' : '🔗'}</span>
                      <span className="text-sm text-muted-foreground">
                        {r.job_title || (isHebrew ? 'הזמנה כללית' : 'General invite')}
                      </span>
                    </div>
                    <Badge variant={isSuccess ? 'default' : 'outline'} className="text-xs">
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
