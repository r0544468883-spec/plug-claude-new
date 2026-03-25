import { useQuery } from '@tanstack/react-query';
import { Heart, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { VouchCard } from './VouchCard';

interface CandidateVouchBadgeProps {
  candidateId: string;
  candidateName?: string;
}

export function CandidateVouchBadge({ candidateId, candidateName }: CandidateVouchBadgeProps) {
  const { language } = useLanguage();
  const isRTL = language === 'he';

  const { data: vouches, isLoading } = useQuery({
    queryKey: ['candidate-vouches', candidateId],
    queryFn: async () => {
      // First get vouches
      const { data: vouchesData, error: vouchError } = await supabase
        .from('vouches')
        .select('*')
        .eq('to_user_id', candidateId)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (vouchError) throw vouchError;
      if (!vouchesData || vouchesData.length === 0) return [];

      // Get unique from_user_ids
      const fromUserIds = [...new Set(vouchesData.map(v => v.from_user_id))];

      // Fetch profiles for those users (use profiles_secure for safety)
      const { data: profiles } = await supabase
        .from('profiles_secure')
        .select('user_id, full_name, avatar_url')
        .in('user_id', fromUserIds);

      // Map profiles to vouches
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return vouchesData.map(vouch => ({
        ...vouch,
        from_profile: profileMap.get(vouch.from_user_id) as { full_name: string; avatar_url: string | null } | undefined,
      }));
    },
    enabled: !!candidateId,
  });

  if (isLoading || !vouches || vouches.length === 0) {
    return null;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-2 text-pink-600 hover:text-pink-700 hover:bg-pink-50 dark:text-pink-400 dark:hover:bg-pink-950/20"
        >
          <Heart className="w-4 h-4 fill-current" />
          <span className="text-sm">
            {isRTL 
              ? `למועמד/ת יש ${vouches.length} המלצות`
              : `Candidate has ${vouches.length} endorsements`
            }
          </span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-500" />
            {isRTL 
              ? `המלצות${candidateName ? ` עבור ${candidateName}` : ''}`
              : `Endorsements${candidateName ? ` for ${candidateName}` : ''}`
            }
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {vouches.map((vouch) => (
            <VouchCard 
              key={vouch.id} 
              vouch={{
                id: vouch.id,
                from_user_id: vouch.from_user_id,
                vouch_type: vouch.vouch_type,
                relationship: vouch.relationship,
                message: vouch.message,
                skills: vouch.skills,
                created_at: vouch.created_at || '',
                from_profile: vouch.from_profile,
              }} 
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
