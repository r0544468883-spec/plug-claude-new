import { Header } from '@/components/Header';
import { CandidateSearch } from '@/components/hr/CandidateSearch';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CandidateSearchPage() {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  return (
    <div className="min-h-screen bg-background" dir={isHebrew ? 'rtl' : 'ltr'}>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <CandidateSearch />
      </main>
    </div>
  );
}
