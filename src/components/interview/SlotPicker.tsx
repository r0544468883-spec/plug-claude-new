import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { CalendarIcon, Clock, Plus, Trash2, CheckCircle2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Slot {
  id?: string;
  start_time: string;
  end_time: string;
  is_selected: boolean;
}

interface SlotPickerProps {
  interviewId: string;
  candidateId?: string; // if provided, renders candidate view
  onSlotSelected?: () => void;
}

export function SlotPicker({ interviewId, candidateId, onSlotSelected }: SlotPickerProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const queryClient = useQueryClient();
  const isCandidateView = !!candidateId;

  const [date, setDate] = useState<Date>();
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ['interview-slots', interviewId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interview_slots' as any)
        .select('*')
        .eq('interview_id', interviewId)
        .order('start_time', { ascending: true });
      if (error) throw error;
      return ((data as unknown) || []) as Slot[];
    },
  });

  const addSlotMutation = useMutation({
    mutationFn: async () => {
      if (!date) return;
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      const start = new Date(date);
      start.setHours(sh, sm, 0, 0);
      const end = new Date(date);
      end.setHours(eh, em, 0, 0);

      const { error } = await supabase.from('interview_slots' as any).insert({
        interview_id: interviewId,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        is_selected: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-slots', interviewId] });
      setDate(undefined);
      toast.success(isRTL ? 'Slot נוסף' : 'Slot added');
    },
    onError: () => toast.error(isRTL ? 'שגיאה בהוספת slot' : 'Failed to add slot'),
  });

  const deleteSlotMutation = useMutation({
    mutationFn: async (slotId: string) => {
      const { error } = await supabase.from('interview_slots' as any).delete().eq('id', slotId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['interview-slots', interviewId] }),
  });

  const selectSlotMutation = useMutation({
    mutationFn: async (slotId: string) => {
      // Deselect all, then select chosen
      await supabase.from('interview_slots' as any)
        .update({ is_selected: false })
        .eq('interview_id', interviewId);
      const { error } = await supabase.from('interview_slots' as any)
        .update({ is_selected: true })
        .eq('id', slotId);
      if (error) throw error;

      // Update interview scheduled_at
      const slot = slots.find(s => s.id === slotId);
      if (slot) {
        await supabase.from('interviews' as any)
          .update({ scheduled_at: slot.start_time, scheduling_mode: 'fixed' })
          .eq('id', interviewId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-slots', interviewId] });
      toast.success(isRTL ? 'המועד נבחר!' : 'Time slot confirmed!');
      onSlotSelected?.();
    },
    onError: () => toast.error(isRTL ? 'שגיאה בבחירת המועד' : 'Failed to select slot'),
  });

  if (isLoading) return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  const selectedSlot = slots.find(s => s.is_selected);

  return (
    <div className="space-y-4">
      {/* Candidate view — just pick */}
      {isCandidateView ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {isRTL ? 'בחר מועד מתאים לראיון:' : 'Select a time slot for your interview:'}
          </p>
          {slots.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {isRTL ? 'אין slots זמינים עדיין' : 'No slots available yet'}
            </p>
          ) : (
            slots.map(slot => (
              <button
                key={slot.id}
                type="button"
                className={cn(
                  'w-full flex items-center justify-between p-3 rounded-lg border text-sm transition-colors',
                  slot.is_selected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card hover:border-primary/50 hover:bg-muted/50'
                )}
                onClick={() => slot.id && !slot.is_selected && selectSlotMutation.mutate(slot.id)}
                disabled={slot.is_selected || selectSlotMutation.isPending}
              >
                <span className="font-medium">
                  {format(new Date(slot.start_time), 'EEEE, d MMM — HH:mm', { locale: isRTL ? he : enUS })}
                  {' – '}
                  {format(new Date(slot.end_time), 'HH:mm')}
                </span>
                {slot.is_selected && (
                  <Badge className="gap-1 bg-primary/20 text-primary border-primary/30">
                    <CheckCircle2 className="h-3 w-3" />
                    {isRTL ? 'נבחר' : 'Selected'}
                  </Badge>
                )}
              </button>
            ))
          )}
        </div>
      ) : (
        /* Recruiter view — manage slots */
        <div className="space-y-4">
          {selectedSlot && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm text-primary">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <span>
                {isRTL ? 'המועמד בחר: ' : 'Candidate selected: '}
                <strong>{format(new Date(selectedSlot.start_time), 'EEEE d MMM, HH:mm', { locale: isRTL ? he : enUS })}</strong>
              </span>
            </div>
          )}

          <div className="space-y-3">
            {slots.map(slot => (
              <div key={slot.id} className={cn(
                'flex items-center gap-3 p-3 rounded-lg border text-sm',
                slot.is_selected ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/30'
              )}>
                <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="flex-1">
                  {format(new Date(slot.start_time), 'EEEE, d MMM HH:mm', { locale: isRTL ? he : enUS })}
                  {' – '}
                  {format(new Date(slot.end_time), 'HH:mm')}
                </span>
                {slot.is_selected && (
                  <Badge variant="outline" className="text-xs border-primary/30 text-primary">{isRTL ? 'נבחר' : 'Chosen'}</Badge>
                )}
                {!slot.is_selected && slot.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteSlotMutation.mutate(slot.id!)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Add new slot */}
          <div className="border border-dashed border-border rounded-lg p-3 space-y-3">
            <p className="text-xs text-muted-foreground font-medium">{isRTL ? 'הוסף slot חדש' : 'Add new slot'}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1 text-xs h-8">
                    <CalendarIcon className="h-3 w-3" />
                    {date ? format(date, 'd/M/yyyy') : (isRTL ? 'תאריך' : 'Date')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={d => d < new Date()}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="h-8 w-24 text-xs" />
                <span className="text-muted-foreground text-xs">–</span>
                <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="h-8 w-24 text-xs" />
              </div>
              <Button
                size="sm"
                className="h-8 gap-1 text-xs"
                onClick={() => addSlotMutation.mutate()}
                disabled={!date || addSlotMutation.isPending}
              >
                {addSlotMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                {isRTL ? 'הוסף' : 'Add'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
