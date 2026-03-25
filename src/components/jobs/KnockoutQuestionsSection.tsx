import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Plus, Trash2, Loader2, HelpCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface KnockoutQuestion {
  question_text: string;
  is_required: boolean;
  correct_answer: boolean; // true = must say yes, false = must say no
}

interface Props {
  questions: KnockoutQuestion[];
  onChange: (questions: KnockoutQuestion[]) => void;
  jobTitle?: string;
}

export function KnockoutQuestionsSection({ questions, onChange, jobTitle }: Props) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [aiLoading, setAiLoading] = useState(false);

  const addQuestion = () => {
    if (questions.length >= 5) {
      toast.warning(isHebrew ? 'מקסימום 5 שאלות סינון' : 'Maximum 5 knockout questions');
      return;
    }
    onChange([...questions, { question_text: '', is_required: true, correct_answer: true }]);
  };

  const removeQuestion = (idx: number) => {
    onChange(questions.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx: number, field: keyof KnockoutQuestion, value: any) => {
    onChange(questions.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const generateAIQuestions = async () => {
    if (!jobTitle) {
      toast.error(isHebrew ? 'הזן כותרת משרה תחילה' : 'Enter a job title first');
      return;
    }
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('plug-chat', {
        body: {
          message: `Generate 3-5 yes/no screening (knockout) questions for a job posting titled: "${jobTitle}". 
Return ONLY a JSON array in this exact format:
[{"question": "Do you have X years experience?", "correct_answer": true}, ...]
Where correct_answer is true if the candidate must answer YES to pass.`,
          context: { type: 'knockout_questions' }
        }
      });

      if (error) throw error;

      const text = data?.reply || '';
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        const newQs: KnockoutQuestion[] = parsed.slice(0, 5).map((q: any) => ({
          question_text: q.question,
          is_required: true,
          correct_answer: q.correct_answer ?? true,
        }));
        onChange([...questions, ...newQs].slice(0, 5));
        toast.success(isHebrew ? 'שאלות הסינון נוצרו בהצלחה!' : 'Knockout questions generated!');
      }
    } catch {
      toast.error(isHebrew ? 'שגיאה ביצירת שאלות' : 'Failed to generate questions');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-base font-semibold">
          <HelpCircle className="w-4 h-4 text-primary" />
          {isHebrew ? 'שאלות סינון אוטומטיות' : 'Knockout Questions'}
          <Badge variant="secondary" className="text-xs">{questions.length}/5</Badge>
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={generateAIQuestions}
          disabled={aiLoading}
          className="gap-2 text-primary border-primary/30 hover:bg-primary/5"
        >
          {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          {isHebrew ? 'PLUG AI ימליץ' : 'PLUG AI Suggest'}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {isHebrew
          ? 'מועמד שעונה תשובה שגויה על שאלה חובה — יוסנן אוטומטית בצורה מכבדת'
          : 'Candidates who answer a required question incorrectly are respectfully filtered out automatically'}
      </p>

      {questions.map((q, idx) => (
        <Card key={idx} className="bg-muted/30 border-border">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <Input
                  value={q.question_text}
                  onChange={(e) => updateQuestion(idx, 'question_text', e.target.value)}
                  placeholder={isHebrew ? 'לדוגמה: האם יש לך ניסיון עם AWS?' : 'e.g. Do you have AWS experience?'}
                  className="text-sm"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeQuestion(idx)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">{isHebrew ? 'תשובה נדרשת:' : 'Required answer:'}</Label>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={q.correct_answer ? "default" : "outline"}
                    onClick={() => updateQuestion(idx, 'correct_answer', true)}
                    className="h-6 px-2 text-xs"
                  >
                    {isHebrew ? 'כן' : 'Yes'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={!q.correct_answer ? "default" : "outline"}
                    onClick={() => updateQuestion(idx, 'correct_answer', false)}
                    className="h-6 px-2 text-xs"
                  >
                    {isHebrew ? 'לא' : 'No'}
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={q.is_required}
                  onCheckedChange={(v) => updateQuestion(idx, 'is_required', v)}
                  id={`required-${idx}`}
                />
                <Label htmlFor={`required-${idx}`} className="text-xs">
                  {isHebrew ? 'חובה (סינון אוטומטי)' : 'Required (auto-filter)'}
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {questions.length < 5 && (
        <Button
          type="button"
          variant="outline"
          onClick={addQuestion}
          className="w-full gap-2 border-2 border-dashed border-border hover:border-primary/40 bg-transparent text-muted-foreground hover:text-foreground h-10"
        >
          <Plus className="w-4 h-4" />
          {isHebrew ? 'הוסף שאלת סינון' : 'Add Knockout Question'}
        </Button>
      )}
    </div>
  );
}
