import { useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { parseFile, parseTextContent, validateJobUrls, SUPPORTED_FILE_TYPES, isSupportedFileType } from '@/lib/excel-parser';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Upload, 
  FileSpreadsheet, 
  Link2, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

interface ImportResult {
  url: string;
  status: 'success' | 'error' | 'pending';
  job?: { id: string; title: string; company: string };
  error?: string;
}

type ImportState = 'input' | 'processing' | 'complete';

export function BulkImportDialog({ open, onOpenChange, onComplete }: BulkImportDialogProps) {
  const { language } = useLanguage();
  const isRTL = language === 'he';
  
  const [state, setState] = useState<ImportState>('input');
  const [urls, setUrls] = useState<string[]>([]);
  const [pastedText, setPastedText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  
  // Options
  const [shareToComm, setShareToComm] = useState(true);
  const [addToApplications, setAddToApplications] = useState(true);
  const [markAsApplied, setMarkAsApplied] = useState(true);
  
  // Processing state
  const [results, setResults] = useState<ImportResult[]>([]);
  const [progress, setProgress] = useState(0);
  
  const resetState = useCallback(() => {
    setState('input');
    setUrls([]);
    setPastedText('');
    setFileName(null);
    setResults([]);
    setProgress(0);
  }, []);
  
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!isSupportedFileType(file)) {
      toast.error(isRTL ? 'סוג קובץ לא נתמך' : 'Unsupported file type');
      return;
    }
    
    try {
      const extractedUrls = await parseFile(file);
      const { valid, invalid } = validateJobUrls(extractedUrls);
      
      setUrls(valid);
      setFileName(file.name);
      
      if (invalid.length > 0) {
        toast.warning(
          isRTL 
            ? `${invalid.length} לינקים לא תקינים הוסרו`
            : `${invalid.length} invalid URLs removed`
        );
      }
      
      toast.success(
        isRTL 
          ? `נמצאו ${valid.length} לינקים`
          : `Found ${valid.length} URLs`
      );
    } catch (error) {
      toast.error(isRTL ? 'שגיאה בקריאת הקובץ' : 'Error reading file');
      console.error('File parse error:', error);
    }
  }, [isRTL]);
  
  const handleTextParse = useCallback(() => {
    if (!pastedText.trim()) return;
    
    const extractedUrls = parseTextContent(pastedText);
    const { valid, invalid } = validateJobUrls(extractedUrls);
    
    setUrls(valid);
    
    if (valid.length === 0) {
      toast.error(isRTL ? 'לא נמצאו לינקים תקינים' : 'No valid URLs found');
    } else {
      toast.success(
        isRTL 
          ? `נמצאו ${valid.length} לינקים`
          : `Found ${valid.length} URLs`
      );
    }
  }, [pastedText, isRTL]);
  
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    
    if (!isSupportedFileType(file)) {
      toast.error(isRTL ? 'סוג קובץ לא נתמך' : 'Unsupported file type');
      return;
    }
    
    try {
      const extractedUrls = await parseFile(file);
      const { valid } = validateJobUrls(extractedUrls);
      setUrls(valid);
      setFileName(file.name);
      toast.success(isRTL ? `נמצאו ${valid.length} לינקים` : `Found ${valid.length} URLs`);
    } catch (error) {
      toast.error(isRTL ? 'שגיאה בקריאת הקובץ' : 'Error reading file');
    }
  }, [isRTL]);
  
  const handleStartImport = useCallback(async () => {
    if (urls.length === 0) {
      toast.error(isRTL ? 'אין לינקים לייבוא' : 'No URLs to import');
      return;
    }
    
    setState('processing');
    setResults(urls.map(url => ({ url, status: 'pending' })));
    setProgress(0);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error(isRTL ? 'יש להתחבר תחילה' : 'Please login first');
        setState('input');
        return;
      }
      
      // Call bulk import edge function
      const { data, error } = await supabase.functions.invoke('bulk-import-jobs', {
        body: {
          urls,
          addToApplications,
          markAsApplied,
          shareToComm
        }
      });
      
      if (error) throw error;
      
      setResults(data.results || []);
      setProgress(100);
      setState('complete');
      
      const successCount = data.results?.filter((r: ImportResult) => r.status === 'success').length || 0;
      const failCount = data.results?.filter((r: ImportResult) => r.status === 'error').length || 0;
      
      if (successCount > 0) {
        toast.success(
          isRTL 
            ? `${successCount} משרות יובאו בהצלחה!`
            : `${successCount} jobs imported successfully!`
        );
        onComplete();
      }
      
      if (failCount > 0) {
        toast.warning(
          isRTL 
            ? `${failCount} משרות נכשלו`
            : `${failCount} jobs failed`
        );
      }
      
    } catch (error) {
      console.error('Bulk import error:', error);
      toast.error(isRTL ? 'שגיאה ביבוא המשרות' : 'Error importing jobs');
      setState('input');
    }
  }, [urls, addToApplications, markAsApplied, shareToComm, isRTL, onComplete]);
  
  const handleClose = useCallback(() => {
    resetState();
    onOpenChange(false);
  }, [resetState, onOpenChange]);
  
  const successCount = results.filter(r => r.status === 'success').length;
  const failCount = results.filter(r => r.status === 'error').length;
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            {isRTL ? 'יבוא מרובה של משרות' : 'Bulk Import Jobs'}
          </DialogTitle>
        </DialogHeader>
        
        {state === 'input' && (
          <div className="space-y-4">
            <Tabs defaultValue="file" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="file" className="gap-2">
                  <Upload className="w-4 h-4" />
                  {isRTL ? 'קובץ' : 'File'}
                </TabsTrigger>
                <TabsTrigger value="paste" className="gap-2">
                  <Link2 className="w-4 h-4" />
                  {isRTL ? 'הדבק לינקים' : 'Paste Links'}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="file" className="space-y-4">
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  <input
                    id="file-input"
                    type="file"
                    accept={SUPPORTED_FILE_TYPES}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {isRTL 
                      ? 'גרור קובץ לכאן או לחץ לבחירה'
                      : 'Drag file here or click to select'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isRTL ? 'תומך: Excel, CSV, TXT' : 'Supports: Excel, CSV, TXT'}
                  </p>
                </div>
                
                {fileName && (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span className="text-sm">{fileName}</span>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="paste" className="space-y-4">
                <Textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder={isRTL 
                    ? 'הדבק לינקים כאן (אחד בכל שורה)...\n\nhttps://linkedin.com/jobs/123\nhttps://alljobs.co.il/job/456'
                    : 'Paste links here (one per line)...\n\nhttps://linkedin.com/jobs/123\nhttps://alljobs.co.il/job/456'}
                  className="min-h-[150px] font-mono text-sm"
                />
                <Button 
                  onClick={handleTextParse} 
                  variant="outline" 
                  className="w-full"
                  disabled={!pastedText.trim()}
                >
                  {isRTL ? 'חלץ לינקים' : 'Extract URLs'}
                </Button>
              </TabsContent>
            </Tabs>
            
            {urls.length > 0 && (
              <div className="p-3 bg-primary/10 rounded-lg">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="w-4 h-4" />
                  <span className="font-medium">
                    {isRTL ? `נמצאו ${urls.length} לינקים` : `Found ${urls.length} URLs`}
                  </span>
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <Checkbox 
                  id="shareToComm" 
                  checked={shareToComm} 
                  onCheckedChange={(c) => setShareToComm(!!c)} 
                />
                <Label htmlFor="shareToComm" className="text-sm cursor-pointer">
                  {isRTL ? 'שתף לקהילה' : 'Share to community'}
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <Checkbox 
                  id="addToApplications" 
                  checked={addToApplications} 
                  onCheckedChange={(c) => setAddToApplications(!!c)} 
                />
                <Label htmlFor="addToApplications" className="text-sm cursor-pointer">
                  {isRTL ? 'הוסף למועמדויות שלי' : 'Add to my applications'}
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <Checkbox 
                  id="markAsApplied" 
                  checked={markAsApplied} 
                  onCheckedChange={(c) => setMarkAsApplied(!!c)}
                  disabled={!addToApplications}
                />
                <Label 
                  htmlFor="markAsApplied" 
                  className={`text-sm cursor-pointer ${!addToApplications ? 'opacity-50' : ''}`}
                >
                  {isRTL ? 'סמן כ"הוגש קו"ח" בתאריך היום' : 'Mark as "CV submitted" today'}
                </Label>
              </div>
            </div>
            
            <Button 
              onClick={handleStartImport} 
              disabled={urls.length === 0}
              className="w-full gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {isRTL ? `התחל יבוא (${urls.length} משרות)` : `Start Import (${urls.length} jobs)`}
            </Button>
          </div>
        )}
        
        {state === 'processing' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm">
                {isRTL ? 'מעבד משרות...' : 'Processing jobs...'}
              </span>
            </div>
            
            <Progress value={progress} className="h-2" />
            
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {results.map((result, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center gap-2 text-sm p-2 rounded bg-muted/50"
                  >
                    {result.status === 'pending' && (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                    {result.status === 'success' && (
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    )}
                    {result.status === 'error' && (
                      <XCircle className="w-4 h-4 text-destructive" />
                    )}
                    <span className="truncate flex-1">
                      {result.job 
                        ? `${result.job.title} @ ${result.job.company}`
                        : new URL(result.url).hostname}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
        
        {state === 'complete' && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <CheckCircle2 className="w-12 h-12 mx-auto text-primary mb-3" />
              <h3 className="font-semibold text-lg">
                {isRTL ? 'יבוא הושלם!' : 'Import Complete!'}
              </h3>
              <p className="text-muted-foreground text-sm mt-1">
                {isRTL 
                  ? `${successCount} משרות נוספו בהצלחה`
                  : `${successCount} jobs added successfully`}
              </p>
            </div>
            
            {failCount > 0 && (
              <div className="p-3 bg-destructive/10 rounded-lg">
                <div className="flex items-center gap-2 text-destructive mb-2">
                  <AlertCircle className="w-4 h-4" />
                  <span className="font-medium text-sm">
                    {isRTL ? `${failCount} משרות נכשלו` : `${failCount} jobs failed`}
                  </span>
                </div>
                <ScrollArea className="h-[100px]">
                  <div className="space-y-1">
                    {results
                      .filter(r => r.status === 'error')
                      .map((result, idx) => (
                        <div key={idx} className="text-xs text-muted-foreground">
                          {new URL(result.url).hostname}: {result.error || 'Unknown error'}
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </div>
            )}
            
            <Button onClick={handleClose} className="w-full">
              {isRTL ? 'סגור' : 'Close'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
