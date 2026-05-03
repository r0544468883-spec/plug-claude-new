import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, CheckCircle2, XCircle, FileText, Mail, Loader2, Copy, Check, MessageSquare, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ResumeTailoringPanelProps {
  jobTitle: string;
  jobDescription: string | null;
  jobRequirements: string | null;
  companyName?: string | null;
}

interface InterviewQuestion {
  question: string;
  category: 'technical' | 'behavioral' | 'culture';
  tip: string;
}

interface STARAnswer {
  theme: string;
  situation: string;
  task: string;
  action: string;
  result: string;
}

interface TailoringResult {
  strengths: string[];
  gaps: string[];
  tailoredBullets: string[];
  coverLetter: string;
  fitScore: number;
  interviewQuestions: InterviewQuestion[];
  starAnswers: STARAnswer[];
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground transition-colors" title="Copy">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export function ResumeTailoringPanel({ jobTitle, jobDescription, jobRequirements, companyName }: ResumeTailoringPanelProps) {
  const { user, profile } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';

  const [result, setResult] = useState<TailoringResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [streamText, setStreamText] = useState('');

  const handleAnalyze = async () => {
    if (!user) return;
    setLoading(true);
    setResult(null);
    setStreamText('');

    try {
      // Fetch cv_data from profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('cv_data, full_name')
        .eq('user_id', user.id)
        .maybeSingle();

      const cvData = (profileData as any)?.cv_data;
      const userName = (profileData as any)?.full_name || '';

      if (!cvData || Object.keys(cvData).length === 0) {
        toast.error(isRTL ? 'יש להעלות קורות חיים קודם (CV Builder)' : 'Please build your CV first');
        setLoading(false);
        return;
      }

      // Build a concise CV summary for the prompt
      const cvSummary = [
        cvData.personalInfo?.summary ? `סיכום: ${cvData.personalInfo.summary}` : '',
        cvData.experience?.length
          ? `ניסיון:\n${cvData.experience.map((e: any) => `- ${e.position} ב-${e.company} (${e.startDate}–${e.endDate || 'היום'}): ${(e.bullets || []).join(', ')}`).join('\n')}`
          : '',
        cvData.skills?.technical?.length ? `כישורים טכניים: ${cvData.skills.technical.join(', ')}` : '',
        cvData.skills?.soft?.length ? `כישורים רכים: ${cvData.skills.soft.join(', ')}` : '',
        cvData.education?.length
          ? `השכלה:\n${cvData.education.map((e: any) => `- ${e.degree} ב-${e.institution}`).join('\n')}`
          : '',
      ].filter(Boolean).join('\n\n');

      const jd = [jobRequirements, jobDescription].filter(Boolean).join('\n\n') || `תפקיד: ${jobTitle}${companyName ? ` בחברת ${companyName}` : ''}`;

      const prompt = `אתה מומחה לגיוס וקריירה. המשימה: נתח את ה-CV של ${userName} למשרת "${jobTitle}"${companyName ? ` ב-${companyName}` : ''} וצור חבילת הכנה מלאה.

## קורות החיים:
${cvSummary}

## דרישות המשרה:
${jd}

## תשובה בפורמט JSON בלבד:
{
  "fitScore": <0-100>,
  "strengths": ["<מה שמתאים טוב - עד 5>"],
  "gaps": ["<מה חסר - עד 5>"],
  "tailoredBullets": [
    "<bullet point מותאם למשרה - התחל בפועל חזק - כולל מספרים>",
    "<עוד 5 bullets>"
  ],
  "coverLetter": "<מכתב מקדים קצר 3 פסקאות, מותאם למשרה>",
  "interviewQuestions": [
    {"question": "<שאלת ראיון צפויה>", "category": "technical", "tip": "<על מה לשים דגש בתשובה>"},
    {"question": "<שאלה>", "category": "behavioral", "tip": "<טיפ>"},
    {"question": "<שאלה>", "category": "culture", "tip": "<טיפ>"}
  ],
  "starAnswers": [
    {"theme": "<נושא: מנהיגות/פתרון בעיות/עבודת צוות/קונפליקט/הישג/כישלון>", "situation": "<מצב מהניסיון של המועמד>", "task": "<המשימה>", "action": "<מה עשה>", "result": "<התוצאה>"},
    {"theme": "<נושא>", "situation": "<...>", "task": "<...>", "action": "<...>", "result": "<...>"}
  ]
}

הנחיות:
- interviewQuestions: 10 שאלות (4 technical, 4 behavioral, 2 culture). מבוססות על דרישות המשרה והרקע של המועמד.
- starAnswers: 5 תשובות STAR מבוססות על הניסיון האמיתי של המועמד. אל תמציא ניסיון.
- כתוב בעברית. החזר JSON תקני בלבד, ללא markdown.`;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No session');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/plug-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          context: { mode: 'resume_tailoring' },
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody?.error || `HTTP ${response.status}`);
      }

