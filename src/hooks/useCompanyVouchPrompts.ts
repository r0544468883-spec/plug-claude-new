import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { differenceInDays } from 'date-fns';

interface Application {
  id: string;
  created_at: string;
  current_stage: string;
  status: string;
  last_interaction: string | null;
  job: {
    id: string;
    title: string;
    company: {
      id: string;
      name: string;
    } | null;
  } | null;
}

interface VouchPrompt {
  applicationId: string;
  companyId: string;
  companyName: string;
  triggerType: 'time_based' | 'stage_change' | 'completion';
  triggerStage?: string;
}

const VOUCH_PROMPT_STAGES = ['interview', 'technical', 'offer'];
const COMPLETION_STAGES = ['hired', 'rejected', 'withdrawn'];
const TIME_BASED_DAYS = 21;

export function useCompanyVouchPrompts(applications: Application[]) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [pendingPrompt, setPendingPrompt] = useState<VouchPrompt | null>(null);

  // Fetch existing prompts to avoid duplicates
  const { data: existingPrompts } = useQuery({
    queryKey: ['company-vouch-prompts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('company_vouch_prompts')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Check if a prompt was already shown/completed
  const wasPromptShown = useCallback(
    (applicationId: string, triggerType: string, triggerStage?: string) => {
      if (!existingPrompts) return false;
      
      return existingPrompts.some(
        (p) =>
          p.application_id === applicationId &&
          p.trigger_type === triggerType &&
          (triggerStage ? p.trigger_stage === triggerStage : true)
      );
    },
    [existingPrompts]
  );

  // Check for time-based prompts (21 days without status change)
  const checkTimeBasedPrompts = useCallback(() => {
    if (!applications.length || !user?.id) return null;

    for (const app of applications) {
      if (!app.job?.company?.id) continue;
      
      // Skip completed applications
      if (COMPLETION_STAGES.includes(app.current_stage || '')) continue;
      
      // Check if 21 days have passed
      const daysSinceCreation = differenceInDays(new Date(), new Date(app.created_at));
      const daysSinceInteraction = app.last_interaction 
        ? differenceInDays(new Date(), new Date(app.last_interaction))
        : daysSinceCreation;
      
      if (daysSinceInteraction >= TIME_BASED_DAYS) {
        if (!wasPromptShown(app.id, 'time_based')) {
          return {
            applicationId: app.id,
            companyId: app.job.company.id,
            companyName: app.job.company.name,
            triggerType: 'time_based' as const,
          };
        }
      }
    }

    return null;
  }, [applications, user?.id, wasPromptShown]);

  // Check for stage-based prompts
  const checkStagePrompt = useCallback(
    (applicationId: string, newStage: string): VouchPrompt | null => {
      const app = applications.find((a) => a.id === applicationId);
      if (!app?.job?.company?.id) return null;

      // Check completion-based prompts
      if (COMPLETION_STAGES.includes(newStage)) {
        if (!wasPromptShown(applicationId, 'completion', newStage)) {
          return {
            applicationId,
            companyId: app.job.company.id,
            companyName: app.job.company.name,
            triggerType: 'completion',
            triggerStage: newStage,
          };
        }
      }

      // Check stage-based prompts (interview, technical, offer)
      if (VOUCH_PROMPT_STAGES.includes(newStage)) {
        if (!wasPromptShown(applicationId, 'stage_change', newStage)) {
          return {
            applicationId,
            companyId: app.job.company.id,
            companyName: app.job.company.name,
            triggerType: 'stage_change',
            triggerStage: newStage,
          };
        }
      }

      return null;
    },
    [applications, wasPromptShown]
  );

  // Trigger prompt on stage change
  const triggerStagePrompt = useCallback(
    (applicationId: string, newStage: string) => {
      const prompt = checkStagePrompt(applicationId, newStage);
      if (prompt) {
        setPendingPrompt(prompt);
      }
    },
    [checkStagePrompt]
  );

  // Check for time-based prompts on mount/update
  useEffect(() => {
    if (!existingPrompts) return;
    
    const timeBasedPrompt = checkTimeBasedPrompts();
    if (timeBasedPrompt && !pendingPrompt) {
      // Delay to not interrupt user immediately
      const timer = setTimeout(() => {
        setPendingPrompt(timeBasedPrompt);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [checkTimeBasedPrompts, existingPrompts, pendingPrompt]);

  const clearPrompt = useCallback(() => {
    setPendingPrompt(null);
  }, []);

  return {
    pendingPrompt,
    triggerStagePrompt,
    clearPrompt,
  };
}
