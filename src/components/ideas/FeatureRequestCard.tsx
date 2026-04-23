import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { REQUEST_STATUSES, SYSTEM_AREAS, TARGET_AUDIENCES } from '@/lib/feature-badges';
import { BadgeDisplay } from './BadgeDisplay';
import { ChevronUp, Play, Paperclip, ExternalLink, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface FeatureRequest {
  id: string;
  title: string;
  description: string | null;
  system_area: string;
  target_audience: string;
  priority: number;
  status: string;
  voice_url: string | null;
  attachments: string[];
  link_url: string | null;
  votes_count: number;
  comments_count: number;
  created_at: string;
  author_id: string;
  admin_response: string | null;
  profiles?: { full_name: string } | null;
  user_badges?: Array<{ badge_type: string }>;
}

interface FeatureRequestCardProps {
  request: FeatureRequest;
  hasVoted: boolean;
  onVoteChange: () => void;
}

export function FeatureRequestCard({ request, hasVoted, onVoteChange }: FeatureRequestCardProps) {
  const { language } = useLanguage();
  const isHe = language === 'he';
  const { user } = useAuth();
  const [voting, setVoting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);

  const statusConfig = REQUEST_STATUSES[request.status as keyof typeof REQUEST_STATUSES] || REQUEST_STATUSES.submitted;
  const areaLabel = SYSTEM_AREAS[request.system_area as keyof typeof SYSTEM_AREAS];
  const audienceLabel = TARGET_AUDIENCES[request.target_audience as keyof typeof TARGET_AUDIENCES];

  const handleVote = async () => {
    if (!user || voting) return;
    setVoting(true);
    try {
      if (hasVoted) {
        await (supabase.from('feature_request_votes') as any)
          .delete()
          .eq('request_id', request.id)
          .eq('user_id', user.id);
      } else {
        await (supabase.from('feature_request_votes') as any)
          .insert({ request_id: request.id, user_id: user.id });
      }
      onVoteChange();
    } catch {
      toast.error(isHe ? 'שגיאה בהצבעה' : 'Vote error');
    }
    setVoting(false);
  };

  const playVoice = async () => {
    if (!request.voice_url) return;
    try {
      const { data } = await (supabase.storage.from('feature-attachments') as any)
        .createSignedUrl(request.voice_url, 3600);
      if (data?.signedUrl) {
        const audio = new Audio(data.signedUrl);
        audio.onended = () => setPlayingAudio(false);
        audio.play();
        setPlayingAudio(true);
      }
    } catch { /* ignore */ }
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / 86400000);
    if (days > 30) return new Date(date).toLocaleDateString(isHe ? 'he-IL' : 'en-US');
    if (days > 0) return isHe ? `לפני ${days} ימים` : `${days}d ago`;
    const hours = Math.floor(diff / 3600000);
    if (hours > 0) return isHe ? `לפני ${hours} שעות` : `${hours}h ago`;
    return isHe ? 'עכשיו' : 'just now';
  };

  return (
    <Card className="bg-card border-border hover:border-primary/20 transition-colors">
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Vote button */}
          <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleVote}
              disabled={!user || voting}
              className={`h-8 w-8 p-0 ${hasVoted ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
            >
              <ChevronUp className="w-5 h-5" />
            </Button>
            <span className={`text-sm font-bold ${hasVoted ? 'text-primary' : 'text-muted-foreground'}`}>
              {request.votes_count}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3
                className="font-semibold text-sm text-foreground cursor-pointer hover:text-primary transition-colors"
                onClick={() => setExpanded(!expanded)}
              >
                {request.title}
              </h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${statusConfig.color}`}>
                {statusConfig[isHe ? 'he' : 'en']}
              </span>
            </div>

            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {areaLabel && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {areaLabel[isHe ? 'he' : 'en']}
                </span>
              )}
              {audienceLabel && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {audienceLabel[isHe ? 'he' : 'en']}
                </span>
              )}
              {request.voice_url && (
                <button onClick={playVoice} className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5">
                  <Play className="w-3 h-3" />
                  {isHe ? 'הקלטה' : 'Audio'}
                </button>
              )}
              {request.attachments?.length > 0 && (
                <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
                  <Paperclip className="w-3 h-3" />
                  {request.attachments.length}
                </span>
              )}
              {request.link_url && (
                <a href={request.link_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5">
                  <ExternalLink className="w-3 h-3" />
                  {isHe ? 'קישור' : 'Link'}
                </a>
              )}
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
              <span>{(request.profiles as any)?.full_name || (isHe ? 'אנונימי' : 'Anonymous')}</span>
              {request.user_badges && request.user_badges.length > 0 && (
                <BadgeDisplay badges={request.user_badges} size="sm" />
              )}
              <span>•</span>
              <span>{timeAgo(request.created_at)}</span>
              {request.priority && (
                <>
                  <span>•</span>
                  <span>{'⭐'.repeat(Math.min(request.priority, 5))}</span>
                </>
              )}
            </div>

            {/* Expanded content */}
            {expanded && (
              <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                {request.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {request.description}
                  </p>
                )}
                {request.admin_response && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-2.5">
                    <span className="text-[10px] text-primary font-semibold">
                      {isHe ? 'תגובת PLUG:' : 'PLUG Response:'}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">{request.admin_response}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
