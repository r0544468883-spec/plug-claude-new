import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, BookOpen, Building2, GraduationCap, Layers } from 'lucide-react';

interface CommunityHub {
  id: string;
  name_en: string;
  name_he: string;
  description_en: string | null;
  description_he: string | null;
  template: string;
  avatar_url: string | null;
  member_count: number;
  is_public: boolean;
}

interface CommunityCardProps {
  hub: CommunityHub;
  isMember: boolean;
  onJoin: (hubId: string) => void;
  onView: (hubId: string) => void;
  joining?: boolean;
}

const templateConfig: Record<string, { icon: typeof BookOpen; label_en: string; label_he: string; color: string }> = {
  expert_hub: { icon: BookOpen, label_en: 'Expert Hub', label_he: 'מרכז מומחים', color: 'text-blue-400' },
  branding_lounge: { icon: Building2, label_en: 'Branding Lounge', label_he: 'לאונג\' מיתוג', color: 'text-purple-400' },
  career_academy: { icon: GraduationCap, label_en: 'Career Academy', label_he: 'אקדמיית קריירה', color: 'text-amber-400' },
  custom: { icon: Layers, label_en: 'Community', label_he: 'קהילה', color: 'text-primary' },
};

export function CommunityCard({ hub, isMember, onJoin, onView, joining }: CommunityCardProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const config = templateConfig[hub.template] || templateConfig.custom;
  const TemplateIcon = config.icon;

  return (
    <Card className="bg-white shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer" onClick={() => isMember ? onView(hub.id) : undefined}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start gap-3">
          <Avatar className="w-12 h-12 rounded-xl">
            <AvatarImage src={hub.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary rounded-xl font-bold">
              {(isHebrew ? hub.name_he : hub.name_en)?.charAt(0)?.toUpperCase() || 'C'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{isHebrew ? hub.name_he : hub.name_en}</h3>
            <Badge variant="outline" className={`gap-1 text-xs ${config.color}`}>
              <TemplateIcon className="w-3 h-3" />
              {isHebrew ? config.label_he : config.label_en}
            </Badge>
          </div>
        </div>

        {(isHebrew ? hub.description_he : hub.description_en) && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {isHebrew ? hub.description_he : hub.description_en}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{hub.member_count} {isHebrew ? 'חברים' : 'members'}</span>
            <span className="mx-1">·</span>
            {hub.member_count > 10 ? (
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs">{isHebrew ? 'פעילה' : 'Active'}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-gray-400">
                <span className="w-2 h-2 rounded-full bg-gray-300" />
                <span className="text-xs">{isHebrew ? 'שקטה' : 'Quiet'}</span>
              </span>
            )}
          </div>

          {isMember ? (
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onView(hub.id); }}>
              {isHebrew ? 'כניסה' : 'Enter'}
            </Button>
          ) : (
            <Button size="sm" disabled={joining} onClick={(e) => { e.stopPropagation(); onJoin(hub.id); }}>
              {isHebrew ? 'הצטרף' : 'Join'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
