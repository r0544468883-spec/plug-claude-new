import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Share2, Loader2, Users, Sparkles, Link2, CheckCircle2, Building2, MapPin, Briefcase, Layers, GraduationCap, FileText, Plus, Send } from 'lucide-react';

interface ShareJobFormProps {
  trigger?: React.ReactNode;
}

interface ScrapedJob {
  company_name: string;
  job_title: string;
  location?: string;
  job_type?: string;
  salary_range?: string;
  description?: string;
  requirements?: string;
  detected_field_slug?: string;
  detected_experience_level_slug?: string;
  field_id?: string;
  experience_level_id?: string;
}

const fieldLabels: Record<string, { en: string; he: string }> = {
  'tech': { en: 'Hi-Tech & IT', he: 'הייטק ו-IT' },
  'marketing': { en: 'Marketing', he: 'שיווק' },
  'sales': { en: 'Sales', he: 'מכירות' },
  'finance': { en: 'Finance', he: 'פיננסים' },
  'engineering': { en: 'Engineering', he: 'הנדסה' },
  'hr': { en: 'HR', he: 'משאבי אנוש' },
  'management': { en: 'Management', he: 'ניהול' },
  'customer-service': { en: 'Customer Service', he: 'שירות לקוחות' },
  'design': { en: 'Design', he: 'עיצוב' },
  'data': { en: 'Data', he: 'דאטה' },
  'healthcare': { en: 'Healthcare', he: 'בריאות' },
  'education': { en: 'Education', he: 'חינוך' },
  'legal': { en: 'Legal', he: 'משפטים' },
};

const expLevelLabels: Record<string, { en: string; he: string }> = {
  'entry': { en: 'Entry Level', he: 'ללא ניסיון' },
  'junior': { en: 'Junior', he: 'ג׳וניור' },
  'mid': { en: 'Mid-Level', he: 'בינוני' },
  'senior': { en: 'Senior', he: 'סניור' },
  'lead': { en: 'Lead', he: 'ליד' },
  'executive': { en: 'Executive', he: 'מנהל בכיר' },
};

