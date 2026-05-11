import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Question {
  id: string;
  hub_id: string;
  author_id: string;
  title: string;
  body: string;
  tags: string[];
  is_solved: boolean;
  vote_count: number;
  answer_count: number;
  created_at: string;
}

interface Answer {
  id: string;
  question_id: string;
  author_id: string;
  body: string;
  is_accepted: boolean;
  vote_count: number;
  created_at: string;
}

type SortOption = 'newest' | 'most_voted' | 'unanswered';

// ─── Props ────────────────────────────────────────────────────────────────────

interface QATabProps {
  hubId: string;
  isAdmin: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function QATab({ hubId, isAdmin }: QATabProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isRTL = language === 'he';
  const dateLocale = isRTL ? he : enUS;

  // UI state
  const [sort, setSort] = useState<SortOption>('newest');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAskForm, setShowAskForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState({ title: '', body: '', tags: '' });
  const [newAnswers, setNewAnswers] = useState<Record<string, string>>({});

  // ── i18n strings ──────────────────────────────────────────────────────────
  const t = {
    title: isRTL ? 'שאלות ותשובות' : 'Q&A',
    askQuestion: isRTL ? 'שאל שאלה' : 'Ask a Question',
    cancel: isRTL ? 'ביטול' : 'Cancel',
    submit: isRTL ? 'שלח' : 'Submit',
    questionTitle: isRTL ? 'כותרת השאלה' : 'Question Title',
    questionBody: isRTL ? 'פרט את שאלתך...' : 'Describe your question...',
    tagsPlaceholder: isRTL ? 'תגיות (מופרדות בפסיק)' : 'Tags (comma-separated)',
    sortNewest: isRTL ? 'חדש ביותר' : 'Newest',
    sortVoted: isRTL ? 'הכי ממומשים' : 'Most Voted',
    sortUnanswered: isRTL ? 'ללא מענה' : 'Unanswered',
    answers: isRTL ? 'תשובות' : 'answers',
    answer: isRTL ? 'תשובה' : 'answer',
    solved: isRTL ? 'נפתר' : 'Solved',
    writeAnswer: isRTL ? 'כתוב תשובה...' : 'Write an answer...',
    postAnswer: isRTL ? 'פרסם תשובה' : 'Post Answer',
    accept: isRTL ? 'סמן כנכון' : 'Accept',
    accepted: isRTL ? 'מקובל' : 'Accepted',
    emptyTitle: isRTL ? 'אין שאלות עדיין' : 'No questions yet',
    emptyBody: isRTL ? 'היה הראשון לשאול!' : 'Be the first to ask!',
    loginRequired: isRTL ? 'יש להתחבר כדי לבצע פעולה זו' : 'Please log in to perform this action',
    questionPosted: isRTL ? 'השאלה פורסמה!' : 'Question posted!',
    answerPosted: isRTL ? 'התשובה פורסמה!' : 'Answer posted!',
    voteRecorded: isRTL ? 'הצבעה נרשמה' : 'Vote recorded',
    answerAccepted: isRTL ? 'התשובה סומנה כנכונה' : 'Answer marked as accepted',
    titleRequired: isRTL ? 'נדרשת כותרת' : 'Title is required',
    bodyRequired: isRTL ? 'נדרש גוף' : 'Body is required',
  };

  // ── Fetch questions ────────────────────────────────────────────────────────
  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['community_questions', hubId, sort],
    queryFn: async () => {
      let query = (supabase as any)
        .from('community_questions')
        .select('*')
        .eq('hub_id', hubId);

      if (sort === 'newest') query = query.order('created_at', { ascending: false });
      else if (sort === 'most_voted') query = query.order('vote_count', { ascending: false });
      else if (sort === 'unanswered') query = query.eq('answer_count', 0).order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Question[];
    },
  });

  // ── Fetch answers for expanded question ───────────────────────────────────
  const { data: answers = [] } = useQuery({
    queryKey: ['community_answers', expandedId],
    queryFn: async () => {
      if (!expandedId) return [];
      const { data, error } = await (supabase as any)
        .from('community_answers')
        .select('*')
        .eq('question_id', expandedId)
        .order('is_accepted', { ascending: false })
        .order('vote_count', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Answer[];
    },
    enabled: !!expandedId,
  });

  // ── Fetch user votes ───────────────────────────────────────────────────────
  const { data: userVotes = [] } = useQuery({
    queryKey: ['community_votes', user?.id, hubId],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from('community_votes')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const getUserVote = (voteableType: string, voteableId: string): number => {
    const v = userVotes.find(
      (x: any) => x.voteable_type === voteableType && x.voteable_id === voteableId
    );
    return v ? v.value : 0;
  };

  // ── Post question ──────────────────────────────────────────────────────────
  const postQuestion = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error(t.loginRequired);
      if (!newQuestion.title.trim()) throw new Error(t.titleRequired);
      if (!newQuestion.body.trim()) throw new Error(t.bodyRequired);
      const tags = newQuestion.tags
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const { error } = await (supabase as any).from('community_questions').insert({
        hub_id: hubId,
        author_id: user.id,
        title: newQuestion.title.trim(),
        body: newQuestion.body.trim(),
        tags,
        is_solved: false,
        vote_count: 0,
        answer_count: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community_questions', hubId] });
      setNewQuestion({ title: '', body: '', tags: '' });
      setShowAskForm(false);
      toast({ title: t.questionPosted });
    },
    onError: (err: any) => {
      toast({ title: err.message, variant: 'destructive' });
    },
  });

  // ── Post answer ────────────────────────────────────────────────────────────
  const postAnswer = useMutation({
    mutationFn: async (questionId: string) => {
      if (!user) throw new Error(t.loginRequired);
      const body = (newAnswers[questionId] ?? '').trim();
      if (!body) throw new Error(t.bodyRequired);
      const { error } = await (supabase as any).from('community_answers').insert({
        question_id: questionId,
        author_id: user.id,
        body,
        is_accepted: false,
        vote_count: 0,
      });
      if (error) throw error;
      // increment answer_count
      await (supabase as any).rpc('increment_answer_count', { qid: questionId }).maybeSingle();
    },
    onSuccess: (_data, questionId) => {
      queryClient.invalidateQueries({ queryKey: ['community_answers', questionId] });
      queryClient.invalidateQueries({ queryKey: ['community_questions', hubId] });
      setNewAnswers((prev) => ({ ...prev, [questionId]: '' }));
      toast({ title: t.answerPosted });
    },
    onError: (err: any) => {
      toast({ title: err.message, variant: 'destructive' });
    },
  });

  // ── Vote ───────────────────────────────────────────────────────────────────
  const castVote = useMutation({
    mutationFn: async ({
      voteableType,
      voteableId,
      value,
    }: {
      voteableType: 'question' | 'answer';
      voteableId: string;
      value: 1 | -1;
    }) => {
      if (!user) throw new Error(t.loginRequired);
      const existing = userVotes.find(
        (x: any) => x.voteable_type === voteableType && x.voteable_id === voteableId
      );
      if (existing) {
        if (existing.value === value) {
          // toggle off
          await (supabase as any).from('community_votes').delete().eq('id', existing.id);
        } else {
          await (supabase as any)
            .from('community_votes')
            .update({ value })
            .eq('id', existing.id);
        }
      } else {
        await (supabase as any).from('community_votes').insert({
          user_id: user.id,
          voteable_type: voteableType,
          voteable_id: voteableId,
          value,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community_votes', user?.id, hubId] });
      queryClient.invalidateQueries({ queryKey: ['community_questions', hubId] });
      queryClient.invalidateQueries({ queryKey: ['community_answers', expandedId] });
      toast({ title: t.voteRecorded });
    },
    onError: (err: any) => {
      toast({ title: err.message, variant: 'destructive' });
    },
  });

  // ── Accept answer ──────────────────────────────────────────────────────────
  const acceptAnswer = useMutation({
    mutationFn: async ({
      answerId,
      questionId,
      authorId,
    }: {
      answerId: string;
      questionId: string;
      authorId: string;
    }) => {
      if (!user) throw new Error(t.loginRequired);
      if (!isAdmin && user.id !== authorId) throw new Error(t.loginRequired);
      // unaccept others
      await (supabase as any)
        .from('community_answers')
        .update({ is_accepted: false })
        .eq('question_id', questionId);
      await (supabase as any)
        .from('community_answers')
        .update({ is_accepted: true })
        .eq('id', answerId);
      await (supabase as any)
        .from('community_questions')
        .update({ is_solved: true })
        .eq('id', questionId);
    },
    onSuccess: (_data, { questionId }) => {
      queryClient.invalidateQueries({ queryKey: ['community_answers', questionId] });
      queryClient.invalidateQueries({ queryKey: ['community_questions', hubId] });
      toast({ title: t.answerAccepted });
    },
    onError: (err: any) => {
      toast({ title: err.message, variant: 'destructive' });
    },
  });

  // ── Render vote controls ───────────────────────────────────────────────────
  const VoteControls = ({
    voteableType,
    voteableId,
    voteCount,
  }: {
    voteableType: 'question' | 'answer';
    voteableId: string;
    voteCount: number;
  }) => {
    const userVote = getUserVote(voteableType, voteableId);
    return (
      <div className={cn('flex items-center gap-1', isRTL ? 'flex-row-reverse' : 'flex-row')}>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-7 w-7', userVote === 1 && 'text-green-500')}
          onClick={() =>
            castVote.mutate({ voteableType, voteableId, value: 1 })
          }
          aria-label="upvote"
        >
          <ThumbsUp className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium w-6 text-center">{voteCount}</span>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-7 w-7', userVote === -1 && 'text-red-500')}
          onClick={() =>
            castVote.mutate({ voteableType, voteableId, value: -1 })
          }
          aria-label="downvote"
        >
          <ThumbsDown className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="space-y-4">
      {/* Header */}
      <div className={cn('flex items-center justify-between flex-wrap gap-2')}>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          {t.title}
        </h2>
        <Button size="sm" onClick={() => setShowAskForm((v) => !v)}>
          {showAskForm ? <X className="h-4 w-4 me-1" /> : <Plus className="h-4 w-4 me-1" />}
          {showAskForm ? t.cancel : t.askQuestion}
        </Button>
      </div>

      {/* Ask form */}
      {showAskForm && (
        <Card className="border-primary/30">
          <CardContent className="pt-4 space-y-3">
            <Input
              placeholder={t.questionTitle}
              value={newQuestion.title}
              onChange={(e) => setNewQuestion((p) => ({ ...p, title: e.target.value }))}
              dir={isRTL ? 'rtl' : 'ltr'}
            />
            <Textarea
              placeholder={t.questionBody}
              rows={4}
              value={newQuestion.body}
              onChange={(e) => setNewQuestion((p) => ({ ...p, body: e.target.value }))}
              dir={isRTL ? 'rtl' : 'ltr'}
            />
            <Input
              placeholder={t.tagsPlaceholder}
              value={newQuestion.tags}
              onChange={(e) => setNewQuestion((p) => ({ ...p, tags: e.target.value }))}
              dir={isRTL ? 'rtl' : 'ltr'}
            />
            <div className={cn('flex gap-2', isRTL ? 'flex-row-reverse' : 'flex-row')}>
              <Button
                size="sm"
                onClick={() => postQuestion.mutate()}
                disabled={postQuestion.isPending}
              >
                {t.submit}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowAskForm(false)}>
                {t.cancel}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sort controls */}
      <div className={cn('flex gap-2 flex-wrap', isRTL ? 'flex-row-reverse' : 'flex-row')}>
        {(['newest', 'most_voted', 'unanswered'] as SortOption[]).map((s) => (
          <Button
            key={s}
            variant={sort === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSort(s)}
          >
            {s === 'newest' ? t.sortNewest : s === 'most_voted' ? t.sortVoted : t.sortUnanswered}
          </Button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && questions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-3">
          <MessageSquare className="h-12 w-12 opacity-30" />
          <p className="text-base font-medium">{t.emptyTitle}</p>
          <p className="text-sm">{t.emptyBody}</p>
        </div>
      )}

      {/* Question list */}
      <div className="space-y-3">
        {questions.map((q) => {
          const isExpanded = expandedId === q.id;
          const questionAnswers = isExpanded ? answers : [];
          const canAccept = user && (isAdmin || user.id === q.author_id);

          return (
            <Card
              key={q.id}
              className={cn('transition-shadow', isExpanded && 'ring-1 ring-primary/30')}
            >
              <CardContent className="pt-4 pb-3 space-y-2">
                {/* Question header */}
                <div className={cn('flex items-start gap-3', isRTL ? 'flex-row-reverse' : 'flex-row')}>
                  {/* Vote controls */}
                  <VoteControls
                    voteableType="question"
                    voteableId={q.id}
                    voteCount={q.vote_count}
                  />

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className={cn('flex items-center gap-2 flex-wrap', isRTL ? 'flex-row-reverse' : 'flex-row')}>
                      {q.is_solved && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          {t.solved}
                        </Badge>
                      )}
                      <h3 className="font-medium text-sm leading-snug">{q.title}</h3>
                    </div>

                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{q.body}</p>

                    {/* Tags */}
                    {q.tags && q.tags.length > 0 && (
                      <div className={cn('flex gap-1 flex-wrap mt-1', isRTL ? 'flex-row-reverse' : 'flex-row')}>
                        {q.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs py-0 px-1.5">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Meta */}
                    <div className={cn('flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap', isRTL ? 'flex-row-reverse' : 'flex-row')}>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {q.answer_count} {q.answer_count === 1 ? t.answer : t.answers}
                      </span>
                      <span>
                        {formatDistanceToNow(new Date(q.created_at), {
                          addSuffix: true,
                          locale: dateLocale,
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Expand toggle */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => setExpandedId(isExpanded ? null : q.id)}
                    aria-label={isExpanded ? 'collapse' : 'expand'}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Expanded: answers */}
                {isExpanded && (
                  <div className="mt-3 space-y-3 border-t pt-3">
                    {questionAnswers.length === 0 && !postAnswer.isPending && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        {isRTL ? 'אין תשובות עדיין' : 'No answers yet'}
                      </p>
                    )}

                    {questionAnswers.map((ans) => (
                      <div
                        key={ans.id}
                        className={cn(
                          'rounded-md p-3 text-sm space-y-2',
                          ans.is_accepted
                            ? 'bg-green-50 border border-green-200 dark:bg-green-950/20'
                            : 'bg-muted/40'
                        )}
                      >
                        <div className={cn('flex items-start gap-2', isRTL ? 'flex-row-reverse' : 'flex-row')}>
                          <VoteControls
                            voteableType="answer"
                            voteableId={ans.id}
                            voteCount={ans.vote_count}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{ans.body}</p>
                            <div className={cn('flex items-center gap-2 mt-1 text-xs text-muted-foreground', isRTL ? 'flex-row-reverse' : 'flex-row')}>
                              {ans.is_accepted && (
                                <span className="flex items-center gap-1 text-green-600 font-medium">
                                  <CheckCircle2 className="h-3 w-3" />
                                  {t.accepted}
                                </span>
                              )}
                              <span>
                                {formatDistanceToNow(new Date(ans.created_at), {
                                  addSuffix: true,
                                  locale: dateLocale,
                                })}
                              </span>
                              {canAccept && !ans.is_accepted && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-xs px-2"
                                  onClick={() =>
                                    acceptAnswer.mutate({
                                      answerId: ans.id,
                                      questionId: q.id,
                                      authorId: q.author_id,
                                    })
                                  }
                                  disabled={acceptAnswer.isPending}
                                >
                                  <CheckCircle2 className="h-3 w-3 me-1" />
                                  {t.accept}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Post answer form */}
                    {user && (
                      <div className="space-y-2 pt-1">
                        <Textarea
                          placeholder={t.writeAnswer}
                          rows={3}
                          value={newAnswers[q.id] ?? ''}
                          onChange={(e) =>
                            setNewAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                          }
                          dir={isRTL ? 'rtl' : 'ltr'}
                        />
                        <div className={cn('flex', isRTL ? 'justify-start' : 'justify-end')}>
                          <Button
                            size="sm"
                            onClick={() => postAnswer.mutate(q.id)}
                            disabled={postAnswer.isPending || !(newAnswers[q.id] ?? '').trim()}
                          >
                            {t.postAnswer}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
