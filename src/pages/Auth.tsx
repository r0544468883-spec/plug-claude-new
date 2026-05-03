import { useState } from 'react';
import { IdentitySelection } from '@/components/auth/IdentitySelection';
import { AuthForm } from '@/components/auth/AuthForm';
import { GmailOnboardingStep } from '@/components/auth/GmailOnboardingStep';

type AppRole = 'job_seeker' | 'freelance_hr' | 'inhouse_hr' | 'company_employee';
type AuthStep = 'identity' | 'register' | 'gmail-connect';

interface AuthPageProps {
  onSuccess: () => void;
}

export default function AuthPage({ onSuccess }: AuthPageProps) {
  const [step, setStep] = useState<AuthStep>('identity');
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const [isNewRegistration, setIsNewRegistration] = useState(false);

  const handleRoleSelect = (role: AppRole) => {
    setSelectedRole(role);
    setStep('register');
  };

  const handleBack = () => {
    setStep('identity');
    setSelectedRole(null);
  };

  const handleAuthSuccess = () => {
    // Gmail/LinkedIn connections are handled inside OnboardingWizard (step 'gmail')
    // so no separate gmail-connect step needed here
    onSuccess();
  };

  if (step === 'identity') {
    return <IdentitySelection onSelect={handleRoleSelect} />;
  }

  if (step === 'gmail-connect') {
    return <GmailOnboardingStep onSkip={onSuccess} />;
  }

  if (step === 'register' && selectedRole) {
    return (
      <AuthForm
        selectedRole={selectedRole}
        onBack={handleBack}
        onSuccess={handleAuthSuccess}
        onRegistration={() => setIsNewRegistration(true)}
      />
    );
  }

  return null;
}
