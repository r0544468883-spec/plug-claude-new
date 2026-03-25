import { useState } from 'react';
import { IdentitySelection } from '@/components/auth/IdentitySelection';
import { AuthForm } from '@/components/auth/AuthForm';

type AppRole = 'job_seeker' | 'freelance_hr' | 'inhouse_hr' | 'company_employee';
type AuthStep = 'identity' | 'register';

interface AuthPageProps {
  onSuccess: () => void;
}

export default function AuthPage({ onSuccess }: AuthPageProps) {
  const [step, setStep] = useState<AuthStep>('identity');
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);

  const handleRoleSelect = (role: AppRole) => {
    setSelectedRole(role);
    setStep('register');
  };

  const handleBack = () => {
    setStep('identity');
    setSelectedRole(null);
  };

  if (step === 'identity') {
    return <IdentitySelection onSelect={handleRoleSelect} />;
  }

  if (step === 'register' && selectedRole) {
    return (
      <AuthForm 
        selectedRole={selectedRole} 
        onBack={handleBack}
        onSuccess={onSuccess}
      />
    );
  }

  return null;
}
