import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Users, Trash2, Search } from 'lucide-react';
import { useState } from 'react';

interface Props {
  pool: { id: string; name: string; description?: string };
  onBack: () => void;
}

export function TalentPoolView({ pool, onBack }: Props) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['talent-pool-members', pool.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('talent_pool_members')
        .select(`*, candidate:profiles!talent_pool_members_candidate_id_fkey(user_id, full_name, avatar_url, title, email)`)
        .eq('pool_id', pool.id)
        .order('added_at', { ascending: false });
      return data || [];
    },
    enabled: !!pool.id,
  });

  const removeMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from('talent_pool_members').delete().eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isHebrew ? 'הוסר מה-Pool' : 'Removed from pool');
      queryClient.invalidateQueries({ queryKey: ['talent-pool-members', pool.id] });
    },
  });

  const filtered = members.filter((m: any) => {
    if (!search) return true;
    const name = (m.candidate?.full_name || '').toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const BackIcon = isHebrew ? ArrowRight : ArrowLeft;

  return (
    <div className="space-y-4" dir={isHebrew ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <BackIcon className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            {pool.name}
          </h2>
          {pool.description && <p className="text-sm text-muted-foreground">{pool.description}</p>}
        </div>
        <Badge variant="secondary" className="ms-auto">{members.length} {isHebrew ? 'מועמדים' : 'candidates'}</Badge>
      </div>

      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isHebrew ? 'חפש מועמד...' : 'Search candidate...'}
          className="ps-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">{isHebrew ? 'אין מועמדים ב-Pool זה' : 'No candidates in this pool'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((m: any) => (
            <Card key={m.id} className="bg-card border-border">
              <CardContent className="p-3 flex items-center gap-3">
                <Avatar className="w-10 h-10 shrink-0">
                  <AvatarImage src={m.candidate?.avatar_url} />
                  <AvatarFallback>{(m.candidate?.full_name || 'U')[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{m.candidate?.full_name || isHebrew ? 'מועמד' : 'Candidate'}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.candidate?.title || m.candidate?.email}</p>
                  {m.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">"{m.notes}"</p>}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => removeMutation.mutate(m.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
