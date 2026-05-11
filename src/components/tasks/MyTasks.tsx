import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ClipboardCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Inbox,
  Calendar,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const priorityConfig: Record<string, { labelHe: string; labelEn: string; color: string }> = {
  low:    { labelHe: 'נמוכה', labelEn: 'Low',    color: 'bg-muted text-muted-foreground' },
  medium: { labelHe: 'רגילה', labelEn: 'Medium', color: 'bg-blue-500/10 text-blue-500' },
  high:   { labelHe: 'גבוהה', labelEn: 'High',   color: 'bg-amber-500/10 text-amber-500' },
  urgent: { labelHe: 'דחוף',  labelEn: 'Urgent', color: 'bg-destructive/10 text-destructive' },
};

export function MyTasks() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const queryClient = useQueryClient();
  const [completing, setCompleting] = useState<string | null>(null);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['my-candidate-tasks', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('candidate_tasks')
        .select('*, jobs(title, company:companies(name))')
        .eq('candidate_id', user!.id)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const handleComplete = async (taskId: string) => {
    setCompleting(taskId);
    try {
      const { error } = await (supabase as any)
        .from('candidate_tasks')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', taskId);

      if (error) throw error;

      toast.success(isHebrew ? 'המטלה סומנה כהושלמה!' : 'Task marked as completed!');
      queryClient.invalidateQueries({ queryKey: ['my-candidate-tasks'] });
    } catch (e: any) {
      toast.error(e.message || (isHebrew ? 'שגיאה' : 'Error'));
    } finally {
      setCompleting(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center" dir={isHebrew ? 'rtl' : 'ltr'}>
        <Inbox className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-semibold mb-1">
          {isHebrew ? 'אין בקשות' : 'No Requests'}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {isHebrew
            ? 'כשמגייס ישלח לך בקשה, היא תופיע כאן.'
            : 'When a recruiter sends you a request, it will appear here.'}
        </p>
      </div>
    );
  }

  const pending = tasks.filter((t: any) => t.status !== 'completed');
  const completed = tasks.filter((t: any) => t.status === 'completed');

  return (
    <div className="space-y-6" dir={isHebrew ? 'rtl' : 'ltr'}>
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <ClipboardCheck className="w-5 h-5 text-primary" />
        {isHebrew ? 'בקשות ממגייסים' : 'Recruiter Requests'}
        {pending.length > 0 && (
          <Badge className="bg-primary/10 text-primary">
            {pending.length} {isHebrew ? 'פתוחות' : 'pending'}
          </Badge>
        )}
      </h2>

      {/* Pending */}
      {pending.length > 0 && (
        <div className="space-y-3">
          {pending.map((task: any) => {
            const pri = priorityConfig[task.priority] || priorityConfig.medium;
            const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
            const job = task.jobs;

            return (
              <Card key={task.id} className={cn('border transition-colors', isOverdue ? 'border-destructive/30 bg-destructive/5' : 'border-primary/20 bg-primary/5')}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{task.title}</p>
                      {job && (
                        <p className="text-sm text-muted-foreground">
                          {job.title}{job.company?.name ? ` — ${job.company.name}` : ''}
                        </p>
                      )}
                    </div>
                    <Badge className={cn('shrink-0', pri.color)}>{isHebrew ? pri.labelHe : pri.labelEn}</Badge>
                  </div>

                  {task.description && (
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {task.due_date && (
                      <span className={cn('flex items-center gap-1', isOverdue && 'text-destructive font-medium')}>
                        {isOverdue ? <AlertTriangle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                        {isHebrew ? 'יעד: ' : 'Due: '}
                        {format(new Date(task.due_date), 'PP', { locale: isHebrew ? he : enUS })}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(task.created_at), 'PP', { locale: isHebrew ? he : enUS })}
                    </span>
                  </div>

                  <Button
                    size="sm"
                    className="gap-2"
                    disabled={completing === task.id}
                    onClick={() => handleComplete(task.id)}
                  >
                    {completing === task.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    {isHebrew ? 'סמן כהושלם' : 'Mark Complete'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            {isHebrew ? 'הושלמו' : 'Completed'}
          </h3>
          {completed.map((task: any) => (
            <Card key={task.id} className="border-border bg-muted/30">
              <CardContent className="p-3 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm line-through opacity-60">{task.title}</p>
                  {task.jobs && (
                    <p className="text-xs text-muted-foreground">{task.jobs.title}</p>
                  )}
                </div>
                {task.completed_at && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {format(new Date(task.completed_at), 'PP', { locale: isHebrew ? he : enUS })}
                  </span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
