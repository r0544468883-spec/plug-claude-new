import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { Clock, Users, Eye, Download, ChevronRight, CheckCircle2, Pencil, Star, AlertCircle, Lock, Trash2, Building2, Heart, Inbox, Bookmark, MessageCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface AssignmentTemplate {
  id: string;
  created_at: string;
  created_by: string;
  title: string;
  description: string;
  category: string | null;
  difficulty: string | null;
  estimated_hours: number | null;
  file_url: string | null;
  view_count: number;
  is_active: boolean;
  tags?: string[];
  deadline?: string | null;
  access_mode?: 'public' | 'request_only';
  company_name?: string | null;
  domain?: string | null;
  is_anonymous?: boolean;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    visible_to_hr?: boolean | null;
    role?: string | null;
  } | null;
}

export interface AssignmentSubmission {
  id: string;
  created_at: string;
  template_id: string;
  submitted_by: string;
  notes: string | null;
  file_url: string;
  is_public: boolean;
  status: 'pending' | 'viewed' | 'starred' | 'rejected';
  recruiter_notes: string | null;
  recruiter_rating: number | null;
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
}

interface AssignmentCardProps {
  template: AssignmentTemplate;
  mySubmission?: AssignmentSubmission | null;
  isOwner: boolean;
  submissionsCount?: number;
  myAccessRequest?: 'pending' | 'approved' | 'rejected' | null;
  matchScore?: number;
  onSubmit: (template: AssignmentTemplate) => void;
  onViewSubmissions: (template: AssignmentTemplate) => void;
  onRequestAccess: (template: AssignmentTemplate) => void;
  onEdit?: (template: AssignmentTemplate) => void;
  onDelete?: (template: AssignmentTemplate) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (templateId: string) => void;
  isLiked?: boolean;
  likesCount?: number;
  onToggleLike?: (templateId: string) => void;
  commentsCount?: number;
  onOpenComments?: (templateId: string) => void;
  onPreview?: (template: AssignmentTemplate) => void;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-green-500/10 text-green-600 border-green-500/20',
  medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  hard: 'bg-red-500/10 text-red-600 border-red-500/20',
};

const DIFFICULTY_LABELS: Record<string, { he: string; en: string }> = {
  easy: { he: 'קל', en: 'Easy' },
  medium: { he: 'בינוני', en: 'Medium' },
  hard: { he: 'קשה', en: 'Hard' },
};

const STATUS_LABELS: Record<string, { he: string; en: string; color: string }> = {
  pending: { he: 'ממתין', en: 'Pending', color: 'text-muted-foreground' },
  viewed: { he: 'נצפה', en: 'Viewed', color: 'text-blue-600' },
  starred: { he: 'מסומן ⭐', en: 'Starred ⭐', color: 'text-yellow-600' },
  rejected: { he: 'לא מתאים', en: 'Not a fit', color: 'text-red-500' },
};

