import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
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
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  GraduationCap, Users, UserCheck, Handshake, Calendar,
  Clock, Star, Loader2, Search, Video, Plus, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { he, enUS } from 'date-fns/locale';

// ─── Props ────────────────────────────────────────────────────────────────────

interface MentorshipTabProps {
  hubId: string;
  isAdmin: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MentorshipTab({ hubId, isAdmin }: MentorshipTabProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const queryClient = useQueryClient();
  const dateLocale = isRTL ? he : enUS;

  const [activeTab, setActiveTab] = useState('browse');
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [sessionMatchId, setSessionMatchId] = useState<string | null>(null);
  const [expertiseFilter, setExpertiseFilter] = useState('');

  // ── i18n ──────────────────────────────────────────────────────────────────
  const t = {
    mentorship: isRTL ? 'מנטורינג' : 'Mentorship',
    myProfile: isRTL ? 'הפרופיל שלי' : 'My Profile',
    browse: isRTL ? 'חיפוש מנטורים' : 'Find Mentors',
    myMatches: isRTL ? 'ההתאמות שלי' : 'My Matches',
    createProfile: isRTL ? 'צור פרופיל מנטורינג' : 'Create Mentorship Profile',
    editProfile: isRTL ? 'ערוך פרופיל' : 'Edit Profile',
    role: isRTL ? 'תפקיד' : 'Role',
    mentor: isRTL ? 'מנטור' : 'Mentor',
    mentee: isRTL ? 'מנטי' : 'Mentee',
    both: isRTL ? 'שניהם' : 'Both',
    bio: isRTL ? 'ביוגרפיה' : 'Bio',
    bioPlaceholder: isRTL ? 'ספר/י על עצמך והניסיון שלך...' : 'Tell about yourself and your experience...',
    expertise: isRTL ? 'תחומי מומחיות' : 'Expertise',
    expertisePlaceholder: isRTL ? 'React, TypeScript, ניהול (מופרדים בפסיק)' : 'React, TypeScript, Management (comma-separated)',
    lookingFor: isRTL ? 'מחפש/ת עזרה ב' : 'Looking for help with',
    lookingForPlaceholder: isRTL ? 'קריירה, ראיונות, קוד (מופרדים בפסיק)' : 'Career, Interviews, Code (comma-separated)',
    yearsExperience: isRTL ? 'שנות ניסיון' : 'Years of Experience',
    maxMentees: isRTL ? 'מקסימום מנטיז' : 'Max Mentees',
    available: isRTL ? 'זמין למנטורינג' : 'Available for Mentorship',
    save: isRTL ? 'שמור' : 'Save',
    requestMatch: isRTL ? 'בקש התאמה' : 'Request Match',
    matchScore: isRTL ? 'ציון התאמה' : 'Match Score',
    pending: isRTL ? 'ממתין' : 'Pending',
    active: isRTL ? 'פעיל' : 'Active',
    declined: isRTL ? 'נדחה' : 'Declined',
    accept: isRTL ? 'קבל' : 'Accept',
    decline: isRTL ? 'דחה' : 'Decline',
    scheduleSession: isRTL ? 'תזמן מפגש' : 'Schedule Session',
    sessionTitle: isRTL ? 'כותרת המפגש' : 'Session Title',
    sessionDate: isRTL ? 'תאריך ושעה' : 'Date & Time',
    duration: isRTL ? 'משך (דקות)' : 'Duration (minutes)',
    notes: isRTL ? 'הערות' : 'Notes',
    create: isRTL ? 'צור' : 'Create',
    cancel: isRTL ? 'ביטול' : 'Cancel',
    noProfiles: isRTL ? 'אין פרופילים זמינים' : 'No profiles available',
    noProfilesDesc: isRTL ? 'היה הראשון ליצור פרופיל מנטורינג!' : 'Be the first to create a mentorship profile!',
    noMatches: isRTL ? 'אין התאמות עדיין' : 'No matches yet',
    noMatchesDesc: isRTL ? 'חפש מנטורים ובקש התאמה' : 'Browse mentors and request a match',
    profileSaved: isRTL ? 'הפרופיל נשמר!' : 'Profile saved!',
    requestSent: isRTL ? 'הבקשה נשלחה!' : 'Request sent!',
    matchAccepted: isRTL ? 'ההתאמה אושרה!' : 'Match accepted!',
    matchDeclined: isRTL ? 'ההתאמה נדחתה' : 'Match declined',
    sessionCreated: isRTL ? 'המפגש נוצר!' : 'Session created!',
    error: isRTL ? 'שגיאה' : 'Error',
    filterByExpertise: isRTL ? 'סנן לפי מומחיות...' : 'Filter by expertise...',
    yearsExp: isRTL ? 'שנות ניסיון' : 'yrs exp',
    sessions: isRTL ? 'מפגשים' : 'Sessions',
    noSessions: isRTL ? 'אין מפגשים עדיין' : 'No sessions yet',
    joinMeeting: isRTL ? 'הצטרף למפגש' : 'Join Meeting',
    completed: isRTL ? 'הושלם' : 'Completed',
    scheduled: isRTL ? 'מתוכנן' : 'Scheduled',
    setupProfile: isRTL ? 'הגדר פרופיל מנטורינג כדי להתחיל' : 'Set up your mentorship profile to get started',
  };

  // ── Fetch my profile ──────────────────────────────────────────────────────
  const { data: myProfile, isLoading: loadingProfile } = useQuery({
    queryKey: ['mentorship-profile', hubId, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await (supabase as any)
        .from('community_mentorship_profiles')
        .select('*')
        .eq('hub_id', hubId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // ── Fetch all profiles with user info ─────────────────────────────────────
  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ['mentorship-profiles', hubId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('community_mentorship_profiles')
        .select('*, profiles(full_name, avatar_url)')
        .eq('hub_id', hubId)
        .eq('is_available', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // ── Fetch my matches ──────────────────────────────────────────────────────
  const { data: matches = [], isLoading: loadingMatches } = useQuery({
    queryKey: ['mentorship-matches', hubId, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: asMentor } = await (supabase as any)
        .from('community_mentorship_matches')
        .select('*, mentor:profiles!community_mentorship_matches_mentor_id_fkey(full_name, avatar_url), mentee:profiles!community_mentorship_matches_mentee_id_fkey(full_name, avatar_url)')
        .eq('hub_id', hubId)
        .eq('mentor_id', user.id);
      const { data: asMentee } = await (supabase as any)
        .from('community_mentorship_matches')
        .select('*, mentor:profiles!community_mentorship_matches_mentor_id_fkey(full_name, avatar_url), mentee:profiles!community_mentorship_matches_mentee_id_fkey(full_name, avatar_url)')
        .eq('hub_id', hubId)
        .eq('mentee_id', user.id);
      return [...(asMentor ?? []), ...(asMentee ?? [])];
    },
    enabled: !!user?.id,
  });

  // ── Fetch sessions for active matches ─────────────────────────────────────
  const activeMatchIds = matches.filter((m: any) => m.status === 'active').map((m: any) => m.id);
  const { data: sessions = [] } = useQuery({
    queryKey: ['mentorship-sessions', activeMatchIds],
    queryFn: async () => {
      if (activeMatchIds.length === 0) return [];
      const { data, error } = await (supabase as any)
        .from('community_mentorship_sessions')
        .select('*')
        .in('match_id', activeMatchIds)
        .order('scheduled_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: activeMatchIds.length > 0,
  });

  // ── Save profile mutation ─────────────────────────────────────────────────
  const saveProfileMutation = useMutation({
    mutationFn: async (form: any) => {
      if (!user?.id) throw new Error('Not authenticated');
      const payload = {
        hub_id: hubId,
        user_id: user.id,
        role: form.role,
        bio: form.bio.trim() || null,
        expertise: form.expertise.split(',').map((s: string) => s.trim()).filter(Boolean),
        looking_for: form.lookingFor.split(',').map((s: string) => s.trim()).filter(Boolean),
        years_experience: form.yearsExperience ? parseInt(form.yearsExperience) : null,
        max_mentees: form.maxMentees ? parseInt(form.maxMentees) : null,
        is_available: form.isAvailable,
      };
      if (myProfile) {
        const { error } = await (supabase as any)
          .from('community_mentorship_profiles')
          .update(payload)
          .eq('id', myProfile.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('community_mentorship_profiles')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(t.profileSaved);
      setShowProfileDialog(false);
      queryClient.invalidateQueries({ queryKey: ['mentorship-profile', hubId] });
      queryClient.invalidateQueries({ queryKey: ['mentorship-profiles', hubId] });
    },
    onError: () => toast.error(t.error),
  });

  // ── Request match mutation ────────────────────────────────────────────────
  const requestMatchMutation = useMutation({
    mutationFn: async (targetProfile: any) => {
      if (!user?.id || !myProfile) throw new Error('Not authenticated');
      const isMentor = targetProfile.role === 'mentor' || targetProfile.role === 'both';
      const mentorId = isMentor ? targetProfile.user_id : user.id;
      const menteeId = isMentor ? user.id : targetProfile.user_id;
      const myTags = new Set(myProfile.expertise ?? []);
      const theirTags = new Set(targetProfile.expertise ?? []);
      const overlap = [...myTags].filter((tag: string) => theirTags.has(tag)).length;
      const total = new Set([...myTags, ...theirTags]).size;
      const score = total > 0 ? Math.round((overlap / total) * 100) : 0;
      const { error } = await (supabase as any)
        .from('community_mentorship_matches')
        .insert({
          hub_id: hubId,
          mentor_id: mentorId,
          mentee_id: menteeId,
          status: 'pending',
          match_score: score,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t.requestSent);
      queryClient.invalidateQueries({ queryKey: ['mentorship-matches', hubId] });
    },
    onError: () => toast.error(t.error),
  });

  // ── Accept/decline match mutation ─────────────────────────────────────────
  const updateMatchMutation = useMutation({
    mutationFn: async ({ matchId, status }: { matchId: string; status: string }) => {
      const { error } = await (supabase as any)
        .from('community_mentorship_matches')
        .update({ status })
        .eq('id', matchId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.status === 'active' ? t.matchAccepted : t.matchDeclined);
      queryClient.invalidateQueries({ queryKey: ['mentorship-matches', hubId] });
    },
    onError: () => toast.error(t.error),
  });

  // ── Create session mutation ───────────────────────────────────────────────
  const createSessionMutation = useMutation({
    mutationFn: async (form: any) => {
      const roomId = `plug-mentor-${form.matchId}-${Date.now()}`;
      const meetingUrl = `https://meet.jit.si/${roomId}`;
      const { error } = await (supabase as any)
        .from('community_mentorship_sessions')
        .insert({
          match_id: form.matchId,
          title: form.title.trim(),
          scheduled_at: new Date(form.scheduledAt).toISOString(),
          duration_minutes: parseInt(form.duration) || 30,
          meeting_url: meetingUrl,
          notes: form.notes.trim() || null,
          status: 'scheduled',
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t.sessionCreated);
      setShowSessionDialog(false);
      setSessionMatchId(null);
      queryClient.invalidateQueries({ queryKey: ['mentorship-sessions'] });
    },
    onError: () => toast.error(t.error),
  });

  // ── Computed: filtered profiles ───────────────────────────────────────────
  const filteredProfiles = useMemo(() => {
    const others = profiles.filter((p: any) => p.user_id !== user?.id);
    if (!expertiseFilter.trim()) return others;
    const filter = expertiseFilter.toLowerCase();
    return others.filter((p: any) =>
      (p.expertise ?? []).some((tag: string) => tag.toLowerCase().includes(filter))
    );
  }, [profiles, user?.id, expertiseFilter]);

  // ── Computed: match score for display ─────────────────────────────────────
  const getMatchScore = (profile: any): number => {
    if (!myProfile) return 0;
    const myTags = new Set((myProfile.expertise ?? []).map((s: string) => s.toLowerCase()));
    const theirTags = new Set((profile.expertise ?? []).map((s: string) => s.toLowerCase()));
    const overlap = [...myTags].filter((tag: string) => theirTags.has(tag)).length;
    const total = new Set([...myTags, ...theirTags]).size;
    return total > 0 ? Math.round((overlap / total) * 100) : 0;
  };

  const pendingMatches = matches.filter((m: any) => m.status === 'pending');
  const activeMatches = matches.filter((m: any) => m.status === 'active');

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-primary" />
          {t.mentorship}
        </h3>
        <Button size="sm" className="gap-1.5" onClick={() => setShowProfileDialog(true)}>
          {myProfile ? <UserCheck className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {myProfile ? t.editProfile : t.createProfile}
        </Button>
      </div>

      {/* Profile prompt if no profile */}
      {!loadingProfile && !myProfile && (
        <Card className="border-dashed border-primary/30">
          <CardContent className="p-6 text-center">
            <GraduationCap className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
            <p className="text-sm text-muted-foreground">{t.setupProfile}</p>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="browse" className="flex-1 gap-1.5">
            <Search className="w-3.5 h-3.5" />
            {t.browse}
          </TabsTrigger>
          <TabsTrigger value="matches" className="flex-1 gap-1.5">
            <Handshake className="w-3.5 h-3.5" />
            {t.myMatches} {matches.length > 0 && `(${matches.length})`}
          </TabsTrigger>
        </TabsList>

        {/* ── Browse Tab ─────────────────────────────────────────────────────── */}
        <TabsContent value="browse" className="mt-4 space-y-3">
          <div className="relative">
            <Search className="absolute top-2.5 start-3 w-4 h-4 text-muted-foreground" />
            <Input
              value={expertiseFilter}
              onChange={e => setExpertiseFilter(e.target.value)}
              placeholder={t.filterByExpertise}
              className="ps-9"
            />
          </div>

          {loadingProfiles ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
          ) : filteredProfiles.length === 0 ? (
            <Card className="bg-card">
              <CardContent className="p-12 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-muted-foreground font-medium">{t.noProfiles}</p>
                <p className="text-sm text-muted-foreground mt-1">{t.noProfilesDesc}</p>
              </CardContent>
            </Card>
          ) : (
            filteredProfiles.map((profile: any) => {
              const score = getMatchScore(profile);
              const name = profile.profiles?.full_name || (isRTL ? 'משתמש' : 'User');
              const avatar = profile.profiles?.avatar_url;
              const alreadyMatched = matches.some((m: any) =>
                m.mentor_id === profile.user_id || m.mentee_id === profile.user_id
              );
              return (
                <Card key={profile.id} className="transition-shadow hover:shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 overflow-hidden shrink-0">
                        {avatar ? (
                          <img src={avatar} alt={name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-primary font-semibold text-sm">
                            {name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{name}</span>
                            <Badge variant="secondary" className="text-xs capitalize">
                              {profile.role === 'mentor' ? t.mentor : profile.role === 'mentee' ? t.mentee : t.both}
                            </Badge>
                          </div>
                          {myProfile && score > 0 && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Star className="w-3 h-3" />
                              {score}% {t.matchScore}
                            </Badge>
                          )}
                        </div>
                        {profile.bio && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{profile.bio}</p>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {(profile.expertise ?? []).slice(0, 5).map((tag: string) => (
                            <Badge key={tag} variant="outline" className="text-xs py-0 px-1.5">{tag}</Badge>
                          ))}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {profile.years_experience != null && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {profile.years_experience} {t.yearsExp}
                            </span>
                          )}
                          {profile.max_mentees != null && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {isRTL ? `עד ${profile.max_mentees} מנטיז` : `Up to ${profile.max_mentees} mentees`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 self-center">
                        <Button
                          size="sm"
                          className="gap-1.5"
                          disabled={!myProfile || alreadyMatched || requestMatchMutation.isPending}
                          onClick={() => requestMatchMutation.mutate(profile)}
                        >
                          {requestMatchMutation.isPending
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Handshake className="w-3.5 h-3.5" />}
                          {alreadyMatched ? (isRTL ? 'בקשה נשלחה' : 'Requested') : t.requestMatch}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* ── Matches Tab ────────────────────────────────────────────────────── */}
        <TabsContent value="matches" className="mt-4 space-y-4">
          {loadingMatches ? (
            <div className="space-y-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
            </div>
          ) : matches.length === 0 ? (
            <Card className="bg-card">
              <CardContent className="p-12 text-center">
                <Handshake className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-muted-foreground font-medium">{t.noMatches}</p>
                <p className="text-sm text-muted-foreground mt-1">{t.noMatchesDesc}</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Pending requests */}
              {pendingMatches.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">{t.pending}</h4>
                  {pendingMatches.map((match: any) => {
                    const isMyMentorRequest = match.mentor_id === user?.id;
                    const otherUser = isMyMentorRequest ? match.mentee : match.mentor;
                    const otherName = otherUser?.full_name || (isRTL ? 'משתמש' : 'User');
                    return (
                      <Card key={match.id} className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/10">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 text-xs font-semibold shrink-0">
                                {otherName.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <span className="text-sm font-medium block truncate">{otherName}</span>
                                <span className="text-xs text-muted-foreground">
                                  {match.match_score != null && `${match.match_score}% ${t.matchScore}`}
                                </span>
                              </div>
                            </div>
                            {isMyMentorRequest && (
                              <div className="flex gap-2 shrink-0">
                                <Button
                                  size="sm"
                                  onClick={() => updateMatchMutation.mutate({ matchId: match.id, status: 'active' })}
                                  disabled={updateMatchMutation.isPending}
                                  className="gap-1"
                                >
                                  {updateMatchMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                                  {t.accept}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateMatchMutation.mutate({ matchId: match.id, status: 'declined' })}
                                  disabled={updateMatchMutation.isPending}
                                >
                                  {t.decline}
                                </Button>
                              </div>
                            )}
                            {!isMyMentorRequest && (
                              <Badge variant="secondary" className="text-xs">{t.pending}</Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Active matches */}
              {activeMatches.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">{t.active}</h4>
                  {activeMatches.map((match: any) => {
                    const isMentor = match.mentor_id === user?.id;
                    const otherUser = isMentor ? match.mentee : match.mentor;
                    const otherName = otherUser?.full_name || (isRTL ? 'משתמש' : 'User');
                    const matchSessions = sessions.filter((s: any) => s.match_id === match.id);
                    return (
                      <Card key={match.id} className="border-green-200 bg-green-50/50 dark:bg-green-950/10">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-semibold shrink-0">
                                {otherName.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <span className="text-sm font-medium block truncate">{otherName}</span>
                                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                                  {isMentor ? t.mentee : t.mentor}
                                </Badge>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 shrink-0"
                              onClick={() => { setSessionMatchId(match.id); setShowSessionDialog(true); }}
                            >
                              <Video className="w-3.5 h-3.5" />
                              {t.scheduleSession}
                            </Button>
                          </div>
                          {/* Session list */}
                          {matchSessions.length > 0 && (
                            <div className="space-y-1.5 border-t pt-2">
                              <span className="text-xs font-medium text-muted-foreground">{t.sessions}</span>
                              {matchSessions.slice(0, 3).map((session: any) => (
                                <div key={session.id} className="flex items-center justify-between text-xs gap-2 bg-muted/40 rounded-md px-3 py-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
                                    <span className="truncate">{session.title}</span>
                                    <span className="text-muted-foreground shrink-0">
                                      {formatDistanceToNow(new Date(session.scheduled_at), { addSuffix: true, locale: dateLocale })}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {session.status === 'scheduled' && (
                                      <a href={session.meeting_url} target="_blank" rel="noopener noreferrer">
                                        <Button size="sm" variant="outline" className="h-6 text-xs px-2 gap-1">
                                          <Video className="w-3 h-3" />
                                          {t.joinMeeting}
                                        </Button>
                                      </a>
                                    )}
                                    <Badge variant="outline" className="text-[10px]">
                                      {session.status === 'completed' ? t.completed : t.scheduled}
                                    </Badge>
                                    {session.rating && (
                                      <span className="flex items-center gap-0.5 text-yellow-500">
                                        <Star className="w-3 h-3 fill-current" />
                                        {session.rating}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Profile Dialog ─────────────────────────────────────────────────── */}
      <ProfileDialog
        open={showProfileDialog}
        onOpenChange={setShowProfileDialog}
        isRTL={isRTL}
        t={t}
        myProfile={myProfile}
        isPending={saveProfileMutation.isPending}
        onSave={(form: any) => saveProfileMutation.mutate(form)}
      />

      {/* ── Session Dialog ─────────────────────────────────────────────────── */}
      <SessionDialog
        open={showSessionDialog}
        onOpenChange={(o) => { setShowSessionDialog(o); if (!o) setSessionMatchId(null); }}
        isRTL={isRTL}
        t={t}
        matchId={sessionMatchId}
        isPending={createSessionMutation.isPending}
        onSave={(form: any) => createSessionMutation.mutate(form)}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Profile Dialog
// ═══════════════════════════════════════════════════════════════════════════════

function ProfileDialog({
  open, onOpenChange, isRTL, t, myProfile, isPending, onSave,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; isRTL: boolean;
  t: Record<string, string>; myProfile: any; isPending: boolean;
  onSave: (form: any) => void;
}) {
  const [role, setRole] = useState(myProfile?.role || 'mentee');
  const [bio, setBio] = useState(myProfile?.bio || '');
  const [expertise, setExpertise] = useState((myProfile?.expertise ?? []).join(', '));
  const [lookingFor, setLookingFor] = useState((myProfile?.looking_for ?? []).join(', '));
  const [yearsExperience, setYearsExperience] = useState(myProfile?.years_experience?.toString() || '');
  const [maxMentees, setMaxMentees] = useState(myProfile?.max_mentees?.toString() || '');
  const [isAvailable, setIsAvailable] = useState(myProfile?.is_available ?? true);

  // Reset when dialog opens with fresh profile data
  const handleOpen = (o: boolean) => {
    if (o && myProfile) {
      setRole(myProfile.role || 'mentee');
      setBio(myProfile.bio || '');
      setExpertise((myProfile.expertise ?? []).join(', '));
      setLookingFor((myProfile.looking_for ?? []).join(', '));
      setYearsExperience(myProfile.years_experience?.toString() || '');
      setMaxMentees(myProfile.max_mentees?.toString() || '');
      setIsAvailable(myProfile.is_available ?? true);
    }
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle>{myProfile ? t.editProfile : t.createProfile}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">{t.role}</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mentor">{t.mentor}</SelectItem>
                <SelectItem value="mentee">{t.mentee}</SelectItem>
                <SelectItem value="both">{t.both}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t.bio}</Label>
            <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder={t.bioPlaceholder} className="resize-none min-h-[70px]" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t.expertise}</Label>
            <Input value={expertise} onChange={e => setExpertise(e.target.value)} placeholder={t.expertisePlaceholder} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t.lookingFor}</Label>
            <Input value={lookingFor} onChange={e => setLookingFor(e.target.value)} placeholder={t.lookingForPlaceholder} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t.yearsExperience}</Label>
              <Input type="number" value={yearsExperience} onChange={e => setYearsExperience(e.target.value)} placeholder="5" />
            </div>
            {(role === 'mentor' || role === 'both') && (
              <div className="space-y-1.5">
                <Label className="text-xs">{t.maxMentees}</Label>
                <Input type="number" value={maxMentees} onChange={e => setMaxMentees(e.target.value)} placeholder="3" />
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">{t.available}</Label>
            <Switch checked={isAvailable} onCheckedChange={setIsAvailable} />
          </div>
          <Button
            className="w-full gap-2"
            disabled={isPending}
            onClick={() => onSave({ role, bio, expertise, lookingFor, yearsExperience, maxMentees, isAvailable })}
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {t.save}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Session Dialog
// ═══════════════════════════════════════════════════════════════════════════════

function SessionDialog({
  open, onOpenChange, isRTL, t, matchId, isPending, onSave,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; isRTL: boolean;
  t: Record<string, string>; matchId: string | null; isPending: boolean;
  onSave: (form: any) => void;
}) {
  const [title, setTitle] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [duration, setDuration] = useState('30');
  const [notes, setNotes] = useState('');

  const isValid = title.trim() && scheduledAt && matchId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle>{t.scheduleSession}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">{t.sessionTitle} *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={isRTL ? 'מפגש שבועי' : 'Weekly check-in'} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t.sessionDate} *</Label>
            <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} dir="ltr" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t.duration}</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 min</SelectItem>
                <SelectItem value="30">30 min</SelectItem>
                <SelectItem value="45">45 min</SelectItem>
                <SelectItem value="60">60 min</SelectItem>
                <SelectItem value="90">90 min</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t.notes}</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="resize-none min-h-[60px]" placeholder={isRTL ? 'נושאים לדיון...' : 'Topics to discuss...'} />
          </div>
          <div className="flex gap-2">
            <Button
              className="flex-1 gap-2"
              disabled={!isValid || isPending}
              onClick={() => onSave({ matchId, title, scheduledAt, duration, notes })}
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {t.create}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              {t.cancel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
