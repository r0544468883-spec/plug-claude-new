import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { X, Download, Chrome, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const DISMISSED_KEY = 'plug-extension-promo-dismissed';

export function ExtensionPromoBanner() {
  const { direction } = useLanguage();
  const isHebrew = direction === 'rtl';
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem(DISMISSED_KEY) === 'true'
  );

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setDismissed(true);
  };

  return (
    <div className="relative mx-4 mt-4 mb-2 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 p-4 overflow-hidden">
      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        className="absolute top-2 left-2 rtl:left-auto rtl:right-2 p-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <Chrome className="w-5 h-5 text-primary" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            {isHebrew ? 'חסוך זמן עם התוסף של פלאג לכרום' : 'Save time with the PLUG Chrome Extension'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isHebrew
              ? 'סריקת משרות אוטומטית מלינקדין ואולג\'ובס, ניתוח AI, ומילוי טפסים אוטומטי'
              : 'Auto-scan jobs from LinkedIn & AllJobs, AI analysis, and auto-fill applications'}
          </p>
        </div>

        {/* CTA */}
        <Button size="sm" className="gap-1.5 whitespace-nowrap" onClick={() => navigate('/extension')}>
          <Download className="w-3.5 h-3.5" />
          {isHebrew ? 'הורד תוסף' : 'Download'}
        </Button>
      </div>
    </div>
  );
}
