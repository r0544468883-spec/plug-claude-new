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
    if (liked) return;
    setLiked(true);
    setLocalLikes(prev => prev + 1);

    const result = await awardCredits('feed_like');
    if (result.success) {
      setLikeSparkle(true);
      toast.success(isRTL ? '⚡ +1 דלק יומי!' : '⚡ +1 Daily Fuel earned!', {
        duration: 2000,
        style: { background: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' },
      });
      setTimeout(() => setLikeSparkle(false), 600);
    }
  }, [liked, awardCredits, isRTL]);

  const handleComment = useCallback(async () => {
    if (!commentText.trim()) return;
    setLocalComments(prev => prev + 1);
    setCommentText('');
    setShowCommentInput(false);

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

  const daysAgo = Math.max(1, Math.floor((Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
  const timeLabel = isRTL ? `לפני ${daysAgo} ימים` : `${daysAgo}d ago`;
  const accentClass = POST_TYPE_ACCENT[post.postType] || '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn(
        'bg-white shadow-sm border border-gray-100 hover:shadow-md transition-shadow',
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
                className="font-semibold text-base text-gray-900 truncate cursor-pointer hover:underline"
                onClick={() => (post as any).authorId && navigate(`/p/${(post as any).authorId}`)}
              >
                {post.recruiterName}
              </p>
              <p className="text-xs text-gray-500 truncate">
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
          <p className="text-base text-gray-800 leading-relaxed mb-3">
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
          <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100">
            <Button
              variant="ghost"
              size="sm"
              className={cn('gap-1.5 relative text-gray-600 hover:text-primary hover:bg-primary/5', liked && 'text-primary')}
              onClick={handleLike}
            >
              <Heart className={cn('w-4 h-4', liked && 'fill-primary')} />
              <span className="text-xs font-medium">{localLikes}</span>
              <SparkleAnimation show={likeSparkle} />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 relative text-gray-600 hover:text-blue-600 hover:bg-blue-50"
              onClick={() => setShowCommentInput(!showCommentInput)}
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs font-medium">{localComments}</span>
              <SparkleAnimation show={commentSparkle} />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 text-gray-600 hover:text-green-600 hover:bg-green-50 ms-auto">
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
                className="text-sm bg-gray-50 border-gray-200"
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
