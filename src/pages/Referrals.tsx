import { Header } from '@/components/Header';
import { ReferralPanel } from '@/components/referrals/ReferralPanel';
import { useLanguage } from '@/contexts/LanguageContext';

const Referrals = () => {
  const { language } = useLanguage();
  const isRTL = language === 'he';

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Header />
      <main id="main-content" className="container max-w-3xl mx-auto px-4 py-8">
        <ReferralPanel />
      </main>
    </div>
  );
};

export default Referrals;
