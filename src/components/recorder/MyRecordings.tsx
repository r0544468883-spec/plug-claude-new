import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Video, Trash2, Download, Share2, Eye, EyeOff, Play,
  Clock, Monitor, Camera, MonitorPlay, Loader2, Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { he, enUS } from 'date-fns/locale';

const MODE_ICONS: Record<string, typeof Monitor> = {
  screen: Monitor,
  camera: Camera,
  'screen+camera': MonitorPlay,
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function MyRecordings() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const queryClient = useQueryClient();
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const { data: recordings = [], isLoading } = useQuery({
    queryKey: ['my-recordings', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await (supabase as any)
        .from('screen_recordings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  const deleteRecording = useMutation({
    mutationFn: async (rec: any) => {
      // Delete from storage
      await supabase.storage.from('recordings').remove([rec.storage_path]);
      // Delete record
      const { error } = await (supabase as any)
        .from('screen_recordings')
        .delete()
        .eq('id', rec.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'ההקלטה נמחקה' : 'Recording deleted');
      queryClient.invalidateQueries({ queryKey: ['my-recordings'] });
    },
    onError: () => toast.error(isRTL ? 'שגיאה במחיקה' : 'Failed to delete'),
  });

  const togglePublic = useMutation({
    mutationFn: async ({ id, isPublic }: { id: string; isPublic: boolean }) => {
      const { error } = await (supabase as any)
        .from('screen_recordings')
        .update({ is_public: !isPublic })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-recordings'] });
    },
  });

  const updateTitle = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await (supabase as any)
        .from('screen_recordings')
        .update({ title })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['my-recordings'] });
    },
  });

  const handlePlay = async (storagePath: string) => {
    const { data } = await supabase.storage
      .from('recordings')
      .createSignedUrl(storagePath, 3600);
    if (data?.signedUrl) setPlayUrl(data.signedUrl);
    else toast.error(isRTL ? 'שגיאה בטעינת הסרטון' : 'Failed to load video');
  };

  const handleDownload = async (storagePath: string, title?: string) => {
    const { data } = await supabase.storage
      .from('recordings')
      .createSignedUrl(storagePath, 3600);
    if (data?.signedUrl) {
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = `${title || 'recording'}.webm`;
      a.click();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
      </div>
    );
  }

  if (recordings.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <Video className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-sm text-muted-foreground">
            {isRTL ? 'אין הקלטות עדיין. לחץ על "הקלטה חדשה" כדי להתחיל.' : 'No recordings yet. Click "New Recording" to start.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {recordings.map((rec: any) => {
          const ModeIcon = MODE_ICONS[rec.mode] || Monitor;
          return (
            <Card key={rec.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center gap-4">
                {/* Thumbnail / Play */}
                <button
                  onClick={() => handlePlay(rec.storage_path)}
                  className="w-24 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0 hover:bg-muted/80 transition-colors group relative overflow-hidden"
                >
                  <Play className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  {editingId === rec.id ? (
                    <div className="flex gap-2">
                      <Input
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        className="h-7 text-sm"
                        onKeyDown={e => {
                          if (e.key === 'Enter') updateTitle.mutate({ id: rec.id, title: editTitle });
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => updateTitle.mutate({ id: rec.id, title: editTitle })}
                      >
                        {isRTL ? 'שמור' : 'Save'}
                      </Button>
                    </div>
                  ) : (
                    <p
                      className="text-sm font-medium truncate cursor-pointer hover:text-primary"
                      onClick={() => { setEditingId(rec.id); setEditTitle(rec.title || ''); }}
                    >
                      {rec.title || (isRTL ? 'הקלטה ללא שם' : 'Untitled recording')}
                      <Pencil className="w-3 h-3 inline ms-1.5 text-muted-foreground" />
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(rec.duration || 0)}
                    </span>
                    <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0">
                      <ModeIcon className="w-2.5 h-2.5" />
                      {rec.mode}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(rec.created_at), {
                        addSuffix: true,
                        locale: isRTL ? he : enUS,
                      })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => togglePublic.mutate({ id: rec.id, isPublic: rec.is_public })}
                    title={rec.is_public ? 'Make private' : 'Make public'}
                  >
                    {rec.is_public ? <Eye className="w-4 h-4 text-green-500" /> : <EyeOff className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleDownload(rec.storage_path, rec.title)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => { if (confirm(isRTL ? 'למחוק את ההקלטה?' : 'Delete this recording?')) deleteRecording.mutate(rec); }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Video Player Dialog */}
      <Dialog open={!!playUrl} onOpenChange={() => setPlayUrl(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>{isRTL ? 'צפייה בהקלטה' : 'Watch Recording'}</DialogTitle>
          </DialogHeader>
          {playUrl && (
            <video
              src={playUrl}
              controls
              autoPlay
              className="w-full aspect-video bg-black"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
