import { CandidateSearch } from '@/components/hr/CandidateSearch';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';

export default function CandidateSearchPage() {
  return (
    <DashboardLayout currentSection="network" onSectionChange={() => {}}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <CandidateSearch />
      </div>
    </DashboardLayout>
  );
}
