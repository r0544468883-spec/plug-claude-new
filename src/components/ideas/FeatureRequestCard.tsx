import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { REQUEST_STATUSES, SYSTEM_AREAS, TARGET_AUDIENCES } from '@/lib/feature-badges';
import { BadgeDisplay } from './BadgeDisplay';
import { ChevronUp, Play, Paperclip, ExternalLink, MessageSquare, Star, Send, Loader2 } from 'lucide-react';
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

interface Comment {
  id: string;
  user_id: string;
  content: string;
  rating: number | null;
  created_at: string;
  author_name?: string;
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

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentRating, setCommentRating] = useState(0);
  const [submittingComment, setSubmittingComment] = useState(false);

  const statusConfig = REQUEST_STATUSES[request.status as keyof typeof REQUEST_STATUSES] || REQUEST_STATUSES.submitted;

  // Parse comma-separated areas/audiences
  const areaKeys = request.system_area ? request.system_area.split(',').map(s => s.trim()) : [];
  const audienceKeys = request.target_audience ? request.target_audience.split(',').map(s => s.trim()) : [];

  const areaLabels = areaKeys
    .map(k => SYSTEM_AREAS[k as keyof typeof SYSTEM_AREAS]?.[isHe ? 'he' : 'en'])
    .filter(Boolean);
  const audienceLabels = audienceKeys
    .map(k => TARGET_AUDIENCES[k as keyof typeof TARGET_AUDIENCES]?.[isHe ? 'he' : 'en'])
    .filter(Boolean);

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

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const { data } = await (supabase.from('feature_request_comments') as any)
        .select('*')
        .eq('request_id', request.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(20);

      if (!data?.length) {
        setComments([]);
        setLoadingComments(false);
        return;
      }

      // Fetch author names
      const userIds = [...new Set((data as any[]).map((c: any) => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      const nameMap: Record<string, string> = {};
      profiles?.forEach((p: any) => { nameMap[p.id] = p.full_name; });

      setComments((data as any[]).map((c: any) => ({
        id: c.id,
        user_id: c.user_id,
        content: c.content,
        rating: c.rating,
        created_at: c.created_at,
        author_name: nameMap[c.user_id] || (isHe ? 'אנונימי' : 'Anonymous'),
      })));
    } catch { /* ignore */ }
    setLoadingComments(false);
  };

  useEffect(() => {
    if (expanded) fetchComments();
  }, [expanded]);

  const handleSubmitComment = async () => {
    if (!user || !commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const { error } = await (supabase.from('feature_request_comments') as any).insert({
        request_id: request.id,
        user_id: user.id,
        content: commentText.trim(),
        rating: commentRating > 0 ? commentRating : null,
      });
      if (error) throw error;
      setCommentText('');
      setCommentRating(0);
      toast.success(isHe ? 'תגובה נשלחה!' : 'Comment posted!');
      fetchComments();
    } catch {
      toast.error(isHe ? 'שגיאה בשליחת תגובה' : 'Error posting comment');
    }
    setSubmittingComment(false);
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

  const avgRating = comments.length > 0
    ? comments.filter(c => c.rating).reduce((sum, c) => sum + (c.rating || 0), 0) /
      comments.filter(c => c.rating).length
    : null;

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
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {avgRating !== null && (
                  <span className="text-[10px] text-yellow-500 font-medium flex items-center gap-0.5">
                    <Star className="w-3 h-3 fill-yellow-500" />
                    {avgRating.toFixed(1)}
                  </span>
                )}
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${statusConfig.color}`}>
                  {statusConfig[isHe ? 'he' : 'en']}
                </span>
              </div>
            </div>

            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {areaLabels.map((label, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {label}
                </span>
              ))}
              {audienceLabels.map((label, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600">
                  {label}
                </span>
              ))}
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
              {request.comments_count > 0 && (
                <>
                  <span>•</span>
                  <button
                    className="inline-flex items-center gap-0.5 hover:text-foreground"
                    onClick={() => setExpanded(true)}
                  >
                    <MessageSquare className="w-3 h-3" />
                    {request.comments_count}
                  </button>
                </>
              )}
            </div>

            {/* Expanded content */}
            {expanded && (
              <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
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

                {/* Comments section */}
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    {isHe ? 'תגובות' : 'Comments'}
                  </p>

                  {loadingComments ? (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {isHe ? 'טוען...' : 'Loading...'}
                    </div>
                  ) : comments.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground italic">
                      {isHe ? 'אין תגובות עדיין. היו הראשונים!' : 'No comments yet. Be the first!'}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {comments.map(c => (
                        <div key={c.id} className="bg-muted/50 rounded-lg p-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-foreground">{c.author_name}</span>
                            <div className="flex items-center gap-1">
                              {c.rating && (
                                <span className="flex items-center gap-0.5">
                                  {Array.from({ length: c.rating }).map((_, i) => (
                                    <Star key={i} className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                                  ))}
                                </span>
                              )}
                              <span className="text-[10px] text-muted-foreground">{timeAgo(c.created_at)}</span>
                            </div>
                          </div>
                          <p className="text-xs text-foreground/90 mt-0.5">{c.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add comment */}
                  {user && (
                    <div className="space-y-1.5">
                      {/* Star rating picker */}
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">
                          {isHe ? 'דירוג:' : 'Rate:'}
                        </span>
                        {[1, 2, 3, 4, 5].map(n => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setCommentRating(prev => prev === n ? 0 : n)}
                            className="p-0.5 transition-colors"
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${n <= commentRating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'}`}
                            />
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-1.5">
                        <Input
                          value={commentText}
                          onChange={e => setCommentText(e.target.value)}
                          placeholder={isHe ? 'כתוב תגובה...' : 'Write a comment...'}
                          className="text-xs h-8"
                          onKeyDown={e => e.key === 'Enter' && handleSubmitComment()}
                        />
                        <Button
                          size="sm"
                          className="h-8 w-8 p-0 flex-shrink-0"
                          onClick={handleSubmitComment}
                          disabled={!commentText.trim() || submittingComment}
                        >
                          {submittingComment ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
