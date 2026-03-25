import { useState, useRef, useMemo, useEffect } from 'react';
import { CVData, colorPresets, fontFamilies, ColorPreset, FontFamily, Spacing, Orientation, BackgroundPattern } from './types';
import {
  backgroundConfigs, getBackgroundCSS, getPatternPreviewCSS,
  BackgroundOverlay, PlugWatermark,
} from './utils/backgroundPatterns';
import { templates, getTemplateById } from './templates';
import { useLanguage } from '@/contexts/LanguageContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Download, Palette, Type, FileText, Maximize2, AlignJustify, Check, Layers, Wand2, X } from 'lucide-react';
import { toast } from 'sonner';
import { exportToPdf } from './utils/exportToPdf';
import { computeATSScore } from './utils/atsScore';

interface CVPreviewPanelProps {
  data: CVData;
  onChange: (data: CVData) => void;
  onOpenAIDesign?: () => void;
}

export const CVPreviewPanel = ({ data, onChange, onOpenAIDesign }: CVPreviewPanelProps) => {
  const { language } = useLanguage();
  const isHe = language === 'he';
  const previewRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showAtsBanner, setShowAtsBanner] = useState(false);

  const currentTemplate = getTemplateById(data.settings.templateId);
  const TemplateComponent = currentTemplate?.component || templates[0].component;

  const updateSettings = <K extends keyof CVData['settings']>(field: K, value: CVData['settings'][K]) => {
    onChange({
      ...data,
      settings: { ...data.settings, [field]: value },
    });
  };

  const applyColorPreset = (preset: ColorPreset) => {
    const colors = colorPresets[preset];
    onChange({
      ...data,
      settings: { 
        ...data.settings, 
        colorPreset: preset,
        accentColor: colors.primary,
      },
    });
  };

  const handleExportPDF = async () => {
    if (!previewRef.current) return;
    setIsExporting(true);
    toast.info(isHe ? 'מייצר PDF...' : 'Generating PDF...');
    try {
      const orientation = data.settings.orientation === 'landscape' ? 'landscape' : 'portrait';
      const name = data.personalInfo.fullName || 'resume';
      await exportToPdf(previewRef.current, orientation, `${name}.pdf`);
      toast.success(isHe ? 'PDF נוצר בהצלחה!' : 'PDF generated successfully!');
    } catch {
      toast.error(isHe ? 'שגיאה ביצירת PDF' : 'Error generating PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const atsScore = useMemo(() => computeATSScore(data), [data]);
  const atsColor = atsScore.overall >= 80 ? '#22c55e' : atsScore.overall >= 60 ? '#f97316' : '#ef4444';

  // Show ATS warning banner when score drops below 80
  useEffect(() => {
    if (atsScore.overall < 80) {
      setShowAtsBanner(true);
    }
  }, [atsScore.overall]);

  const pageWidth = data.settings.orientation === 'landscape' ? '297mm' : '210mm';
  const pageHeight = data.settings.orientation === 'landscape' ? '210mm' : '297mm';

  return (
    <div className="h-full flex flex-col bg-muted/30">
      {/* Controls - 2 rows */}
      <div className="p-3 border-b bg-background space-y-2">
        {/* Row 1: Template, Preset, Accent Color, ATS Score */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Template Selector */}
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <Select value={data.settings.templateId} onValueChange={(v) => updateSettings('templateId', v)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {isHe ? t.nameHe : t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Color Palette — visual swatches in Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 h-8 px-3">
                <div
                  className="w-4 h-4 rounded-full border border-white/40 shadow-sm"
                  style={{ backgroundColor: colorPresets[data.settings.colorPreset]?.primary ?? data.settings.accentColor }}
                />
                <Palette className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="start">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {isHe ? 'בחר פלטת צבעים' : 'Choose color palette'}
              </p>
              <div className="grid grid-cols-6 gap-2 mb-3">
                {Object.entries(colorPresets).map(([key, preset]) => (
                  <button
                    key={key}
                    title={isHe ? preset.nameHe : preset.name}
                    onClick={() => applyColorPreset(key as ColorPreset)}
                    className="relative w-8 h-8 rounded-full border-2 transition-all hover:scale-110 focus:outline-none"
                    style={{
                      backgroundColor: preset.primary,
                      borderColor: data.settings.colorPreset === key ? 'white' : 'transparent',
                      boxShadow: data.settings.colorPreset === key ? `0 0 0 2px ${preset.primary}` : 'none',
                    }}
                  >
                    {data.settings.colorPreset === key && (
                      <Check className="w-3 h-3 text-white absolute inset-0 m-auto" />
                    )}
                  </button>
                ))}
              </div>
              <div className="border-t pt-2 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{isHe ? 'צבע מותאם:' : 'Custom color:'}</span>
                <input
                  type="color"
                  value={data.settings.accentColor}
                  onChange={(e) => updateSettings('accentColor', e.target.value)}
                  className="w-7 h-7 rounded-full border border-border cursor-pointer p-0"
                  style={{ appearance: 'none' }}
                />
                <span className="text-xs font-mono text-muted-foreground">{data.settings.accentColor}</span>
              </div>
            </PopoverContent>
          </Popover>

          {/* CV Language Toggle */}
          <div className="flex items-center rounded-md border overflow-hidden h-8 ml-auto">
            <button
              onClick={() => updateSettings('cvLanguage', 'en')}
              className={`px-2.5 h-full text-xs font-medium transition-colors ${
                (data.settings.cvLanguage ?? 'en') === 'en'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => updateSettings('cvLanguage', 'he')}
              className={`px-2.5 h-full text-xs font-medium transition-colors ${
                (data.settings.cvLanguage ?? 'en') === 'he'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              עב
            </button>
          </div>

          {/* ATS Score Badge */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold transition-all hover:scale-105"
                style={{ borderColor: atsColor, color: atsColor, backgroundColor: `${atsColor}15` }}
                title={isHe ? 'ציון ATS — לחץ לפרטים' : 'ATS Score — click for details'}
              >
                <svg width="18" height="18" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="4" />
                  <circle
                    cx="18" cy="18" r="15"
                    fill="none" stroke="currentColor" strokeWidth="4"
                    strokeDasharray={`${(atsScore.overall / 100) * 94.2} 94.2`}
                    strokeLinecap="round"
                    transform="rotate(-90 18 18)"
                  />
                </svg>
                {atsScore.overall}%&nbsp;ATS
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="start">
              <h4 className="font-semibold mb-3 text-sm">{isHe ? 'פירוט ציון ATS' : 'ATS Score Breakdown'}</h4>
              <div className="space-y-2">
                {atsScore.sections.map((s) => (
                  <div key={s.name}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-muted-foreground">{s.name}</span>
                      <span className="font-semibold" style={{ color: s.score >= (s.name === 'Professional Summary' ? 16 : s.name === 'Work Experience' ? 20 : s.name === 'Skills' ? 16 : s.score > 0 ? s.score : -1) >= 0 ? '#22c55e' : '#ef4444' }}>
                        {s.score}pt
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(s.score / (s.name === 'Professional Summary' ? 20 : s.name === 'Work Experience' ? 25 : s.name === 'Skills' ? 20 : s.name === 'Education' ? 15 : 10)) * 100}%`,
                          backgroundColor: atsColor,
                        }}
                      />
                    </div>
                    {s.suggestions.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {s.suggestions.map((sug, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex gap-1">
                            <span>•</span>{sug}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t flex justify-between text-sm font-semibold">
                <span>{isHe ? 'ציון כולל' : 'Total Score'}</span>
                <span style={{ color: atsColor }}>{atsScore.overall}/100</span>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Row 2: Font, Size, Spacing, Orientation, Export */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Font Family — names rendered in their own typeface */}
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-muted-foreground" />
            <Select value={data.settings.fontFamily} onValueChange={(v) => updateSettings('fontFamily', v as FontFamily)}>
              <SelectTrigger className="w-40">
                <span style={{ fontFamily: fontFamilies[data.settings.fontFamily]?.stack }}>
                  {isHe ? fontFamilies[data.settings.fontFamily]?.nameHe : fontFamilies[data.settings.fontFamily]?.name}
                </span>
              </SelectTrigger>
              <SelectContent>
                {(['sans', 'serif', 'hebrew'] as const).map((cat) => {
                  const catFonts = Object.entries(fontFamilies).filter(([, f]) => f.category === cat);
                  if (!catFonts.length) return null;
                  return (
                    <div key={cat}>
                      <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                        {cat === 'hebrew' ? (isHe ? 'עברית' : 'Hebrew') : cat === 'sans' ? (isHe ? 'סאנס-סריף' : 'Sans-serif') : (isHe ? 'סריף' : 'Serif')}
                      </div>
                      {catFonts.map(([key, font]) => (
                        <SelectItem key={key} value={key}>
                          <span style={{ fontFamily: font.stack }}>
                            {isHe ? font.nameHe : font.name}
                          </span>
                        </SelectItem>
                      ))}
                    </div>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Font Size */}
          <Select value={data.settings.fontSize} onValueChange={(v) => updateSettings('fontSize', v as 'small' | 'medium' | 'large')}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">{isHe ? 'קטן' : 'Small'}</SelectItem>
              <SelectItem value="medium">{isHe ? 'בינוני' : 'Medium'}</SelectItem>
              <SelectItem value="large">{isHe ? 'גדול' : 'Large'}</SelectItem>
            </SelectContent>
          </Select>

          {/* Spacing */}
          <div className="flex items-center gap-2">
            <AlignJustify className="w-4 h-4 text-muted-foreground" />
            <Select value={data.settings.spacing} onValueChange={(v) => updateSettings('spacing', v as Spacing)}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">{isHe ? 'צפוף' : 'Compact'}</SelectItem>
                <SelectItem value="normal">{isHe ? 'רגיל' : 'Normal'}</SelectItem>
                <SelectItem value="spacious">{isHe ? 'מרווח' : 'Spacious'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Orientation */}
          <div className="flex items-center gap-2">
            <Maximize2 className="w-4 h-4 text-muted-foreground" />
            <Select value={data.settings.orientation} onValueChange={(v) => updateSettings('orientation', v as Orientation)}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="portrait">{isHe ? 'לאורך' : 'Portrait'}</SelectItem>
                <SelectItem value="landscape">{isHe ? 'לרוחב' : 'Landscape'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Export Button */}
          <Button onClick={handleExportPDF} disabled={isExporting} className="ml-auto">
            <Download className="w-4 h-4 mr-2" />
            {isHe ? 'הורד PDF' : 'Download PDF'}
          </Button>
        </div>

        {/* Row 3: Background Patterns + Heading Color */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Background patterns — Popover with visual previews */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 h-8 px-3">
                <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs">{isHe ? 'רקעים' : 'Backgrounds'}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="start">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {isHe ? 'בחר רקע לדף' : 'Page background'}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {backgroundConfigs.map((bg) => {
                  const isSelected = data.settings.backgroundPattern === bg.id;
                  return (
                    <button
                      key={bg.id}
                      title={isHe ? bg.nameHe : bg.name}
                      onClick={() => updateSettings('backgroundPattern', bg.id as BackgroundPattern)}
                      className={`h-14 rounded-lg border-2 flex flex-col items-center justify-end pb-1 overflow-hidden transition-all relative ${
                        isSelected
                          ? 'border-primary ring-1 ring-primary'
                          : 'border-border hover:border-primary/50'
                      }`}
                      style={{
                        backgroundColor: 'white',
                        ...getPatternPreviewCSS(bg.id, data.settings.accentColor),
                      }}
                    >
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-3.5 h-3.5 bg-primary rounded-full flex items-center justify-center">
                          <Check className="w-2 h-2 text-white" />
                        </div>
                      )}
                      <span className="text-[9px] text-gray-500 bg-white/80 px-1 rounded leading-tight z-10">
                        {isHe ? bg.nameHe : bg.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>

          {/* Heading color picker */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{isHe ? 'כותרות:' : 'Headings:'}</span>
            <div className="relative">
              <input
                type="color"
                value={data.settings.headingColor ?? data.settings.accentColor}
                onChange={(e) => updateSettings('headingColor', e.target.value)}
                className="w-7 h-7 rounded-full border border-border cursor-pointer p-0 opacity-0 absolute inset-0"
                title={isHe ? 'צבע כותרות' : 'Heading color'}
              />
              <div
                className="w-7 h-7 rounded-full border-2 border-border shadow-sm pointer-events-none"
                style={{ backgroundColor: data.settings.headingColor ?? data.settings.accentColor }}
              />
            </div>
            {data.settings.headingColor && (
              <button
                onClick={() => updateSettings('headingColor', undefined)}
                className="text-[10px] text-muted-foreground hover:text-foreground underline"
                title={isHe ? 'אפס' : 'Reset'}
              >
                {isHe ? 'אפס' : 'Reset'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ATS Warning Banner */}
      {showAtsBanner && atsScore.overall < 80 && (
        <div
          className="flex items-center gap-3 px-4 py-2.5 text-sm border-b"
          style={{ backgroundColor: `${atsColor}12`, borderColor: `${atsColor}30` }}
          dir={isHe ? 'rtl' : 'ltr'}
        >
          <span className="font-bold text-base" style={{ color: atsColor }}>{atsScore.overall}%</span>
          <p className="flex-1 text-muted-foreground">
            {isHe
              ? `ציון ה-ATS שלך נמוך. שיפור קורות החיים עם PLUG AI יגדיל את הסיכויים שלך להתקבל לראיון.`
              : `Your ATS score is low. Improving your CV with PLUG AI will increase your chances of getting an interview.`}
          </p>
          {onOpenAIDesign && (
            <button
              onClick={() => { onOpenAIDesign(); setShowAtsBanner(false); }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md text-white text-xs font-semibold shrink-0 hover:opacity-90 transition-opacity"
              style={{ backgroundColor: atsColor }}
            >
              <Wand2 className="w-3.5 h-3.5" />
              {isHe ? 'שפר עם PLUG AI' : 'Improve with PLUG AI'}
            </button>
          )}
          <button onClick={() => setShowAtsBanner(false)} className="text-muted-foreground hover:text-foreground shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Preview */}
      <ScrollArea className="flex-1">
        <div className="p-6 flex justify-center">
          <div
            ref={previewRef}
            className="shadow-xl overflow-hidden"
            dir={data.settings.cvLanguage === 'he' ? 'rtl' : 'ltr'}
            style={{
              width: pageWidth,
              minHeight: pageHeight,
              position: 'relative',
              backgroundColor: 'white',
              fontFamily: data.settings.cvLanguage === 'he'
                ? (fontFamilies[data.settings.fontFamily]?.category === 'hebrew'
                    ? fontFamilies[data.settings.fontFamily]?.stack
                    : "'Heebo', sans-serif")
                : (fontFamilies[data.settings.fontFamily]?.stack || "'Inter', sans-serif"),
              paddingBottom: '24px',
            }}
          >
            {/* Template content */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <TemplateComponent data={data} scale={1} />
            </div>

            {/* CSS background pattern overlay (dots/grid/diagonal/waves) — rendered above template */}
            {(() => {
              const patternCSS = getBackgroundCSS(data.settings.backgroundPattern ?? 'none', data.settings.accentColor);
              return Object.keys(patternCSS).length > 0 ? (
                <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', ...patternCSS }} />
              ) : null;
            })()}

            {/* Decorative overlay (bubbles / squares / corners) — rendered above template */}
            <BackgroundOverlay
              pattern={data.settings.backgroundPattern ?? 'none'}
              accentColor={data.settings.accentColor}
            />

            {/* PLUG watermark — non-removable, fixed at bottom of page */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10 }}>
              <PlugWatermark />
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
