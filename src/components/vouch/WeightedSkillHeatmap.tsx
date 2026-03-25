import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Shield, ShieldCheck, Award, Crown, User } from 'lucide-react';

interface WeightedSkill {
  skillId: string;
  skillName: string;
  skillNameHe: string;
  skillType: 'hard' | 'soft';
  totalWeight: number;
  vouchCount: number;
  vouchers: {
    id: string;
    name: string;
    avatar?: string;
    weight: number;
    reliabilityTier: 'bronze' | 'silver' | 'gold' | 'verified';
  }[];
}

interface WeightedSkillHeatmapProps {
  userId: string;
  compact?: boolean;
}

// Reliability tier icons and colors
const reliabilityConfig = {
  bronze: { icon: Shield, color: 'text-orange-600', label: 'Bronze', labelHe: 'ברונזה' },
  silver: { icon: ShieldCheck, color: 'text-slate-400', label: 'Silver', labelHe: 'כסף' },
  gold: { icon: Award, color: 'text-yellow-500', label: 'Gold', labelHe: 'זהב' },
  verified: { icon: Crown, color: 'text-primary', label: 'Verified', labelHe: 'מאומת' },
};

function getReliabilityTier(weight: number): 'bronze' | 'silver' | 'gold' | 'verified' {
  if (weight >= 5) return 'verified';
  if (weight >= 3) return 'gold';
  if (weight >= 2) return 'silver';
  return 'bronze';
}

