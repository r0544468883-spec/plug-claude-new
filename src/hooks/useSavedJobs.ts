import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useSavedJobs() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['saved-jobs', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('saved_jobs')
        .select('job_id')
        .eq('user_id', user.id);

      if (error) throw error;
      return data.map(item => item.job_id);
    },
    enabled: !!user,
  });
}

export function useSaveJobMutation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId, isSaved }: { jobId: string; isSaved: boolean }) => {
      if (!user) throw new Error('Not authenticated');

      if (isSaved) {
        // Unsave
        const { error } = await supabase
          .from('saved_jobs')
          .delete()
          .eq('user_id', user.id)
          .eq('job_id', jobId);

        if (error) throw error;
      } else {
        // Save
        const { error } = await supabase
          .from('saved_jobs')
          .insert({
            user_id: user.id,
            job_id: jobId,
          });

        if (error) throw error;
      }
    },
    onSuccess: (_, { isSaved }) => {
      queryClient.invalidateQueries({ queryKey: ['saved-jobs'] });
      toast.success(isSaved ? 'Job unsaved' : 'Job saved!');
    },
    onError: () => {
      toast.error('Failed to update saved jobs');
    },
  });
}
