import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Upload, Trash2, ExternalLink, Loader2, File } from 'lucide-react';

interface DocumentItem {
  id: string;
  file_name: string;
  file_path: string;
  publicUrl: string;
  created_at: string;
}

const MAX_FILE_MB = 10;

export function DocumentsManager() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const [cvs, setCvs] = useState<DocumentItem[]>([]);
  const [coverLetters, setCoverLetters] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState<'cv' | 'cover_letter' | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const cvInputRef = useRef<HTMLInputElement>(null);
  const clInputRef = useRef<HTMLInputElement>(null);

  const fetchDocs = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('id, file_name, file_path, doc_type, created_at')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[DocumentsManager] fetch error:', error);
        return;
      }
      if (!data) return;

      const relevant = data.filter((d: any) => d.doc_type === 'cv' || d.doc_type === 'cover_letter');
      const mapped = await Promise.all(relevant.map(async (d: any) => {
        const { data: signed } = await supabase.storage
          .from('resumes')
          .createSignedUrl(d.file_path, 3600);
        return { ...d, publicUrl: signed?.signedUrl ?? '' };
      }));

      setCvs(mapped.filter((d: any) => d.doc_type === 'cv'));
      setCoverLetters(mapped.filter((d: any) => d.doc_type === 'cover_letter'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [user]);

  const sanitizeFilename = (name: string) =>
    name.replace(/[^\x00-\x7F]/g, '').replace(/\s+/g, '_') || 'file';

  const handleUpload = async (file: File, docType: 'cv' | 'cover_letter') => {
    if (!user) return;
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      toast.error(isHebrew ? `הקובץ גדול מ-${MAX_FILE_MB}MB` : `File exceeds ${MAX_FILE_MB}MB`);
      return;
    }
    if (file.type !== 'application/pdf') {
      toast.error(isHebrew ? 'יש להעלות קובץ PDF בלבד' : 'Only PDF files are allowed');
      return;
    }

    setUploading(docType);
    try {
      const sanitized = sanitizeFilename(file.name);
      const prefix = docType === 'cv' ? 'cv' : 'cover-letters';
      const filePath = `${user.id}/${prefix}/${Date.now()}_${sanitized}`;

      const { error: uploadErr } = await supabase.storage
        .from('resumes')
        .upload(filePath, file, { upsert: false });

      if (uploadErr) throw uploadErr;

      const { error: dbErr } = await supabase.from('documents').insert({
        owner_id: user.id,
        file_name: file.name,
        file_path: filePath,
        file_type: 'pdf',
        doc_type: docType,
      });

      if (dbErr) throw dbErr;

      toast.success(isHebrew ? 'הקובץ הועלה בהצלחה!' : 'File uploaded successfully!');
      await fetchDocs();
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(isHebrew ? 'שגיאה בהעלאה' : 'Upload failed');
    } finally {
      setUploading(null);
      if (cvInputRef.current) cvInputRef.current.value = '';
      if (clInputRef.current) clInputRef.current.value = '';
    }
  };

  const handleDelete = async (doc: DocumentItem) => {
    if (!user) return;
    setDeleting(doc.id);
    try {
      await supabase.storage.from('resumes').remove([doc.file_path]);
      await supabase.from('documents').delete().eq('id', doc.id).eq('owner_id', user.id);
      toast.success(isHebrew ? 'הקובץ נמחק' : 'File deleted');
      await fetchDocs();
    } catch {
      toast.error(isHebrew ? 'שגיאה במחיקה' : 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  const DocList = ({ docs, docType }: { docs: DocumentItem[]; docType: 'cv' | 'cover_letter' }) => {
    const inputRef = docType === 'cv' ? cvInputRef : clInputRef;
    const isUploadingThis = uploading === docType;

    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            disabled={!!uploading}
            onClick={() => inputRef.current?.click()}
          >
            {isUploadingThis ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {isHebrew ? 'העלה PDF' : 'Upload PDF'}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f, docType);
            }}
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : docs.length === 0 ? (
          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            <File className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {isHebrew
                ? docType === 'cv' ? 'לחץ להעלאת קורות חיים (PDF)' : 'לחץ להעלאת מכתב מקדים (PDF)'
                : docType === 'cv' ? 'Click to upload resume (PDF)' : 'Click to upload cover letter (PDF)'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                <FileText className="w-5 h-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(doc.created_at).toLocaleDateString(isHebrew ? 'he-IL' : 'en-US')}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    asChild
                  >
                    <a href={doc.publicUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    disabled={deleting === doc.id}
                    onClick={() => handleDelete(doc)}
                  >
                    {deleting === doc.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          {isHebrew ? 'קורות חיים ומכתבי מקדים' : 'Resumes & Cover Letters'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="cv">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="cv" className="flex-1">
              {isHebrew ? `📄 קורות חיים (${cvs.length})` : `📄 Resumes (${cvs.length})`}
            </TabsTrigger>
            <TabsTrigger value="cover_letter" className="flex-1">
              {isHebrew ? `✉️ מכתבי מקדים (${coverLetters.length})` : `✉️ Cover Letters (${coverLetters.length})`}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="cv">
            <DocList docs={cvs} docType="cv" />
          </TabsContent>
          <TabsContent value="cover_letter">
            <DocList docs={coverLetters} docType="cover_letter" />
          </TabsContent>
        </Tabs>
        <p className="text-xs text-muted-foreground mt-4">
          {isHebrew
            ? '💡 הקבצים שתעלה כאן יהיו זמינים לבחירה בתוסף PLUG בזמן הגשת מועמדות'
            : '💡 Files uploaded here will be available for selection in the PLUG extension when applying'}
        </p>
      </CardContent>
    </Card>
  );
}
