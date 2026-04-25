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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Loader2, Copy, Check, Briefcase, Wand2, Target, AlertCircle } from 'lucide-react';

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

  // Tailor mode state
  const [jdText, setJdText] = useState('');
  const [currentResume, setCurrentResume] = useState('');
  const [tailorLoading, setTailorLoading] = useState(false);
  const [tailorStage, setTailorStage] = useState('');
  const [tailorResult, setTailorResult] = useState<{
    atsScore: number;
    tailoredBullets: BulletPoint[];
    skillGaps: string[];
    matchedKeywords: string[];
  } | null>(null);

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

  const tailorResume = async () => {
    if (!jdText.trim()) {
      toast.error(isHebrew ? 'נא להדביק את תיאור המשרה' : 'Please paste the job description');
      return;
    }

    setTailorLoading(true);
    setTailorResult(null);

    const stages = isHebrew
      ? ['מנתח את דרישות המשרה...', 'מזהה פערים...', 'מחשב התאמת ATS...', 'כותב bullets מותאמים...', 'מסיים...']
      : ['Analyzing job requirements...', 'Identifying skill gaps...', 'Calculating ATS score...', 'Writing tailored bullets...', 'Finalizing...'];

    let stageIdx = 0;
    setTailorStage(stages[0]);
    const stageInterval = setInterval(() => {
      stageIdx = Math.min(stageIdx + 1, stages.length - 1);
      setTailorStage(stages[stageIdx]);
    }, 2500);

    try {
      const prompt = `You are an expert ATS resume coach. Analyze this job and produce a tailored resume package.

JOB DESCRIPTION:
${jdText.trim()}

${currentResume.trim() ? `CANDIDATE'S CURRENT RESUME/BULLETS:\n${currentResume.trim()}` : 'No existing resume provided — generate from scratch based on the role.'}

Return ONLY valid JSON in this exact structure:
{
  "atsScore": <number 0-100>,
  "matchedKeywords": ["keyword1", "keyword2"],
  "skillGaps": ["gap1", "gap2"],
  "tailoredBullets": [
    {"text": "bullet using JD keywords", "impact": "high"},
    {"text": "...", "impact": "medium"}
  ]
}

Rules:
- atsScore: estimate keyword coverage (0-100)
- matchedKeywords: terms from JD that appear in resume (or would appear after tailoring)
- skillGaps: important JD requirements the candidate seems to lack
- tailoredBullets: 5-6 bullets that mirror JD language, start with action verbs, include metrics
- impact: "high" if quantified achievement, "medium" if strong action, "low" if basic`;

      const response = await supabase.functions.invoke('plug-chat', {
        body: { messages: [{ role: 'user', content: prompt }], context: {} }
      });

      if (response.error) throw response.error;

      const reader = response.data?.getReader();
      if (!reader) throw new Error('No stream');

      let full = '';
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split('\n')) {
          if (line.startsWith('data: ') && line.slice(6) !== '[DONE]') {
            try {
              const delta = JSON.parse(line.slice(6));
              full += delta.choices?.[0]?.delta?.content || '';
            } catch { /* ignore */ }
          }
        }
      }

      const jsonMatch = full.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Could not parse response');
      const result = JSON.parse(jsonMatch[0]);
      setTailorResult(result);
      toast.success(isHebrew ? 'קורות החיים הותאמו!' : 'Resume tailored successfully!');
    } catch (err) {
      console.error(err);
      toast.error(isHebrew ? 'שגיאה בהתאמה' : 'Failed to tailor resume');
    } finally {
      clearInterval(stageInterval);
      setTailorLoading(false);
      setTailorStage('');
    }
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
      
      <CardContent>
        <Tabs defaultValue="bullets">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="bullets" className="flex-1 gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {isHebrew ? 'יצירת Bullets' : 'Generate Bullets'}
            </TabsTrigger>
            <TabsTrigger value="tailor" className="flex-1 gap-1.5">
              <Target className="w-3.5 h-3.5" />
              {isHebrew ? 'התאמה למשרה' : 'Tailor for Job'}
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Generate Bullets (existing) */}
          <TabsContent value="bullets" className="space-y-4">
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
                <Label>{isHebrew ? 'תיאור קצר (אופציונלי)' : 'Brief Description (optional)'}</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={isHebrew ? 'תאר הישגים עיקריים או כישורים...' : 'Describe key achievements or skills...'}
                  rows={3}
                />
              </div>
              <Button onClick={generateBulletPoints} disabled={isLoading || !jobTitle.trim()} className="w-full gap-2">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isHebrew ? 'צור נקודות מקצועיות' : 'Generate Professional Bullets'}
              </Button>
            </div>

            {bulletPoints.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">{isHebrew ? 'נקודות שנוצרו' : 'Generated Bullet Points'}</h4>
                  <Button variant="outline" size="sm" onClick={copyAllBulletPoints} className="gap-1.5">
                    <Copy className="w-3.5 h-3.5" />
                    {isHebrew ? 'העתק הכל' : 'Copy All'}
                  </Button>
                </div>
                <ScrollArea className="max-h-[300px]">
                  <div className="space-y-2">
                    {bulletPoints.map((bullet, index) => (
                      <div key={index} className="group flex items-start gap-2 p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors">
                        <span className="text-primary font-bold mt-0.5">•</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-relaxed">{bullet.text}</p>
                          <Badge variant="outline" className={`text-xs mt-2 ${impactColors[bullet.impact]}`}>{impactLabels[bullet.impact]}</Badge>
                        </div>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={() => copyBulletPoint(bullet.text, index)}>
                          {copiedIndex === index ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </TabsContent>

          {/* Tab 2: Tailor for Job */}
          <TabsContent value="tailor" className="space-y-4">
            <p className="text-xs text-muted-foreground">
              {isHebrew
                ? 'הדבק את תיאור המשרה וה-AI יתאים את קורות החיים שלך — כולל ציון ATS, מילות מפתח, ופערי כישורים.'
                : 'Paste the job description and AI will tailor your resume — including ATS score, keyword match, and skill gaps.'}
            </p>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                {isHebrew ? 'תיאור המשרה (JD)' : 'Job Description (JD)'}
              </Label>
              <Textarea
                value={jdText}
                onChange={e => setJdText(e.target.value)}
                placeholder={isHebrew ? 'הדבק כאן את תיאור המשרה המלא...' : 'Paste the full job description here...'}
                className="min-h-[140px] text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>{isHebrew ? 'קורות החיים הנוכחיים (אופציונלי)' : 'Current Resume / Bullets (optional)'}</Label>
              <Textarea
                value={currentResume}
                onChange={e => setCurrentResume(e.target.value)}
                placeholder={isHebrew ? 'הדבק את הניסיון שלך — ה-AI יכתוב bullets המותאמים לדרישות...' : 'Paste your experience — AI will rewrite bullets to match requirements...'}
                className="min-h-[100px] text-sm"
              />
            </div>

            <Button onClick={tailorResume} disabled={tailorLoading || !jdText.trim()} className="w-full gap-2">
              {tailorLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
              {isHebrew ? 'התאם קורות חיים למשרה' : 'Tailor Resume to Job'}
            </Button>

            {tailorLoading && tailorStage && (
              <div className="text-center space-y-2 py-2">
                <p className="text-sm text-muted-foreground animate-pulse">{tailorStage}</p>
                <Progress value={undefined} className="h-1" />
              </div>
            )}

            {tailorResult && (
              <div className="space-y-4 pt-4 border-t border-border">
                {/* ATS Score */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">{isHebrew ? 'ציון ATS' : 'ATS Score'}</p>
                    <Progress value={tailorResult.atsScore} className="h-2" />
                  </div>
                  <span className={`text-2xl font-bold ${tailorResult.atsScore >= 70 ? 'text-green-400' : tailorResult.atsScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {tailorResult.atsScore}%
                  </span>
                </div>

                {/* Keywords */}
                {tailorResult.matchedKeywords?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">{isHebrew ? 'מילות מפתח שמופיעות' : 'Matched Keywords'}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {tailorResult.matchedKeywords.map(kw => (
                        <Badge key={kw} className="text-xs bg-primary/10 text-primary border-primary/20">{kw}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skill Gaps */}
                {tailorResult.skillGaps?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-yellow-400" />
                      {isHebrew ? 'פערי כישורים' : 'Skill Gaps'}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {tailorResult.skillGaps.map(gap => (
                        <Badge key={gap} variant="outline" className="text-xs text-yellow-400 border-yellow-400/30">{gap}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tailored Bullets */}
                {tailorResult.tailoredBullets?.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">{isHebrew ? 'Bullets מותאמים למשרה' : 'Tailored Bullets'}</p>
                      <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs"
                        onClick={() => { navigator.clipboard.writeText(tailorResult.tailoredBullets.map(b => `• ${b.text}`).join('\n')); toast.success(isHebrew ? 'הועתק!' : 'Copied!'); }}>
                        <Copy className="w-3 h-3" />
                        {isHebrew ? 'העתק הכל' : 'Copy All'}
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {tailorResult.tailoredBullets.map((bullet, i) => (
                        <div key={i} className="group flex items-start gap-2 p-3 rounded-lg border border-border bg-muted/30">
                          <span className="text-primary font-bold mt-0.5">•</span>
                          <div className="flex-1">
                            <p className="text-sm leading-relaxed">{bullet.text}</p>
                            <Badge variant="outline" className={`text-xs mt-1.5 ${impactColors[bullet.impact]}`}>{impactLabels[bullet.impact]}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
