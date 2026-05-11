import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Award, Plus, Trophy, Star, Zap, Target, Shield, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { he, enUS } from 'date-fns/locale';

interface BadgesSectionProps {
  hubId: string;
  isAdmin: boolean;
}

const BADGE_ICONS: Record<string, typeof Award> = {
  award: Award,
  trophy: Trophy,
  star: Star,
  zap: Zap,
  target: Target,
  shield: Shield,
};

const BADGE_COLORS = [
  'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  'bg-blue-500/10 text-blue-600 border-blue-500/30',
  'bg-green-500/10 text-green-600 border-green-500/30',
  'bg-purple-500/10 text-purple-600 border-purple-500/30',
  'bg-red-500/10 text-red-600 border-red-500/30',
  'bg-orange-500/10 text-orange-600 border-orange-500/30',
];

export function BadgesSection({ hubId, isAdmin }: BadgesSectionProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data: badges = [], isLoading } = useQuery({
    queryKey: ['community-badges', hubId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('community_badges')
        .select('*')
        .eq('hub_id', hubId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: myAwards = [] } = useQuery({
    queryKey: ['community-badge-awards', hubId, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await (supabase as any)
        .from('community_badge_awards')
        .select('*, badge:community_badges(*)')
        .eq('user_id', user.id);
      if (error) throw error;
      return (data || []).filter((a: any) => a.badge?.hub_id === hubId);
    },
    enabled: !!user?.id,
  });

  const createBadge = useMutation({
    mutationFn: async (form: {
      name: string;
      description: string;
      icon: string;
      color_index: number;
      criteria: string;
    }) => {
      const { error } = await (supabase as any)
        .from('community_badges')
        .insert({
          hub_id: hubId,
          name: form.name,
          description: form.description,
          icon: form.icon,
          criteria: form.criteria,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-badges', hubId] });
      setShowCreate(false);
      toast.success(isRTL ? 'התג נוצר בהצלחה' : 'Badge created');
    },
    onError: () => toast.error(isRTL ? 'שגיאה ביצירת תג' : 'Failed to create badge'),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="animate-pulse h-28" />
        ))}
      </div>
    );
  }

  const myBadgeIds = new Set(myAwards.map((a: any) => a.badge_id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-500" />
            {isRTL ? 'תגים והישגים' : 'Badges & Achievements'}
          </h3>
          {myAwards.length > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {isRTL
                ? `קיבלת ${myAwards.length} מתוך ${badges.length} תגים`
                : `You earned ${myAwards.length} of ${badges.length} badges`}
            </p>
          )}
        </div>

        {isAdmin && (
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" />
                {isRTL ? 'תג חדש' : 'New Badge'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{isRTL ? 'יצירת תג חדש' : 'Create New Badge'}</DialogTitle>
              </DialogHeader>
              <CreateBadgeForm
                isRTL={isRTL}
                onSubmit={(form) => createBadge.mutate(form)}
                isLoading={createBadge.isPending}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {badges.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground">
              {isRTL ? 'אין תגים עדיין בקהילה הזו' : 'No badges in this community yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {badges.map((badge: any, idx: number) => {
            const earned = myBadgeIds.has(badge.id);
            const colorClass = BADGE_COLORS[idx % BADGE_COLORS.length];
            const IconComp = BADGE_ICONS[badge.icon] || Award;

            return (
              <Card
                key={badge.id}
                className={cn(
                  'transition-all',
                  earned ? 'border ' + colorClass.split(' ').find(c => c.startsWith('border-')) : 'opacity-60 grayscale'
                )}
              >
                <CardContent className="p-4 text-center">
                  <div className={cn(
                    'w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center',
                    earned ? colorClass : 'bg-muted text-muted-foreground'
                  )}>
                    <IconComp className="w-6 h-6" />
                  </div>
                  <p className="font-medium text-sm">{badge.name}</p>
                  {badge.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {badge.description}
                    </p>
                  )}
                  {earned && (
                    <Badge variant="outline" className="mt-2 text-xs text-green-600 border-green-500/30">
                      {isRTL ? 'הושג!' : 'Earned!'}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* My recent awards */}
      {myAwards.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            {isRTL ? 'ההישגים האחרונים שלי' : 'My Recent Awards'}
          </h4>
          <div className="flex flex-wrap gap-2">
            {myAwards.slice(0, 8).map((award: any) => (
              <Badge key={award.id} variant="secondary" className="gap-1.5 py-1">
                <Award className="w-3.5 h-3.5" />
                {award.badge?.name || 'Badge'}
                <span className="text-muted-foreground text-[10px]">
                  {formatDistanceToNow(new Date(award.awarded_at), {
                    addSuffix: true,
                    locale: isRTL ? he : enUS,
                  })}
                </span>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CreateBadgeForm({
  isRTL,
  onSubmit,
  isLoading,
}: {
  isRTL: boolean;
  onSubmit: (form: { name: string; description: string; icon: string; color_index: number; criteria: string }) => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('award');
  const [criteria, setCriteria] = useState('');

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSubmit({ name: name.trim(), description: description.trim(), icon, color_index: 0, criteria: criteria.trim() });
      }}
    >
      <div className="space-y-2">
        <Label>{isRTL ? 'שם התג' : 'Badge Name'}</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={isRTL ? 'לדוגמה: תורם פעיל' : 'e.g. Active Contributor'} />
      </div>

      <div className="space-y-2">
        <Label>{isRTL ? 'תיאור' : 'Description'}</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder={isRTL ? 'מה צריך לעשות כדי לקבל את התג' : 'What is required to earn this badge'} />
      </div>

      <div className="space-y-2">
        <Label>{isRTL ? 'אייקון' : 'Icon'}</Label>
        <Select value={icon} onValueChange={setIcon}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(BADGE_ICONS).map(([key, Icon]) => (
              <SelectItem key={key} value={key}>
                <span className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  {key}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{isRTL ? 'קריטריון (אופציונלי)' : 'Criteria (optional)'}</Label>
        <Input value={criteria} onChange={(e) => setCriteria(e.target.value)} placeholder={isRTL ? 'לדוגמה: השלמת 5 קורסים' : 'e.g. Complete 5 courses'} />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading || !name.trim()}>
        {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
        {isRTL ? 'צור תג' : 'Create Badge'}
      </Button>
    </form>
  );
}
