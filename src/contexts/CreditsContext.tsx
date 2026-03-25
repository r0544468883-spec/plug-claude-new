import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from './LanguageContext';
import { CREDIT_COSTS, CONFIRMATION_THRESHOLD } from '@/lib/credit-costs';
import { CreditConfirmDialog } from '@/components/credits/CreditConfirmDialog';
import { InsufficientFuelDialog } from '@/components/credits/InsufficientFuelDialog';

interface UserCredits {
  id: string;
  user_id: string;
  daily_fuel: number;
  permanent_fuel: number;
  is_onboarded: boolean;
  last_refill_date: string;
  pings_today: number;
  referral_code: string | null;
  vouches_given_this_month: number;
  vouches_received_this_month: number;
}

interface CreditTransaction {
  id: string;
  amount: number;
  credit_type: 'daily' | 'permanent';
  action_type: string;
  description: string | null;
  created_at: string;
}

interface PendingDeduction {
  action: string;
  cost: number;
  resolve: (result: { success: boolean; error?: string }) => void;
}

interface CreditsContextType {
  credits: UserCredits | null;
  isLoading: boolean;
  totalCredits: number;
  transactions: CreditTransaction[];
  refreshCredits: () => Promise<void>;
  deductCredits: (action: string, customAmount?: number) => Promise<{ success: boolean; error?: string }>;
  awardCredits: (action: string, taskId?: string, referralCode?: string) => Promise<{ success: boolean; awarded?: number; error?: string }>;
  canAfford: (amount: number) => boolean;
  markOnboarded: () => Promise<void>;
  getCost: (action: keyof typeof CREDIT_COSTS) => number;
}

const CreditsContext = createContext<CreditsContextType | undefined>(undefined);

