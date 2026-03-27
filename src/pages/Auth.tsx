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
    // Show Gmail step only for new job_seeker registrations
    if (isNewRegistration && selectedRole === 'job_seeker') {
      setStep('gmail-connect');
    } else {
      onSuccess();
    }
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
