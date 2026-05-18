import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlugLogo } from '@/components/PlugLogo';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ArrowLeft, ArrowRight, Loader2, Eye, EyeOff, Sparkles, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

type AppRole = 'job_seeker' | 'freelance_hr' | 'inhouse_hr' | 'company_employee';

interface AuthFormProps {
  selectedRole: AppRole;
  onBack: () => void;
  onSuccess: () => void;
  onRegistration?: () => void;
}

export function AuthForm({ selectedRole, onBack, onSuccess, onRegistration }: AuthFormProps) {
  const { t, direction } = useLanguage();
  const { signUp, signIn, signInWithGoogle } = useAuth();

  const [isLogin, setIsLogin] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [visibleToHR, setVisibleToHR] = useState(true);
  const [consentTerms, setConsentTerms] = useState(false);
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [gender, setGender] = useState('');
  const [referredBy, setReferredBy] = useState('');
  const [showReferral, setShowReferral] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
  });

  const ArrowBackIcon = direction === 'rtl' ? ArrowRight : ArrowLeft;
  const isHebrew = direction === 'rtl';
  const isJobSeeker = selectedRole === 'job_seeker';

  // Auto-detect referral from URL param (?ref=...) or localStorage (from /invite page)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref') || localStorage.getItem('plug_referral_code');
    if (ref) {
      setReferredBy(ref);
      setShowReferral(true);
    }
  }, []);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email) return;
    setIsLoading(true);
    setLoginError(null);
    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: redirectUrl,
      });
      if (error) {
        setLoginError(isHebrew ? 'שגיאה בשליחת המייל. נסה שוב.' : 'Error sending email. Try again.');
      } else {
        setResetSent(true);
      }
    } catch {
      setLoginError(isHebrew ? 'שגיאה בשליחת המייל' : 'Error sending email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(null);

    try {
      if (isLogin) {
        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          const msg = isHebrew ? 'אימייל או סיסמה שגויים' : 'Incorrect email or password';
          setLoginError(msg);
          toast.error(msg);
        } else {
          toast.success('Welcome back!');
          onSuccess();
        }
      } else {
        // Validation
        if (formData.password !== formData.confirmPassword) {
          toast.error('Passwords do not match');
          setIsLoading(false);
          return;
        }
        if (formData.password.length < 6) {
          toast.error('Password must be at least 6 characters');
          setIsLoading(false);
          return;
        }

        const { error } = await signUp(
          formData.email,
          formData.password,
          formData.fullName,
          formData.phone,
          selectedRole,
          isJobSeeker ? visibleToHR : undefined,
          gender || undefined,
          referredBy.trim() || undefined,
          consentMarketing,
        );

        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Account created successfully!');
          onRegistration?.();
          onSuccess();
        }
      }
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 md:p-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowBackIcon className="w-5 h-5" />
          <span>{t('common.back')}</span>
        </button>
        <LanguageToggle />
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md">
          {/* Logo and title */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <PlugLogo size="lg" />
            </div>
            <h1 className="text-2xl font-bold mb-2">
              {isForgotPassword
                ? (isHebrew ? 'איפוס סיסמה' : 'Reset Password')
                : isLogin ? t('auth.welcome_back') : t('auth.create_account_title')}
            </h1>
            {isForgotPassword ? (
              <p className="text-muted-foreground">
                {isHebrew ? 'נשלח לך קישור לאיפוס הסיסמה למייל' : "We'll send you a password reset link"}
              </p>
            ) : !isLogin && (
              <p className="text-muted-foreground">
                {t('auth.create_account_subtitle')}
              </p>
            )}
          </div>

          {/* Forgot password — success message */}
          {isForgotPassword && resetSent && (
            <div className="mb-6 p-4 rounded-lg bg-primary/10 border border-primary/30 text-center space-y-2">
              <p className="text-sm font-medium">
                {isHebrew ? 'נשלח! בדוק את תיבת המייל שלך' : 'Sent! Check your email inbox'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isHebrew ? 'לא קיבלת? בדוק בספאם או נסה שוב' : "Didn't receive it? Check spam or try again"}
              </p>
              <button
                type="button"
                onClick={() => { setIsForgotPassword(false); setResetSent(false); setLoginError(null); }}
                className="text-sm text-primary hover:underline font-semibold mt-2"
              >
                {isHebrew ? 'חזרה להתחברות' : 'Back to login'}
              </button>
            </div>
          )}

          {/* Forgot password — email form */}
          {isForgotPassword && !resetSent && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resetEmail">{t('auth.email')}</Label>
                <Input
                  id="resetEmail"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  required
                  className="h-11"
                  placeholder="you@example.com"
                  dir="ltr"
                />
              </div>

              {loginError && (
                <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 text-center">
                  {loginError}
                </div>
              )}

              <Button type="submit" className="w-full h-11 text-base" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  isHebrew ? 'שלח קישור איפוס' : 'Send Reset Link'
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setIsForgotPassword(false); setLoginError(null); }}
                  className="text-sm text-primary hover:underline"
                >
                  {isHebrew ? 'חזרה להתחברות' : 'Back to login'}
                </button>
              </div>
            </form>
          )}

          {/* Toggle login/register - Moved to TOP for easier access */}
          {!isForgotPassword && (
            <div className="mb-6 text-center p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-muted-foreground">
                {isLogin ? t('auth.no_account') : t('auth.have_account')}{' '}
                <button
                  type="button"
                  onClick={() => { setIsLogin(!isLogin); setLoginError(null); }}
                  className="text-primary hover:underline font-semibold"
                >
                  {isLogin ? t('auth.sign_up') : t('auth.sign_in')}
                </button>
              </p>
            </div>
          )}

          {/* Google sign-in */}
          {!isForgotPassword && (
            <div className="space-y-4 mb-4">
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 gap-3 text-base font-medium"
                disabled={isLoading}
                onClick={async () => {
                  setIsLoading(true);
                  const { error } = await signInWithGoogle(selectedRole);
                  if (error) {
                    toast.error(isHebrew ? 'שגיאה בהתחברות עם Google' : 'Google sign-in failed');
                    setIsLoading(false);
                  }
                }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {isHebrew ? 'המשך עם Google' : 'Continue with Google'}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    {isHebrew ? 'או' : 'or'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          {!isForgotPassword && <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">{t('auth.full_name')}</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => updateField('fullName', e.target.value)}
                    required={!isLogin}
                    className="h-11"
                    placeholder="John Doe"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">{isHebrew ? 'טלפון *' : 'Phone *'}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    required
                    className="h-11"
                    placeholder="050-0000000"
                    dir="ltr"
                  />
                </div>

                {/* Gender selection */}
                <div className="space-y-2">
                  <Label>{isHebrew ? 'מגדר' : 'Gender'}</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder={isHebrew ? 'בחר/י' : 'Select'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{isHebrew ? 'זכר' : 'Male'}</SelectItem>
                      <SelectItem value="female">{isHebrew ? 'נקבה' : 'Female'}</SelectItem>
                      <SelectItem value="prefer_not">{isHebrew ? 'מעדיף/ה לא לציין' : 'Prefer not to say'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                required
                className="h-11"
                placeholder="you@example.com"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  required
                  className="h-11 pe-10"
                  placeholder="••••••••"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isLogin && (
              <div className="text-end -mt-2">
                <button
                  type="button"
                  onClick={() => { setIsForgotPassword(true); setLoginError(null); }}
                  className="text-xs text-muted-foreground hover:text-primary hover:underline transition-colors"
                >
                  {isHebrew ? 'שכחתי סיסמה' : 'Forgot password?'}
                </button>
              </div>
            )}

            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('auth.confirm_password')}</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => updateField('confirmPassword', e.target.value)}
                    required={!isLogin}
                    className="h-11"
                    placeholder="••••••••"
                    dir="ltr"
                  />
                </div>

                {/* Visible to HR toggle for job seekers */}
                {isJobSeeker && (
                  <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2 cursor-pointer">
                        <Sparkles className="w-4 h-4 text-primary" />
                        {isHebrew ? 'גלוי למגייסים' : 'Visible to Recruiters'}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {isHebrew
                          ? 'מגייסים יוכלו לראות את הפרופיל שלך ולפנות אליך'
                          : 'Recruiters can discover your profile and reach out'}
                      </p>
                    </div>
                    <Switch
                      checked={visibleToHR}
                      onCheckedChange={setVisibleToHR}
                    />
                  </div>
                )}

                {/* Referral attribution */}
                <div className="space-y-2">
                  {!showReferral ? (
                    <button
                      type="button"
                      onClick={() => setShowReferral(true)}
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <UserPlus className="w-4 h-4" />
                      {isHebrew ? 'מישהו הפנה אותי ל-PLUG' : 'Someone referred me to PLUG'}
                    </button>
                  ) : (
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                      <Label className="flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-primary" />
                        {isHebrew ? 'מי הפנה אותך?' : 'Who referred you?'}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {isHebrew
                          ? 'הכנס את האימייל או הטלפון של מי שהפנה אותך — שניכם תקבלו בונוס!'
                          : "Enter the email or phone of who referred you — you'll both get a bonus!"}
                      </p>
                      <Input
                        value={referredBy}
                        onChange={(e) => setReferredBy(e.target.value)}
                        className="h-11"
                        placeholder={isHebrew ? 'אימייל או טלפון' : 'Email or phone'}
                        dir="ltr"
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Consent checkboxes — registration only */}
            {!isLogin && (
              <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="consentTerms"
                    checked={consentTerms}
                    onCheckedChange={(v) => setConsentTerms(!!v)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="consentTerms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                    {isHebrew
                      ? 'אני מאשר/ת את תנאי השימוש ומדיניות הפרטיות *'
                      : 'I agree to the Terms of Service and Privacy Policy *'}
                  </Label>
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="consentMarketing"
                    checked={consentMarketing}
                    onCheckedChange={(v) => setConsentMarketing(!!v)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="consentMarketing" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                    {isHebrew
                      ? 'אני מאשר/ת לקבל עדכונים, טיפים ומיילים מפלאג'
                      : 'I agree to receive updates, tips, and emails from PLUG'}
                  </Label>
                </div>
              </div>
            )}

            {loginError && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 text-center">
                {loginError}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 text-base"
              disabled={isLoading || (!isLogin && !consentTerms)}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isLogin ? (
                t('auth.login')
              ) : (
                t('auth.register')
              )}
            </Button>
          </form>}

          {/* Additional help text at bottom */}
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              {isHebrew ? 'צריך עזרה? צור קשר בתפריט הראשי' : 'Need help? Contact us from the main menu'}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
