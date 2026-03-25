import { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { SignatureCanvas } from './SignatureCanvas';
import {
  FileText, Download, Pen, CheckCircle, AlertCircle, ExternalLink, FileType
} from 'lucide-react';

interface DocumentSigningViewerProps {
  open: boolean;
  onClose: () => void;
  documentTitle: string;
  fileUrl: string | null;
  fileName: string | null;
  fileType: string | null;
  contentHtml: string;
  onSign: (signatureData: string) => void;
  onDecline: (reason: string) => void;
  isReadOnly?: boolean;
  existingSignature?: string | null;
}

export function DocumentSigningViewer({
  open, onClose, documentTitle, fileUrl, fileName, fileType,
  contentHtml, onSign, onDecline, isReadOnly = false, existingSignature,
}: DocumentSigningViewerProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [showSignatureCanvas, setShowSignatureCanvas] = useState(false);
  const [showDeclinePrompt, setShowDeclinePrompt] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  const isPdf = fileType === 'pdf' || fileName?.toLowerCase().endsWith('.pdf');
  const isDocx = fileType === 'docx' || fileName?.toLowerCase().endsWith('.docx') || fileName?.toLowerCase().endsWith('.doc');

  const handleSign = (signatureData: string) => {
    onSign(signatureData);
    setShowSignatureCanvas(false);
  };

  const handleDecline = () => {
    if (declineReason.trim()) {
      onDecline(declineReason);
      setShowDeclinePrompt(false);
      setDeclineReason('');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col p-0 overflow-hidden" dir={isHebrew ? 'rtl' : 'ltr'}>
          {/* Header */}
          <DialogHeader className="p-4 pb-3 border-b shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <DialogTitle className="text-base font-semibold">{documentTitle}</DialogTitle>
                {existingSignature && (
                  <Badge className="bg-green-500/20 text-green-700 gap-1 text-xs border-green-500/30">
                    <CheckCircle className="w-3 h-3" />
                    {isHebrew ? 'נחתם' : 'Signed'}
                  </Badge>
                )}
              </div>
              {fileUrl && fileName && (
                <a href={fileUrl} download={fileName} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                    <Download className="w-3.5 h-3.5" />
                    {isHebrew ? 'הורד' : 'Download'}
                  </Button>
                </a>
              )}
            </div>
          </DialogHeader>

          {/* Document Viewer */}
          <div className="flex-1 overflow-hidden relative min-h-0">
            {fileUrl && isPdf ? (
              /* PDF viewer via iframe */
              <iframe
                src={`${fileUrl}#toolbar=0&navpanes=0`}
                className="w-full h-full border-0"
                title={documentTitle}
                style={{ minHeight: '500px' }}
              />
            ) : fileUrl && isDocx ? (
              /* Word doc — use Google Docs viewer */
              <iframe
                src={`https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`}
                className="w-full h-full border-0"
                title={documentTitle}
                style={{ minHeight: '500px' }}
              />
            ) : fileUrl ? (
              /* Image or unknown */
              <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
                <FileType className="w-16 h-16 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{fileName}</p>
                <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="gap-2">
                    <ExternalLink className="w-4 h-4" />
                    {isHebrew ? 'פתח קובץ' : 'Open File'}
                  </Button>
                </a>
              </div>
            ) : (
              /* HTML content */
              <div
                className="p-6 overflow-y-auto h-full text-sm leading-relaxed"
                style={{ maxHeight: '100%' }}
                dangerouslySetInnerHTML={{ __html: contentHtml }}
              />
            )}
          </div>

          {/* Existing Signature */}
          {existingSignature && (
            <div className="px-4 py-3 border-t bg-green-50/50 shrink-0">
              <p className="text-xs text-green-700 font-medium mb-2">{isHebrew ? '✅ חתימה קיימת:' : '✅ Existing Signature:'}</p>
              <img src={existingSignature} alt="Signature" className="max-h-16 border rounded bg-white p-1" />
            </div>
          )}

          {/* Decline prompt inline */}
          {showDeclinePrompt && (
            <div className="px-4 py-3 border-t bg-red-50/50 shrink-0 space-y-2">
              <p className="text-sm font-medium text-red-700">{isHebrew ? 'סיבת הדחייה:' : 'Decline reason:'}</p>
              <textarea
                className="w-full border rounded-md p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-destructive/30"
                rows={2}
                placeholder={isHebrew ? 'הסבר מדוע אתה דוחה את המסמך...' : 'Explain why you\'re declining...'}
                value={declineReason}
                onChange={e => setDeclineReason(e.target.value)}
              />
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" onClick={handleDecline} disabled={!declineReason.trim()}>
                  {isHebrew ? 'אשר דחייה' : 'Confirm Decline'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowDeclinePrompt(false)}>
                  {isHebrew ? 'ביטול' : 'Cancel'}
                </Button>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          {!isReadOnly && !existingSignature && (
            <DialogFooter className="p-4 border-t gap-2 shrink-0" dir={isHebrew ? 'rtl' : 'ltr'}>
              <Button
                variant="outline"
                className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/5"
                onClick={() => setShowDeclinePrompt(!showDeclinePrompt)}
              >
                <AlertCircle className="w-4 h-4" />
                {isHebrew ? 'דחה מסמך' : 'Decline'}
              </Button>
              <Button
                className="gap-2"
                onClick={() => setShowSignatureCanvas(true)}
              >
                <Pen className="w-4 h-4" />
                {isHebrew ? 'חתום על המסמך' : 'Sign Document'}
              </Button>
            </DialogFooter>
          )}

          {isReadOnly && (
            <DialogFooter className="p-4 border-t shrink-0">
              <Button variant="ghost" onClick={onClose}>{isHebrew ? 'סגור' : 'Close'}</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Signature Canvas */}
      <SignatureCanvas
        open={showSignatureCanvas}
        onClose={() => setShowSignatureCanvas(false)}
        onSave={handleSign}
        title={isHebrew ? `חתימה על: ${documentTitle}` : `Sign: ${documentTitle}`}
      />
    </>
  );
}