export function ShareJobForm({ trigger }: ShareJobFormProps) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const isHebrew = language === 'he';

  const [activeTab, setActiveTab] = useState<'url' | 'paste'>('url');
  const [jobUrl, setJobUrl] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [scrapedJob, setScrapedJob] = useState<ScrapedJob | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showQuickApply, setShowQuickApply] = useState(false);
  const [lastSharedJobId, setLastSharedJobId] = useState<string | null>(null);

  // Analyze URL with Plug AI
  const analyzeUrl = async () => {
    if (!jobUrl) {
      toast.error(isHebrew ? 'אנא הזן קישור למשרה' : 'Please enter a job URL');
      return;
    }

    setIsAnalyzing(true);
    setScrapedJob(null);

    try {
      const { data, error } = await supabase.functions.invoke('scrape-job', {
        body: { url: jobUrl },
      });

      if (error) throw error;

      if (data?.success && data?.job) {
        setScrapedJob(data.job);
        toast.success(isHebrew ? 'Plug ניתח את המשרה בהצלחה!' : 'Plug analyzed the job successfully!');
      } else {
        throw new Error(data?.error || 'Failed to analyze');
      }
    } catch (error: any) {
      console.error('Error analyzing URL:', error);
      toast.error(isHebrew ? 'שגיאה בניתוח הקישור. נסה שוב.' : 'Error analyzing URL. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Analyze pasted text with Plug AI
  const analyzePastedText = async () => {
    if (!pastedText.trim()) {
      toast.error(isHebrew ? 'אנא הדבק את תיאור המשרה' : 'Please paste job description');
      return;
    }

    setIsAnalyzing(true);
    setScrapedJob(null);

    try {
      const { data, error } = await supabase.functions.invoke('scrape-job', {
        body: { 
          url: 'paste://manual-entry',
          pastedContent: pastedText.trim()
        },
      });

      if (error) throw error;

      if (data?.success && data?.job) {
        setScrapedJob(data.job);
        toast.success(isHebrew ? 'Plug ניתח את המשרה בהצלחה!' : 'Plug analyzed the job successfully!');
      } else {
        throw new Error(data?.error || 'Failed to analyze');
      }
    } catch (error: any) {
      console.error('Error analyzing pasted text:', error);
      toast.error(isHebrew ? 'שגיאה בניתוח הטקסט. נסה שוב.' : 'Error analyzing text. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Share the scraped job with community - now saves taxonomy IDs
  const shareJobMutation = useMutation({
    mutationFn: async () => {
      if (!user || !scrapedJob) throw new Error('Missing data');

      // Find or create company using service role via edge function
      const { data: shareData, error: shareError } = await supabase.functions.invoke('scrape-job', {
        body: {
          url: jobUrl || 'paste://manual-entry',
          pastedContent: activeTab === 'paste' ? pastedText : undefined,
          save: false,
          community_share: true,
          user_id: user.id,
        },
      });

      // Find or create company
      let companyId: string | null = null;
      
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id')
        .ilike('name', scrapedJob.company_name)
        .maybeSingle();

      if (existingCompany) {
        companyId = existingCompany.id;
      } else {
        // Try to insert company - will fail if user doesn't have permission
        const { data: newCompany, error: companyError } = await supabase
          .from('companies')
          .insert({
            name: scrapedJob.company_name,
          })
          .select('id')
          .single();

        if (!companyError && newCompany) {
          companyId = newCompany.id;
        }
      }

      // Create job with community sharing flag and taxonomy IDs
      const { data: newJob, error: jobError } = await supabase.from('jobs').insert({
        title: scrapedJob.job_title,
        company_id: companyId,
        location: scrapedJob.location || null,
        job_type: scrapedJob.job_type || null,
        salary_range: scrapedJob.salary_range || null,
        description: scrapedJob.description || null,
        requirements: scrapedJob.requirements || null,
        source_url: activeTab === 'url' ? jobUrl : null,
        shared_by_user_id: user.id,
        is_community_shared: true,
        status: 'active',
        field_id: scrapedJob.field_id || null,
        experience_level_id: scrapedJob.experience_level_id || null,
        category: scrapedJob.detected_field_slug || null,
      }).select('id').single();

      if (jobError) throw jobError;

      return newJob?.id;
    },
    onSuccess: (jobId) => {
      toast.success(isHebrew ? 'המשרה שותפה בהצלחה עם הקהילה! 🎉' : 'Job shared with the community! 🎉');
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setLastSharedJobId(jobId || null);
      setShowQuickApply(true);
    },
    onError: (error: Error) => {
      console.error('Share job error:', error);
      toast.error(isHebrew ? 'שגיאה בשיתוף המשרה' : 'Failed to share job');
    },
  });

  // Quick apply to the shared job
  const quickApplyMutation = useMutation({
    mutationFn: async () => {
      if (!user || !lastSharedJobId) throw new Error('Missing data');

      const { error } = await supabase.from('applications').insert({
        job_id: lastSharedJobId,
        candidate_id: user.id,
        status: 'active',
        current_stage: 'applied',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isHebrew ? 'נוספת בהצלחה למועמדויות שלך! 🎯' : 'Added to your applications! 🎯');
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      handleClose();
    },
    onError: (error: Error) => {
      console.error('Quick apply error:', error);
      toast.error(isHebrew ? 'שגיאה בהוספה למועמדויות' : 'Failed to add to applications');
    },
  });

  const handleClose = () => {
    setOpen(false);
    setJobUrl('');
    setPastedText('');
    setScrapedJob(null);
    setShowQuickApply(false);
    setLastSharedJobId(null);
    setActiveTab('url');
  };

  const getFieldLabel = (slug?: string) => {
    if (!slug || !fieldLabels[slug]) return null;
    return isHebrew ? fieldLabels[slug].he : fieldLabels[slug].en;
  };

  const getExpLevelLabel = (slug?: string) => {
    if (!slug || !expLevelLabels[slug]) return null;
    return isHebrew ? expLevelLabels[slug].he : expLevelLabels[slug].en;
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
      else setOpen(true);
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2 bg-primary hover:bg-primary/90" data-tour="share-job">
            <Share2 className="h-4 w-4" />
            {isHebrew ? 'שתף משרה' : 'Share Job'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {isHebrew ? 'שתף משרה עם הקהילה' : 'Share a Job with the Community'}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Users className="w-3 h-3" />
              {isHebrew ? 'המשרה תהיה זמינה לכל המשתמשים' : 'Job will be available to all users'}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        {/* Quick Apply Success Screen */}
        {showQuickApply && (
          <div className="space-y-4">
            <Card className="border-green-500/30 bg-green-500/5">
              <CardContent className="p-4 text-center space-y-4">
                <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
                <div>
                  <h3 className="font-semibold text-lg">
                    {isHebrew ? 'המשרה שותפה בהצלחה!' : 'Job shared successfully!'}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isHebrew ? 'האם ברצונך להוסיף את המשרה למועמדויות שלך?' : 'Would you like to add this job to your applications?'}
                  </p>
                </div>
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={() => quickApplyMutation.mutate()}
                    disabled={quickApplyMutation.isPending}
                    className="gap-2"
                  >
                    {quickApplyMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    {isHebrew ? 'הוסף למועמדויות שלי' : 'Add to My Applications'}
                  </Button>
                  <Button variant="outline" onClick={handleClose}>
                    {isHebrew ? 'סגור' : 'Close'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Form */}
        {!showQuickApply && (
          <div className="space-y-6">
            {/* Tabs for URL or Paste */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'url' | 'paste')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="url" className="gap-2">
                  <Link2 className="w-4 h-4" />
                  {isHebrew ? 'קישור' : 'URL'}
                </TabsTrigger>
                <TabsTrigger value="paste" className="gap-2">
                  <FileText className="w-4 h-4" />
                  {isHebrew ? 'הדבק טקסט' : 'Paste Text'}
                </TabsTrigger>
              </TabsList>

              {/* URL Tab */}
              <TabsContent value="url" className="space-y-3 mt-4">
                <Label className="flex items-center gap-2 text-base font-medium">
                  <Link2 className="w-4 h-4 text-primary" />
                  {isHebrew ? 'הכנס קישור למשרה' : 'Enter Job URL'}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {isHebrew 
                    ? '✨ פשוט הדבק את הקישור ו-Plug יעשה את השאר!'
                    : '✨ Just plug the link and Plug will do the rest!'}
                </p>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    value={jobUrl}
                    onChange={(e) => setJobUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1"
                    disabled={isAnalyzing}
                  />
                  <Button 
                    onClick={analyzeUrl} 
                    disabled={isAnalyzing || !jobUrl}
                    variant="secondary"
                    className="gap-2"
                  >
                    {isAnalyzing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    {isHebrew ? 'נתח' : 'Analyze'}
                  </Button>
                </div>
              </TabsContent>

              {/* Paste Text Tab */}
              <TabsContent value="paste" className="space-y-3 mt-4">
                <Label className="flex items-center gap-2 text-base font-medium">
                  <FileText className="w-4 h-4 text-primary" />
                  {isHebrew ? 'הדבק תיאור משרה' : 'Paste Job Description'}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {isHebrew 
                    ? '📋 העתק את תיאור המשרה מלינקדין, AllJobs או כל מקור אחר'
                    : '📋 Copy the job description from LinkedIn, AllJobs, or any source'}
                </p>
                <Textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder={isHebrew 
                    ? 'הדבק כאן את תיאור המשרה...'
                    : 'Paste job description here...'}
                  className="min-h-[150px]"
                  disabled={isAnalyzing}
                />
                <Button 
                  onClick={analyzePastedText} 
                  disabled={isAnalyzing || !pastedText.trim()}
                  variant="secondary"
                  className="w-full gap-2"
                >
                  {isAnalyzing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {isHebrew ? 'נתח עם Plug AI' : 'Analyze with Plug AI'}
                </Button>
              </TabsContent>
            </Tabs>

            {/* Analyzing State */}
            {isAnalyzing && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  <div>
                    <p className="font-medium text-primary">
                      {isHebrew ? 'Plug מנתח את המשרה...' : 'Plug is analyzing the job...'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isHebrew ? 'זה יקח רק כמה שניות' : 'This will only take a few seconds'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Show Scraped Results */}
            {scrapedJob && (
              <Card className="border-green-500/30 bg-green-500/5">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-medium">
                      {isHebrew ? 'Plug מצא את הפרטים!' : 'Plug found the details!'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Briefcase className="w-4 h-4 text-muted-foreground mt-1" />
                      <div>
                        <p className="font-medium">{scrapedJob.job_title}</p>
                        <p className="text-sm text-muted-foreground">
                          {isHebrew ? 'תפקיד' : 'Position'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Building2 className="w-4 h-4 text-muted-foreground mt-1" />
                      <div>
                        <p className="font-medium">{scrapedJob.company_name || (isHebrew ? 'לא זוהתה חברה' : 'Company not detected')}</p>
                        <p className="text-sm text-muted-foreground">
                          {isHebrew ? 'חברה' : 'Company'}
                        </p>
                      </div>
                    </div>

                    {scrapedJob.location && (
                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                        <div>
                          <p className="font-medium">{scrapedJob.location}</p>
                          <p className="text-sm text-muted-foreground">
                            {isHebrew ? 'מיקום' : 'Location'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Taxonomy badges */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {scrapedJob.job_type && (
                        <Badge variant="secondary">
                          {scrapedJob.job_type}
                        </Badge>
                      )}
                      
                      {scrapedJob.detected_field_slug && (
                        <Badge className="gap-1 bg-blue-500/20 text-blue-700 border-blue-500/30">
                          <Layers className="w-3 h-3" />
                          {getFieldLabel(scrapedJob.detected_field_slug)}
                        </Badge>
                      )}
                      
                      {scrapedJob.detected_experience_level_slug && (
                        <Badge className="gap-1 bg-purple-500/20 text-purple-700 border-purple-500/30">
                          <GraduationCap className="w-3 h-3" />
                          {getExpLevelLabel(scrapedJob.detected_experience_level_slug)}
                        </Badge>
                      )}
                    </div>

                    {scrapedJob.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3 pt-2">
                        {scrapedJob.description}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Share Button */}
            <Button
              onClick={() => shareJobMutation.mutate()}
              disabled={!scrapedJob || shareJobMutation.isPending}
              className="w-full gap-2"
              size="lg"
            >
              {shareJobMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Share2 className="h-4 w-4" />
                  {isHebrew ? 'שתף משרה עם הקהילה' : 'Share Job with Community'}
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
