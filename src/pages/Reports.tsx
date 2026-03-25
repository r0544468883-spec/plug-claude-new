import { Header } from '@/components/Header';
import { ReportsHub } from '@/components/reports/ReportsHub';

export default function Reports() {
  return (
    <div className="min-h-screen bg-background">
      <Header showBackButton backPath="/" />
      <main className="container mx-auto px-4 py-8">
        <ReportsHub />
      </main>
    </div>
  );
}
