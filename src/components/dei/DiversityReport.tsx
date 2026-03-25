import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { EyeOff, TrendingUp, Users, Loader2 } from 'lucide-react';

export function DiversityReport() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';

  const { data, isLoading } = useQuery({
    queryKey: ['diversity-report', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Get all applications for jobs created by this recruiter
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id')
        .eq('created_by', user.id);
      if (!jobs?.length) return null;

      const jobIds = jobs.map(j => j.id);
      const { data: apps } = await supabase
        .from('applications')
        .select('id, blind_mode, current_stage, status')
        .in('job_id', jobIds);

      if (!apps) return null;

      const total = apps.length;
      const blind = apps.filter(a => (a as any).blind_mode).length;
      const blindPct = total > 0 ? Math.round((blind / total) * 100) : 0;

      // Conversion: blind vs non-blind advancing past screening
      const blindAdvanced = apps.filter(a => (a as any).blind_mode && ['interview', 'offer', 'hired'].includes(a.current_stage || '')).length;
      const nonBlindAdvanced = apps.filter(a => !(a as any).blind_mode && ['interview', 'offer', 'hired'].includes(a.current_stage || '')).length;
      const blindConv = blind > 0 ? Math.round((blindAdvanced / blind) * 100) : 0;
      const nonBlindConv = (total - blind) > 0 ? Math.round((nonBlindAdvanced / (total - blind)) * 100) : 0;

      return { total, blind, blindPct, blindConv, nonBlindConv };
    },
    enabled: !!user,
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!data) return null;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <EyeOff className="h-5 w-5 text-purple-500" />
          {isRTL ? 'דוח DEI — Blind Hiring' : 'DEI Report — Blind Hiring'}
        </CardTitle>
        <CardDescription>
          {isRTL ? 'נתונים אנונימיים בלבד — לא נאסף מידע דמוגרפי' : 'Anonymous data only — no demographic information collected'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-foreground">{data.total}</div>
            <div className="text-xs text-muted-foreground mt-1">{isRTL ? 'סה"כ מועמדים' : 'Total Candidates'}</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-purple-500/10">
            <div className="text-2xl font-bold text-purple-500">{data.blind}</div>
            <div className="text-xs text-muted-foreground mt-1">{isRTL ? 'מועמדי Blind' : 'Blind Candidates'}</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-primary/10">
            <div className="text-2xl font-bold text-primary">{data.blindPct}%</div>
            <div className="text-xs text-muted-foreground mt-1">{isRTL ? '% Blind Hiring' : '% Blind Hiring'}</div>
          </div>
        </div>

        {/* Blind Hiring rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              {isRTL ? 'שימוש ב-Blind Hiring' : 'Blind Hiring Usage'}
            </span>
            <Badge variant="outline" className="border-purple-500/30 text-purple-500">{data.blindPct}%</Badge>
          </div>
          <Progress value={data.blindPct} className="h-2" />
        </div>

        {/* Conversion comparison */}
        {data.total > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              {isRTL ? 'המרה לשלב ראיון' : 'Conversion to Interview Stage'}
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-20 text-right">{isRTL ? 'עם Blind' : 'With Blind'}</span>
                <Progress value={data.blindConv} className="flex-1 h-2" />
                <span className="text-xs font-medium w-8">{data.blindConv}%</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-20 text-right">{isRTL ? 'ללא Blind' : 'Without Blind'}</span>
                <Progress value={data.nonBlindConv} className="flex-1 h-2" />
                <span className="text-xs font-medium w-8">{data.nonBlindConv}%</span>
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground border-t border-border pt-3">
          {isRTL
            ? '* נתונים אנונימיים לחלוטין. PLUG לא אוסף מידע על מגדר, גיל, או מוצא.'
            : '* Fully anonymous data. PLUG does not collect gender, age, or origin information.'}
        </p>
      </CardContent>
    </Card>
  );
}