export function WeightedSkillHeatmap({ userId, compact = false }: WeightedSkillHeatmapProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  // Fetch vouches with skill information
  const { data: vouches = [] } = useQuery({
    queryKey: ['vouches-with-skills', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vouches')
        .select(`
          id,
          from_user_id,
          skill_ids,
          weight
        `)
        .eq('to_user_id', userId)
        .eq('is_public', true);
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch voucher profiles
  const voucherIds = [...new Set(vouches.map(v => v.from_user_id))];
  const { data: profiles = [] } = useQuery({
    queryKey: ['voucher-profiles', voucherIds],
    queryFn: async () => {
      if (voucherIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('profiles_secure')
        .select('user_id, full_name, avatar_url')
        .in('user_id', voucherIds);
      
      if (error) throw error;
      return data;
    },
    enabled: voucherIds.length > 0,
  });

  // Fetch skills
  const allSkillIds = [...new Set(vouches.flatMap(v => v.skill_ids || []))];
  const { data: skills = [] } = useQuery({
    queryKey: ['vouch-skills', allSkillIds],
    queryFn: async () => {
      if (allSkillIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('master_skills')
        .select('*')
        .in('id', allSkillIds);
      
      if (error) throw error;
      return data;
    },
    enabled: allSkillIds.length > 0,
  });

  // Aggregate skills by weight
  const weightedSkills = useMemo(() => {
    const skillMap = new Map<string, WeightedSkill>();
    const profileMap = new Map(profiles.map(p => [p.user_id, p]));
    const skillDataMap = new Map(skills.map(s => [s.id, s]));

    vouches.forEach(vouch => {
      const voucherProfile = profileMap.get(vouch.from_user_id);
      const voucherInfo = {
        id: vouch.from_user_id,
        name: voucherProfile?.full_name || 'Unknown',
        avatar: voucherProfile?.avatar_url,
        weight: vouch.weight || 1,
        reliabilityTier: getReliabilityTier(vouch.weight || 1),
      };

      (vouch.skill_ids || []).forEach((skillId: string) => {
        const skillData = skillDataMap.get(skillId);
        if (!skillData) return;

        if (!skillMap.has(skillId)) {
          skillMap.set(skillId, {
            skillId,
            skillName: skillData.name_en,
            skillNameHe: skillData.name_he,
            skillType: skillData.skill_type as 'hard' | 'soft',
            totalWeight: 0,
            vouchCount: 0,
            vouchers: [],
          });
        }

        const skill = skillMap.get(skillId)!;
        skill.totalWeight += vouch.weight || 1;
        skill.vouchCount += 1;
        skill.vouchers.push(voucherInfo);
      });
    });

    // Sort by total weight (highest first)
    return Array.from(skillMap.values()).sort((a, b) => b.totalWeight - a.totalWeight);
  }, [vouches, profiles, skills]);

  if (weightedSkills.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-4 text-sm">
        {isHebrew ? 'אין מיומנויות מאומתות עדיין' : 'No verified skills yet'}
      </div>
    );
  }

  // Calculate max weight for scaling
  const maxWeight = Math.max(...weightedSkills.map(s => s.totalWeight), 1);

  // Limit display in compact mode
  const displaySkills = compact ? weightedSkills.slice(0, 8) : weightedSkills;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {displaySkills.map(skill => {
          // Calculate visual properties based on weight
          const weightRatio = skill.totalWeight / maxWeight;
          const fontSize = 0.75 + (weightRatio * 0.25); // 0.75rem to 1rem
          const glowIntensity = Math.min(weightRatio * 20, 20); // 0-20px glow
          const showGlow = weightRatio >= 0.5;

          const ReliabilityIcon = reliabilityConfig[skill.vouchers[0]?.reliabilityTier || 'bronze'].icon;

          return (
            <Dialog key={skill.skillId}>
              <DialogTrigger asChild>
                <Badge
                  variant={skill.skillType === 'hard' ? 'default' : 'secondary'}
                  className={cn(
                    "cursor-pointer transition-all duration-300 hover:scale-105",
                    skill.skillType === 'soft' && "bg-accent/20 text-accent-foreground border-accent",
                    showGlow && "shadow-lg"
                  )}
                  style={{
                    fontSize: `${fontSize}rem`,
                    boxShadow: showGlow 
                      ? `0 0 ${glowIntensity}px hsl(var(--primary) / 0.5)` 
                      : undefined,
                  }}
                >
                  {isHebrew ? skill.skillNameHe : skill.skillName}
                  <span className="ml-1 text-[0.65em] opacity-70">
                    ({skill.vouchCount})
                  </span>
                </Badge>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Badge 
                      variant={skill.skillType === 'hard' ? 'default' : 'secondary'}
                      className={skill.skillType === 'soft' ? "bg-accent/20" : ""}
                    >
                      {isHebrew ? skill.skillNameHe : skill.skillName}
                    </Badge>
                    <span className="text-sm font-normal text-muted-foreground">
                      {isHebrew 
                        ? `משקל: ${skill.totalWeight.toFixed(1)}`
                        : `Weight: ${skill.totalWeight.toFixed(1)}`}
                    </span>
                  </DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-64">
                  <div className="space-y-3 p-1">
                    {skill.vouchers
                      .sort((a, b) => b.weight - a.weight)
                      .map((voucher, idx) => {
                        const tierConfig = reliabilityConfig[voucher.reliabilityTier];
                        const TierIcon = tierConfig.icon;
                        
                        return (
                          <div 
                            key={`${voucher.id}-${idx}`}
                            className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
                          >
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={voucher.avatar || ''} />
                              <AvatarFallback>
                                <User className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {voucher.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {isHebrew 
                                  ? `משקל: ${voucher.weight.toFixed(1)}`
                                  : `Weight: ${voucher.weight.toFixed(1)}`}
                              </p>
                            </div>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <TierIcon className={cn("h-5 w-5", tierConfig.color)} />
                                </TooltipTrigger>
                                <TooltipContent>
                                  {isHebrew ? tierConfig.labelHe : tierConfig.label}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        );
                      })}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          );
        })}
      </div>

      {compact && weightedSkills.length > 8 && (
        <p className="text-xs text-muted-foreground text-center">
          {isHebrew 
            ? `+${weightedSkills.length - 8} מיומנויות נוספות`
            : `+${weightedSkills.length - 8} more skills`}
        </p>
      )}
    </div>
  );
}
