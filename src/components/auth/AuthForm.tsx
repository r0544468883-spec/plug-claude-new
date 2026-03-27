import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { PlugLogo } from '@/components/PlugLogo';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ArrowLeft, ArrowRight, Loader2, Eye, EyeOff, Sparkles } from 'lucide-react';
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
  const { signUp, signIn } = useAuth();
  
  const [isLogin, setIsLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [visibleToHR, setVisibleToHR] = useState(true);
  const [consentTerms, setConsentTerms] = useState(false);
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  
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
          isJobSeeker ? visibleToHR : undefined
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
              {isLogin ? t('auth.welcome_back') : t('auth.create_account_title')}
            </h1>
            {!isLogin && (
              <p className="text-muted-foreground">
                {t('auth.create_account_subtitle')}
              </p>
            )}
          </div>

          {/* Toggle login/register - Moved to TOP for easier access */}
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  <Label htmlFor="phone">{t('auth.phone')}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="h-11"
                    placeholder="+1 (555) 000-0000"
                    dir="ltr"
                  />
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
              </>
            )}

            {loginError && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 text-center">
                {loginError}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 text-base"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isLogin ? (
                t('auth.login')
              ) : (
                t('auth.register')
              )}
            </Button>
          </form>

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
