import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ClipboardCheck, Loader2, Send } from 'lucide-react';

interface AssignTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  candidateName: string;
  applicationId?: string;
  jobId?: string;
  jobTitle?: string;
  onTaskCreated?: () => void;
}

export function AssignTaskDialog({
  open,
  onOpenChange,
  candidateId,
  candidateName,
  applicationId,
  jobId,
  jobTitle,
  onTaskCreated,
}: AssignTaskDialogProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [saving, setSaving] = useState(false);

  const handleSend = async () => {
    if (!user || !title.trim()) {
      toast.error(isHebrew ? 'יש להזין כותרת למטלה' : 'Please enter a task title');
      return;
    }

    setSaving(true);
    try {
      const { error } = await (supabase as any).from('candidate_tasks').insert({
        created_by: user.id,
        candidate_id: candidateId,
        application_id: applicationId || null,
        job_id: jobId || null,
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate || null,
        priority,
      });

      if (error) throw error;

      // Add timeline event if application exists
      if (applicationId) {
        await supabase.from('application_timeline').insert({
          application_id: applicationId,
          event_type: 'note_added',
          new_value: title.trim(),
          description: JSON.stringify({
            type: 'task_assigned',
            task_title: title.trim(),
            due_date: dueDate || null,
          }),
        });
      }

      toast.success(isHebrew ? 'המטלה נשלחה למועמד!' : 'Task sent to candidate!');
      onTaskCreated?.();
      onOpenChange(false);

      // Reset form
      setTitle('');
      setDescription('');
      setDueDate('');
      setPriority('medium');
    } catch (e: any) {
      console.error('Error assigning task:', e);
      toast.error(e.message || (isHebrew ? 'שגיאה' : 'Error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir={isHebrew ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            {isHebrew ? 'שליחת מטלה למועמד' : 'Assign Task to Candidate'}
          </DialogTitle>
          <DialogDescription>
            {isHebrew
              ? `מטלה ל-${candidateName}${jobTitle ? ` (${jobTitle})` : ''}`
              : `Task for ${candidateName}${jobTitle ? ` (${jobTitle})` : ''}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>{isHebrew ? 'כותרת המטלה *' : 'Task Title *'}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isHebrew ? 'למשל: שלח תיק עבודות, מלא שאלון...' : 'e.g. Send portfolio, complete questionnaire...'}
            />
          </div>

          <div className="space-y-1">
            <Label>{isHebrew ? 'תיאור' : 'Description'}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isHebrew ? 'פירוט מה נדרש מהמועמד...' : 'Details about what the candidate needs to do...'}
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{isHebrew ? 'תאריך יעד' : 'Due Date'}</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>{isHebrew ? 'עדיפות' : 'Priority'}</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{isHebrew ? 'נמוכה' : 'Low'}</SelectItem>
                  <SelectItem value="medium">{isHebrew ? 'רגילה' : 'Medium'}</SelectItem>
                  <SelectItem value="high">{isHebrew ? 'גבוהה' : 'High'}</SelectItem>
                  <SelectItem value="urgent">{isHebrew ? 'דחוף' : 'Urgent'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSend} disabled={saving || !title.trim()} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {isHebrew ? 'שלח מטלה' : 'Send Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
