import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Plus, Calendar, MapPin, Users, Clock, Video, Building2,
  Loader2, CalendarDays, Ticket, CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isPast, isFuture } from 'date-fns';
import { he, enUS } from 'date-fns/locale';

interface EventsTabProps {
  hubId: string;
  isAdmin: boolean;
}

export function EventsTab({ hubId, isAdmin }: EventsTabProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const dateLocale = isRTL ? he : enUS;

  // Fetch all events for this hub
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['community-events', hubId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('community_events')
        .select('*')
        .eq('hub_id', hubId)
        .order('start_date', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch my registrations
  const { data: myRegistrations = [] } = useQuery({
    queryKey: ['my-event-registrations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await (supabase as any)
        .from('community_event_registrations')
        .select('event_id')
        .eq('user_id', user.id);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const registeredEventIds = new Set(myRegistrations.map((r: any) => r.event_id));

  const now = new Date();
  const upcomingEvents = events.filter((e: any) => isFuture(new Date(e.start_date)));
  const pastEvents = events.filter((e: any) => isPast(new Date(e.start_date)));

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (eventId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await (supabase as any)
        .from('community_event_registrations')
        .insert({ event_id: eventId, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'נרשמת לאירוע!' : 'Registered successfully!');
      queryClient.invalidateQueries({ queryKey: ['my-event-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['community-events', hubId] });
    },
    onError: () => toast.error(isRTL ? 'שגיאה בהרשמה' : 'Registration failed'),
  });

  // Unregister mutation
  const unregisterMutation = useMutation({
    mutationFn: async (eventId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await (supabase as any)
        .from('community_event_registrations')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'בוטלה ההרשמה' : 'Unregistered successfully');
      queryClient.invalidateQueries({ queryKey: ['my-event-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['community-events', hubId] });
    },
    onError: () => toast.error(isRTL ? 'שגיאה בביטול' : 'Failed to unregister'),
  });

  const isPending = registerMutation.isPending || unregisterMutation.isPending;

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          {isRTL ? 'אירועים' : 'Events'}
        </h3>
        {isAdmin && (
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" />
                {isRTL ? 'אירוע חדש' : 'New Event'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
              <DialogHeader>
                <DialogTitle>{isRTL ? 'יצירת אירוע חדש' : 'Create New Event'}</DialogTitle>
              </DialogHeader>
              <CreateEventForm
                hubId={hubId}
                onSuccess={() => {
                  setShowCreate(false);
                  queryClient.invalidateQueries({ queryKey: ['community-events', hubId] });
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="upcoming">
        <TabsList className="w-full">
          <TabsTrigger value="upcoming" className="flex-1">
            {isRTL ? `קרובים (${upcomingEvents.length})` : `Upcoming (${upcomingEvents.length})`}
          </TabsTrigger>
          <TabsTrigger value="past" className="flex-1">
            {isRTL ? `עבר (${pastEvents.length})` : `Past (${pastEvents.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4">
          <EventList
            events={upcomingEvents}
            isLoading={isLoading}
            isRTL={isRTL}
            registeredEventIds={registeredEventIds}
            isPast={false}
            onRegister={(id) => registerMutation.mutate(id)}
            onUnregister={(id) => unregisterMutation.mutate(id)}
            isPending={isPending}
            dateLocale={dateLocale}
            isAdmin={isAdmin}
          />
        </TabsContent>

        <TabsContent value="past" className="mt-4">
          <EventList
            events={pastEvents}
            isLoading={isLoading}
            isRTL={isRTL}
            registeredEventIds={registeredEventIds}
            isPast={true}
            onRegister={(id) => registerMutation.mutate(id)}
            onUnregister={(id) => unregisterMutation.mutate(id)}
            isPending={isPending}
            dateLocale={dateLocale}
            isAdmin={isAdmin}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==================== Event List ====================

function EventList({
  events,
  isLoading,
  isRTL,
  registeredEventIds,
  isPast,
  onRegister,
  onUnregister,
  isPending,
  dateLocale,
  isAdmin,
}: {
  events: any[];
  isLoading: boolean;
  isRTL: boolean;
  registeredEventIds: Set<string>;
  isPast: boolean;
  onRegister: (id: string) => void;
  onUnregister: (id: string) => void;
  isPending: boolean;
  dateLocale: Locale;
  isAdmin: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-36 rounded-xl" />)}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <Card className="bg-card">
        <CardContent className="p-12 text-center">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground">
            {isPast
              ? (isRTL ? 'אין אירועים קודמים' : 'No past events')
              : (isRTL ? 'אין אירועים קרובים' : 'No upcoming events')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event: any) => (
        <EventCard
          key={event.id}
          event={event}
          isRTL={isRTL}
          isRegistered={registeredEventIds.has(event.id)}
          isPast={isPast}
          onRegister={() => onRegister(event.id)}
          onUnregister={() => onUnregister(event.id)}
          isPending={isPending}
          dateLocale={dateLocale}
          isAdmin={isAdmin}
        />
      ))}
    </div>
  );
}

// ==================== Event Card ====================

function EventCard({
  event,
  isRTL,
  isRegistered,
  isPast,
  onRegister,
  onUnregister,
  isPending,
  dateLocale,
  isAdmin,
}: {
  event: any;
  isRTL: boolean;
  isRegistered: boolean;
  isPast: boolean;
  onRegister: () => void;
  onUnregister: () => void;
  isPending: boolean;
  dateLocale: Locale;
  isAdmin: boolean;
}) {
  const typeConfig: Record<string, { label: string; labelHe: string; icon: React.ReactNode; color: string }> = {
    online:    { label: 'Online',    labelHe: 'אונליין',    icon: <Video className="w-3 h-3" />,     color: 'bg-blue-100 text-blue-700' },
    in_person: { label: 'In Person', labelHe: 'פיזי',       icon: <Building2 className="w-3 h-3" />, color: 'bg-green-100 text-green-700' },
    hybrid:    { label: 'Hybrid',    labelHe: 'היברידי',    icon: <MapPin className="w-3 h-3" />,    color: 'bg-purple-100 text-purple-700' },
  };

  const type = typeConfig[event.event_type] ?? typeConfig.online;
  const isFull = event.max_attendees && event.registration_count >= event.max_attendees;

  const startDate = new Date(event.start_date);
  const endDate = event.end_date ? new Date(event.end_date) : null;

  const formattedDate = format(startDate, 'PPP', { locale: dateLocale });
  const formattedTime = format(startDate, 'HH:mm', { locale: dateLocale });
  const formattedEnd = endDate ? format(endDate, 'HH:mm', { locale: dateLocale }) : null;

  return (
    <Card className={cn('transition-shadow hover:shadow-sm', isPast && 'opacity-70')}>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          {/* Date block */}
          <div className="hidden sm:flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-primary/10 text-primary shrink-0">
            <span className="text-lg font-bold leading-none">{format(startDate, 'd')}</span>
            <span className="text-xs font-medium uppercase">{format(startDate, 'MMM', { locale: dateLocale })}</span>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <h4 className="font-semibold text-sm leading-snug">{event.title}</h4>
              <Badge
                variant="secondary"
                className={cn('text-xs gap-1 shrink-0', type.color)}
              >
                {type.icon}
                {isRTL ? type.labelHe : type.label}
              </Badge>
            </div>

            {event.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">{event.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formattedDate}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formattedTime}{formattedEnd ? ` – ${formattedEnd}` : ''}
              </span>
              {event.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[160px]">{event.location}</span>
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {event.registration_count ?? 0}
                {event.max_attendees ? ` / ${event.max_attendees}` : ''}
              </span>
              {event.is_free ? (
                <Badge className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                  {isRTL ? 'חינם' : 'Free'}
                </Badge>
              ) : event.price ? (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  <Ticket className="w-2.5 h-2.5 me-0.5" />
                  {event.price}
                </Badge>
              ) : null}
            </div>
          </div>

          {/* Action button */}
          {!isPast && (
            <div className="shrink-0 self-end sm:self-center">
              {isRegistered ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-green-700 border-green-300 hover:bg-red-50 hover:text-red-600 hover:border-red-300 min-w-[100px]"
                  onClick={onUnregister}
                  disabled={isPending}
                >
                  {isPending
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <CheckCircle2 className="w-3.5 h-3.5" />}
                  {isRTL ? 'רשום' : 'Registered'}
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="gap-1.5 min-w-[100px]"
                  onClick={onRegister}
                  disabled={isPending || !!isFull}
                >
                  {isPending
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Calendar className="w-3.5 h-3.5" />}
                  {isFull
                    ? (isRTL ? 'מלא' : 'Full')
                    : (isRTL ? 'הירשם' : 'Register')}
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== Create Event Form ====================

function CreateEventForm({ hubId, onSuccess }: { hubId: string; onSuccess: () => void }) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<'online' | 'in_person' | 'hybrid'>('online');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [maxAttendees, setMaxAttendees] = useState('');
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState('');

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !title.trim() || !startDate) throw new Error('Missing required fields');
      const { error } = await (supabase as any).from('community_events').insert({
        hub_id: hubId,
        creator_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        event_type: eventType,
        location: location.trim() || null,
        start_date: new Date(startDate).toISOString(),
        end_date: endDate ? new Date(endDate).toISOString() : null,
        max_attendees: maxAttendees ? parseInt(maxAttendees) : null,
        is_free: isFree,
        price: !isFree && price ? parseFloat(price) : null,
        registration_count: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'האירוע נוצר!' : 'Event created!');
      onSuccess();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const isValid = title.trim() && startDate;

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="space-y-1.5">
        <Label className="text-xs">{isRTL ? 'כותרת *' : 'Title *'}</Label>
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder={isRTL ? 'לדוגמה: מפגש רשת חודשי' : 'e.g. Monthly Networking Meetup'}
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label className="text-xs">{isRTL ? 'תיאור' : 'Description'}</Label>
        <Textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="resize-none min-h-[70px]"
          placeholder={isRTL ? 'תאר את האירוע...' : 'Describe the event...'}
        />
      </div>

      {/* Event Type */}
      <div className="space-y-1.5">
        <Label className="text-xs">{isRTL ? 'סוג אירוע' : 'Event Type'}</Label>
        <Select value={eventType} onValueChange={(v) => setEventType(v as any)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="online">{isRTL ? 'אונליין' : 'Online'}</SelectItem>
            <SelectItem value="in_person">{isRTL ? 'פיזי' : 'In Person'}</SelectItem>
            <SelectItem value="hybrid">{isRTL ? 'היברידי' : 'Hybrid'}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Location */}
      {(eventType === 'in_person' || eventType === 'hybrid') && (
        <div className="space-y-1.5">
          <Label className="text-xs">{isRTL ? 'מיקום' : 'Location'}</Label>
          <Input
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder={isRTL ? 'כתובת או שם המקום' : 'Address or venue name'}
          />
        </div>
      )}

      {/* Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">{isRTL ? 'תאריך התחלה *' : 'Start Date *'}</Label>
          <Input
            type="datetime-local"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            dir="ltr"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{isRTL ? 'תאריך סיום' : 'End Date'}</Label>
          <Input
            type="datetime-local"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            dir="ltr"
          />
        </div>
      </div>

      {/* Max Attendees */}
      <div className="space-y-1.5">
        <Label className="text-xs">{isRTL ? 'מקסימום משתתפים (ריק = ללא הגבלה)' : 'Max Attendees (empty = unlimited)'}</Label>
        <Input
          type="number"
          value={maxAttendees}
          onChange={e => setMaxAttendees(e.target.value)}
          placeholder="50"
        />
      </div>

      {/* Free / Paid */}
      <div className="flex items-center justify-between">
        <Label className="text-sm">{isRTL ? 'אירוע חינמי' : 'Free event'}</Label>
        <Switch checked={isFree} onCheckedChange={setIsFree} />
      </div>
      {!isFree && (
        <div className="space-y-1.5">
          <Label className="text-xs">{isRTL ? 'מחיר' : 'Price'}</Label>
          <Input
            type="number"
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="49"
          />
        </div>
      )}

      <Button
        onClick={() => createMutation.mutate()}
        disabled={!isValid || createMutation.isPending}
        className="w-full gap-2"
      >
        {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        {isRTL ? 'צור אירוע' : 'Create Event'}
      </Button>
    </div>
  );
}
