import { useLanguage } from '@/contexts/LanguageContext';
import { PlugLogo } from '@/components/PlugLogo';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Button } from '@/components/ui/button';
import { Download, Chrome, ArrowLeft, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const EXTENSION_ZIP_URL = 'https://llrzeexnzgknpwcxdxpm.supabase.co/storage/v1/object/public/public-assets/extension/plug-extension.zip';

export default function Extension() {
  const { direction } = useLanguage();
  const navigate = useNavigate();
  const isHebrew = direction === 'rtl';
  const BackIcon = direction === 'rtl' ? ArrowRight : ArrowLeft;

  const steps = isHebrew ? [
    { num: '1', title: 'הורד את הקובץ', desc: 'לחץ על הכפתור למטה. יורד קובץ ZIP קטן (פחות מ-1MB).' },
    { num: '2', title: 'חלץ את הקובץ', desc: 'לחץ קליק ימני על הקובץ → "חלץ הכל" (Extract All). תיווצר תיקייה חדשה.' },
    { num: '3', title: 'פתח את דף התוספים', desc: 'פתח Chrome, הקלד בשורת הכתובת: chrome://extensions ולחץ Enter.' },
    { num: '4', title: 'הפעל מצב מפתח', desc: 'בפינה הימנית העליונה של הדף, הפעל את המתג "מצב מפתח" (Developer mode).' },
    { num: '5', title: 'טען את התוסף', desc: 'לחץ על "טען תוסף ארוז" (Load unpacked) ובחר את התיקייה שחילצת.' },
    { num: '6', title: 'מוכן! 🎉', desc: 'התוסף מותקן. גלוש לאולג\'ובס או לינקדין ותראה את פלאג בפעולה.' },
  ] : [
    { num: '1', title: 'Download the file', desc: 'Click the button below. A small ZIP file (under 1MB) will download.' },
    { num: '2', title: 'Extract the ZIP', desc: 'Right-click the file → "Extract All". A new folder will be created.' },
    { num: '3', title: 'Open Extensions page', desc: 'Open Chrome, type chrome://extensions in the address bar and press Enter.' },
    { num: '4', title: 'Enable Developer mode', desc: 'In the top-right corner, toggle on "Developer mode".' },
    { num: '5', title: 'Load the extension', desc: 'Click "Load unpacked" and select the extracted folder.' },
    { num: '6', title: 'Done! 🎉', desc: 'The extension is installed. Browse AllJobs or LinkedIn and see PLUG in action.' },
  ];

  const features = isHebrew ? [
    { icon: '🔍', text: 'סריקת משרות אוטומטית מלינקדין, אולג\'ובס ו-Workday' },
    { icon: '🤖', text: 'ניתוח AI — אחוז התאמה לכל משרה' },
    { icon: '📝', text: 'מילוי טפסים אוטומטי בהגשת מועמדות' },
    { icon: '💾', text: 'שמירה אוטומטית של כל המשרות בחשבון פלאג' },
  ] : [
    { icon: '🔍', text: 'Auto-scan jobs from LinkedIn, AllJobs & Workday' },
    { icon: '🤖', text: 'AI analysis — match percentage for every job' },
    { icon: '📝', text: 'Auto-fill application forms' },
    { icon: '💾', text: 'All jobs saved automatically to your PLUG account' },
  ];

  return (
    <div className="min-h-screen bg-background" dir={direction}>
      {/* Header */}
      <header className="flex items-center justify-between p-4 md:p-6 max-w-3xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <BackIcon className="w-5 h-5" />
          <span>{isHebrew ? 'חזרה' : 'Back'}</span>
        </button>
        <LanguageToggle />
      </header>

      <main className="max-w-3xl mx-auto px-4 pb-16">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <PlugLogo size="lg" />
          </div>
          <h1 className="text-3xl font-bold mb-3">
            {isHebrew ? 'התוסף של פלאג לכרום' : 'PLUG Chrome Extension'}
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            {isHebrew
              ? 'חיפוש עבודה חכם — התוסף סורק, מנתח ושומר משרות בשבילך אוטומטית'
              : 'Smart job search — the extension scans, analyzes, and saves jobs for you automatically'}
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
          {features.map((f, i) => (
            <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border">
              <span className="text-xl">{f.icon}</span>
              <p className="text-sm text-foreground">{f.text}</p>
            </div>
          ))}
        </div>

        {/* Download CTA */}
        <div className="text-center mb-12">
          <a href={EXTENSION_ZIP_URL} download>
            <Button size="lg" className="gap-2 text-lg px-8 py-6 rounded-xl">
              <Download className="w-5 h-5" />
              {isHebrew ? 'הורד את התוסף (ZIP)' : 'Download Extension (ZIP)'}
            </Button>
          </a>
          <p className="text-xs text-muted-foreground mt-2">
            {isHebrew ? 'קובץ ZIP, פחות מ-1MB' : 'ZIP file, under 1MB'}
          </p>
        </div>

        {/* Installation Guide */}
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <Chrome className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold">
              {isHebrew ? 'איך מתקינים? (דקה אחת)' : 'How to install (1 minute)'}
            </h2>
          </div>

          <div className="space-y-6">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-sm">
                  {step.num}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{step.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{step.desc}</p>
                  {i === 2 && (
                    <code className="inline-block mt-1.5 px-3 py-1 rounded bg-muted text-xs font-mono text-foreground" dir="ltr">
                      chrome://extensions
                    </code>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Help */}
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            {isHebrew ? 'צריך עזרה? ' : 'Need help? '}
            <a href="https://wa.me/972544468883" className="text-primary hover:underline">
              {isHebrew ? 'שלח לנו בוואטסאפ' : 'Message us on WhatsApp'}
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
