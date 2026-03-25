import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, GripVertical, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface Question {
  id: string;
  text: string;
  type: 'open' | 'situational' | 'technical' | 'behavioral';
}

interface CreateVideoInterviewProps {
  onCreated?: () => void;
}

const questionTypeLabels = {
  open: 'פתוחה',
  situational: 'מצבית',
  technical: 'טכנית',
  behavioral: 'התנהגותית',
};

export function CreateVideoInterview({ onCreated }: CreateVideoInterviewProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [deadline, setDeadline] = useState('');
  const [thinkTime, setThinkTime] = useState('30');
  const [answerTime, setAnswerTime] = useState('120');
  const [maxRetakes, setMaxRetakes] = useState('1');
  const [questions, setQuestions] = useState<Question[]>([
    { id: '1', text: '', type: 'open' },
  ]);
  const [aiRoleInput, setAiRoleInput] = useState('');
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const addQuestion = () => {
    if (questions.length >= 10) {
      toast.error('מקסימום 10 שאלות');
      return;
    }
    setQuestions([...questions, { id: Date.now().toString(), text: '', type: 'open' }]);
  };

  const removeQuestion = (id: string) => {
    if (questions.length === 1) return;
    setQuestions(questions.filter(q => q.id !== id));
  };

  const updateQuestion = (id: string, field: keyof Question, value: string) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const generateAiQuestions = async () => {
    if (!aiRoleInput.trim()) {
      toast.error('הכנס תיאור תפקיד');
      return;
    }
    setAiLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/plug-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `צור 5 שאלות ראיון וידאו לתפקיד: ${aiRoleInput}. החזר JSON בפורמט: [{"text":"...","type":"open|situational|technical|behavioral"}]` }],
          context: { mode: 'generate_interview_questions' },
        }),
      });

      const reader = res.body?.getReader();
      let fullText = '';
      if (reader) {
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                fullText += parsed.choices?.[0]?.delta?.content || '';
              } catch {}
            }
          }
        }
      }

      // Extract JSON from response
      const jsonMatch = fullText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const generated: Array<{ text: string; type: Question['type'] }> = JSON.parse(jsonMatch[0]);
        const newQuestions = generated.slice(0, 5).map((q, i) => ({
          id: `ai-${Date.now()}-${i}`,
          text: q.text,
          type: q.type || 'open',
        }));
        setQuestions(prev => [...prev.filter(q => q.text), ...newQuestions].slice(0, 10));
        toast.success('5 שאלות נוצרו בהצלחה!');
      }
    } catch (e) {
      toast.error('שגיאה ביצירת שאלות');
    } finally {
      setAiLoading(false);
      setShowAiInput(false);
    }
  };

  const saveInterview = async (status: 'draft' | 'active') => {
    if (!user || !title.trim()) {
      toast.error('חובה לכתוב כותרת');
      return;
    }
    const validQuestions = questions.filter(q => q.text.trim());
    if (validQuestions.length === 0) {
      toast.error('הוסף לפחות שאלה אחת');
      return;
    }

    setSaving(true);
    try {
      const { data: interview, error } = await supabase
        .from('video_interviews' as any)
        .insert({
          created_by: user.id,
          title,
          instructions,
          deadline: deadline || null,
          think_time_seconds: parseInt(thinkTime),
          answer_time_seconds: parseInt(answerTime),
          max_retakes: parseInt(maxRetakes),
          status,
        })
        .select()
        .single();

      if (error) throw error;

      const questionsToInsert = validQuestions.map((q, i) => ({
        interview_id: (interview as any).id,
        question_text: q.text,
        question_order: i + 1,
        question_type: q.type,
      }));

      const { error: qErr } = await supabase
        .from('video_interview_questions' as any)
        .insert(questionsToInsert);

      if (qErr) throw qErr;

      toast.success(status === 'draft' ? 'נשמר כטיוטה' : 'ראיון פורסם!');
      onCreated?.();
    } catch (e: any) {
      toast.error('שגיאה: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <Card className="border-border" style={{ background: '#16213E', borderRadius: 12 }}>
        <CardHeader>
          <CardTitle className="text-foreground">יצירת ראיון וידאו אסינכרוני</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label>כותרת הראיון *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="ראיון למשרת Frontend Developer" className="mt-1" />
            </div>
            <div>
              <Label>הנחיות למועמד</Label>
              <Textarea value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="אנא ענה בצורה ברורה ומפורטת. יש לך זמן חשיבה לפני כל שאלה..." className="mt-1" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>תאריך יעד</Label>
                <Input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>מספר נסיונות</Label>
                <Select value={maxRetakes} onValueChange={setMaxRetakes}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">נסיון אחד</SelectItem>
                    <SelectItem value="2">2 נסיונות</SelectItem>
                    <SelectItem value="3">3 נסיונות</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>זמן חשיבה</Label>
                <Select value={thinkTime} onValueChange={setThinkTime}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 שניות</SelectItem>
                    <SelectItem value="30">30 שניות</SelectItem>
                    <SelectItem value="60">60 שניות</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>זמן תשובה</Label>
                <Select value={answerTime} onValueChange={setAnswerTime}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="60">דקה אחת</SelectItem>
                    <SelectItem value="120">2 דקות</SelectItem>
                    <SelectItem value="180">3 דקות</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <Card className="border-border" style={{ background: '#16213E', borderRadius: 12 }}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground">שאלות ({questions.length}/10)</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAiInput(!showAiInput)} className="gap-1.5 text-primary border-primary/30 hover:bg-primary/10">
              <Sparkles className="w-4 h-4" />
              PLUG AI ישלים
            </Button>
            <Button variant="outline" size="sm" onClick={addQuestion} disabled={questions.length >= 10} className="gap-1.5">
              <Plus className="w-4 h-4" />
              הוסף שאלה
            </Button>
          </div>
        </CardHeader>
        {showAiInput && (
          <div className="px-6 pb-4 flex gap-2">
            <Input
              value={aiRoleInput}
              onChange={e => setAiRoleInput(e.target.value)}
              placeholder="תאר את התפקיד (למשל: Frontend Developer React)"
              className="flex-1"
            />
            <Button onClick={generateAiQuestions} disabled={aiLoading} size="sm" className="bg-primary text-primary-foreground">
              {aiLoading ? 'יוצר...' : 'צור שאלות'}
            </Button>
          </div>
        )}
        <CardContent className="p-6 pt-0 space-y-3">
          {questions.map((q, idx) => (
            <div key={q.id} className="flex items-start gap-2 p-3 bg-background/40 rounded-xl">
              <GripVertical className="w-4 h-4 text-muted-foreground mt-3 flex-shrink-0" />
              <span className="text-muted-foreground text-sm mt-3 w-5 flex-shrink-0">{idx + 1}.</span>
              <div className="flex-1 space-y-2">
                <Input
                  value={q.text}
                  onChange={e => updateQuestion(q.id, 'text', e.target.value)}
                  placeholder="כתוב את השאלה..."
                />
                <Select value={q.type} onValueChange={v => updateQuestion(q.id, 'type', v)}>
                  <SelectTrigger className="w-40 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(questionTypeLabels).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeQuestion(q.id)} className="text-destructive hover:bg-destructive/10 flex-shrink-0">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={() => saveInterview('draft')} disabled={saving}>
          שמור כטיוטה
        </Button>
        <Button onClick={() => saveInterview('active')} disabled={saving} className="bg-primary text-primary-foreground">
          {saving ? 'שומר...' : 'פרסם ושלח למועמדים'}
        </Button>
      </div>
    </div>
  );
}
