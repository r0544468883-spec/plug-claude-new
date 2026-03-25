import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { PhotoUpload } from '@/components/profile/PhotoUpload';
import { User, Mail, Phone, Loader2, Save, Send } from 'lucide-react';

export function ProfileSettings() {
  const { user, profile, updateProfile } = useAuth();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const isHebrew = language === 'he';

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url || null);
  const [newEmail, setNewEmail] = useState('');
  const [isChangingEmail, setIsChangingEmail] = useState(false);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone,
        })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isHebrew ? 'הפרופיל עודכן בהצלחה!' : 'Profile updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: () => {
      toast.error(isHebrew ? 'שגיאה בעדכון הפרופיל' : 'Failed to update profile');
    },
  });

  const handleEmailChange = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) {
      toast.error(isHebrew ? 'נא להזין כתובת אימייל תקינה' : 'Please enter a valid email address');
      return;
    }
    setIsChangingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) throw error;
      toast.success(isHebrew
        ? 'נשלח קישור אימות לאימייל החדש. אנא אשר את הכתובת החדשה.'
        : 'Verification link sent to your new email. Please confirm the new address.');
      setNewEmail('');
    } catch (err: any) {
      toast.error(err.message || (isHebrew ? 'שגיאה בשינוי האימייל' : 'Failed to change email'));
    } finally {
      setIsChangingEmail(false);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          {isHebrew ? 'פרטים אישיים' : 'Personal Information'}
        </CardTitle>
        <CardDescription>
          {isHebrew ? 'עדכן את פרטי הפרופיל שלך' : 'Update your profile information'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar Section with PhotoUpload */}
        {user && (
          <PhotoUpload
            userId={user.id}
            currentAvatarUrl={avatarUrl}
            userName={fullName || 'User'}
            onUpload={(url) => {
              setAvatarUrl(url);
              queryClient.invalidateQueries({ queryKey: ['profile'] });
            }}
            size="md"
          />
        )}

        {/* Form Fields */}
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="w-4 h-4" />
              {isHebrew ? 'שם מלא' : 'Full Name'}
            </Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={isHebrew ? 'הכנס את שמך המלא' : 'Enter your full name'}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {isHebrew ? 'אימייל נוכחי' : 'Current Email'}
            </Label>
            <Input
              value={profile?.email || user?.email || ''}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {isHebrew ? 'שינוי אימייל' : 'Change Email'}
            </Label>
            <div className="flex gap-2">
              <Input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder={isHebrew ? 'הכנס אימייל חדש' : 'Enter new email'}
                type="email"
              />
              <Button
                variant="outline"
                onClick={handleEmailChange}
                disabled={isChangingEmail || !newEmail.trim()}
                className="shrink-0 gap-2"
              >
                {isChangingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {isHebrew ? 'שלח' : 'Send'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {isHebrew
                ? 'יישלח קישור אימות לכתובת החדשה'
                : 'A verification link will be sent to the new address'}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              {isHebrew ? 'טלפון' : 'Phone'}
            </Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={isHebrew ? 'הכנס מספר טלפון' : 'Enter phone number'}
              type="tel"
            />
          </div>
        </div>

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
          {isHebrew ? 'שמור שינויים' : 'Save Changes'}
        </Button>
      </CardContent>
    </Card>
  );
}
