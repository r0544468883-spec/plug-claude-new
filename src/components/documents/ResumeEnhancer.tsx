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
import { Sparkles, Loader2, Copy, Check, Briefcase, Wand2, Target, AlertCircle, BookOpen, ChevronRight } from 'lucide-react';

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
  const [achievements, setAchievements] = useState('');
  const [bulletPoints, setBulletPoints] = useState<BulletPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Tailor mode state
  const [promptResult, setPromptResult] = useState('');
  const [promptLoading, setPromptLoading] = useState(false);
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [promptInput, setPromptInput] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);

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
    setStreamingText('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const prompt = `Generate 6 powerful resume bullet points for a ${jobTitle} position.

${description ? `Role context: ${description}\n` : ''}${achievements ? `Specific achievements to highlight (incorporate these — add numbers/metrics if missing):\n${achievements}\n` : ''}
Rules:
1. Start each bullet with a strong action verb (Led, Drove, Built, Reduced, Increased, Launched, etc.)
2. Every bullet must include a metric or result — e.g., "by 40%", "saving $200K/year", "for 50K users"
3. Use keywords from the job title for ATS compatibility
4. Keep each bullet to 1–2 lines
5. impact: "high" if quantified achievement, "medium" if strong action verb + context, "low" if basic

Return ONLY valid JSON array:
[
  {"text": "Led migration of legacy system to AWS, reducing infrastructure costs by 35% and improving uptime to 99.9%", "impact": "high"},
  {"text": "...", "impact": "medium"},
  ...
]`;

      const response = await supabase.functions.invoke('plug-chat', {
        body: { messages: [{ role: 'user', content: prompt }], context: {} }
      });

      if (response.error) throw response.error;

      const reader = response.data?.getReader();
      if (!reader) throw new Error('No response stream');

      let fullResponse = '';
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ') && line.slice(6) !== '[DONE]') {
            try {
              const content = JSON.parse(line.slice(6)).choices?.[0]?.delta?.content || '';
              fullResponse += content;
              // Show live streaming text (strip partial JSON wrapper for readability)
              const preview = fullResponse.replace(/^\s*\[?\s*\{?\s*"text"\s*:\s*"?/g, '').replace(/",?\s*"impact"[\s\S]*$/g, '');
              setStreamingText(fullResponse);
            } catch { /* ignore partial JSON */ }
          }
        }
      }

      const jsonMatch = fullResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const points = JSON.parse(jsonMatch[0]) as BulletPoint[];
        setStreamingText('');
        setBulletPoints(points);
        toast.success(isHebrew ? 'נקודות נוצרו בהצלחה!' : 'Bullet points generated!');
      } else {
        throw new Error('Could not parse AI response');
      }

    } catch (error: any) {
      console.error('Error generating bullet points:', error);
      setStreamingText('');
      const msg = error?.message || JSON.stringify(error) || '';
      if (msg.includes('credit') || msg.includes('quota') || msg.includes('balance')) {
        toast.error(isHebrew ? 'אין מספיק קרדיטים AI — רכוש קרדיטים ב"חשבון"' : 'No AI credits — purchase credits in Account');
      } else {
        toast.error(isHebrew ? 'שגיאה ביצירת נקודות' : 'Failed to generate bullet points');
      }
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

  // ── Prompt Library ──────────────────────────────────────────────────────────
  const PROMPT_CATEGORIES = [
    {
      category: isHebrew ? 'כתיבה וניסוח' : 'Writing & Phrasing',
      prompts: [
        { id: 'rewrite_bullet', labelHe: 'שכתב bullet point', labelEn: 'Rewrite a bullet point', placeholder: isHebrew ? 'הדבק את ה-bullet הנוכחי...' : 'Paste your current bullet...', promptFn: (v: string) => `Rewrite this resume bullet point to be more impactful, quantified, and ATS-friendly. Start with a strong action verb:\n\n"${v}"\n\nProvide 3 improved versions.` },
        { id: 'summary', labelHe: 'צור Professional Summary', labelEn: 'Write Professional Summary', placeholder: isHebrew ? 'תאר את הניסיון שלך...' : 'Describe your experience...', promptFn: (v: string) => `Write a compelling 3-sentence professional summary for a resume based on this background:\n\n${v}\n\nMake it ATS-optimized, results-focused, and engaging.` },
        { id: 'action_verbs', labelHe: 'הצע פעלים חזקים לתפקיד', labelEn: 'Suggest strong action verbs', placeholder: isHebrew ? 'שם התפקיד...' : 'Job title...', promptFn: (v: string) => `List 20 powerful action verbs for a ${v} resume, grouped by category (Leadership, Technical, Analytical, Communication). Include a brief example sentence for each.` },
        { id: 'quantify', labelHe: 'הוסף מספרים והישגים', labelEn: 'Add metrics & achievements', placeholder: isHebrew ? 'תאר את הפעילות שלך...' : 'Describe your activity...', promptFn: (v: string) => `Suggest ways to quantify and add measurable impact to this resume experience:\n\n${v}\n\nProvide 5 specific suggestions with example phrasing.` },
      ]
    },
    {
      category: isHebrew ? 'ATS ואופטימיזציה' : 'ATS & Optimization',
      prompts: [
        { id: 'ats_score', labelHe: 'נתח ATS של הטקסט', labelEn: 'Analyze ATS compatibility', placeholder: isHebrew ? 'הדבק טקסט מקורות החיים...' : 'Paste resume text...', promptFn: (v: string) => `Analyze this resume text for ATS compatibility:\n\n${v}\n\nProvide: 1) ATS score 1-10, 2) Missing keywords, 3) Formatting issues, 4) 5 specific improvements.` },
        { id: 'keywords', labelHe: 'חלץ מילות מפתח ממשרה', labelEn: 'Extract keywords from JD', placeholder: isHebrew ? 'הדבק תיאור משרה...' : 'Paste job description...', promptFn: (v: string) => `Extract the top 20 ATS keywords from this job description, ranked by importance:\n\n${v}\n\nGroup by: Required skills, Preferred skills, Industry terms, Action verbs.` },
        { id: 'gaps', labelHe: 'מצא פערים בין CV למשרה', labelEn: 'Find CV-JD skill gaps', placeholder: isHebrew ? 'CV [---] תיאור משרה (הפרד ב-[---])' : 'CV [---] Job description (separate with [---])', promptFn: (v: string) => { const [cv, jd] = v.split('[---]'); return `Compare this CV with the job description and identify skill gaps:\n\nCV:\n${cv}\n\nJob Description:\n${jd}\n\nList: 1) Matching skills, 2) Missing skills, 3) How to address each gap.`; } },
        { id: 'format', labelHe: 'שפר פורמט לATS', labelEn: 'Improve format for ATS', placeholder: isHebrew ? 'הדבק קטע מקורות החיים...' : 'Paste a section...', promptFn: (v: string) => `Reformat this resume section to be fully ATS-compatible:\n\n${v}\n\nFix: formatting, dates, section headers, bullet structure. Show before/after.` },
      ]
    },
    {
      category: isHebrew ? 'חוויית עבודה' : 'Work Experience',
      prompts: [
        { id: 'expand', labelHe: 'הרחב תיאור תפקיד', labelEn: 'Expand job description', placeholder: isHebrew ? 'תפקיד + חברה + תחומי אחריות בסיסיים...' : 'Role + company + basic responsibilities...', promptFn: (v: string) => `Expand this job experience into 5 strong resume bullet points:\n\n${v}\n\nEach bullet should start with an action verb, include impact/results, and be ATS-friendly.` },
        { id: 'gap', labelHe: 'הסבר פער בקורות חיים', labelEn: 'Explain employment gap', placeholder: isHebrew ? 'פרטי הפסקה...' : 'Gap details...', promptFn: (v: string) => `Write a professional way to address this employment gap on a resume or in an interview:\n\n${v}\n\nProvide: 1) Resume phrasing, 2) Interview answer, 3) Skills gained during this period.` },
        { id: 'freelance', labelHe: 'הצג פרילנס/עצמאי', labelEn: 'Present freelance work', placeholder: isHebrew ? 'סוג עבודת הפרילנס...' : 'Type of freelance work...', promptFn: (v: string) => `Write a professional resume entry for freelance/self-employed work:\n\n${v}\n\nFormat it to look strong and legitimate on a resume with 4 bullet points.` },
      ]
    },
    {
      category: isHebrew ? 'כישורים ופרופיל' : 'Skills & Profile',
      prompts: [
        { id: 'skills_section', labelHe: 'בנה סקשן כישורים', labelEn: 'Build skills section', placeholder: isHebrew ? 'תחום + רמת ניסיון...' : 'Field + experience level...', promptFn: (v: string) => `Create a comprehensive skills section for a ${v} resume. Group by: Technical Skills, Soft Skills, Tools & Platforms, Languages. Include proficiency levels.` },
        { id: 'linkedin_headline', labelHe: 'כתוב LinkedIn Headline', labelEn: 'Write LinkedIn Headline', placeholder: isHebrew ? 'תפקיד + התמחות...' : 'Role + specialization...', promptFn: (v: string) => `Write 5 powerful LinkedIn headlines for: ${v}\n\nEach under 220 characters. Make them keyword-rich, unique, and compelling.` },
        { id: 'cover_letter', labelHe: 'כתוב Cover Letter', labelEn: 'Write Cover Letter', placeholder: isHebrew ? 'תפקיד + חברה + נקודות חוזק...' : 'Role + company + strengths...', promptFn: (v: string) => `Write a concise, compelling cover letter for:\n\n${v}\n\nFormat: Strong opening, 2 paragraphs of value, confident closing. Max 300 words.` },
        { id: 'achievements', labelHe: 'מה ההישגים שלי?', labelEn: 'Identify my achievements', placeholder: isHebrew ? 'תאר את הפעילות היומית שלך...' : 'Describe your daily activities...', promptFn: (v: string) => `Identify resume-worthy achievements hidden in this job description:\n\n${v}\n\nTransform routine tasks into 5 impressive, quantified achievements.` },
      ]
    },
    {
      category: isHebrew ? 'ראיונות ומשא ומתן' : 'Interview & Negotiation',
      prompts: [
        { id: 'salary', labelHe: 'נסח דרישת שכר', labelEn: 'Frame salary expectation', placeholder: isHebrew ? 'תפקיד + טווח שכר רצוי...' : 'Role + desired range...', promptFn: (v: string) => `Write professional ways to communicate salary expectations for: ${v}\n\nProvide 3 phrasings for: email, interview, negotiation counter-offer.` },
        { id: 'weakness', labelHe: 'ענה על "מה החולשה שלך?"', labelEn: 'Answer "What\'s your weakness?"', placeholder: isHebrew ? 'חולשה אמיתית שלך...' : 'A real weakness you have...', promptFn: (v: string) => `Write a professional, authentic interview answer for "What is your greatest weakness?" based on: ${v}\n\nShow self-awareness, growth mindset, and how you're improving it.` },
      ]
    },
  ];

  const runPrompt = async (promptText: string) => {
    if (!promptText.trim()) return;
    setPromptLoading(true);
    setPromptResult('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const response = await supabase.functions.invoke('plug-chat', {
        body: { messages: [{ role: 'user', content: promptText }] },
      });
      if (response.error) throw response.error;
      const result = response.data;
      if (typeof result === 'string') {
        setPromptResult(result);
      } else if (result?.content) {
        setPromptResult(typeof result.content === 'string' ? result.content : JSON.stringify(result.content, null, 2));
      } else {
        setPromptResult(JSON.stringify(result, null, 2));
      }
    } catch (err: any) {
      const msg = err?.message || JSON.stringify(err) || '';
      if (msg.includes('credit') || msg.includes('quota') || msg.includes('balance')) {
        toast.error(isHebrew ? 'אין מספיק קרדיטים AI — רכוש קרדיטים ב"חשבון"' : 'No AI credits — purchase credits in Account');
      } else {
        toast.error(isHebrew ? 'שגיאה בהרצת הפרומפט' : 'Failed to run prompt');
      }
    } finally {
      setPromptLoading(false);
    }
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
              {isHebrew ? 'Bullets' : 'Bullets'}
            </TabsTrigger>
            <TabsTrigger value="tailor" className="flex-1 gap-1.5">
              <Target className="w-3.5 h-3.5" />
              {isHebrew ? 'התאמה' : 'Tailor'}
            </TabsTrigger>
            <TabsTrigger value="prompts" className="flex-1 gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              {isHebrew ? 'ספריית פרומפטים' : 'Prompts'}
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Generate Bullets */}
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
                <Label className="flex items-center gap-1.5">
                  {isHebrew ? 'הישגים ספציפיים' : 'Specific Achievements'}
                  <Badge variant="secondary" className="text-[10px] font-normal">{isHebrew ? 'חובה לתוצאות טובות' : 'key for quality'}</Badge>
                </Label>
                <Textarea
                  value={achievements}
                  onChange={(e) => setAchievements(e.target.value)}
                  placeholder={isHebrew
                    ? 'לדוגמה:\n• הגדלתי מכירות ב-30% תוך רבעון\n• ניהלתי צוות של 8 אנשים\n• חסכתי 200K₪ בשנה על ידי...'
                    : 'e.g.:\n• Grew revenue by 30% in one quarter\n• Managed a team of 8 engineers\n• Saved $200K/year by automating...'}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>{isHebrew ? 'הקשר נוסף (אופציונלי)' : 'Additional Context (optional)'}</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={isHebrew ? 'תחום, חברה, כלים שבהם עבדת...' : 'Industry, company type, tools you used...'}
                  rows={2}
                />
              </div>
              <Button onClick={generateBulletPoints} disabled={isLoading || !jobTitle.trim()} className="w-full gap-2">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isHebrew ? 'צור נקודות מקצועיות' : 'Generate Professional Bullets'}
              </Button>
            </div>

            {/* Live streaming preview */}
            {isLoading && streamingText && (
              <div className="rounded-lg border border-primary/20 bg-muted/30 p-3 space-y-1.5">
                <p className="text-[10px] font-medium text-primary flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {isHebrew ? 'AI כותב...' : 'AI writing...'}
                </p>
                <ScrollArea className="max-h-40">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed font-sans">{streamingText}</pre>
                </ScrollArea>
              </div>
            )}

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

          {/* Tab 3: Prompts Library */}
          <TabsContent value="prompts" className="space-y-4">
            <div className="space-y-4">
              {PROMPT_CATEGORIES.map((cat) => (
                <div key={cat.category}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{cat.category}</p>
                  <div className="grid gap-1.5">
                    {cat.prompts.map((p) => (
                      <div key={p.id}>
                        <button
                          onClick={() => {
                            setActivePrompt(activePrompt === p.id ? null : p.id);
                            setPromptInput('');
                            setPromptResult('');
                          }}
                          className={`flex items-center justify-between w-full text-start px-3 py-2 rounded-lg border text-sm transition-colors ${
                            activePrompt === p.id
                              ? 'border-primary bg-primary/5 text-primary rounded-b-none border-b-0'
                              : 'border-border hover:border-primary/40 hover:bg-muted/40'
                          }`}
                        >
                          <span>{isHebrew ? p.labelHe : p.labelEn}</span>
                          <ChevronRight className={`h-3.5 w-3.5 flex-shrink-0 transition-transform ${activePrompt === p.id ? 'rotate-90' : ''}`} />
                        </button>

                        {/* Inline expansion — visible right below the clicked button */}
                        {activePrompt === p.id && (
                          <div className="border border-primary/30 border-t-0 rounded-b-lg p-3 space-y-3 bg-primary/5">
                            <Textarea
                              value={promptInput}
                              onChange={(e) => setPromptInput(e.target.value)}
                              placeholder={p.placeholder}
                              rows={3}
                              className="resize-none bg-background"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              onClick={() => runPrompt(p.promptFn(promptInput))}
                              disabled={!promptInput.trim() || promptLoading}
                              className="gap-2"
                            >
                              {promptLoading
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Sparkles className="h-3.5 w-3.5" />}
                              {isHebrew ? 'הרץ' : 'Run'}
                            </Button>

                            {promptResult && (
                              <div className="relative bg-background rounded-lg border p-3">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="absolute top-2 end-2 h-7 w-7 p-0"
                                  onClick={() => {
                                    navigator.clipboard.writeText(promptResult);
                                    setCopiedPrompt(true);
                                    setTimeout(() => setCopiedPrompt(false), 2000);
                                  }}
                                >
                                  {copiedPrompt ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                                </Button>
                                <ScrollArea className="max-h-64">
                                  <pre className="text-xs whitespace-pre-wrap leading-relaxed pe-8">{promptResult}</pre>
                                </ScrollArea>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
