import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Hash } from 'lucide-react';

interface HubSettings {
  allow_posts: boolean;
  allow_comments: boolean;
  allow_polls: boolean;
  allow_video: boolean;
  allow_images: boolean;
  allow_member_invite: boolean;
}

interface Channel {
  id: string;
  name_en: string;
  name_he: string;
}

interface HubSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hubId: string;
  settings: HubSettings;
  channels: Channel[];
}

const SETTING_LABELS: Record<keyof HubSettings, { en: string; he: string }> = {
  allow_posts: { en: 'Allow members to post', he: 'אפשר לחברים לפרסם' },
  allow_comments: { en: 'Allow comments', he: 'אפשר תגובות' },
  allow_polls: { en: 'Allow polls', he: 'אפשר סקרים' },
  allow_video: { en: 'Allow video uploads', he: 'אפשר העלאת וידאו' },
  allow_images: { en: 'Allow image uploads', he: 'אפשר העלאת תמונות' },
  allow_member_invite: { en: 'Allow member invites', he: 'אפשר הזמנת חברים' },
};

export function HubSettingsDialog({ open, onOpenChange, hubId, settings: initialSettings, channels }: HubSettingsDialogProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<HubSettings>(initialSettings);
  const [newChannelEn, setNewChannelEn] = useState('');
  const [newChannelHe, setNewChannelHe] = useState('');

  useEffect(() => { setSettings(initialSettings); }, [initialSettings]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('community_hubs').update(settings as any).eq('id', hubId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isHebrew ? 'ההגדרות עודכנו' : 'Settings updated');
      queryClient.invalidateQueries({ queryKey: ['community-hub'] });
    },
    onError: () => toast.error(isHebrew ? 'שגיאה בעדכון' : 'Failed to update'),
  });

  const addChannelMutation = useMutation({
    mutationFn: async () => {
      if (!newChannelEn.trim()) throw new Error('Name required');
      const { error } = await supabase.from('community_channels').insert({
        hub_id: hubId,
        name_en: `#${newChannelEn.trim().toLowerCase().replace(/\s+/g, '-')}`,
        name_he: newChannelHe.trim() ? `#${newChannelHe.trim()}` : `#${newChannelEn.trim().toLowerCase().replace(/\s+/g, '-')}`,
        sort_order: channels.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewChannelEn(''); setNewChannelHe('');
      queryClient.invalidateQueries({ queryKey: ['community-channels'] });
      toast.success(isHebrew ? 'ערוץ נוסף' : 'Channel added');
    },
  });

  const deleteChannelMutation = useMutation({
    mutationFn: async (channelId: string) => {
      const { error } = await supabase.from('community_channels').delete().eq('id', channelId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-channels'] });
      toast.success(isHebrew ? 'ערוץ נמחק' : 'Channel deleted');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir={isHebrew ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle>{isHebrew ? 'הגדרות קהילה' : 'Community Settings'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Feature toggles */}
          {(Object.keys(SETTING_LABELS) as (keyof HubSettings)[]).map((key) => (
            <div key={key} className="flex items-center justify-between">
              <Label className="text-sm">{isHebrew ? SETTING_LABELS[key].he : SETTING_LABELS[key].en}</Label>
              <Switch checked={settings[key]} onCheckedChange={(v) => setSettings(prev => ({ ...prev, [key]: v }))} />
            </div>
          ))}

          <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} className="w-full gap-2">
            {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isHebrew ? 'שמור הגדרות' : 'Save Settings'}
          </Button>

          <Separator />

          {/* Channel management */}
          <div>
            <Label className="text-sm font-semibold">{isHebrew ? 'ניהול ערוצים' : 'Manage Channels'}</Label>
            <div className="space-y-2 mt-2">
              {channels.map((ch) => (
                <div key={ch.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                  <span className="flex items-center gap-1.5 text-sm"><Hash className="w-3.5 h-3.5" />{isHebrew ? ch.name_he : ch.name_en}</span>
                  {channels.length > 1 && (
                    <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => deleteChannelMutation.mutate(ch.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <Input value={newChannelEn} onChange={(e) => setNewChannelEn(e.target.value)} placeholder={isHebrew ? 'שם ערוץ (EN)' : 'Channel name'} className="flex-1" />
              <Button size="icon" onClick={() => addChannelMutation.mutate()} disabled={!newChannelEn.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
