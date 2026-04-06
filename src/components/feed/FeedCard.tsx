import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCredits } from '@/contexts/CreditsContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SparkleAnimation } from './SparkleAnimation';
import { FeedPollCard } from './FeedPollCard';
import { VideoPlayer } from './VideoPlayer';
import { FeedPost } from './feedMockData';
import { FollowButton } from './FollowButton';
import { QuickPingButton } from '@/components/messaging/QuickPingButton';
import {
  Heart, MessageCircle, Send, Share2, Copy, ExternalLink,
  Bookmark, BookmarkCheck, MoreHorizontal, EyeOff, Flag,
  Link2, ThumbsUp, PartyPopper, Lightbulb, Flame,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeedCardProps {
  post: FeedPost;
}

// ─── Post type badge config ────────────────────────────────
const POST_TYPE_ACCENT: Record<string, string> = {
  tip: 'border-s-blue-500',
  culture: 'border-s-green-500',
  poll: 'border-s-purple-500',
  video: 'border-s-red-500',
  visual: 'border-s-amber-500',
  question: 'border-s-cyan-500',
  event: 'border-s-pink-500',
  assignment: 'border-s-emerald-500',
};

const POST_TYPE_BADGE: Record<string, { en: string; he: string; color: string }> = {
  tip: { en: 'Tip', he: 'טיפ', color: 'bg-blue-500/10 text-blue-600' },
  culture: { en: 'Culture', he: 'תרבות', color: 'bg-green-500/10 text-green-600' },
  poll: { en: 'Poll', he: 'סקר', color: 'bg-purple-500/10 text-purple-600' },
  video: { en: 'Video', he: 'וידאו', color: 'bg-red-500/10 text-red-600' },
  visual: { en: 'Visual', he: 'ויזואלי', color: 'bg-amber-500/10 text-amber-600' },
  question: { en: 'Question', he: 'שאלה', color: 'bg-cyan-500/10 text-cyan-600' },
  event: { en: 'Event', he: 'אירוע', color: 'bg-pink-500/10 text-pink-600' },
  assignment: { en: 'Assignment', he: 'מטלה', color: 'bg-emerald-500/10 text-emerald-600' },
};

// ─── Reaction types ────────────────────────────────────────
type ReactionType = 'like' | 'celebrate' | 'support' | 'insightful' | 'funny';

const REACTIONS: { type: ReactionType; emoji: string; label: string; labelHe: string }[] = [
  { type: 'like', emoji: '👍', label: 'Like', labelHe: 'אהבתי' },
  { type: 'celebrate', emoji: '👏', label: 'Celebrate', labelHe: 'מרשים' },
  { type: 'support', emoji: '💪', label: 'Support', labelHe: 'תמיכה' },
  { type: 'insightful', emoji: '💡', label: 'Insightful', labelHe: 'תובנה' },
  { type: 'funny', emoji: '😄', label: 'Funny', labelHe: 'מצחיק' },
];

// ─── Truncation config ─────────────────────────────────────
const TRUNCATE_CHARS = 250;

export function FeedCard({ post }: FeedCardProps) {
  const { language } = useLanguage();
  const { awardCredits } = useCredits();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isRTL = language === 'he';

  // Core state
  const [activeReaction, setActiveReaction] = useState<ReactionType | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [likeSparkle, setLikeSparkle] = useState(false);
  const [commentSparkle, setCommentSparkle] = useState(false);
  const [localLikes, setLocalLikes] = useState(post.likes);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [localComments, setLocalComments] = useState<{ name: string; text: string; time: string }[]>([]);
  const [localCommentCount, setLocalCommentCount] = useState(post.comments);
  const [bookmarked, setBookmarked] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hidden, setHidden] = useState(false);

  // Reaction picker timer
  const reactionTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const content = isRTL ? post.contentHe : post.content;
  const needsTruncation = content.length > TRUNCATE_CHARS;
  const displayContent = needsTruncation && !isExpanded
    ? content.slice(0, TRUNCATE_CHARS) + '...'
    : content;

  // ─── Handlers ─────────────────────────────────────────────
  const handleReaction = useCallback(async (type: ReactionType) => {
    const wasActive = activeReaction === type;
    setActiveReaction(wasActive ? null : type);
    setLocalLikes(prev => wasActive ? Math.max(0, prev - 1) : (activeReaction ? prev : prev + 1));
    setShowReactionPicker(false);

    if (!wasActive) {
      const result = await awardCredits('feed_like');
      if (result.success) {
        setLikeSparkle(true);
        toast.success(isRTL ? '⚡ +1 דלק יומי!' : '⚡ +1 Daily Fuel earned!', {
          duration: 2000,
          style: { background: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' },
        });
        setTimeout(() => setLikeSparkle(false), 600);
      }
    }
  }, [activeReaction, awardCredits, isRTL]);

  const handleLikePress = useCallback(() => {
    if (activeReaction) {
      // Un-react
      setActiveReaction(null);
      setLocalLikes(prev => Math.max(0, prev - 1));
    } else {
      handleReaction('like');
    }
  }, [activeReaction, handleReaction]);

  const handleLikeHold = useCallback(() => {
    reactionTimerRef.current = setTimeout(() => {
      setShowReactionPicker(true);
    }, 500);
  }, []);

  const handleLikeRelease = useCallback(() => {
    if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
  }, []);

  const handleComment = useCallback(async () => {
    if (!commentText.trim()) return;
    const userName = (user as any)?.user_metadata?.full_name || 'You';
    setLocalComments(prev => [...prev, {
      name: userName,
      text: commentText.trim(),
      time: isRTL ? 'עכשיו' : 'now',
    }]);
    setLocalCommentCount(prev => prev + 1);
    setCommentText('');

    toast.success(isRTL ? 'התגובה נשלחה!' : 'Comment posted!', { duration: 1500 });

    const result = await awardCredits('feed_comment');
    if (result.success) {
      setCommentSparkle(true);
      toast.success(isRTL ? '⚡ +1 דלק יומי!' : '⚡ +1 Daily Fuel earned!', {
        duration: 2000,
        style: { background: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' },
      });
      setTimeout(() => setCommentSparkle(false), 600);
    }
  }, [commentText, awardCredits, isRTL, user]);

  const handleShare = useCallback((method: 'whatsapp' | 'linkedin' | 'copy') => {
    const shareUrl = `${window.location.origin}/feed?post=${post.id}`;
    const shareText = isRTL ? post.contentHe : post.content;
    const snippet = shareText.length > 100 ? shareText.slice(0, 100) + '...' : shareText;

    switch (method) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(snippet + '\n' + shareUrl)}`, '_blank');
        break;
      case 'linkedin':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
        break;
      case 'copy':
        navigator.clipboard.writeText(shareUrl).then(() => {
          toast.success(isRTL ? 'הקישור הועתק!' : 'Link copied!', { duration: 1500 });
        });
        break;
    }
  }, [post.id, post.content, post.contentHe, isRTL]);

  const handleBookmark = useCallback(() => {
    setBookmarked(prev => !prev);
    toast.success(
      bookmarked
        ? (isRTL ? 'הוסר מהשמורים' : 'Removed from saved')
        : (isRTL ? 'נשמר!' : 'Saved!'),
      { duration: 1500 }
    );
  }, [bookmarked, isRTL]);

  const handleHide = useCallback(() => {
    setHidden(true);
    toast.success(isRTL ? 'הפוסט הוסתר' : 'Post hidden', {
      duration: 3000,
      action: {
        label: isRTL ? 'בטל' : 'Undo',
        onClick: () => setHidden(false),
      },
    });
  }, [isRTL]);

  const handleReport = useCallback(() => {
    toast.success(isRTL ? 'הדיווח נשלח. תודה!' : 'Report submitted. Thank you!', { duration: 2000 });
  }, [isRTL]);

  // ─── Time label ───────────────────────────────────────────
  const msAgo = Date.now() - new Date(post.createdAt).getTime();
  const minsAgo = Math.floor(msAgo / 60000);
  const hoursAgo = Math.floor(minsAgo / 60);
  const daysAgo = Math.floor(hoursAgo / 24);

  const timeLabel = (() => {
    if (minsAgo < 1) return isRTL ? 'עכשיו' : 'now';
    if (minsAgo < 60) return isRTL ? `לפני ${minsAgo} דק׳` : `${minsAgo}m ago`;
    if (hoursAgo < 24) return isRTL ? `לפני ${hoursAgo === 1 ? 'שעה' : `${hoursAgo} שעות`}` : `${hoursAgo}h ago`;
    if (daysAgo === 1) return isRTL ? 'אתמול' : '1d ago';
    return isRTL ? `לפני ${daysAgo} ימים` : `${daysAgo}d ago`;
  })();

  const accentClass = POST_TYPE_ACCENT[post.postType] || '';
  const badge = POST_TYPE_BADGE[post.postType];
  const activeReactionData = REACTIONS.find(r => r.type === activeReaction);

  // Hidden state
  if (hidden) {
    return (
      <Card className="bg-card border border-border">
        <CardContent className="py-6 text-center">
          <p className="text-sm text-muted-foreground">
            {isRTL ? 'הפוסט הוסתר' : 'This post has been hidden'}
          </p>
          <Button
            variant="link"
            size="sm"
            className="mt-1 text-xs"
            onClick={() => setHidden(false)}
          >
            {isRTL ? 'בטל הסתרה' : 'Undo'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn(
        'bg-card shadow-sm border border-border hover:shadow-md transition-shadow',
        accentClass && `border-s-4 ${accentClass}`
      )}>
        <CardContent className="p-5">
          {/* ─── Header ─────────────────────────────────────── */}
          <div className="flex items-center gap-3 mb-3">
            <Avatar
              className="h-12 w-12 cursor-pointer"
              onClick={() => (post as any).authorId && navigate(`/p/${(post as any).authorId}`)}
            >
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                {post.recruiterAvatar}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p
                  className="font-semibold text-sm text-foreground truncate cursor-pointer hover:underline"
                  onClick={() => (post as any).authorId && navigate(`/p/${(post as any).authorId}`)}
                >
                  {post.recruiterName}
                </p>
                {/* Post type badge */}
                {badge && (
                  <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap', badge.color)}>
                    {isRTL ? badge.he : badge.en}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {post.companyName}{post.companyName ? ' · ' : ''}{timeLabel}
              </p>
            </div>

            {/* Actions: follow + 3-dot menu */}
            <div className="flex items-center gap-1">
              {(post as any).authorId && (
                <>
                  <QuickPingButton
                    toUserId={(post as any).authorId}
                    toUserName={post.recruiterName}
                    context="feed_post"
                  />
                  <FollowButton targetUserId={(post as any).authorId} />
                </>
              )}
              {/* 3-dot more menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="w-48">
                  <DropdownMenuItem onClick={handleBookmark} className="gap-2 cursor-pointer">
                    {bookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                    {bookmarked
                      ? (isRTL ? 'הסר מהשמורים' : 'Unsave')
                      : (isRTL ? 'שמור פוסט' : 'Save post')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleShare('copy')} className="gap-2 cursor-pointer">
                    <Link2 className="w-4 h-4" />
                    {isRTL ? 'העתק קישור' : 'Copy link'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleHide} className="gap-2 cursor-pointer">
                    <EyeOff className="w-4 h-4" />
                    {isRTL ? 'הסתר פוסט' : 'Hide post'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleReport} className="gap-2 cursor-pointer text-destructive">
                    <Flag className="w-4 h-4" />
                    {isRTL ? 'דווח על פוסט' : 'Report post'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* ─── Content with "Read more" ───────────────────── */}
          <div className="mb-3">
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
              {displayContent}
            </p>
            {needsTruncation && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground mt-1 hover:underline"
              >
                {isExpanded
                  ? (isRTL ? 'הצג פחות' : 'Show less')
                  : (isRTL ? '...קרא עוד' : '...see more')}
              </button>
            )}
          </div>

          {/* ─── Image ──────────────────────────────────────── */}
          {post.imageUrl && (
            <div className="mb-3 -mx-5 overflow-hidden">
              <img
                src={post.imageUrl}
                alt={isRTL ? 'תמונת פוסט' : 'Post image'}
                className="w-full object-cover max-h-[500px]"
                loading="lazy"
              />
            </div>
          )}

          {/* ─── Video ──────────────────────────────────────── */}
          {post.videoUrl && (
            <VideoPlayer src={post.videoUrl} />
          )}

          {/* ─── Poll ───────────────────────────────────────── */}
          {post.postType === 'poll' && post.pollOptions && (
            <FeedPollCard options={post.pollOptions} postId={post.id} />
          )}

          {/* ─── Engagement stats (like LinkedIn) ───────────── */}
          {(localLikes > 0 || localCommentCount > 0) && (
            <div className="flex items-center justify-between text-xs text-muted-foreground py-2 border-b border-border">
              {localLikes > 0 ? (
                <span className="flex items-center gap-1">
                  {activeReactionData ? activeReactionData.emoji : '👍'}{' '}
                  {localLikes}
                </span>
              ) : <span />}
              {localCommentCount > 0 && (
                <button
                  className="hover:underline hover:text-foreground"
                  onClick={() => setShowCommentInput(true)}
                >
                  {localCommentCount} {isRTL ? 'תגובות' : 'comments'}
                </button>
              )}
            </div>
          )}

          {/* ─── Action Bar ─────────────────────────────────── */}
          <div className="flex items-center gap-0.5 pt-1 relative">
            {/* Like / Reaction button */}
            <div
              className="relative"
              onMouseEnter={() => {
                reactionTimerRef.current = setTimeout(() => setShowReactionPicker(true), 600);
              }}
              onMouseLeave={() => {
                if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
                setShowReactionPicker(false);
              }}
            >
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'gap-1.5 relative text-muted-foreground hover:text-primary hover:bg-primary/5',
                  activeReaction && 'text-primary font-semibold'
                )}
                onClick={handleLikePress}
                onMouseDown={handleLikeHold}
                onMouseUp={handleLikeRelease}
                onTouchStart={handleLikeHold}
                onTouchEnd={handleLikeRelease}
              >
                {activeReactionData ? (
                  <span className="text-base leading-none">{activeReactionData.emoji}</span>
                ) : (
                  <ThumbsUp className="w-4 h-4" />
                )}
                <span className="text-xs">
                  {activeReactionData
                    ? (isRTL ? activeReactionData.labelHe : activeReactionData.label)
                    : (isRTL ? 'אהבתי' : 'Like')}
                </span>
                <SparkleAnimation show={likeSparkle} />
              </Button>

              {/* Reaction picker popup */}
              <AnimatePresence>
                {showReactionPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full mb-2 start-0 bg-card border border-border rounded-full shadow-lg px-2 py-1.5 flex gap-1 z-50"
                  >
                    {REACTIONS.map(r => (
                      <button
                        key={r.type}
                        onClick={() => handleReaction(r.type)}
                        className={cn(
                          'text-xl hover:scale-125 transition-transform p-1 rounded-full',
                          activeReaction === r.type && 'bg-primary/10'
                        )}
                        title={isRTL ? r.labelHe : r.label}
                      >
                        {r.emoji}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 relative text-muted-foreground hover:text-primary hover:bg-primary/5"
              onClick={() => setShowCommentInput(!showCommentInput)}
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs">{isRTL ? 'תגובה' : 'Comment'}</span>
              <SparkleAnimation show={commentSparkle} />
            </Button>

            {/* Share dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-primary hover:bg-primary/5">
                  <Share2 className="w-4 h-4" />
                  <span className="text-xs">{isRTL ? 'שתף' : 'Share'}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isRTL ? 'start' : 'end'}>
                <DropdownMenuItem onClick={() => handleShare('whatsapp')} className="gap-2 cursor-pointer">
                  <ExternalLink className="w-4 h-4 text-green-600" />
                  WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare('linkedin')} className="gap-2 cursor-pointer">
                  <ExternalLink className="w-4 h-4 text-blue-600" />
                  LinkedIn
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare('copy')} className="gap-2 cursor-pointer">
                  <Copy className="w-4 h-4" />
                  {isRTL ? 'העתק קישור' : 'Copy link'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Bookmark — pushed to end */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'ms-auto h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/5',
                bookmarked && 'text-primary'
              )}
              onClick={handleBookmark}
              title={bookmarked ? (isRTL ? 'הסר מהשמורים' : 'Unsave') : (isRTL ? 'שמור' : 'Save')}
            >
              {bookmarked ? <BookmarkCheck className="w-4 h-4 fill-primary" /> : <Bookmark className="w-4 h-4" />}
            </Button>
          </div>

          {/* ─── Comment Thread ──────────────────────────────── */}
          <AnimatePresence>
            {(showCommentInput || localComments.length > 0) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 space-y-3"
              >
                {/* Existing comments */}
                {localComments.length > 0 && (
                  <div className="space-y-2.5">
                    {localComments.slice(-3).map((c, i) => (
                      <div key={i} className="flex gap-2.5">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
                            {c.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 bg-muted rounded-xl px-3 py-2">
                          <p className="text-xs font-semibold text-foreground">{c.name}</p>
                          <p className="text-sm text-foreground/90">{c.text}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{c.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Comment input */}
                {showCommentInput && (
                  <div className="flex gap-2">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {((user as any)?.user_metadata?.full_name || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 flex gap-2">
                      <Input
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder={isRTL ? 'כתוב תגובה...' : 'Write a comment...'}
                        className="text-sm bg-muted border-border rounded-full px-4"
                        onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                        autoFocus
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleComment}
                        disabled={!commentText.trim()}
                        className="h-9 w-9 rounded-full"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
