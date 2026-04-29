import { useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Textarea } from '@/components/ui/textarea';
import { Wand2, Briefcase, Minimize2, Maximize2, SpellCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type Action = 'improve' | 'professional' | 'shorten' | 'expand' | 'fix_grammar';

interface EmailInlineAIProps {
  value: string;
  onChange: (val: string) => void;
  rows?: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

interface ActionBtn {
  action: Action;
  icon: React.ElementType;
  labelEn: string;
  labelHe: string;
}

const ACTIONS: ActionBtn[] = [
  { action: 'improve',      icon: Wand2,      labelEn: 'Improve',      labelHe: 'שפר'    },
  { action: 'professional', icon: Briefcase,  labelEn: 'Professional', labelHe: 'מקצועי' },
  { action: 'shorten',      icon: Minimize2,  labelEn: 'Shorten',      labelHe: 'קצר'    },
  { action: 'expand',       icon: Maximize2,  labelEn: 'Expand',       labelHe: 'הרחב'   },
  { action: 'fix_grammar',  icon: SpellCheck, labelEn: 'Fix',          labelHe: 'תקן'    },
];

export function EmailInlineAI({
  value,
  onChange,
  rows = 8,
  placeholder,
  disabled,
  className,
}: EmailInlineAIProps) {
  const { language } = useLanguage();
  const isHe = language === 'he';
  const ref = useRef<HTMLTextAreaElement>(null);
  const [showToolbar, setShowToolbar]     = useState(false);
  const [selStart, setSelStart]           = useState(0);
  const [selEnd, setSelEnd]               = useState(0);
  const [loadingAction, setLoadingAction] = useState<Action | null>(null);

  const checkSelection = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end   = el.selectionEnd   ?? 0;
    if (end - start >= 3) {
      setSelStart(start);
      setSelEnd(end);
      setShowToolbar(true);
    } else {
      setShowToolbar(false);
    }
  }, []);

  const runAction = async (action: Action) => {
    const selectedText = value.substring(selStart, selEnd);
    if (!selectedText) return;

    setLoadingAction(action);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Detect language from text content
      const hasHebrew = /[\u0590-\u05FF]/.test(selectedText);
      const lang = hasHebrew ? 'he' : (isHe ? 'he' : 'en');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cv-text-improve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            text:     selectedText,
            action,
            context:  'generic',
            language: lang,
          }),
        }
      );

      if (!res.ok) throw new Error('Failed');
      const { result } = await res.json();
      if (result) {
        onChange(value.substring(0, selStart) + result + value.substring(selEnd));
      }
    } catch {
      toast.error(isHe ? 'שגיאה בשיפור הטקסט — נסה שוב' : 'Failed to improve text — try again');
    } finally {
      setLoadingAction(null);
      setShowToolbar(false);
    }
  };

  return (
    <div className="relative">
      {/* AI Toolbar — floats above selected text */}
      {showToolbar && (
        <div
          className="absolute bottom-full mb-1 left-0 z-50 flex items-center gap-0.5 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-1"
          onMouseDown={(e) => e.preventDefault()}
        >
          {ACTIONS.map(({ action, icon: Icon, labelEn, labelHe }) => (
            <button
              key={action}
              onClick={() => runAction(action)}
              disabled={loadingAction !== null}
              title={isHe ? labelHe : labelEn}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {loadingAction === action
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Icon className="w-3 h-3" />
              }
              {isHe ? labelHe : labelEn}
            </button>
          ))}
        </div>
      )}

      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onMouseUp={checkSelection}
        onKeyUp={checkSelection}
        onBlur={() => setTimeout(() => setShowToolbar(false), 200)}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
      />

      {/* Discoverability hint */}
      {value.length > 0 && !showToolbar && loadingAction === null && (
        <p className="mt-0.5 text-[10px] text-muted-foreground/60 flex items-center gap-1">
          <Wand2 className="w-2.5 h-2.5" />
          {isHe ? 'סמן טקסט לשיפור עם AI' : 'Select text to improve with AI'}
        </p>
      )}
    </div>
  );
}
