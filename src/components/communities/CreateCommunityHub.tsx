import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Plus, Settings } from 'lucide-react';

interface CreateCommunityHubProps {
  onSuccess: (hubId: string) => void;
  onCancel: () => void;
}

const SETTING_KEYS = [
  { key: 'allow_posts', en: 'Allow members to post', he: 'אפשר לחברים לפרסם' },
  { key: 'allow_comments', en: 'Allow comments', he: 'אפשר תגובות' },
  { key: 'allow_polls', en: 'Allow polls', he: 'אפשר סקרים' },
  { key: 'allow_video', en: 'Allow video uploads', he: 'אפשר העלאת וידאו' },
  { key: 'allow_images', en: 'Allow image uploads', he: 'אפשר העלאת תמונות' },
  { key: 'allow_member_invite', en: 'Allow member invites', he: 'אפשר הזמנת חברים' },
] as const;

export function CreateCommunityHub({ onSuccess, onCancel }: CreateCommunityHubProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const queryClient = useQueryClient();

  const [nameEn, setNameEn] = useState('');
  const [nameHe, setNameHe] = useState('');
  const [descEn, setDescEn] = useState('');
  const [descHe, setDescHe] = useState('');
  const [settings, setSettings] = useState({
    allow_posts: true,
    allow_comments: true,
    allow_polls: true,
    allow_video: true,
    allow_images: true,
    allow_member_invite: true,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      if (!nameEn.trim()) throw new Error('Name required');

      const { data: hub, error: hubError } = await supabase
        .from('community_hubs')
        .insert({
          creator_id: user.id,
          name_en: nameEn.trim(),
          name_he: nameHe.trim() || nameEn.trim(),
          description_en: descEn.trim(),
          description_he: descHe.trim(),
          template: 'custom',
          member_count: 1,
          ...settings,
        } as any)
        .select('id')
        .single();

      if (hubError) throw hubError;

      // Add creator as admin
      await supabase.from('community_members').insert({
        hub_id: hub.id,
        user_id: user.id,
        role: 'admin',
      });

      // Create default #general channel
      await supabase.from('community_channels').insert({
        hub_id: hub.id,
        name_en: '#general',
        name_he: '#כללי',
        sort_order: 0,
      });

      return hub.id;
    },
    onSuccess: (hubId) => {
      toast.success(isHebrew ? 'הקהילה נוצרה!' : 'Community created!');
      queryClient.invalidateQueries({ queryKey: ['community-hubs'] });
      queryClient.invalidateQueries({ queryKey: ['my-community-memberships'] });
      onSuccess(hubId);
    },
    onError: (err: Error) => {
      toast.error(err.message || (isHebrew ? 'שגיאה ביצירת הקהילה' : 'Failed to create community'));
    },
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6" dir={isHebrew ? 'rtl' : 'ltr'}>
      <h2 className="text-2xl font-bold flex items-center gap-3">
        <Plus className="w-6 h-6 text-primary" />
        {isHebrew ? 'יצירת קהילה חדשה' : 'Create New Community'}
      </h2>

      {/* Details */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">{isHebrew ? 'פרטים' : 'Details'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name (English)</Label>
              <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="e.g. React Developers" />
            </div>
            <div className="space-y-2">
              <Label>שם (עברית)</Label>
              <Input value={nameHe} onChange={(e) => setNameHe(e.target.value)} placeholder="לדוגמה: מפתחי React" dir="rtl" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Description (English)</Label>
              <Textarea value={descEn} onChange={(e) => setDescEn(e.target.value)} placeholder="What's this community about?" className="resize-none min-h-[80px]" />
            </div>
            <div className="space-y-2">
              <Label>תיאור (עברית)</Label>
              <Textarea value={descHe} onChange={(e) => setDescHe(e.target.value)} placeholder="על מה הקהילה הזאת?" className="resize-none min-h-[80px]" dir="rtl" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Community Settings */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            {isHebrew ? 'הגדרות קהילה' : 'Community Settings'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {SETTING_KEYS.map(({ key, en, he }) => (
            <div key={key} className="flex items-center justify-between">
              <Label className="text-sm">{isHebrew ? he : en}</Label>
              <Switch
                checked={settings[key]}
                onCheckedChange={(v) => setSettings(prev => ({ ...prev, [key]: v }))}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>{isHebrew ? 'ביטול' : 'Cancel'}</Button>
        <Button onClick={() => createMutation.mutate()} disabled={!nameEn.trim() || createMutation.isPending} className="gap-2">
          {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {isHebrew ? 'צור קהילה' : 'Create Community'}
        </Button>
      </div>
    </div>
  );
}
