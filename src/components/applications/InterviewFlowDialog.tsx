import { useState } from 'react';
import { format, addDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type FlowStep = 'choose' | 'create-task' | 'task-created' | 'document-call' | 'followup' | 'done';
type CallOutcome = 'positive' | 'neutral' | 'negative';

interface InterviewFlowDialogProps {
  open: boolean;
  onClose: () => void;
  application: {
    id: string;
    job: {
      title: string;
      company: { name: string } | null;
    };
  };
  userId: string;
  stage: string;
}

const stageLabels: Record<string, { he: string; en: string }> = {
  interview: { he: 'ראיון', en: 'Interview' },
  screening: { he: 'שיחת סינון', en: 'Screening call' },
  technical: { he: 'ראיון טכני', en: 'Technical interview' },
};

const stageTaskTypes: Record<string, string> = {
  interview: 'frontal_interview',
  technical: 'frontal_interview',
  screening: 'phone_call',
};

function buildGCalUrl(title: string, date: Date | undefined, time: string, location: string, description: string) {
  if (!date) return '';
  const y = format(date, 'yyyy');
  const m = format(date, 'MM');
  const d = format(date, 'dd');
  let dates = '';
  if (time) {
    const [hh, mm] = time.split(':');
    const endH = String(parseInt(hh, 10) + 1).padStart(2, '0');
    dates = `${y}${m}${d}T${hh}${mm}00/${y}${m}${d}T${endH}${mm}00`;
  } else {
    dates = `${y}${m}${d}/${y}${m}${d}`;
  }
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${dates}&details=${encodeURIComponent(description)}&location=${encodeURIComponent(location)}`;
}

export function InterviewFlowDialog({
  open,
  onClose,
  application,
  userId,
  stage,
}: InterviewFlowDialogProps) {
  const { language } = useLanguage();
  const isRTL = language === 'he';

  const [step, setStep] = useState<FlowStep>('choose');
  const [isSaving, setIsSaving] = useState(false);
  const [gcalUrl, setGcalUrl] = useState<string>('');

  // Create-task state
  const [taskDate, setTaskDate] = useState<Date | undefined>(addDays(new Date(), 1));
  const [taskTime, setTaskTime] = useState('10:00');
  const [taskLocation, setTaskLocation] = useState('');
  const [taskNotes, setTaskNotes] = useState('');
  const [taskReminderMinutes, setTaskReminderMinutes] = useState<number | null>(30);

  // Document-call state
  const [callOutcome, setCallOutcome] = useState<CallOutcome>('neutral');
  const [callNotes, setCallNotes] = useState('');

  // Follow-up state
  const [followupTitle, setFollowupTitle] = useState('');
  const [followupDate, setFollowupDate] = useState<Date | undefined>(addDays(new Date(), 3));
  const [followupTime, setFollowupTime] = useState('09:00');

  const companyName = application.job?.company?.name || (isRTL ? 'החברה' : 'the company');
  const jobTitle = application.job?.title || '';
  const stageLabel = stageLabels[stage]
    ? isRTL ? stageLabels[stage].he : stageLabels[stage].en
    : isRTL ? 'ראיון' : 'Interview';
  const taskType = stageTaskTypes[stage] || 'interview';

  const handleCreateTask = async () => {
    setIsSaving(true);
    try {
      const taskTitle = `${stageLabel} — ${companyName}`;
      const taskDesc = taskNotes || (isRTL ? `משרה: ${jobTitle}` : `Job: ${jobTitle}`);
      const { error } = await supabase.from('schedule_tasks' as any).insert({
        user_id: userId,
        title: taskTitle,
        description: taskDesc,
        due_date: taskDate ? format(taskDate, 'yyyy-MM-dd') : null,
        due_time: taskTime || null,
        priority: 'high',
        task_type: taskType,
        is_completed: false,
        related_job: jobTitle,
        location: taskLocation || null,
        source: 'application',
        source_id: application.id,
        reminder_minutes_before: taskReminderMinutes,
      });
      if (error) throw error;
      // Build Google Calendar URL for after-save prompt
      const url = buildGCalUrl(taskTitle, taskDate, taskTime, taskLocation, taskDesc);
      setGcalUrl(url);
      toast.success(isRTL ? 'משימה נוצרה ביומן! 📅' : 'Task added to calendar! 📅');
      setStep('task-created');
    } catch {
      toast.error(isRTL ? 'שגיאה ביצירת משימה' : 'Error creating task');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDocumentCall = async () => {
    if (!callNotes.trim()) return;
    setIsSaving(true);
    try {
      const outcomeEmoji =
        callOutcome === 'positive' ? '✅' : callOutcome === 'negative' ? '❌' : '📋';
      const { error } = await supabase.from('schedule_tasks' as any).insert({
        user_id: userId,
        title: `${outcomeEmoji} ${isRTL ? 'תיעוד' : 'Notes'} — ${stageLabel} ${companyName}`,
        description: callNotes.trim(),
        due_date: format(new Date(), 'yyyy-MM-dd'),
        due_time: format(new Date(), 'HH:mm'),
        priority: callOutcome === 'positive' ? 'high' : 'medium',
        task_type: 'task',
        is_completed: true,
        related_job: jobTitle,
        source: 'application',
        source_id: application.id,
      });
      if (error) throw error;
      toast.success(isRTL ? 'תיעוד נשמר!' : 'Notes saved!');
      setStep('followup');
    } catch {
      toast.error(isRTL ? 'שגיאה בשמירת תיעוד' : 'Error saving notes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateFollowup = async () => {
    setIsSaving(true);
    try {
      const title =
        followupTitle.trim() ||
        (isRTL ? `המשך תהליך — ${companyName}` : `Follow up — ${companyName}`);
      const { error } = await supabase.from('schedule_tasks' as any).insert({
        user_id: userId,
        title,
        description: null,
        due_date: followupDate ? format(followupDate, 'yyyy-MM-dd') : null,
        due_time: followupTime || null,
        priority: 'high',
        task_type: 'followup',
        is_completed: false,
        related_job: jobTitle,
        source: 'application',
        source_id: application.id,
      });
      if (error) throw error;
      toast.success(isRTL ? 'משימת המשך נוצרה!' : 'Follow-up task created!');
      setStep('done');
    } catch {
      toast.error(isRTL ? 'שגיאה ביצירת משימה' : 'Error creating task');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setStep('choose');
    setTaskLocation('');
    setTaskNotes('');
    setCallNotes('');
    setCallOutcome('neutral');
    setFollowupTitle('');
    setTaskDate(addDays(new Date(), 1));
    setFollowupDate(addDays(new Date(), 3));
    setGcalUrl('');
    setTaskReminderMinutes(30);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>

        {/* ── Step: choose ── */}
        {step === 'choose' && (
          <>
            <DialogHeader>
              <DialogTitle>
                {isRTL ? `🎉 עדכנת שלב — ${stageLabel}` : `🎉 Stage updated — ${stageLabel}`}
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground -mt-2 mb-1">
              {companyName}{jobTitle ? ` · ${jobTitle}` : ''}
            </p>
            <div className="space-y-2 mt-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-3 text-start"
                onClick={() => setStep('create-task')}
              >
                <span className="text-2xl leading-none">📅</span>
                <div>
                  <div className="font-medium text-sm">
                    {isRTL ? 'קבע משימה ביומן' : 'Schedule in Calendar'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isRTL ? 'תזמן את הראיון הקרוב' : 'Set a reminder for the upcoming interview'}
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-3 text-start"
                onClick={() => setStep('document-call')}
              >
                <span className="text-2xl leading-none">📝</span>
                <div>
                  <div className="font-medium text-sm">
                    {isRTL ? 'תעד שיחה שהייתה' : 'Document a call that happened'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isRTL ? 'שמור רשימות ממה שקרה' : 'Save notes from what happened'}
                  </div>
                </div>
              </Button>

              <Button variant="ghost" className="w-full text-muted-foreground" onClick={handleClose}>
                {isRTL ? 'דלג' : 'Skip'}
              </Button>
            </div>
          </>
        )}

        {/* ── Step: create-task ── */}
        {step === 'create-task' && (
          <>
            <DialogHeader>
              <DialogTitle>{isRTL ? '📅 קבע משימה ביומן' : '📅 Schedule in Calendar'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-1">
              <div className="px-3 py-2 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                <strong>{isRTL ? 'משימה: ' : 'Task: '}</strong>
                {stageLabel} — {companyName}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">{isRTL ? 'תאריך' : 'Date'}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full h-9 text-sm justify-start px-2 gap-1.5">
                        <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
                        {taskDate ? format(taskDate, 'dd/MM/yy') : (isRTL ? 'בחר' : 'Select')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarUI
                        mode="single"
                        selected={taskDate}
                        onSelect={setTaskDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">{isRTL ? 'שעה' : 'Time'}</Label>
                  <Input
                    type="time"
                    value={taskTime}
                    onChange={(e) => setTaskTime(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs mb-1 block">{isRTL ? 'מיקום / לינק' : 'Location / Link'}</Label>
                <Input
                  placeholder={isRTL ? 'Zoom, Google Meet, כתובת...' : 'Zoom, Google Meet, address...'}
                  value={taskLocation}
                  onChange={(e) => setTaskLocation(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div>
                <Label className="text-xs mb-1 block">🔔 {isRTL ? 'תזכורת לפני' : 'Remind me before'}</Label>
                <Select
                  value={taskReminderMinutes === null ? 'none' : String(taskReminderMinutes)}
                  onValueChange={(v) => setTaskReminderMinutes(v === 'none' ? null : parseInt(v, 10))}
                >
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{isRTL ? 'ללא תזכורת' : 'No reminder'}</SelectItem>
                    <SelectItem value="15">{isRTL ? '15 דקות לפני' : '15 min before'}</SelectItem>
                    <SelectItem value="30">{isRTL ? '30 דקות לפני' : '30 min before'}</SelectItem>
                    <SelectItem value="60">{isRTL ? 'שעה לפני' : '1 hour before'}</SelectItem>
                    <SelectItem value="120">{isRTL ? 'שעתיים לפני' : '2 hours before'}</SelectItem>
                    <SelectItem value="1440">{isRTL ? 'יום לפני' : '1 day before'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs mb-1 block">{isRTL ? 'הערות הכנה' : 'Preparation notes'}</Label>
                <Textarea
                  placeholder={isRTL ? 'להכין שאלות, לחזור על הידע...' : 'Prepare questions, review skills...'}
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  rows={3}
                  className="text-sm resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="ghost" className="flex-1" onClick={() => setStep('choose')}>
                {isRTL ? 'חזור' : 'Back'}
              </Button>
              <Button className="flex-1" onClick={handleCreateTask} disabled={isSaving}>
                {isSaving ? '...' : (isRTL ? 'צור משימה' : 'Create Task')}
              </Button>
            </div>
          </>
        )}

        {/* ── Step: task-created (success + Google Cal) ── */}
        {step === 'task-created' && (
          <>
            <DialogHeader>
              <DialogTitle>{isRTL ? '✅ משימה נוצרה!' : '✅ Task created!'}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground -mt-2">
              {isRTL
                ? `${stageLabel} — ${companyName} נוסף ליומן שלך.`
                : `${stageLabel} — ${companyName} added to your calendar.`}
            </p>
            {gcalUrl && (
              <a
                href={gcalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 w-full justify-center py-2.5 px-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-sm font-medium"
              >
                <span className="text-lg">📅</span>
                {isRTL ? 'הוסף גם ליומן Google' : 'Add to Google Calendar'}
              </a>
            )}
            <Button className="w-full" onClick={handleClose}>
              {isRTL ? 'סגור' : 'Close'}
            </Button>
          </>
        )}

        {/* ── Step: document-call ── */}
        {step === 'document-call' && (
          <>
            <DialogHeader>
              <DialogTitle>{isRTL ? '📝 תעד את השיחה' : '📝 Document the Call'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-1">
              <div className="px-3 py-2 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                {companyName}{jobTitle ? ` · ${jobTitle}` : ''}
              </div>

              <div>
                <Label className="text-xs mb-1.5 block">
                  {isRTL ? 'איך הלכה השיחה?' : 'How did the call go?'}
                </Label>
                <div className="flex gap-2">
                  {(['positive', 'neutral', 'negative'] as CallOutcome[]).map((outcome) => (
                    <button
                      key={outcome}
                      onClick={() => setCallOutcome(outcome)}
                      className={cn(
                        'flex-1 py-2 rounded-lg border text-sm transition-all',
                        callOutcome === outcome
                          ? 'border-primary bg-primary/10 text-primary font-medium'
                          : 'border-border hover:border-muted-foreground'
                      )}
                    >
                      {outcome === 'positive'
                        ? `😊 ${isRTL ? 'טוב' : 'Good'}`
                        : outcome === 'neutral'
                        ? `😐 ${isRTL ? 'אוקיי' : 'Okay'}`
                        : `😟 ${isRTL ? 'קשה' : 'Hard'}`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs mb-1 block">
                  {isRTL ? 'רשימות מהשיחה' : 'Call notes'}
                </Label>
                <Textarea
                  placeholder={
                    isRTL
                      ? 'מה שאלו? מה ענית? מה לשפר?'
                      : "What did they ask? What did you answer? What to improve?"
                  }
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  rows={4}
                  className="text-sm resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="ghost" className="flex-1" onClick={() => setStep('choose')}>
                {isRTL ? 'חזור' : 'Back'}
              </Button>
              <Button
                className="flex-1"
                onClick={handleDocumentCall}
                disabled={isSaving || !callNotes.trim()}
              >
                {isSaving ? '...' : (isRTL ? 'שמור ←' : 'Save →')}
              </Button>
            </div>
          </>
        )}

        {/* ── Step: followup ── */}
        {step === 'followup' && (
          <>
            <DialogHeader>
              <DialogTitle>{isRTL ? '↩️ קבע משימת המשך?' : '↩️ Schedule a Follow-up?'}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground -mt-2">
              {isRTL
                ? 'תיעוד נשמר! רוצה לקבוע משימה להמשך התהליך?'
                : 'Notes saved! Want to schedule a follow-up task?'}
            </p>

            <div className="space-y-3 py-1">
              <div>
                <Label className="text-xs mb-1 block">{isRTL ? 'שם המשימה' : 'Task title'}</Label>
                <Input
                  placeholder={
                    isRTL ? `המשך תהליך — ${companyName}` : `Follow up — ${companyName}`
                  }
                  value={followupTitle}
                  onChange={(e) => setFollowupTitle(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">{isRTL ? 'תאריך' : 'Date'}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full h-9 text-sm justify-start px-2 gap-1.5">
                        <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
                        {followupDate ? format(followupDate, 'dd/MM/yy') : (isRTL ? 'בחר' : 'Select')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarUI
                        mode="single"
                        selected={followupDate}
                        onSelect={setFollowupDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">{isRTL ? 'שעה' : 'Time'}</Label>
                  <Input
                    type="time"
                    value={followupTime}
                    onChange={(e) => setFollowupTime(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="ghost" className="flex-1" onClick={handleClose}>
                {isRTL ? 'סיים' : 'Done'}
              </Button>
              <Button className="flex-1" onClick={handleCreateFollowup} disabled={isSaving}>
                {isSaving ? '...' : (isRTL ? 'צור משימה' : 'Create Task')}
              </Button>
            </div>
          </>
        )}

        {/* ── Step: done ── */}
        {step === 'done' && (
          <>
            <DialogHeader>
              <DialogTitle>{isRTL ? '✅ הכל מסודר!' : '✅ All set!'}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground mb-4">
              {isRTL
                ? 'משימת ההמשך נוצרה. בהצלחה בתהליך!'
                : 'Follow-up task created. Good luck with the process!'}
            </p>
            <Button onClick={handleClose} className="w-full">
              {isRTL ? 'סגור' : 'Close'}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
