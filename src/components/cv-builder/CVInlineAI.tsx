import { useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Wand2, Briefcase, Minimize2, Maximize2, SpellCheck, Loader2, Target } from 'lucide-react';
import { toast } from 'sonner';

type Action = 'improve' | 'professional' | 'shorten' | 'expand' | 'fix_grammar' | 'ats_optimize';
type FieldName = 'summary' | 'bullets' | 'description' | 'title' | 'generic';

interface CVInlineAIProps {
  value: string;
  onChange: (val: string) => void;
  fieldName: FieldName;
  isMultiline?: boolean;
  rows?: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showAtsButton?: boolean;
}

interface ActionBtn {
  action: Action;
  icon: React.ElementType;
  labelEn: string;
  labelHe: string;
}

const ACTIONS: ActionBtn[] = [
  { action: 'improve',      icon: Wand2,       labelEn: 'Improve',      labelHe: 'שפר'       },
  { action: 'professional', icon: Briefcase,   labelEn: 'Professional', labelHe: 'מקצועי'    },
  { action: 'shorten',      icon: Minimize2,   labelEn: 'Shorten',      labelHe: 'קצר'       },
  { action: 'expand',       icon: Maximize2,   labelEn: 'Expand',       labelHe: 'הרחב'      },
  { action: 'fix_grammar',  icon: SpellCheck,  labelEn: 'Fix',          labelHe: 'תקן'       },
];

export function CVInlineAI({
  value,
  onChange,
  fieldName,
  isMultiline = false,
  rows = 3,
  placeholder,
  disabled,
  className,
  showAtsButton = false,
}: CVInlineAIProps) {
  const { language } = useLanguage();
  const isHe = language === 'he';
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);
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
            context:  fieldName,
            language: isHe ? 'he' : 'en',
          }),
        }
      );

      if (!res.ok) throw new Error('Failed');
      const { result } = await res.json();
      if (result) {
        const newValue = value.substring(0, selStart) + result + value.substring(selEnd);
        onChange(newValue);
      }
    } catch {
      toast.error(isHe ? 'שגיאה בשיפור הטקסט — נסה שוב' : 'Failed to improve text — try again');
    } finally {
      setLoadingAction(null);
      setShowToolbar(false);
    }
  };

  // ATS optimize — works on the full field value, no text selection required
  const runAtsOptimize = async () => {
    if (!value.trim()) return;
    setLoadingAction('ats_optimize');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cv-text-improve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            text:     value,
            action:   'ats_optimize',
            context:  fieldName,
            language: isHe ? 'he' : 'en',
          }),
        }
      );
      if (!res.ok) throw new Error('Failed');
      const { result } = await res.json();
      if (result) onChange(result);
    } catch {
      toast.error(isHe ? 'שגיאה באופטימיזציית ATS — נסה שוב' : 'ATS optimization failed — try again');
    } finally {
      setLoadingAction(null);
    }
  };

  const sharedProps = {
    ref,
    value,
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => onChange(e.target.value),
    onMouseUp:  checkSelection,
    onKeyUp:    checkSelection,
    onBlur:     () => setTimeout(() => setShowToolbar(false), 200),
    placeholder,
    disabled,
    className,
  };

  return (
    <div className="relative">
      {/* AI Toolbar */}
      {showToolbar && (
        <div
          className="absolute bottom-full mb-1 left-0 z-50 flex items-center gap-0.5 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-1"
          onMouseDown={(e) => e.preventDefault()} // prevent blur before click
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

      {isMultiline ? (
        <Textarea
          {...(sharedProps as React.ComponentProps<typeof Textarea>)}
          rows={rows}
        />
      ) : (
        <Input
          {...(sharedProps as React.ComponentProps<typeof Input>)}
        />
      )}

      {/* AI discoverability hint */}
      {isMultiline && value.length > 0 && !showToolbar && loadingAction === null && (
        <p className="mt-0.5 text-[10px] text-muted-foreground/60 flex items-center gap-1">
          <Wand2 className="w-2.5 h-2.5" />
          {isHe ? 'סמן טקסט לשיפור עם AI' : 'Select text to improve with AI'}
        </p>
      )}

      {/* ATS Optimize button — shown below multiline fields when showAtsButton=true */}
      {showAtsButton && isMultiline && (
        <button
          type="button"
          onClick={runAtsOptimize}
          disabled={loadingAction !== null || !value.trim()}
          className="mt-1 flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded border border-orange-300 text-orange-600 hover:bg-orange-50 disabled:opacity-40 transition-colors"
          title={isHe ? 'שפר לפי ATS — שיפור מלא לאיתור אוטומטי' : 'Optimize for ATS — improve keywords & action verbs'}
        >
          {loadingAction === 'ats_optimize'
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <Target className="w-3 h-3" />
          }
          {isHe ? 'שפר ATS' : 'ATS Boost'}
        </button>
      )}
    </div>
  );
}
