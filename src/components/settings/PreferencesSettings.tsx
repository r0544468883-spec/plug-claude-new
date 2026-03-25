import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Globe, Palette, Bell, Loader2, Save, PlayCircle } from 'lucide-react';
import { TOUR_STORAGE_KEY } from '@/components/onboarding/JobSeekerTour';

export function PreferencesSettings() {
  const { user, profile, role } = useAuth();
  const { language, setLanguage } = useLanguage();
  const queryClient = useQueryClient();
  const isHebrew = language === 'he';
  const isJobSeeker = role === 'job_seeker';

  const handleStartTour = () => {
    // Remove the completed flag and trigger the tour
    localStorage.removeItem(TOUR_STORAGE_KEY);
    // Call the global function exposed by JobSeekerTour
    if ((window as any).__startJobSeekerTour) {
      (window as any).__startJobSeekerTour();
    } else {
      // If function not available, reload to trigger tour
      window.location.reload();
    }
  };

  const [theme, setTheme] = useState((profile as any)?.theme || 'system');
  const [emailNotifications, setEmailNotifications] = useState(
    (profile as any)?.email_notifications ?? true
  );

  useEffect(() => {
    if (profile) {
      setTheme((profile as any)?.theme || 'system');
      setEmailNotifications((profile as any)?.email_notifications ?? true);
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          preferred_language: language,
          theme: theme,
          email_notifications: emailNotifications,
        })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isHebrew ? 'ההעדפות נשמרו!' : 'Preferences saved!');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: () => {
      toast.error(isHebrew ? 'שגיאה בשמירת ההעדפות' : 'Failed to save preferences');
    },
  });

  return (
    <Card className="bg-card border-border" data-tour="preferences">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          {isHebrew ? 'העדפות' : 'Preferences'}
        </CardTitle>
        <CardDescription>
          {isHebrew ? 'התאם את חווית השימוש שלך' : 'Customize your experience'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Language */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              {isHebrew ? 'שפה' : 'Language'}
            </Label>
            <p className="text-sm text-muted-foreground">
              {isHebrew ? 'בחר את שפת הממשק' : 'Choose interface language'}
            </p>
          </div>
          <Select value={language} onValueChange={(v) => setLanguage(v as 'en' | 'he')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="he">עברית</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Theme */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              {isHebrew ? 'ערכת נושא' : 'Theme'}
            </Label>
            <p className="text-sm text-muted-foreground">
              {isHebrew ? 'בחר את מראה הממשק' : 'Choose interface appearance'}
            </p>
          </div>
          <Select value={theme} onValueChange={setTheme}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">{isHebrew ? 'בהיר' : 'Light'}</SelectItem>
              <SelectItem value="dark">{isHebrew ? 'כהה' : 'Dark'}</SelectItem>
              <SelectItem value="system">{isHebrew ? 'אוטומטי' : 'System'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Email Notifications */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              {isHebrew ? 'התראות אימייל' : 'Email Notifications'}
            </Label>
            <p className="text-sm text-muted-foreground">
              {isHebrew ? 'קבל עדכונים לאימייל' : 'Receive email updates'}
            </p>
          </div>
          <Switch
            checked={emailNotifications}
            onCheckedChange={setEmailNotifications}
          />
        </div>

        {/* Start Tour */}
        {isJobSeeker && (
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <PlayCircle className="w-4 h-4" />
                {isHebrew ? 'סיור הדרכה' : 'Guided Tour'}
              </Label>
              <p className="text-sm text-muted-foreground">
                {isHebrew ? 'צפה שוב בסיור ההדרכה' : 'Watch the onboarding tour again'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartTour}
              className="gap-2"
            >
              <PlayCircle className="w-4 h-4" />
              {isHebrew ? 'התחל סיור' : 'Start Tour'}
            </Button>
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
          {isHebrew ? 'שמור העדפות' : 'Save Preferences'}
        </Button>
      </CardContent>
    </Card>
  );
}
