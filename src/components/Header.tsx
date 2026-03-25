import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { PlugFAB } from '@/components/chat/PlugFAB';
import { PlugLogo } from '@/components/PlugLogo';
import { LanguageToggle } from '@/components/LanguageToggle';
import { CreditHUD } from '@/components/credits/CreditHUD';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, LogOut, User } from 'lucide-react';

interface HeaderProps {
  showBackButton?: boolean;
  backPath?: string;
}

export const Header = ({ showBackButton = true, backPath = '/' }: HeaderProps) => {
  const { user, signOut } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isRTL = language === 'he';

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-4">
          {/* Left side */}
          <div className="flex items-center gap-4">
            {showBackButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(backPath)}
                className="shrink-0"
              >
                {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
              </Button>
            )}
            <Link to="/" className="flex items-center gap-2">
              <PlugLogo size="sm" />
            </Link>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {user && (
              <>
                <CreditHUD />
                <NotificationBell />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/profile')}
                >
                  <User className="w-4 h-4" />
                </Button>
              </>
            )}
            <LanguageToggle />
            {user && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => signOut()}
                className="text-muted-foreground hover:text-destructive"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </header>
      {/* Plug FAB — visible on all standalone pages */}
      {user && <PlugFAB />}
    </>
  );
};
