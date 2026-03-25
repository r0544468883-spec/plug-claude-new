import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Users, Clock, Zap, Lock, Globe, ExternalLink } from 'lucide-react';

interface Mission {
  id: string;
  title: string;
  description: string | null;
  commission_model: string;
  commission_value: number;
  scope: string;
  urgency: string;
  status: string;
  created_at: string;
  company_website?: string | null;
  company?: { name: string; logo_url: string | null; industry: string | null } | null;
  bid_count?: number;
}

interface MissionCardProps {
  mission: Mission;
  onBid: (missionId: string) => void;
  onView: (missionId: string) => void;
  isCreator?: boolean;
  showBidButton?: boolean;
}

export function MissionCard({ mission, onBid, onView, isCreator, showBidButton }: MissionCardProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const urgencyConfig = {
    standard: { color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', label: isHebrew ? 'רגיל' : 'Standard' },
    high: { color: 'bg-orange-500/10 text-orange-600 border-orange-500/20', label: isHebrew ? 'גבוה' : 'High' },
    critical: { color: 'bg-red-500/10 text-red-600 border-red-500/20', label: isHebrew ? 'קריטי' : 'Critical' },
  };

  const urgency = urgencyConfig[mission.urgency as keyof typeof urgencyConfig] || urgencyConfig.standard;

  const commissionLabel = mission.commission_model === 'percentage'
    ? `${mission.commission_value}%`
    : `₪${mission.commission_value.toLocaleString()}`;

  return (
    <Card 
      className="bg-card border-border hover:border-primary/30 transition-all cursor-pointer group"
      onClick={() => onView(mission.id)}
    >
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              {mission.company?.logo_url ? (
                <img src={mission.company.logo_url} alt="" className="w-8 h-8 rounded" />
              ) : (
                <Building2 className="w-5 h-5 text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {mission.title}
              </h3>
              <p className="text-sm text-muted-foreground truncate">
                {mission.company?.name || (isHebrew ? 'חברה' : 'Company')}
              </p>
            </div>
          </div>
          <Badge variant="outline" className={urgency.color}>
            <Zap className="w-3 h-3 me-1" />
            {urgency.label}
          </Badge>
        </div>

        {/* Description */}
        {mission.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{mission.description}</p>
        )}

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            {mission.scope === 'exclusive' ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
            {mission.scope === 'exclusive' ? (isHebrew ? 'בלעדי' : 'Exclusive') : (isHebrew ? 'פתוח' : 'Open')}
          </Badge>
          <Badge variant="outline" className="font-mono font-semibold text-primary">
            {commissionLabel}
          </Badge>
          {mission.company?.industry && (
            <Badge variant="outline" className="text-muted-foreground">
              {mission.company.industry}
            </Badge>
          )}
          {mission.company_website && (
            <a
              href={mission.company_website.startsWith('http') ? mission.company_website : `https://${mission.company_website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-3 h-3" />
              {isHebrew ? 'אתר' : 'Website'}
            </a>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{mission.bid_count || 0} {isHebrew ? 'הצעות' : 'bids'}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {new Date(mission.created_at).toLocaleDateString()}
          </div>
        </div>

        {/* CTA - only hunters (freelance_hr) can bid */}
        {!isCreator && showBidButton && (
          <Button 
            className="w-full gap-2"
            onClick={(e) => { e.stopPropagation(); onBid(mission.id); }}
          >
            <Zap className="w-4 h-4" />
            {isHebrew ? 'הגש הצעה' : 'Bid on Project'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
