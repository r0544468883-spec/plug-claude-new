import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, GripVertical, Sparkles, Upload, Video, FileText, Link2, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Question {
  id: string;
  text: string;
  type: 'open' | 'situational' | 'technical' | 'behavioral';
  mediaUrl?: string;
  mediaType?: 'video' | 'image' | 'pdf' | 'link' | null;
  answerTimeSeconds?: number; // per-question override
}

interface CreateVideoInterviewProps {
  onCreated?: () => void;
}

type InterviewMode = 'structured' | 'freeform';

const questionTypeLabels: Record<string, { he: string; en: string }> = {
  open: { he: 'פתוחה', en: 'Open' },
  situational: { he: 'מצבית', en: 'Situational' },
  technical: { he: 'טכנית', en: 'Technical' },
  behavioral: { he: 'התנהגותית', en: 'Behavioral' },
};

export function CreateVideoInterview({ onCreated }: CreateVideoInterviewProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [deadline, setDeadline] = useState('');
  const [thinkTime, setThinkTime] = useState('30');
  const [answerTime, setAnswerTime] = useState('120');
  const [maxRetakes, setMaxRetakes] = useState('1');
  const [mode, setMode] = useState<InterviewMode>('structured');
  const [questions, setQuestions] = useState<Question[]>([
    { id: '1', text: '', type: 'open' },
  ]);
  const [aiRoleInput, setAiRoleInput] = useState('');
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingQuestionId, setUploadingQuestionId] = useState<string | null>(null);

  const addQuestion = () => {
    if (questions.length >= 10) {
      toast.error(isHebrew ? 'מקסימום 10 שאלות' : 'Maximum 10 questions');
      return;
    }
    setQuestions([...questions, { id: Date.now().toString(), text: '', type: 'open' }]);
  };

  const removeQuestion = (id: string) => {
    if (questions.length === 1) return;
    setQuestions(questions.filter(q => q.id !== id));
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const handleMediaUpload = async (questionId: string, file: File) => {
    setUploadingQuestionId(questionId);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const isVideo = ['mp4', 'webm', 'mov'].includes(ext);
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
      const isPdf = ext === 'pdf';

      const mediaType = isVideo ? 'video' : isImage ? 'image' : isPdf ? 'pdf' : null;
      if (!mediaType) {
        toast.error(isHebrew ? 'סוג קובץ לא נתמך' : 'Unsupported file type');
        return;
      }

      const safeName = file.name.replace(/[^\x00-\x7F]/g, '').replace(/\s+/g, '_');
      const path = `interview-media/${user!.id}/${Date.now()}-${safeName}`;

      const { error: uploadErr } = await supabase.storage
        .from('video-interviews')
        .upload(path, file);

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from('video-interviews').getPublicUrl(path);

      updateQuestion(questionId, { mediaUrl: publicUrl, mediaType });
      toast.success(isHebrew ? 'קובץ הועלה' : 'File uploaded');
    } catch (e: any) {
      toast.error(e.message || (isHebrew ? 'שגיאה בהעלאה' : 'Upload error'));
    } finally {
      setUploadingQuestionId(null);
    }
  };

  const handleMediaLink = (questionId: string) => {
    const url = prompt(isHebrew ? 'הכנס קישור (YouTube, Loom וכו\')' : 'Enter link (YouTube, Loom, etc.)');
    if (url?.trim()) {
      updateQuestion(questionId, { mediaUrl: url.trim(), mediaType: 'link' });
    }
  };

  const generateAiQuestions = async () => {
    if (!aiRoleInput.trim()) {
      toast.error(isHebrew ? 'הכנס תיאור תפקיד' : 'Enter role description');
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
          messages: [{ role: 'user', content: `Generate 5 video interview questions for the role: ${aiRoleInput}. Return JSON: [{"text":"...","type":"open|situational|technical|behavioral"}]` }],
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

      const jsonMatch = fullText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const generated: Array<{ text: string; type: Question['type'] }> = JSON.parse(jsonMatch[0]);
        const newQuestions = generated.slice(0, 5).map((q, i) => ({
          id: `ai-${Date.now()}-${i}`,
          text: q.text,
          type: q.type || 'open',
        }));
        setQuestions(prev => [...prev.filter(q => q.text), ...newQuestions].slice(0, 10));
        toast.success(isHebrew ? '5 שאלות נוצרו בהצלחה!' : '5 questions generated!');
      }
    } catch (e) {
      toast.error(isHebrew ? 'שגיאה ביצירת שאלות' : 'Error generating questions');
    } finally {
      setAiLoading(false);
      setShowAiInput(false);
    }
  };

  const saveInterview = async (status: 'draft' | 'active') => {
    if (!user || !title.trim()) {
      toast.error(isHebrew ? 'חובה לכתוב כותרת' : 'Title is required');
      return;
    }
    const validQuestions = questions.filter(q => q.text.trim());
    if (mode === 'structured' && validQuestions.length === 0) {
      toast.error(isHebrew ? 'הוסף לפחות שאלה אחת' : 'Add at least one question');
      return;
    }

    setSaving(true);
    try {
      const { data: interview, error } = await (supabase as any)
        .from('video_interviews')
        .insert({
          created_by: user.id,
          title,
          instructions,
          deadline: deadline || null,
          think_time_seconds: parseInt(thinkTime),
          answer_time_seconds: parseInt(answerTime),
          max_retakes: parseInt(maxRetakes),
          mode,
          status,
        })
        .select()
        .single();

      if (error) throw error;

      if (mode === 'structured' && validQuestions.length > 0) {
        const questionsToInsert = validQuestions.map((q, i) => ({
          interview_id: interview.id,
          question_text: q.text,
          question_order: i + 1,
          question_type: q.type,
          media_url: q.mediaUrl || null,
          media_type: q.mediaType || null,
          answer_time_seconds: q.answerTimeSeconds || null,
        }));

        const { error: qErr } = await (supabase as any)
          .from('video_interview_questions')
          .insert(questionsToInsert);

        if (qErr) throw qErr;
      }

      toast.success(
        status === 'draft'
          ? isHebrew ? 'נשמר כטיוטה' : 'Saved as draft'
          : isHebrew ? 'ראיון פורסם!' : 'Interview published!'
      );
      onCreated?.();
    } catch (e: any) {
      toast.error((isHebrew ? 'שגיאה: ' : 'Error: ') + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6" dir={isHebrew ? 'rtl' : 'ltr'}>
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>{isHebrew ? 'יצירת ראיון וידאו' : 'Create Video Interview'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          {/* Title */}
          <div>
            <Label>{isHebrew ? 'כותרת הראיון *' : 'Interview Title *'}</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={isHebrew ? 'ראיון למשרת Frontend Developer' : 'Interview for Frontend Developer'} className="mt-1" />
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
            <div>
              <p className="text-sm font-medium">
                {isHebrew ? 'מצב ראיון' : 'Interview Mode'}
              </p>
              <p className="text-xs text-muted-foreground">
                {mode === 'structured'
                  ? isHebrew ? 'שאלה אחרי שאלה — המועמד מקליט תשובה לכל שאלה בנפרד' : 'Question by question — candidate records an answer per question'
                  : isHebrew ? 'חופשי — המועמד מקליט סרטון אחד ארוך ומדבר על כל מה שרוצה' : 'Free-form — candidate records one long video and talks freely'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn('text-xs', mode === 'structured' ? 'text-primary font-medium' : 'text-muted-foreground')}>
                {isHebrew ? 'מובנה' : 'Structured'}
              </span>
              <Switch
                checked={mode === 'freeform'}
                onCheckedChange={(checked) => setMode(checked ? 'freeform' : 'structured')}
              />
              <span className={cn('text-xs', mode === 'freeform' ? 'text-primary font-medium' : 'text-muted-foreground')}>
                {isHebrew ? 'חופשי' : 'Free-form'}
              </span>
            </div>
          </div>

          {/* Instructions */}
          <div>
            <Label>{isHebrew ? 'הנחיות למועמד' : 'Instructions for Candidate'}</Label>
            <Textarea value={instructions} onChange={e => setInstructions(e.target.value)} placeholder={isHebrew ? 'אנא ענה בצורה ברורה ומפורטת...' : 'Please answer clearly and in detail...'} className="mt-1" rows={3} />
          </div>

          {/* Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{isHebrew ? 'תאריך יעד' : 'Deadline'}</Label>
              <Input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>{isHebrew ? 'מספר נסיונות' : 'Max Retakes'}</Label>
              <Select value={maxRetakes} onValueChange={setMaxRetakes}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{isHebrew ? 'נסיון אחד' : '1 attempt'}</SelectItem>
                  <SelectItem value="2">{isHebrew ? '2 נסיונות' : '2 attempts'}</SelectItem>
                  <SelectItem value="3">{isHebrew ? '3 נסיונות' : '3 attempts'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {mode === 'structured' && (
              <>
                <div>
                  <Label>{isHebrew ? 'זמן חשיבה' : 'Think Time'}</Label>
                  <Select value={thinkTime} onValueChange={setThinkTime}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15s</SelectItem>
                      <SelectItem value="30">30s</SelectItem>
                      <SelectItem value="60">60s</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{isHebrew ? 'זמן תשובה' : 'Answer Time'}</Label>
                  <Select value={answerTime} onValueChange={setAnswerTime}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="60">{isHebrew ? 'דקה' : '1 min'}</SelectItem>
                      <SelectItem value="120">{isHebrew ? '2 דקות' : '2 min'}</SelectItem>
                      <SelectItem value="180">{isHebrew ? '3 דקות' : '3 min'}</SelectItem>
                      <SelectItem value="300">{isHebrew ? '5 דקות' : '5 min'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {mode === 'freeform' && (
              <div>
                <Label>{isHebrew ? 'זמן מקסימלי' : 'Max Duration'}</Label>
                <Select value={answerTime} onValueChange={setAnswerTime}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="180">{isHebrew ? '3 דקות' : '3 min'}</SelectItem>
                    <SelectItem value="300">{isHebrew ? '5 דקות' : '5 min'}</SelectItem>
                    <SelectItem value="600">{isHebrew ? '10 דקות' : '10 min'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Questions (structured mode only) */}
      {mode === 'structured' && (
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{isHebrew ? `שאלות (${questions.length}/10)` : `Questions (${questions.length}/10)`}</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowAiInput(!showAiInput)} className="gap-1.5 text-primary border-primary/30 hover:bg-primary/10">
                <Sparkles className="w-4 h-4" />
                {isHebrew ? 'PLUG AI ישלים' : 'AI Generate'}
              </Button>
              <Button variant="outline" size="sm" onClick={addQuestion} disabled={questions.length >= 10} className="gap-1.5">
                <Plus className="w-4 h-4" />
                {isHebrew ? 'הוסף שאלה' : 'Add Question'}
              </Button>
            </div>
          </CardHeader>
          {showAiInput && (
            <div className="px-6 pb-4 flex gap-2">
              <Input
                value={aiRoleInput}
                onChange={e => setAiRoleInput(e.target.value)}
                placeholder={isHebrew ? 'תאר את התפקיד (למשל: Frontend Developer React)' : 'Describe the role (e.g., Frontend Developer React)'}
                className="flex-1"
              />
              <Button onClick={generateAiQuestions} disabled={aiLoading} size="sm">
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isHebrew ? 'צור שאלות' : 'Generate'}
              </Button>
            </div>
          )}
          <CardContent className="p-6 pt-0 space-y-3">
            {questions.map((q, idx) => (
              <div key={q.id} className="p-3 bg-muted/20 rounded-xl space-y-2">
                <div className="flex items-start gap-2">
                  <GripVertical className="w-4 h-4 text-muted-foreground mt-3 flex-shrink-0" />
                  <span className="text-muted-foreground text-sm mt-3 w-5 flex-shrink-0">{idx + 1}.</span>
                  <div className="flex-1 space-y-2">
                    <Input
                      value={q.text}
                      onChange={e => updateQuestion(q.id, { text: e.target.value })}
                      placeholder={isHebrew ? 'כתוב את השאלה...' : 'Write the question...'}
                    />
                    <div className="flex items-center gap-2">
                      <Select value={q.type} onValueChange={v => updateQuestion(q.id, { type: v as Question['type'] })}>
                        <SelectTrigger className="w-36 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(questionTypeLabels).map(([val, labels]) => (
                            <SelectItem key={val} value={val}>{isHebrew ? labels.he : labels.en}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Per-question answer time override */}
                      <Select
                        value={q.answerTimeSeconds ? String(q.answerTimeSeconds) : 'default'}
                        onValueChange={v => updateQuestion(q.id, { answerTimeSeconds: v === 'default' ? undefined : parseInt(v) })}
                      >
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue placeholder={isHebrew ? 'זמן' : 'Time'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">{isHebrew ? 'ברירת מחדל' : 'Default'}</SelectItem>
                          <SelectItem value="30">30s</SelectItem>
                          <SelectItem value="60">60s</SelectItem>
                          <SelectItem value="90">90s</SelectItem>
                          <SelectItem value="120">120s</SelectItem>
                          <SelectItem value="180">180s</SelectItem>
                          <SelectItem value="300">300s</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Media attachment buttons */}
                      <div className="flex gap-1 ms-auto">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title={isHebrew ? 'העלה קובץ (וידאו, תמונה, PDF)' : 'Upload file (video, image, PDF)'}
                          disabled={uploadingQuestionId === q.id}
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'video/*,image/*,.pdf';
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (file) handleMediaUpload(q.id, file);
                            };
                            input.click();
                          }}
                        >
                          {uploadingQuestionId === q.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Upload className="w-3.5 h-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title={isHebrew ? 'הוסף קישור (YouTube, Loom)' : 'Add link (YouTube, Loom)'}
                          onClick={() => handleMediaLink(q.id)}
                        >
                          <Link2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeQuestion(q.id)} className="text-destructive hover:bg-destructive/10 flex-shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* Media preview */}
                {q.mediaUrl && (
                  <div className="flex items-center gap-2 ms-9 p-2 bg-background/50 rounded-lg text-xs">
                    {q.mediaType === 'video' && <Video className="w-3.5 h-3.5 text-primary" />}
                    {q.mediaType === 'image' && <Upload className="w-3.5 h-3.5 text-primary" />}
                    {q.mediaType === 'pdf' && <FileText className="w-3.5 h-3.5 text-primary" />}
                    {q.mediaType === 'link' && <Link2 className="w-3.5 h-3.5 text-primary" />}
                    <span className="flex-1 truncate text-muted-foreground">{q.mediaUrl}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => updateQuestion(q.id, { mediaUrl: undefined, mediaType: null })}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Free-form info */}
      {mode === 'freeform' && (
        <Card className="border-border bg-card">
          <CardContent className="p-6 text-center space-y-2">
            <Video className="w-10 h-10 text-primary mx-auto" />
            <p className="font-medium">{isHebrew ? 'מצב חופשי' : 'Free-form Mode'}</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {isHebrew
                ? 'המועמד יקליט סרטון אחד ארוך בלי שאלות מובנות. תוכל לכתוב הנחיות בשדה למעלה.'
                : 'The candidate will record one long video without structured questions. You can write instructions in the field above.'}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={() => saveInterview('draft')} disabled={saving}>
          {isHebrew ? 'שמור כטיוטה' : 'Save Draft'}
        </Button>
        <Button onClick={() => saveInterview('active')} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : isHebrew ? 'פרסם ושלח למועמדים' : 'Publish & Send'}
        </Button>
      </div>
    </div>
  );
}
