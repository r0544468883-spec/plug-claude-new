import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Loader2, Smartphone, AlertCircle } from 'lucide-react';

export function NotificationSettings() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  
  const {
    isSupported,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          {isHebrew ? 'התראות Push' : 'Push Notifications'}
        </CardTitle>
        <CardDescription>
          {isHebrew 
            ? 'קבל התראות על ראיונות והזדמנויות חדשות' 
            : 'Get notified about interviews and new opportunities'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isSupported ? (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">
                {isHebrew ? 'הדפדפן לא תומך' : 'Browser Not Supported'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isHebrew 
                  ? 'הדפדפן שלך לא תומך בהתראות Push' 
                  : 'Your browser does not support push notifications'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Push Notification Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  {isHebrew ? 'התראות בזמן אמת' : 'Real-time Notifications'}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {isHebrew 
                    ? 'קבל התראות גם כשהאפליקציה סגורה' 
                    : 'Receive notifications even when the app is closed'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isSubscribed && (
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                    {isHebrew ? 'פעיל' : 'Active'}
                  </Badge>
                )}
                <Switch
                  checked={isSubscribed}
                  onCheckedChange={handleToggle}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Status */}
            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-3">
                {isSubscribed ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Bell className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {isHebrew ? 'התראות פעילות' : 'Notifications Active'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {isHebrew 
                          ? 'תקבל התראות על ראיונות, סטטוס מועמדויות ועוד' 
                          : 'You\'ll receive alerts for interviews, application status, and more'}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <BellOff className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {isHebrew ? 'התראות כבויות' : 'Notifications Disabled'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {isHebrew 
                          ? 'הפעל כדי לקבל התראות בזמן אמת' 
                          : 'Enable to receive real-time notifications'}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Notification Types Info */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">
                {isHebrew ? 'סוגי התראות' : 'Notification Types'}
              </Label>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• {isHebrew ? 'תזכורות לראיונות (24 שעות לפני)' : 'Interview reminders (24 hours before)'}</li>
                <li>• {isHebrew ? 'עדכוני סטטוס מועמדות' : 'Application status updates'}</li>
                <li>• {isHebrew ? 'המלצות (Vouches) חדשות' : 'New endorsements (Vouches)'}</li>
                <li>• {isHebrew ? 'משרות חדשות מתאימות' : 'New matching job opportunities'}</li>
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
