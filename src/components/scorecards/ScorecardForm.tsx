import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Criterion {
  name: string;
  description: string;
  weight: number;
}

interface ScorecardFormProps {
  templateId: string;
  templateName: string;
  candidateId: string;
  candidateName: string;
  jobTitle: string;
  criteria: Criterion[];
  interviewType: string;
  onSubmitted?: () => void;
}

const recommendationOptions = [
  { value: 'strong_yes', label: 'כן חזק', color: 'bg-green-600 text-white border-green-500' },
  { value: 'yes', label: 'כן', color: 'bg-green-400 text-white border-green-300' },
  { value: 'neutral', label: 'ניטרלי', color: 'bg-muted text-muted-foreground border-border' },
  { value: 'no', label: 'לא', color: 'bg-destructive/50 text-destructive border-destructive/30' },
  { value: 'strong_no', label: 'לא חזק', color: 'bg-destructive text-destructive-foreground border-destructive' },
];

export function ScorecardForm({
  templateId, templateName, candidateId, candidateName, jobTitle, criteria, interviewType, onSubmitted,
}: ScorecardFormProps) {
  const { user } = useAuth();
  const [scores, setScores] = useState<Record<string, { score: number; note: string }>>({});
  const [recommendation, setRecommendation] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const setScore = (name: string, score: number) => {
    setScores(prev => ({ ...prev, [name]: { ...prev[name], score } }));
  };

  const setNote = (name: string, note: string) => {
    setScores(prev => ({ ...prev, [name]: { ...prev[name], note } }));
  };

  const overallScore = () => {
    const totalWeight = criteria.reduce((s, c) => s + c.weight, 0);
    const weightedSum = criteria.reduce((s, c) => {
      const score = scores[c.name]?.score || 0;
      return s + score * c.weight;
    }, 0);
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  };

  const submit = async () => {
    if (!user) return;
    if (!recommendation) { toast.error('בחר המלצה'); return; }
    const missingScores = criteria.filter(c => !scores[c.name]?.score);
    if (missingScores.length > 0) { toast.error('יש לדרג את כל הקריטריונים'); return; }

    setSaving(true);
    try {
      const { error } = await supabase.from('scorecards' as any).insert({
        template_id: templateId,
        candidate_id: candidateId,
        interviewer_id: user.id,
        interview_type: interviewType,
        scores,
        overall_score: overallScore(),
        overall_recommendation: recommendation,
        general_notes: generalNotes,
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success('Scorecard נשלח!');
      onSubmitted?.();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  if (submitted) {
    return (
      <Card className="border-border bg-card text-center p-8" style={{ borderRadius: 12 }}>
        <div className="text-5xl mb-4">✅</div>
        <h3 className="text-lg font-semibold mb-2">Scorecard נשלח בהצלחה</h3>
        <p className="text-muted-foreground">ציון כולל: {overallScore().toFixed(1)}/5</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <Card className="border-border bg-card" style={{ borderRadius: 12 }}>
        <CardHeader>
          <CardTitle>{templateName}</CardTitle>
          <div className="flex gap-2 mt-1">
            <Badge variant="outline">{candidateName}</Badge>
            <Badge variant="outline">{jobTitle}</Badge>
            <Badge variant="outline">{interviewType}</Badge>
          </div>
        </CardHeader>
      </Card>

      {criteria.map(c => (
        <Card key={c.name} className="border-border bg-card" style={{ borderRadius: 12 }}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-foreground">{c.name}</h4>
                {c.description && <p className="text-sm text-muted-foreground">{c.description}</p>}
              </div>
              <Badge variant="outline" className="text-xs">משקל {c.weight}</Badge>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} onClick={() => setScore(c.name, star)}>
                  <Star className={cn(
                    'w-7 h-7 transition-colors',
                    (scores[c.name]?.score || 0) >= star ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'
                  )} />
                </button>
              ))}
              {scores[c.name]?.score && (
                <span className="mr-2 text-sm text-muted-foreground self-center">{scores[c.name].score}/5</span>
              )}
            </div>
            <Textarea
              placeholder="הערה (אופציונלי)..."
              rows={1}
              value={scores[c.name]?.note || ''}
              onChange={e => setNote(c.name, e.target.value)}
              className="text-sm"
            />
          </CardContent>
        </Card>
      ))}

      {/* Recommendation */}
      <Card className="border-border bg-card" style={{ borderRadius: 12 }}>
        <CardContent className="p-4 space-y-3">
          <Label className="text-base font-semibold">המלצה כוללת</Label>
          <div className="flex flex-wrap gap-2">
            {recommendationOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setRecommendation(opt.value)}
                className={cn(
                  'px-4 py-2 rounded-lg border-2 font-medium text-sm transition-all',
                  recommendation === opt.value ? opt.color : 'border-border text-muted-foreground hover:border-primary/30'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Textarea
            placeholder="הערות כלליות..."
            value={generalNotes}
            onChange={e => setGeneralNotes(e.target.value)}
            rows={3}
          />
          {overallScore() > 0 && (
            <p className="text-sm text-muted-foreground">
              ציון משוקלל: <span className="text-primary font-medium">{overallScore().toFixed(1)}/5</span>
            </p>
          )}
          <Button onClick={submit} disabled={saving} className="w-full bg-primary text-primary-foreground">
            {saving ? 'שולח...' : 'שלח Scorecard'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
