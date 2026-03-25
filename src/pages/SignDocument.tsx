import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SignatureCanvas } from '@/components/documents/SignatureCanvas';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, CheckCircle, AlertCircle, Pen, Download, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface SigningDoc {
  id: string;
  title: string;
  content_html: string;
  status: string;
  original_file_url: string | null;
  original_file_name: string | null;
  original_file_type: string | null;
  signature_data: string | null;
  recipient_name: string | null;
  signing_token: string;
}

export default function SignDocument() {
  const { token } = useParams<{ token: string }>();
  const [doc, setDoc] = useState<SigningDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSignCanvas, setShowSignCanvas] = useState(false);
  const [showDecline, setShowDecline] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [signerName, setSignerName] = useState('');
  const [done, setDone] = useState<'signed' | 'declined' | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data, error } = await supabase
        .from('signing_documents')
        .select('id,title,content_html,status,original_file_url,original_file_name,original_file_type,signature_data,recipient_name,signing_token')
        .eq('signing_token', token)
        .single();
      if (error || !data) {
        setError('קישור לא תקין או שהמסמך לא נמצא');
      } else {
        setDoc(data as SigningDoc);
        if (data.recipient_name) setSignerName(data.recipient_name);
        // Track view
        await supabase
          .from('signing_documents')
          .update({ view_count: 1, last_viewed_at: new Date().toISOString(), status: data.status === 'sent' ? 'viewed' : data.status })
          .eq('id', data.id);
      }
      setLoading(false);
    })();
  }, [token]);

  const handleSign = async (signatureData: string) => {
    if (!doc) return;
    const { error } = await supabase
      .from('signing_documents')
      .update({ status: 'signed', signed_at: new Date().toISOString(), signature_data: signatureData })
      .eq('id', doc.id);
    if (error) { toast.error('שגיאה בשמירת החתימה'); return; }
    setShowSignCanvas(false);
    setDone('signed');
  };

  const handleDecline = async () => {
    if (!doc || !declineReason.trim()) return;
    const { error } = await supabase
      .from('signing_documents')
      .update({ status: 'declined', declined_at: new Date().toISOString(), decline_reason: declineReason })
      .eq('id', doc.id);
    if (error) { toast.error('שגיאה'); return; }
    setDone('declined');
  };

  const isPdf = doc?.original_file_type === 'pdf' || doc?.original_file_name?.toLowerCase().endsWith('.pdf');
  const isDocx = doc?.original_file_type === 'docx' || doc?.original_file_name?.toLowerCase().endsWith('.docx') || doc?.original_file_name?.toLowerCase().endsWith('.doc');
  const isReadOnly = doc?.status === 'signed' || doc?.status === 'declined' || doc?.status === 'cancelled' || doc?.status === 'expired';

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-3">
        <AlertCircle className="w-14 h-14 text-destructive mx-auto" />
        <h2 className="text-xl font-bold">{error}</h2>
        <p className="text-muted-foreground text-sm">בדוק את הקישור ונסה שוב</p>
      </div>
    </div>
  );

  if (done === 'signed') return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-4 max-w-sm">
        <div className="w-20 h-20 rounded-full bg-green-500/15 flex items-center justify-center mx-auto">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold">המסמך נחתם בהצלחה! 🎉</h2>
        <p className="text-muted-foreground">החתימה נשמרה ונשלחה לשולח המסמך.</p>
      </div>
    </div>
  );

  if (done === 'declined') return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-4 max-w-sm">
        <div className="w-20 h-20 rounded-full bg-red-500/15 flex items-center justify-center mx-auto">
          <AlertCircle className="w-10 h-10 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold">המסמך נדחה</h2>
        <p className="text-muted-foreground">הודעה נשלחה לשולח המסמך.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      {/* Header */}
      <div className="border-b bg-card px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <span className="font-semibold text-sm">{doc?.title}</span>
          {doc?.status === 'signed' && (
            <Badge className="bg-green-500/20 text-green-700 border-green-500/30 text-xs gap-1">
              <CheckCircle className="w-3 h-3" />נחתם
            </Badge>
          )}
        </div>
        {doc?.original_file_url && doc?.original_file_name && (
          <a href={doc.original_file_url} download={doc.original_file_name} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" />הורד
            </Button>
          </a>
        )}
      </div>

      {/* Document content */}
      <div className="flex-1 overflow-auto">
        {doc?.original_file_url && isPdf ? (
          <iframe src={`${doc.original_file_url}#toolbar=0&navpanes=0`} className="w-full h-full border-0" style={{ minHeight: 'calc(100vh - 130px)' }} title={doc.title} />
        ) : doc?.original_file_url && isDocx ? (
          <iframe src={`https://docs.google.com/gview?url=${encodeURIComponent(doc.original_file_url)}&embedded=true`} className="w-full h-full border-0" style={{ minHeight: 'calc(100vh - 130px)' }} title={doc?.title} />
        ) : doc?.original_file_url ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <p className="text-sm text-muted-foreground">{doc.original_file_name}</p>
            <a href={doc.original_file_url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="gap-2"><ExternalLink className="w-4 h-4" />פתח קובץ</Button>
            </a>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto p-6 prose prose-sm" dangerouslySetInnerHTML={{ __html: doc?.content_html || '' }} />
        )}
      </div>

      {/* Existing signature */}
      {doc?.signature_data && (
        <div className="border-t bg-green-50/60 px-4 py-3">
          <p className="text-xs text-green-700 font-medium mb-2">✅ חתימה קיימת:</p>
          <img src={doc.signature_data} alt="Signature" className="max-h-16 border rounded bg-white p-1" />
        </div>
      )}

      {/* Decline reason */}
      {showDecline && (
        <div className="border-t bg-red-50/60 px-4 py-3 space-y-2">
          <p className="text-sm font-medium text-red-700">סיבת הדחייה:</p>
          <textarea
            className="w-full border rounded-md p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-destructive/30 bg-background"
            rows={2}
            placeholder="הסבר מדוע אתה דוחה את המסמך..."
            value={declineReason}
            onChange={e => setDeclineReason(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" onClick={handleDecline} disabled={!declineReason.trim()}>אשר דחייה</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowDecline(false)}>ביטול</Button>
          </div>
        </div>
      )}

      {/* Actions */}
      {!isReadOnly && !done && (
        <div className="border-t bg-card px-4 py-3 flex gap-2 justify-end">
          <Button variant="outline" className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => setShowDecline(!showDecline)}>
            <AlertCircle className="w-4 h-4" />דחה מסמך
          </Button>
          <Button className="gap-2" onClick={() => setShowSignCanvas(true)}>
            <Pen className="w-4 h-4" />חתום על המסמך
          </Button>
        </div>
      )}

      <SignatureCanvas
        open={showSignCanvas}
        onClose={() => setShowSignCanvas(false)}
        onSave={handleSign}
        title={`חתימה על: ${doc?.title}`}
      />
    </div>
  );
}
