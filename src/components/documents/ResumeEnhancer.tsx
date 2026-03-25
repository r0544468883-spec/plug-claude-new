import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Loader2, Copy, Check, Briefcase, Wand2 } from 'lucide-react';

interface BulletPoint {
  text: string;
  impact: 'high' | 'medium' | 'low';
}

export function ResumeEnhancer() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const [jobTitle, setJobTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bulletPoints, setBulletPoints] = useState<BulletPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const generateBulletPoints = async () => {
    if (!jobTitle.trim()) {
      toast.error(isHebrew ? 'נא להזין תפקיד' : 'Please enter a job title');
      return;
    }

    setIsLoading(true);
    setBulletPoints([]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('plug-chat', {
        body: {
          messages: [
            {
              role: 'user',
              content: `Generate 5 professional resume bullet points for a ${jobTitle} position.
${description ? `Additional context: ${description}` : ''}

Requirements:
1. Start each bullet with a strong action verb
2. Include quantifiable achievements where possible
3. Be specific and results-oriented
4. Keep each bullet to 1-2 lines maximum
5. Make them ATS-friendly

Return ONLY a JSON array in this format:
[
  {"text": "bullet point text here", "impact": "high"},
  {"text": "bullet point text here", "impact": "medium"},
  ...
]

The "impact" field should be "high" for strongly quantified achievements, "medium" for good action-oriented statements, and "low" for basic responsibilities.`
            }
          ],
          context: {}
        }
      });

      if (response.error) throw response.error;

      // Parse the streaming response
      const reader = response.data?.getReader();
      if (!reader) throw new Error('No response stream');

      let fullResponse = '';
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              fullResponse += content;
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      // Extract JSON from response
      const jsonMatch = fullResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const points = JSON.parse(jsonMatch[0]) as BulletPoint[];
        setBulletPoints(points);
        toast.success(isHebrew ? 'נקודות נוצרו בהצלחה!' : 'Bullet points generated!');
      } else {
        throw new Error('Could not parse AI response');
      }

    } catch (error) {
      console.error('Error generating bullet points:', error);
      toast.error(isHebrew ? 'שגיאה ביצירת נקודות' : 'Failed to generate bullet points');
    } finally {
      setIsLoading(false);
    }
  };

  const copyBulletPoint = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success(isHebrew ? 'הועתק!' : 'Copied!');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const copyAllBulletPoints = async () => {
    const allText = bulletPoints.map(bp => `• ${bp.text}`).join('\n');
    await navigator.clipboard.writeText(allText);
    toast.success(isHebrew ? 'כל הנקודות הועתקו!' : 'All bullet points copied!');
  };

  const impactColors = {
    high: 'bg-green-500/20 text-green-700 border-green-500/30 dark:text-green-300',
    medium: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30 dark:text-yellow-300',
    low: 'bg-muted text-muted-foreground'
  };

  const impactLabels = {
    high: isHebrew ? 'השפעה גבוהה' : 'High Impact',
    medium: isHebrew ? 'השפעה בינונית' : 'Medium Impact',
    low: isHebrew ? 'בסיסי' : 'Basic'
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-primary" />
          {isHebrew ? 'משפר קו"ח חכם' : 'AI Resume Enhancer'}
        </CardTitle>
        <CardDescription>
          {isHebrew 
            ? 'צור נקודות מקצועיות לקורות החיים שלך בעזרת AI'
            : 'Generate professional bullet points for your resume with AI'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Input Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              {isHebrew ? 'תפקיד' : 'Job Title'}
            </Label>
            <Input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder={isHebrew ? 'לדוגמה: מנהל מוצר, מפתח Full-Stack' : 'e.g., Product Manager, Full-Stack Developer'}
            />
          </div>

          <div className="space-y-2">
            <Label>
              {isHebrew ? 'תיאור קצר (אופציונלי)' : 'Brief Description (optional)'}
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isHebrew 
                ? 'תאר את התחומים, הישגים עיקריים או כישורים מיוחדים...'
                : 'Describe key areas, achievements, or special skills...'}
              rows={3}
            />
          </div>

          <Button 
            onClick={generateBulletPoints}
            disabled={isLoading || !jobTitle.trim()}
            className="w-full gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {isHebrew ? 'צור נקודות מקצועיות' : 'Generate Professional Bullets'}
          </Button>
        </div>

        {/* Generated Bullet Points */}
        {bulletPoints.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm text-foreground">
                {isHebrew ? 'נקודות שנוצרו' : 'Generated Bullet Points'}
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={copyAllBulletPoints}
                className="gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                {isHebrew ? 'העתק הכל' : 'Copy All'}
              </Button>
            </div>

            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {bulletPoints.map((bullet, index) => (
                  <div
                    key={index}
                    className="group flex items-start gap-2 p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-primary font-bold mt-0.5">•</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-relaxed">
                        {bullet.text}
                      </p>
                      <Badge 
                        variant="outline" 
                        className={`text-xs mt-2 ${impactColors[bullet.impact]}`}
                      >
                        {impactLabels[bullet.impact]}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      onClick={() => copyBulletPoint(bullet.text, index)}
                    >
                      {copiedIndex === index ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <p className="text-xs text-muted-foreground text-center pt-2">
              {isHebrew 
                ? '💡 טיפ: התאם את הנקודות לחוויה האישית שלך לפני השימוש'
                : '💡 Tip: Customize these bullets with your personal experience before using'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
