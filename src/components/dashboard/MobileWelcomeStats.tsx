import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, FileText, Users, Briefcase, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileWelcomeStatsProps {
  totalApplications: number;
  interviews: number;
  activeApplications: number;
}

const STORAGE_KEY = 'plug_mobile_stats_shown';

export function MobileWelcomeStats({ 
  totalApplications, 
  interviews, 
  activeApplications 
}: MobileWelcomeStatsProps) {
  const { language } = useLanguage();
  const isMobile = useIsMobile();
  const isHebrew = language === 'he';
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isMobile) {
      const hasShown = sessionStorage.getItem(STORAGE_KEY);
      if (!hasShown) {
        // Small delay to let the page render first
        const timer = setTimeout(() => {
          setIsOpen(true);
          sessionStorage.setItem(STORAGE_KEY, 'true');
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [isMobile]);

  // Auto-close after 6 seconds
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setIsOpen(false);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isMobile) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {isHebrew ? 'שלום! הנה הסטטוס שלך' : 'Hello! Here\'s your status'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 py-4">
          <div className="flex flex-col items-center p-3 rounded-lg bg-primary/10">
            <FileText className="w-6 h-6 text-primary mb-1" />
            <span className="text-2xl font-bold text-foreground">{totalApplications}</span>
            <span className="text-xs text-muted-foreground text-center">
              {isHebrew ? 'מועמדויות' : 'Applications'}
            </span>
          </div>
          
          <div className="flex flex-col items-center p-3 rounded-lg bg-accent/10">
            <Users className="w-6 h-6 text-accent mb-1" />
            <span className="text-2xl font-bold text-foreground">{interviews}</span>
            <span className="text-xs text-muted-foreground text-center">
              {isHebrew ? 'ראיונות' : 'Interviews'}
            </span>
          </div>
          
          <div className="flex flex-col items-center p-3 rounded-lg bg-green-500/10">
            <Briefcase className="w-6 h-6 text-green-500 mb-1" />
            <span className="text-2xl font-bold text-foreground">{activeApplications}</span>
            <span className="text-xs text-muted-foreground text-center">
              {isHebrew ? 'פעילות' : 'Active'}
            </span>
          </div>
        </div>

        <Button onClick={() => setIsOpen(false)} className="w-full">
          {isHebrew ? 'בוא נתחיל!' : 'Let\'s go!'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
