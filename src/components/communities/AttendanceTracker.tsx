import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { UserCheck, Users, Loader2, ClipboardCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AttendanceTrackerProps {
  type: 'lesson' | 'event';
  targetId: string;
  isAdmin: boolean;
}

export function AttendanceTracker({ type, targetId, isAdmin }: AttendanceTrackerProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const queryClient = useQueryClient();
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  // Fetch enrolled/registered users
  const { data: participants = [] } = useQuery({
    queryKey: ['attendance-participants', type, targetId],
    queryFn: async () => {
      if (type === 'lesson') {
        // Get course_id from lesson, then get enrolled users
        const { data: lesson } = await (supabase as any)
          .from('community_lessons')
          .select('course_id')
          .eq('id', targetId)
          .single();
        if (!lesson) return [];
        const { data } = await (supabase as any)
          .from('community_enrollments')
          .select('user_id, profiles:user_id(full_name, avatar_url)')
          .eq('course_id', lesson.course_id);
        return data || [];
      } else {
        const { data } = await (supabase as any)
          .from('community_event_registrations')
          .select('user_id, profiles:user_id(full_name, avatar_url)')
          .eq('event_id', targetId);
        return data || [];
      }
    },
    enabled: isAdmin,
  });

  // Fetch existing attendance records
  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance-records', type, targetId],
    queryFn: async () => {
      const col = type === 'lesson' ? 'lesson_id' : 'event_id';
      const { data } = await (supabase as any)
        .from('community_attendance')
        .select('*')
        .eq(col, targetId);
      return data || [];
    },
  });

  const presentIds = new Set(attendance.filter((a: any) => a.is_present).map((a: any) => a.user_id));

  // Self check-in for non-admin
  const selfCheckIn = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      const record: any = {
        user_id: user.id,
        is_present: true,
      };
      if (type === 'lesson') record.lesson_id = targetId;
      else record.event_id = targetId;

      const { error } = await (supabase as any)
        .from('community_attendance')
        .upsert(record, { onConflict: type === 'lesson' ? 'lesson_id,user_id' : 'event_id,user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'נוכחות נרשמה!' : 'Attendance recorded!');
      queryClient.invalidateQueries({ queryKey: ['attendance-records', type, targetId] });
    },
    onError: () => toast.error(isRTL ? 'שגיאה ברישום נוכחות' : 'Failed to record attendance'),
  });

  // Admin toggle attendance
  const toggleAttendance = useMutation({
    mutationFn: async ({ userId, present }: { userId: string; present: boolean }) => {
      setPendingIds(prev => new Set(prev).add(userId));
      const record: any = {
        user_id: userId,
        is_present: present,
      };
      if (type === 'lesson') record.lesson_id = targetId;
      else record.event_id = targetId;

      const { error } = await (supabase as any)
        .from('community_attendance')
        .upsert(record, { onConflict: type === 'lesson' ? 'lesson_id,user_id' : 'event_id,user_id' });
      if (error) throw error;
    },
    onSuccess: (_, { userId }) => {
      setPendingIds(prev => { const n = new Set(prev); n.delete(userId); return n; });
      queryClient.invalidateQueries({ queryKey: ['attendance-records', type, targetId] });
    },
    onError: (_, { userId }) => {
      setPendingIds(prev => { const n = new Set(prev); n.delete(userId); return n; });
      toast.error(isRTL ? 'שגיאה' : 'Error');
    },
  });

  // Mark all present
  const markAll = useMutation({
    mutationFn: async () => {
      const records = participants.map((p: any) => {
        const rec: any = { user_id: p.user_id, is_present: true };
        if (type === 'lesson') rec.lesson_id = targetId;
        else rec.event_id = targetId;
        return rec;
      });
      const { error } = await (supabase as any)
        .from('community_attendance')
        .upsert(records, { onConflict: type === 'lesson' ? 'lesson_id,user_id' : 'event_id,user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'כולם סומנו כנוכחים' : 'All marked present');
      queryClient.invalidateQueries({ queryKey: ['attendance-records', type, targetId] });
    },
  });

  const iAmPresent = user?.id ? presentIds.has(user.id) : false;
  const presentCount = presentIds.size;
  const totalCount = participants.length;

  // Non-admin: simple check-in button
  if (!isAdmin) {
    return (
      <div className="flex items-center gap-2">
        {iAmPresent ? (
          <Badge className="gap-1 bg-green-100 text-green-700 hover:bg-green-100">
            <UserCheck className="w-3.5 h-3.5" />
            {isRTL ? 'נוכח/ת' : 'Present'}
          </Badge>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => selfCheckIn.mutate()}
            disabled={selfCheckIn.isPending}
          >
            {selfCheckIn.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
            {isRTL ? 'דווח נוכחות' : 'Check In'}
          </Button>
        )}
      </div>
    );
  }

  // Admin: full attendance list
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <ClipboardCheck className="w-4 h-4 text-primary" />
            {isRTL ? 'נוכחות' : 'Attendance'}
            <Badge variant="outline" className="text-xs ms-1">
              {presentCount}/{totalCount}
            </Badge>
          </h4>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7 gap-1"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
          >
            {markAll.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
            {isRTL ? 'סמן הכל' : 'Mark All'}
          </Button>
        </div>

        {participants.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {isRTL ? 'אין משתתפים רשומים' : 'No registered participants'}
          </p>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {participants.map((p: any) => {
              const present = presentIds.has(p.user_id);
              const isPending = pendingIds.has(p.user_id);
              const name = p.profiles?.full_name || (isRTL ? 'משתמש' : 'User');

              return (
                <div
                  key={p.user_id}
                  className={cn(
                    'flex items-center gap-3 p-2 rounded-lg transition-colors',
                    present ? 'bg-green-50' : 'hover:bg-muted/30'
                  )}
                >
                  <Checkbox
                    checked={present}
                    disabled={isPending}
                    onCheckedChange={(checked) => {
                      toggleAttendance.mutate({ userId: p.user_id, present: !!checked });
                    }}
                  />
                  {p.profiles?.avatar_url ? (
                    <img src={p.profiles.avatar_url} className="w-7 h-7 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                      {name.charAt(0)}
                    </div>
                  )}
                  <span className="text-sm flex-1 truncate">{name}</span>
                  {present && (
                    <Badge variant="outline" className="text-[10px] text-green-600 border-green-300">
                      {isRTL ? 'נוכח' : 'Present'}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
