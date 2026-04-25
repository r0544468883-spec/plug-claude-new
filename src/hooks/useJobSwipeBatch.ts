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
  field_id: string | null;
  category: string | null;
  company_name: string | null;
  source_url: string | null;
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

      // If applying, also create a real application record
      if (action === 'apply') {
        await (supabase as any)
          .from('applications')
          .insert({
            job_id: jobId,
            candidate_id: user.id,
            apply_method: 'swipe',
            status: 'active',
            current_stage: 'applied',
          });
      }

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

  // Load job filter preferences from profile
  const { data: filterPrefs } = useQuery({
    queryKey: ['job-filter-prefs', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('blocked_companies, max_job_age_days')
        .eq('user_id', user.id)
        .single();
      return data as any;
    },
    enabled: !!user?.id,
  });

  const blockedCompanies: string[] = (filterPrefs?.blocked_companies || []).map((c: string) => c.toLowerCase());
  const maxAgeDays: number = filterPrefs?.max_job_age_days ?? 90;

  const allJobs = batchData?.jobs || [];

  // Apply filters
  const jobs = allJobs.filter((j) => {
    // Blocked companies
    if (blockedCompanies.length > 0 && j.company_name) {
      if (blockedCompanies.includes(j.company_name.toLowerCase())) return false;
    }
    // Age filter
    if (maxAgeDays > 0 && j.created_at) {
      const ageMs = Date.now() - new Date(j.created_at).getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      if (ageDays > maxAgeDays) return false;
    }
    return true;
  });

  const hiddenCount = allJobs.length - jobs.length;
  const remainingCards = jobs.filter(j => !j.acted);
  const hasFreeBatchThisWeek = batchData?.is_cached === true;

  return {
    batchId: batchData?.batch_id ?? null,
    jobs,
    remainingCards,
    hiddenCount,
    isLoading: false,
    error: generateBatch.error,
    hasFreeBatchThisWeek,
    generateBatch: generateBatch.mutateAsync,
    isGenerating: generateBatch.isPending,
    recordAction: recordAction.mutateAsync,
  };
}
