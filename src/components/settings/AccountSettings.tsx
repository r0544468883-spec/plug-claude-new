import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Key, Download, Trash2, Loader2, AlertTriangle, Building2 } from 'lucide-react';

export function AccountSettings() {
  const { user, signOut } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error(isHebrew ? 'הסיסמאות אינן תואמות' : 'Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error(isHebrew ? 'הסיסמה חייבת להכיל לפחות 6 תווים' : 'Password must be at least 6 characters');
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success(isHebrew ? 'הסיסמה שונתה בהצלחה!' : 'Password changed successfully!');
      setPasswordDialogOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error(isHebrew ? 'שגיאה בשינוי הסיסמה' : 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      // Fetch all user data - using profiles table is safe here (own data export)
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      // Explicit column selection - excludes internal_notes for security
      const { data: applications } = await supabase
        .from('applications')
        .select('id, job_id, status, current_stage, match_score, notes, last_interaction, created_at, updated_at')
        .eq('candidate_id', user?.id);

      const { data: documents } = await supabase
        .from('documents')
        .select('*')
        .eq('owner_id', user?.id);

      const exportData = {
        profile,
        applications,
        documents,
        exportedAt: new Date().toISOString(),
      };

      // Create download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plug-data-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(isHebrew ? 'הנתונים יוצאו בהצלחה!' : 'Data exported successfully!');
    } catch (error) {
      toast.error(isHebrew ? 'שגיאה בייצוא הנתונים' : 'Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    // This would typically call a server function to delete the account
    toast.error(isHebrew ? 'יש ליצור קשר עם התמיכה למחיקת החשבון' : 'Please contact support to delete your account');
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="w-5 h-5 text-primary" />
          {isHebrew ? 'חשבון' : 'Account'}
        </CardTitle>
        <CardDescription>
          {isHebrew ? 'נהל את הגדרות החשבון שלך' : 'Manage your account settings'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Change Password */}
        <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full justify-start gap-2">
              <Key className="w-4 h-4" />
              {isHebrew ? 'שנה סיסמה' : 'Change Password'}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isHebrew ? 'שנה סיסמה' : 'Change Password'}</DialogTitle>
              <DialogDescription>
                {isHebrew ? 'הכנס סיסמה חדשה' : 'Enter a new password'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{isHebrew ? 'סיסמה חדשה' : 'New Password'}</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label>{isHebrew ? 'אימות סיסמה' : 'Confirm Password'}</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleChangePassword}
                disabled={isChangingPassword}
              >
                {isChangingPassword ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {isHebrew ? 'שנה סיסמה' : 'Change Password'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Export Data */}
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={handleExportData}
          disabled={isExporting}
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {isHebrew ? 'ייצא את הנתונים שלי' : 'Export My Data'}
        </Button>

        {/* Delete Account */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full justify-start gap-2">
              <Trash2 className="w-4 h-4" />
              {isHebrew ? 'מחק חשבון' : 'Delete Account'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                {isHebrew ? 'מחיקת חשבון' : 'Delete Account'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {isHebrew
                  ? 'פעולה זו לא ניתנת לביטול. כל הנתונים שלך יימחקו לצמיתות.'
                  : 'This action cannot be undone. All your data will be permanently deleted.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                {isHebrew ? 'ביטול' : 'Cancel'}
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive">
                {isHebrew ? 'מחק חשבון' : 'Delete Account'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
          </AlertDialog>

          {/* Enterprise SSO */}
          <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <p className="font-medium text-sm">
                {isHebrew ? 'כניסה ארגונית (SSO)' : 'Enterprise SSO'}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {isHebrew
                ? 'לחברות שרוצות להתחבר דרך Okta, Azure AD או Google Workspace'
                : 'For companies wanting to connect via Okta, Azure AD or Google Workspace'}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => window.location.href = 'mailto:enterprise@plugnexus.ai?subject=בקשת SSO ארגוני'}
            >
              <Building2 className="w-4 h-4" />
              {isHebrew ? 'צור קשר לחיבור ארגוני' : 'Contact for Enterprise SSO'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
