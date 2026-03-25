import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/contexts/CreditsContext';
import AuthPage from './Auth';
import Dashboard from './Dashboard';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { user, isLoading } = useAuth();
  const { credits, isLoading: creditsLoading, awardCredits } = useCredits();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Handle referral code from URL
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode && user && credits) {
      // Award referral bonus if user just signed up with a referral code
      awardCredits('referral', undefined, refCode);
      // Remove ref param from URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('ref');
      window.history.replaceState({}, '', `${window.location.pathname}${newParams.toString() ? '?' + newParams.toString() : ''}`);
    }
  }, [searchParams, user, credits, awardCredits]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading PLUG...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onSuccess={() => {}} />;
  }

  // Wait for credits to load to check onboarding status
  if (creditsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading PLUG...</p>
        </div>
      </div>
    );
  }

  return <Dashboard />;
};

export default Index;
