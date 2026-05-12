import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Sparkles, Loader2, Bot, CheckCircle, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { he, enUS } from 'date-fns/locale';

interface AICourseGeneratorProps {
  hubId: string;
  isAdmin: boolean;
  onCourseCreated?: () => void;
}

type Difficulty = 'beginner' | 'intermediate' | 'advanced';
type GenerationLanguage = 'he' | 'en';
type LogStatus = 'pending' | 'completed' | 'failed';

interface CourseLog {
  id: string;
  hub_id: string;
  user_id: string;
  prompt: string;
  language: GenerationLanguage;
  difficulty: Difficulty;
  lesson_count: number;
  status: LogStatus;
  created_at: string;
  error_message?: string | null;
}

const DIFFICULTY_LABELS: Record<Difficulty, { he: string; en: string }> = {
  beginner:     { he: 'מתחיל',    en: 'Beginner'     },
  intermediate: { he: 'בינוני',   en: 'Intermediate' },
  advanced:     { he: 'מתקדם',    en: 'Advanced'     },
};

const STATUS_CONFIG: Record<LogStatus, { icon: React.ReactNode; he: string; en: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending:   { icon: <Clock   className="w-3 h-3" />, he: 'ממתין',    en: 'Pending',   variant: 'secondary'   },
  completed: { icon: <CheckCircle className="w-3 h-3" />, he: 'הושלם', en: 'Completed', variant: 'default'     },
  failed:    { icon: <XCircle className="w-3 h-3" />, he: 'נכשל',     en: 'Failed',    variant: 'destructive' },
};

