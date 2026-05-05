import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ReportsHub } from '@/components/reports/ReportsHub';

export default function Reports() {
  return (
    <DashboardLayout currentSection="reports" onSectionChange={() => {}}>
      <ReportsHub />
    </DashboardLayout>
  );
}
