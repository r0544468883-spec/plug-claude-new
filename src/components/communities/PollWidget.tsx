import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { BarChart3, Plus, X, Clock, Lock, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatDistanceToNow, isPast } from 'date-fns';
import { he, enUS } from 'date-fns/locale';

interface PollWidgetProps {
  hubId: string;
  channelId?: string;
  eventId?: string;
  isAdmin: boolean;
}

interface PollOption {
  text: string;
  text_he: string;
}

interface CreatePollForm {
  question: string;
  question_he: string;
  poll_type: 'single' | 'multiple';
  is_anonymous: boolean;
  ends_at: string;
  options: PollOption[];
}

const defaultForm = (): CreatePollForm => ({
  question: '',
  question_he: '',
  poll_type: 'single',
  is_anonymous: false,
  ends_at: '',
  options: [
    { text: '', text_he: '' },
    { text: '', text_he: '' },
  ],
});

export function PollWidget({ hubId, channelId, eventId, isAdmin }: PollWidgetProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const queryClient = useQueryClient();
  const locale = isRTL ? he : enUS;

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CreatePollForm>(defaultForm());

  // Build query key and filter
  const pollsQueryKey = ['community_polls', hubId, channelId, eventId];

  const { data: polls = [], isLoading } = useQuery({
    queryKey: pollsQueryKey,
    queryFn: async () => {
      let q = (supabase as any)
        .from('community_polls')
        .select(`
          id, question, question_he, poll_type, is_anonymous, ends_at, is_closed,
          created_at, created_by,
          community_poll_options ( id, text, text_he, display_order ),
          community_poll_votes ( id, option_id, user_id )
        `)
        .eq('hub_id', hubId)
        .order('created_at', { ascending: false });

      if (channelId) q = q.eq('channel_id', channelId);
      else if (eventId) q = q.eq('event_id', eventId);

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!hubId,
  });

  const createMutation = useMutation({
    mutationFn: async (f: CreatePollForm) => {
      const { data: poll, error: pollErr } = await (supabase as any)
        .from('community_polls')
        .insert({
          hub_id: hubId,
          channel_id: channelId ?? null,
          event_id: eventId ?? null,
          question: f.question,
          question_he: f.question_he || null,
          poll_type: f.poll_type,
          is_anonymous: f.is_anonymous,
          ends_at: f.ends_at || null,
          created_by: user?.id,
        })
        .select('id')
        .single();
      if (pollErr) throw pollErr;

      const optionRows = f.options
        .filter((o) => o.text.trim())
        .map((o, idx) => ({
          poll_id: poll.id,
          text: o.text,
          text_he: o.text_he || null,
          display_order: idx,
        }));

      const { error: optErr } = await (supabase as any)
        .from('community_poll_options')
        .insert(optionRows);
      if (optErr) throw optErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pollsQueryKey });
      setCreateOpen(false);
      setForm(defaultForm());
      toast.success(isRTL ? 'הסקר נוצר בהצלחה' : 'Poll created successfully');
    },
    onError: () => toast.error(isRTL ? 'שגיאה ביצירת הסקר' : 'Failed to create poll'),
  });

  const voteMutation = useMutation({
    mutationFn: async ({ pollId, optionId }: { pollId: string; optionId: string }) => {
      const { error } = await (supabase as any)
        .from('community_poll_votes')
        .insert({ poll_id: pollId, option_id: optionId, user_id: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pollsQueryKey });
      toast.success(isRTL ? 'הצבעתך נרשמה' : 'Vote recorded');
    },
    onError: () => toast.error(isRTL ? 'שגיאה בהצבעה' : 'Failed to vote'),
  });

  const closeMutation = useMutation({
    mutationFn: async (pollId: string) => {
      const { error } = await (supabase as any)
        .from('community_polls')
        .update({ is_closed: true })
        .eq('id', pollId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pollsQueryKey });
      toast.success(isRTL ? 'הסקר נסגר' : 'Poll closed');
    },
  });

  const handleAddOption = () => {
    if (form.options.length >= 6) return;
    setForm((f) => ({ ...f, options: [...f.options, { text: '', text_he: '' }] }));
  };

  const handleRemoveOption = (idx: number) => {
    if (form.options.length <= 2) return;
    setForm((f) => ({ ...f, options: f.options.filter((_, i) => i !== idx) }));
  };

  const handleOptionChange = (idx: number, field: keyof PollOption, value: string) => {
    setForm((f) => {
      const options = [...f.options];
      options[idx] = { ...options[idx], [field]: value };
      return { ...f, options };
    });
  };

  const handleSubmit = () => {
    if (!form.question.trim()) {
      toast.error(isRTL ? 'יש להזין שאלה' : 'Question is required');
      return;
    }
    if (form.options.filter((o) => o.text.trim()).length < 2) {
      toast.error(isRTL ? 'יש להזין לפחות 2 אפשרויות' : 'At least 2 options required');
      return;
    }
    createMutation.mutate(form);
  };

  return (
    <div className={cn('space-y-4', isRTL && 'text-right')} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className={cn('flex items-center justify-between')}>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          <span className="font-semibold text-sm">{isRTL ? 'סקרים' : 'Polls'}</span>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1">
              <Plus className="h-4 w-4" />
              {isRTL ? 'סקר חדש' : 'Create Poll'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg" dir={isRTL ? 'rtl' : 'ltr'}>
            <DialogHeader>
              <DialogTitle>{isRTL ? 'יצירת סקר חדש' : 'Create New Poll'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label>{isRTL ? 'שאלה (אנגלית)' : 'Question'}</Label>
                <Input
                  value={form.question}
                  onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
                  placeholder={isRTL ? 'שאלה באנגלית' : 'Enter your question'}
                />
              </div>
              <div className="space-y-1">
                <Label>{isRTL ? 'שאלה (עברית) — אופציונלי' : 'Question (Hebrew) — optional'}</Label>
                <Input
                  value={form.question_he}
                  onChange={(e) => setForm((f) => ({ ...f, question_he: e.target.value }))}
                  placeholder="שאלה בעברית"
                  dir="rtl"
                />
              </div>

              {/* Options */}
              <div className="space-y-2">
                <Label>{isRTL ? 'אפשרויות' : 'Options'}</Label>
                {form.options.map((opt, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input
                      value={opt.text}
                      onChange={(e) => handleOptionChange(idx, 'text', e.target.value)}
                      placeholder={isRTL ? `אפשרות ${idx + 1} (EN)` : `Option ${idx + 1}`}
                      className="flex-1"
                    />
                    <Input
                      value={opt.text_he}
                      onChange={(e) => handleOptionChange(idx, 'text_he', e.target.value)}
                      placeholder={`אפשרות ${idx + 1} (HE)`}
                      className="flex-1"
                      dir="rtl"
                    />
                    {form.options.length > 2 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveOption(idx)}
                        aria-label="Remove option"
                        className="shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {form.options.length < 6 && (
                  <Button variant="ghost" size="sm" onClick={handleAddOption} className="gap-1">
                    <Plus className="h-4 w-4" />
                    {isRTL ? 'הוסף אפשרות' : 'Add option'}
                  </Button>
                )}
              </div>

              {/* Settings row */}
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <Label htmlFor="poll-type">{isRTL ? 'בחירה מרובה' : 'Multiple choice'}</Label>
                  <Switch
                    id="poll-type"
                    checked={form.poll_type === 'multiple'}
                    onCheckedChange={(v) =>
                      setForm((f) => ({ ...f, poll_type: v ? 'multiple' : 'single' }))
                    }
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="poll-anon">{isRTL ? 'אנונימי' : 'Anonymous'}</Label>
                  <Switch
                    id="poll-anon"
                    checked={form.is_anonymous}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, is_anonymous: v }))}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>{isRTL ? 'סיום (אופציונלי)' : 'Ends at (optional)'}</Label>
                <Input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  {isRTL ? 'ביטול' : 'Cancel'}
                </Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-1" />}
                  {isRTL ? 'צור סקר' : 'Create Poll'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Poll list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin me-2" />
          {isRTL ? 'טוען סקרים...' : 'Loading polls...'}
        </div>
      ) : polls.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          {isRTL ? 'אין סקרים עדיין' : 'No polls yet'}
        </div>
      ) : (
        <div className="space-y-4">
          {polls.map((poll: any) => {
            const options: any[] = poll.community_poll_options ?? [];
            const votes: any[] = poll.community_poll_votes ?? [];
            const totalVotes = votes.length;
            const userVoteOptionIds = votes
              .filter((v: any) => v.user_id === user?.id)
              .map((v: any) => v.option_id);
            const hasVoted = userVoteOptionIds.length > 0;
            const ended = poll.ends_at ? isPast(new Date(poll.ends_at)) : false;
            const isClosed = poll.is_closed || ended;
            const showResults = hasVoted || isClosed;

            const question =
              isRTL && poll.question_he ? poll.question_he : poll.question;

            return (
              <Card key={poll.id} className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  {/* Poll header */}
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm leading-snug">{question}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      {poll.is_anonymous && (
                        <Badge variant="secondary" className="text-xs gap-1 px-1.5">
                          <Lock className="h-3 w-3" />
                          {isRTL ? 'אנונימי' : 'Anon'}
                        </Badge>
                      )}
                      {isClosed && (
                        <Badge variant="outline" className="text-xs gap-1 px-1.5">
                          <Lock className="h-3 w-3" />
                          {isRTL ? 'סגור' : 'Closed'}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Time remaining */}
                  {poll.ends_at && !isClosed && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {isRTL ? 'נסגר בעוד ' : 'Closes in '}
                      {formatDistanceToNow(new Date(poll.ends_at), { locale })}
                    </div>
                  )}

                  {/* Options */}
                  <div className="space-y-2">
                    {options
                      .sort((a: any, b: any) => a.display_order - b.display_order)
                      .map((opt: any) => {
                        const optionVoteCount = votes.filter(
                          (v: any) => v.option_id === opt.id
                        ).length;
                        const pct = totalVotes > 0 ? Math.round((optionVoteCount / totalVotes) * 100) : 0;
                        const isSelected = userVoteOptionIds.includes(opt.id);
                        const optLabel = isRTL && opt.text_he ? opt.text_he : opt.text;

                        if (showResults) {
                          return (
                            <div key={opt.id} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span
                                  className={cn(
                                    'flex items-center gap-1',
                                    isSelected && 'font-semibold text-primary'
                                  )}
                                >
                                  {isSelected && (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                                  )}
                                  {optLabel}
                                </span>
                                <span className="text-muted-foreground text-xs">
                                  {optionVoteCount} ({pct}%)
                                </span>
                              </div>
                              <Progress
                                value={pct}
                                className={cn(
                                  'h-2',
                                  isSelected && '[&>div]:bg-primary'
                                )}
                              />
                            </div>
                          );
                        }

                        return (
                          <button
                            key={opt.id}
                            onClick={() =>
                              voteMutation.mutate({ pollId: poll.id, optionId: opt.id })
                            }
                            disabled={voteMutation.isPending}
                            className={cn(
                              'w-full text-start text-sm px-3 py-2 rounded-md border',
                              'hover:bg-muted transition-colors focus-visible:outline-none',
                              'focus-visible:ring-2 focus-visible:ring-ring',
                              'disabled:opacity-50 disabled:cursor-not-allowed'
                            )}
                            aria-label={`Vote for ${optLabel}`}
                          >
                            {optLabel}
                          </button>
                        );
                      })}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-muted-foreground">
                      {totalVotes} {isRTL ? 'הצבעות' : 'votes'}
                    </span>
                    {!isClosed && (isAdmin || poll.created_by === user?.id) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7 px-2 text-destructive hover:text-destructive"
                        onClick={() => closeMutation.mutate(poll.id)}
                        disabled={closeMutation.isPending}
                      >
                        {isRTL ? 'סגור סקר' : 'Close poll'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