export function AICourseGenerator({ hubId, isAdmin, onCourseCreated }: AICourseGeneratorProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const queryClient = useQueryClient();

  const [prompt, setPrompt] = useState('');
  const [genLanguage, setGenLanguage] = useState<GenerationLanguage>(isRTL ? 'he' : 'en');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [lessonCount, setLessonCount] = useState(5);

  // Fetch generation history
  const { data: logs = [], isLoading: logsLoading } = useQuery<CourseLog[]>({
    queryKey: ['community-ai-course-logs', hubId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('community_ai_course_logs')
        .select('*')
        .eq('hub_id', hubId)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: isAdmin,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      // Insert pending log
      const { data: log, error: insertError } = await (supabase as any)
        .from('community_ai_course_logs')
        .insert({
          hub_id: hubId,
          user_id: user.id,
          prompt,
          language: genLanguage,
          difficulty,
          lesson_count: lessonCount,
          status: 'pending',
        })
        .select()
        .single();

      if (insertError) throw insertError;
      const logId: string = log.id;

      // Invalidate so the pending row appears immediately
      queryClient.invalidateQueries({ queryKey: ['community-ai-course-logs', hubId] });

      try {
        const { error: fnError } = await supabase.functions.invoke('ai-generate-course', {
          body: {
            hub_id: hubId,
            log_id: logId,
            prompt,
            language: genLanguage,
            difficulty,
            lesson_count: lessonCount,
          },
        });

        if (fnError) throw fnError;

        // Mark completed
        await (supabase as any)
          .from('community_ai_course_logs')
          .update({ status: 'completed' })
          .eq('id', logId);

        return logId;
      } catch (err: any) {
        // Mark failed
        await (supabase as any)
          .from('community_ai_course_logs')
          .update({ status: 'failed', error_message: err?.message ?? 'Unknown error' })
          .eq('id', logId);
        throw err;
      }
    },
    onSuccess: () => {
      toast.success(isRTL ? 'הקורס נוצר בהצלחה!' : 'Course generated successfully!');
      setPrompt('');
      queryClient.invalidateQueries({ queryKey: ['community-ai-course-logs', hubId] });
      queryClient.invalidateQueries({ queryKey: ['community-courses', hubId] });
      onCourseCreated?.();
    },
    onError: (err: any) => {
      toast.error(isRTL ? `שגיאה ביצירת הקורס: ${err?.message ?? ''}` : `Failed to generate course: ${err?.message ?? ''}`);
      queryClient.invalidateQueries({ queryKey: ['community-ai-course-logs', hubId] });
    },
  });

  if (!isAdmin) return null;

  const isGenerating = generateMutation.isPending;

  return (
    <div className={cn('space-y-6', isRTL && 'rtl')} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Generation form */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardContent className="pt-6 space-y-5">
          {/* Header */}
          <div className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')}>
            <div className="p-2 rounded-lg bg-primary/10">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-base">
                {isRTL ? 'יצירת קורס עם AI' : 'AI Course Generator'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {isRTL
                  ? 'תאר את הקורס שברצונך ליצור והAI יבנה אותו עבורך'
                  : 'Describe the course you want and the AI will build it for you'}
              </p>
            </div>
          </div>

          {/* Prompt */}
          <div className="space-y-2">
            <Label htmlFor="ai-course-prompt">
              {isRTL ? 'תיאור הקורס' : 'Course Description'}
            </Label>
            <Textarea
              id="ai-course-prompt"
              placeholder={
                isRTL
                  ? 'לדוגמה: צור קורס על React Hooks למפתחים מתחילים...'
                  : 'e.g. Create a course about React Hooks for beginners...'
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              disabled={isGenerating}
              className="resize-none"
              aria-label={isRTL ? 'תיאור הקורס' : 'Course description prompt'}
            />
          </div>

          {/* Language toggle + Difficulty */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isRTL ? 'שפת הקורס' : 'Course Language'}</Label>
              <Select
                value={genLanguage}
                onValueChange={(v) => setGenLanguage(v as GenerationLanguage)}
                disabled={isGenerating}
              >
                <SelectTrigger aria-label={isRTL ? 'שפת הקורס' : 'Course language'}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="he">עברית</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{isRTL ? 'רמת קושי' : 'Difficulty'}</Label>
              <Select
                value={difficulty}
                onValueChange={(v) => setDifficulty(v as Difficulty)}
                disabled={isGenerating}
              >
                <SelectTrigger aria-label={isRTL ? 'רמת קושי' : 'Difficulty level'}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {isRTL ? DIFFICULTY_LABELS[key].he : DIFFICULTY_LABELS[key].en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Lesson count slider */}
          <div className="space-y-3">
            <div className={cn('flex items-center justify-between', isRTL && 'flex-row-reverse')}>
              <Label>{isRTL ? 'מספר שיעורים' : 'Number of Lessons'}</Label>
              <Badge variant="secondary" className="tabular-nums">
                {lessonCount} {isRTL ? 'שיעורים' : 'lessons'}
              </Badge>
            </div>
            <Slider
              min={3}
              max={10}
              step={1}
              value={[lessonCount]}
              onValueChange={([v]) => setLessonCount(v)}
              disabled={isGenerating}
              aria-label={isRTL ? 'מספר שיעורים' : 'Number of lessons'}
              className="w-full"
            />
            <div className={cn('flex justify-between text-xs text-muted-foreground', isRTL && 'flex-row-reverse')}>
              <span>3</span>
              <span>10</span>
            </div>
          </div>

          {/* Submit */}
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={isGenerating || !prompt.trim()}
            className="w-full gap-2"
            aria-label={isRTL ? 'צור קורס' : 'Generate course'}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isRTL ? 'יוצר קורס...' : 'Generating course...'}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {isRTL ? 'צור קורס עם AI' : 'Generate Course with AI'}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generation history */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">
          {isRTL ? 'היסטוריית יצירות' : 'Generation History'}
        </h4>

        {logsLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">{isRTL ? 'טוען היסטוריה...' : 'Loading history...'}</span>
          </div>
        ) : logs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
              <Sparkles className="w-8 h-8 opacity-30" />
              <p className="text-sm">
                {isRTL ? 'עדיין לא נוצרו קורסים עם AI' : 'No AI-generated courses yet'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              const statusCfg = STATUS_CONFIG[log.status];
              const diffLabel = isRTL
                ? DIFFICULTY_LABELS[log.difficulty]?.he
                : DIFFICULTY_LABELS[log.difficulty]?.en;
              const timeAgo = formatDistanceToNow(new Date(log.created_at), {
                addSuffix: true,
                locale: isRTL ? he : enUS,
              });

              return (
                <Card key={log.id} className="overflow-hidden">
                  <CardContent className="py-3 px-4">
                    <div className={cn('flex items-start gap-3', isRTL && 'flex-row-reverse')}>
                      <div className="mt-0.5 shrink-0">
                        {log.status === 'pending' ? (
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        ) : log.status === 'completed' ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-destructive" />
                        )}
                      </div>

                      <div className={cn('flex-1 min-w-0', isRTL && 'text-right')}>
                        <p className="text-sm font-medium truncate">{log.prompt}</p>
                        <div className={cn('flex items-center gap-2 mt-1 flex-wrap', isRTL && 'flex-row-reverse')}>
                          <Badge variant={statusCfg.variant} className="flex items-center gap-1 text-xs">
                            {statusCfg.icon}
                            {isRTL ? statusCfg.he : statusCfg.en}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {diffLabel}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {log.lesson_count} {isRTL ? 'שיעורים' : 'lessons'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{timeAgo}</span>
                        </div>
                        {log.status === 'failed' && log.error_message && (
                          <p className="text-xs text-destructive mt-1 truncate">{log.error_message}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
