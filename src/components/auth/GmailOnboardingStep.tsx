import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { PlugLogo } from '@/components/PlugLogo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, ArrowRight, ArrowLeft, Shield, Bell, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/connect-email-callback`;

interface GmailOnboardingStepProps {
  onSkip: () => void;
}

export function GmailOnboardingStep({ onSkip }: GmailOnboardingStepProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isHebrew = language === 'he';
  const ArrowBackIcon = isHebrew ? ArrowRight : ArrowLeft;
  const [isConnecting, setIsConnecting] = useState(false);

  const isGmailAvailable = !!GOOGLE_CLIENT_ID && !!user;

  const connectGmail = () => {
    if (!GOOGLE_CLIENT_ID) {
      toast.error(
        isHebrew
          ? 'חיבור Gmail לא זמין כרגע. תוכל לחבר מאוחר יותר מההגדרות.'
          : 'Gmail connection is not available right now. You can connect later from settings.'
      );
      return;
    }
    if (!user) {
      onSkip();
      return;
    }

    setIsConnecting(true);
    const state = `${user.id}:gmail`;
    const scopes = 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly';
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${state}&access_type=offline&prompt=consent`;
    window.location.href = url;
  };

  const benefits = [
    {
      icon: Bell,
      titleHe: 'התראות על דחיות אוטומטיות',
      titleEn: 'Automatic rejection detection',
      descHe: 'נזהה מיילי דחייה ונעדכן את הסטטוס אוטומטית',
      descEn: 'We detect rejection emails and update status automatically',
    },
    {
      icon: Mail,
      titleHe: 'שליחת מיילים מהמערכת',
      titleEn: 'Send emails from the platform',
      descHe: 'שלח מיילים למגייסים ישירות מ-PLUG',
      descEn: 'Email recruiters directly from PLUG',
    },
    {
      icon: Shield,
      titleHe: 'אבטחה מלאה',
      titleEn: 'Fully secure',
      descHe: 'אנחנו לא שומרים סיסמאות — רק הרשאת OAuth מאובטחת',
      descEn: 'We never store passwords — only secure OAuth tokens',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background" dir={isHebrew ? 'rtl' : 'ltr'}>
      <header className="flex items-center justify-between p-4 md:p-6">
        <button
          onClick={onSkip}
          aria-label={isHebrew ? 'דלג' : 'Skip'}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px]"
        >
          <ArrowBackIcon className="w-5 h-5" />
          <span>{isHebrew ? 'דלג' : 'Skip'}</span>
        </button>
        <div />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <PlugLogo size="lg" />
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              {isHebrew ? 'שלב אחרון!' : 'One more step!'}
            </div>
            <h1 className="text-2xl font-bold mb-2">
              {isHebrew ? 'חבר את חשבון Gmail שלך' : 'Connect your Gmail account'}
            </h1>
            <p className="text-muted-foreground">
              {isHebrew
                ? 'חיבור Gmail מאפשר ל-PLUG לעקוב אחרי תהליכי הגיוס שלך אוטומטית'
                : 'Connecting Gmail lets PLUG automatically track your recruitment process'}
            </p>
          </div>

          <div className="space-y-3">
            {benefits.map((b, i) => (
              <Card key={i} className="bg-card border-border">
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <b.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {isHebrew ? b.titleHe : b.titleEn}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isHebrew ? b.descHe : b.descEn}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Unavailable notice when GOOGLE_CLIENT_ID is missing */}
          {!isGmailAvailable && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border text-sm text-muted-foreground">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {isHebrew
                ? 'חיבור Gmail לא זמין כרגע. תוכל לחבר מאוחר יותר מההגדרות.'
                : 'Gmail connection is not available right now. You can connect later from settings.'}
            </div>
          )}

          <div className="space-y-3 pt-2">
            <Button
              onClick={connectGmail}
              className="w-full h-12 text-base gap-2"
              size="lg"
              disabled={isConnecting || !isGmailAvailable}
            >
              {isConnecting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Mail className="w-5 h-5" />
              )}
              {isConnecting
                ? (isHebrew ? 'מתחבר...' : 'Connecting...')
                : (isHebrew ? 'חבר את Gmail' : 'Connect Gmail')}
            </Button>

            <Button
              variant="ghost"
              onClick={onSkip}
              className="w-full text-muted-foreground min-h-[44px]"
            >
              {isHebrew ? 'אולי אחר כך' : 'Maybe later'}
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            {isHebrew
              ? 'תוכל תמיד לחבר את Gmail מהגדרות הפרופיל'
              : 'You can always connect Gmail from your profile settings'}
          </p>
        </div>
      </main>
    </div>
  );
}
