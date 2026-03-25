import { useState, useRef, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Upload, RefreshCw, Loader2, Check, Code } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { exportHtmlToPdf } from './utils/exportToPdf';
import { CVData } from './types';

interface AIDesignPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  html: string;
  css: string;
  cvData?: CVData;
  onRequestChange?: (instruction: string) => void;
}

export const AIDesignPreview = ({
  open,
  onOpenChange,
  html,
  css,
  cvData,
  onRequestChange
}: AIDesignPreviewProps) => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isHe = language === 'he';
  
  const [showChangeRequest, setShowChangeRequest] = useState(false);
  const [changeInstruction, setChangeInstruction] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [showHtmlEditor, setShowHtmlEditor] = useState(false);
  const [editableHtml, setEditableHtml] = useState(html);

  const previewRef = useRef<HTMLIFrameElement>(null);

  // Sync editableHtml whenever the html prop changes (fixes stale state on re-open)
  useEffect(() => {
    if (html) setEditableHtml(html);
  }, [html]);

  // Inject PLUG watermark footer into the rendered HTML
  const injectWatermark = (rawHtml: string) => {
    // Use flow-based positioning (not fixed/absolute) so html2canvas captures it in PDF
    const watermark = `
      <div style="display:block;width:100%;margin-top:12px;border-top:1px solid #e5e7eb;padding:5px 0;text-align:center;font-size:7.5px;color:#9ca3af;font-family:'Helvetica Neue',Arial,sans-serif;letter-spacing:0.03em;background:#fff;user-select:none;">
        קורות חיים אלו הוכנו באמצעות פלאג&nbsp;&nbsp;•&nbsp;&nbsp;www.plug-hr.com
      </div>`;
    return rawHtml.includes('</body>')
      ? rawHtml.replace('</body>', `${watermark}</body>`)
      : rawHtml + watermark;
  };

  // Combine HTML with CSS — use editableHtml when it has been updated by regeneration
  const baseHtml = editableHtml || html;
  const withCss = css ? baseHtml.replace('</head>', `<style>${css}</style></head>`) : baseHtml;
  const fullHtml = injectWatermark(withCss);

  const sanitizeForExport = (raw: string) => DOMPurify.sanitize(raw, {
    WHOLE_DOCUMENT: true,
    ADD_TAGS: ['html', 'head', 'body', 'style', 'meta', 'link', 'header', 'main', 'section', 'article', 'aside', 'footer', 'nav'],
    ADD_ATTR: ['dir', 'lang', 'charset'],
  });

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const content = sanitizeForExport(showHtmlEditor ? injectWatermark(editableHtml) : fullHtml);
      await exportHtmlToPdf(content, 'portrait', 'cv-ai-design.pdf');
      toast.success(isHe ? 'ה-PDF הורד בהצלחה!' : 'PDF downloaded successfully!');
    } catch {
      toast.error(isHe ? 'שגיאה ביצוא PDF' : 'Error exporting PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveToProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const content = sanitizeForExport(showHtmlEditor ? injectWatermark(editableHtml) : fullHtml);
      const pdfBlob = await exportHtmlToPdf(content, 'portrait');

      // Upload to storage
      const fileName = `${user.id}/${Date.now()}_ai-cv.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('generated-cvs')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('generated-cvs')
        .getPublicUrl(fileName);

      setSavedUrl(publicUrl);
      toast.success(isHe ? 'נשמר לפרופיל!' : 'Saved to profile!');
    } catch (error) {
      console.error('Save error:', error);
      toast.error(isHe ? 'שגיאה בשמירה' : 'Error saving');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestChange = async () => {
    if (!changeInstruction.trim()) return;

    // If parent handles it, delegate
    if (onRequestChange) {
      onRequestChange(changeInstruction);
      setShowChangeRequest(false);
      setChangeInstruction('');
      return;
    }

    // CSS-patch approach: extract <style> block, ask Claude to modify only the CSS,
    // then splice the updated CSS back into the existing HTML. This avoids the token
    // limit problem of sending + receiving the full HTML document.
    setIsRegenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentHtml = showHtmlEditor ? editableHtml : (css ? html.replace('</head>', `<style>${css}</style></head>`) : html);

      // Extract the <style> block from the current HTML
      const styleMatch = currentHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
      const currentCss = styleMatch ? styleMatch[1] : '';

      const prompt = `Here is the complete CSS of an existing CV/resume design:
\`\`\`css
${currentCss}
\`\`\`

Requested visual change: "${changeInstruction}"

Return ONLY the updated CSS content. Preserve ALL existing styles. Add or modify ONLY what is needed.`;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cv-generate-design`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ prompt, cvData, style: 'professional', mode: 'modify_css' }),
        }
      );

      if (!res.ok) throw new Error('Failed to regenerate');
      const result = await res.json();

      if (result.css !== undefined) {
        // Splice the updated CSS back into the existing HTML
        const updatedHtml = styleMatch
          ? currentHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/i, `<style>\n${result.css}\n</style>`)
          : currentHtml.replace('</head>', `<style>\n${result.css}\n</style></head>`);
        setEditableHtml(updatedHtml);
        setShowHtmlEditor(false);
        toast.success(isHe ? 'העיצוב עודכן!' : 'Design updated!');
      }
    } catch {
      toast.error(isHe ? 'שגיאה בעדכון העיצוב' : 'Error updating design');
    } finally {
      setIsRegenerating(false);
      setShowChangeRequest(false);
      setChangeInstruction('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            {isHe ? 'תצוגה מקדימה של העיצוב' : 'Design Preview'}
          </DialogTitle>
          <DialogDescription>
            {isHe 
              ? 'בדוק את העיצוב שנוצר, ערוך או הורד כ-PDF'
              : 'Review the generated design, edit or download as PDF'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0 px-4">
          {/* Toolbar */}
          <div className="flex items-center gap-2 py-2 border-b flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHtmlEditor(!showHtmlEditor)}
              className="gap-2"
            >
              <Code className="w-4 h-4" />
              {showHtmlEditor 
                ? (isHe ? 'תצוגה מקדימה' : 'Preview')
                : (isHe ? 'ערוך HTML' : 'Edit HTML')}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowChangeRequest(!showChangeRequest)}
              disabled={isRegenerating}
              className="gap-2"
            >
              {isRegenerating
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <RefreshCw className="w-4 h-4" />
              }
              {isHe ? 'בקש שינוי' : 'Request Change'}
            </Button>
            
            <div className="flex-1" />
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveToProfile}
              disabled={isSaving || !!savedUrl}
              className="gap-2"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : savedUrl ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {isHe ? 'שמור לפרופיל' : 'Save to Profile'}
            </Button>
            
            <Button
              size="sm"
              onClick={handleExportPDF}
              disabled={isExporting}
              className="gap-2"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {isHe ? 'הורד PDF' : 'Download PDF'}
            </Button>
          </div>

          {/* Change Request Input */}
          {showChangeRequest && (
            <div className="py-3 space-y-2 border-b">
              <Label>{isHe ? 'מה תרצה לשנות?' : 'What would you like to change?'}</Label>
              <div className="flex gap-2">
                <Textarea
                  value={changeInstruction}
                  onChange={(e) => setChangeInstruction(e.target.value)}
                  placeholder={isHe 
                    ? 'לדוגמה: הפוך את הצבע לכחול יותר, הגדל את הפונט...'
                    : 'e.g., Make the color more blue, increase font size...'}
                  rows={2}
                  className="flex-1"
                />
                <Button onClick={handleRequestChange} disabled={!changeInstruction.trim() || isRegenerating}>
                  {isRegenerating
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : (isHe ? 'שלח' : 'Send')
                  }
                </Button>
              </div>
            </div>
          )}

          {/* Preview/Editor Area */}
          <div className="flex-1 overflow-auto py-4 min-h-0">
            {showHtmlEditor ? (
              <Textarea
                value={editableHtml}
                onChange={(e) => setEditableHtml(e.target.value)}
                className="w-full h-full font-mono text-xs resize-none"
                dir="ltr"
              />
            ) : (
              <div className="flex justify-center">
                {/* Clip wrapper: visible area = A4 * scale */}
                <div style={{
                  width: 'calc(210mm * 0.62)',
                  height: 'calc(297mm * 0.62)',
                  overflow: 'hidden',
                  position: 'relative',
                  flexShrink: 0,
                  boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
                }}>
                  {/* Full A4 container, scaled down inside clip wrapper */}
                  <div style={{
                    width: '210mm',
                    height: '297mm',
                    transform: 'scale(0.62)',
                    transformOrigin: 'top left',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                  }}>
                    <iframe
                      ref={previewRef}
                      srcDoc={fullHtml}
                      style={{ width: '210mm', height: '297mm', border: 'none', display: 'block' }}
                      title="CV Preview"
                      sandbox="allow-same-origin"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-4 pt-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isHe ? 'סגור' : 'Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