export const CreditsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Confirmation dialog state
  const [pendingDeduction, setPendingDeduction] = useState<PendingDeduction | null>(null);
  
  // Insufficient fuel dialog state
  const [insufficientFuel, setInsufficientFuel] = useState<{ required: number; available: number } | null>(null);

  const totalCredits = (credits?.daily_fuel || 0) + (credits?.permanent_fuel || 0);

  const getCost = useCallback((action: keyof typeof CREDIT_COSTS): number => {
    return CREDIT_COSTS[action];
  }, []);

  const refreshCredits = useCallback(async () => {
    if (!user) {
      setCredits(null);
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    try {
      // Fetch credits
      const { data: creditsData, error: creditsError } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (creditsError) throw creditsError;

      // If no credits record exists yet (shouldn't happen due to trigger, but fallback)
      if (!creditsData) {
        console.log('[CreditsContext] No credits record found, will be created by trigger');
        setCredits(null);
      } else {
        // Check if daily fuel needs reset
        const today = new Date().toISOString().split('T')[0];
        if (creditsData.last_refill_date !== today) {
          // Reset daily fuel locally and update in background
          const updatedCredits = {
            ...creditsData,
            daily_fuel: 20,
            pings_today: 0,
            last_refill_date: today,
          };
          setCredits(updatedCredits as UserCredits);
          
          // Update in database
          await supabase
            .from('user_credits')
            .update({ 
              daily_fuel: 20, 
              pings_today: 0, 
              last_refill_date: today 
            })
            .eq('user_id', user.id);

          toast.success(
            isRTL ? '⚡ הדלק היומי שלך התמלא!' : '⚡ Your daily fuel has been refilled!',
            { duration: 3000 }
          );
        } else {
          setCredits(creditsData as UserCredits);
        }
      }

      // Fetch recent transactions
      const { data: txData } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setTransactions((txData || []) as CreditTransaction[]);
    } catch (error) {
      console.error('[CreditsContext] Error fetching credits:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, isRTL]);

  // Initial load and refresh on user change
  useEffect(() => {
    refreshCredits();
  }, [refreshCredits]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('user-credits-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_credits',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[CreditsContext] Realtime update:', payload);
          if (payload.new) {
            setCredits(payload.new as UserCredits);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Execute the actual deduction (called after confirmation or directly for small amounts)
  const executeDeduction = useCallback(async (action: string, customAmount?: number): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      const { data, error } = await supabase.functions.invoke('deduct-credits', {
        body: { action, customAmount }
      });

      if (error) throw error;

      if (data.error) {
        if (data.error === 'Insufficient credits') {
          // Show insufficient fuel dialog
          setInsufficientFuel({
            required: data.required,
            available: data.available,
          });
        }
        return { success: false, error: data.error };
      }

      // Update local state
      setCredits(prev => prev ? {
        ...prev,
        daily_fuel: data.daily_fuel,
        permanent_fuel: data.permanent_fuel,
        pings_today: data.pings_today ?? prev.pings_today,
      } : null);

      await refreshCredits();
      return { success: true };
    } catch (error: any) {
      console.error('[CreditsContext] Deduct error:', error);
      return { success: false, error: error.message };
    }
  }, [user, refreshCredits]);

  // Main deduction function - shows confirmation for costs > threshold
  const deductCredits = useCallback(async (action: string, customAmount?: number): Promise<{ success: boolean; error?: string }> => {
    if (!user || !credits) return { success: false, error: 'Not authenticated' };

    // Determine the cost
    const actionKey = action.toUpperCase() as keyof typeof CREDIT_COSTS;
    const cost = customAmount || CREDIT_COSTS[actionKey] || 0;

    // Check if user can afford it first
    if (totalCredits < cost) {
      setInsufficientFuel({
        required: cost,
        available: totalCredits,
      });
      return { success: false, error: 'Insufficient credits' };
    }

    // If cost exceeds threshold, show confirmation dialog
    if (cost > CONFIRMATION_THRESHOLD) {
      return new Promise((resolve) => {
        setPendingDeduction({
          action,
          cost,
          resolve: async (result) => {
            if (result.success) {
              const deductResult = await executeDeduction(action, customAmount);
              resolve(deductResult);
            } else {
              resolve(result);
            }
          },
        });
      });
    }

    // For small costs, deduct directly
    return executeDeduction(action, customAmount);
  }, [user, credits, totalCredits, executeDeduction]);

  const handleConfirmDeduction = useCallback(() => {
    if (pendingDeduction) {
      pendingDeduction.resolve({ success: true });
      setPendingDeduction(null);
    }
  }, [pendingDeduction]);

  const handleCancelDeduction = useCallback(() => {
    if (pendingDeduction) {
      pendingDeduction.resolve({ success: false, error: 'Cancelled by user' });
      setPendingDeduction(null);
    }
  }, [pendingDeduction]);

  const awardCredits = useCallback(async (action: string, taskId?: string, referralCode?: string) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      const { data, error } = await supabase.functions.invoke('award-credits', {
        body: { action, taskId, referralCode }
      });

      if (error) throw error;

      if (data.error) {
        if (data.already_completed || data.already_referred) {
          return { success: false, error: data.error };
        }
        if (data.cap_reached) {
          toast.info(
            isRTL ? '🔒 הגעת למגבלה' : '🔒 Limit reached',
            {
              description: isRTL 
                ? `כבר הרווחת את המקסימום להיום/לחודש`
                : `You've already earned the maximum for today/this month`,
            }
          );
          return { success: false, error: data.error };
        }
        return { success: false, error: data.error };
      }

      // Show success toast with mint green styling
      toast.success(
        isRTL ? `⚡ +${data.awarded} דלק קבוע!` : `⚡ +${data.awarded} Permanent Fuel!`,
        { 
          duration: 3000,
          style: { 
            background: 'hsl(var(--accent))',
            color: 'hsl(var(--accent-foreground))',
          }
        }
      );

      // Update local state
      setCredits(prev => prev ? {
        ...prev,
        permanent_fuel: data.permanent_fuel,
      } : null);

      await refreshCredits();
      return { success: true, awarded: data.awarded };
    } catch (error: any) {
      console.error('[CreditsContext] Award error:', error);
      return { success: false, error: error.message };
    }
  }, [user, isRTL, refreshCredits]);

  const canAfford = useCallback((amount: number) => {
    return totalCredits >= amount;
  }, [totalCredits]);

  const markOnboarded = useCallback(async () => {
    if (!user || !credits) return;

    try {
      await supabase
        .from('user_credits')
        .update({ is_onboarded: true })
        .eq('user_id', user.id);

      setCredits(prev => prev ? { ...prev, is_onboarded: true } : null);
    } catch (error) {
      console.error('[CreditsContext] Error marking onboarded:', error);
    }
  }, [user, credits]);

  return (
    <CreditsContext.Provider value={{
      credits,
      isLoading,
      totalCredits,
      transactions,
      refreshCredits,
      deductCredits,
      awardCredits,
      canAfford,
      markOnboarded,
      getCost,
    }}>
      {children}
      
      {/* Confirmation Dialog */}
      {pendingDeduction && credits && (
        <CreditConfirmDialog
          open={!!pendingDeduction}
          action={pendingDeduction.action}
          cost={pendingDeduction.cost}
          dailyFuel={credits.daily_fuel}
          permanentFuel={credits.permanent_fuel}
          onConfirm={handleConfirmDeduction}
          onCancel={handleCancelDeduction}
        />
      )}
      
      {/* Insufficient Fuel Dialog */}
      <InsufficientFuelDialog
        open={!!insufficientFuel}
        required={insufficientFuel?.required || 0}
        available={insufficientFuel?.available || 0}
        onClose={() => setInsufficientFuel(null)}
      />
    </CreditsContext.Provider>
  );
};

export const useCredits = () => {
  const context = useContext(CreditsContext);
  if (context === undefined) {
    throw new Error('useCredits must be used within a CreditsProvider');
  }
  return context;
};
