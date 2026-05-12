import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  PlusCircle,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Settings,
  Save,
  Loader2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuizPlayerProps {
  lessonId: string;
  isAdmin: boolean;
}

interface QuizChoice {
  id?: string;
  text: string;
  text_he: string;
  is_correct: boolean;
  sort_order: number;
}

interface QuizQuestion {
  id: string;
  quiz_id: string;
  content: string;
  content_he: string;
  explanation?: string;
  sort_order: number;
  community_quiz_choices: QuizChoice[];
}

interface Quiz {
  id: string;
  exercise_id: string;
  pass_mark: number;
  time_limit_minutes: number | null;
  random_order: boolean;
  single_attempt: boolean;
  show_answers_at_end: boolean;
}

interface QuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  answers: Record<string, string>;
  score: number;
  passed: boolean;
  completed_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const emptyChoices = (): QuizChoice[] =>
  Array.from({ length: 4 }, (_, i) => ({
    text: '',
    text_he: '',
    is_correct: i === 0,
    sort_order: i,
  }));

// ─── QuizBuilder (Admin) ─────────────────────────────────────────────────────

function QuizBuilder({ lessonId }: { lessonId: string }) {
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const qc = useQueryClient();

  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [savingQ, setSavingQ] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Question form state
  const [qContent, setQContent] = useState('');
  const [qContentHe, setQContentHe] = useState('');
  const [qExplanation, setQExplanation] = useState('');
  const [choices, setChoices] = useState<QuizChoice[]>(emptyChoices());

  // Settings form state
  const [passMark, setPassMark] = useState(70);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | ''>('');
  const [randomOrder, setRandomOrder] = useState(false);
  const [singleAttempt, setSingleAttempt] = useState(false);
  const [showAnswersAtEnd, setShowAnswersAtEnd] = useState(true);

  // Ensure exercise + quiz exist, then fetch quiz
  const { data: quiz, isLoading: loadingQuiz } = useQuery({
    queryKey: ['quiz-for-lesson', lessonId],
    queryFn: async () => {
      // 1. Get or create exercise
      let { data: exercises } = await (supabase as any)
        .from('community_exercises')
        .select('id')
        .eq('lesson_id', lessonId)
        .eq('exercise_type', 'quiz')
        .limit(1);

      let exerciseId: string;
      if (exercises && exercises.length > 0) {
        exerciseId = exercises[0].id;
      } else {
        const { data: newEx, error } = await (supabase as any)
          .from('community_exercises')
          .insert({ lesson_id: lessonId, title: 'Quiz', exercise_type: 'quiz' })
          .select('id')
          .single();
        if (error) throw error;
        exerciseId = newEx.id;
      }

      // 2. Get or create quiz
      let { data: quizzes } = await (supabase as any)
        .from('community_quizzes')
        .select('*')
        .eq('exercise_id', exerciseId)
        .limit(1);

      if (quizzes && quizzes.length > 0) {
        return quizzes[0] as Quiz;
      }

      const { data: newQuiz, error: qErr } = await (supabase as any)
        .from('community_quizzes')
        .insert({
          exercise_id: exerciseId,
          pass_mark: 70,
          time_limit_minutes: null,
          random_order: false,
          single_attempt: false,
          show_answers_at_end: true,
        })
        .select('*')
        .single();
      if (qErr) throw qErr;
      return newQuiz as Quiz;
    },
  });

  // Sync settings form when quiz loads
  useEffect(() => {
    if (quiz) {
      setPassMark(quiz.pass_mark ?? 70);
      setTimeLimitMinutes(quiz.time_limit_minutes ?? '');
      setRandomOrder(quiz.random_order ?? false);
      setSingleAttempt(quiz.single_attempt ?? false);
      setShowAnswersAtEnd(quiz.show_answers_at_end ?? true);
    }
  }, [quiz]);

  const { data: questions = [], isLoading: loadingQs } = useQuery({
    queryKey: ['quiz-questions', quiz?.id],
    enabled: !!quiz?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('community_quiz_questions')
        .select('*, community_quiz_choices(*)')
        .eq('quiz_id', quiz!.id)
        .order('sort_order');
      if (error) throw error;
      return data as QuizQuestion[];
    },
  });

  const openNewForm = () => {
    setEditingQuestion(null);
    setQContent('');
    setQContentHe('');
    setQExplanation('');
    setChoices(emptyChoices());
    setShowQuestionForm(true);
  };

  const openEditForm = (q: QuizQuestion) => {
    setEditingQuestion(q);
    setQContent(q.content);
    setQContentHe(q.content_he);
    setQExplanation(q.explanation ?? '');
    const sorted = [...q.community_quiz_choices].sort((a, b) => a.sort_order - b.sort_order);
    setChoices(sorted.map((c) => ({ ...c })));
    setShowQuestionForm(true);
  };

  const handleSaveQuestion = async () => {
    if (!quiz) return;
    if (!qContent.trim()) {
      toast.error(isRTL ? 'יש להזין את תוכן השאלה' : 'Question content is required');
      return;
    }
    if (!choices.some((c) => c.is_correct)) {
      toast.error(isRTL ? 'יש לסמן תשובה נכונה' : 'Mark at least one correct answer');
      return;
    }
    setSavingQ(true);
    try {
      if (editingQuestion) {
        // Update question
        const { error } = await (supabase as any)
          .from('community_quiz_questions')
          .update({ content: qContent, content_he: qContentHe, explanation: qExplanation })
          .eq('id', editingQuestion.id);
        if (error) throw error;

        // Delete old choices and re-insert
        await (supabase as any)
          .from('community_quiz_choices')
          .delete()
          .eq('question_id', editingQuestion.id);

        await (supabase as any)
          .from('community_quiz_choices')
          .insert(
            choices.map((c, i) => ({
              question_id: editingQuestion.id,
              text: c.text,
              text_he: c.text_he,
              is_correct: c.is_correct,
              sort_order: i,
            }))
          );
      } else {
        // Insert question
        const { data: newQ, error: qErr } = await (supabase as any)
          .from('community_quiz_questions')
          .insert({
            quiz_id: quiz.id,
            content: qContent,
            content_he: qContentHe,
            explanation: qExplanation,
            question_type: 'multiple_choice',
            sort_order: questions.length,
          })
          .select('id')
          .single();
        if (qErr) throw qErr;

        await (supabase as any)
          .from('community_quiz_choices')
          .insert(
            choices.map((c, i) => ({
              question_id: newQ.id,
              text: c.text,
              text_he: c.text_he,
              is_correct: c.is_correct,
              sort_order: i,
            }))
          );
      }
      toast.success(isRTL ? 'השאלה נשמרה' : 'Question saved');
      qc.invalidateQueries({ queryKey: ['quiz-questions', quiz.id] });
      setShowQuestionForm(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingQ(false);
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!quiz) return;
    await (supabase as any).from('community_quiz_choices').delete().eq('question_id', qId);
    await (supabase as any).from('community_quiz_questions').delete().eq('id', qId);
    qc.invalidateQueries({ queryKey: ['quiz-questions', quiz.id] });
    toast.success(isRTL ? 'השאלה נמחקה' : 'Question deleted');
  };

  const handleSaveSettings = async () => {
    if (!quiz) return;
    setSavingSettings(true);
    try {
      const { error } = await (supabase as any)
        .from('community_quizzes')
        .update({
          pass_mark: passMark,
          time_limit_minutes: timeLimitMinutes === '' ? null : timeLimitMinutes,
          random_order: randomOrder,
          single_attempt: singleAttempt,
          show_answers_at_end: showAnswersAtEnd,
        })
        .eq('id', quiz.id);
      if (error) throw error;
      toast.success(isRTL ? 'ההגדרות נשמרו' : 'Settings saved');
      qc.invalidateQueries({ queryKey: ['quiz-for-lesson', lessonId] });
      setShowSettings(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingSettings(false);
    }
  };

  if (loadingQuiz) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', isRTL && 'rtl')} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {isRTL ? 'בניית חידון' : 'Quiz Builder'}
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)}>
            <Settings className="h-4 w-4 me-1" />
            {isRTL ? 'הגדרות' : 'Settings'}
          </Button>
          <Button size="sm" onClick={openNewForm}>
            <PlusCircle className="h-4 w-4 me-1" />
            {isRTL ? 'הוסף שאלה' : 'Add Question'}
          </Button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <Card>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>{isRTL ? 'ציון עובר (%)' : 'Pass Mark (%)'}</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={passMark}
                  onChange={(e) => setPassMark(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <Label>{isRTL ? 'הגבלת זמן (דקות)' : 'Time Limit (min)'}</Label>
                <Input
                  type="number"
                  min={1}
                  value={timeLimitMinutes}
                  placeholder={isRTL ? 'ללא הגבלה' : 'No limit'}
                  onChange={(e) =>
                    setTimeLimitMinutes(e.target.value === '' ? '' : Number(e.target.value))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              {[
                { label: isRTL ? 'סדר אקראי' : 'Random order', value: randomOrder, set: setRandomOrder },
                { label: isRTL ? 'ניסיון יחיד' : 'Single attempt', value: singleAttempt, set: setSingleAttempt },
                { label: isRTL ? 'הצג תשובות בסוף' : 'Show answers at end', value: showAnswersAtEnd, set: setShowAnswersAtEnd },
              ].map(({ label, value, set }) => (
                <div key={label} className="flex items-center justify-between">
                  <Label>{label}</Label>
                  <Switch checked={value} onCheckedChange={set} />
                </div>
              ))}
            </div>
            <Button size="sm" onClick={handleSaveSettings} disabled={savingSettings}>
              {savingSettings ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : <Save className="h-4 w-4 me-1" />}
              {isRTL ? 'שמור הגדרות' : 'Save Settings'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Question form */}
      {showQuestionForm && (
        <Card className="border-primary/40">
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{isRTL ? 'שאלה (אנגלית)' : 'Question (English)'}</Label>
                <Textarea value={qContent} onChange={(e) => setQContent(e.target.value)} rows={2} />
              </div>
              <div className="space-y-1">
                <Label>{isRTL ? 'שאלה (עברית)' : 'Question (Hebrew)'}</Label>
                <Textarea value={qContentHe} onChange={(e) => setQContentHe(e.target.value)} rows={2} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{isRTL ? 'תשובות (סמן נכונה)' : 'Choices (mark correct)'}</Label>
              {choices.map((ch, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct-choice"
                    checked={ch.is_correct}
                    onChange={() =>
                      setChoices((prev) =>
                        prev.map((c, j) => ({ ...c, is_correct: j === i }))
                      )
                    }
                    className="accent-primary"
                  />
                  <Input
                    placeholder={isRTL ? `תשובה ${i + 1} (EN)` : `Choice ${i + 1} (EN)`}
                    value={ch.text}
                    onChange={(e) =>
                      setChoices((prev) =>
                        prev.map((c, j) => (j === i ? { ...c, text: e.target.value } : c))
                      )
                    }
                  />
                  <Input
                    placeholder={isRTL ? `תשובה ${i + 1} (HE)` : `Choice ${i + 1} (HE)`}
                    value={ch.text_he}
                    onChange={(e) =>
                      setChoices((prev) =>
                        prev.map((c, j) => (j === i ? { ...c, text_he: e.target.value } : c))
                      )
                    }
                  />
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <Label>{isRTL ? 'הסבר (אופציונלי)' : 'Explanation (optional)'}</Label>
              <Textarea value={qExplanation} onChange={(e) => setQExplanation(e.target.value)} rows={2} />
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveQuestion} disabled={savingQ}>
                {savingQ ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : <Save className="h-4 w-4 me-1" />}
                {isRTL ? 'שמור שאלה' : 'Save Question'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowQuestionForm(false)}>
                {isRTL ? 'ביטול' : 'Cancel'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Questions list */}
      {loadingQs ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : questions.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          {isRTL ? 'אין שאלות עדיין. לחץ "הוסף שאלה" להתחיל.' : 'No questions yet. Click "Add Question" to begin.'}
        </p>
      ) : (
        <div className="space-y-3">
          {questions.map((q, idx) => (
            <Card key={q.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{idx + 1}</Badge>
                      <p className="font-medium">{isRTL ? q.content_he || q.content : q.content}</p>
                    </div>
                    <div className="space-y-1">
                      {q.community_quiz_choices
                        .sort((a, b) => a.sort_order - b.sort_order)
                        .map((ch, ci) => (
                          <div key={ci} className={cn('flex items-center gap-2 text-sm', ch.is_correct && 'text-green-600 font-medium')}>
                            {ch.is_correct ? <CheckCircle2 className="h-3 w-3" /> : <span className="h-3 w-3 inline-block" />}
                            {isRTL ? ch.text_he || ch.text : ch.text}
                          </div>
                        ))}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => openEditForm(q)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteQuestion(q.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── QuizTaker (Student) ─────────────────────────────────────────────────────

function QuizTaker({ lessonId }: { lessonId: string }) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const qc = useQueryClient();

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean; attemptId: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load quiz + questions
  const { data, isLoading } = useQuery({
    queryKey: ['quiz-player', lessonId],
    queryFn: async () => {
      const { data: exercises } = await (supabase as any)
        .from('community_exercises')
        .select('id')
        .eq('lesson_id', lessonId)
        .eq('exercise_type', 'quiz')
        .limit(1);
      if (!exercises || exercises.length === 0) return null;

      const { data: quizzes } = await (supabase as any)
        .from('community_quizzes')
        .select('*')
        .eq('exercise_id', exercises[0].id)
        .limit(1);
      if (!quizzes || quizzes.length === 0) return null;

      const quiz = quizzes[0] as Quiz;

      const { data: questions } = await (supabase as any)
        .from('community_quiz_questions')
        .select('*, community_quiz_choices(*)')
        .eq('quiz_id', quiz.id)
        .order('sort_order');

      return { quiz, questions: (questions ?? []) as QuizQuestion[] };
    },
  });

  // Load existing attempt
  const { data: existingAttempt } = useQuery({
    queryKey: ['quiz-attempt', data?.quiz?.id, user?.id],
    enabled: !!data?.quiz?.id && !!user?.id,
    queryFn: async () => {
      const { data: attempts } = await (supabase as any)
        .from('community_quiz_attempts')
        .select('*')
        .eq('quiz_id', data!.quiz.id)
        .eq('user_id', user!.id)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1);
      return (attempts && attempts.length > 0 ? attempts[0] : null) as QuizAttempt | null;
    },
  });

  // Timer setup
  useEffect(() => {
    if (!data?.quiz?.time_limit_minutes || submitted) return;
    const totalSeconds = data.quiz.time_limit_minutes * 60;
    setSecondsLeft(totalSeconds);
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timerRef.current!);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [data?.quiz?.id]);

  const handleSubmit = async () => {
    if (!data || !user) return;
    setSubmitting(true);
    try {
      const { quiz, questions } = data;
      let correct = 0;
      for (const q of questions) {
        const selectedId = answers[q.id];
        const selectedChoice = q.community_quiz_choices.find((c) => c.id === selectedId);
        if (selectedChoice?.is_correct) correct++;
      }
      const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
      const passed = score >= (quiz.pass_mark ?? 70);

      const { data: attempt, error } = await (supabase as any)
        .from('community_quiz_attempts')
        .insert({
          quiz_id: quiz.id,
          user_id: user.id,
          answers,
          score,
          passed,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      if (error) throw error;

      setResult({ score, passed, attemptId: attempt.id });
      setSubmitted(true);
      qc.invalidateQueries({ queryKey: ['quiz-attempt', quiz.id, user.id] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || data.questions.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        {isRTL ? 'החידון עדיין אינו זמין' : 'Quiz is not available yet'}
      </p>
    );
  }

  const { quiz, questions } = data;

  // Single attempt — show previous result
  if (quiz.single_attempt && existingAttempt && !submitted) {
    return (
      <ResultsScreen
        quiz={quiz}
        questions={questions}
        score={existingAttempt.score}
        passed={existingAttempt.passed}
        answers={existingAttempt.answers}
        isRTL={isRTL}
        previousAttempt
      />
    );
  }

  // Results screen after submission
  if (submitted && result) {
    return (
      <ResultsScreen
        quiz={quiz}
        questions={questions}
        score={result.score}
        passed={result.passed}
        answers={answers}
        isRTL={isRTL}
      />
    );
  }

  const currentQuestion = questions[currentIdx];
  const totalQ = questions.length;
  const progress = ((currentIdx + 1) / totalQ) * 100;
  const isLastQ = currentIdx === totalQ - 1;
  const allAnswered = questions.every((q) => answers[q.id]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn('space-y-4', isRTL && 'rtl')} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Progress + timer */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{isRTL ? `שאלה ${currentIdx + 1} מתוך ${totalQ}` : `Question ${currentIdx + 1} of ${totalQ}`}</span>
        {secondsLeft !== null && (
          <span className={cn('flex items-center gap-1', secondsLeft < 60 && 'text-destructive font-medium')}>
            <Clock className="h-4 w-4" />
            {formatTime(secondsLeft)}
          </span>
        )}
      </div>
      <Progress value={progress} className="h-2" />

      {/* Question card */}
      <Card>
        <CardContent className="pt-6 pb-4 space-y-4">
          <p className="text-base font-medium leading-relaxed">
            {isRTL ? currentQuestion.content_he || currentQuestion.content : currentQuestion.content}
          </p>
          <RadioGroup
            value={answers[currentQuestion.id] ?? ''}
            onValueChange={(val) =>
              setAnswers((prev) => ({ ...prev, [currentQuestion.id]: val }))
            }
          >
            {currentQuestion.community_quiz_choices
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((ch) => (
                <div key={ch.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer">
                  <RadioGroupItem value={ch.id!} id={ch.id} />
                  <Label htmlFor={ch.id} className="cursor-pointer">
                    {isRTL ? ch.text_he || ch.text : ch.text}
                  </Label>
                </div>
              ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentIdx((i) => Math.max(i - 1, 0))}
          disabled={currentIdx === 0}
        >
          {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {isRTL ? 'הקודמת' : 'Previous'}
        </Button>

        {isLastQ ? (
          <Button size="sm" onClick={handleSubmit} disabled={submitting || !allAnswered}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : null}
            {isRTL ? 'הגש חידון' : 'Submit Quiz'}
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => setCurrentIdx((i) => Math.min(i + 1, totalQ - 1))}
          >
            {isRTL ? 'הבאה' : 'Next'}
            {isRTL ? <ChevronLeft className="h-4 w-4 ms-1" /> : <ChevronRight className="h-4 w-4 ms-1" />}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Results Screen ───────────────────────────────────────────────────────────

function ResultsScreen({
  quiz,
  questions,
  score,
  passed,
  answers,
  isRTL,
  previousAttempt = false,
}: {
  quiz: Quiz;
  questions: QuizQuestion[];
  score: number;
  passed: boolean;
  answers: Record<string, string>;
  isRTL: boolean;
  previousAttempt?: boolean;
}) {
  return (
    <div className={cn('space-y-4', isRTL && 'rtl')} dir={isRTL ? 'rtl' : 'ltr'}>
      {previousAttempt && (
        <Badge variant="secondary" className="mb-1">
          {isRTL ? 'ניסיון קודם' : 'Previous attempt'}
        </Badge>
      )}

      <Card className={cn('text-center', passed ? 'border-green-400' : 'border-destructive/40')}>
        <CardContent className="pt-6 pb-4 space-y-3">
          {passed ? (
            <Trophy className="h-10 w-10 text-yellow-500 mx-auto" />
          ) : (
            <XCircle className="h-10 w-10 text-destructive mx-auto" />
          )}
          <h3 className="text-2xl font-bold">{score}%</h3>
          <Badge variant={passed ? 'default' : 'destructive'}>
            {passed ? (isRTL ? 'עברת!' : 'Passed!') : (isRTL ? 'לא עברת' : 'Not Passed')}
          </Badge>
          <p className="text-sm text-muted-foreground">
            {isRTL
              ? `ציון עובר: ${quiz.pass_mark}%`
              : `Pass mark: ${quiz.pass_mark}%`}
          </p>
        </CardContent>
      </Card>

      {quiz.show_answers_at_end && (
        <div className="space-y-3">
          <h4 className="font-semibold">{isRTL ? 'סקירת תשובות' : 'Answer Review'}</h4>
          {questions.map((q, idx) => {
            const selectedId = answers[q.id];
            const selectedChoice = q.community_quiz_choices.find((c) => c.id === selectedId);
            const isCorrect = selectedChoice?.is_correct;
            return (
              <Card key={q.id} className={cn(isCorrect ? 'border-green-300' : 'border-destructive/30')}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-start gap-2">
                    {isCorrect ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    )}
                    <p className="text-sm font-medium">
                      {idx + 1}. {isRTL ? q.content_he || q.content : q.content}
                    </p>
                  </div>
                  {q.community_quiz_choices
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((ch) => (
                      <div
                        key={ch.id}
                        className={cn(
                          'text-sm ps-6',
                          ch.is_correct && 'text-green-600 font-medium',
                          ch.id === selectedId && !ch.is_correct && 'text-destructive line-through'
                        )}
                      >
                        {isRTL ? ch.text_he || ch.text : ch.text}
                        {ch.is_correct && ' ✓'}
                      </div>
                    ))}
                  {q.explanation && (
                    <p className="text-xs text-muted-foreground ps-6 italic">{q.explanation}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function QuizPlayer({ lessonId, isAdmin }: QuizPlayerProps) {
  return isAdmin ? (
    <QuizBuilder lessonId={lessonId} />
  ) : (
    <QuizTaker lessonId={lessonId} />
  );
}
