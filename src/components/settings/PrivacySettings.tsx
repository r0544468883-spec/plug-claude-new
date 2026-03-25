import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Eye, UserCheck, Loader2, Save, Sparkles, Download, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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

export function PrivacySettings() {
  const { user, profile, role } = useAuth();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const isHebrew = language === 'he';
  const isJobSeeker = role === 'job_seeker';

  // Fetch existing GDPR requests
  const { data: gdprRequests = [] } = useQuery({
    queryKey: ['gdpr-requests', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('gdpr_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const exportRequestMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('gdpr_requests').insert({
        user_id: user.id,
        request_type: 'export',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gdpr-requests', user?.id] });
      toast.success(
        isHebrew
          ? 'בקשת ייצוא הנתונים נשלחה — נחזור אליך תוך 72 שעות'
          : 'Data export request submitted — we\'ll get back to you within 72 hours'
      );
    },
    onError: () => toast.error(isHebrew ? 'שגיאה בשליחת הבקשה' : 'Failed to submit request'),
  });

  const deletionRequestMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('gdpr_requests').insert({
        user_id: user.id,
        request_type: 'deletion',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gdpr-requests', user?.id] });
      toast.success(
        isHebrew
          ? 'בקשת מחיקת הנתונים נשלחה — תעובד תוך 30 יום'
          : 'Data deletion request submitted — will be processed within 30 days'
      );
    },
    onError: () => toast.error(isHebrew ? 'שגיאה בשליחת הבקשה' : 'Failed to submit request'),
  });

  const pendingExport = gdprRequests.find((r: any) => r.request_type === 'export' && r.status === 'pending');
  const pendingDeletion = gdprRequests.find((r: any) => r.request_type === 'deletion' && r.status === 'pending');

  const [profileVisibility, setProfileVisibility] = useState(
    (profile as any)?.profile_visibility || 'public'
  );
  const [allowRecruiterContact, setAllowRecruiterContact] = useState(
    (profile as any)?.allow_recruiter_contact ?? true
  );
  const [visibleToHR, setVisibleToHR] = useState(
    (profile as any)?.visible_to_hr ?? false
  );

  useEffect(() => {
    if (profile) {
      setProfileVisibility((profile as any)?.profile_visibility || 'public');
      setAllowRecruiterContact((profile as any)?.allow_recruiter_contact ?? true);
      setVisibleToHR((profile as any)?.visible_to_hr ?? false);
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          profile_visibility: profileVisibility,
          allow_recruiter_contact: allowRecruiterContact,
          visible_to_hr: visibleToHR,
        })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isHebrew ? 'הגדרות הפרטיות נשמרו!' : 'Privacy settings saved!');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: () => {
      toast.error(isHebrew ? 'שגיאה בשמירת ההגדרות' : 'Failed to save settings');
    },
  });

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          {isHebrew ? 'פרטיות' : 'Privacy'}
        </CardTitle>
        <CardDescription>
          {isHebrew ? 'נהל את הגדרות הפרטיות שלך' : 'Manage your privacy settings'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Profile Visibility */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              {isHebrew ? 'נראות הפרופיל' : 'Profile Visibility'}
            </Label>
            <p className="text-sm text-muted-foreground">
              {isHebrew ? 'מי יכול לראות את הפרופיל שלך' : 'Who can see your profile'}
            </p>
          </div>
          <Select value={profileVisibility} onValueChange={setProfileVisibility}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">{isHebrew ? 'פומבי' : 'Public'}</SelectItem>
              <SelectItem value="private">{isHebrew ? 'פרטי' : 'Private'}</SelectItem>
              <SelectItem value="connections">{isHebrew ? 'קשרים בלבד' : 'Connections Only'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Allow Recruiter Contact */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              {isHebrew ? 'אפשר למגייסים ליצור קשר' : 'Allow Recruiter Contact'}
            </Label>
            <p className="text-sm text-muted-foreground">
              {isHebrew ? 'מגייסים יוכלו לפנות אליך' : 'Recruiters can reach out to you'}
            </p>
          </div>
          <Switch
            checked={allowRecruiterContact}
            onCheckedChange={setAllowRecruiterContact}
          />
        </div>

        {/* Always Visible to HR - Only for job seekers */}
        {isJobSeeker && (
          <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                {isHebrew ? 'גלוי תמיד למגייסים' : 'Always Visible to HR'}
                <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                  {isHebrew ? 'חדש' : 'New'}
                </Badge>
              </Label>
              <p className="text-sm text-muted-foreground max-w-md">
                {isHebrew 
                  ? 'מגייסים יוכלו לראות את הפרופיל שלך ולפנות אליך גם בלי שהגשת מועמדות למשרות שלהם'
                  : 'Recruiters can discover your profile and reach out even without you applying to their jobs'}
              </p>
            </div>
            <Switch
              checked={visibleToHR}
              onCheckedChange={setVisibleToHR}
            />
          </div>
        )}

        <Button
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending}
          className="gap-2"
        >
          {updateMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isHebrew ? 'שמור הגדרות' : 'Save Settings'}
        </Button>

        <Separator />

        {/* GDPR Section */}
        <div className="space-y-4">
          <div>
            <h3 className="font-medium flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              {isHebrew ? 'זכויות GDPR' : 'GDPR Rights'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {isHebrew
                ? 'בהתאם לתקנות הגנת המידע, יש לך זכות לקבל עותק של הנתונים שלך ולבקש מחיקתם.'
                : 'Under data protection regulations, you have the right to receive a copy of your data and request its deletion.'}
            </p>
          </div>

          {/* Existing pending requests */}
          {(pendingExport || pendingDeletion) && (
            <div className="space-y-2">
              {pendingExport && (
                <div className="flex items-center gap-2 text-sm p-3 rounded-lg bg-muted/50 border border-border">
                  <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                  <span className="text-muted-foreground">
                    {isHebrew ? 'בקשת ייצוא נתונים בהמתנה לטיפול' : 'Data export request is pending'}
                  </span>
                  <Badge variant="outline" className="ml-auto text-xs">{isHebrew ? 'בטיפול' : 'Pending'}</Badge>
                </div>
              )}
              {pendingDeletion && (
                <div className="flex items-center gap-2 text-sm p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                  <span className="text-muted-foreground">
                    {isHebrew ? 'בקשת מחיקת נתונים בהמתנה לטיפול' : 'Data deletion request is pending'}
                  </span>
                  <Badge variant="outline" className="ml-auto text-xs border-destructive/30 text-destructive">{isHebrew ? 'בטיפול' : 'Pending'}</Badge>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 flex-wrap">
            {/* Export Data */}
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => exportRequestMutation.mutate()}
              disabled={exportRequestMutation.isPending || !!pendingExport}
            >
              {exportRequestMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {isHebrew ? 'ייצא את הנתונים שלי' : 'Export My Data'}
            </Button>

            {/* Delete Account/Data */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/5"
                  disabled={!!pendingDeletion}
                >
                  <Trash2 className="w-4 h-4" />
                  {isHebrew ? 'בקש מחיקת נתונים' : 'Request Data Deletion'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {isHebrew ? 'בקשת מחיקת נתונים' : 'Request Data Deletion'}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {isHebrew
                      ? 'פעולה זו תשלח בקשה רשמית למחיקת כל הנתונים שלך מהמערכת. הבקשה תטופל תוך 30 יום. הפעולה אינה הפיכה לאחר האישור.'
                      : 'This will submit an official request to delete all your data from the system. The request will be processed within 30 days. This action cannot be undone once processed.'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{isHebrew ? 'ביטול' : 'Cancel'}</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive hover:bg-destructive/90"
                    onClick={() => deletionRequestMutation.mutate()}
                  >
                    {isHebrew ? 'שלח בקשת מחיקה' : 'Submit Deletion Request'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <p className="text-xs text-muted-foreground">
            {isHebrew
              ? '* הבקשות מטופלות תוך 72 שעות (ייצוא) ו-30 יום (מחיקה) בהתאם לתקנות GDPR'
              : '* Requests are handled within 72 hours (export) and 30 days (deletion) per GDPR regulations'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

