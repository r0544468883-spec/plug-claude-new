import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Sparkles, Send, ArrowDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ResumeUpload } from '@/components/documents/ResumeUpload';

interface WelcomeCardProps {
  onSendMessage?: (message: string) => void;
}

export function WelcomeCard({ onSendMessage }: WelcomeCardProps) {
  const { profile, role } = useAuth();
  const { language } = useLanguage();
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isRTL = language === 'he';
  const isJobSeeker = role === 'job_seeker';

  const getRolePrompt = () => {
    switch (role) {
      case 'job_seeker':
        return isRTL 
          ? 'איך אני יכול לעזור לך למצוא את המשרה הבאה שלך?'
          : 'How can I help you find your next opportunity?';
      case 'freelance_hr':
      case 'inhouse_hr':
        return isRTL
          ? 'איך אני יכול לעזור לך לנהל את הגיוס?'
          : 'How can I help you manage your recruitment?';
      case 'company_employee':
        return isRTL
          ? 'איך אני יכול לעזור לך היום?'
          : 'How can I help you today?';
      default:
        return isRTL ? 'מה תרצה לעשות?' : 'What would you like to do?';
    }
  };

  const getPlaceholder = () => {
    return isRTL 
      ? 'שאל את Plug כל שאלה...'
      : 'Ask Plug anything...';
  };

  const handleSend = () => {
    if (message.trim() && onSendMessage) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && message.trim()) {
      handleSend();
    }
  };

  return (
    <div 
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-accent/10 border border-border p-6 md:p-8 transition-all duration-300"
      style={{
        boxShadow: isFocused 
          ? '0 0 40px hsl(270 91% 65% / 0.15), 0 0 80px hsl(270 91% 65% / 0.05)'
          : undefined
      }}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 rtl:right-auto rtl:left-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 rtl:-translate-x-1/2" />
      <div className="absolute bottom-0 left-0 rtl:left-auto rtl:right-0 w-48 h-48 bg-gradient-to-tr from-accent/20 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/2 rtl:translate-x-1/2" />
      
      <div className="relative" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex items-start gap-4 mb-6">
          {/* Plug Avatar - Always visible */}
          <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-accent to-primary items-center justify-center flex shadow-lg"
            style={{
              boxShadow: '0 0 20px hsl(270 91% 65% / 0.4)',
            }}
          >
            <Sparkles className="w-7 h-7 text-primary-foreground" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                <span className="text-accent">Plug</span>{' '}
                {isRTL ? 'מוכן לעזור' : 'is ready to assist'}
              </h1>
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            </div>
            <p className="text-muted-foreground text-lg">
              {profile?.full_name 
                ? (isRTL 
                    ? `היי ${profile.full_name.split(' ')[0]}! ${getRolePrompt()}`
                    : `Hey ${profile.full_name.split(' ')[0]}! ${getRolePrompt()}`)
                : getRolePrompt()
              }
            </p>
          </div>
        </div>

        {/* Message Input */}
        <div className="relative">
          <div className={`flex gap-2 p-2 rounded-xl bg-background/80 backdrop-blur border transition-all duration-300 ${
            isFocused 
              ? 'border-accent shadow-lg' 
              : 'border-border hover:border-accent/50'
          }`}>
            <Input
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={getPlaceholder()}
              className="flex-1 border-0 bg-transparent focus-visible:ring-0 text-base placeholder:text-muted-foreground/60"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
            <Button 
              onClick={handleSend}
              disabled={!message.trim()}
              className="gap-2 px-4"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">{isRTL ? 'שלח' : 'Send'}</span>
            </Button>
          </div>
          
          {/* Hint */}
          {onSendMessage && (
            <div className="flex items-center justify-center gap-2 mt-3 text-sm text-muted-foreground">
              <ArrowDown className="h-3 w-3 animate-bounce" />
              <span>{isRTL ? 'או גלול למטה לצ\'אט המלא' : 'Or scroll down for full chat'}</span>
            </div>
          )}
        </div>

        {/* Quick Prompts + Resume Upload */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          {(isRTL ? [
            'עזור לי להתכונן לראיון',
            'חפש לי משרות מתאימות',
            'סקור את הפרופיל שלי',
          ] : [
            'Help me prepare for an interview',
            'Find matching jobs for me',
            'Review my profile',
          ]).map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => {
                setMessage(prompt);
                inputRef.current?.focus();
              }}
              className="px-3 py-1.5 rounded-full text-sm bg-secondary/50 hover:bg-secondary text-foreground transition-colors border border-transparent hover:border-accent/30"
            >
              {prompt}
            </button>
          ))}
          
          {/* Resume Upload - for job seekers */}
          {isJobSeeker && (
            <div className="ml-auto rtl:ml-0 rtl:mr-auto">
              <ResumeUpload compact />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
