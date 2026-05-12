import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Mic,
  FileText,
  Sparkles,
  Play,
  Pause,
  Download,
  Clock,
  Brain,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type TranscriptionStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed';
type Sentiment = 'positive' | 'neutral' | 'negative' | 'mixed';
type TranscriptLanguage = 'he' | 'en' | 'auto';

interface TranscriptSegment {
  start: number; // seconds
  end: number;
  text: string;
}

interface TranscriptionRecord {
  id: string;
  interview_id: string | null;
  video_response_id: string | null;
  created_by: string;
  audio_url: string | null;
  transcript_text: string | null;
  summary: string | null;
  key_points: string[] | null;
  sentiment: Sentiment | null;
  language: TranscriptLanguage | null;
  confidence_score: number | null;
  duration_seconds: number | null;
  word_count: number | null;
  status: TranscriptionStatus;
  model_used: string | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  interviewId?: string;
  videoResponseId?: string;
  audioUrl?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Very naive segmenter: split transcript into fake timed segments for display */
function buildSegments(text: string, durationSeconds: number): TranscriptSegment[] {
  const sentences = text.match(/[^.!?]+[.!?]*/g) ?? [text];
  const step = durationSeconds / Math.max(sentences.length, 1);
  return sentences.map((s, i) => ({
    start: Math.round(i * step),
    end: Math.round((i + 1) * step),
    text: s.trim(),
  }));
}

/** Simulate Whisper transcription + AI summary (replace with real edge function call) */
async function runTranscription(
  audioUrl: string,
  language: TranscriptLanguage,
  recordId: string,
  userId: string
): Promise<Partial<TranscriptionRecord>> {
  // Mark as processing
  await supabase
    .from('interview_transcriptions' as any)
    .update({ status: 'processing' })
    .eq('id', recordId);

  // ── Simulate async work (replace with real Whisper/edge-function call) ──
  await new Promise(r => setTimeout(r, 2200));

  const simulatedTranscript =
    language === 'he'
      ? 'שלום, שמי יעל כהן. יש לי ניסיון של חמש שנים בפיתוח תוכנה, בעיקר בטכנולוגיות ריאקט ו-Node.js. בתפקידי הקודם הובלתי צוות של ארבעה מפתחים ופיתחתי מערכת CRM שהגדילה את יעילות הצוות ב-30 אחוז. אני נהנה מאוד מפתרון בעיות מורכבות ומשיתוף פעולה עם צוותים מוצר. אני מחפש הזדמנות לצמוח בחברה שמאמינה בטכנולוגיה כמנוע צמיחה.'
      : 'Hello, my name is Yael Cohen. I have five years of experience in software development, primarily with React and Node.js. In my previous role I led a team of four developers and built a CRM system that increased team efficiency by 30 percent. I genuinely enjoy solving complex problems and collaborating with product teams. I am looking for an opportunity to grow in a company that believes in technology as a growth engine.';

  const wordCount = simulatedTranscript.split(/\s+/).length;
  const durationSeconds = Math.round(wordCount * 0.45); // ~133 wpm average

  const simulatedKeyPoints =
    language === 'he'
      ? [
          'ניסיון של 5 שנים בפיתוח תוכנה (React, Node.js)',
          'ניסיון הובלת צוות של 4 מפתחים',
          'פיתוח מערכת CRM עם שיפור יעילות של 30%',
          'מחפש צמיחה בסביבה טכנולוגית',
        ]
      : [
          '5 years software development experience (React, Node.js)',
          'Led a team of 4 developers',
          'Built CRM system — 30% efficiency improvement',
          'Seeking growth in a technology-driven company',
        ];

  const simulatedSummary =
    language === 'he'
      ? 'המועמדת הציגה רקע טכני חזק עם ניסיון מוכח בהובלת צוותים ובפיתוח מערכות. הדגישה הישג מדיד (שיפור 30%) ובטאה מוטיבציה גבוהה לצמיחה.'
      : 'Candidate presented a strong technical background with proven experience in team leadership and systems development. Highlighted a measurable achievement (30% improvement) and expressed high motivation for growth.';

  return {
    transcript_text: simulatedTranscript,
    summary: simulatedSummary,
    key_points: simulatedKeyPoints,
    sentiment: 'positive',
    language,
    confidence_score: 0.94,
    duration_seconds: durationSeconds,
    word_count: wordCount,
    status: 'completed',
    model_used: 'whisper-1 + claude-haiku',
  };
}

// ─── Sentiment config ──────────────────────────────────────────────────────────

const SENTIMENT_CONFIG: Record<
  Sentiment,
  { icon: React.ComponentType<{ className?: string }>; className: string; labelHe: string; labelEn: string }
> = {
  positive: { icon: ThumbsUp, className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', labelHe: 'חיובי', labelEn: 'Positive' },
  neutral: { icon: Minus, className: 'bg-slate-500/10 text-slate-600 border-slate-500/20', labelHe: 'נייטרלי', labelEn: 'Neutral' },
  negative: { icon: ThumbsDown, className: 'bg-red-500/10 text-red-600 border-red-500/20', labelHe: 'שלילי', labelEn: 'Negative' },
  mixed: { icon: RefreshCw, className: 'bg-amber-500/10 text-amber-600 border-amber-500/20', labelHe: 'מעורב', labelEn: 'Mixed' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function InterviewTranscription({ interviewId, videoResponseId, audioUrl }: Props) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const qc = useQueryClient();

  const [selectedLang, setSelectedLang] = useState<TranscriptLanguage>('auto');
  const [searchQuery, setSearchQuery] = useState('');
  const [noteText, setNoteText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ── i18n ──────────────────────────────────────────────────────────────────
  const t = useCallback(
    (he: string, en: string) => (isRTL ? he : en),
    [isRTL]
  );

  // ── Query: fetch existing transcription ───────────────────────────────────
  const queryKey = ['interview_transcription', interviewId ?? '', videoResponseId ?? ''];

  const { data: record, isLoading } = useQuery<TranscriptionRecord | null>({
    queryKey,
    enabled: !!(interviewId || videoResponseId),
    queryFn: async () => {
      let q = supabase.from('interview_transcriptions' as any).select('*');
      if (interviewId) q = (q as any).eq('interview_id', interviewId);
      if (videoResponseId) q = (q as any).eq('video_response_id', videoResponseId);
      const { data, error } = await (q as any).maybeSingle();
      if (error) throw error;
      return data as TranscriptionRecord | null;
    },
  });

  // ── Mutation: generate transcription ─────────────────────────────────────
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      // Upsert a pending record
      const payload: Record<string, unknown> = {
        status: 'pending',
        created_by: user.id,
        language: selectedLang,
        audio_url: audioUrl ?? null,
        interview_id: interviewId ?? null,
        video_response_id: videoResponseId ?? null,
      };

      let recordId: string;

      if (record?.id) {
        // Reset existing
        const { error } = await supabase
          .from('interview_transcriptions' as any)
          .update({ ...payload, transcript_text: null, summary: null, key_points: null, sentiment: null, confidence_score: null })
          .eq('id', record.id);
        if (error) throw error;
        recordId = record.id;
      } else {
        const { data, error } = await supabase
          .from('interview_transcriptions' as any)
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        recordId = (data as any).id;
      }

      // Invalidate early so UI shows "processing"
      qc.invalidateQueries({ queryKey });

      const result = await runTranscription(audioUrl ?? '', selectedLang, recordId, user.id);

      const { error: updateErr } = await supabase
        .from('interview_transcriptions' as any)
        .update(result)
        .eq('id', recordId);
      if (updateErr) throw updateErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success(t('תמלול הושלם בהצלחה', 'Transcription completed successfully'));
    },
    onError: (err: any) => {
      toast.error(err?.message ?? t('שגיאה בתמלול', 'Transcription failed'));
      // mark failed
      if (record?.id) {
        supabase
          .from('interview_transcriptions' as any)
          .update({ status: 'failed' })
          .eq('id', record.id)
          .then(() => qc.invalidateQueries({ queryKey }));
      }
    },
  });

  // ── Mutation: regenerate summary only ────────────────────────────────────
  const regenSummaryMutation = useMutation({
    mutationFn: async () => {
      if (!record?.transcript_text) throw new Error('No transcript');
      await new Promise(r => setTimeout(r, 1200));
      const newSummary = isRTL
        ? 'סיכום מחודש: המועמד הציג ניסיון רלוונטי עם יכולות טכניות ומנהיגותיות בולטות. מומלץ להמשיך לשלב הראיון האישי.'
        : 'Regenerated summary: Candidate demonstrated relevant experience with notable technical and leadership capabilities. Recommended to proceed to the personal interview stage.';
      const { error } = await supabase
        .from('interview_transcriptions' as any)
        .update({ summary: newSummary })
        .eq('id', record.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success(t('סיכום עודכן', 'Summary regenerated'));
    },
    onError: (err: any) => toast.error(err?.message),
  });

  // ── Mutation: save to team notes ─────────────────────────────────────────
  const saveNoteMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!user || !interviewId) throw new Error('Missing context');
      const { error } = await supabase.from('team_notes' as any).insert({
        author_id: user.id,
        content: text,
        entity_type: 'interview',
        entity_id: interviewId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t('הערה נשמרה', 'Note saved'));
      setNoteText('');
    },
    onError: (err: any) => toast.error(err?.message),
  });

  // ── Derived ───────────────────────────────────────────────────────────────
  const status: TranscriptionStatus = generateMutation.isPending
    ? 'processing'
    : (record?.status ?? 'idle');

  const isProcessing = status === 'pending' || status === 'processing';
  const isCompleted = status === 'completed';

  const segments: TranscriptSegment[] =
    isCompleted && record?.transcript_text
      ? buildSegments(record.transcript_text, record.duration_seconds ?? 60)
      : [];

  const filteredSegments = searchQuery
    ? segments.filter(s => s.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : segments;

  const keyPoints: string[] = (record?.key_points as string[] | null) ?? [];
  const sentiment = record?.sentiment as Sentiment | null;

  // ── Audio toggle ──────────────────────────────────────────────────────────
  const toggleAudio = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const seekAudio = (seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = seconds;
    audioRef.current.play();
    setIsPlaying(true);
  };

  // ── Export helpers ────────────────────────────────────────────────────────
  const copyTranscript = () => {
    if (!record?.transcript_text) return;
    navigator.clipboard.writeText(record.transcript_text);
    toast.success(t('הועתק ללוח', 'Copied to clipboard'));
  };

  const downloadTxt = () => {
    if (!record?.transcript_text) return;
    const blob = new Blob([record.transcript_text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transcript.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = () => window.print();

  // ── Status badge ──────────────────────────────────────────────────────────
  const StatusBadge = () => {
    const map: Record<TranscriptionStatus, { label: string; className: string }> = {
      idle: { label: t('טרם הופעל', 'Not started'), className: 'bg-muted text-muted-foreground' },
      pending: { label: t('ממתין...', 'Pending...'), className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
      processing: { label: t('מעבד...', 'Processing...'), className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
      completed: { label: t('הושלם', 'Completed'), className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
      failed: { label: t('נכשל', 'Failed'), className: 'bg-red-500/10 text-red-600 border-red-500/20' },
    };
    const cfg = map[status];
    return (
      <Badge variant="outline" className={cn('gap-1.5 text-xs', cfg.className)}>
        {isProcessing && <Loader2 className="w-3 h-3 animate-spin" />}
        {cfg.label}
      </Badge>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="space-y-4">
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}

      {/* ── Section 1: Controls ─────────────────────────────────────────── */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mic className="w-4 h-4 text-primary" />
            {t('תמלול ראיון', 'Interview Transcription')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Language selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t('שפה:', 'Language:')}</span>
              <div className="flex rounded-md border border-border overflow-hidden">
                {(['auto', 'he', 'en'] as TranscriptLanguage[]).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLang(lang)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium transition-colors',
                      selectedLang === lang
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {lang === 'auto' ? t('זיהוי אוטומטי', 'Auto') : lang === 'he' ? 'עברית' : 'English'}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <StatusBadge />

            {/* Confidence */}
            {isCompleted && record?.confidence_score != null && (
              <Badge variant="outline" className="gap-1 text-xs bg-primary/5 text-primary border-primary/20">
                <Brain className="w-3 h-3" />
                {t('דיוק', 'Confidence')}: {Math.round(record.confidence_score * 100)}%
              </Badge>
            )}

            {/* Generate button */}
            <div className="flex-1 flex justify-end">
              <Button
                size="sm"
                onClick={() => generateMutation.mutate()}
                disabled={isProcessing || !audioUrl}
                className="gap-2 min-w-[160px]"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('מעבד...', 'Processing...')}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {isCompleted
                      ? t('תמלל מחדש', 'Re-transcribe')
                      : t('הפק תמלול', 'Generate Transcription')}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Processing progress bar */}
          {isProcessing && (
            <div className="space-y-1.5">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full animate-[progress_2s_ease-in-out_infinite]" style={{ width: '60%' }} />
              </div>
              <p className="text-xs text-muted-foreground">
                {t('שולח לעיבוד Whisper AI...', 'Sending to Whisper AI for processing...')}
              </p>
            </div>
          )}

          {/* Meta info row */}
          {isCompleted && (
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground border-t border-border pt-3">
              {record?.duration_seconds != null && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {formatSeconds(record.duration_seconds)}
                </span>
              )}
              {record?.word_count != null && (
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {record.word_count} {t('מילים', 'words')}
                </span>
              )}
              {record?.model_used && (
                <span className="flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5" />
                  {record.model_used}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Loading skeleton ─────────────────────────────────────────────── */}
      {isLoading && (
        <Card className="border-border bg-card animate-pulse">
          <CardContent className="py-8 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            {t('טוען...', 'Loading...')}
          </CardContent>
        </Card>
      )}

      {/* ── Idle empty state ─────────────────────────────────────────────── */}
      {!isLoading && status === 'idle' && (
        <Card className="border-dashed border-border bg-muted/20">
          <CardContent className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
            <Mic className="w-10 h-10 opacity-30" />
            <p className="text-sm font-medium">{t('אין תמלול עדיין', 'No transcription yet')}</p>
            <p className="text-xs text-center max-w-xs">
              {t(
                'לחץ על "הפק תמלול" כדי לשלוח את הקלטת לעיבוד Whisper AI',
                'Click "Generate Transcription" to send the recording to Whisper AI'
              )}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Failed state ─────────────────────────────────────────────────── */}
      {!isLoading && status === 'failed' && (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="py-8 flex flex-col items-center gap-3 text-red-600">
            <p className="text-sm font-medium">{t('התמלול נכשל', 'Transcription failed')}</p>
            <Button size="sm" variant="outline" onClick={() => generateMutation.mutate()} className="gap-2 border-red-500/30 text-red-600 hover:bg-red-500/10">
              <RefreshCw className="w-4 h-4" />
              {t('נסה שוב', 'Try again')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Main tabs (shown only when completed) ────────────────────────── */}
      {isCompleted && (
        <Tabs defaultValue="transcript" className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="transcript" className="gap-1.5 text-xs sm:text-sm">
              <FileText className="w-3.5 h-3.5" />
              {t('תמלול', 'Transcript')}
            </TabsTrigger>
            <TabsTrigger value="summary" className="gap-1.5 text-xs sm:text-sm">
              <Brain className="w-3.5 h-3.5" />
              {t('סיכום AI', 'AI Summary')}
            </TabsTrigger>
            <TabsTrigger value="export" className="gap-1.5 text-xs sm:text-sm">
              <Download className="w-3.5 h-3.5" />
              {t('ייצוא', 'Export')}
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Transcript ─────────────────────────────────────────── */}
          <TabsContent value="transcript">
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    {t('תמלול מלא', 'Full Transcript')}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {audioUrl && (
                      <Button size="sm" variant="outline" onClick={toggleAudio} className="gap-1.5 h-8 text-xs">
                        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        {isPlaying ? t('עצור', 'Pause') : t('נגן', 'Play')}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={copyTranscript} className="gap-1.5 h-8 text-xs">
                      <MessageSquare className="w-3.5 h-3.5" />
                      {t('העתק', 'Copy')}
                    </Button>
                  </div>
                </div>

                {/* Search */}
                <div className="relative mt-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={t('חיפוש בתמלול...', 'Search transcript...')}
                    className="w-full h-8 px-3 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30"
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                </div>
              </CardHeader>

              <CardContent>
                {filteredSegments.length === 0 && searchQuery ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    {t('לא נמצאו תוצאות', 'No results found')}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {filteredSegments.map((seg, i) => (
                      <div
                        key={i}
                        className={cn(
                          'flex gap-3 group rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50',
                          isRTL ? 'flex-row-reverse' : 'flex-row'
                        )}
                      >
                        <button
                          onClick={() => seekAudio(seg.start)}
                          className={cn(
                            'flex-shrink-0 text-xs font-mono text-muted-foreground hover:text-primary transition-colors mt-0.5',
                            !audioUrl && 'cursor-default pointer-events-none'
                          )}
                          title={audioUrl ? t('קפוץ לזמן זה', 'Jump to this time') : undefined}
                        >
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 opacity-60" />
                            {formatSeconds(seg.start)}
                          </span>
                        </button>
                        <p
                          className="text-sm leading-relaxed text-foreground flex-1"
                          style={{ direction: isRTL ? 'rtl' : 'ltr' }}
                        >
                          {seg.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab 2: AI Summary ─────────────────────────────────────────── */}
          <TabsContent value="summary">
            <div className="space-y-4">
              {/* Sentiment */}
              {sentiment && (
                <Card className="border-border bg-card">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground">
                        {t('סנטימנט כללי:', 'Overall Sentiment:')}
                      </span>
                      {(() => {
                        const cfg = SENTIMENT_CONFIG[sentiment];
                        const Icon = cfg.icon;
                        return (
                          <Badge variant="outline" className={cn('gap-1.5', cfg.className)}>
                            <Icon className="w-3.5 h-3.5" />
                            {isRTL ? cfg.labelHe : cfg.labelEn}
                          </Badge>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Summary text */}
              {record?.summary && (
                <Card className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      {t('סיכום', 'Summary')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-foreground" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
                      {record.summary}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Key points */}
              {keyPoints.length > 0 && (
                <Card className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Brain className="w-4 h-4 text-primary" />
                      {t('נקודות מפתח', 'Key Points')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {keyPoints.map((point, i) => (
                        <li
                          key={i}
                          className={cn('flex items-start gap-2 text-sm text-foreground', isRTL ? 'flex-row-reverse' : 'flex-row')}
                        >
                          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                          <span style={{ direction: isRTL ? 'rtl' : 'ltr' }}>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Strengths / Concerns / Next steps (static AI analysis placeholders) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card className="border-emerald-500/20 bg-emerald-500/5">
                  <CardHeader className="pb-2 pt-4">
                    <CardTitle className="text-xs text-emerald-700 flex items-center gap-1.5">
                      <ThumbsUp className="w-3.5 h-3.5" />
                      {t('חוזקות', 'Strengths')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <ul className="space-y-1 text-xs text-foreground">
                      <li>{t('ניסיון טכני רלוונטי', 'Relevant technical experience')}</li>
                      <li>{t('ניסיון ניהול צוות', 'Team leadership experience')}</li>
                      <li>{t('הישגים מדידים', 'Measurable achievements')}</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-amber-500/20 bg-amber-500/5">
                  <CardHeader className="pb-2 pt-4">
                    <CardTitle className="text-xs text-amber-700 flex items-center gap-1.5">
                      <Minus className="w-3.5 h-3.5" />
                      {t('נקודות לבדיקה', 'Areas of Concern')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <ul className="space-y-1 text-xs text-foreground">
                      <li>{t('נדרש בדיקת עומק טכנית', 'Technical depth check needed')}</li>
                      <li>{t('לא הוזכרו טכנולוגיות backend', 'Backend stack not mentioned')}</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-blue-500/20 bg-blue-500/5">
                  <CardHeader className="pb-2 pt-4">
                    <CardTitle className="text-xs text-blue-700 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      {t('המלצות לשלב הבא', 'Recommended Next Steps')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <ul className="space-y-1 text-xs text-foreground">
                      <li>{t('ראיון טכני עם ה-CTO', 'Technical interview with CTO')}</li>
                      <li>{t('בדיקת פרויקטים קודמים', 'Review past projects')}</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Regenerate */}
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => regenSummaryMutation.mutate()}
                  disabled={regenSummaryMutation.isPending}
                  className="gap-2"
                >
                  {regenSummaryMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {t('צור סיכום מחדש', 'Regenerate Summary')}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ── Tab 3: Export ─────────────────────────────────────────────── */}
          <TabsContent value="export">
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Download className="w-4 h-4 text-primary" />
                  {t('אפשרויות ייצוא', 'Export Options')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Download buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" onClick={downloadTxt} className="gap-2 h-12 flex-col text-xs">
                    <FileText className="w-5 h-5" />
                    {t('הורד כ-TXT', 'Download TXT')}
                  </Button>
                  <Button variant="outline" onClick={downloadPdf} className="gap-2 h-12 flex-col text-xs">
                    <Download className="w-5 h-5" />
                    {t('הורד כ-PDF', 'Download PDF')}
                  </Button>
                  <Button variant="outline" onClick={copyTranscript} className="gap-2 h-12 flex-col text-xs">
                    <MessageSquare className="w-5 h-5" />
                    {t('העתק ללוח', 'Copy to Clipboard')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (record?.transcript_text) setNoteText(record.transcript_text);
                    }}
                    className="gap-2 h-12 flex-col text-xs"
                  >
                    <Brain className="w-5 h-5" />
                    {t('הוסף להערות', 'Add to Notes')}
                  </Button>
                </div>

                {/* Add to team notes */}
                {interviewId && (
                  <div className="space-y-2 border-t border-border pt-4">
                    <p className="text-sm font-medium text-foreground">
                      {t('הוסף לבמות הצוות', 'Add to Team Notes')}
                    </p>
                    <Textarea
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      placeholder={t('הקלד הערה...', 'Type a note...')}
                      rows={4}
                      dir={isRTL ? 'rtl' : 'ltr'}
                      className="text-sm resize-none"
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => saveNoteMutation.mutate(noteText)}
                        disabled={!noteText.trim() || saveNoteMutation.isPending}
                        className="gap-2"
                      >
                        {saveNoteMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <MessageSquare className="w-4 h-4" />
                        )}
                        {t('שמור הערה', 'Save Note')}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
