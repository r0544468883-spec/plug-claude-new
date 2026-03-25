import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Users, TrendingUp, Clock, BarChart3 } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

interface JobAnalyticsSheetProps {
  jobId: string | null;
  jobTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AppData {
  id: string;
  current_stage: string | null;
  apply_method: string | null;
  created_at: string;
  status: string | null;
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
}

const STAGE_ORDER = ['applied', 'screening', 'interview', 'offer', 'hired'];
const STAGE_LABELS: Record<string, { he: string; en: string }> = {
  applied:   { he: 'הגיש', en: 'Applied' },
  screening: { he: 'סינון', en: 'Screening' },
  interview: { he: 'ראיון', en: 'Interview' },
  offer:     { he: 'הצעה', en: 'Offer' },
  hired:     { he: 'התקבל', en: 'Hired' },
};

export function JobAnalyticsSheet({ jobId, jobTitle, open, onOpenChange }: JobAnalyticsSheetProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const [applications, setApplications] = useState<AppData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open || !jobId) return;
    setIsLoading(true);
    supabase
      .from('applications' as any)
      .select('id, current_stage, apply_method, created_at, status, profiles!candidate_id(full_name, avatar_url)')
      .eq('job_id', jobId)
      .then(({ data }) => {
        setApplications((data as AppData[]) ?? []);
        setIsLoading(false);
      });
  }, [open, jobId]);

  const stageData = STAGE_ORDER.map(stage => ({
    name: STAGE_LABELS[stage]?.[isHebrew ? 'he' : 'en'] ?? stage,
    count: applications.filter(a => (a.current_stage || 'applied') === stage).length,
  })).filter(s => s.count > 0);

  const sourceCount: Record<string, number> = {};
  applications.forEach(a => {
    const src = a.apply_method || 'web';
    sourceCount[src] = (sourceCount[src] ?? 0) + 1;
  });
  const sourceData = Object.entries(sourceCount).map(([name, value]) => ({ name, value }));

  const daysOpen = jobId
    ? differenceInDays(new Date(), new Date(applications[0]?.created_at ?? Date.now()))
    : 0;

  const conversionRate = applications.length > 0
    ? Math.round((applications.filter(a => ['interview', 'offer', 'hired'].includes(a.current_stage ?? '')).length / applications.length) * 100)
    : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto" side={isHebrew ? 'right' : 'left'}>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="w-5 h-5 text-primary" />
            {jobTitle || (isHebrew ? 'ביצועי משרה' : 'Job Analytics')}
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5 mt-5">
            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: isHebrew ? 'מועמדים' : 'Applicants', value: applications.length, icon: Users },
                { label: isHebrew ? 'שיעור ראיונות' : 'Interview rate', value: `${conversionRate}%`, icon: TrendingUp },
                { label: isHebrew ? 'ימי פתיחה' : 'Days open', value: daysOpen, icon: Clock },
              ].map(({ label, value, icon: Icon }) => (
                <Card key={label}>
                  <CardContent className="p-3 text-center">
                    <Icon className="w-4 h-4 text-primary mx-auto mb-1" />
                    <p className="text-xl font-bold">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Stage funnel */}
            {stageData.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">{isHebrew ? 'שלבי מיון' : 'Pipeline Stages'}</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={stageData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} hide />
                    <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" radius={4}>
                      {stageData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Source breakdown */}
            {sourceData.length > 1 && (
              <div>
                <p className="text-sm font-medium mb-2">{isHebrew ? 'מקורות' : 'Sources'}</p>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Candidate list */}
            {applications.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">
                  {isHebrew ? 'מועמדים אחרונים' : 'Recent Applicants'} ({Math.min(applications.length, 8)})
                </p>
                <div className="space-y-2">
                  {applications.slice(0, 8).map(app => (
                    <div key={app.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={(app.profiles as any)?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {((app.profiles as any)?.full_name || '?').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {(app.profiles as any)?.full_name || (isHebrew ? 'מועמד' : 'Candidate')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(app.created_at).toLocaleDateString(isHebrew ? 'he-IL' : 'en-US')}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        {STAGE_LABELS[app.current_stage ?? 'applied']?.[isHebrew ? 'he' : 'en'] ?? app.current_stage ?? 'applied'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {applications.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">{isHebrew ? 'אין מועמדים עדיין' : 'No applicants yet'}</p>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
