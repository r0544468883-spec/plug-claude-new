import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Star, Users, ChevronLeft, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface VideoInterviewReviewProps {
  interviewId: string;
}

interface Candidate {
  id: string;
  full_name: string;
  responses: {
    id: string;
    video_url: string;
    question: { question_text: string; question_order: number };
    rating?: number;
    notes?: string;
  }[];
}

export function VideoInterviewReview({ interviewId }: VideoInterviewReviewProps) {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [ratings, setRatings] = useState<Record<string, { rating: number; notes: string }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResponses();
  }, [interviewId]);

  const loadResponses = async () => {
    setLoading(true);
    try {
      const { data: responses } = await supabase
        .from('video_interview_responses' as any)
        .select(`
          id, video_url, candidate_id,
          question:video_interview_questions(question_text, question_order)
        `)
        .eq('interview_id', interviewId);

      if (!responses) return;

      // Group by candidate
      const grouped = new Map<string, Candidate>();
      for (const r of responses as any[]) {
        if (!grouped.has(r.candidate_id)) {
          grouped.set(r.candidate_id, {
            id: r.candidate_id,
            full_name: `מועמד ${r.candidate_id.slice(0, 6)}`,
            responses: [],
          });
        }
        grouped.get(r.candidate_id)!.responses.push({
          id: r.id,
          video_url: r.video_url,
          question: r.question,
        });
      }

      // Load profiles for names
      const candidateIds = Array.from(grouped.keys());
      if (candidateIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', candidateIds);
        profiles?.forEach(p => {
          if (grouped.has(p.user_id)) {
            grouped.get(p.user_id)!.full_name = p.full_name;
          }
        });
      }

      const candidateList = Array.from(grouped.values()).map(c => ({
        ...c,
        responses: c.responses.sort((a, b) => a.question.question_order - b.question.question_order),
      }));
      setCandidates(candidateList);
      if (candidateList.length > 0) setSelectedCandidate(candidateList[0]);
    } finally {
      setLoading(false);
    }
  };

  const submitRating = async (responseId: string) => {
    const r = ratings[responseId];
    if (!r?.rating) return;
    try {
      await supabase.from('video_interview_ratings' as any).upsert({
        response_id: responseId,
        rated_by: user!.id,
        rating: r.rating,
        notes: r.notes || null,
      });
      toast.success('דירוג נשמר');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const avgScore = selectedCandidate
    ? Object.values(ratings).reduce((sum, r, _, arr) => sum + r.rating / arr.length, 0)
    : 0;

  if (loading) return <div className="text-muted-foreground p-8 text-center">טוען...</div>;

  return (
    <div className="flex gap-4 h-[calc(100vh-200px)]" dir="rtl">
      {/* Sidebar - Candidates */}
      <Card className="w-64 flex-shrink-0 border-border bg-card overflow-y-auto">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="w-4 h-4" />
            מועמדים ({candidates.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 space-y-1">
          {candidates.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCandidate(c)}
              className={cn(
                'w-full text-right p-3 rounded-lg transition-colors',
                selectedCandidate?.id === c.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50 text-foreground'
              )}
            >
              <div className="flex items-center gap-2">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">{c.full_name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{c.full_name}</p>
                  <p className="text-xs text-muted-foreground">{c.responses.length} תשובות</p>
                </div>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Main - Responses */}
      {selectedCandidate ? (
        <div className="flex-1 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{selectedCandidate.full_name}</h2>
            {avgScore > 0 && (
              <Badge className="gap-1 bg-primary/10 text-primary border-primary/20">
                <Star className="w-3 h-3 fill-current" />
                ממוצע {avgScore.toFixed(1)}
              </Badge>
            )}
            <div className="flex gap-2">
              <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground">
                <CheckCircle2 className="w-4 h-4" />
                העבר לשלב הבא
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 text-destructive border-destructive/30">
                <XCircle className="w-4 h-4" />
                דחה
              </Button>
            </div>
          </div>

          {selectedCandidate.responses.map(resp => (
            <Card key={resp.id} className="border-border bg-card" style={{ borderRadius: 12 }}>
              <CardContent className="p-4 space-y-3">
                <p className="font-medium text-foreground">{resp.question.question_text}</p>
                <video
                  src={resp.video_url}
                  controls
                  className="w-full rounded-lg bg-black"
                  style={{ maxHeight: 300 }}
                />
                <div className="space-y-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={() => setRatings(prev => ({
                          ...prev,
                          [resp.id]: { ...prev[resp.id], rating: star }
                        }))}
                      >
                        <Star className={cn(
                          'w-6 h-6 transition-colors',
                          (ratings[resp.id]?.rating || 0) >= star
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-muted-foreground'
                        )} />
                      </button>
                    ))}
                  </div>
                  <Textarea
                    placeholder="הערות..."
                    rows={2}
                    value={ratings[resp.id]?.notes || ''}
                    onChange={e => setRatings(prev => ({
                      ...prev,
                      [resp.id]: { ...prev[resp.id], notes: e.target.value }
                    }))}
                    className="text-sm"
                  />
                  <Button size="sm" variant="outline" onClick={() => submitRating(resp.id)}>
                    שמור דירוג
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>בחר מועמד לצפייה</p>
          </div>
        </div>
      )}
    </div>
  );
}
