import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/contexts/CreditsContext';
import { supabase } from '@/integrations/supabase/client';
import { SYSTEM_AREAS, TARGET_AUDIENCES } from '@/lib/feature-badges';
import { VoiceRecorder } from './VoiceRecorder';
import { Loader2, Upload, Link2, Star, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface FeatureRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted: () => void;
}

export function FeatureRequestForm({ open, onOpenChange, onSubmitted }: FeatureRequestFormProps) {
  const { language, direction } = useLanguage();
  const isHe = language === 'he';
  const { user } = useAuth();
  const { awardCredits } = useCredits();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [systemArea, setSystemArea] = useState('other');
  const [targetAudience, setTargetAudience] = useState('both');
  const [priority, setPriority] = useState(3);
  const [linkUrl, setLinkUrl] = useState('');
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    const maxSize = 10 * 1024 * 1024; // 10MB
    const valid = newFiles.filter(f => f.size <= maxSize);
    if (valid.length < newFiles.length) {
      toast.error(isHe ? 'קבצים מעל 10MB הוסרו' : 'Files over 10MB removed');
    }
    setFiles(prev => [...prev, ...valid].slice(0, 3));
  };

  const sanitizeFilename = (name: string) =>
    name.replace(/[^\x00-\x7F]/g, '').replace(/\s+/g, '_') || `file_${Date.now()}`;

  const handleSubmit = async () => {
    if (!user || !title.trim()) return;
    setSubmitting(true);

    try {
      // Upload voice if exists
      let voicePath: string | null = null;
      if (voiceBlob) {
        const ext = voiceBlob.type.includes('webm') ? 'webm' : 'mp4';
        voicePath = `audio/${user.id}/${Date.now()}.${ext}`;
        await (supabase.storage.from('feature-attachments') as any).upload(voicePath, voiceBlob, {
          contentType: voiceBlob.type,
        });
      }

      // Upload files
      const attachmentPaths: string[] = [];
      for (const file of files) {
        const safeName = sanitizeFilename(file.name);
        const path = `files/${user.id}/${Date.now()}_${safeName}`;
        const { error } = await (supabase.storage.from('feature-attachments') as any).upload(path, file, {
          contentType: file.type,
        });
        if (!error) attachmentPaths.push(path);
      }

      // Insert feature request (let DB generate UUID)
      const { data: inserted, error } = await (supabase.from('feature_requests') as any)
        .insert({
          author_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          system_area: systemArea,
          target_audience: targetAudience,
          priority,
          voice_url: voicePath,
          attachments: attachmentPaths,
          link_url: linkUrl.trim() || null,
        })
        .select('id');

      if (error) {
        console.error('Insert error:', error.code, error.message, error.details, error.hint);
        throw error;
      }
      const data = { id: inserted?.[0]?.id ?? null };

      // Award credits
      try {
        await awardCredits('feature_request_submit' as any, data.id);
      } catch { /* credits award failed silently */ }

      // Award builder badge (first-time check)
      try {
        await (supabase.from('user_badges') as any).insert({
          user_id: user.id,
          badge_type: 'builder',
          feature_request_id: data.id,
        });
      } catch { /* badge already exists or error */ }

      toast.success(
        isHe ? '🎉 הרעיון הוגש! קיבלת 5 קרדיטים' : '🎉 Idea submitted! You earned 5 credits',
      );

      // Reset form
      setTitle('');
      setDescription('');
      setSystemArea('other');
      setTargetAudience('both');
      setPriority(3);
      setLinkUrl('');
      setVoiceBlob(null);
      setFiles([]);
      onOpenChange(false);
      onSubmitted();
    } catch (err) {
      console.error('Submit feature request error:', err);
      toast.error(isHe ? 'שגיאה בהגשת הרעיון' : 'Error submitting idea');
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir={direction}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {isHe ? 'הצע רעיון לפיצ׳ר' : 'Suggest a Feature'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Title */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              {isHe ? 'כותרת הרעיון *' : 'Idea Title *'}
            </label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={isHe ? 'למשל: סינון מועמדים לפי שפות' : 'e.g., Filter candidates by language'}
              maxLength={120}
            />
          </div>

          {/* System Area + Target Audience */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                {isHe ? 'איזור במערכת' : 'System Area'}
              </label>
              <Select value={systemArea} onValueChange={setSystemArea}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SYSTEM_AREAS).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val[isHe ? 'he' : 'en']}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                {isHe ? 'קהל יעד' : 'Target Audience'}
              </label>
              <Select value={targetAudience} onValueChange={setTargetAudience}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TARGET_AUDIENCES).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val[isHe ? 'he' : 'en']}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              {isHe ? 'תיאור הרעיון' : 'Description'}
            </label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={isHe ? 'ספר לנו עוד... מה זה עושה? למה זה חשוב?' : 'Tell us more... What does it do? Why is it important?'}
              rows={4}
            />
          </div>

          {/* Priority */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              {isHe ? 'כמה זה חשוב לך?' : 'How important is this?'}
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPriority(n)}
                  className={`p-1 transition-colors ${n <= priority ? 'text-yellow-400' : 'text-muted-foreground/30'}`}
                >
                  <Star className="w-5 h-5" fill={n <= priority ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
          </div>

          {/* Voice Recorder */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              {isHe ? 'הקלטה קולית' : 'Voice Recording'}
            </label>
            <VoiceRecorder
              onRecordingComplete={setVoiceBlob}
              onClear={() => setVoiceBlob(null)}
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              {isHe ? 'צרף קבצים (עד 3)' : 'Attach Files (up to 3)'}
            </label>
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-background text-xs cursor-pointer hover:bg-muted transition-colors">
                <Upload className="w-3.5 h-3.5" />
                {isHe ? 'העלה' : 'Upload'}
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              {files.length > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  {files.length} {isHe ? 'קבצים' : 'files'}
                </span>
              )}
            </div>
            {files.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {files.map((f, i) => (
                  <span key={i} className="text-[10px] bg-muted px-2 py-0.5 rounded flex items-center gap-1">
                    {f.name.substring(0, 20)}{f.name.length > 20 ? '...' : ''}
                    <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Link URL */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              {isHe ? 'קישור לדוגמה' : 'Reference Link'}
            </label>
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <Input
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                placeholder="https://..."
                type="url"
              />
            </div>
          </div>

          {/* Credit reward note */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-center">
            <p className="text-xs text-primary font-medium">
              {isHe ? '⚡ תקבל 5 קרדיטים + 10 XP על הגשת הרעיון!' : '⚡ Earn 5 credits + 10 XP for submitting!'}
            </p>
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || submitting}
            className="w-full gap-2"
            size="lg"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {isHe ? 'שלח רעיון' : 'Submit Idea'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