const DOMAIN_LABELS: Record<string, { he: string; en: string }> = {
  frontend: { he: 'פרונטאנד', en: 'Frontend' },
  backend: { he: 'בקאנד', en: 'Backend' },
  fullstack: { he: 'פולסטאק', en: 'Full Stack' },
  data: { he: 'דאטה', en: 'Data' },
  devops: { he: 'דבאופס', en: 'DevOps' },
  design: { he: 'עיצוב', en: 'Design' },
  product: { he: 'מוצר', en: 'Product' },
  mobile: { he: 'מובייל', en: 'Mobile' },
  qa: { he: 'בדיקות', en: 'QA' },
  security: { he: 'אבטחה', en: 'Security' },
  ai_ml: { he: 'AI / למידת מכונה', en: 'AI / ML' },
  blockchain: { he: 'בלוקצ׳יין', en: 'Blockchain' },
  embedded: { he: 'מערכות משובצות', en: 'Embedded' },
  gaming: { he: 'גיימינג', en: 'Gaming' },
  cloud: { he: 'ענן', en: 'Cloud' },
  marketing: { he: 'שיווק', en: 'Marketing' },
  hr: { he: 'משאבי אנוש', en: 'HR' },
  finance: { he: 'פיננסים', en: 'Finance' },
  other: { he: 'אחר', en: 'Other' },
};

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function AssignmentCard({
  template,
  mySubmission,
  isOwner,
  submissionsCount = 0,
  myAccessRequest,
  matchScore,
  onSubmit,
  onViewSubmissions,
  onRequestAccess,
  onEdit,
  onDelete,
  isFavorite,
  onToggleFavorite,
  isLiked,
  likesCount = 0,
  onToggleLike,
  commentsCount = 0,
  onOpenComments,
  onPreview,
}: AssignmentCardProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const difficultyColor = template.difficulty ? (DIFFICULTY_COLORS[template.difficulty] ?? '') : '';
  const difficultyLabel = template.difficulty
    ? (DIFFICULTY_LABELS[template.difficulty]?.[isHebrew ? 'he' : 'en'] ?? template.difficulty)
    : null;

  const isAnonymous = !!(template as any).is_anonymous;
  const creatorName = isAnonymous
    ? (isHebrew ? 'אנונימי' : 'Anonymous')
    : (template.profiles?.full_name || (isHebrew ? 'משתמש' : 'User'));
  const creatorAvatar = isAnonymous ? null : template.profiles?.avatar_url;

  const deadlineDays = template.deadline ? daysUntil(template.deadline) : null;
  const showDeadlineWarning = deadlineDays !== null && deadlineDays <= 7;

  const isRequestOnly = template.access_mode === 'request_only';
  const hasApprovedAccess = myAccessRequest === 'approved';
  const needsRequest = isRequestOnly && !isOwner && !hasApprovedAccess && !mySubmission;

  // CTA for request_only
  const renderRequestOnlyCTA = () => {
    if (myAccessRequest === 'pending') {
      return (
        <Button variant="outline" size="sm" disabled className="h-8 gap-1 text-muted-foreground">
          <Lock className="w-3.5 h-3.5" />
          {isHebrew ? 'ממתין לאישור' : 'Pending approval'}
        </Button>
      );
    }
    if (myAccessRequest === 'rejected') {
      return (
        <Button variant="outline" size="sm" disabled className="h-8 gap-1 text-red-500 border-red-500/30">
          <Lock className="w-3.5 h-3.5" />
          {isHebrew ? 'בקשה נדחתה' : 'Request declined'}
        </Button>
      );
    }
    return (
      <Button size="sm" variant="outline" onClick={() => onRequestAccess(template)} className="h-8 gap-1">
        <Lock className="w-3.5 h-3.5" />
        {isHebrew ? 'בקש גישה' : 'Request Access'}
      </Button>
    );
  };

  return (
    <Card className="plug-card-hover border-border flex flex-col h-full">
      <CardContent className="p-5 flex flex-col gap-3 h-full">
        {/* Top badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {matchScore !== undefined && matchScore >= 40 && !isOwner && (
            <Badge className={`gap-1 text-xs ${matchScore >= 70 ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20'}`}>
              {matchScore}% {isHebrew ? 'התאמה' : 'Match'}
            </Badge>
          )}
          {difficultyLabel && (
            <Badge variant="outline" className={difficultyColor}>
              {difficultyLabel}
            </Badge>
          )}
          {isRequestOnly && (
            <Badge variant="outline" className="gap-1 text-xs text-amber-600 border-amber-500/30 bg-amber-500/10">
              <Lock className="w-3 h-3" />
              {isHebrew ? 'בקשת גישה' : 'Request Only'}
            </Badge>
          )}
          {showDeadlineWarning && deadlineDays !== null && (
            <Badge variant="destructive" className="gap-1 text-xs">
              <AlertCircle className="w-3 h-3" />
              {deadlineDays <= 0
                ? (isHebrew ? 'פג תוקף' : 'Expired')
                : isHebrew ? `${deadlineDays} ימים` : `${deadlineDays}d left`}
            </Badge>
          )}
        </div>

        {/* Company + Domain */}
        {(template.company_name || template.domain) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {template.company_name && (
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {template.company_name}
              </span>
            )}
            {template.domain && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                {DOMAIN_LABELS[template.domain]?.[isHebrew ? 'he' : 'en'] ?? template.domain}
              </Badge>
            )}
          </div>
        )}

        {/* Tags */}
        {template.tags && template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {template.tags.slice(0, 4).map(tag => (
              <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0 h-5 text-muted-foreground">
                {tag}
              </Badge>
            ))}
            {template.tags.length > 4 && (
              <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 text-muted-foreground">
                +{template.tags.length - 4}
              </Badge>
            )}
          </div>
        )}

        {/* Title & Description */}
        <div className="flex-1">
          <h3
            className={`font-semibold text-base leading-tight mb-1 ${onPreview ? 'cursor-pointer hover:text-primary transition-colors' : ''}`}
            onClick={() => onPreview?.(template)}
          >
            {template.title}
          </h3>
          <p
            className={`text-sm text-muted-foreground line-clamp-3 ${onPreview ? 'cursor-pointer' : ''}`}
            onClick={() => onPreview?.(template)}
          >
            {template.description}
          </p>
        </div>

        {/* Creator + stats */}
        <TooltipProvider delayDuration={300}>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Avatar className="w-5 h-5">
                <AvatarImage src={creatorAvatar || undefined} />
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {creatorName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate max-w-[100px]">{creatorName}</span>
            </div>
            <div className="flex items-center gap-3">
              {template.estimated_hours != null && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-0.5 cursor-default">
                      <Clock className="w-3 h-3" />
                      ~{template.estimated_hours}h
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{isHebrew ? 'זמן משוער' : 'Estimated time'}</TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-0.5 cursor-default">
                    <Users className="w-3 h-3" />
                    {submissionsCount}
                  </span>
                </TooltipTrigger>
                <TooltipContent>{isHebrew ? 'הגשות' : 'Submissions'}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-0.5 cursor-default">
                    <Eye className="w-3 h-3" />
                    {template.view_count}
                  </span>
                </TooltipTrigger>
                <TooltipContent>{isHebrew ? 'צפיות' : 'Views'}</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </TooltipProvider>

        {/* Submission status */}
        {mySubmission && !isOwner && (
          <div className="flex items-center gap-1.5 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            <span className="text-green-600 font-medium">
              {isHebrew ? 'הגשת פתרון' : 'Submitted'}
            </span>
            <span className={`${STATUS_LABELS[mySubmission.status]?.color ?? ''}`}>
              · {STATUS_LABELS[mySubmission.status]?.[isHebrew ? 'he' : 'en']}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-auto">
          {/* Like + Save buttons */}
          <div className="flex items-center gap-1">
            {onToggleLike && (
              <button
                onClick={() => onToggleLike(template.id)}
                className={`flex items-center gap-0.5 text-xs transition-colors ${isLiked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'}`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500' : ''}`} />
                {likesCount > 0 && <span>{likesCount}</span>}
              </button>
            )}
            {onOpenComments && (
              <button
                onClick={() => onOpenComments(template.id)}
                className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                {commentsCount > 0 && <span>{commentsCount}</span>}
              </button>
            )}
            {onPreview && (
              <button
                onClick={() => onPreview(template)}
                className="text-muted-foreground hover:text-primary transition-colors"
                title={isHebrew ? 'תצוגה מקדימה' : 'Preview'}
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
            {onToggleFavorite && (
              <button
                onClick={() => onToggleFavorite(template.id)}
                className={`transition-colors ${isFavorite ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
                title={isFavorite ? (isHebrew ? 'הסר משמורים' : 'Remove from saved') : (isHebrew ? 'שמור לאחר כך' : 'Save for later')}
              >
                <Bookmark className={`w-4 h-4 ${isFavorite ? 'fill-primary' : ''}`} />
              </button>
            )}
          </div>

          {template.file_url && (
            <a
              href={template.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              {isHebrew ? 'הורד בריף' : 'Brief'}
            </a>
          )}

          <div className="flex items-center gap-2 ms-auto">
            {isOwner ? (
              <>
                {onDelete && (
                  <Button variant="ghost" size="sm" onClick={() => onDelete(template)} className="h-8 gap-1 text-destructive hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
                {onEdit && (
                  <Button variant="ghost" size="sm" onClick={() => onEdit(template)} className="h-8 gap-1">
                    <Pencil className="w-3.5 h-3.5" />
                    {isHebrew ? 'ערוך' : 'Edit'}
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => onViewSubmissions(template)} className="h-8 gap-1">
                  <Inbox className="w-3.5 h-3.5" />
                  {submissionsCount} {isHebrew ? 'פתרונות' : 'Solutions'}
                </Button>
              </>
            ) : needsRequest ? (
              renderRequestOnlyCTA()
            ) : mySubmission ? (
              <Button variant="outline" size="sm" disabled className="h-8 gap-1 text-green-600 border-green-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isHebrew ? 'הגשת פתרון ✓' : 'Submitted ✓'}
              </Button>
            ) : (
              <Button size="sm" onClick={() => onSubmit(template)} className="h-8 gap-1">
                {isHebrew ? 'הגש פתרון' : 'Submit Solution'}
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
