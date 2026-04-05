import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Download, Upload, X, Eye, AlertTriangle, FileText } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { AssignmentTemplate } from './AssignmentCard';

const MAX_FILE_MB = 10;
const ALLOWED_EXTENSIONS = ['.pdf', '.zip', '.doc', '.docx', '.txt', '.md', '.fig', '.pptx', '.xlsx', '.png', '.jpg', '.jpeg'];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface SubmitSolutionDialogProps {
  template: AssignmentTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function SubmitSolutionDialog({ template, open, onOpenChange, onSuccess }: SubmitSolutionDialogProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const [step, setStep] = useState<1 | 2>(1);
  const [notes, setNotes] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [solutionFile, setSolutionFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fileError, setFileError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    setFileError('');
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setFileError(isHebrew ? `הקובץ גדול מ-${MAX_FILE_MB}MB` : `File exceeds ${MAX_FILE_MB}MB`);
      return false;
    }
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setFileError(isHebrew
        ? `סוג קובץ לא נתמך. סוגים מותרים: ${ALLOWED_EXTENSIONS.join(', ')}`
        : `Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
      return false;
    }
    return true;
  };

  const handleFileSelect = (file: File | null) => {
    if (!file) { setSolutionFile(null); setFileError(''); return; }
    if (validateFile(file)) {
      setSolutionFile(file);
    } else {
      setSolutionFile(null);
    }
  };

  const reset = () => {
    setStep(1); setNotes(''); setIsPublic(true); setSolutionFile(null);
  };

  const handleSubmit = async () => {
    if (!user || !template || !solutionFile) return;
    setIsSubmitting(true);
    try {
      const ext = solutionFile.name.split('.').pop();
      const path = `solutions/${template.id}/${user.id}/solution.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('home-assignments')
        .upload(path, solutionFile, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: signedData } = await supabase.storage
        .from('home-assignments')
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      const fileUrl = signedData?.signedUrl;
      if (!fileUrl) throw new Error('Could not get file URL');

      const { error } = await supabase.from('assignment_submissions' as any).insert({
        template_id: template.id,
        submitted_by: user.id,
        notes: notes.trim() || null,
        file_url: fileUrl,
        is_public: isPublic,
      });
      if (error) throw error;

      // Notify the poster
      await supabase.from('notifications' as any).insert({
        user_id: template.created_by,
        type: 'assignment_submission',
        title: isHebrew ? 'הגשה חדשה על המשימה שלך' : 'New submission on your assignment',
        message: isHebrew
          ? `פתרון חדש הוגש על "${template.title}"`
          : `A new solution was submitted for "${template.title}"`,
        data: { template_id: template.id },
      }).catch(() => {}); // don't fail if notifications table doesn't support this type

      toast.success(isHebrew ? 'הפתרון הוגש בהצלחה!' : 'Solution submitted!');
      reset();
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error(isHebrew ? 'שגיאה בהגשת הפתרון' : 'Failed to submit solution');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg" dir={isHebrew ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            {isHebrew ? 'הגשת פתרון' : 'Submit Solution'}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className={step === 1 ? 'text-primary font-semibold' : ''}>
            {isHebrew ? '1. סקירת המשימה' : '1. Review Task'}
          </span>
          <span>→</span>
          <span className={step === 2 ? 'text-primary font-semibold' : ''}>
            {isHebrew ? '2. הגשת פתרון' : '2. Upload Solution'}
          </span>
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            {/* Assignment info */}
            <div className="p-4 rounded-lg border bg-muted/30 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {template.category && <Badge variant="outline">{template.category}</Badge>}
                {template.difficulty && <Badge variant="outline">{template.difficulty}</Badge>}
                {template.estimated_hours != null && (
                  <Badge variant="secondary">~{template.estimated_hours}h</Badge>
                )}
              </div>
              <h3 className="font-semibold">{template.title}</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{template.description}</p>
            </div>

            {template.file_url && (
              <a
                href={template.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Download className="w-4 h-4" />
                {isHebrew ? 'הורד קובץ בריף מלא' : 'Download Full Brief'}
              </a>
            )}

            <Button onClick={() => setStep(2)} className="w-full gap-2">
              {isHebrew ? 'מוכן להגיש ←' : 'Ready to Submit →'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* File upload */}
            <div className="space-y-1.5">
              <Label>{isHebrew ? 'קובץ פתרון *' : 'Solution File *'}</Label>
              {solutionFile ? (
                <div className="flex items-center gap-2 p-2.5 border rounded-lg bg-muted/50">
                  <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{solutionFile.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(solutionFile.size)}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleFileSelect(null)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4" />
                  {isHebrew ? 'העלה את הפתרון' : 'Upload Solution'}
                </Button>
              )}
              {fileError && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {fileError}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {isHebrew ? `עד ${MAX_FILE_MB}MB • ${ALLOWED_EXTENSIONS.join(', ')}` : `Max ${MAX_FILE_MB}MB • ${ALLOWED_EXTENSIONS.join(', ')}`}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={ALLOWED_EXTENSIONS.join(',')}
                onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>{isHebrew ? 'הערות (אופציונלי)' : 'Notes (optional)'}</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isHebrew ? 'הסבר על הגישה שלך, קישורים רלוונטיים...' : 'Explain your approach, links...'}
                rows={3}
              />
            </div>

            {/* Public toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2 text-sm">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <span>{isHebrew ? 'הצג בפרופיל הציבורי שלי' : 'Show on my public profile'}</span>
              </div>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                {isHebrew ? '← חזור' : '← Back'}
              </Button>
              <Button
                onClick={() => setShowConfirm(true)}
                disabled={isSubmitting || !solutionFile}
                className="flex-1 gap-2"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {isHebrew ? 'הגש' : 'Submit'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent dir={isHebrew ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isHebrew ? 'הגשת פתרון' : 'Submit Solution'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isHebrew
                ? `אתה עומד להגיש את הפתרון שלך עבור "${template?.title}". לא ניתן לבטל הגשה לאחר שליחתה. להמשיך?`
                : `You are about to submit your solution for "${template?.title}". This action cannot be undone. Continue?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isHebrew ? 'ביטול' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowConfirm(false); handleSubmit(); }}>
              {isHebrew ? 'הגש פתרון' : 'Submit Solution'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
