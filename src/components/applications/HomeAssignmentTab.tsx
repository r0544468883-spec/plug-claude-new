import { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Download, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

interface HomeAssignment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  notes: string | null;
  uploaded_at: string;
}

interface HomeAssignmentTabProps {
  applicationId: string;
}

export function HomeAssignmentTab({ applicationId }: HomeAssignmentTabProps) {
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [assignments, setAssignments] = useState<HomeAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [notes, setNotes] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    fetchAssignments();
  }, [applicationId]);

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('home_assignments')
        .select('*')
        .eq('application_id', applicationId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setAssignments(data || []);
      
      // Set notes from the first assignment if exists
      if (data && data.length > 0 && data[0].notes) {
        setNotes(data[0].notes);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      toast.error(isRTL ? 'הקובץ גדול מדי (מקסימום 20MB)' : 'File too large (max 20MB)');
      return;
    }

    try {
      setIsUploading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(isRTL ? 'יש להתחבר כדי להעלות קבצים' : 'Please login to upload files');
        return;
      }

      // Upload to storage
      const filePath = `${user.id}/${applicationId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('home-assignments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Save record to database
      const { error: dbError } = await supabase
        .from('home_assignments')
        .insert({
          application_id: applicationId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          notes: notes || null,
        });

      if (dbError) throw dbError;

      toast.success(isRTL ? 'הקובץ הועלה בהצלחה' : 'File uploaded successfully');
      fetchAssignments();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(isRTL ? 'שגיאה בהעלאת הקובץ' : 'Error uploading file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (assignment: HomeAssignment) => {
    try {
      const { data, error } = await supabase.storage
        .from('home-assignments')
        .download(assignment.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = assignment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error(isRTL ? 'שגיאה בהורדת הקובץ' : 'Error downloading file');
    }
  };

  const handleDelete = async (assignment: HomeAssignment) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('home-assignments')
        .remove([assignment.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('home_assignments')
        .delete()
        .eq('id', assignment.id);

      if (dbError) throw dbError;

      toast.success(isRTL ? 'הקובץ נמחק' : 'File deleted');
      fetchAssignments();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error(isRTL ? 'שגיאה במחיקת הקובץ' : 'Error deleting file');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
          ${isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
          ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
          }}
        />
        {isUploading ? (
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        ) : (
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        )}
        <p className="text-sm text-muted-foreground">
          {isRTL 
            ? 'גרור קובץ לכאן או לחץ להעלאה' 
            : 'Drag & drop a file or click to upload'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {isRTL ? 'מקסימום 20MB' : 'Max 20MB'}
        </p>
      </div>

      {/* Uploaded Files */}
      {assignments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">
            {isRTL ? 'קבצים שהועלו' : 'Uploaded Files'}
          </h4>
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{assignment.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(assignment.file_size)}
                    {' • '}
                    {new Date(assignment.uploaded_at).toLocaleDateString(isRTL ? 'he-IL' : 'en-US')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDownload(assignment)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(assignment)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Notes */}
      <div>
        <h4 className="text-sm font-medium mb-2">
          {isRTL ? 'הערות למטלה' : 'Assignment Notes'}
        </h4>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={isRTL ? 'הוסף הערות על המטלה...' : 'Add notes about the assignment...'}
          className="min-h-[80px] resize-none"
          dir={isRTL ? 'rtl' : 'ltr'}
        />
      </div>
    </div>
  );
}
