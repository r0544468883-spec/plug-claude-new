import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Save, GripVertical, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface OnboardingTask {
  title: string;
  description: string;
  category: 'legal' | 'info' | 'tech' | 'team' | 'admin';
  due_days: number;
}

const DEFAULT_TASKS: OnboardingTask[] = [
  { title: 'חתום על חוזה עבודה', description: 'קרא וחתום על חוזה ההעסקה', category: 'legal', due_days: 1 },
  { title: 'קרא מדריך עובד', description: 'עיין במדריך החברה ומדיניות הארגון', category: 'info', due_days: 3 },
  { title: 'הגדר סביבת עבודה', description: 'התקן כלים ותוכנות נדרשות', category: 'tech', due_days: 2 },
  { title: 'פגישה עם מנהל', description: 'שיחת היכרות וקביעת מטרות לתקופה הראשונה', category: 'team', due_days: 1 },
  { title: 'פגישה עם הצוות', description: 'היכרות עם חברי הצוות', category: 'team', due_days: 3 },
  { title: 'הגדר כלי תקשורת', description: 'הגדר חשבונות Email, Slack, Zoom', category: 'admin', due_days: 1 },
];

const CATEGORY_LABELS: Record<string, string> = {
  legal: 'משפטי',
  info: 'מידע',
  tech: 'טכנולוגי',
  team: 'צוות',
  admin: 'אדמין',
};

const CATEGORY_COLORS: Record<string, string> = {
  legal: 'bg-red-500/20 text-red-400',
  info: 'bg-blue-500/20 text-blue-400',
  tech: 'bg-purple-500/20 text-purple-400',
  team: 'bg-green-500/20 text-green-400',
  admin: 'bg-yellow-500/20 text-yellow-400',
};

export function OnboardingTemplateEditor() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [tasks, setTasks] = useState<OnboardingTask[]>(DEFAULT_TASKS);
  const [templateName, setTemplateName] = useState('ברירת מחדל');
  const [isSaving, setIsSaving] = useState(false);

  const addTask = () => {
    setTasks(prev => [...prev, { title: '', description: '', category: 'admin', due_days: 7 }]);
  };

  const updateTask = (index: number, field: keyof OnboardingTask, value: string | number) => {
    setTasks(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t));
  };

  const removeTask = (index: number) => {
    setTasks(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('onboarding_templates').upsert({
        company_id: user.id,
        name: templateName,
        tasks: tasks as any,
      }, { onConflict: 'company_id' });

      if (error) throw error;
      toast.success(isHebrew ? 'תבנית Onboarding נשמרה!' : 'Onboarding template saved!');
    } catch {
      toast.error(isHebrew ? 'שגיאה בשמירה' : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 space-y-1">
          <Label>{isHebrew ? 'שם התבנית' : 'Template Name'}</Label>
          <Input value={templateName} onChange={e => setTemplateName(e.target.value)} />
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="mt-6 gap-2">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isHebrew ? 'שמור' : 'Save'}
        </Button>
      </div>

      <div className="space-y-2">
        {tasks.map((task, index) => (
          <Card key={index} className="bg-muted/30 border-border">
            <CardContent className="pt-3 pb-3">
              <div className="flex gap-2 items-start">
                <GripVertical className="w-4 h-4 text-muted-foreground mt-2 flex-shrink-0 cursor-grab" />
                <div className="flex-1 grid grid-cols-1 gap-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder={isHebrew ? 'כותרת המשימה' : 'Task title'}
                      value={task.title}
                      onChange={e => updateTask(index, 'title', e.target.value)}
                      className="flex-1"
                    />
                    <Select value={task.category} onValueChange={v => updateTask(index, 'category', v)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                          <SelectItem key={val} value={val}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={1}
                      max={90}
                      value={task.due_days}
                      onChange={e => updateTask(index, 'due_days', parseInt(e.target.value))}
                      className="w-20"
                      placeholder="ימים"
                    />
                    <Button variant="ghost" size="sm" onClick={() => removeTask(index)} className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <Textarea
                    placeholder={isHebrew ? 'תיאור (אופציונלי)' : 'Description (optional)'}
                    value={task.description}
                    onChange={e => updateTask(index, 'description', e.target.value)}
                    rows={1}
                    className="text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button variant="outline" onClick={addTask} className="w-full gap-2">
        <Plus className="w-4 h-4" />
        {isHebrew ? 'הוסף משימה' : 'Add Task'}
      </Button>
    </div>
  );
}
