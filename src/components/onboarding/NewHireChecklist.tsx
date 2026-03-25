import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Clock, AlertCircle, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const CATEGORY_LABELS: Record<string, string> = {
  legal: 'משפטי', info: 'מידע', tech: 'טכנולוגי', team: 'צוות', admin: 'אדמין',
};
const CATEGORY_COLORS: Record<string, string> = {
  legal: 'bg-red-500/20 text-red-400',
  info: 'bg-blue-500/20 text-blue-400',
  tech: 'bg-purple-500/20 text-purple-400',
  team: 'bg-green-500/20 text-green-400',
  admin: 'bg-yellow-500/20 text-yellow-400',
};

export function NewHireChecklist() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const queryClient = useQueryClient();
  const [showConfetti, setShowConfetti] = useState(false);

  const { data: instance } = useQuery({
    queryKey: ['onboarding-instance', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('onboarding_instances')
        .select('*, onboarding_templates(*)')
        .eq('new_hire_id', user.id)
        .eq('status', 'active')
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: progress = [] } = useQuery({
    queryKey: ['onboarding-progress', instance?.id],
    queryFn: async () => {
      if (!instance?.id) return [];
      const { data } = await supabase
        .from('onboarding_task_progress')
        .select('*')
        .eq('instance_id', instance.id);
      return data || [];
    },
    enabled: !!instance?.id,
  });

  const toggleTask = useMutation({
    mutationFn: async ({ taskIndex, isCompleted }: { taskIndex: number; isCompleted: boolean }) => {
      if (!instance?.id) return;
      const { error } = await supabase
        .from('onboarding_task_progress')
        .upsert({
          instance_id: instance.id,
          task_index: taskIndex,
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
        }, { onConflict: 'instance_id,task_index' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-progress'] });
    },
  });

  if (!instance) return null;

  const tasks: any[] = (instance as any)?.onboarding_templates?.tasks || [];
  const completedCount = progress.filter(p => p.is_completed).length;
  const totalCount = tasks.length;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const allDone = completedCount === totalCount && totalCount > 0;

  const isTaskCompleted = (index: number) =>
    progress.find(p => p.task_index === index)?.is_completed || false;

  const isOverdue = (dueDays: number) => {
    const startDate = new Date((instance as any).start_date);
    const deadline = new Date(startDate);
    deadline.setDate(deadline.getDate() + dueDays);
    return new Date() > deadline;
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {allDone ? (
              <PartyPopper className="w-5 h-5 text-primary" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-primary" />
            )}
            {isHebrew ? 'רשימת Onboarding' : 'Onboarding Checklist'}
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {completedCount}/{totalCount}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <Progress value={progressPct} className="h-2 flex-1" />
          <span className="text-sm font-medium text-muted-foreground">{Math.round(progressPct)}%</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {allDone && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-lg bg-primary/10 text-center mb-3"
          >
            <PartyPopper className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="font-medium text-primary">
              {isHebrew ? '🎉 סיימת את כל משימות ה-Onboarding!' : '🎉 All onboarding tasks completed!'}
            </p>
          </motion.div>
        )}

        {tasks.map((task: any, index: number) => {
          const completed = isTaskCompleted(index);
          const overdue = !completed && isOverdue(task.due_days);

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border transition-all',
                completed
                  ? 'bg-primary/5 border-primary/10 opacity-70'
                  : overdue
                  ? 'bg-destructive/5 border-destructive/20'
                  : 'bg-card border-border hover:border-primary/30'
              )}
            >
              <Checkbox
                checked={completed}
                onCheckedChange={(v) => toggleTask.mutate({ taskIndex: index, isCompleted: !!v })}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={cn('text-sm font-medium', completed && 'line-through text-muted-foreground')}>
                    {task.title}
                  </p>
                  <Badge className={cn('text-xs px-1.5 py-0', CATEGORY_COLORS[task.category])}>
                    {CATEGORY_LABELS[task.category] || task.category}
                  </Badge>
                  {overdue && (
                    <Badge className="text-xs px-1.5 py-0 bg-destructive/20 text-destructive">
                      <AlertCircle className="w-2.5 h-2.5 me-0.5" />
                      {isHebrew ? 'באיחור' : 'Overdue'}
                    </Badge>
                  )}
                </div>
                {task.description && !completed && (
                  <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {isHebrew ? `עד יום ${task.due_days}` : `Due day ${task.due_days}`}
                </p>
              </div>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
