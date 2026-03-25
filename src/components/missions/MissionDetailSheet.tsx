import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, Zap, Lock, Globe, Users, Clock, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

interface MissionDetailSheetProps {
  missionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBid: (missionId: string) => void;
}

export function MissionDetailSheet({ missionId, open, onOpenChange, onBid }: MissionDetailSheetProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isHebrew = language === 'he';

  const { data: mission } = useQuery({
    queryKey: ['mission-detail', missionId],
    queryFn: async () => {
      if (!missionId) return null;
      const { data } = await supabase.from('missions').select('*').eq('id', missionId).single();
      return data;
    },
    enabled: !!missionId && open,
  });

  const isCreator = mission?.created_by === user?.id;

  const { data: bids } = useQuery({
    queryKey: ['mission-bids', missionId],
    queryFn: async () => {
      if (!missionId) return [];
      const { data } = await supabase.from('mission_bids').select('*').eq('mission_id', missionId);
      return data || [];
    },
    enabled: !!missionId && open,
  });

  const handleAcceptBid = async (bidId: string) => {
    try {
      // Accept this bid
      await supabase.from('mission_bids').update({ status: 'accepted' } as any).eq('id', bidId);
      // Update mission status
      if (missionId) {
        await supabase.from('missions').update({ status: 'in_progress' } as any).eq('id', missionId);
      }
      toast.success(isHebrew ? 'ההצעה אושרה!' : 'Bid accepted!');
    } catch (err) {
      toast.error(isHebrew ? 'שגיאה' : 'Error');
    }
  };

  if (!mission) return null;

  const urgencyConfig: Record<string, { color: string; label: string }> = {
    standard: { color: 'bg-blue-500/10 text-blue-600', label: isHebrew ? 'רגיל' : 'Standard' },
    high: { color: 'bg-orange-500/10 text-orange-600', label: isHebrew ? 'גבוה' : 'High' },
    critical: { color: 'bg-red-500/10 text-red-600', label: isHebrew ? 'קריטי' : 'Critical' },
  };

  const u = urgencyConfig[mission.urgency] || urgencyConfig.standard;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto" dir={isHebrew ? 'rtl' : 'ltr'}>
        <SheetHeader>
          <SheetTitle className="text-start">{mission.title}</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={u.color}>
              <Zap className="w-3 h-3 me-1" />{u.label}
            </Badge>
            <Badge variant="secondary">
              {mission.scope === 'exclusive' ? <Lock className="w-3 h-3 me-1" /> : <Globe className="w-3 h-3 me-1" />}
              {mission.scope === 'exclusive' ? (isHebrew ? 'בלעדי' : 'Exclusive') : (isHebrew ? 'פתוח' : 'Open')}
            </Badge>
            <Badge variant="outline" className="font-mono font-semibold text-primary">
              {mission.commission_model === 'percentage' ? `${mission.commission_value}%` : `₪${mission.commission_value}`}
            </Badge>
          </div>

          {mission.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{mission.description}</p>
          )}

          {(mission as any).company_website && (
            <a
              href={(mission as any).company_website.startsWith('http') ? (mission as any).company_website : `https://${(mission as any).company_website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              {isHebrew ? 'אתר החברה' : 'Company Website'}
            </a>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            {new Date(mission.created_at).toLocaleDateString()}
          </div>

          {!isCreator && mission.status === 'open' && (
            <Button className="w-full gap-2" onClick={() => { onBid(mission.id); onOpenChange(false); }}>
              <Zap className="w-4 h-4" />
              {isHebrew ? 'הגש הצעה' : 'Bid on Project'}
            </Button>
          )}

          {/* Bids section (for creator) */}
          {isCreator && bids && bids.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                {isHebrew ? 'הצעות שהתקבלו' : 'Received Bids'} ({bids.length})
              </h3>
              {bids.map((bid: any) => (
                <Card key={bid.id} className="border-border">
                  <CardContent className="p-4 space-y-2">
                    <p className="text-sm">{bid.pitch}</p>
                    <div className="flex items-center justify-between">
                      <Badge variant={bid.status === 'accepted' ? 'default' : 'outline'}>
                        {bid.status}
                      </Badge>
                      {bid.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="default" className="gap-1" onClick={() => handleAcceptBid(bid.id)}>
                            <CheckCircle className="w-3 h-3" /> {isHebrew ? 'אשר' : 'Accept'}
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1" onClick={async () => {
                            await supabase.from('mission_bids').update({ status: 'declined' } as any).eq('id', bid.id);
                            toast.success(isHebrew ? 'ההצעה נדחתה' : 'Bid declined');
                          }}>
                            <XCircle className="w-3 h-3" /> {isHebrew ? 'דחה' : 'Decline'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
