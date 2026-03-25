import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useCredits } from '@/contexts/CreditsContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Zap, 
  Gem, 
  Copy, 
  Check, 
  ArrowUpRight, 
  ArrowDownRight,
  Rocket,
  Share2,
  Users,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CREDIT_COSTS, RECURRING_REWARDS } from '@/lib/credit-costs';

const Credits = () => {
  const { credits, transactions, isLoading, totalCredits } = useCredits();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isRTL = language === 'he';
  
  const [copied, setCopied] = useState(false);

  const copyReferralCode = () => {
    if (credits?.referral_code) {
      const referralUrl = `${window.location.origin}?ref=${credits.referral_code}`;
      navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      toast.success(isRTL ? 'הלינק הועתק!' : 'Link copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionLabel = (actionType: string) => {
    const labels: Record<string, { en: string; he: string }> = {
      cv_builder: { en: 'CV Builder', he: 'בונה קורות חיים' },
      interview_prep: { en: 'Interview Prep', he: 'הכנה לראיון' },
      resume_match: { en: 'Resume Match', he: 'התאמת קו"ח' },
      ping: { en: 'Ping', he: 'פינג' },
      social_github_star: { en: 'GitHub Star', he: 'כוכב GitHub' },
      social_linkedin_follow: { en: 'LinkedIn Follow', he: 'עקיבה LinkedIn' },
      referral_bonus: { en: 'Referral Bonus', he: 'בונוס הפניה' },
      vouch_received: { en: 'Vouch Received', he: 'המלצה התקבלה' },
      vouch_given: { en: 'Vouch Given', he: 'המלצה ניתנה' },
      community_share: { en: 'Community Share', he: 'שיתוף לקהילה' },
      job_share: { en: 'Job Share', he: 'שיתוף משרה' },
      feed_like: { en: 'Feed Like', he: 'לייק בפיד' },
      feed_comment: { en: 'Feed Comment', he: 'תגובה בפיד' },
      feed_poll_vote: { en: 'Feed Poll Vote', he: 'הצבעה בסקר' },
    };
    
    const label = labels[actionType];
    if (label) return isRTL ? label.he : label.en;
    
    // Handle social_ prefix
    if (actionType.startsWith('social_')) {
      const taskName = actionType.replace('social_', '').replace(/_/g, ' ');
      return taskName.charAt(0).toUpperCase() + taskName.slice(1);
    }
    
    return actionType.replace(/_/g, ' ');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container max-w-4xl mx-auto px-4 py-8 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">
            {isRTL ? 'טוען...' : 'Loading...'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Header />
      
      <main className="container max-w-4xl mx-auto px-4 py-8">
        {/* Hero Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="bg-gradient-to-br from-card via-card to-[#00FF9D]/5 border-[#00FF9D]/20">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2">
                  {isRTL ? 'מרכז הקרדיטים' : 'Credit Hub'}
                </h1>
                <p className="text-muted-foreground">
                  {isRTL ? 'נהל את הדלק שלך' : 'Manage your fuel'}
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-6 mb-8">
                {/* Daily Fuel */}
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  className="bg-gradient-to-br from-[#00FF9D]/10 to-[#00FF9D]/5 rounded-2xl p-6 border border-[#00FF9D]/20"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-[#00FF9D]/20 flex items-center justify-center">
                      <Zap className="w-6 h-6 text-[#00FF9D]" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {isRTL ? 'דלק יומי' : 'Daily Fuel'}
                      </p>
                      <p className="text-3xl font-bold text-[#00FF9D]">
                        {credits?.daily_fuel || 0}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {isRTL ? 'מתאפס בחצות' : 'Resets at midnight'}
                  </div>
                </motion.div>

                {/* Permanent Fuel */}
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  className="bg-gradient-to-br from-[#B794F4]/10 to-[#B794F4]/5 rounded-2xl p-6 border border-[#B794F4]/20"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-[#B794F4]/20 flex items-center justify-center">
                      <Gem className="w-6 h-6 text-[#B794F4]" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {isRTL ? 'דלק קבוע' : 'Permanent Fuel'}
                      </p>
                      <p className="text-3xl font-bold text-[#B794F4]">
                        {credits?.permanent_fuel || 0}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Gem className="w-3 h-3" />
                    {isRTL ? 'נצבר ממשימות והפניות' : 'Earned from tasks & referrals'}
                  </div>
                </motion.div>
              </div>

              {/* Total */}
              <div className="text-center py-4 border-t border-border/50">
                <span className="text-muted-foreground me-2">
                  {isRTL ? 'סה"כ זמין:' : 'Total available:'}
                </span>
                <span className="text-2xl font-bold bg-gradient-to-r from-[#00FF9D] to-[#B794F4] bg-clip-text text-transparent">
                  {totalCredits}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs Section */}
        <Tabs defaultValue="history" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="history">
              {isRTL ? 'היסטוריה' : 'History'}
            </TabsTrigger>
            <TabsTrigger value="earn">
              {isRTL ? 'הרווח עוד' : 'Earn More'}
            </TabsTrigger>
            <TabsTrigger value="referral">
              {isRTL ? 'הפניות' : 'Referrals'}
            </TabsTrigger>
          </TabsList>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>{isRTL ? 'פעולות אחרונות' : 'Recent Activity'}</CardTitle>
                <CardDescription>
                  {isRTL ? 'היסטוריית הקרדיטים שלך' : 'Your credit history'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-8 h-8 mx-auto mb-3 opacity-50" />
                    <p>{isRTL ? 'אין פעולות עדיין' : 'No activity yet'}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transactions.map((tx) => (
                      <motion.div
                        key={tx.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center",
                            tx.amount > 0 
                              ? "bg-[#00FF9D]/20 text-[#00FF9D]"
                              : "bg-destructive/20 text-destructive"
                          )}>
                            {tx.amount > 0 ? (
                              <ArrowUpRight className="w-4 h-4" />
                            ) : (
                              <ArrowDownRight className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {getActionLabel(tx.action_type)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(tx.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="text-end">
                          <p className={cn(
                            "font-bold",
                            tx.amount > 0 ? "text-[#00FF9D]" : "text-destructive"
                          )}>
                            {tx.amount > 0 ? '+' : ''}{tx.amount}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {tx.credit_type === 'daily' 
                              ? (isRTL ? 'יומי' : 'daily')
                              : (isRTL ? 'קבוע' : 'permanent')}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Earn More Tab */}
          <TabsContent value="earn">
            <Card>
              <CardHeader>
                <CardTitle>{isRTL ? 'דרכים להרוויח' : 'Ways to Earn'}</CardTitle>
                <CardDescription>
                  {isRTL ? 'פעולות חוזרות לצבירת קרדיטים' : 'Recurring actions to earn credits'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  {/* Social Tasks CTA */}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => navigate('/fuel-up')}
                    className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-[#00FF9D]/10 to-[#B794F4]/10 border border-[#00FF9D]/20 hover:border-[#00FF9D]/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00FF9D] to-[#B794F4] flex items-center justify-center">
                        <Rocket className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-start">
                        <p className="font-medium">
                          {isRTL ? 'משימות חברתיות' : 'Social Tasks'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {isRTL ? 'עד 525 קרדיטים!' : 'Up to 525 credits!'}
                        </p>
                      </div>
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-muted-foreground" />
                  </motion.button>

                  {/* Recurring Actions */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Share2 className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-sm font-medium">
                            {isRTL ? 'שיתוף לקהילה' : 'Community Share'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isRTL ? 'עד 3 ביום' : 'Up to 3/day'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[#00FF9D] font-bold">+{RECURRING_REWARDS.COMMUNITY_SHARE.amount}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Share2 className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-sm font-medium">
                            {isRTL ? 'שיתוף משרה' : 'Job Share'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isRTL ? 'עד 5 ביום' : 'Up to 5/day'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[#00FF9D] font-bold">+{RECURRING_REWARDS.JOB_SHARE.amount}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-sm font-medium">
                            {isRTL ? 'קבלת המלצה' : 'Receive a Vouch'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isRTL ? 'עד 5 בחודש' : 'Up to 5/month'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[#00FF9D] font-bold">+{RECURRING_REWARDS.VOUCH_RECEIVED.amount}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-sm font-medium">
                            {isRTL ? 'מתן המלצה' : 'Give a Vouch'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isRTL ? 'עד 5 בחודש' : 'Up to 5/month'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[#00FF9D] font-bold">+{RECURRING_REWARDS.VOUCH_GIVEN.amount}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Referral Tab */}
          <TabsContent value="referral">
            <Card>
              <CardHeader>
                <CardTitle>{isRTL ? 'הזמן חברים' : 'Invite Friends'}</CardTitle>
                <CardDescription>
                  {isRTL 
                    ? 'שניכם תקבלו 10 קרדיטים קבועים!'
                    : 'You both get 10 permanent credits!'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {credits?.referral_code && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        {isRTL ? 'הקוד שלך' : 'Your Code'}
                      </label>
                      <div className="flex gap-2">
                        <Input
                          value={credits.referral_code}
                          readOnly
                          className="font-mono text-lg font-bold"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={copyReferralCode}
                        >
                          {copied ? (
                            <Check className="w-4 h-4 text-[#00FF9D]" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        {isRTL ? 'לינק להפצה' : 'Share Link'}
                      </label>
                      <div className="flex gap-2">
                        <Input
                          value={`${window.location.origin}?ref=${credits.referral_code}`}
                          readOnly
                          className="text-sm"
                        />
                        <Button
                          onClick={copyReferralCode}
                          className="gap-2 bg-[#00FF9D] text-black hover:bg-[#00FF9D]/90"
                        >
                          <Share2 className="w-4 h-4" />
                          {isRTL ? 'שתף' : 'Share'}
                        </Button>
                      </div>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4">
                      <h4 className="font-medium mb-2">
                        {isRTL ? 'איך זה עובד?' : 'How it works'}
                      </h4>
                      <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                        <li>{isRTL ? 'שתף את הלינק עם חברים' : 'Share your link with friends'}</li>
                        <li>{isRTL ? 'הם נרשמים דרך הלינק' : 'They sign up using your link'}</li>
                        <li>{isRTL ? 'שניכם מקבלים 10 קרדיטים!' : 'You both get 10 credits!'}</li>
                      </ol>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Credit Costs Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8"
        >
          <Card>
            <CardHeader>
              <CardTitle>{isRTL ? 'עלויות פעולות' : 'Action Costs'}</CardTitle>
              <CardDescription>
                {isRTL ? 'כמה דלק עולה כל פעולה' : 'How much fuel each action costs'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span>{isRTL ? 'בונה קורות חיים' : 'CV Builder'}</span>
                  <span className="font-bold text-destructive">-{CREDIT_COSTS.CV_BUILDER}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span>{isRTL ? 'הכנה לראיון AI' : 'AI Interview Prep'}</span>
                  <span className="font-bold text-destructive">-{CREDIT_COSTS.AI_INTERVIEW}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span>{isRTL ? 'התאמת קו"ח' : 'Resume Match'}</span>
                  <span className="font-bold text-destructive">-{CREDIT_COSTS.RESUME_MATCH}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span>{isRTL ? 'בדיקת משימת בית' : 'Home Task Review'}</span>
                  <span className="font-bold text-destructive">-{CREDIT_COSTS.HOME_TASK_REVIEW}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span>{isRTL ? 'חיפוש חכם' : 'Smart Search'}</span>
                  <span className="font-bold text-destructive">-{CREDIT_COSTS.SMART_SEARCH}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <span>{isRTL ? 'פינג' : 'Ping'}</span>
                    <span className="text-xs text-muted-foreground ms-2">
                      ({isRTL ? 'אחרי 4 חינם' : 'after 4 free'})
                    </span>
                  </div>
                  <span className="font-bold text-destructive">-{CREDIT_COSTS.PING_AFTER_FREE}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default Credits;
