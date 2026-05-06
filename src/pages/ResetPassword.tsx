import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { PlugLogo } from '@/components/PlugLogo';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ResetPassword() {
  const { direction } = useLanguage();
  const navigate = useNavigate();
  const isHebrew = direction === 'rtl';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  // Supabase auto-detects the recovery token from the URL hash
  // and establishes a session. We wait for that.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });

    // Also check if session already exists (user may have refreshed)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError(isHebrew ? 'סיסמה חייבת להכיל לפחות 6 תווים' : 'Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError(isHebrew ? 'הסיסמאות לא תואמות' : 'Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) {
        setError(isHebrew ? 'שגיאה בעדכון הסיסמה. נסה שוב.' : 'Error updating password. Try again.');
      } else {
        setIsSuccess(true);
        toast.success(isHebrew ? 'הסיסמה עודכנה בהצלחה!' : 'Password updated successfully!');
        setTimeout(() => navigate('/'), 2500);
      }
    } catch {
      setError(isHebrew ? 'שגיאה בעדכון הסיסמה' : 'Error updating password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background" dir={direction}>
      <header className="flex items-center justify-end p-4 md:p-6">
        <LanguageToggle />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <PlugLogo size="lg" />
            </div>
            <h1 className="text-2xl font-bold mb-2">
              {isHebrew ? 'בחר סיסמה חדשה' : 'Choose a New Password'}
            </h1>
            <p className="text-muted-foreground">
              {isHebrew ? 'הכנס סיסמה חדשה לחשבון שלך' : 'Enter a new password for your account'}
            </p>
          </div>

          {isSuccess ? (
            <div className="p-6 rounded-lg bg-primary/10 border border-primary/30 text-center space-y-3">
              <CheckCircle className="w-12 h-12 text-primary mx-auto" />
              <p className="font-medium">
                {isHebrew ? 'הסיסמה עודכנה בהצלחה!' : 'Password updated successfully!'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isHebrew ? 'מעביר אותך למערכת...' : 'Redirecting you...'}
              </p>
            </div>
          ) : !sessionReady ? (
            <div className="p-6 rounded-lg bg-muted/50 border border-border text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {isHebrew ? 'מאמת את הקישור...' : 'Verifying your link...'}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">{isHebrew ? 'סיסמה חדשה' : 'New Password'}</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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

              <div className="space-y-2">
                <Label htmlFor="confirmNewPassword">{isHebrew ? 'אימות סיסמה' : 'Confirm Password'}</Label>
                <Input
                  id="confirmNewPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="h-11"
                  placeholder="••••••••"
                  dir="ltr"
                />
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 text-center">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full h-11 text-base" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  isHebrew ? 'עדכן סיסמה' : 'Update Password'
                )}
              </Button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
