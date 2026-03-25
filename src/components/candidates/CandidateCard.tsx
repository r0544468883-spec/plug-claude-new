import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SendMessageDialog } from '@/components/messaging/SendMessageDialog';
import { StagnationAlert } from './StagnationAlert';
import { RetentionRiskBadge } from './RetentionRiskBadge';
import { Progress } from '@/components/ui/progress';
import { 
  Heart, Globe, Linkedin, Github, Phone, Briefcase, MessageSquare, User, TrendingUp, Clock, Video, Sparkles, ChevronDown, ChevronUp
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CandidateProfile {
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  portfolio_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  allow_recruiter_contact: boolean;
  response_rate?: number | null;
  avg_response_time_hours?: number | null;
  personal_tagline?: string | null;
  about_me?: string | null;
  intro_video_url?: string | null;
}

interface Candidate {
  id: string;
  candidate_id: string;
  status: string;
  current_stage: string;
  match_score: number | null;
  created_at: string;
  last_interaction?: string | null;
  last_stage_change_at?: string | null;
  stagnation_snoozed_until?: string | null;
  ai_candidate_summary?: any;
  job: { id: string; title: string };
  profile: CandidateProfile | null;
  vouch_count: number;
}

interface CandidateCardProps {
  candidate: Candidate;
  onRefresh?: () => void;
}

const stageColors: Record<string, string> = {
  applied: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  screening: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  interview: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  offer: 'bg-green-500/10 text-green-500 border-green-500/20',
  hired: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
  withdrawn: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
};

const stageLabels: Record<string, { en: string; he: string }> = {
  applied: { en: 'Applied', he: 'הוגש' },
  screening: { en: 'Screening', he: 'סינון' },
  interview: { en: 'Interview', he: 'ראיון' },
  offer: { en: 'Offer', he: 'הצעה' },
  hired: { en: 'Hired', he: 'התקבל' },
  rejected: { en: 'Rejected', he: 'נדחה' },
  withdrawn: { en: 'Withdrawn', he: 'בוטל' },
};

const stageProgress: Record<string, number> = {
  applied: 20, screening: 40, interview: 60, offer: 80, hired: 100, rejected: 0, withdrawn: 0,
};

export function CandidateCard({ candidate, onRefresh }: CandidateCardProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isHebrew = language === 'he';
  const profile = candidate.profile;
  const [showSummary, setShowSummary] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summary, setSummary] = useState<any>(candidate.ai_candidate_summary || null);

  const timeAgo = formatDistanceToNow(new Date(candidate.created_at), {
    addSuffix: true,
    locale: isHebrew ? he : enUS,
  });

  const daysSinceChange = candidate.last_stage_change_at
    ? Math.floor((Date.now() - new Date(candidate.last_stage_change_at).getTime()) / (1000 * 60 * 60 * 24))
    : Math.floor((Date.now() - new Date(candidate.created_at).getTime()) / (1000 * 60 * 60 * 24));

  const daysSinceInteraction = candidate.last_interaction
    ? Math.floor((Date.now() - new Date(candidate.last_interaction).getTime()) / (1000 * 60 * 60 * 24))
    : daysSinceChange;

  const progressValue = stageProgress[candidate.current_stage] ?? 20;
  const isTerminal = ['rejected', 'withdrawn', 'hired'].includes(candidate.current_stage);

  const openWhatsApp = () => {
    if (!profile?.phone) return;
    const phone = profile.phone.replace(/\D/g, '');
    const message = encodeURIComponent(
      isHebrew
        ? `שלום ${profile.full_name}, ראיתי את המועמדות שלך למשרת ${candidate.job?.title}. אשמח לשוחח איתך.`
        : `Hi ${profile.full_name}, I saw your application for the ${candidate.job?.title} position. I'd love to chat with you.`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const goToProfile = () => {
    if (candidate.candidate_id) navigate(`/candidate/${candidate.candidate_id}`);
  };

  const generateSummary = async () => {
    setLoadingSummary(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-candidate-summary', {
        body: { candidateId: candidate.candidate_id, applicationId: candidate.id },
      });
      if (error) throw error;
      setSummary(data.summary);
      setShowSummary(true);
      toast.success(isHebrew ? 'סיכום AI נוצר' : 'AI Summary generated');
    } catch (e) {
      toast.error(isHebrew ? 'שגיאה ביצירת סיכום' : 'Failed to generate summary');
    } finally {
      setLoadingSummary(false);
    }
  };

  return (
    <Card className="bg-card border-border hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <Avatar className="w-12 h-12">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">
              {profile?.full_name || (isHebrew ? 'מועמד לא ידוע' : 'Unknown Candidate')}
            </h3>
            {profile?.personal_tagline ? (
              <p className="text-sm text-muted-foreground line-clamp-1 italic">"{profile.personal_tagline}"</p>
            ) : (
              <p className="text-sm text-muted-foreground truncate">{candidate.job?.title}</p>
            )}
          </div>
          {candidate.match_score && (
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">{candidate.match_score}%</span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {!isTerminal && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">{isHebrew ? 'התקדמות' : 'Progress'}</span>
              <span className="text-xs font-medium text-primary">{progressValue}%</span>
            </div>
            <Progress value={progressValue} className="h-1.5" />
          </div>
        )}

        {/* Badges Row */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Badge variant="outline" className={cn('border', stageColors[candidate.current_stage] || stageColors.applied)}>
            {stageLabels[candidate.current_stage]?.[isHebrew ? 'he' : 'en'] || candidate.current_stage}
          </Badge>

          {/* Stagnation Alert */}
          {!isTerminal && (
            <StagnationAlert
              applicationId={candidate.id}
              candidateId={candidate.candidate_id}
              candidateName={profile?.full_name || ''}
              daysSinceChange={daysSinceChange}
              snoozedUntil={(candidate as any).stagnation_snoozed_until || null}
              currentStage={candidate.current_stage}
              onAction={onRefresh}
            />
          )}

          {/* Retention Risk */}
          {!isTerminal && (
            <RetentionRiskBadge
              daysSinceInteraction={daysSinceInteraction}
              responseRate={profile?.response_rate ?? null}
            />
          )}

          {candidate.vouch_count > 0 && (
            <Badge variant="outline" className="gap-1 border-pink-500/20 text-pink-500">
              <Heart className="w-3 h-3" />{candidate.vouch_count}
            </Badge>
          )}

          {profile?.response_rate !== undefined && profile?.response_rate !== null && profile.response_rate > 0 && (
            <Badge variant="outline" className={cn('gap-1', profile.response_rate >= 80 ? 'border-green-500/20 text-green-500' : profile.response_rate >= 50 ? 'border-yellow-500/20 text-yellow-500' : 'border-red-500/20 text-red-500')}>
              <TrendingUp className="w-3 h-3" />{Math.round(profile.response_rate)}%
            </Badge>
          )}

          {profile?.avg_response_time_hours !== undefined && profile?.avg_response_time_hours !== null && profile.avg_response_time_hours > 0 && (
            <Badge variant="outline" className="gap-1 border-primary/20 text-primary">
              <Clock className="w-3 h-3" />
              {profile.avg_response_time_hours < 24 ? `${Math.round(profile.avg_response_time_hours)}h` : `${Math.round(profile.avg_response_time_hours / 24)}d`}
            </Badge>
          )}

          {profile?.intro_video_url && (
            <Badge variant="outline" className="gap-1 border-primary/20 text-primary">
              <Video className="w-3 h-3" />{isHebrew ? 'סרטון' : 'Video'}
            </Badge>
          )}

          <span className="text-xs text-muted-foreground">{timeAgo}</span>
        </div>

        {/* AI Summary Toggle */}
        <div className="mb-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-accent hover:text-accent h-7 px-2"
            onClick={() => summary ? setShowSummary(!showSummary) : generateSummary()}
            disabled={loadingSummary}
          >
            <Sparkles className="w-3 h-3" />
            {loadingSummary ? (isHebrew ? 'מייצר...' : 'Generating...') : (isHebrew ? 'סיכום AI' : 'AI Summary')}
            {summary && (showSummary ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
          </Button>
          {showSummary && summary && (
            <div className="mt-2 p-3 rounded-lg bg-accent/5 border border-accent/20 text-sm space-y-2">
              {summary.summary && <p className="text-muted-foreground">{summary.summary}</p>}
              {summary.skills?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {summary.skills.map((s: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                  ))}
                </div>
              )}
              {summary.salary_positioning && (
                <Badge variant="outline" className={cn('text-xs', 
                  summary.salary_positioning === 'above_market' ? 'border-red-500/20 text-red-500' :
                  summary.salary_positioning === 'below_market' ? 'border-green-500/20 text-green-500' :
                  'border-yellow-500/20 text-yellow-500'
                )}>
                  {summary.salary_positioning === 'above_market' ? '📈 Above Market' : summary.salary_positioning === 'below_market' ? '📉 Below Market' : '📊 At Market'}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Links */}
        {(profile?.portfolio_url || profile?.linkedin_url || profile?.github_url) && (
          <div className="flex items-center gap-2 mb-3">
            {profile.portfolio_url && (
              <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors" title="Portfolio">
                <Globe className="w-4 h-4 text-muted-foreground" />
              </a>
            )}
            {profile.linkedin_url && (
              <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors" title="LinkedIn">
                <Linkedin className="w-4 h-4 text-muted-foreground" />
              </a>
            )}
            {profile.github_url && (
              <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors" title="GitHub">
                <Github className="w-4 h-4 text-muted-foreground" />
              </a>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-2" onClick={goToProfile}>
            <User className="w-4 h-4" />{isHebrew ? 'פרופיל' : 'Profile'}
          </Button>
          {profile?.allow_recruiter_contact && (
            <>
              <SendMessageDialog
                toUserId={candidate.candidate_id}
                toUserName={profile?.full_name || ''}
                relatedJobId={candidate.job?.id}
                relatedApplicationId={candidate.id}
                trigger={
                  <Button variant="outline" size="sm" className="gap-2">
                    <MessageSquare className="w-4 h-4" />{isHebrew ? 'הודעה' : 'Message'}
                  </Button>
                }
              />
              {profile?.phone && (
                <Button variant="outline" size="sm" className="gap-2 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20" onClick={openWhatsApp}>
                  <Phone className="w-4 h-4" />WhatsApp
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
