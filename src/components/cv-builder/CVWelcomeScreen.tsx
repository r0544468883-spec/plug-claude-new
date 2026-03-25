import { useRef, useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { FileText, Image, Upload, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CVWelcomeScreenProps {
  onFileSelected: (file: File) => void;
  onStartFresh: () => void;
}

const ACCEPTED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.webp'];
const ACCEPT_ATTR = ACCEPTED_EXTENSIONS.join(',');

const FORMAT_ICONS = [
  { label: 'PDF', icon: FileText, color: '#ef4444' },
  { label: 'Word', icon: FileText, color: '#3b82f6' },
  { label: 'Image', icon: Image, color: '#8b5cf6' },
];

export function CVWelcomeScreen({ onFileSelected, onStartFresh }: CVWelcomeScreenProps) {
  const { language } = useLanguage();
  const isHe = language === 'he';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) return;
    onFileSelected(file);
  }, [onFileSelected]);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  return (
    <div
      className="flex-1 flex items-center justify-center p-8"
      style={{
        background: 'radial-gradient(ellipse at 60% 40%, hsl(var(--plug-purple) / 0.08) 0%, transparent 60%), radial-gradient(ellipse at 30% 70%, hsl(var(--plug-mint) / 0.06) 0%, transparent 50%)',
      }}
      dir={isHe ? 'rtl' : 'ltr'}
    >
      <div className="w-full max-w-xl space-y-8 text-center">

        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 text-primary">
            <Sparkles className="w-6 h-6" />
            <span className="text-sm font-semibold tracking-wide uppercase">
              {isHe ? 'בונה קורות החיים של פלאג' : 'PLUG CV Builder'}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isHe ? 'בנה קורות חיים מדהימים' : 'Build a stunning resume'}
          </h1>
          <p className="text-muted-foreground text-base">
            {isHe
              ? 'העלה קורות חיים קיימים ופלאג יכין אותם אוטומטית, או התחל מאפס'
              : 'Upload your existing CV and PLUG will prepare it automatically, or start from scratch'}
          </p>
        </div>

        {/* Drop Zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`
            relative cursor-pointer rounded-2xl border-2 border-dashed p-12 transition-all duration-200
            ${isDragging
              ? 'border-primary bg-primary/8 scale-[1.02]'
              : 'border-border hover:border-primary/60 hover:bg-primary/3'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_ATTR}
            className="hidden"
            onChange={onInputChange}
          />

          <div className="flex flex-col items-center gap-4">
            {/* Animated upload icon */}
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 ${
                isDragging ? 'bg-primary text-white scale-110' : 'bg-primary/10 text-primary'
              }`}
            >
              <Upload className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <p className="font-semibold text-lg">
                {isDragging
                  ? (isHe ? 'שחרר כאן!' : 'Drop it here!')
                  : (isHe ? 'גרור קובץ לכאן' : 'Drag your file here')}
              </p>
              <p className="text-muted-foreground text-sm">
                {isHe ? 'או לחץ לבחירת קובץ' : 'or click to browse'}
              </p>
            </div>

            {/* Format pills */}
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {[
                { ext: 'PDF', color: '#ef4444' },
                { ext: 'DOC', color: '#2563eb' },
                { ext: 'DOCX', color: '#2563eb' },
                { ext: 'PNG', color: '#7c3aed' },
                { ext: 'JPG', color: '#7c3aed' },
              ].map(({ ext, color }) => (
                <span
                  key={ext}
                  className="px-2 py-0.5 rounded text-xs font-bold border"
                  style={{ color, borderColor: color, backgroundColor: `${color}15` }}
                >
                  {ext}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* What PLUG does */}
        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            {
              step: '1',
              titleHe: 'מעלה',
              titleEn: 'Upload',
              descHe: 'PDF, Word, או תמונה',
              descEn: 'PDF, Word, or photo',
            },
            {
              step: '2',
              titleHe: 'מנתח',
              titleEn: 'Analyzes',
              descHe: 'AI קורא ומחלץ הנתונים',
              descEn: 'AI reads & extracts data',
            },
            {
              step: '3',
              titleHe: 'בונה',
              titleEn: 'Builds',
              descHe: 'קורות חיים מקצועיים מוכנים',
              descEn: 'Professional CV ready',
            },
          ].map(({ step, titleHe, titleEn, descHe, descEn }) => (
            <div key={step} className="space-y-1">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center mx-auto">
                {step}
              </div>
              <p className="font-semibold text-sm">{isHe ? titleHe : titleEn}</p>
              <p className="text-xs text-muted-foreground">{isHe ? descHe : descEn}</p>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-3 text-muted-foreground">{isHe ? 'או' : 'or'}</span>
          </div>
        </div>

        {/* Start from scratch */}
        <Button
          variant="ghost"
          onClick={onStartFresh}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          {isHe ? 'התחל מאפס' : 'Start from scratch'}
          <ArrowRight className={`w-4 h-4 ${isHe ? 'rotate-180' : ''}`} />
        </Button>
      </div>
    </div>
  );
}
