import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Award, ExternalLink, Share2, ShieldCheck, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { he, enUS } from 'date-fns/locale';

interface OpenBadgeCardProps {
  badge: {
    id: string;
    name_en: string;
    name_he?: string;
    description_en?: string;
    description_he?: string;
    icon?: string;
    color?: string;
    badge_class_url?: string;
    issuer_name?: string;
    issuer_url?: string;
    criteria_url?: string;
    image_url?: string;
  };
  award?: {
    id: string;
    awarded_at: string;
    assertion_url?: string;
    verification_hash?: string;
    expires_at?: string;
  } | null;
  compact?: boolean;
}

const COLOR_MAP: Record<string, string> = {
  gold: 'border-amber-300 bg-amber-50/50',
  silver: 'border-gray-300 bg-gray-50/50',
  bronze: 'border-orange-300 bg-orange-50/50',
  blue: 'border-blue-300 bg-blue-50/50',
  green: 'border-green-300 bg-green-50/50',
  purple: 'border-purple-300 bg-purple-50/50',
};

const ICON_BG: Record<string, string> = {
  gold: 'bg-amber-100 text-amber-600',
  silver: 'bg-gray-100 text-gray-600',
  bronze: 'bg-orange-100 text-orange-600',
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  purple: 'bg-purple-100 text-purple-600',
};

export function OpenBadgeCard({ badge, award, compact = false }: OpenBadgeCardProps) {
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const name = isRTL ? (badge.name_he || badge.name_en) : badge.name_en;
  const description = isRTL ? (badge.description_he || badge.description_en) : badge.description_en;
  const color = badge.color || 'blue';
  const isExpired = award?.expires_at ? new Date(award.expires_at) < new Date() : false;

  const handleShare = async () => {
    const text = isRTL
      ? `קיבלתי את התג "${name}" מ-${badge.issuer_name || 'PLUG'}!`
      : `I earned the "${name}" badge from ${badge.issuer_name || 'PLUG'}!`;
    const url = award?.assertion_url || badge.badge_class_url || '';

    if (navigator.share) {
      try {
        await navigator.share({ title: name, text, url });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast.success(isRTL ? 'הקישור הועתק' : 'Link copied');
    }
  };

  if (compact) {
    return (
      <div className={cn(
        'flex items-center gap-2 p-2 rounded-lg border',
        award ? COLOR_MAP[color] : 'border-border opacity-50',
      )}>
        {badge.image_url ? (
          <img src={badge.image_url} alt={name} className="w-8 h-8 rounded" />
        ) : (
          <div className={cn('w-8 h-8 rounded flex items-center justify-center', ICON_BG[color])}>
            <Award className="w-4 h-4" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{name}</p>
          {award && (
            <p className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(award.awarded_at), {
                addSuffix: true,
                locale: isRTL ? he : enUS,
              })}
            </p>
          )}
        </div>
        {award?.verification_hash && (
          <ShieldCheck className="w-3.5 h-3.5 text-green-500 shrink-0" />
        )}
      </div>
    );
  }

  return (
    <Card className={cn(
      'transition-all',
      award ? COLOR_MAP[color] : 'border-border opacity-60',
    )}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          {badge.image_url ? (
            <img src={badge.image_url} alt={name} className="w-12 h-12 rounded-lg" />
          ) : (
            <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center shrink-0', ICON_BG[color])}>
              <Award className="w-6 h-6" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold">{name}</h4>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
            )}
          </div>
        </div>

        {/* Open Badge metadata */}
        <div className="flex flex-wrap gap-1.5">
          {badge.issuer_name && (
            <Badge variant="outline" className="text-[10px] gap-1">
              {isRTL ? 'מנפיק:' : 'Issuer:'} {badge.issuer_name}
            </Badge>
          )}
          {award?.verification_hash && (
            <Badge variant="outline" className="text-[10px] gap-1 text-green-600 border-green-300">
              <ShieldCheck className="w-2.5 h-2.5" />
              {isRTL ? 'מאומת' : 'Verified'}
            </Badge>
          )}
          {isExpired && (
            <Badge variant="outline" className="text-[10px] gap-1 text-red-600 border-red-300">
              <Clock className="w-2.5 h-2.5" />
              {isRTL ? 'פג תוקף' : 'Expired'}
            </Badge>
          )}
        </div>

        {/* Award info */}
        {award && (
          <div className="flex items-center justify-between pt-1">
            <p className="text-[10px] text-muted-foreground">
              {isRTL ? 'הוענק ' : 'Awarded '}
              {formatDistanceToNow(new Date(award.awarded_at), {
                addSuffix: true,
                locale: isRTL ? he : enUS,
              })}
            </p>
            <div className="flex gap-1">
              {award.assertion_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => window.open(award.assertion_url!, '_blank')}
                >
                  <ExternalLink className="w-3 h-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={handleShare}
              >
                <Share2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Criteria link */}
        {badge.criteria_url && (
          <Button
            variant="link"
            size="sm"
            className="text-xs p-0 h-auto gap-1"
            onClick={() => window.open(badge.criteria_url!, '_blank')}
          >
            <ExternalLink className="w-3 h-3" />
            {isRTL ? 'צפה בקריטריונים' : 'View criteria'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
