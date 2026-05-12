import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Award, Download, Share2, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { he, enUS } from 'date-fns/locale';

interface CertificateViewProps {
  courseId: string;
  courseTitle: string;
  courseTitleHe?: string;
  progressPct: number;
  isAdmin: boolean;
}

export function CertificateView({ courseId, courseTitle, courseTitleHe, progressPct, isAdmin }: CertificateViewProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const queryClient = useQueryClient();
  const certRef = useRef<HTMLDivElement>(null);

  const { data: certificate, isLoading } = useQuery({
    queryKey: ['community-certificate', courseId, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await (supabase as any)
        .from('community_certificates')
        .select('*')
        .eq('course_id', courseId)
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: course } = useQuery({
    queryKey: ['community-course-cert', courseId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('community_courses')
        .select('certificate_enabled')
        .eq('id', courseId)
        .single();
      return data;
    },
  });

  const issueMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await (supabase as any)
        .from('community_certificates')
        .insert({
          course_id: courseId,
          user_id: user.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'התעודה הונפקה!' : 'Certificate issued!');
      queryClient.invalidateQueries({ queryKey: ['community-certificate', courseId] });
    },
    onError: () => toast.error(isRTL ? 'שגיאה בהנפקת תעודה' : 'Failed to issue certificate'),
  });

  const toggleCertEnabled = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from('community_courses')
        .update({ certificate_enabled: !course?.certificate_enabled })
        .eq('id', courseId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'הגדרות עודכנו' : 'Settings updated');
      queryClient.invalidateQueries({ queryKey: ['community-course-cert', courseId] });
    },
  });

  if (!course?.certificate_enabled && !isAdmin) return null;

  const canClaim = progressPct >= 100 && !certificate;
  const title = isRTL ? (courseTitleHe || courseTitle) : courseTitle;
  const userName = profile?.full_name || (isRTL ? 'משתמש' : 'User');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <Award className="w-4 h-4 text-amber-500" />
          {isRTL ? 'תעודת סיום' : 'Certificate'}
        </h4>
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7"
            onClick={() => toggleCertEnabled.mutate()}
          >
            {course?.certificate_enabled
              ? (isRTL ? 'כבה תעודות' : 'Disable')
              : (isRTL ? 'הפעל תעודות' : 'Enable')}
          </Button>
        )}
      </div>

      {certificate ? (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardContent className="p-4">
            {/* Certificate Display */}
            <div
              ref={certRef}
              className="bg-white border-2 border-amber-300 rounded-lg p-6 text-center space-y-3"
            >
              <div className="flex justify-center">
                <Award className="w-12 h-12 text-amber-500" />
              </div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest">
                {isRTL ? 'תעודת סיום' : 'Certificate of Completion'}
              </p>
              <p className="text-lg font-bold">{userName}</p>
              <p className="text-sm text-muted-foreground">
                {isRTL ? 'סיים/ה בהצלחה את הקורס' : 'has successfully completed'}
              </p>
              <p className="text-base font-semibold text-primary">{title}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(certificate.issued_at), 'PPP', { locale: isRTL ? he : enUS })}
              </p>
            </div>

            <div className="flex gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5 text-xs"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: `Certificate - ${title}`, text: `${userName} completed ${title}` });
                  } else {
                    navigator.clipboard.writeText(`${userName} completed the course "${title}"!`);
                    toast.success(isRTL ? 'הועתק!' : 'Copied!');
                  }
                }}
              >
                <Share2 className="w-3.5 h-3.5" />
                {isRTL ? 'שתף' : 'Share'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : canClaim ? (
        <Card className="border-green-200 bg-green-50/30">
          <CardContent className="p-4 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto" />
            <p className="text-sm font-medium">
              {isRTL ? 'סיימת את כל השיעורים! קבל את התעודה שלך' : 'You completed all lessons! Claim your certificate'}
            </p>
            <Button
              onClick={() => issueMutation.mutate()}
              disabled={issueMutation.isPending}
              className="gap-1.5"
            >
              {issueMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
              {isRTL ? 'הנפק תעודה' : 'Claim Certificate'}
            </Button>
          </CardContent>
        </Card>
      ) : course?.certificate_enabled ? (
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              {isRTL
                ? `השלם את כל השיעורים כדי לקבל תעודה (${progressPct}% הושלם)`
                : `Complete all lessons to earn a certificate (${progressPct}% done)`}
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
