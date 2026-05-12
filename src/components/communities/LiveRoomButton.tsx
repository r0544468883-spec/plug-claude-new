import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Video, VideoOff, Users, Plus, ExternalLink, Loader2, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { he, enUS } from 'date-fns/locale';

interface LiveRoomButtonProps {
  hubId: string;
  isAdmin: boolean;
}

export function LiveRoomButton({ hubId, isAdmin }: LiveRoomButtonProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [titleHe, setTitleHe] = useState('');

  const { data: rooms = [] } = useQuery({
    queryKey: ['community-live-rooms', hubId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('community_live_rooms')
        .select('*')
        .eq('hub_id', hubId)
        .in('status', ['scheduled', 'live'])
        .order('created_at', { ascending: false });
      return data || [];
    },
    refetchInterval: 15_000,
  });

  const createRoom = useMutation({
    mutationFn: async () => {
      if (!user?.id || !title.trim()) throw new Error('Missing data');
      const roomName = `plug-${hubId.slice(0, 8)}-${Date.now().toString(36)}`;
      const roomUrl = `https://meet.jit.si/${roomName}`;
      const { error } = await (supabase as any)
        .from('community_live_rooms')
        .insert({
          hub_id: hubId,
          creator_id: user.id,
          title: title.trim(),
          title_he: titleHe.trim() || title.trim(),
          room_url: roomUrl,
          provider: 'jitsi',
          status: 'live',
          started_at: new Date().toISOString(),
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'החדר נוצר!' : 'Room created!');
      setShowCreate(false);
      setTitle('');
      setTitleHe('');
      queryClient.invalidateQueries({ queryKey: ['community-live-rooms', hubId] });
    },
    onError: () => toast.error(isRTL ? 'שגיאה ביצירת חדר' : 'Failed to create room'),
  });

  const endRoom = useMutation({
    mutationFn: async (roomId: string) => {
      const { error } = await (supabase as any)
        .from('community_live_rooms')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', roomId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'החדר נסגר' : 'Room ended');
      queryClient.invalidateQueries({ queryKey: ['community-live-rooms', hubId] });
    },
  });

  const liveRooms = rooms.filter((r: any) => r.status === 'live');
  const scheduledRooms = rooms.filter((r: any) => r.status === 'scheduled');

  return (
    <div className="space-y-3">
      {/* Live rooms */}
      {liveRooms.map((room: any) => {
        const roomTitle = isRTL ? (room.title_he || room.title) : room.title;
        return (
          <Card key={room.id} className="border-red-200 bg-red-50/30">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="relative shrink-0">
                <Video className="w-5 h-5 text-red-500" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate flex items-center gap-1.5">
                  {roomTitle}
                  <Badge className="text-[10px] bg-red-500 text-white px-1.5 py-0">
                    <Radio className="w-2.5 h-2.5 me-0.5" />
                    LIVE
                  </Badge>
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(room.started_at), {
                    addSuffix: true,
                    locale: isRTL ? he : enUS,
                  })}
                </p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Button
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => window.open(room.room_url, '_blank')}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {isRTL ? 'הצטרף' : 'Join'}
                </Button>
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="text-xs gap-1"
                    onClick={() => endRoom.mutate(room.id)}
                  >
                    <VideoOff className="w-3.5 h-3.5" />
                    {isRTL ? 'סיים' : 'End'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Scheduled rooms */}
      {scheduledRooms.map((room: any) => {
        const roomTitle = isRTL ? (room.title_he || room.title) : room.title;
        return (
          <Card key={room.id} className="border-blue-200/50">
            <CardContent className="p-3 flex items-center gap-3">
              <Video className="w-5 h-5 text-blue-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{roomTitle}</p>
                {room.scheduled_at && (
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? 'מתוכנן: ' : 'Scheduled: '}
                    {formatDistanceToNow(new Date(room.scheduled_at), {
                      addSuffix: true,
                      locale: isRTL ? he : enUS,
                    })}
                  </p>
                )}
              </div>
              <Badge variant="outline" className="text-xs shrink-0">
                {isRTL ? 'מתוכנן' : 'Scheduled'}
              </Badge>
            </CardContent>
          </Card>
        );
      })}

      {/* Create button */}
      {isAdmin && (
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full gap-1.5">
              <Plus className="w-4 h-4" />
              {isRTL ? 'צור חדר שידור חי' : 'Start Live Room'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm" dir={isRTL ? 'rtl' : 'ltr'}>
            <DialogHeader>
              <DialogTitle>{isRTL ? 'חדר חדש' : 'New Live Room'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Title</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Weekly Q&A" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">כותרת</Label>
                <Input value={titleHe} onChange={e => setTitleHe(e.target.value)} placeholder="לדוגמה: מפגש שבועי" dir="rtl" />
              </div>
              <p className="text-xs text-muted-foreground">
                {isRTL ? 'חדר Jitsi Meet ייוצר אוטומטית' : 'A Jitsi Meet room will be created automatically'}
              </p>
              <Button
                className="w-full gap-1.5"
                onClick={() => createRoom.mutate()}
                disabled={!title.trim() || createRoom.isPending}
              >
                {createRoom.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                {isRTL ? 'צור והתחל' : 'Create & Start'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Empty state */}
      {rooms.length === 0 && !isAdmin && (
        <Card>
          <CardContent className="p-6 text-center">
            <VideoOff className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
            <p className="text-sm text-muted-foreground">
              {isRTL ? 'אין חדרים פעילים כרגע' : 'No active rooms right now'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
