import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SwipeJob {
  id: string;
  title: string;
  description: string | null;
  requirements: string | null;
  location: string | null;
  salary_range: string | null;
  job_type: string | null;
  field: string | null;
  is_active: boolean;
  created_at: string;
  match_score: number;
  recommendation: string;
  acted: boolean;
}

interface BatchResponse {
  batch_id: string | null;
  jobs: SwipeJob[];
  is_cached?: boolean;
  message?: string;
  error?: string;
  required?: number;
  balance?: number;
}

export function useJobSwipeBatch() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch current batch (weekly free)
  const {
    data: batchData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['job-swipe-batch', user?.id],
    queryFn: async (): Promise<BatchResponse> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await supabase.functions.invoke('generate-match-batch', {
        body: { trigger_type: 'weekly_free' },
      });

      if (res.error) throw res.error;
      return res.data as BatchResponse;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 min
    refetchOnWindowFocus: false,
  });

  // Generate on-demand batch (costs credits)
  const generateOnDemand = useMutation({
    mutationFn: async (): Promise<BatchResponse> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await supabase.functions.invoke('generate-match-batch', {
        body: { trigger_type: 'on_demand' },
      });

      if (res.error) throw res.error;
      return res.data as BatchResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-swipe-batch'] });
    },
  });

  // Record swipe action
  const recordAction = useMutation({
    mutationFn: async ({ jobId, action }: { jobId: string; action: 'apply' | 'skip' | 'save' }) => {
      if (!batchData?.batch_id || !user) throw new Error('No batch or user');

      const { error } = await (supabase as any)
        .from('job_swipe_actions')
        .insert({
          batch_id: batchData.batch_id,
          user_id: user.id,
          job_id: jobId,
          action,
        });

      if (error) throw error;
      return { jobId, action };
    },
    onSuccess: ({ jobId }) => {
      // Update local cache to mark job as acted
      queryClient.setQueryData(['job-swipe-batch', user?.id], (old: BatchResponse | undefined) => {
        if (!old) return old;
        return {
          ...old,
          jobs: old.jobs.map(j => j.id === jobId ? { ...j, acted: true } : j),
        };
      });
    },
  });

  const jobs = batchData?.jobs || [];
  const remainingCards = jobs.filter(j => !j.acted);
  const hasFreeBatchThisWeek = batchData?.is_cached === true || (batchData?.batch_id != null);

  return {
    batchId: batchData?.batch_id ?? null,
    jobs,
    remainingCards,
    isLoading,
    error,
    hasFreeBatchThisWeek,
    generateOnDemand: generateOnDemand.mutateAsync,
    isGenerating: generateOnDemand.isPending,
    recordAction: recordAction.mutateAsync,
    refetch,
  };
}
