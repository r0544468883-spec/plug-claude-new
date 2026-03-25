import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Video, Users, Calendar, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { CreateVideoInterview } from './CreateVideoInterview';
import { VideoInterviewReview } from './VideoInterviewReview';

const statusColors: Record<string, string> = {
  active: 'bg-primary/10 text-primary border-primary/20',
  draft: 'bg-muted text-muted-foreground',
  closed: 'bg-destructive/10 text-destructive border-destructive/20',
  archived: 'bg-muted/50 text-muted-foreground',
};

const statusLabels: Record<string, string> = {
  active: 'פעיל',
  draft: 'טיוטה',
  closed: 'סגור',
  archived: 'ארכיון',
};

type FilterStatus = 'all' | 'active' | 'draft' | 'closed';

export function VideoInterviewList() {
  const { user } = useAuth();
  const [interviews, setInterviews] = useState<any[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [view, setView] = useState<'list' | 'create' | 'review'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadInterviews();
  }, [user]);

  const loadInterviews = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('video_interviews' as any)
      .select('*')
      .eq('created_by', user!.id)
      .order('created_at', { ascending: false });
    setInterviews(data || []);
    setLoading(false);
  };

  if (view === 'create') return <CreateVideoInterview onCreated={() => { setView('list'); loadInterviews(); }} />;
  if (view === 'review' && selectedId) return <VideoInterviewReview interviewId={selectedId} />;

  const filtered = filter === 'all' ? interviews : interviews.filter(i => i.status === filter);

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">ראיונות וידאו</h2>
        <Button onClick={() => setView('create')} className="bg-primary text-primary-foreground gap-2">
          <Plus className="w-4 h-4" />
          ראיון חדש
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'active', 'draft', 'closed'] as FilterStatus[]).map(f => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
            className={filter === f ? 'bg-primary text-primary-foreground' : ''}
          >
            {f === 'all' ? 'הכל' : statusLabels[f]}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="text-muted-foreground text-center py-8">טוען...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <Video className="w-12 h-12 mx-auto text-muted-foreground/30" />
          <p className="text-muted-foreground">אין ראיונות עדיין</p>
          <Button onClick={() => setView('create')} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" />
            צור ראיון ראשון
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map(interview => (
            <Card key={interview.id} className="border-border bg-card hover:border-primary/30 transition-colors" style={{ borderRadius: 12 }}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-foreground">{interview.title}</h3>
                  <Badge className={cn('text-xs', statusColors[interview.status])}>
                    {statusLabels[interview.status]}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    0 ענו
                  </span>
                  {interview.deadline && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {format(new Date(interview.deadline), 'dd/MM/yyyy', { locale: he })}
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => { setSelectedId(interview.id); setView('review'); }}
                >
                  <Eye className="w-4 h-4" />
                  צפה בתשובות
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
