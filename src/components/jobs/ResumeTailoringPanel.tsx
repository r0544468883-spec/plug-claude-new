import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, CheckCircle2, XCircle, FileText, Mail, Loader2, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ResumeTailoringPanelProps {
  jobTitle: string;
  jobDescription: string | null;
  jobRequirements: string | null;
  companyName?: string | null;
}

interface TailoringResult {
  strengths: string[];       // מה שכבר מתאים
  gaps: string[];            // מה חסר
  tailoredBullets: string[]; // bullet points מותאמים
  coverLetter: string;       // cover letter
  fitScore: number;          // 0-100
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

      const prompt = `אתה מומחה לכתיבת קורות חיים. המשימה: התאם את ה-CV של ${userName} למשרת "${jobTitle}"${companyName ? ` ב-${companyName}` : ''}.

## קורות החיים:
${cvSummary}

## דרישות המשרה:
${jd}

## תשובה בפורמט JSON בלבד:
{
  "fitScore": <0-100>,
  "strengths": ["<מה שמתאים טוב - עד 5>", ...],
  "gaps": ["<מה חסר - עד 5>", ...],
  "tailoredBullets": [
    "<bullet point מותאם למשרה - התחל בפועל חזק - כולל מספרים>",
    "<bullet point 2>",
    "<bullet point 3>",
    "<bullet point 4>",
    "<bullet point 5>",
    "<bullet point 6>"
  ],
  "coverLetter": "<מכתב מקדים קצר 3 פסקאות, מותאם למשרה, מתחיל עם שם ותפקיד>"
}

כתוב בעברית. החזר JSON תקני בלבד, ללא markdown.`;

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

      if (!response.ok) throw new Error('API error');

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
      toast.error(isRTL ? 'שגיאה בניתוח — נסה שוב' : 'Analysis failed — try again');
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
          <h3 className="font-semibold text-sm">{isRTL ? 'התאמת CV למשרה' : 'CV Tailoring'}</h3>
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
              : (isRTL ? 'התאם ל-CV שלי' : 'Tailor to my CV')}
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
          <TabsList className="w-full h-8 text-xs">
            <TabsTrigger value="strengths" className="flex-1 text-xs gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              {isRTL ? 'חוזקות' : 'Strengths'} ({result.strengths.length})
            </TabsTrigger>
            <TabsTrigger value="gaps" className="flex-1 text-xs gap-1">
              <XCircle className="w-3 h-3 text-destructive" />
              {isRTL ? 'פערים' : 'Gaps'} ({result.gaps.length})
            </TabsTrigger>
            <TabsTrigger value="bullets" className="flex-1 text-xs gap-1">
              <FileText className="w-3 h-3 text-primary" />
              {isRTL ? 'Bullets' : 'Bullets'}
            </TabsTrigger>
            <TabsTrigger value="cover" className="flex-1 text-xs gap-1">
              <Mail className="w-3 h-3 text-blue-500" />
              {isRTL ? 'מכתב' : 'Cover'}
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
        </Tabs>
      )}
    </div>
  );
}
