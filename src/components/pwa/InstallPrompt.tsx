import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { X, Download } from 'lucide-react';

export function InstallPrompt() {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('pwa_install_dismissed');
    if (dismissed) {
      const ts = parseInt(dismissed);
      if (Date.now() - ts < 7 * 24 * 60 * 60 * 1000) return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShow(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa_install_dismissed', Date.now().toString());
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="bg-card border border-primary/30 rounded-xl p-4 shadow-lg flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Download className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {isHebrew ? 'התקן את PLUG' : 'Install PLUG'}
          </p>
          <p className="text-xs text-muted-foreground">
            {isHebrew ? 'גישה מהירה מהמסך הראשי' : 'Quick access from home screen'}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button size="sm" onClick={handleInstall}>
            {isHebrew ? 'התקן' : 'Install'}
          </Button>
          <Button size="icon" variant="ghost" onClick={handleDismiss} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
