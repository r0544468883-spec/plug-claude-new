import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Sparkles, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

export function VisibleToHRBanner() {
  const { user, profile, role } = useAuth();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const isHebrew = language === 'he';
  const isJobSeeker = role === 'job_seeker';

  const [visibleToHR, setVisibleToHR] = useState(
    (profile as any)?.visible_to_hr ?? false
  );

  useEffect(() => {
    if (profile) {
      setVisibleToHR((profile as any)?.visible_to_hr ?? false);
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: async (newValue: boolean) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ visible_to_hr: newValue })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(
        visibleToHR
          ? (isHebrew ? 'אתה גלוי למגייסים!' : 'You are now visible to recruiters!')
          : (isHebrew ? 'אתה מוסתר ממגייסים' : 'You are now hidden from recruiters')
      );
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: () => {
      setVisibleToHR(!visibleToHR);
      toast.error(isHebrew ? 'שגיאה בעדכון' : 'Failed to update');
    },
  });

  const handleToggle = (checked: boolean) => {
    setVisibleToHR(checked);
    updateMutation.mutate(checked);
  };

  // Only show for job seekers
  if (!isJobSeeker) return null;

  return (
    <div className={cn(
      "mx-4 mb-4 p-3 rounded-lg border transition-colors",
      visibleToHR 
        ? "bg-primary/10 border-primary/30" 
        : "bg-muted/50 border-border"
    )}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {visibleToHR ? (
            <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
          ) : (
            <Eye className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          )}
          <span className={cn(
            "text-xs font-medium truncate",
            visibleToHR ? "text-primary" : "text-muted-foreground"
          )}>
            {isHebrew ? 'גלוי למגייסים' : 'Visible to HR'}
          </span>
        </div>
        <Switch
          checked={visibleToHR}
          onCheckedChange={handleToggle}
          disabled={updateMutation.isPending}
          className="flex-shrink-0 scale-75"
        />
      </div>
    </div>
  );
}
