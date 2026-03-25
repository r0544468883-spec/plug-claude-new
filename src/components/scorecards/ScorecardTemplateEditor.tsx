import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Star, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Criterion {
  id: string;
  name: string;
  description: string;
  weight: number;
}

interface ScorecardTemplateEditorProps {
  onSaved?: () => void;
}

export function ScorecardTemplateEditor({ onSaved }: ScorecardTemplateEditorProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [criteria, setCriteria] = useState<Criterion[]>([
    { id: '1', name: '', description: '', weight: 3 },
  ]);
  const [aiRole, setAiRole] = useState('');
  const [showAi, setShowAi] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const addCriterion = () => {
    setCriteria(prev => [...prev, { id: Date.now().toString(), name: '', description: '', weight: 3 }]);
  };

  const removeCriterion = (id: string) => {
    if (criteria.length === 1) return;
    setCriteria(prev => prev.filter(c => c.id !== id));
  };

  const updateCriterion = (id: string, field: keyof Criterion, value: string | number) => {
    setCriteria(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const generateAiCriteria = async () => {
    if (!aiRole.trim()) { toast.error('הכנס תפקיד'); return; }
    setAiLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/plug-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `צור 6-8 קריטריוני הערכה לתפקיד: ${aiRole}. החזר JSON: [{"name":"...","description":"...","weight":1-5}]` }],
          context: {},
        }),
      });
      const reader = res.body?.getReader();
      let fullText = '';
      if (reader) {
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          for (const line of chunk.split('\n')) {
            if (line.startsWith('data: ') && line.slice(6) !== '[DONE]') {
              try { fullText += JSON.parse(line.slice(6)).choices?.[0]?.delta?.content || ''; } catch {}
            }
          }
        }
      }
      const match = fullText.match(/\[[\s\S]*\]/);
      if (match) {
        const generated = JSON.parse(match[0]);
        setCriteria(generated.map((c: any, i: number) => ({ id: `ai-${i}`, name: c.name, description: c.description, weight: c.weight || 3 })));
        toast.success('קריטריונים נוצרו!');
      }
    } catch { toast.error('שגיאה'); } finally { setAiLoading(false); setShowAi(false); }
  };

  const save = async () => {
    if (!user || !name.trim()) { toast.error('חובה שם תבנית'); return; }
    const validCriteria = criteria.filter(c => c.name.trim());
    if (!validCriteria.length) { toast.error('הוסף קריטריון אחד לפחות'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('scorecard_templates' as any).insert({
        created_by: user.id,
        name,
        criteria: validCriteria.map(({ id, ...rest }) => rest),
      });
      if (error) throw error;
      toast.success('תבנית נשמרה!');
      onSaved?.();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <Card className="border-border bg-card" style={{ borderRadius: 12 }}>
        <CardHeader>
          <CardTitle>עורך תבנית הערכה (Scorecard)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <div>
            <Label>שם התבנית *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="למשל: הערכת Product Manager" className="mt-1" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card" style={{ borderRadius: 12 }}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>קריטריוני הערכה ({criteria.length})</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAi(!showAi)} className="gap-1.5 text-primary border-primary/30">
              <Sparkles className="w-4 h-4" />
              PLUG AI ימליץ
            </Button>
            <Button variant="outline" size="sm" onClick={addCriterion} className="gap-1.5">
              <Plus className="w-4 h-4" />
              הוסף
            </Button>
          </div>
        </CardHeader>
        {showAi && (
          <div className="px-6 pb-4 flex gap-2">
            <Input value={aiRole} onChange={e => setAiRole(e.target.value)} placeholder="תפקיד (למשל: DevOps Engineer)" className="flex-1" />
            <Button onClick={generateAiCriteria} disabled={aiLoading} size="sm" className="bg-primary text-primary-foreground">
              {aiLoading ? 'יוצר...' : 'צור'}
            </Button>
          </div>
        )}
        <CardContent className="p-6 pt-0 space-y-3">
          {criteria.map((c, idx) => (
            <div key={c.id} className="p-4 bg-background/40 rounded-xl space-y-3">
              <div className="flex gap-2 items-center">
                <span className="text-muted-foreground text-sm w-5">{idx + 1}.</span>
                <Input
                  value={c.name}
                  onChange={e => updateCriterion(c.id, 'name', e.target.value)}
                  placeholder="שם הקריטריון"
                  className="flex-1"
                />
                <Button variant="ghost" size="icon" onClick={() => removeCriterion(c.id)} className="text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <Input
                value={c.description}
                onChange={e => updateCriterion(c.id, 'description', e.target.value)}
                placeholder="תיאור — מה מעריכים?"
                className="text-sm"
              />
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">משקל:</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button key={star} onClick={() => updateCriterion(c.id, 'weight', star)}>
                      <Star className={cn('w-4 h-4 transition-colors', c.weight >= star ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground')} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving} className="w-full bg-primary text-primary-foreground">
        {saving ? 'שומר...' : 'שמור תבנית'}
      </Button>
    </div>
  );
}
