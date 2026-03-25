import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlugTip, TipType } from './PlugTip';
import { usePlugTips } from '@/hooks/usePlugTips';
import { useAuth } from '@/contexts/AuthContext';

interface PlugTipContainerProps {
  context: 'dashboard' | 'job_search' | 'job_card' | 'profile' | 'applications';
  maxTips?: number;
}

export const PlugTipContainer = ({ context, maxTips = 1 }: PlugTipContainerProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { getContextualTips, dismissTip } = usePlugTips();
  const [tips, setTips] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    
    // Small delay to let the page load first
    const timer = setTimeout(() => {
      const contextualTips = getContextualTips(context);
      setTips(contextualTips.slice(0, maxTips));
    }, 1000);

    return () => clearTimeout(timer);
  }, [user, context, maxTips, getContextualTips]);

  const handleAction = (tipId: string) => {
    switch (tipId) {
      case 'incomplete_profile':
        navigate('/profile');
        break;
      case 'missing_cv':
        navigate('/profile');
        break;
      case 'missing_preferences':
        navigate('/profile');
        break;
      case 'cv_uploaded':
      case 'job_search_tip':
        // Already on job search or navigate to it
        break;
      default:
        break;
    }
    dismissTip(tipId);
    setTips(prev => prev.filter(t => t.id !== tipId));
  };

  const handleDismiss = (tipId: string) => {
    dismissTip(tipId);
    setTips(prev => prev.filter(t => t.id !== tipId));
  };

  if (tips.length === 0) return null;

  return (
    <div className="space-y-3" data-tour="plug-tip">
      {tips.map(tip => (
        <PlugTip
          key={tip.id}
          id={tip.id}
          type={tip.type as TipType}
          titleHe={tip.titleHe}
          titleEn={tip.titleEn}
          messageHe={tip.messageHe}
          messageEn={tip.messageEn}
          actionLabel={tip.actionLabel}
          onAction={() => handleAction(tip.id)}
          onDismiss={() => handleDismiss(tip.id)}
          position="inline"
        />
      ))}
    </div>
  );
};

export default PlugTipContainer;
