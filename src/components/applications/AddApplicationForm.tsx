import { useState } from 'react';
import { Link2, Loader2, Sparkles, Check, X, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ManualApplicationForm } from './ManualApplicationForm';
import { PartialJobCompleteDialog } from './PartialJobCompleteDialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface JobPreview {
  company_name: string;
  job_title: string;
  location?: string;
  job_type?: string;
  salary_range?: string;
  description?: string;
  requirements?: string;
  source_url: string;
}

interface AddApplicationFormProps {
  onApplicationAdded: () => void;
}

const AddApplicationForm = ({ onApplicationAdded }: AddApplicationFormProps) => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<JobPreview | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  
  // Partial completion dialog state
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [partialData, setPartialData] = useState<JobPreview | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  const isRTL = language === 'he';

  const handleScrape = async () => {
    if (!url.trim()) {
      toast({
        title: isRTL ? 'נא להזין קישור' : 'Please enter a URL',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setPreview(null);

    try {
      const { data, error } = await supabase.functions.invoke('scrape-job', {
        body: { url: url.trim() },
      });

      if (error) throw error;

      if (data.error) {
        // Check if manual entry is required
        if (data.requiresManualEntry) {
          setShowManualForm(true);
          toast({
            title: isRTL ? 'נדרשת הזנה ידנית' : 'Manual entry required',
            description: isRTL ? 'לא הצלחנו לקרוא את הדף. אנא הזן את הפרטים ידנית.' : "Couldn't read the page. Please enter details manually.",
          });
          return;
        }
        toast({
          title: isRTL ? 'שגיאה' : 'Error',
          description: data.error,
          variant: 'destructive',
        });
        return;
      }

      // Check if completion is required
      if (data.requiresCompletion && data.missingFields?.length > 0) {
        setPartialData(data.job);
        setMissingFields(data.missingFields);
        setShowCompleteDialog(true);
        return;
      }

      setPreview(data.job);
    } catch (error) {
      console.error('Scrape error:', error);
      toast({
        title: isRTL ? 'שגיאה בקריאת הדף' : 'Error reading page',
        description: isRTL ? 'נסה שוב או הוסף ידנית' : 'Try again or add manually',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!preview || !user) return;

    setIsSaving(true);

    try {
      const { data, error } = await supabase.functions.invoke('scrape-job', {
        body: { 
          url: preview.source_url,
          save: true,
          user_id: user.id
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: isRTL ? 'המועמדות נוספה!' : 'Application added!',
        description: isRTL ? `${preview.job_title} ב-${preview.company_name}` : `${preview.job_title} at ${preview.company_name}`,
      });

      setUrl('');
      setPreview(null);
      onApplicationAdded();

    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: isRTL ? 'שגיאה בשמירה' : 'Error saving',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompletePartialJob = async (completedData: Partial<JobPreview>) => {
    if (!user || !partialData) return;

    setIsSaving(true);

    try {
      // Use manual endpoint with the completed data
      const { data, error } = await supabase.functions.invoke('scrape-job', {
        body: {
          manual: true,
          user_id: user.id,
          company_name: completedData.company_name || partialData.company_name,
          job_title: completedData.job_title || partialData.job_title,
          location: partialData.location || null,
          job_type: partialData.job_type || null,
          description: partialData.description || null,
          source_url: partialData.source_url || url,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: isRTL ? 'המועמדות נוספה!' : 'Application added!',
        description: isRTL 
          ? `${completedData.job_title || partialData.job_title} ב-${completedData.company_name || partialData.company_name}` 
          : `${completedData.job_title || partialData.job_title} at ${completedData.company_name || partialData.company_name}`,
      });

      setUrl('');
      setPartialData(null);
      setMissingFields([]);
      setShowCompleteDialog(false);
      onApplicationAdded();

    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: isRTL ? 'שגיאה בשמירה' : 'Error saving',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setPreview(null);
    setUrl('');
  };

  const handleManualFormSuccess = () => {
    setShowManualForm(false);
    onApplicationAdded();
  };

  // Show manual form
  if (showManualForm) {
    return (
      <ManualApplicationForm
        onApplicationAdded={handleManualFormSuccess}
        onCancel={() => setShowManualForm(false)}
      />
    );
  }

  return (
    <>
      <div className="space-y-4" data-tour="add-application">
        {/* URL Input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link2 className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={isRTL ? 'הדבק לינק למשרה...' : 'Paste job URL...'}
              className={`${isRTL ? 'pr-10 text-right' : 'pl-10'} bg-secondary/50 border-border focus:border-primary`}
              dir={isRTL ? 'rtl' : 'ltr'}
              onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
            />
          </div>
          <Button 
            onClick={handleScrape} 
            disabled={isLoading || !url.trim()}
            className="gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {isRTL ? 'נתח' : 'Analyze'}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowManualForm(true)}
            className="gap-2"
            title={isRTL ? 'הוספה ידנית' : 'Add manually'}
          >
            <PenLine className="h-4 w-4" />
          </Button>
        </div>

        {/* Manual add hint */}
        <p className="text-xs text-muted-foreground text-center">
          {isRTL ? 'או ' : 'or '}
          <button
            onClick={() => setShowManualForm(true)}
            className="text-primary hover:underline"
          >
            {isRTL ? 'הוסף ידנית' : 'add manually'}
          </button>
        </p>

        {/* Loading state */}
        {isLoading && (
          <Card className="border-accent/30 bg-accent/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-accent" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {isRTL ? 'פלאג מנתח את המשרה...' : 'Plug is analyzing the job...'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'זה לוקח כמה שניות' : 'This takes a few seconds'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Preview */}
        {preview && (
          <Card className="border-primary/30 bg-primary/5 overflow-hidden">
            <CardContent className="p-4 space-y-3">
              {/* Header with title and close button */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg text-foreground truncate">{preview.job_title}</h3>
                  <p className="text-primary font-medium">{preview.company_name}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancel}
                  className="text-muted-foreground hover:text-destructive shrink-0 -mt-1 -mr-2"
                  title={isRTL ? 'סגור' : 'Close'}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                {preview.location && (
                  <span className="bg-secondary/50 px-2 py-1 rounded">📍 {preview.location}</span>
                )}
                {preview.job_type && (
                  <span className="bg-secondary/50 px-2 py-1 rounded">💼 {preview.job_type}</span>
                )}
                {preview.salary_range && (
                  <span className="bg-secondary/50 px-2 py-1 rounded">💰 {preview.salary_range}</span>
                )}
              </div>

              {/* Description - always scrollable */}
              {preview.description && (
                <div className="border border-border/50 rounded-lg overflow-hidden">
                  <ScrollArea className="h-32 md:h-40">
                    <div className="p-3 space-y-3 text-sm text-muted-foreground">
                      <div>
                        <p className="font-medium text-foreground mb-1">{isRTL ? 'תיאור:' : 'Description:'}</p>
                        <p className="whitespace-pre-wrap leading-relaxed">{preview.description}</p>
                      </div>
                      {preview.requirements && (
                        <div>
                          <p className="font-medium text-foreground mb-1">{isRTL ? 'דרישות:' : 'Requirements:'}</p>
                          <p className="whitespace-pre-wrap leading-relaxed">{preview.requirements}</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}


              {/* Save button */}
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full gap-2"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {isRTL ? 'הוסף מועמדות' : 'Add Application'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Partial completion dialog */}
      <PartialJobCompleteDialog
        open={showCompleteDialog}
        onOpenChange={(open) => {
          setShowCompleteDialog(open);
          if (!open) {
            setPartialData(null);
            setMissingFields([]);
          }
        }}
        partialData={partialData || {}}
        missingFields={missingFields}
        onComplete={handleCompletePartialJob}
        isSubmitting={isSaving}
      />
    </>
  );
};

export default AddApplicationForm;
