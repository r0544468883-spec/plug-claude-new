import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ReferralPanel } from '@/components/referrals/ReferralPanel';

const Referrals = () => {
  return (
    <DashboardLayout currentSection="referrals" onSectionChange={() => {}}>
      <ReferralPanel />
    </DashboardLayout>
  );
};

export default Referrals;
