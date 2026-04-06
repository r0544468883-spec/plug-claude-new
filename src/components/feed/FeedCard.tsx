import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCredits } from '@/contexts/CreditsContext';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SparkleAnimation } from './SparkleAnimation';
import { FeedPollCard } from './FeedPollCard';
import { VideoPlayer } from './VideoPlayer';
import { FeedPost } from './feedMockData';
import { FollowButton } from './FollowButton';
import { QuickPingButton } from '@/components/messaging/QuickPingButton';
import { SendMessageDialog } from '@/components/messaging/SendMessageDialog';
import { Heart, MessageCircle, Send, Share2, Copy, ExternalLink, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeedCardProps {
  post: FeedPost;
}

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

export function FeedCard({ post }: FeedCardProps) {
  const { language } = useLanguage();
  const { awardCredits } = useCredits();
  const navigate = useNavigate();
  const isRTL = language === 'he';

  const [liked, setLiked] = useState(false);
  const [likeSparkle, setLikeSparkle] = useState(false);
  const [commentSparkle, setCommentSparkle] = useState(false);
  const [localLikes, setLocalLikes] = useState(post.likes);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [localComments, setLocalComments] = useState(post.comments);

  const handleLike = useCallback(async () => {
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLocalLikes(prev => wasLiked ? Math.max(0, prev - 1) : prev + 1);

    if (!wasLiked) {
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
  }, [liked, awardCredits, isRTL]);

  const handleComment = useCallback(async () => {
    if (!commentText.trim()) return;
    setLocalComments(prev => prev + 1);
    setCommentText('');
    setShowCommentInput(false);

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
  }, [commentText, awardCredits, isRTL]);

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
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <Avatar
              className="h-11 w-11 cursor-pointer"
              onClick={() => (post as any).authorId && navigate(`/p/${(post as any).authorId}`)}
            >
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {post.recruiterAvatar}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p
                className="font-semibold text-base text-foreground truncate cursor-pointer hover:underline"
                onClick={() => (post as any).authorId && navigate(`/p/${(post as any).authorId}`)}
              >
                {post.recruiterName}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {post.companyName} · {timeLabel}
              </p>
            </div>
            {(post as any).authorId && (
              <div className="flex items-center gap-1">
                <QuickPingButton
                  toUserId={(post as any).authorId}
                  toUserName={post.recruiterName}
                  context="feed_post"
                />
                <FollowButton targetUserId={(post as any).authorId} />
              </div>
            )}
          </div>

          {/* Content */}
          <p className="text-base text-foreground/90 leading-relaxed mb-3">
            {isRTL ? post.contentHe : post.content}
          </p>

          {/* Video */}
          {post.videoUrl && (
            <VideoPlayer src={post.videoUrl} />
          )}

          {/* Poll */}
          {post.postType === 'poll' && post.pollOptions && (
            <FeedPollCard options={post.pollOptions} postId={post.id} />
          )}

          {/* Actions */}
          <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className={cn('gap-1.5 relative text-muted-foreground hover:text-primary hover:bg-primary/5', liked && 'text-primary')}
              onClick={handleLike}
            >
              <Heart className={cn('w-4 h-4', liked && 'fill-primary')} />
              <span className="text-xs font-medium">{localLikes}</span>
              <SparkleAnimation show={likeSparkle} />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 relative text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
              onClick={() => setShowCommentInput(!showCommentInput)}
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs font-medium">{localComments}</span>
              <SparkleAnimation show={commentSparkle} />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-green-600 hover:bg-green-50 ms-auto">
                  <Share2 className="w-4 h-4" />
                  <span className="text-xs font-medium">{isRTL ? 'שתף' : 'Share'}</span>
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
          </div>

          {/* Comment input */}
          {showCommentInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex gap-2 mt-3"
            >
              <Input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={isRTL ? 'כתוב תגובה...' : 'Write a comment...'}
                className="text-sm bg-muted border-border"
                onKeyDown={(e) => e.key === 'Enter' && handleComment()}
              />
              <Button size="icon" variant="ghost" onClick={handleComment} disabled={!commentText.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
