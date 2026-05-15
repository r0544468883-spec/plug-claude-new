import { useState, useEffect, useRef, useCallback } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Plus, Users, Clock, Loader2, Zap, Play, Video,
  Star, Heart, UserCheck, Timer, Coffee, Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { he, enUS } from 'date-fns/locale';

interface SpeedNetworkingTabProps {
  hubId: string;
  isAdmin: boolean;
}

const STATUS_CONFIG = {
  scheduled: { en: 'Scheduled', he: 'מתוכנן', color: 'bg-blue-100 text-blue-700' },
  lobby:     { en: 'Lobby',     he: 'לובי',   color: 'bg-yellow-100 text-yellow-700' },
  active:    { en: 'Active',    he: 'פעיל',   color: 'bg-green-100 text-green-700' },
  ended:     { en: 'Ended',     he: 'הסתיים', color: 'bg-gray-100 text-gray-600' },
};

export function SpeedNetworkingTab({ hubId, isAdmin }: SpeedNetworkingTabProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const queryClient = useQueryClient();
  const dateLocale = isRTL ? he : enUS;
  const [showCreate, setShowCreate] = useState(false);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);

  // Fetch all speed networking events
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['speed-networking-events', hubId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('community_speed_networking')
        .select('*, community_speed_networking_participants(count)')
        .eq('hub_id', hubId)
        .order('scheduled_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch my participations
  const { data: myParticipations = [] } = useQuery({
    queryKey: ['speed-networking-my-participations', user?.id, hubId],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await (supabase as any)
        .from('community_speed_networking_participants')
        .select('event_id')
        .eq('user_id', user.id);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const joinedEventIds = new Set(myParticipations.map((p: any) => p.event_id));

  const joinMutation = useMutation({
    mutationFn: async (eventId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await (supabase as any)
        .from('community_speed_networking_participants')
        .insert({ event_id: eventId, user_id: user.id, interests: [] });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'הצטרפת לאירוע!' : 'Joined the event!');
      queryClient.invalidateQueries({ queryKey: ['speed-networking-events', hubId] });
      queryClient.invalidateQueries({ queryKey: ['speed-networking-my-participations'] });
    },
    onError: () => toast.error(isRTL ? 'שגיאה בהצטרפות' : 'Failed to join'),
  });

  const upcomingEvents = events.filter((e: any) => e.status !== 'ended');
  const pastEvents = events.filter((e: any) => e.status === 'ended');

  // If user clicks into an active/lobby session
  const activeEvent = activeEventId ? events.find((e: any) => e.id === activeEventId) : null;
  if (activeEvent && (activeEvent.status === 'lobby' || activeEvent.status === 'active')) {
    return (
      <ActiveSessionView
        event={activeEvent}
        hubId={hubId}
        isAdmin={isAdmin}
        onBack={() => setActiveEventId(null)}
      />
    );
  }

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          {isRTL ? 'נטוורקינג מהיר' : 'Speed Networking'}
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
                <DialogTitle>{isRTL ? 'יצירת נטוורקינג מהיר' : 'Create Speed Networking Event'}</DialogTitle>
              </DialogHeader>
              <CreateSpeedEventForm
                hubId={hubId}
                onSuccess={() => {
                  setShowCreate(false);
                  queryClient.invalidateQueries({ queryKey: ['speed-networking-events', hubId] });
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Upcoming / Active events */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-2">
          {isRTL ? `קרובים ופעילים (${upcomingEvents.length})` : `Upcoming & Active (${upcomingEvents.length})`}
        </h4>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : upcomingEvents.length === 0 ? (
          <Card className="bg-card">
            <CardContent className="p-10 text-center">
              <Zap className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground text-sm">
                {isRTL ? 'אין אירועי נטוורקינג מהיר קרובים' : 'No upcoming speed networking events'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcomingEvents.map((event: any) => {
              const participantCount = event.community_speed_networking_participants?.[0]?.count ?? 0;
              const status = STATUS_CONFIG[event.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.scheduled;
              const isJoined = joinedEventIds.has(event.id);
              const isFull = event.max_participants && participantCount >= event.max_participants;

              return (
                <Card key={event.id} className="transition-shadow hover:shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                      <div className="hidden sm:flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-primary/10 text-primary shrink-0">
                        <Zap className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <h4 className="font-semibold text-sm">{isRTL ? (event.title_he || event.title) : event.title}</h4>
                          <Badge variant="secondary" className={cn('text-xs shrink-0', status.color)}>
                            {isRTL ? status.he : status.en}
                          </Badge>
                        </div>
                        {event.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{event.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {format(new Date(event.scheduled_at), 'PPP HH:mm', { locale: dateLocale })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Timer className="w-3.5 h-3.5" />
                            {event.round_duration_seconds}{isRTL ? ' שניות/סבב' : 's/round'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {participantCount}{event.max_participants ? ` / ${event.max_participants}` : ''}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 flex gap-2 self-end sm:self-center">
                        {(event.status === 'lobby' || event.status === 'active') && isJoined && (
                          <Button size="sm" variant="default" className="gap-1.5" onClick={() => setActiveEventId(event.id)}>
                            <Play className="w-3.5 h-3.5" />
                            {isRTL ? 'כניסה' : 'Enter'}
                          </Button>
                        )}
                        {!isJoined && event.status !== 'active' ? (
                          <Button
                            size="sm"
                            className="gap-1.5 min-w-[90px]"
                            onClick={() => joinMutation.mutate(event.id)}
                            disabled={joinMutation.isPending || !!isFull}
                          >
                            {joinMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                            {isFull ? (isRTL ? 'מלא' : 'Full') : (isRTL ? 'הצטרף' : 'Join')}
                          </Button>
                        ) : !isJoined ? null : (
                          event.status === 'scheduled' && (
                            <Badge variant="outline" className="text-green-700 border-green-300">
                              {isRTL ? 'רשום' : 'Joined'}
                            </Badge>
                          )
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Past events */}
      {pastEvents.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            {isRTL ? `הסתיימו (${pastEvents.length})` : `Past (${pastEvents.length})`}
          </h4>
          <div className="space-y-3">
            {pastEvents.map((event: any) => {
              const participantCount = event.community_speed_networking_participants?.[0]?.count ?? 0;
              return (
                <Card key={event.id} className="opacity-70">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="space-y-1">
                        <h4 className="font-semibold text-sm">{isRTL ? (event.title_he || event.title) : event.title}</h4>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDistanceToNow(new Date(event.ended_at || event.scheduled_at), { addSuffix: true, locale: dateLocale })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {participantCount} {isRTL ? 'משתתפים' : 'participants'}
                          </span>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-xs">
                        {isRTL ? 'הסתיים' : 'Ended'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== Active Session View ====================

function ActiveSessionView({ event, hubId, isAdmin, onBack }: {
  event: any;
  hubId: string;
  isAdmin: boolean;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const queryClient = useQueryClient();
  const dateLocale = isRTL ? he : enUS;
  const [timeLeft, setTimeLeft] = useState(0);
  const [rating, setRating] = useState(0);
  const [wantConnect, setWantConnect] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch participants with profiles
  const { data: participants = [] } = useQuery({
    queryKey: ['speed-networking-participants', event.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('community_speed_networking_participants')
        .select('*, profiles(full_name, avatar_url)')
        .eq('event_id', event.id);
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });

  // Fetch current round for this user
  const { data: currentRound } = useQuery({
    queryKey: ['speed-networking-current-round', event.id, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await (supabase as any)
        .from('community_speed_networking_rounds')
        .select('*, partner:profiles!community_speed_networking_rounds_user_b_fkey(full_name, avatar_url)')
        .eq('event_id', event.id)
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .is('ended_at', null)
        .order('round_number', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: event.status === 'active' && !!user?.id,
    refetchInterval: 3000,
  });

  // Fetch total rounds completed
  const { data: completedRounds = [] } = useQuery({
    queryKey: ['speed-networking-rounds-count', event.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('community_speed_networking_rounds')
        .select('round_number')
        .eq('event_id', event.id)
        .not('ended_at', 'is', null);
      return data || [];
    },
    enabled: event.status === 'active',
    refetchInterval: 5000,
  });

  const totalPossibleRounds = Math.max(participants.length - 1, 1);
  const highestRound = currentRound?.round_number ?? (completedRounds.length > 0
    ? Math.max(...completedRounds.map((r: any) => r.round_number)) : 0);
  const progressPercent = Math.min((highestRound / totalPossibleRounds) * 100, 100);

  // Timer countdown
  useEffect(() => {
    if (!currentRound?.started_at) return;
    const roundEnd = new Date(currentRound.started_at).getTime() + (event.round_duration_seconds * 1000);

    const tick = () => {
      const remaining = Math.max(0, Math.floor((roundEnd - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0 && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [currentRound?.started_at, event.round_duration_seconds]);

  // Reset rating when round changes
  useEffect(() => {
    setRating(0);
    setWantConnect(false);
  }, [currentRound?.id]);

  const submitRatingMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !currentRound?.id) throw new Error('Missing data');
      const isUserA = currentRound.user_a === user.id;
      const updateFields = isUserA
        ? { rating_a: rating, want_connect_a: wantConnect }
        : { rating_b: rating, want_connect_b: wantConnect };
      const { error } = await (supabase as any)
        .from('community_speed_networking_rounds')
        .update(updateFields)
        .eq('id', currentRound.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'הדירוג נשמר!' : 'Rating saved!');
      queryClient.invalidateQueries({ queryKey: ['speed-networking-current-round', event.id] });
    },
    onError: () => toast.error(isRTL ? 'שגיאה בשמירת דירוג' : 'Failed to save rating'),
  });

  const startEventMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from('community_speed_networking')
        .update({ status: 'active', started_at: new Date().toISOString() })
        .eq('id', event.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'האירוע התחיל!' : 'Event started!');
      queryClient.invalidateQueries({ queryKey: ['speed-networking-events', hubId] });
    },
  });

  // Determine partner info
  const getPartnerProfile = useCallback(() => {
    if (!currentRound || !user?.id) return null;
    const partnerId = currentRound.user_a === user.id ? currentRound.user_b : currentRound.user_a;
    const partnerParticipant = participants.find((p: any) => p.user_id === partnerId);
    return partnerParticipant?.profiles ?? currentRound.partner ?? null;
  }, [currentRound, user?.id, participants]);

  const partner = getPartnerProfile();
  const isBreak = event.status === 'active' && !currentRound && highestRound > 0;
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          {isRTL ? 'חזרה' : 'Back'}
        </Button>
        <h3 className="font-semibold text-lg">{isRTL ? (event.title_he || event.title) : event.title}</h3>
        <Badge variant="secondary" className={cn('text-xs', STATUS_CONFIG[event.status as keyof typeof STATUS_CONFIG]?.color)}>
          {isRTL ? STATUS_CONFIG[event.status as keyof typeof STATUS_CONFIG]?.he : STATUS_CONFIG[event.status as keyof typeof STATUS_CONFIG]?.en}
        </Badge>
      </div>

      {/* Progress */}
      {event.status === 'active' && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{isRTL ? `סבב ${highestRound}` : `Round ${highestRound}`}</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      )}

      {/* Lobby state */}
      {event.status === 'lobby' && (
        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <Coffee className="w-12 h-12 text-yellow-500 mx-auto" />
            <h4 className="font-semibold">{isRTL ? 'ממתינים בלובי...' : 'Waiting in Lobby...'}</h4>
            <p className="text-sm text-muted-foreground">
              {isRTL
                ? `${participants.length} משתתפים מחוברים. ממתינים למנהל להתחיל.`
                : `${participants.length} participants connected. Waiting for host to start.`}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {participants.map((p: any) => (
                <div key={p.user_id} className="flex items-center gap-1.5 bg-muted rounded-full px-3 py-1">
                  {p.profiles?.avatar_url ? (
                    <img src={p.profiles.avatar_url} className="w-5 h-5 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                      {(p.profiles?.full_name || '?')[0]}
                    </div>
                  )}
                  <span className="text-xs">{p.profiles?.full_name || (isRTL ? 'משתתף' : 'Participant')}</span>
                </div>
              ))}
            </div>
            {isAdmin && (
              <Button onClick={() => startEventMutation.mutate()} disabled={startEventMutation.isPending} className="gap-2">
                {startEventMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <Play className="w-4 h-4" />
                {isRTL ? 'התחל נטוורקינג' : 'Start Networking'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Break between rounds */}
      {isBreak && (
        <Card>
          <CardContent className="p-6 text-center space-y-3">
            <Coffee className="w-10 h-10 text-orange-400 mx-auto animate-pulse" />
            <h4 className="font-semibold">{isRTL ? 'הפסקה בין סבבים' : 'Break Between Rounds'}</h4>
            <p className="text-sm text-muted-foreground">
              {isRTL ? 'הסבב הבא מתחיל בקרוב...' : 'Next round starting soon...'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Active round with partner */}
      {event.status === 'active' && currentRound && (
        <Card className="border-primary/30">
          <CardContent className="p-5 space-y-4">
            {/* Timer */}
            <div className="text-center">
              <div className={cn(
                'text-4xl font-mono font-bold tabular-nums',
                timeLeft <= 10 && timeLeft > 0 && 'text-red-500 animate-pulse',
                timeLeft === 0 && 'text-muted-foreground',
              )}>
                {formatTime(timeLeft)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {timeLeft > 0
                  ? (isRTL ? 'זמן שנותר בסבב' : 'Time remaining in round')
                  : (isRTL ? 'הסבב הסתיים' : 'Round ended')}
              </p>
            </div>

            {/* Partner info */}
            {partner && (
              <div className="flex flex-col items-center gap-3 py-3">
                {partner.avatar_url ? (
                  <img src={partner.avatar_url} className="w-16 h-16 rounded-full object-cover ring-2 ring-primary/20" alt="" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                    {(partner.full_name || '?')[0]}
                  </div>
                )}
                <h4 className="font-semibold">{partner.full_name || (isRTL ? 'משתתף' : 'Participant')}</h4>
              </div>
            )}

            {/* Jitsi room link */}
            {currentRound.room_url && (
              <Button asChild variant="outline" className="w-full gap-2">
                <a href={currentRound.room_url} target="_blank" rel="noopener noreferrer">
                  <Video className="w-4 h-4" />
                  {isRTL ? 'פתח חדר שיחה' : 'Open Video Room'}
                </a>
              </Button>
            )}

            {/* Rating section (visible when timer ends) */}
            {timeLeft === 0 && (
              <div className="border-t pt-4 space-y-3">
                <p className="text-sm font-medium text-center">
                  {isRTL ? 'דרג את השיחה' : 'Rate the conversation'}
                </p>
                {/* Stars */}
                <div className="flex justify-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onClick={() => setRating(s)}
                      className="p-1 transition-transform hover:scale-110"
                      aria-label={`${s} stars`}
                    >
                      <Star className={cn(
                        'w-6 h-6 transition-colors',
                        s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300',
                      )} />
                    </button>
                  ))}
                </div>
                {/* Want to connect */}
                <button
                  onClick={() => setWantConnect(!wantConnect)}
                  className={cn(
                    'mx-auto flex items-center gap-2 px-4 py-2 rounded-full border transition-colors text-sm',
                    wantConnect ? 'bg-pink-50 border-pink-300 text-pink-700' : 'border-gray-200 text-muted-foreground',
                  )}
                >
                  <Heart className={cn('w-4 h-4', wantConnect && 'fill-pink-500 text-pink-500')} />
                  {isRTL ? 'רוצה להישאר בקשר' : 'Want to connect'}
                </button>
                {/* Submit */}
                <Button
                  onClick={() => submitRatingMutation.mutate()}
                  disabled={rating === 0 || submitRatingMutation.isPending}
                  className="w-full gap-2"
                  size="sm"
                >
                  {submitRatingMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isRTL ? 'שלח דירוג' : 'Submit Rating'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mutual connections (past events or after session) */}
      {event.status === 'active' && <MutualConnections eventId={event.id} />}
    </div>
  );
}

// ==================== Mutual Connections ====================

function MutualConnections({ eventId }: { eventId: string }) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';

  const { data: mutuals = [] } = useQuery({
    queryKey: ['speed-networking-mutuals', eventId, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await (supabase as any)
        .from('community_speed_networking_rounds')
        .select('*, user_a_profile:profiles!community_speed_networking_rounds_user_a_fkey(full_name, avatar_url), user_b_profile:profiles!community_speed_networking_rounds_user_b_fkey(full_name, avatar_url)')
        .eq('event_id', eventId)
        .eq('want_connect_a', true)
        .eq('want_connect_b', true)
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  if (mutuals.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-500" />
          {isRTL ? 'חיבורים הדדיים' : 'Mutual Connections'}
        </h4>
        <div className="space-y-2">
          {mutuals.map((r: any) => {
            const isA = r.user_a === user?.id;
            const profile = isA ? r.user_b_profile : r.user_a_profile;
            return (
              <div key={r.id} className="flex items-center gap-2 bg-green-50 rounded-lg px-3 py-2">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} className="w-7 h-7 rounded-full object-cover" alt="" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-green-200 flex items-center justify-center text-xs font-bold text-green-800">
                    {(profile?.full_name || '?')[0]}
                  </div>
                )}
                <span className="text-sm font-medium">{profile?.full_name}</span>
                <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-500 ms-auto" />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== Create Event Form ====================

function CreateSpeedEventForm({ hubId, onSuccess }: { hubId: string; onSuccess: () => void }) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';

  const [title, setTitle] = useState('');
  const [titleHe, setTitleHe] = useState('');
  const [description, setDescription] = useState('');
  const [roundDuration, setRoundDuration] = useState('180');
  const [breakDuration, setBreakDuration] = useState('30');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !title.trim() || !scheduledAt) throw new Error('Missing required fields');
      const { error } = await (supabase as any).from('community_speed_networking').insert({
        hub_id: hubId,
        creator_id: user.id,
        title: title.trim(),
        title_he: titleHe.trim() || null,
        description: description.trim() || null,
        round_duration_seconds: parseInt(roundDuration) || 180,
        break_duration_seconds: parseInt(breakDuration) || 30,
        max_participants: maxParticipants ? parseInt(maxParticipants) : null,
        status: 'scheduled',
        scheduled_at: new Date(scheduledAt).toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'האירוע נוצר!' : 'Event created!');
      onSuccess();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const isValid = title.trim() && scheduledAt;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs">{isRTL ? 'כותרת (אנגלית) *' : 'Title (English) *'}</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Friday Speed Networking" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">{isRTL ? 'כותרת (עברית)' : 'Title (Hebrew)'}</Label>
        <Input value={titleHe} onChange={e => setTitleHe(e.target.value)} placeholder="לדוגמה: נטוורקינג מהיר יום שישי" dir="rtl" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">{isRTL ? 'תיאור' : 'Description'}</Label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} className="resize-none min-h-[60px]" placeholder={isRTL ? 'תיאור קצר...' : 'Short description...'} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">{isRTL ? 'משך סבב (שניות)' : 'Round Duration (sec)'}</Label>
          <Input type="number" value={roundDuration} onChange={e => setRoundDuration(e.target.value)} placeholder="180" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{isRTL ? 'הפסקה (שניות)' : 'Break Duration (sec)'}</Label>
          <Input type="number" value={breakDuration} onChange={e => setBreakDuration(e.target.value)} placeholder="30" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">{isRTL ? 'מקסימום משתתפים (ריק = ללא הגבלה)' : 'Max Participants (empty = unlimited)'}</Label>
        <Input type="number" value={maxParticipants} onChange={e => setMaxParticipants(e.target.value)} placeholder="20" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">{isRTL ? 'תאריך ושעה *' : 'Date & Time *'}</Label>
        <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} dir="ltr" />
      </div>
      <Button onClick={() => createMutation.mutate()} disabled={!isValid || createMutation.isPending} className="w-full gap-2">
        {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        {isRTL ? 'צור אירוע' : 'Create Event'}
      </Button>
    </div>
  );
}
