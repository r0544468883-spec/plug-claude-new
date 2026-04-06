import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, Download, ChevronRight, Building2, Calendar, Eye, FileText, Maximize2, Minimize2 } from 'lucide-react';
import type { AssignmentTemplate } from './AssignmentCard';

const DIFFICULTY_LABELS: Record<string, { he: string; en: string; color: string }> = {
  easy: { he: 'קל', en: 'Easy', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  medium: { he: 'בינוני', en: 'Medium', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  hard: { he: 'קשה', en: 'Hard', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
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

interface AssignmentPreviewDialogProps {
  template: AssignmentTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (template: AssignmentTemplate) => void;
}

export function AssignmentPreviewDialog({ template, open, onOpenChange, onSubmit }: AssignmentPreviewDialogProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const [showFilePreview, setShowFilePreview] = useState(false);

  if (!template) return null;

  const fileUrl = template.file_url;
  const fileExt = fileUrl ? fileUrl.split('?')[0].split('.').pop()?.toLowerCase() : null;
  const isPdf = fileExt === 'pdf';
  // For non-PDF files, use Google Docs Viewer
  const previewUrl = fileUrl
    ? isPdf
      ? fileUrl
      : `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`
    : null;

  const isAnonymous = !!(template as any).is_anonymous;
  const creatorName = isAnonymous
    ? (isHebrew ? 'אנונימי' : 'Anonymous')
    : (template.profiles?.full_name || (isHebrew ? 'משתמש' : 'User'));
  const creatorAvatar = isAnonymous ? null : template.profiles?.avatar_url;
  const diff = template.difficulty ? DIFFICULTY_LABELS[template.difficulty] : null;
  const domainLabel = (template as any).domain ? DOMAIN_LABELS[(template as any).domain]?.[isHebrew ? 'he' : 'en'] ?? (template as any).domain : null;
  const deadlineDate = template.deadline ? new Date(template.deadline) : null;
  const deadlineStr = deadlineDate ? deadlineDate.toLocaleDateString(isHebrew ? 'he-IL' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-h-[90vh] overflow-y-auto ${showFilePreview ? 'sm:max-w-4xl' : 'sm:max-w-lg'} transition-all`} dir={isHebrew ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="text-xl leading-tight">{template.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Creator */}
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8">
              <AvatarImage src={creatorAvatar || undefined} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {creatorName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{creatorName}</p>
              {(template as any).company_name && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {(template as any).company_name}
                </p>
              )}
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {diff && (
              <Badge variant="outline" className={diff.color}>
                {isHebrew ? diff.he : diff.en}
              </Badge>
            )}
            {domainLabel && (
              <Badge variant="outline">{domainLabel}</Badge>
            )}
            {template.estimated_hours != null && (
              <Badge variant="secondary" className="gap-1">
                <Clock className="w-3 h-3" />
                ~{template.estimated_hours} {isHebrew ? 'שעות' : 'hours'}
              </Badge>
            )}
            {deadlineStr && (
              <Badge variant="outline" className="gap-1">
                <Calendar className="w-3 h-3" />
                {deadlineStr}
              </Badge>
            )}
          </div>

          {/* Tags */}
          {template.tags && template.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {template.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Description */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{template.description}</p>
          </div>

          {/* File Preview */}
          {previewUrl && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowFilePreview(!showFilePreview)}
                  className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  <FileText className="w-4 h-4" />
                  {showFilePreview
                    ? (isHebrew ? 'הסתר תצוגה מקדימה' : 'Hide Preview')
                    : (isHebrew ? 'הצג תצוגה מקדימה של הקובץ' : 'Preview File')}
                  {showFilePreview ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
              </div>
              {showFilePreview && (
                <div className="rounded-lg border overflow-hidden bg-white">
                  <iframe
                    src={previewUrl}
                    className="w-full h-[60vh] border-0"
                    title="File preview"
                  />
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {template.view_count} {isHebrew ? 'צפיות' : 'views'}
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            {template.file_url && (
              <a
                href={template.file_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" className="gap-2">
                  <Download className="w-4 h-4" />
                  {isHebrew ? 'הורד בריף מלא' : 'Download Full Brief'}
                </Button>
              </a>
            )}
            <Button
              className="gap-2 flex-1"
              onClick={() => { onOpenChange(false); onSubmit(template); }}
            >
              {isHebrew ? 'הגש פתרון' : 'Submit Solution'}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
