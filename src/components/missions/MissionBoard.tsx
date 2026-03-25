import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { MissionCard } from './MissionCard';
import { BillboardStats } from './BillboardStats';
import { BidDialog } from './BidDialog';
import { MissionDetailSheet } from './MissionDetailSheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, Plus, Search, Filter } from 'lucide-react';

interface MissionBoardProps {
  onCreateMission: () => void;
  onMyMissions: () => void;
}

export function MissionBoard({ onCreateMission, onMyMissions }: MissionBoardProps) {
  const { user, role } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const [searchQuery, setSearchQuery] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [scopeFilter, setScopeFilter] = useState('all');
  const [bidMissionId, setBidMissionId] = useState<string | null>(null);
  const [bidMissionTitle, setBidMissionTitle] = useState('');
  const [detailMissionId, setDetailMissionId] = useState<string | null>(null);

  const { data: missions, refetch } = useQuery({
    queryKey: ['missions', urgencyFilter, scopeFilter],
    queryFn: async () => {
      let query = supabase.from('missions').select('*').eq('status', 'open');
      if (urgencyFilter !== 'all') query = query.eq('urgency', urgencyFilter);
      if (scopeFilter !== 'all') query = query.eq('scope', scopeFilter);
      const { data } = await query.order('created_at', { ascending: false });
      return data || [];
    },
  });

  // Get bid counts
  const { data: bidCounts } = useQuery({
    queryKey: ['mission-bid-counts'],
    queryFn: async () => {
      const { data } = await supabase.from('mission_bids').select('mission_id');
      const counts: Record<string, number> = {};
      data?.forEach((b: any) => { counts[b.mission_id] = (counts[b.mission_id] || 0) + 1; });
      return counts;
    },
  });

  const filteredMissions = missions?.filter(m =>
    !searchQuery || m.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleBid = (missionId: string) => {
    const mission = missions?.find(m => m.id === missionId);
    setBidMissionId(missionId);
    setBidMissionTitle(mission?.title || '');
  };

  return (
    <div className="space-y-6" dir={isHebrew ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Target className="w-6 h-6 text-primary" />
          {isHebrew ? 'לוח פרויקטים' : 'Hunters Billboard'}
        </h2>
        <div className="flex gap-2">
          {role === 'inhouse_hr' && (
            <>
              <Button variant="outline" onClick={onMyMissions}>
                {isHebrew ? 'הפרויקטים שלי' : 'My Projects'}
              </Button>
              <Button className="gap-2" onClick={onCreateMission}>
                <Plus className="w-4 h-4" />
                {isHebrew ? 'פרסם פרויקט' : 'Post Project'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Billboard Stats */}
      <BillboardStats />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isHebrew ? 'חיפוש פרויקטים...' : 'Search projects...'}
            className="ps-10"
          />
        </div>
        <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={isHebrew ? 'דחיפות' : 'Urgency'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isHebrew ? 'הכל' : 'All'}</SelectItem>
            <SelectItem value="standard">{isHebrew ? 'רגיל' : 'Standard'}</SelectItem>
            <SelectItem value="high">{isHebrew ? 'גבוה' : 'High'}</SelectItem>
            <SelectItem value="critical">{isHebrew ? 'קריטי' : 'Critical'}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={scopeFilter} onValueChange={setScopeFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={isHebrew ? 'היקף' : 'Scope'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isHebrew ? 'הכל' : 'All'}</SelectItem>
            <SelectItem value="open">{isHebrew ? 'פתוח' : 'Open'}</SelectItem>
            <SelectItem value="exclusive">{isHebrew ? 'בלעדי' : 'Exclusive'}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Mission Grid */}
      {filteredMissions.length === 0 ? (
        <div className="text-center py-16">
          <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">
            {isHebrew ? 'אין פרויקטים זמינים כרגע' : 'No projects available right now'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {isHebrew ? 'בדוק שוב בקרוב או פרסם פרויקט חדש' : 'Check back soon or post a new project'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMissions.map(mission => (
            <MissionCard
              key={mission.id}
              mission={{ ...mission, bid_count: bidCounts?.[mission.id] || 0 }}
              onBid={handleBid}
              onView={(id) => setDetailMissionId(id)}
              isCreator={mission.created_by === user?.id}
              showBidButton={role === 'freelance_hr'}
            />
          ))}
        </div>
      )}

      {/* Bid Dialog */}
      <BidDialog
        missionId={bidMissionId}
        missionTitle={bidMissionTitle}
        open={!!bidMissionId}
        onOpenChange={(open) => { if (!open) setBidMissionId(null); }}
        onSuccess={refetch}
      />

      {/* Mission Detail Sheet */}
      <MissionDetailSheet
        missionId={detailMissionId}
        open={!!detailMissionId}
        onOpenChange={(open) => { if (!open) setDetailMissionId(null); }}
        onBid={handleBid}
      />
    </div>
  );
}
