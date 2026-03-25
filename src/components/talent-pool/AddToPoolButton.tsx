import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Bookmark, Plus, Loader2, Check } from 'lucide-react';

interface Props {
  candidateId: string;
  size?: 'sm' | 'default';
}

export function AddToPoolButton({ candidateId, size = 'sm' }: Props) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newPoolName, setNewPoolName] = useState('');
  const [notes, setNotes] = useState('');
  const [addedPools, setAddedPools] = useState<Set<string>>(new Set());

  const { data: pools = [] } = useQuery({
    queryKey: ['talent-pools', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('talent_pools').select('id, name').eq('created_by', user!.id);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const addMutation = useMutation({
    mutationFn: async ({ poolId, poolName }: { poolId?: string; poolName?: string }) => {
      let targetPoolId = poolId;
      if (!targetPoolId && poolName) {
        const { data: newPool, error } = await supabase
          .from('talent_pools')
          .insert({ created_by: user!.id, name: poolName } as any)
          .select('id')
          .single();
        if (error) throw error;
        targetPoolId = newPool.id;
      }
      const { error } = await supabase.from('talent_pool_members').insert({
        pool_id: targetPoolId,
        candidate_id: candidateId,
        added_by: user!.id,
        notes: notes || null,
      } as any);
      if (error && error.code !== '23505') throw error; // ignore unique constraint
      return targetPoolId;
    },
    onSuccess: (poolId) => {
      toast.success(isHebrew ? 'נוסף ל-Pool בהצלחה!' : 'Added to pool!');
      setAddedPools(prev => new Set([...prev, poolId!]));
      setCreateOpen(false);
      setNewPoolName('');
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['talent-pools'] });
      queryClient.invalidateQueries({ queryKey: ['talent-pool-members'] });
    },
    onError: () => toast.error(isHebrew ? 'שגיאה בהוספה ל-Pool' : 'Failed to add to pool'),
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size={size} className="gap-1.5">
            <Bookmark className="w-3.5 h-3.5" />
            {isHebrew ? 'שמור ב-Pool' : 'Save to Pool'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {pools.length === 0 ? (
            <DropdownMenuItem disabled className="text-muted-foreground text-xs">
              {isHebrew ? 'אין Pools עדיין' : 'No pools yet'}
            </DropdownMenuItem>
          ) : pools.map((pool: any) => (
            <DropdownMenuItem
              key={pool.id}
              onClick={() => addMutation.mutate({ poolId: pool.id })}
              className="gap-2"
            >
              {addedPools.has(pool.id) ? <Check className="w-3 h-3 text-green-500" /> : <Bookmark className="w-3 h-3" />}
              <span className="truncate">{pool.name}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCreateOpen(true)} className="gap-2 text-primary">
            <Plus className="w-3 h-3" />
            {isHebrew ? 'Pool חדש' : 'New Pool'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isHebrew ? 'הוסף ל-Pool חדש' : 'Add to New Pool'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-sm">{isHebrew ? 'שם ה-Pool' : 'Pool name'}</Label>
              <Input value={newPoolName} onChange={(e) => setNewPoolName(e.target.value)} placeholder={isHebrew ? 'לדוגמה: מפתחים בכירים' : 'e.g. Senior Developers'} />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">{isHebrew ? 'הערה על המועמד (אופציונלי)' : 'Note about candidate (optional)'}</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={isHebrew ? 'מועמד חזק, כדאי לחזור...' : 'Strong candidate, follow up...'} className="min-h-[60px]" />
            </div>
            <Button
              onClick={() => addMutation.mutate({ poolName: newPoolName })}
              disabled={!newPoolName || addMutation.isPending}
              className="w-full gap-2"
            >
              {addMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isHebrew ? 'צור והוסף' : 'Create & Add'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
