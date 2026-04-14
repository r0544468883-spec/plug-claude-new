import { useState } from 'react';
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
  status: string;
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

async function callGenerateBatch(triggerType: string): Promise<BatchResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await supabase.functions.invoke('generate-match-batch', {
    body: { trigger_type: triggerType },
  });

  if (res.error) throw res.error;
  return res.data as BatchResponse;
}

export function useJobSwipeBatch() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [batchData, setBatchData] = useState<BatchResponse | null>(null);

  // Generate batch (weekly_free or on_demand)
  const generateBatch = useMutation({
    mutationFn: async (triggerType: string = 'weekly_free') => {
      return callGenerateBatch(triggerType);
    },
    onSuccess: (data) => {
      setBatchData(data);
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
      setBatchData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          jobs: prev.jobs.map(j => j.id === jobId ? { ...j, acted: true } : j),
        };
      });
    },
  });

  const jobs = batchData?.jobs || [];
  const remainingCards = jobs.filter(j => !j.acted);
  const hasFreeBatchThisWeek = batchData?.is_cached === true;

  return {
    batchId: batchData?.batch_id ?? null,
    jobs,
    remainingCards,
    isLoading: false,
    error: generateBatch.error,
    hasFreeBatchThisWeek,
    generateBatch: generateBatch.mutateAsync,
    isGenerating: generateBatch.isPending,
    recordAction: recordAction.mutateAsync,
  };
}