      // Stream and collect
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');
      const decoder = new TextDecoder();
      let full = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const chunk = parsed.choices?.[0]?.delta?.content || '';
            full += chunk;
            setStreamText(full);
          } catch { /* incomplete chunk */ }
        }
      }

      // Parse JSON from streamed text
      const jsonMatch = full.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid response format');
      const parsed: TailoringResult = JSON.parse(jsonMatch[0]);
      setResult(parsed);
      setStreamText('');
    } catch (e: any) {
      console.error('Tailoring error:', e);
      const msg = e?.message || String(e);
      toast.error(isRTL ? `שגיאה: ${msg}` : `Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = result
    ? result.fitScore >= 75 ? 'text-emerald-500'
    : result.fitScore >= 50 ? 'text-blue-500'
    : 'text-amber-500'
    : '';

  return (
    <div className="space-y-3" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">{isRTL ? 'ערכת הכנה למשרה' : 'Job Toolkit'}</h3>
          {result && (
            <Badge variant="outline" className={cn('text-xs font-bold', scoreColor)}>
              {result.fitScore}% {isRTL ? 'התאמה' : 'fit'}
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={handleAnalyze}
          disabled={loading}
        >
          {loading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Sparkles className="w-3.5 h-3.5" />}
          {loading
            ? (isRTL ? 'מנתח...' : 'Analyzing...')
            : result
              ? (isRTL ? 'נתח שוב' : 'Re-analyze')
              : (isRTL ? 'נתח התאמה' : 'Analyze fit')}
        </Button>
      </div>

      {/* Streaming indicator */}
      {loading && streamText && (
        <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2 animate-pulse">
          {isRTL ? 'מעבד...' : 'Processing...'}
        </div>
      )}

      {/* Results */}
      {result && (
        <Tabs defaultValue="strengths">
          <TabsList className="w-full h-auto flex-wrap gap-0.5 p-1">
            <TabsTrigger value="strengths" className="text-[11px] gap-1 px-2 py-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              {isRTL ? 'חוזקות' : 'Strengths'}
            </TabsTrigger>
            <TabsTrigger value="gaps" className="text-[11px] gap-1 px-2 py-1">
              <XCircle className="w-3 h-3 text-destructive" />
              {isRTL ? 'פערים' : 'Gaps'}
            </TabsTrigger>
            <TabsTrigger value="bullets" className="text-[11px] gap-1 px-2 py-1">
              <FileText className="w-3 h-3 text-primary" />
              Bullets
            </TabsTrigger>
            <TabsTrigger value="cover" className="text-[11px] gap-1 px-2 py-1">
              <Mail className="w-3 h-3 text-blue-500" />
              {isRTL ? 'מכתב' : 'Cover'}
            </TabsTrigger>
            <TabsTrigger value="interview" className="text-[11px] gap-1 px-2 py-1">
              <MessageSquare className="w-3 h-3 text-violet-500" />
              {isRTL ? 'ראיון' : 'Interview'}
            </TabsTrigger>
            <TabsTrigger value="star" className="text-[11px] gap-1 px-2 py-1">
              <Star className="w-3 h-3 text-amber-500" />
              STAR
            </TabsTrigger>
          </TabsList>

          {/* Strengths */}
          <TabsContent value="strengths" className="mt-2 space-y-1.5">
            {result.strengths.map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-xs p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>{s}</span>
              </div>
            ))}
          </TabsContent>

          {/* Gaps */}
          <TabsContent value="gaps" className="mt-2 space-y-1.5">
            {result.gaps.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">{isRTL ? 'אין פערים משמעותיים!' : 'No significant gaps!'}</p>
            ) : result.gaps.map((g, i) => (
              <div key={i} className="flex items-start gap-2 text-xs p-2 rounded-lg bg-destructive/5 border border-destructive/15">
                <XCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0 mt-0.5" />
                <span>{g}</span>
              </div>
            ))}
          </TabsContent>

          {/* Tailored Bullets */}
          <TabsContent value="bullets" className="mt-2 space-y-1.5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] text-muted-foreground">{isRTL ? 'הוסף לקורות החיים שלך' : 'Add these to your CV'}</p>
              <CopyButton text={result.tailoredBullets.join('\n')} />
            </div>
            {result.tailoredBullets.map((b, i) => (
              <div key={i} className="flex items-start gap-2 text-xs p-2 rounded-lg bg-primary/5 border border-primary/15">
                <span className="text-primary font-bold flex-shrink-0">•</span>
                <span>{b}</span>
              </div>
            ))}
          </TabsContent>

          {/* Cover Letter */}
          <TabsContent value="cover" className="mt-2">
            <div className="relative">
              <div className="absolute top-2 end-2">
                <CopyButton text={result.coverLetter} />
              </div>
              <div className="text-xs p-3 rounded-lg bg-blue-500/5 border border-blue-500/15 leading-relaxed whitespace-pre-wrap pe-8">
                {result.coverLetter}
              </div>
            </div>
          </TabsContent>

          {/* Interview Questions */}
          <TabsContent value="interview" className="mt-2 space-y-1.5">
            {result.interviewQuestions?.length ? (
              <>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-muted-foreground">{isRTL ? 'שאלות צפויות לראיון' : 'Expected interview questions'}</p>
                  <CopyButton text={result.interviewQuestions.map(q => `${q.question}\n→ ${q.tip}`).join('\n\n')} />
                </div>
                {(['technical', 'behavioral', 'culture'] as const).map(cat => {
                  const qs = result.interviewQuestions.filter(q => q.category === cat);
                  if (!qs.length) return null;
                  const catLabel = cat === 'technical' ? (isRTL ? 'טכני' : 'Technical')
                    : cat === 'behavioral' ? (isRTL ? 'התנהגותי' : 'Behavioral')
                    : (isRTL ? 'תרבות' : 'Culture Fit');
                  const catColor = cat === 'technical' ? 'text-blue-500' : cat === 'behavioral' ? 'text-violet-500' : 'text-emerald-500';
                  return (
                    <div key={cat}>
                      <p className={cn('text-[10px] font-semibold mb-1 mt-2', catColor)}>{catLabel}</p>
                      {qs.map((q, i) => (
                        <div key={i} className="text-xs p-2 rounded-lg bg-violet-500/5 border border-violet-500/15 mb-1.5">
                          <p className="font-medium">{q.question}</p>
                          <p className="text-muted-foreground mt-1 text-[10px]">💡 {q.tip}</p>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-3">{isRTL ? 'לא נמצאו שאלות' : 'No questions generated'}</p>
            )}
          </TabsContent>

          {/* STAR Answers */}
          <TabsContent value="star" className="mt-2 space-y-2">
            {result.starAnswers?.length ? (
              <>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-muted-foreground">{isRTL ? 'תשובות STAR מהניסיון שלך' : 'STAR answers from your experience'}</p>
                  <CopyButton text={result.starAnswers.map(s =>
                    `[${s.theme}]\nS: ${s.situation}\nT: ${s.task}\nA: ${s.action}\nR: ${s.result}`
                  ).join('\n\n')} />
                </div>
                {result.starAnswers.map((s, i) => (
                  <div key={i} className="text-xs p-3 rounded-lg bg-amber-500/5 border border-amber-500/15 space-y-1.5">
                    <p className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <Star className="w-3 h-3" />
                      {s.theme}
                    </p>
                    <div className="space-y-1 text-[11px]">
                      <p><span className="font-semibold text-muted-foreground">S:</span> {s.situation}</p>
                      <p><span className="font-semibold text-muted-foreground">T:</span> {s.task}</p>
                      <p><span className="font-semibold text-muted-foreground">A:</span> {s.action}</p>
                      <p><span className="font-semibold text-muted-foreground">R:</span> {s.result}</p>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-3">{isRTL ? 'לא נמצאו תשובות STAR' : 'No STAR answers generated'}</p>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
