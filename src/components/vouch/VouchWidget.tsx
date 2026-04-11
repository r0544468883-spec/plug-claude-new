import { useQuery } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { GiveVouchDialog } from './GiveVouchDialog';
import { RequestVouchDialog } from './RequestVouchDialog';

interface VouchWidgetProps {
  onNavigate?: () => void;
}

export function VouchWidget({ onNavigate }: VouchWidgetProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';

  const { data: vouchStats } = useQuery({
    queryKey: ['vouch-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('vouches')
        .select('id, vouch_type, from_user_id')
        .eq('to_user_id', user.id)
        .eq('is_public', true);

      if (error) throw error;

      // Count by type
      const typeCount: Record<string, number> = {};
      data?.forEach(v => {
        typeCount[v.vouch_type] = (typeCount[v.vouch_type] || 0) + 1;
      });

      // Unique endorsers
      const uniqueEndorsers = new Set(data?.map(v => v.from_user_id)).size;

      return {
        total: data?.length || 0,
        uniqueEndorsers,
        typeCount,
      };
    },
    enabled: !!user?.id,
  });

  const total = vouchStats?.total || 0;

  return (
    <Card className="bg-card border-border plug-card-hover" data-tour="vouch-widget">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-pink-500/10">
              <Heart className="w-4 h-4 text-pink-500" />
            </div>
          <span className="font-medium text-sm">
            {isRTL ? 'המלצות' : 'Vouches'}
          </span>
          </div>
          <span className="text-2xl font-bold text-foreground">{total}</span>
        </div>

        {total > 0 && (
          <p className="text-xs text-muted-foreground mb-3">
            {isRTL 
              ? `מ-${vouchStats?.uniqueEndorsers || 0} אנשים`
              : `From ${vouchStats?.uniqueEndorsers || 0} people`
            }
          </p>
        )}

        <div className="flex gap-2">
          <GiveVouchDialog trigger={
            <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs">
              <Heart className="w-3.5 h-3.5" />
              {isRTL ? 'תן' : 'Give'}
            </Button>
          } />
          <RequestVouchDialog trigger={
            <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs">
              <Heart className="w-3.5 h-3.5" />
              {isRTL ? 'בקש' : 'Request'}
            </Button>
          } />
        </div>
      </CardContent>
    </Card>
  );
}
