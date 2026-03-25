import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CommunityCard } from './CommunityCard';
import { toast } from 'sonner';
import { Search, Users, Plus } from 'lucide-react';

interface CommunityHubsListProps {
  onViewHub: (hubId: string) => void;
  onCreateHub: () => void;
}

export function CommunityHubsList({ onViewHub, onCreateHub }: CommunityHubsListProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [joiningHub, setJoiningHub] = useState<string | null>(null);

  const { data: hubs = [], isLoading } = useQuery({
    queryKey: ['community-hubs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_hubs')
        .select('*')
        .eq('is_public', true)
        .order('member_count', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: myMemberships = [] } = useQuery({
    queryKey: ['my-community-memberships', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('community_members')
        .select('hub_id, role')
        .eq('user_id', user.id);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const memberHubIds = new Set(myMemberships.map(m => m.hub_id));

  const joinMutation = useMutation({
    mutationFn: async (hubId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      setJoiningHub(hubId);
      const { error } = await supabase.from('community_members').insert({
        hub_id: hubId,
        user_id: user.id,
        role: 'member',
      });
      if (error) throw error;
      // Increment member count
      const currentCount = hubs.find(h => h.id === hubId)?.member_count || 0;
      await supabase.from('community_hubs').update({ member_count: currentCount + 1 }).eq('id', hubId);
    },
    onSuccess: () => {
      toast.success(isHebrew ? 'הצטרפת לקהילה!' : 'Joined community!');
      queryClient.invalidateQueries({ queryKey: ['my-community-memberships'] });
      queryClient.invalidateQueries({ queryKey: ['community-hubs'] });
      setJoiningHub(null);
    },
    onError: () => {
      toast.error(isHebrew ? 'שגיאה בהצטרפות' : 'Failed to join');
      setJoiningHub(null);
    },
  });

  const filtered = hubs.filter(h => {
    if (!search) return true;
    const q = search.toLowerCase();
    return h.name_en?.toLowerCase().includes(q) || h.name_he?.toLowerCase().includes(q) || h.description_en?.toLowerCase().includes(q);
  });

  const myHubs = filtered.filter(h => memberHubIds.has(h.id));
  const discoverHubs = filtered.filter(h => !memberHubIds.has(h.id));

  return (
    <div data-tour="communities-list">
    <div className="space-y-6" dir={isHebrew ? 'rtl' : 'ltr'}>
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isHebrew ? 'חיפוש קהילות...' : 'Search communities...'}
          className="ps-10"
        />
      </div>

      <Tabs defaultValue="my" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="my">{isHebrew ? 'הקהילות שלי' : 'My Communities'}</TabsTrigger>
          <TabsTrigger value="discover">{isHebrew ? 'גילוי' : 'Discover'}</TabsTrigger>
        </TabsList>

        <TabsContent value="my">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
            </div>
          ) : myHubs.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="p-12 text-center">
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{isHebrew ? 'עדיין לא הצטרפת לקהילות' : 'You haven\'t joined any communities yet'}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myHubs.map(hub => (
                <CommunityCard key={hub.id} hub={hub} isMember onJoin={() => {}} onView={onViewHub} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="discover">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
            </div>
          ) : discoverHubs.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">{isHebrew ? 'אין קהילות נוספות' : 'No more communities to discover'}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {discoverHubs.map(hub => (
                <CommunityCard key={hub.id} hub={hub} isMember={false} onJoin={(id) => joinMutation.mutate(id)} onView={onViewHub} joining={joiningHub === hub.id} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
    </div>
  );
}
