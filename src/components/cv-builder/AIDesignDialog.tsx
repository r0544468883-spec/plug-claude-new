import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Sparkles, Wand2, Edit3, Target } from 'lucide-react';
import { CVData, colorPresets } from './types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIDesignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cvData: CVData;
  onDesignGenerated: (html: string, css: string) => void;
}

type DesignStyle = 'professional' | 'creative' | 'modern' | 'minimal';

const DESIGN_STYLES: { value: DesignStyle; labelEn: string; labelHe: string; description: string }[] = [
  { value: 'professional', labelEn: 'Professional', labelHe: 'מקצועי', description: 'Clean and corporate' },
  { value: 'creative', labelEn: 'Creative', labelHe: 'יצירתי', description: 'Bold and unique' },
  { value: 'modern', labelEn: 'Modern', labelHe: 'מודרני', description: 'Contemporary design' },
  { value: 'minimal', labelEn: 'Minimal', labelHe: 'מינימלי', description: 'Simple and elegant' },
];

export const AIDesignDialog = ({ open, onOpenChange, cvData, onDesignGenerated }: AIDesignDialogProps) => {
  const { language } = useLanguage();
  const isHe = language === 'he';
  
  const [selectedStyle, setSelectedStyle] = useState<DesignStyle>('professional');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [atsOptimize, setAtsOptimize] = useState(false);

  const generatePrompt = (forAts = atsOptimize) => {
    const { personalInfo, experience, education, skills, settings } = cvData;
    
    const experienceText = experience.map(exp => 
      `• ${exp.role} at ${exp.company} (${exp.startDate} - ${exp.current ? 'Present' : exp.endDate || 'N/A'})\n  ${exp.bullets.slice(0, 2).join('; ')}`
    ).join('\n');
    
    const educationText = education.map(edu =>
      `• ${edu.degree} in ${edu.field}, ${edu.institution} (${edu.endDate})`
    ).join('\n');

    const prompt = `You are a professional CV/resume designer. Create a clean, ATS-friendly CV design.

CANDIDATE INFO:
- Name: ${personalInfo.fullName || 'John Doe'}
- Title: ${personalInfo.title || 'Professional'}
- Email: ${personalInfo.email || ''}
- Phone: ${personalInfo.phone || ''}
- Location: ${personalInfo.location || ''}
- Summary: ${personalInfo.summary || 'Experienced professional seeking new opportunities.'}

EXPERIENCE:
${experienceText || 'No experience listed'}

EDUCATION:
${educationText || 'No education listed'}

SKILLS:
Technical: ${skills.technical.join(', ') || 'Various technical skills'}
Soft: ${skills.soft.join(', ') || 'Various soft skills'}
Languages: ${skills.languages.map(l => `${l.name} (${l.level})`).join(', ') || 'English'}

DESIGN PREFERENCES:
- Style: ${selectedStyle}
- Primary Color: ${settings.accentColor || colorPresets[settings.colorPreset].primary}
- Font: ${settings.fontFamily}
- Layout: ${settings.orientation}
- Spacing: ${settings.spacing}

Generate a complete HTML document with inline CSS for a printable A4 resume.
Requirements:
1. Use modern, clean design with proper typography
2. Ensure good contrast and readability
3. Support both LTR and RTL text (use dir="auto" where appropriate)
4. Use the specified primary color for accents
5. Include proper sections with visual hierarchy
6. Make it printer-friendly (no background images, reasonable margins)
7. Use semantic HTML structure
${forAts ? `8. ATS OPTIMIZATION REQUIRED:
   - Use standard section headings: "Work Experience", "Education", "Skills", "Summary"
   - All bullet points must start with strong action verbs (Led, Developed, Managed, etc.)
   - Include quantifiable achievements wherever possible
   - Use simple clean single-column or minimal two-column layout for ATS readability
   - Avoid graphics, icons, tables, or complex CSS that ATS cannot parse
   - Skills should be listed as plain text, not in graphical skill bars
   - Font size minimum 11px, maximum 12px for body text
   - Standard margins (1 inch / 25mm)` : ''}

Return ONLY the HTML code, starting with <!DOCTYPE html> and ending with </html>.`;

    return prompt;
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error(isHe ? 'יש להתחבר כדי ליצור עיצוב' : 'Please login to generate design');
        return;
      }

      const prompt = showPromptEditor && customPrompt ? customPrompt : generatePrompt();

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cv-generate-design`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          prompt,
          cvData,
          style: selectedStyle,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 429) {
          toast.error(isHe ? 'הגעת למגבלת בקשות, נסה שוב מאוחר יותר' : 'Rate limit exceeded, please try again later');
          return;
        }
        if (response.status === 402) {
          toast.error(isHe ? 'נגמרו הקרדיטים, יש להוסיף קרדיטים' : 'Credits exhausted, please add credits');
          return;
        }
        
        throw new Error(errorData.error || 'Generation failed');
      }

      const result = await response.json();
      
      if (result.html) {
        onDesignGenerated(result.html, result.css || '');
        onOpenChange(false);
        toast.success(isHe ? 'העיצוב נוצר בהצלחה!' : 'Design generated successfully!');
      } else {
        throw new Error('No HTML returned');
      }
    } catch (error) {
      console.error('AI Design error:', error);
      toast.error(isHe ? 'שגיאה ביצירת העיצוב' : 'Error generating design');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditPrompt = () => {
    if (!showPromptEditor) {
      setCustomPrompt(generatePrompt());
    }
    setShowPromptEditor(!showPromptEditor);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {isHe ? 'צור עיצוב עם AI' : 'Generate Design with AI'}
          </DialogTitle>
          <DialogDescription>
            {isHe 
              ? 'בחר סגנון עיצוב ו-AI ייצור קורות חיים מותאמים אישית'
              : 'Choose a design style and AI will create a custom CV design'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Style Selection */}
          <div className="space-y-3">
            <Label>{isHe ? 'סגנון עיצוב' : 'Design Style'}</Label>
            <RadioGroup 
              value={selectedStyle} 
              onValueChange={(v) => setSelectedStyle(v as DesignStyle)}
              className="grid grid-cols-2 gap-3"
            >
              {DESIGN_STYLES.map(style => (
                <div key={style.value} className="relative">
                  <RadioGroupItem value={style.value} id={`style-${style.value}`} className="sr-only" />
                  <Label
                    htmlFor={`style-${style.value}`}
                    className={`flex flex-col p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedStyle === style.value 
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <span className="font-medium">{isHe ? style.labelHe : style.labelEn}</span>
                    <span className="text-xs text-muted-foreground mt-1">{style.description}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* CV Summary */}
          <div className="p-3 bg-muted/30 rounded-lg border">
            <div className="text-sm space-y-1">
              <p><strong>{cvData.personalInfo.fullName || 'Your Name'}</strong></p>
              <p className="text-muted-foreground">{cvData.personalInfo.title || 'Your Title'}</p>
              <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                <span>{cvData.experience.length} {isHe ? 'תפקידים' : 'positions'}</span>
                <span>{cvData.skills.technical.length} {isHe ? 'מיומנויות' : 'skills'}</span>
                <span>{cvData.skills.languages.length} {isHe ? 'שפות' : 'languages'}</span>
              </div>
            </div>
          </div>

          {/* ATS Optimization Toggle */}
          <div
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
              atsOptimize ? 'border-orange-400 bg-orange-50 dark:bg-orange-950/20' : 'border-border hover:border-orange-300'
            }`}
            onClick={() => setAtsOptimize(!atsOptimize)}
          >
            <Checkbox
              id="ats-optimize"
              checked={atsOptimize}
              onCheckedChange={(v) => setAtsOptimize(!!v)}
              className="mt-0.5 border-orange-400 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
            />
            <div className="flex-1">
              <label htmlFor="ats-optimize" className="flex items-center gap-2 font-medium text-sm cursor-pointer">
                <Target className="w-4 h-4 text-orange-500" />
                {isHe ? 'אופטימיזציה ל-ATS' : 'ATS Optimization'}
              </label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isHe
                  ? 'מייצר עיצוב ידידותי לאיתור אוטומטי עם כותרות סטנדרטיות, פעלים חזקים ומבנה נקי'
                  : 'Generates ATS-friendly layout with standard headings, strong action verbs, and clean structure'}
              </p>
            </div>
          </div>

          {/* Prompt Editor Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEditPrompt}
            className="gap-2"
          >
            <Edit3 className="w-4 h-4" />
            {showPromptEditor 
              ? (isHe ? 'הסתר עריכת Prompt' : 'Hide Prompt Editor')
              : (isHe ? 'ערוך Prompt' : 'Edit Prompt')}
          </Button>

          {/* Custom Prompt Editor */}
          {showPromptEditor && (
            <div className="space-y-2">
              <Label>{isHe ? 'Prompt מותאם אישית' : 'Custom Prompt'}</Label>
              <Textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={12}
                className="font-mono text-xs"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">
                {isHe 
                  ? 'ערוך את ה-Prompt כדי לשנות את הוראות העיצוב'
                  : 'Edit the prompt to customize the design instructions'}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isHe ? 'ביטול' : 'Cancel'}
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating} className="gap-2">
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isHe ? 'יוצר עיצוב...' : 'Generating...'}
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                {isHe ? 'צור עיצוב' : 'Generate Design'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
