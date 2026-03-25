import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import { 
  Clock, 
  Send, 
  Filter, 
  MessageSquare, 
  Calendar, 
  CheckCircle2, 
  XCircle,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface TimelineEvent {
  id: string;
  event_type: string;
  old_value: string | null;
  new_value: string | null;
  description: string | null;
  created_at: string;
}

interface ApplicationTimelineProps {
  applicationId: string;
}

const eventIcons: Record<string, React.ReactNode> = {
  created: <Send className="h-4 w-4" />,
  stage_change: <ArrowRight className="h-4 w-4" />,
  status_change: <Filter className="h-4 w-4" />,
  note_added: <MessageSquare className="h-4 w-4" />,
  interview_scheduled: <Calendar className="h-4 w-4" />,
  hired: <CheckCircle2 className="h-4 w-4" />,
  rejected: <XCircle className="h-4 w-4" />,
};

const eventColors: Record<string, string> = {
  created: 'bg-primary/20 text-primary',
  stage_change: 'bg-blue-500/20 text-blue-400',
  status_change: 'bg-accent/20 text-accent',
  note_added: 'bg-secondary text-secondary-foreground',
  interview_scheduled: 'bg-green-500/20 text-green-400',
  hired: 'bg-green-500/20 text-green-400',
  rejected: 'bg-destructive/20 text-destructive',
};

const stageLabels: Record<string, { en: string; he: string }> = {
  applied: { en: 'Applied', he: 'הוגש' },
  screening: { en: 'Screening', he: 'סינון' },
  interview: { en: 'Interview', he: 'ראיון' },
  offer: { en: 'Offer', he: 'הצעה' },
  hired: { en: 'Hired', he: 'התקבל' },
  rejected: { en: 'Rejected', he: 'נדחה' },
  withdrawn: { en: 'Withdrawn', he: 'בוטל' },
};

export function ApplicationTimeline({ applicationId }: ApplicationTimelineProps) {
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const { data, error } = await supabase
          .from('application_timeline')
          .select('*')
          .eq('application_id', applicationId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setEvents(data || []);
      } catch (error) {
        console.error('Error fetching timeline:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimeline();
  }, [applicationId]);

  const getEventDescription = (event: TimelineEvent) => {
    if (event.description) return event.description;

    switch (event.event_type) {
      case 'created':
        return isRTL ? 'המועמדות נוצרה' : 'Application created';
      case 'stage_change':
        const oldStage = stageLabels[event.old_value || ''] || { en: event.old_value, he: event.old_value };
        const newStage = stageLabels[event.new_value || ''] || { en: event.new_value, he: event.new_value };
        return isRTL 
          ? `שלב שונה מ-${oldStage.he} ל-${newStage.he}`
          : `Stage changed from ${oldStage.en} to ${newStage.en}`;
      case 'status_change':
        return isRTL 
          ? `סטטוס שונה ל-${event.new_value}`
          : `Status changed to ${event.new_value}`;
      case 'note_added':
        return isRTL ? 'הערה נוספה' : 'Note added';
      case 'interview_scheduled':
        return isRTL ? 'ראיון נקבע' : 'Interview scheduled';
      default:
        return event.event_type;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        {isRTL ? 'אין היסטוריה עדיין' : 'No history yet'}
      </div>
    );
  }

  return (
    <div className="space-y-3" dir={isRTL ? 'rtl' : 'ltr'}>
      {events.map((event, index) => (
        <div key={event.id} className="flex gap-3">
          {/* Icon */}
          <div className={cn(
            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
            eventColors[event.event_type] || 'bg-secondary text-secondary-foreground'
          )}>
            {eventIcons[event.event_type] || <Clock className="h-4 w-4" />}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground">
              {getEventDescription(event)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(new Date(event.created_at), 'PPp', {
                locale: isRTL ? he : enUS,
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
