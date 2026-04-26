import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ActivityActionType =
  | 'apply'
  | 'stage_change'
  | 'save_job'
  | 'view_job'
  | 'generate_match'
  | 'interview_prep'
  | 'resume_enhance'
  | 'rejection_noted';

export interface WeeklyStats {
  totalActions: number;
  applies: number;
  stageChanges: number;
  matchesGenerated: number;
  interviewPreps: number;
  byDay: { date: string; count: number }[];
  bestStreak: number;
}

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // Sunday
  return d.toISOString();
}

export function useActivityLog() {
  const { user } = useAuth();

  const logActivity = useCallback(async (
    actionType: ActivityActionType,
    extra?: { jobId?: string; applicationId?: string; metadata?: Record<string, any> }
  ) => {
    if (!user) return;
    try {
      await (supabase as any).from('activity_log').insert({
        user_id: user.id,
        action_type: actionType,
        job_id: extra?.jobId ?? null,
        application_id: extra?.applicationId ?? null,
        metadata: extra?.metadata ?? {},
      });
    } catch {
      // Non-critical — silently ignore
    }
  }, [user]);

  const { data: weeklyStats } = useQuery<WeeklyStats>({
    queryKey: ['activity-weekly', user?.id],
    queryFn: async () => {
      if (!user) return defaultStats();
      const weekStart = getWeekStart();
      const { data } = await (supabase as any)
        .from('activity_log')
        .select('action_type, created_at')
        .eq('user_id', user.id)
        .gte('created_at', weekStart)
        .order('created_at', { ascending: true });

      const rows = (data || []) as { action_type: string; created_at: string }[];

      const byDayMap: Record<string, number> = {};
      rows.forEach(r => {
        const day = r.created_at.slice(0, 10);
        byDayMap[day] = (byDayMap[day] || 0) + 1;
      });

      return {
        totalActions: rows.length,
        applies: rows.filter(r => r.action_type === 'apply').length,
        stageChanges: rows.filter(r => r.action_type === 'stage_change').length,
        matchesGenerated: rows.filter(r => r.action_type === 'generate_match').length,
        interviewPreps: rows.filter(r => r.action_type === 'interview_prep').length,
        byDay: Object.entries(byDayMap).map(([date, count]) => ({ date, count })),
        bestStreak: calcStreak(byDayMap),
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  return { logActivity, weeklyStats: weeklyStats ?? defaultStats() };
}

function defaultStats(): WeeklyStats {
  return { totalActions: 0, applies: 0, stageChanges: 0, matchesGenerated: 0, interviewPreps: 0, byDay: [], bestStreak: 0 };
}

function calcStreak(byDay: Record<string, number>): number {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (byDay[d.toISOString().slice(0, 10)]) streak++;
    else break;
  }
  return streak;
}
