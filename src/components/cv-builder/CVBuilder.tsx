import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { CVData, defaultCVData, Experience, fontFamilies } from './types';
import { CVEditorPanel } from './CVEditorPanel';
import { CVPreviewPanel } from './CVPreviewPanel';
import { CVImportWizard } from './CVImportWizard';
import { CVWelcomeScreen } from './CVWelcomeScreen';
import { AIDesignDialog } from './AIDesignDialog';
import { AIDesignPreview } from './AIDesignPreview';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Save, CheckCircle, Loader2, Monitor, FileText, Upload as UploadIcon, Download, Sparkles, Wand2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { debounce } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { exportToPdf } from './utils/exportToPdf';
import { getBackgroundCSS, BackgroundOverlay, PlugWatermark } from './utils/backgroundPatterns';
import { getTemplateById } from './templates';
import { CreditCostBanner } from '@/components/credits/CreditCostBadge';

interface ResumeSummary {
  skills?: {
    technical?: string[];
    soft?: string[];
    languages?: string[];
  };
  experience?: {
    totalYears?: number;
    summary?: string;
    recentRole?: string;
    positions?: Array<{
      company?: string;
      role?: string;
      startDate?: string;
      endDate?: string;
      description?: string;
    }>;
  };
  education?: {
    highest?: string;
    certifications?: string[];
    institutions?: Array<{
      name?: string;
      degree?: string;
      field?: string;
      startDate?: string;
      endDate?: string;
    }>;
  };
  personalInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
  };
  strengths?: string[];
  suggestedRoles?: string[];
}

