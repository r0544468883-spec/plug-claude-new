import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, Sparkles, Loader2, ClipboardList } from 'lucide-react';

interface Question {
  question: string;
  type: 'open' | 'rating';
  max_score: number;
}

interface AssessmentBuilderProps {
  jobId?: string;
  jobTitle?: string;
  onCreated?: (id: string) => void;
}

export function AssessmentBuilder({ jobId, jobTitle, onCreated }: AssessmentBuilderProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [assessmentType, setAssessmentType] = useState<'behavioral' | 'technical' | 'situational'>('behavioral');
  const [timeLimit, setTimeLimit] = useState('');
  const [questions, setQuestions] = useState<Question[]>([
    { question: '', type: 'open', max_score: 5 },
  ]);
  const [generatingAI, setGeneratingAI] = useState(false);

  const addQuestion = () => setQuestions(prev => [...prev, { question: '', type: 'open', max_score: 5 }]);
  const removeQuestion = (i: number) => setQuestions(prev => prev.filter((_, idx) => idx !== i));
  const updateQuestion = (i: number, field: keyof Question, value: any) =>
    setQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, [field]: value } : q));

  const generateWithAI = async () => {
    if (!jobTitle && !title) {
      toast.error(isRTL ? 'יש למלא כותרת מבחן או שם תפקיד' : 'Please enter assessment title or job title');
      return;
    }
    setGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-interview-questions', {
        body: {
          jobTitle: jobTitle || title,
          assessmentType,
          count: 5,
        },
      });
      if (error) throw error;
      const generated = (data?.questions || []).map((q: any) => ({
        question: typeof q === 'string' ? q : q.question || q,
        type: 'open' as const,
        max_score: 5,
      }));
      if (generated.length > 0) {
        setQuestions(generated);
        toast.success(isRTL ? `${generated.length} שאלות נוצרו` : `${generated.length} questions generated`);
      }
    } catch {
      toast.error(isRTL ? 'שגיאה בייצור שאלות' : 'Failed to generate questions');
    } finally {
      setGeneratingAI(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const validQuestions = questions.filter(q => q.question.trim());
      if (!validQuestions.length) throw new Error('No questions');

      const { data, error } = await supabase.from('assessments' as any).insert({
        created_by: user.id,
        job_id: jobId || null,
        title: title || (isRTL ? `מבחן ${assessmentType}` : `${assessmentType} assessment`),
        assessment_type: assessmentType,
        questions: validQuestions,
        time_limit_minutes: timeLimit ? parseInt(timeLimit) : null,
      }).select('id').single();
      if (error) throw error;
      return (data as any).id;
    },
    onSuccess: (id) => {
      toast.success(isRTL ? 'מבחן נשמר!' : 'Assessment saved!');
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      onCreated?.(id);
    },
    onError: (e: any) => toast.error(e.message || (isRTL ? 'שגיאה בשמירת המבחן' : 'Failed to save assessment')),
  });

  const typeOptions = [
    { value: 'behavioral', labelEn: 'Behavioral', labelHe: 'התנהגותי' },
    { value: 'technical', labelEn: 'Technical', labelHe: 'טכני' },
    { value: 'situational', labelEn: 'Situational', labelHe: 'סיטואציוני' },
  ];

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          {isRTL ? 'בניית מבחן הערכה' : 'Assessment Builder'}
        </CardTitle>
        <CardDescription>
          {isRTL ? 'צור מבחן מותאם אישית עם שאלות ידניות או AI' : 'Build a custom assessment with manual or AI-generated questions'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Title & Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{isRTL ? 'שם המבחן' : 'Assessment Title'}</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={isRTL ? 'לדוגמה: מבחן Team Lead' : 'e.g. Team Lead Assessment'}
            />
          </div>
          <div className="space-y-2">
            <Label>{isRTL ? 'סוג מבחן' : 'Assessment Type'}</Label>
            <Select value={assessmentType} onValueChange={v => setAssessmentType(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {typeOptions.map(o => (
                  <SelectItem key={o.value} value={o.value}>{isRTL ? o.labelHe : o.labelEn}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Time limit */}
        <div className="space-y-2">
          <Label>{isRTL ? 'הגבלת זמן (דקות, אופציונלי)' : 'Time Limit (minutes, optional)'}</Label>
          <Input
            type="number"
            value={timeLimit}
            onChange={e => setTimeLimit(e.target.value)}
            placeholder={isRTL ? 'ללא הגבלה' : 'No limit'}
            className="w-40"
          />
        </div>

        {/* Questions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>{isRTL ? 'שאלות' : 'Questions'}</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1 text-xs h-7"
              onClick={generateWithAI}
              disabled={generatingAI}
            >
              {generatingAI ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-primary" />}
              {isRTL ? 'PLUG AI ייצר' : 'Generate with AI'}
            </Button>
          </div>

          <div className="space-y-3">
            {questions.map((q, i) => (
              <div key={i} className="flex gap-2 items-start group">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium mt-2">
                  {i + 1}
                </div>
                <div className="flex-1 space-y-2">
                  <Textarea
                    value={q.question}
                    onChange={e => updateQuestion(i, 'question', e.target.value)}
                    placeholder={isRTL ? 'תאר מצב שבו...' : 'Describe a situation where...'}
                    className="min-h-[60px] text-sm resize-none"
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs gap-1">
                      {isRTL ? 'ניקוד מקסימלי:' : 'Max score:'}
                      <Input
                        type="number"
                        value={q.max_score}
                        onChange={e => updateQuestion(i, 'max_score', parseInt(e.target.value) || 5)}
                        className="h-5 w-10 p-0 text-center text-xs border-0 bg-transparent"
                        min={1} max={10}
                      />
                    </Badge>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive mt-2"
                  onClick={() => removeQuestion(i)}
                  disabled={questions.length === 1}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>

          <Button type="button" variant="outline" size="sm" className="gap-1 text-xs" onClick={addQuestion}>
            <Plus className="h-3 w-3" />
            {isRTL ? 'הוסף שאלה' : 'Add Question'}
          </Button>
        </div>

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !questions.some(q => q.question.trim())}
          className="w-full gap-2"
        >
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
          {isRTL ? 'שמור מבחן' : 'Save Assessment'}
        </Button>
      </CardContent>
    </Card>
  );
}
