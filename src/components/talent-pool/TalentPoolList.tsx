import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Users, Plus, FolderOpen, Loader2 } from 'lucide-react';
import { TalentPoolView } from './TalentPoolView';

export function TalentPoolList() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPool, setSelectedPool] = useState<any>(null);

  const { data: pools = [], isLoading } = useQuery({
    queryKey: ['talent-pools', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase.from('talent_pools').select('*').eq('created_by', user.id).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: memberCounts = {} } = useQuery({
    queryKey: ['talent-pool-counts', user?.id],
    queryFn: async () => {
      if (!user?.id || pools.length === 0) return {};
      const counts: Record<string, number> = {};
      for (const pool of pools) {
        const { count } = await supabase.from('talent_pool_members').select('*', { count: 'exact', head: true }).eq('pool_id', pool.id);
        counts[pool.id] = count || 0;
      }
      return counts;
    },
    enabled: !!user?.id && pools.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('talent_pools').insert({ created_by: user!.id, name, description: description || null } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isHebrew ? 'ה-Pool נוצר בהצלחה!' : 'Pool created!');
      setCreateOpen(false);
      setName('');
      setDescription('');
      queryClient.invalidateQueries({ queryKey: ['talent-pools'] });
    },
    onError: () => toast.error(isHebrew ? 'שגיאה ביצירת Pool' : 'Failed to create pool'),
  });

  if (selectedPool) {
    return <TalentPoolView pool={selectedPool} onBack={() => setSelectedPool(null)} />;
  }

  return (
    <div className="space-y-4" dir={isHebrew ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          {isHebrew ? 'בנק מועמדים' : 'Talent Pool'}
        </h2>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          {isHebrew ? 'Pool חדש' : 'New Pool'}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1,2].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : pools.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-10 text-center">
            <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium mb-1">{isHebrew ? 'אין Pools עדיין' : 'No talent pools yet'}</p>
            <p className="text-sm text-muted-foreground mb-4">{isHebrew ? 'צור Pool ראשון לשמירת מועמדים' : 'Create your first pool to save candidates'}</p>
            <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              {isHebrew ? 'צור Pool' : 'Create Pool'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {pools.map((pool: any) => (
            <Card
              key={pool.id}
              className="bg-card border-border cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => setSelectedPool(pool)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{pool.name}</h3>
                    {pool.description && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{pool.description}</p>}
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {memberCounts[pool.id] || 0} {isHebrew ? 'מועמדים' : 'candidates'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isHebrew ? 'צור Pool חדש' : 'Create New Pool'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>{isHebrew ? 'שם ה-Pool *' : 'Pool Name *'}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={isHebrew ? 'לדוגמה: מפתחי Frontend' : 'e.g. Frontend Developers'} />
            </div>
            <div className="space-y-1">
              <Label>{isHebrew ? 'תיאור (אופציונלי)' : 'Description (optional)'}</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={isHebrew ? 'תאר את ה-Pool...' : 'Describe this pool...'} className="min-h-[80px]" />
            </div>
            <Button onClick={() => createMutation.mutate()} disabled={!name || createMutation.isPending} className="w-full gap-2">
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isHebrew ? 'צור Pool' : 'Create Pool'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