export const CVBuilder = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isMobile = useIsMobile();
  const [cvData, setCvData] = useState<CVData>(defaultCVData);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isLoadingResume, setIsLoadingResume] = useState(true);
  const [showMobileWarning, setShowMobileWarning] = useState(false);
  const [viewOnlyMode, setViewOnlyMode] = useState(false);
  
  // Import wizard state
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [preloadedFile, setPreloadedFile]       = useState<File | undefined>(undefined);
  // Whether user dismissed the welcome screen to start fresh
  const [skipWelcome, setSkipWelcome]           = useState(false);
  
  // AI Design state
  const [showAIDesignDialog, setShowAIDesignDialog] = useState(false);
  const [showAIDesignPreview, setShowAIDesignPreview] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [generatedCss, setGeneratedCss] = useState('');
  
  // Export dialog state
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSavingToProfile, setIsSavingToProfile] = useState(false);
  const [savedCVUrl, setSavedCVUrl] = useState<string | null>(null);
  const [exportedPdfBlob, setExportedPdfBlob] = useState<Blob | null>(null);
  
  // Ref for the CV preview rendering
  const cvRenderRef = useRef<HTMLDivElement>(null);

  // Show mobile warning on mount if on mobile
  useEffect(() => {
    if (isMobile) {
      setShowMobileWarning(true);
    }
  }, [isMobile]);

  // Warn user before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSaving) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isSaving]);

  // Load CV data from profile and existing resume
  useEffect(() => {
    const loadCvData = async () => {
      if (!user) return;
      setIsLoadingResume(true);
      
      try {
        // First check if cv_data already exists
        const { data: cvProfile } = await supabase
          .from('profiles')
          .select('cv_data, full_name, email, phone')
          .eq('user_id', user.id)
          .single();
        
        if (cvProfile?.cv_data && typeof cvProfile.cv_data === 'object' && Object.keys(cvProfile.cv_data).length > 0) {
          setCvData(cvProfile.cv_data as unknown as CVData);
          setIsLoadingResume(false);
          return;
        }
        
        // If no cv_data, check for uploaded resume with AI analysis (cv or resume doc_type)
        const { data: resumeDoc } = await supabase
          .from('documents')
          .select('ai_summary')
          .eq('owner_id', user.id)
          .in('doc_type', ['cv', 'resume'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (resumeDoc?.ai_summary) {
          const summary = resumeDoc.ai_summary as ResumeSummary;
          
          // Helper function to normalize date format
          const normalizeDate = (dateStr: string | undefined): string => {
            if (!dateStr) return '';
            const date = dateStr.trim();
            // Check if it's "Present" or similar
            if (/present|current|now|היום|עד היום/i.test(date)) {
              return 'Present';
            }
            // Try to extract YYYY-MM format
            const yyyyMmMatch = date.match(/^(\d{4})-(\d{2})$/);
            if (yyyyMmMatch) return date;
            // Try to extract just year
            const yearMatch = date.match(/^(\d{4})$/);
            if (yearMatch) return `${yearMatch[1]}-01`;
            // Try MM/YYYY format
            const mmYyyyMatch = date.match(/^(\d{1,2})\/(\d{4})$/);
            if (mmYyyyMatch) return `${mmYyyyMatch[2]}-${mmYyyyMatch[1].padStart(2, '0')}`;
            // Return as-is if no pattern matches
            return date;
          };
          
          // Convert resume analysis to CV data
          const experiences: Experience[] = summary.experience?.positions?.map((pos, idx) => {
            const endDate = normalizeDate(pos.endDate);
            const isCurrent = endDate === 'Present' || !pos.endDate;
            return {
              id: `exp-${idx}`,
              company: pos.company || '',
              role: pos.role || '',
              startDate: normalizeDate(pos.startDate),
              endDate: isCurrent ? null : endDate,
              current: isCurrent,
              bullets: pos.description ? pos.description.split('\n').filter(Boolean) : [],
            };
          }) || [];
          
          const educations = summary.education?.institutions?.map((inst, idx) => ({
            id: `edu-${idx}`,
            institution: inst.name || '',
            degree: inst.degree || '',
            field: inst.field || '',
            startDate: normalizeDate(inst.startDate),
            endDate: normalizeDate(inst.endDate),
          })) || [];
          
          const newCvData: CVData = {
            ...defaultCVData,
            personalInfo: {
              fullName: summary.personalInfo?.name || cvProfile?.full_name || '',
              title: summary.experience?.recentRole || '',
              email: summary.personalInfo?.email || cvProfile?.email || '',
              phone: summary.personalInfo?.phone || cvProfile?.phone || '',
              location: summary.personalInfo?.location || '',
              summary: summary.experience?.summary || '',
            },
            experience: experiences,
            education: educations,
            skills: {
              technical: summary.skills?.technical || [],
              soft: summary.skills?.soft || [],
              languages: summary.skills?.languages?.map(lang => ({
                name: lang,
                level: 'intermediate' as const,
              })) || [],
            },
          };
          
          setCvData(newCvData);
          
          // Auto-save the loaded data
          await supabase
            .from('profiles')
            .update({ cv_data: JSON.parse(JSON.stringify(newCvData)) })
            .eq('user_id', user.id);
            
          toast.success(language === 'he' ? 'קורות החיים נטענו מהקובץ שהעלית!' : 'CV loaded from your uploaded resume!');
        } else if (cvProfile) {
          // Fallback to basic profile data
          setCvData({
            ...defaultCVData,
            personalInfo: {
              ...defaultCVData.personalInfo,
              fullName: cvProfile.full_name || '',
              email: cvProfile.email || '',
              phone: cvProfile.phone || '',
            },
          });
        }
      } catch (error) {
        console.error('Error loading CV data:', error);
      } finally {
        setIsLoadingResume(false);
      }
    };
    
    loadCvData();
  }, [user, language]);

  // Debounced save
  const saveToDatabase = useCallback(
    debounce(async (data: CVData) => {
      if (!user) return;
      setIsSaving(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({ cv_data: JSON.parse(JSON.stringify(data)) })
        .eq('user_id', user.id);
      
      setIsSaving(false);
      
      if (error) {
        toast.error(language === 'he' ? 'שגיאה בשמירה' : 'Error saving');
      } else {
        setLastSaved(new Date());
      }
    }, 2000),
    [user, language]
  );

  const handleDataChange = (newData: CVData) => {
    setCvData(newData);
    saveToDatabase(newData);
  };

  const handleContinueToView = () => {
    setViewOnlyMode(true);
    setShowMobileWarning(false);
  };

  // Open export dialog and generate PDF from template
  const handleExportClick = async () => {
    setShowExportDialog(true);
    setIsExporting(true);
    setSavedCVUrl(null);
    setExportedPdfBlob(null);
    
    try {
      if (!cvRenderRef.current) throw new Error('CV render element not found');
      const orientation = cvData.settings.orientation === 'landscape' ? 'landscape' : 'portrait';
      const pdfBlob = await exportToPdf(cvRenderRef.current, orientation);
      setExportedPdfBlob(pdfBlob);
      toast.success(language === 'he' ? 'קורות החיים מוכנים להורדה!' : 'CV ready for download!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error(language === 'he' ? 'שגיאה ביצירת PDF' : 'Error creating PDF');
    } finally {
      setIsExporting(false);
    }
  };

  // Download PDF
  const handleDownloadPDF = () => {
    if (!exportedPdfBlob) return;
    
    const url = URL.createObjectURL(exportedPdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${cvData.personalInfo.fullName || 'CV'}_resume.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success(language === 'he' ? 'ה-PDF הורד בהצלחה!' : 'PDF downloaded!');
  };

  // Save CV to profile (storage)
  const handleSaveToProfile = async () => {
    if (!exportedPdfBlob || !user) return;
    
    setIsSavingToProfile(true);
    try {
      // Upload PDF to storage
      const fileName = `${user.id}/${Date.now()}_cv.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('generated-cvs')
        .upload(fileName, exportedPdfBlob, {
          contentType: 'application/pdf',
          upsert: true,
        });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('generated-cvs')
        .getPublicUrl(fileName);
      
      setSavedCVUrl(publicUrl);
      toast.success(language === 'he' ? 'קורות החיים נשמרו לפרופיל!' : 'CV saved to profile!');
    } catch (error) {
      console.error('Save to profile error:', error);
      toast.error(language === 'he' ? 'שגיאה בשמירה' : 'Error saving');
    } finally {
      setIsSavingToProfile(false);
    }
  };

  // Handle import wizard completion
  const handleImportComplete = (importedData: CVData) => {
    setCvData(importedData);
    saveToDatabase(importedData);
  };

  // Handle AI Design generation
  const handleAIDesignGenerated = (html: string, css: string) => {
    setGeneratedHtml(html);
    setGeneratedCss(css);
    setShowAIDesignPreview(true);
  };

  // Get current template component
  const currentTemplate = getTemplateById(cvData.settings.templateId);
  const TemplateComponent = currentTemplate?.component;

  if (isLoadingResume) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Skeleton header */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
          <Skeleton className="h-6 w-40" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        {/* Skeleton body — editor + preview */}
        <div className="flex-1 flex">
          <div className="w-2/5 border-e p-4 space-y-4">
            <Skeleton className="h-10 w-full rounded-lg" />
            <div className="space-y-3">
              <Skeleton className="h-8 w-3/4" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div className="flex-1 p-6 flex justify-center bg-muted/30">
            <Skeleton className="w-[210mm] max-w-full h-[500px] rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  const hasRealCvContent =
    cvData.experience.length > 0 ||
    cvData.education.length > 0 ||
    (cvData.personalInfo.summary?.trim().length ?? 0) > 30 ||
    cvData.skills.technical.length > 0;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col" data-tour="cv-builder">
      {/* Mobile Warning Dialog */}
      <Dialog open={showMobileWarning} onOpenChange={setShowMobileWarning}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full bg-amber-500/10">
                <Monitor className="w-9 h-9 text-amber-500" />
              </div>
            </div>
            <DialogTitle className="text-center text-lg">
              {language === 'he' ? '🖥️ רגע, לא ככה...' : '🖥️ Hold on, not like this...'}
            </DialogTitle>
            <DialogDescription className="text-center mt-2 leading-relaxed">
              {language === 'he'
                ? 'בניית קורות חיים על מובייל זה כמו לנסות לצייר מונה ליזה על מפית — טכנית אפשרי, אבל התוצאה... 😅'
                : 'Building a CV on mobile is like painting the Mona Lisa on a napkin — technically possible, but the result... 😅'}
            </DialogDescription>
            <p className="text-center text-sm text-muted-foreground mt-2">
              {language === 'he'
                ? '💡 פתח את PLUG על מחשב נייד או טאבלט לחוויה הטובה ביותר'
                : '💡 Open PLUG on a laptop or tablet for the best experience'}
            </p>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col mt-2">
            <Button onClick={handleContinueToView} className="w-full">
              {language === 'he' ? 'צפה בתצוגה מקדימה' : 'View Preview'}
            </Button>
            <Button
              variant="ghost"
              className="w-full text-muted-foreground text-sm"
              onClick={() => setShowMobileWarning(false)}
            >
              {language === 'he' ? 'המשך בכל זאת (לא מומלץ)' : 'Continue Anyway (not recommended)'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog - Using Template Rendering */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col min-h-0">
          <DialogHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  {language === 'he' ? 'צפיה מראש' : 'Preview CV'}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {language === 'he' 
                    ? 'קורות החיים שלך מוכנים להורדה או שמירה לפרופיל'
                    : 'Your CV is ready for download or saving to your profile'}
                </DialogDescription>
              </div>
              
              {/* Action buttons in header - prominent placement */}
              <div className="flex flex-wrap gap-2 shrink-0">
                {/* Save to Profile */}
                <Button 
                  variant="outline" 
                  onClick={handleSaveToProfile} 
                  disabled={isSavingToProfile || !!savedCVUrl || isExporting || !exportedPdfBlob}
                  className="gap-2"
                  size="sm"
                >
                  {isSavingToProfile ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : savedCVUrl ? (
                    <CheckCircle className="w-4 h-4 text-accent" />
                  ) : (
                    <UploadIcon className="w-4 h-4" />
                  )}
                  {language === 'he' ? 'שמור לפרופיל' : 'Save to Profile'}
                </Button>

                {/* Download as PDF */}
                <Button 
                  onClick={handleDownloadPDF} 
                  disabled={isExporting || !exportedPdfBlob}
                  className="gap-2"
                  size="sm"
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {isExporting 
                    ? (language === 'he' ? 'מייצר...' : 'Generating...') 
                    : (language === 'he' ? 'הורד PDF' : 'Download PDF')}
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 min-h-0 overflow-auto bg-muted/30 rounded-lg p-4 min-h-[500px] max-h-[60vh] relative">
            {/* Scrollable container for the preview */}
            <div className="flex justify-center">
              {/* Render the template for preview - always visible for ref capture */}
              <div
                ref={cvRenderRef}
                className="shadow-xl overflow-hidden"
                style={{
                  width: cvData.settings.orientation === 'landscape' ? '297mm' : '210mm',
                  minHeight: cvData.settings.orientation === 'landscape' ? '210mm' : '297mm',
                  position: 'relative',
                  backgroundColor: 'white',
                  fontFamily: fontFamilies[cvData.settings.fontFamily]?.stack || "'Inter', sans-serif",
                  transform: 'scale(0.45)',
                  transformOrigin: 'top center',
                  marginBottom: '-40%',
                  ...getBackgroundCSS(cvData.settings.backgroundPattern ?? 'none', cvData.settings.accentColor),
                }}
              >
                <BackgroundOverlay
                  pattern={cvData.settings.backgroundPattern ?? 'none'}
                  accentColor={cvData.settings.accentColor}
                />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  {TemplateComponent && <TemplateComponent data={cvData} scale={1} />}
                </div>
                <PlugWatermark />
              </div>
            </div>
            
            {/* Overlay loading indicator */}
            {isExporting && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm rounded-lg z-10">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-muted-foreground mt-3">
                  {language === 'he' ? 'מייצר PDF...' : 'Generating PDF...'}
                </p>
              </div>
            )}
          </div>

          {savedCVUrl && (
            <div className="flex items-center gap-2 p-3 bg-accent/10 rounded-lg border border-accent/20">
              <CheckCircle className="w-4 h-4 text-accent" />
              <span className="text-sm text-accent">
                {language === 'he' ? 'נשמר לפרופיל!' : 'Saved to profile!'}
              </span>
            </div>
          )}
          
          <DialogFooter className="pt-4 border-t shrink-0">
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              {language === 'he' ? 'סגור' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Wizard */}
      <CVImportWizard
        open={showImportWizard}
        onOpenChange={(open) => {
          setShowImportWizard(open);
          if (!open) setPreloadedFile(undefined);
        }}
        onComplete={(data) => {
          handleImportComplete(data);
          setSkipWelcome(true);   // after import, show the editor
        }}
        currentData={cvData}
        preloadedFile={preloadedFile}
      />

      {/* AI Design Dialog */}
      <AIDesignDialog
        open={showAIDesignDialog}
        onOpenChange={setShowAIDesignDialog}
        cvData={cvData}
        onDesignGenerated={handleAIDesignGenerated}
      />

      {/* AI Design Preview */}
      <AIDesignPreview
        open={showAIDesignPreview}
        onOpenChange={setShowAIDesignPreview}
        html={generatedHtml}
        css={generatedCss}
        cvData={cvData}
      />

      {/* Credit Cost Banner */}
      <div className="px-4 pt-2">
        <CreditCostBanner 
          action="CV_BUILDER"
          description={language === 'he' 
            ? 'בניית קורות חיים מקצועיים עם AI'
            : 'Build professional CVs with AI assistance'}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold">
            {language === 'he' ? 'בונה קורות חיים' : 'CV Builder'}
          </h1>
          {viewOnlyMode && (
            <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 px-2 py-0.5 rounded">
              {language === 'he' ? 'תצוגה בלבד' : 'View Only'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isSaving ? (
              <>
                <Save className="w-4 h-4 animate-pulse" />
                {language === 'he' ? 'שומר...' : 'Saving...'}
              </>
            ) : lastSaved ? (
              <>
                <CheckCircle className="w-4 h-4 text-accent" />
                {language === 'he' ? 'נשמר' : 'Saved'}
              </>
            ) : null}
          </div>
          
          {/* Import Button */}
          <Button variant="outline" onClick={() => setShowImportWizard(true)} className="gap-2">
            <Sparkles className="w-4 h-4" />
            {language === 'he' ? 'ייבוא חכם' : 'Smart Import'}
          </Button>
          
          {/* AI Design Button */}
          <Button variant="outline" onClick={() => setShowAIDesignDialog(true)} className="gap-2 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30 hover:border-primary/50">
            <Wand2 className="w-4 h-4 text-primary" />
            {language === 'he' ? 'עיצוב AI' : 'AI Design'}
          </Button>
          
          {/* Preview Button */}
          <Button onClick={handleExportClick} className="gap-2">
            <FileText className="w-4 h-4" />
            {language === 'he' ? 'צפיה מראש' : 'Preview'}
          </Button>
        </div>
      </div>

      {/* Main Content - Welcome screen when CV is empty, otherwise editor/preview */}
      {!isLoadingResume && !skipWelcome && !hasRealCvContent ? (
        <CVWelcomeScreen
          onFileSelected={(file) => {
            setPreloadedFile(file);
            setShowImportWizard(true);
          }}
          onStartFresh={() => setSkipWelcome(true)}
        />
      ) : isMobile ? (
        // Mobile: Show only preview if in view-only mode
        viewOnlyMode ? (
          <div className="flex-1 overflow-hidden">
            <CVPreviewPanel data={cvData} onChange={handleDataChange} onOpenAIDesign={() => setShowAIDesignDialog(true)} />
          </div>
        ) : (
          // Mobile: Vertical layout - Editor on top, Preview on bottom
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="h-1/2 border-b overflow-hidden">
              <CVEditorPanel data={cvData} onChange={handleDataChange} />
            </div>
            <div className="h-1/2 overflow-hidden">
              <CVPreviewPanel data={cvData} onChange={handleDataChange} onOpenAIDesign={() => setShowAIDesignDialog(true)} />
            </div>
          </div>
        )
      ) : (
        // Desktop: Horizontal resizable layout
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          <ResizablePanel defaultSize={40} minSize={30}>
            <CVEditorPanel data={cvData} onChange={handleDataChange} />
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={60} minSize={40}>
            <CVPreviewPanel data={cvData} onChange={handleDataChange} onOpenAIDesign={() => setShowAIDesignDialog(true)} />
          </ResizablePanel>
        </ResizablePanelGroup>
      )}

      </div>
  );
};
