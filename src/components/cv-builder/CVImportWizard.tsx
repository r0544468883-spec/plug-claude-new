import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Upload, FileText, Loader2, Sparkles, Palette, Type, Layout, Check } from 'lucide-react';
import { CVData, defaultCVData, ColorPreset, FontFamily, Spacing, colorPresets, fontFamilies } from './types';

interface CVImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (data: CVData) => void;
  currentData: CVData;
  /** If provided, wizard skips the source step and immediately analyzes this file */
  preloadedFile?: File;
}

type WizardStep = 'source' | 'analyzing' | 'design' | 'complete';

export const CVImportWizard = ({ open, onOpenChange, onComplete, currentData, preloadedFile }: CVImportWizardProps) => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isHe = language === 'he';
  
  const [step, setStep] = useState<WizardStep>('source');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedData, setExtractedData] = useState<Partial<CVData> | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Design preferences
  const [selectedPreset, setSelectedPreset] = useState<ColorPreset>(currentData.settings.colorPreset);
  const [selectedFont, setSelectedFont] = useState<FontFamily>(currentData.settings.fontFamily);
  const [selectedSpacing, setSelectedSpacing] = useState<Spacing>(currentData.settings.spacing);

  // Auto-analyze preloaded file when wizard opens
  useEffect(() => {
    if (open && preloadedFile && step === 'source') {
      setUploadedFile(preloadedFile);
      analyzeFile(preloadedFile);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preloadedFile]);

  const resetWizard = () => {
    setStep('source');
    setIsAnalyzing(false);
    setExtractedData(null);
    setUploadedFile(null);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadedFile(file);
    await analyzeFile(file);
  };

  const handleUseExisting = async () => {
    if (!user) return;
    
    setStep('analyzing');
    setIsAnalyzing(true);
    
    try {
      // Get existing resume analysis
      const { data: resumeDoc } = await supabase
        .from('documents')
        .select('ai_summary, file_name')
        .eq('owner_id', user.id)
        .eq('doc_type', 'cv')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (!resumeDoc?.ai_summary) {
        toast.error(isHe ? 'לא נמצא קובץ קורות חיים קיים' : 'No existing CV file found');
        setStep('source');
        return;
      }
      
      // Convert to CV data
      const summary = resumeDoc.ai_summary as any;
      const cvData = convertSummaryToCVData(summary);
      setExtractedData(cvData);
      
      toast.success(isHe ? `נטען מ: ${resumeDoc.file_name}` : `Loaded from: ${resumeDoc.file_name}`);
      setStep('design');
    } catch (error) {
      console.error('Error loading existing CV:', error);
      toast.error(isHe ? 'שגיאה בטעינת קורות החיים' : 'Error loading CV');
      setStep('source');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeFile = async (file: File) => {
    if (!user) return;
    
    setStep('analyzing');
    setIsAnalyzing(true);
    
    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const storagePath = `${user.id}/${Date.now()}_import.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(storagePath, file);
      
      if (uploadError) throw uploadError;

      // Create a documents row so the analysis can be persisted (ai_summary)
      const { data: newDoc, error: docErr } = await supabase
        .from('documents')
        .insert({
          owner_id: user.id,
          file_name: file.name,
          file_path: storagePath,
          file_type: fileExt,
          doc_type: 'cv',
        })
        .select('id')
        .single();

      if (docErr || !newDoc?.id) throw docErr || new Error('Failed creating document record');

      // Signed URL (works for private buckets)
      const { data: signed, error: signedErr } = await supabase.storage
        .from('resumes')
        .createSignedUrl(storagePath, 60 * 5);

      if (signedErr || !signed?.signedUrl) throw signedErr || new Error('Failed to create signed URL');
      
      // Call analyze-resume edge function
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          fileUrl: signed.signedUrl,
          fileName: file.name,
          documentId: newDoc.id,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Analysis failed');
      }
      
      const result = await response.json();
      
      // The result contains 'analysis' not 'summary'
      if (result.analysis) {
        console.log('Received analysis:', result.analysis);
        const cvData = convertSummaryToCVData(result.analysis);
        setExtractedData(cvData);
        toast.success(isHe ? 'קורות החיים נותחו בהצלחה!' : 'CV analyzed successfully!');
        setStep('design');
      } else {
        throw new Error('No analysis returned');
      }
    } catch (error) {
      console.error('Error analyzing file:', error);
      toast.error(isHe ? 'שגיאה בניתוח הקובץ' : 'Error analyzing file');
      setStep('source');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const convertSummaryToCVData = (summary: any): Partial<CVData> => {
    const normalizeDate = (dateStr: string | undefined): string => {
      if (!dateStr) return '';
      const date = String(dateStr).trim();
      if (/present|current|now|היום|עד היום/i.test(date)) return 'Present';
      const yyyyMmMatch = date.match(/^(\d{4})-(\d{2})$/);
      if (yyyyMmMatch) return date;
      const yearMatch = date.match(/^(\d{4})$/);
      if (yearMatch) return `${yearMatch[1]}-01`;
      const mmYyyyMatch = date.match(/^(\d{1,2})\/(\d{4})$/);
      if (mmYyyyMatch) return `${mmYyyyMatch[2]}-${mmYyyyMatch[1].padStart(2, '0')}`;
      return date;
    };

    return {
      personalInfo: {
        fullName: summary.personalInfo?.name || '',
        title: summary.experience?.recentRole || '',
        email: summary.personalInfo?.email || '',
        phone: summary.personalInfo?.phone || '',
        location: summary.personalInfo?.location || '',
        summary: summary.experience?.summary || '',
      },
      experience: summary.experience?.positions?.map((pos: any, idx: number) => ({
        id: `exp-${idx}`,
        company: pos.company || '',
        role: pos.role || '',
        startDate: normalizeDate(pos.startDate),
        endDate: /present|current|now|היום|עד היום/i.test(String(pos.endDate || '')) ? null : (normalizeDate(pos.endDate) || null),
        current: !pos.endDate || /present|current|now|היום|עד היום/i.test(String(pos.endDate)),
        bullets: pos.description ? pos.description.split('\n').filter(Boolean) : [],
      })) || [],
      education: summary.education?.institutions?.map((inst: any, idx: number) => ({
        id: `edu-${idx}`,
        institution: inst.name || '',
        degree: inst.degree || '',
        field: inst.field || '',
        startDate: normalizeDate(inst.startDate),
        endDate: normalizeDate(inst.endDate),
      })) || [],
      skills: {
        technical: summary.skills?.technical || [],
        soft: summary.skills?.soft || [],
        languages: summary.skills?.languages?.map((lang: string) => ({
          name: lang,
          level: 'intermediate' as const,
        })) || [],
      },
    };
  };

  const handleComplete = () => {
    if (!extractedData) return;
    
    const finalData: CVData = {
      ...defaultCVData,
      ...extractedData,
      personalInfo: {
        ...defaultCVData.personalInfo,
        ...extractedData.personalInfo,
      },
      skills: {
        ...defaultCVData.skills,
        ...extractedData.skills,
      },
      settings: {
        ...currentData.settings,
        colorPreset: selectedPreset,
        accentColor: colorPresets[selectedPreset].primary,
        fontFamily: selectedFont,
        spacing: selectedSpacing,
      },
    };
    
    onComplete(finalData);
    onOpenChange(false);
    resetWizard();
    toast.success(isHe ? 'קורות החיים הוכנו בהצלחה!' : 'CV prepared successfully!');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetWizard(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {isHe ? 'ייבוא קורות חיים חכם' : 'Smart CV Import'}
          </DialogTitle>
          <DialogDescription>
            {step === 'source' && (isHe 
              ? 'בחר מקור לייבוא קורות החיים שלך'
              : 'Choose a source to import your CV')}
            {step === 'analyzing' && (isHe 
              ? 'פלאג מנתח את קורות החיים שלך...'
              : 'Plug is analyzing your CV...')}
            {step === 'design' && (isHe 
              ? 'בחר את העיצוב המועדף עליך'
              : 'Choose your preferred design')}
          </DialogDescription>
        </DialogHeader>

        {/* Step: Source Selection */}
        {step === 'source' && (
          <div className="space-y-4 py-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
              className="hidden"
            />
            
            <Button
              variant="outline"
              className="w-full h-24 flex flex-col gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-8 h-8 text-primary" />
              <span>{isHe ? 'העלה קובץ חדש' : 'Upload New File'}</span>
              <span className="text-xs text-muted-foreground">PDF, DOC, DOCX, PNG, JPG</span>
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  {isHe ? 'או' : 'or'}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full h-24 flex flex-col gap-2"
              onClick={handleUseExisting}
            >
              <FileText className="w-8 h-8 text-primary" />
              <span>{isHe ? 'השתמש בקובץ קיים' : 'Use Existing File'}</span>
              <span className="text-xs text-muted-foreground">
                {isHe ? 'מקורות החיים שכבר העלית' : 'From your uploaded resume'}
              </span>
            </Button>
          </div>
        )}

        {/* Step: Analyzing */}
        {step === 'analyzing' && (
          <div className="py-12 flex flex-col items-center gap-4">
            <div className="relative">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <Sparkles className="w-5 h-5 text-primary absolute -top-1 -right-1 animate-pulse" />
            </div>
            <div className="text-center">
              <p className="font-medium">{isHe ? 'פלאג קורא את קורות החיים...' : 'Plug is reading your CV...'}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {isHe ? 'מחלץ פרטים אישיים, ניסיון ומיומנויות' : 'Extracting personal info, experience & skills'}
              </p>
            </div>
          </div>
        )}

        {/* Step: Design Preferences */}
        {step === 'design' && (
          <div className="space-y-6 py-4">
            {/* Extracted Summary */}
            {extractedData?.personalInfo && (
              <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
                <div className="flex items-center gap-2 text-accent mb-2">
                  <Check className="w-4 h-4" />
                  <span className="font-medium text-sm">
                    {isHe ? 'נתונים שחולצו' : 'Extracted Data'}
                  </span>
                </div>
                <p className="text-sm">
                  <strong>{extractedData.personalInfo.fullName}</strong>
                  {extractedData.personalInfo.title && ` - ${extractedData.personalInfo.title}`}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {extractedData.experience?.length || 0} {isHe ? 'תפקידים' : 'positions'} • 
                  {extractedData.skills?.technical?.length || 0} {isHe ? 'מיומנויות' : 'skills'}
                </p>
              </div>
            )}

            {/* Color Preset */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                {isHe ? 'פלטת צבעים' : 'Color Palette'}
              </Label>
              <RadioGroup 
                value={selectedPreset} 
                onValueChange={(v) => setSelectedPreset(v as ColorPreset)}
                className="grid grid-cols-3 gap-2"
              >
                {Object.entries(colorPresets).map(([key, preset]) => (
                  <div key={key} className="relative">
                    <RadioGroupItem value={key} id={`preset-${key}`} className="sr-only" />
                    <Label
                      htmlFor={`preset-${key}`}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                        selectedPreset === key 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div 
                        className="w-4 h-4 rounded-full border"
                        style={{ backgroundColor: preset.primary }}
                      />
                      <span className="text-xs">{isHe ? preset.nameHe : preset.name}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Font Family */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Type className="w-4 h-4" />
                {isHe ? 'פונט' : 'Font'}
              </Label>
              <RadioGroup 
                value={selectedFont} 
                onValueChange={(v) => setSelectedFont(v as FontFamily)}
                className="grid grid-cols-2 gap-2"
              >
                {Object.entries(fontFamilies).slice(0, 6).map(([key, font]) => (
                  <div key={key} className="relative">
                    <RadioGroupItem value={key} id={`font-${key}`} className="sr-only" />
                    <Label
                      htmlFor={`font-${key}`}
                      className={`block p-2 rounded-lg border cursor-pointer transition-all text-center ${
                        selectedFont === key 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      style={{ fontFamily: font.stack }}
                    >
                      <span className="text-sm">{isHe ? font.nameHe : font.name}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Spacing */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Layout className="w-4 h-4" />
                {isHe ? 'ריווח' : 'Spacing'}
              </Label>
              <RadioGroup 
                value={selectedSpacing} 
                onValueChange={(v) => setSelectedSpacing(v as Spacing)}
                className="grid grid-cols-3 gap-2"
              >
                <div className="relative">
                  <RadioGroupItem value="compact" id="spacing-compact" className="sr-only" />
                  <Label
                    htmlFor="spacing-compact"
                    className={`block p-2 rounded-lg border cursor-pointer transition-all text-center ${
                      selectedSpacing === 'compact' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <span className="text-sm">{isHe ? 'צפוף' : 'Compact'}</span>
                  </Label>
                </div>
                <div className="relative">
                  <RadioGroupItem value="normal" id="spacing-normal" className="sr-only" />
                  <Label
                    htmlFor="spacing-normal"
                    className={`block p-2 rounded-lg border cursor-pointer transition-all text-center ${
                      selectedSpacing === 'normal' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <span className="text-sm">{isHe ? 'רגיל' : 'Normal'}</span>
                  </Label>
                </div>
                <div className="relative">
                  <RadioGroupItem value="spacious" id="spacing-spacious" className="sr-only" />
                  <Label
                    htmlFor="spacing-spacious"
                    className={`block p-2 rounded-lg border cursor-pointer transition-all text-center ${
                      selectedSpacing === 'spacious' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <span className="text-sm">{isHe ? 'מרווח' : 'Spacious'}</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Button onClick={handleComplete} className="w-full gap-2">
              <Check className="w-4 h-4" />
              {isHe ? 'הכן קורות חיים' : 'Prepare CV'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
