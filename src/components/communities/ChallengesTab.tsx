import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Plus, Trophy, Users, Calendar, ChevronDown, ChevronUp,
  Loader2, Target, CheckCircle2, Circle, Medal, Trash2, Flame, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isPast, isFuture, isWithinInterval } from 'date-fns';
import { he, enUS } from 'date-fns/locale';

interface ChallengesTabProps {
  hubId: string;
  isAdmin: boolean;
}

const CHALLENGE_TYPES = ['daily', 'weekly', 'monthly'] as const;
type ChallengeType = typeof CHALLENGE_TYPES[number];

const TYPE_LABELS: Record<ChallengeType, { en: string; he: string }> = {
  daily: { en: 'Daily', he: 'יומי' },
  weekly: { en: 'Weekly', he: 'שבועי' },
  monthly: { en: 'Monthly', he: 'חודשי' },
};

const TYPE_COLORS: Record<ChallengeType, string> = {
  daily: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  weekly: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  monthly: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

interface TaskDraft {
  title: string;
  description: string;
  points: number;
  day_number: number;
}

export function ChallengesTab({ hubId, isAdmin }: ChallengesTabProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHe = language === 'he';
  const queryClient = useQueryClient();
  const dateLocale = isHe ? he : enUS;

  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Create form state
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formType, setFormType] = useState<ChallengeType>('weekly');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formPrize, setFormPrize] = useState('');
  const [formMaxParticipants, setFormMaxParticipants] = useState('');
  const [formTeamSize, setFormTeamSize] = useState('0');
  const [formTasks, setFormTasks] = useState<TaskDraft[]>([]);
  const [creating, setCreating] = useState(false);

  // ---- Queries ----

  const { data: challenges = [], isLoading } = useQuery({
    queryKey: ['challenges', hubId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('challenges')
        .select('*')
        .eq('hub_id', hubId)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ['challenge-tasks', hubId],
    queryFn: async () => {
      const challengeIds = challenges.map((c: any) => c.id);
      if (challengeIds.length === 0) return [];
      const { data, error } = await (supabase as any)
        .from('challenge_tasks')
        .select('*')
        .in('challenge_id', challengeIds)
        .order('day_number', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: challenges.length > 0,
  });

  const { data: myParticipations = [] } = useQuery({
    queryKey: ['challenge-participations', user?.id, hubId],
    queryFn: async () => {
      if (!user?.id) return [];
      const challengeIds = challenges.map((c: any) => c.id);
      if (challengeIds.length === 0) return [];
      const { data } = await (supabase as any)
        .from('challenge_participants')
        .select('*')
        .eq('user_id', user.id)
        .in('challenge_id', challengeIds);
      return data || [];
    },
    enabled: !!user?.id && challenges.length > 0,
  });

  const { data: myCompletions = [] } = useQuery({
    queryKey: ['challenge-completions', user?.id, hubId],
    queryFn: async () => {
      if (!user?.id) return [];
      const taskIds = allTasks.map((t: any) => t.id);
      if (taskIds.length === 0) return [];
      const { data } = await (supabase as any)
        .from('challenge_task_completions')
        .select('*')
        .eq('user_id', user.id)
        .in('task_id', taskIds);
      return data || [];
    },
    enabled: !!user?.id && allTasks.length > 0,
  });

  const { data: allParticipants = [] } = useQuery({
    queryKey: ['all-challenge-participants', hubId],
    queryFn: async () => {
      const challengeIds = challenges.map((c: any) => c.id);
      if (challengeIds.length === 0) return [];
      const { data } = await (supabase as any)
        .from('challenge_participants')
        .select('*, profiles:user_id(full_name, avatar_url)')
        .in('challenge_id', challengeIds)
        .order('points', { ascending: false });
      return data || [];
    },
    enabled: challenges.length > 0,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['challenge-teams', hubId],
    queryFn: async () => {
      const challengeIds = challenges.map((c: any) => c.id);
      if (challengeIds.length === 0) return [];
      const { data } = await (supabase as any)
        .from('challenge_teams')
        .select('*')
        .in('challenge_id', challengeIds);
      return data || [];
    },
    enabled: challenges.length > 0,
  });

  // ---- Derived data ----
  const joinedChallengeIds = new Set(myParticipations.map((p: any) => p.challenge_id));
  const completedTaskIds = new Set(myCompletions.map((c: any) => c.task_id));

  const getTasksForChallenge = (challengeId: string) =>
    allTasks.filter((t: any) => t.challenge_id === challengeId);

  const getParticipantCount = (challengeId: string) =>
    allParticipants.filter((p: any) => p.challenge_id === challengeId).length;

  const getLeaderboard = (challengeId: string) =>
    allParticipants
      .filter((p: any) => p.challenge_id === challengeId)
      .sort((a: any, b: any) => (b.points || 0) - (a.points || 0))
      .slice(0, 10);

  const getChallengeStatus = (c: any) => {
    const now = new Date();
    const start = new Date(c.start_date);
    const end = new Date(c.end_date);
    if (isFuture(start)) return 'upcoming';
    if (isPast(end)) return 'ended';
    return 'active';
  };

  // Sort: active first, then upcoming, then ended
  const sortedChallenges = [...challenges].sort((a: any, b: any) => {
    const statusOrder = { active: 0, upcoming: 1, ended: 2 };
    const sa = statusOrder[getChallengeStatus(a) as keyof typeof statusOrder];
    const sb = statusOrder[getChallengeStatus(b) as keyof typeof statusOrder];
    return sa - sb;
  });

  // ---- Mutations ----

  const joinMutation = useMutation({
    mutationFn: async (challengeId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await (supabase as any)
        .from('challenge_participants')
        .insert({ challenge_id: challengeId, user_id: user.id, points: 0 });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenge-participations'] });
      queryClient.invalidateQueries({ queryKey: ['all-challenge-participants'] });
      toast.success(isHe ? 'הצטרפת לאתגר!' : 'Joined the challenge!');
    },
    onError: () => toast.error(isHe ? 'שגיאה בהצטרפות' : 'Failed to join'),
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) => {
      if (!user?.id) throw new Error('Not authenticated');
      if (completed) {
        // Mark complete
        const task = allTasks.find((t: any) => t.id === taskId);
        const { error } = await (supabase as any)
          .from('challenge_task_completions')
          .insert({ task_id: taskId, user_id: user.id });
        if (error) throw error;
        // Update participant points
        if (task) {
          const participation = myParticipations.find((p: any) => p.challenge_id === task.challenge_id);
          if (participation) {
            await (supabase as any)
              .from('challenge_participants')
              .update({ points: (participation.points || 0) + (task.points || 0) })
              .eq('id', participation.id);
          }
        }
      } else {
        // Unmark
        const task = allTasks.find((t: any) => t.id === taskId);
        await (supabase as any)
          .from('challenge_task_completions')
          .delete()
          .eq('task_id', taskId)
          .eq('user_id', user.id);
        // Subtract points
        if (task) {
          const participation = myParticipations.find((p: any) => p.challenge_id === task.challenge_id);
          if (participation) {
            await (supabase as any)
              .from('challenge_participants')
              .update({ points: Math.max(0, (participation.points || 0) - (task.points || 0)) })
              .eq('id', participation.id);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenge-completions'] });
      queryClient.invalidateQueries({ queryKey: ['challenge-participations'] });
      queryClient.invalidateQueries({ queryKey: ['all-challenge-participants'] });
    },
    onError: () => toast.error(isHe ? 'שגיאה בעדכון משימה' : 'Failed to update task'),
  });

  // ---- Create challenge ----

  const addTaskDraft = () => {
    setFormTasks(prev => [...prev, { title: '', description: '', points: 10, day_number: prev.length + 1 }]);
  };

  const updateTaskDraft = (index: number, field: keyof TaskDraft, value: string | number) => {
    setFormTasks(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t));
  };

  const removeTaskDraft = (index: number) => {
    setFormTasks(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!formTitle || !formStart || !formEnd || !user?.id) return;
    setCreating(true);
    try {
      const { data: challenge, error } = await (supabase as any)
        .from('challenges')
        .insert({
          hub_id: hubId,
          title: formTitle,
          description: formDesc,
          type: formType,
          start_date: formStart,
          end_date: formEnd,
          prize_description: formPrize || null,
          max_participants: formMaxParticipants ? parseInt(formMaxParticipants) : null,
          team_size: parseInt(formTeamSize) || 0,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;

      // Insert tasks
      if (formTasks.length > 0 && challenge) {
        const tasksToInsert = formTasks.map(t => ({
          challenge_id: challenge.id,
          title: t.title,
          description: t.description,
          points: t.points,
          day_number: t.day_number,
        }));
        const { error: taskErr } = await (supabase as any)
          .from('challenge_tasks')
          .insert(tasksToInsert);
        if (taskErr) throw taskErr;
      }

      toast.success(isHe ? 'האתגר נוצר בהצלחה!' : 'Challenge created!');
      queryClient.invalidateQueries({ queryKey: ['challenges', hubId] });
      queryClient.invalidateQueries({ queryKey: ['challenge-tasks', hubId] });
      setShowCreate(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || (isHe ? 'שגיאה ביצירת אתגר' : 'Failed to create challenge'));
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setFormTitle('');
    setFormDesc('');
    setFormType('weekly');
    setFormStart('');
    setFormEnd('');
    setFormPrize('');
    setFormMaxParticipants('');
    setFormTeamSize('0');
    setFormTasks([]);
  };

  // ---- Status badge ----
  const StatusBadge = ({ status }: { status: string }) => {
    const config = {
      active: { label: isHe ? 'פעיל' : 'Active', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
      upcoming: { label: isHe ? 'בקרוב' : 'Upcoming', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
      ended: { label: isHe ? 'הסתיים' : 'Ended', className: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' },
    }[status] || { label: status, className: '' };
    return <Badge className={cn('text-xs', config.className)}>{config.label}</Badge>;
  };

  // ---- Render ----

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          {isHe ? 'אתגרים' : 'Challenges'}
        </h2>
        {isAdmin && (
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" />
                {isHe ? 'צור אתגר' : 'Create Challenge'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{isHe ? 'אתגר חדש' : 'New Challenge'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label>{isHe ? 'כותרת' : 'Title'}</Label>
                  <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} />
                </div>
                <div>
                  <Label>{isHe ? 'תיאור' : 'Description'}</Label>
                  <Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={3} />
                </div>
                <div>
                  <Label>{isHe ? 'סוג' : 'Type'}</Label>
                  <Select value={formType} onValueChange={(v) => setFormType(v as ChallengeType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHALLENGE_TYPES.map(t => (
                        <SelectItem key={t} value={t}>
                          {isHe ? TYPE_LABELS[t].he : TYPE_LABELS[t].en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{isHe ? 'תאריך התחלה' : 'Start Date'}</Label>
                    <Input type="date" value={formStart} onChange={e => setFormStart(e.target.value)} />
                  </div>
                  <div>
                    <Label>{isHe ? 'תאריך סיום' : 'End Date'}</Label>
                    <Input type="date" value={formEnd} onChange={e => setFormEnd(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>{isHe ? 'תיאור פרס' : 'Prize Description'}</Label>
                  <Input value={formPrize} onChange={e => setFormPrize(e.target.value)} placeholder={isHe ? 'אופציונלי' : 'Optional'} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{isHe ? 'מקסימום משתתפים' : 'Max Participants'}</Label>
                    <Input type="number" min="0" value={formMaxParticipants} onChange={e => setFormMaxParticipants(e.target.value)} placeholder={isHe ? 'ללא הגבלה' : 'Unlimited'} />
                  </div>
                  <div>
                    <Label>{isHe ? 'גודל קבוצה (0 = ללא)' : 'Team Size (0 = no teams)'}</Label>
                    <Input type="number" min="0" value={formTeamSize} onChange={e => setFormTeamSize(e.target.value)} />
                  </div>
                </div>

                {/* Task Builder */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">{isHe ? 'משימות' : 'Tasks'}</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addTaskDraft} className="gap-1">
                      <Plus className="w-3.5 h-3.5" />
                      {isHe ? 'הוסף משימה' : 'Add Task'}
                    </Button>
                  </div>
                  {formTasks.map((task, idx) => (
                    <Card key={idx} className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          {isHe ? `משימה ${idx + 1}` : `Task ${idx + 1}`}
                        </span>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeTaskDraft(idx)}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                      <Input
                        placeholder={isHe ? 'כותרת משימה' : 'Task title'}
                        value={task.title}
                        onChange={e => updateTaskDraft(idx, 'title', e.target.value)}
                      />
                      <Input
                        placeholder={isHe ? 'תיאור' : 'Description'}
                        value={task.description}
                        onChange={e => updateTaskDraft(idx, 'description', e.target.value)}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">{isHe ? 'נקודות' : 'Points'}</Label>
                          <Input type="number" min="1" value={task.points} onChange={e => updateTaskDraft(idx, 'points', parseInt(e.target.value) || 0)} />
                        </div>
                        <div>
                          <Label className="text-xs">{isHe ? 'יום מספר' : 'Day #'}</Label>
                          <Input type="number" min="1" value={task.day_number} onChange={e => updateTaskDraft(idx, 'day_number', parseInt(e.target.value) || 1)} />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <Button onClick={handleCreate} disabled={creating || !formTitle || !formStart || !formEnd} className="w-full gap-2">
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isHe ? 'צור אתגר' : 'Create Challenge'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Empty state */}
      {sortedChallenges.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Target className="w-12 h-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-medium">
              {isHe ? 'אין אתגרים עדיין' : 'No challenges yet'}
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {isHe ? 'אתגרים יופיעו כאן' : 'Challenges will appear here'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Challenge list */}
      {sortedChallenges.map((challenge: any) => {
        const status = getChallengeStatus(challenge);
        const tasks = getTasksForChallenge(challenge.id);
        const participantCount = getParticipantCount(challenge.id);
        const isJoined = joinedChallengeIds.has(challenge.id);
        const isExpanded = expandedId === challenge.id;
        const completedCount = tasks.filter((t: any) => completedTaskIds.has(t.id)).length;
        const totalPoints = tasks.reduce((sum: number, t: any) => sum + (t.points || 0), 0);
        const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
        const leaderboard = getLeaderboard(challenge.id);
        const challengeTeams = teams.filter((t: any) => t.challenge_id === challenge.id);
        const hasTeams = (challenge.team_size || 0) > 0;
        const typeLabel = challenge.type && TYPE_LABELS[challenge.type as ChallengeType]
          ? (isHe ? TYPE_LABELS[challenge.type as ChallengeType].he : TYPE_LABELS[challenge.type as ChallengeType].en)
          : '';

        return (
          <Card
            key={challenge.id}
            className={cn(
              'transition-shadow hover:shadow-md',
              status === 'ended' && 'opacity-70',
            )}
          >
            {/* Card Header - always visible */}
            <button
              className="w-full text-start p-4 focus:outline-none"
              onClick={() => setExpandedId(isExpanded ? null : challenge.id)}
              aria-expanded={isExpanded}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-base">{challenge.title}</h3>
                    <StatusBadge status={status} />
                    {typeLabel && (
                      <Badge className={cn('text-xs', TYPE_COLORS[challenge.type as ChallengeType] || '')}>
                        {typeLabel}
                      </Badge>
                    )}
                    {hasTeams && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Users className="w-3 h-3" />
                        {isHe ? `קבוצות (${challenge.team_size})` : `Teams (${challenge.team_size})`}
                      </Badge>
                    )}
                  </div>

                  {challenge.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{challenge.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {format(new Date(challenge.start_date), 'dd MMM', { locale: dateLocale })} - {format(new Date(challenge.end_date), 'dd MMM yyyy', { locale: dateLocale })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {participantCount}{challenge.max_participants ? `/${challenge.max_participants}` : ''} {isHe ? 'משתתפים' : 'participants'}
                    </span>
                    {challenge.prize_description && (
                      <span className="flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                        {challenge.prize_description}
                      </span>
                    )}
                  </div>

                  {/* Progress bar for joined users */}
                  {isJoined && tasks.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {completedCount}/{tasks.length} {isHe ? 'משימות' : 'tasks'}
                        </span>
                        <span className="font-medium">{progressPct}%</span>
                      </div>
                      <Progress value={progressPct} className="h-2" />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-1">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <CardContent className="pt-0 pb-4 space-y-4 border-t">
                {/* Join button */}
                {!isJoined && status !== 'ended' && (
                  <div className="pt-3">
                    <Button
                      onClick={(e) => { e.stopPropagation(); joinMutation.mutate(challenge.id); }}
                      disabled={joinMutation.isPending || (challenge.max_participants && participantCount >= challenge.max_participants)}
                      className="gap-1.5"
                    >
                      {joinMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
                      {isHe ? 'הצטרף לאתגר' : 'Join Challenge'}
                    </Button>
                  </div>
                )}

                {/* Task list */}
                {tasks.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      {isHe ? 'משימות' : 'Tasks'}
                    </h4>
                    {tasks.map((task: any) => {
                      const isDone = completedTaskIds.has(task.id);
                      return (
                        <div
                          key={task.id}
                          className={cn(
                            'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                            isDone ? 'bg-green-50/50 border-green-200 dark:bg-green-900/10 dark:border-green-800' : 'hover:bg-muted/30',
                          )}
                        >
                          {isJoined && status === 'active' ? (
                            <button
                              className="mt-0.5 shrink-0"
                              onClick={() => toggleTaskMutation.mutate({ taskId: task.id, completed: !isDone })}
                              disabled={toggleTaskMutation.isPending}
                              aria-label={isDone ? 'Unmark task' : 'Mark task complete'}
                            >
                              {isDone ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                              ) : (
                                <Circle className="w-5 h-5 text-muted-foreground/50 hover:text-primary" />
                              )}
                            </button>
                          ) : (
                            <div className="mt-0.5 shrink-0">
                              {isDone ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                              ) : (
                                <Circle className="w-5 h-5 text-muted-foreground/30" />
                              )}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={cn('text-sm font-medium', isDone && 'line-through text-muted-foreground')}>
                                {task.title}
                              </span>
                              <Badge variant="outline" className="text-xs shrink-0">
                                {task.points} {isHe ? 'נק\'' : 'pts'}
                              </Badge>
                              {task.day_number && (
                                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                  <Clock className="w-3 h-3" />
                                  {isHe ? `יום ${task.day_number}` : `Day ${task.day_number}`}
                                </span>
                              )}
                            </div>
                            {task.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Teams */}
                {hasTeams && challengeTeams.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      {isHe ? 'קבוצות' : 'Teams'}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {challengeTeams.map((team: any) => (
                        <Card key={team.id} className="p-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{team.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {team.member_count || 0}/{challenge.team_size}
                            </Badge>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Leaderboard */}
                {leaderboard.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      {isHe ? 'טבלת מובילים' : 'Leaderboard'}
                    </h4>
                    <div className="space-y-1">
                      {leaderboard.map((p: any, idx: number) => {
                        const name = p.profiles?.full_name || (isHe ? 'משתמש' : 'User');
                        const medalColors = ['text-yellow-500', 'text-gray-400', 'text-amber-600'];
                        return (
                          <div
                            key={p.id}
                            className={cn(
                              'flex items-center gap-3 p-2 rounded-lg',
                              idx < 3 && 'bg-muted/30',
                            )}
                          >
                            <span className="w-6 text-center shrink-0">
                              {idx < 3 ? (
                                <Medal className={cn('w-4 h-4 mx-auto', medalColors[idx])} />
                              ) : (
                                <span className="text-xs text-muted-foreground font-medium">{idx + 1}</span>
                              )}
                            </span>
                            {p.profiles?.avatar_url ? (
                              <img src={p.profiles.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="text-[10px] font-bold text-primary">{name.charAt(0)}</span>
                              </div>
                            )}
                            <span className="text-sm flex-1 truncate">{name}</span>
                            <span className="text-sm font-semibold text-primary">{p.points || 0} {isHe ? 'נק\'' : 'pts'}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
