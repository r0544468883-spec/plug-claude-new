import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Star } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ScorecardSummaryProps {
  templateId: string;
  candidateId: string;
  candidateName: string;
  criteria: Array<{ name: string; weight: number }>;
}

const scoreColors: Record<number, string> = {
  5: 'bg-green-500 text-white',
  4: 'bg-green-400 text-white',
  3: 'bg-yellow-400 text-black',
  2: 'bg-orange-400 text-white',
  1: 'bg-destructive text-destructive-foreground',
};

const recommendationLabels: Record<string, { label: string; color: string }> = {
  strong_yes: { label: 'כן חזק', color: 'text-green-500' },
  yes: { label: 'כן', color: 'text-green-400' },
  neutral: { label: 'ניטרלי', color: 'text-muted-foreground' },
  no: { label: 'לא', color: 'text-destructive' },
  strong_no: { label: 'לא חזק', color: 'text-destructive' },
};

export function ScorecardSummary({ templateId, candidateId, candidateName, criteria }: ScorecardSummaryProps) {
  const [scorecards, setScorecards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadScorecards(); }, [templateId, candidateId]);

  const loadScorecards = async () => {
    const { data } = await supabase
      .from('scorecards' as any)
      .select('*')
      .eq('template_id', templateId)
      .eq('candidate_id', candidateId);
    setScorecards(data || []);
    setLoading(false);
  };

  if (loading) return <div className="text-muted-foreground text-center py-8">טוען...</div>;
  if (!scorecards.length) return <div className="text-muted-foreground text-center py-8">אין scorecards עדיין</div>;

  const overallAvg = scorecards.reduce((s, sc) => s + (sc.overall_score || 0), 0) / scorecards.length;
  const recommendations = scorecards.map(sc => sc.overall_recommendation);
  const positiveCount = recommendations.filter(r => ['strong_yes', 'yes'].includes(r)).length;

  const getScore = (sc: any, criterionName: string) => sc.scores?.[criterionName]?.score;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Summary */}
      <Card className="border-border bg-card" style={{ borderRadius: 12 }}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-foreground">{candidateName}</h3>
              <p className="text-muted-foreground text-sm">{scorecards.length} מראיינים</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{overallAvg.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">ציון ממוצע</div>
            </div>
            <div className="text-center">
              <div className={cn('text-xl font-bold', positiveCount >= scorecards.length / 2 ? 'text-green-500' : 'text-destructive')}>
                {positiveCount}/{scorecards.length}
              </div>
              <div className="text-xs text-muted-foreground">ממליצים</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scores Table */}
      <Card className="border-border bg-card" style={{ borderRadius: 12 }}>
        <CardHeader><CardTitle className="text-sm">טבלת ציונים</CardTitle></CardHeader>
        <CardContent className="p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-right py-2 text-muted-foreground font-medium">קריטריון</th>
                {scorecards.map((_, i) => (
                  <th key={i} className="text-center py-2 text-muted-foreground font-medium">מראיין {i + 1}</th>
                ))}
                <th className="text-center py-2 text-muted-foreground font-medium">ממוצע</th>
              </tr>
            </thead>
            <tbody>
              {criteria.map(c => {
                const scores = scorecards.map(sc => getScore(sc, c.name));
                const avg = scores.reduce((s, v) => s + (v || 0), 0) / scores.filter(Boolean).length;
                return (
                  <tr key={c.name} className="border-b border-border/30">
                    <td className="py-2 text-foreground">{c.name}</td>
                    {scores.map((score, i) => (
                      <td key={i} className="text-center py-2">
                        {score ? (
                          <span className={cn('px-2 py-0.5 rounded text-xs font-medium', scoreColors[score] || 'bg-muted')}>
                            {score}
                          </span>
                        ) : <span className="text-muted-foreground">-</span>}
                      </td>
                    ))}
                    <td className="text-center py-2">
                      <span className="font-medium text-foreground">{isNaN(avg) ? '-' : avg.toFixed(1)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td className="py-2 font-semibold text-foreground">ממוצע כולל</td>
                {scorecards.map(sc => (
                  <td key={sc.id} className="text-center py-2 font-semibold text-primary">{sc.overall_score?.toFixed(1)}</td>
                ))}
                <td className="text-center py-2 font-bold text-primary">{overallAvg.toFixed(1)}</td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card className="border-border bg-card" style={{ borderRadius: 12 }}>
        <CardHeader><CardTitle className="text-sm">המלצות מראיינים</CardTitle></CardHeader>
        <CardContent className="p-4 space-y-3">
          {scorecards.map((sc, i) => (
            <div key={sc.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
              <span className="text-sm text-muted-foreground w-16">מראיין {i + 1}</span>
              <span className={cn('text-sm font-medium', recommendationLabels[sc.overall_recommendation]?.color)}>
                {recommendationLabels[sc.overall_recommendation]?.label || '-'}
              </span>
              {sc.general_notes && (
                <p className="text-sm text-muted-foreground flex-1">"{sc.general_notes}"</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button className="flex-1 gap-2 bg-primary text-primary-foreground">
          <CheckCircle2 className="w-4 h-4" />
          קבל מועמד
        </Button>
        <Button variant="outline" className="flex-1 gap-2 text-destructive border-destructive/30">
          <XCircle className="w-4 h-4" />
          דחה מועמד
        </Button>
      </div>
    </div>
  );
}
