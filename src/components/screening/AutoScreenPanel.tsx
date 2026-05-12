import { useState, KeyboardEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Bot,
  Save,
  Loader2,
  X,
  Plus,
  TrendingUp,
  TrendingDown,
  Flag,
  PauseCircle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ClipboardList,
  Users,
  ChevronUp,
  ChevronDown,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

interface AutoScreenRule {
  id?: string;
  job_id: string;
  created_by: string;
  min_match_score: number;
  required_skills: string[];
  min_experience_years: number;
  knockout_fail_action: 'reject' | 'flag' | 'hold';
  auto_advance_threshold: number;
  auto_reject_threshold: number;
  is_active: boolean;
}

interface AutoScreenLog {
  id: string;
  rule_id: string;
  application_id: string;
  candidate_id: string | null;
  action: 'advanced' | 'rejected' | 'flagged' | 'held';
  match_score: number | null;
  reason: string | null;
  created_at: string;
  candidate_name?: string | null;
}

interface AutoScreenPanelProps {
  jobId: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getActionBadge(action: AutoScreenLog['action'], isRTL: boolean) {
  switch (action) {
    case 'advanced':
      return (
        <Badge className="gap-1 bg-green-500/10 text-green-600 border border-green-500/20 hover:bg-green-500/20">
          <CheckCircle2 className="h-3 w-3" />
          {isRTL ? 'הועבר' : 'Advanced'}
        </Badge>
      );
    case 'rejected':
      return (
        <Badge className="gap-1 bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-500/20">
          <XCircle className="h-3 w-3" />
          {isRTL ? 'נדחה' : 'Rejected'}
        </Badge>
      );
    case 'flagged':
      return (
        <Badge className="gap-1 bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 hover:bg-yellow-500/20">
          <Flag className="h-3 w-3" />
          {isRTL ? 'סומן' : 'Flagged'}
        </Badge>
      );
    case 'held':
      return (
        <Badge className="gap-1 bg-muted text-muted-foreground border border-border hover:bg-muted/80">
          <PauseCircle className="h-3 w-3" />
          {isRTL ? 'בהמתנה' : 'Held'}
        </Badge>
      );
    default:
      return null;
  }
}

function getScoreColor(score: number | null) {
  if (score === null) return 'text-muted-foreground';
  if (score >= 70) return 'text-green-600 font-semibold';
  if (score >= 40) return 'text-yellow-600 font-semibold';
  return 'text-red-600 font-semibold';
}

function formatTimestamp(ts: string, isRTL: boolean) {
  const date = new Date(ts);
  return date.toLocaleString(isRTL ? 'he-IL' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AutoScreenPanel({ jobId }: AutoScreenPanelProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const queryClient = useQueryClient();

  // ── Rule form state ──
  const [isActive, setIsActive] = useState(true);
  const [autoAdvanceThreshold, setAutoAdvanceThreshold] = useState(80);
  const [autoRejectThreshold, setAutoRejectThreshold] = useState(30);
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [minExperienceYears, setMinExperienceYears] = useState<number>(0);
  const [knockoutFailAction, setKnockoutFailAction] = useState<'reject' | 'flag' | 'hold'>('flag');

  // ── Log UI state ──
  const [logExpanded, setLogExpanded] = useState(true);

  // ─── Fetch existing rule ────────────────────────────────────────────────────

  const { isLoading: ruleLoading } = useQuery({
    queryKey: ['auto-screen-rule', jobId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('auto_screen_rules')
        .select('*')
        .eq('job_id', jobId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setIsActive(data.is_active ?? true);
        setAutoAdvanceThreshold(data.auto_advance_threshold ?? 80);
        setAutoRejectThreshold(data.auto_reject_threshold ?? 30);
        setRequiredSkills(data.required_skills ?? []);
        setMinExperienceYears(data.min_experience_years ?? 0);
        setKnockoutFailAction(data.knockout_fail_action ?? 'flag');
      }
      return data as AutoScreenRule | null;
    },
    enabled: !!jobId && !!user?.id,
  });

  // ─── Fetch screening logs ───────────────────────────────────────────────────

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['auto-screen-logs', jobId],
    queryFn: async () => {
      // First get the rule id for this job
      const { data: rule, error: ruleErr } = await (supabase as any)
        .from('auto_screen_rules')
        .select('id')
        .eq('job_id', jobId)
        .maybeSingle();

      if (ruleErr) throw ruleErr;
      if (!rule) return [] as AutoScreenLog[];

      const { data, error } = await (supabase as any)
        .from('auto_screen_logs')
        .select('*')
        .eq('rule_id', rule.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Enrich with candidate names (best-effort)
      const logs = (data ?? []) as AutoScreenLog[];
      const candidateIds = [...new Set(logs.map((l: AutoScreenLog) => l.candidate_id).filter(Boolean))];

      if (candidateIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', candidateIds as string[]);

        const nameMap: Record<string, string> = {};
        (profiles ?? []).forEach((p: any) => {
          nameMap[p.id] = p.full_name;
        });

        return logs.map((l: AutoScreenLog) => ({
          ...l,
          candidate_name: l.candidate_id ? nameMap[l.candidate_id] ?? null : null,
        }));
      }

      return logs;
    },
    enabled: !!jobId,
  });

  // ─── Save rule mutation ─────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      // Validate thresholds
      if (autoRejectThreshold >= autoAdvanceThreshold) {
        throw new Error(
          isRTL
            ? 'ציון הדחייה האוטומטית חייב להיות נמוך מציון ההעברה האוטומטית'
            : 'Auto-reject threshold must be lower than auto-advance threshold'
        );
      }

      const payload: Omit<AutoScreenRule, 'id'> = {
        job_id: jobId,
        created_by: user.id,
        is_active: isActive,
        auto_advance_threshold: autoAdvanceThreshold,
        auto_reject_threshold: autoRejectThreshold,
        min_match_score: autoRejectThreshold, // kept in sync for backward-compat
        required_skills: requiredSkills,
        min_experience_years: minExperienceYears,
        knockout_fail_action: knockoutFailAction,
      };

      const { error } = await (supabase as any)
        .from('auto_screen_rules')
        .upsert(payload, { onConflict: 'job_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'כללי הסינון נשמרו בהצלחה' : 'Screening rules saved successfully');
      queryClient.invalidateQueries({ queryKey: ['auto-screen-rule', jobId] });
    },
    onError: (e: any) => {
      toast.error(e.message || (isRTL ? 'שגיאה בשמירת הכללים' : 'Failed to save rules'));
    },
  });

  // ─── Skill input handlers ───────────────────────────────────────────────────

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (!trimmed) return;
    if (requiredSkills.includes(trimmed)) {
      toast.error(isRTL ? 'כישור זה כבר קיים' : 'Skill already added');
      return;
    }
    setRequiredSkills(prev => [...prev, trimmed]);
    setSkillInput('');
  };

  const handleSkillKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
    }
  };

  const removeSkill = (skill: string) => {
    setRequiredSkills(prev => prev.filter(s => s !== skill));
  };

  // ─── Log stats ─────────────────────────────────────────────────────────────

  const stats = {
    total: logs.length,
    advanced: logs.filter(l => l.action === 'advanced').length,
    rejected: logs.filter(l => l.action === 'rejected').length,
    flagged: logs.filter(l => l.action === 'flagged').length,
    held: logs.filter(l => l.action === 'held').length,
  };

  // ─── Threshold conflict warning ─────────────────────────────────────────────
  const thresholdConflict = autoRejectThreshold >= autoAdvanceThreshold;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={cn('space-y-6', isRTL && 'text-right')} dir={isRTL ? 'rtl' : 'ltr'}>

      {/* ── Section 1: Rule Configuration ─────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <CardTitle className={cn('flex items-center gap-2 text-base', isRTL && 'flex-row-reverse justify-end')}>
            <Bot className="h-5 w-5 text-primary flex-shrink-0" />
            {isRTL ? 'הגדרות סינון אוטומטי' : 'Auto-Screening Rules'}
          </CardTitle>
          <CardDescription>
            {isRTL
              ? 'הגדר כללים אוטומטיים לסינון מועמדים בהתאם לציון ההתאמה ודרישות המשרה'
              : 'Configure automatic rules to screen candidates based on match score and job requirements'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {ruleLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <>
              {/* Enable / Disable toggle */}
              <div className={cn(
                'flex items-center justify-between rounded-lg border p-4 transition-colors',
                isActive ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-border'
              )}>
                <div className={cn('space-y-0.5', isRTL && 'text-right')}>
                  <Label className="text-sm font-medium cursor-pointer">
                    {isRTL ? 'הפעל סינון אוטומטי' : 'Enable Auto-Screening'}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {isActive
                      ? (isRTL ? 'המערכת תסנן מועמדים אוטומטית לפי הכללים שהוגדרו' : 'System will auto-screen candidates using the rules below')
                      : (isRTL ? 'הסינון האוטומטי מושבת — כל המועמדים יידרשו לסקירה ידנית' : 'Auto-screening is off — all candidates require manual review')}
                  </p>
                </div>
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  aria-label={isRTL ? 'הפעל/כבה סינון אוטומטי' : 'Toggle auto-screening'}
                />
              </div>

              {/* Sliders */}
              <div className="space-y-5">
                {/* Auto-advance threshold */}
                <div className="space-y-3">
                  <div className={cn('flex items-center justify-between', isRTL && 'flex-row-reverse')}>
                    <div className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')}>
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <Label className="text-sm font-medium">
                        {isRTL ? 'ציון מינימלי להעברה אוטומטית' : 'Minimum Score to Auto-Advance'}
                      </Label>
                    </div>
                    <Badge className="bg-green-500/10 text-green-600 border border-green-500/20 font-bold text-sm min-w-[3.5rem] justify-center">
                      {autoAdvanceThreshold}%
                    </Badge>
                  </div>
                  <Slider
                    value={[autoAdvanceThreshold]}
                    onValueChange={([v]) => setAutoAdvanceThreshold(v)}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                    aria-label={isRTL ? 'ציון העברה אוטומטית' : 'Auto-advance threshold'}
                  />
                  <p className="text-xs text-muted-foreground">
                    {isRTL
                      ? `מועמדים עם ציון ${autoAdvanceThreshold}% ומעלה יועברו אוטומטית לשלב הבא`
                      : `Candidates scoring ${autoAdvanceThreshold}% or above will be automatically advanced`}
                  </p>
                </div>

                {/* Auto-reject threshold */}
                <div className="space-y-3">
                  <div className={cn('flex items-center justify-between', isRTL && 'flex-row-reverse')}>
                    <div className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')}>
                      <TrendingDown className="h-4 w-4 text-red-500" />
                      <Label className="text-sm font-medium">
                        {isRTL ? 'ציון מקסימלי לדחייה אוטומטית' : 'Maximum Score to Auto-Reject'}
                      </Label>
                    </div>
                    <Badge className="bg-red-500/10 text-red-600 border border-red-500/20 font-bold text-sm min-w-[3.5rem] justify-center">
                      {autoRejectThreshold}%
                    </Badge>
                  </div>
                  <Slider
                    value={[autoRejectThreshold]}
                    onValueChange={([v]) => setAutoRejectThreshold(v)}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                    aria-label={isRTL ? 'ציון דחייה אוטומטית' : 'Auto-reject threshold'}
                  />
                  <p className="text-xs text-muted-foreground">
                    {isRTL
                      ? `מועמדים עם ציון ${autoRejectThreshold}% ומטה יידחו אוטומטית`
                      : `Candidates scoring ${autoRejectThreshold}% or below will be automatically rejected`}
                  </p>
                </div>

                {/* Threshold conflict warning */}
                {thresholdConflict && (
                  <div className={cn(
                    'flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive',
                    isRTL && 'flex-row-reverse text-right'
                  )}>
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>
                      {isRTL
                        ? 'ציון הדחייה האוטומטית חייב להיות נמוך מציון ההעברה האוטומטית'
                        : 'Auto-reject threshold must be lower than auto-advance threshold'}
                    </span>
                  </div>
                )}

                {/* Candidate flow visualization */}
                {!thresholdConflict && (
                  <div className={cn(
                    'flex items-center gap-1 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground',
                    isRTL ? 'flex-row-reverse' : 'flex-row'
                  )}>
                    <span className="text-red-500 font-medium">0–{autoRejectThreshold}%</span>
                    <span className="mx-1">→</span>
                    <Badge variant="outline" className="text-red-500 border-red-500/20 text-[10px] py-0">
                      {isRTL ? 'נדחה' : 'Rejected'}
                    </Badge>
                    <span className="mx-2 text-border">|</span>
                    <span className="text-muted-foreground font-medium">{autoRejectThreshold + 1}–{autoAdvanceThreshold - 1}%</span>
                    <span className="mx-1">→</span>
                    <Badge variant="outline" className="text-muted-foreground text-[10px] py-0">
                      {isRTL ? 'ידני' : 'Manual'}
                    </Badge>
                    <span className="mx-2 text-border">|</span>
                    <span className="text-green-600 font-medium">{autoAdvanceThreshold}–100%</span>
                    <span className="mx-1">→</span>
                    <Badge variant="outline" className="text-green-600 border-green-500/20 text-[10px] py-0">
                      {isRTL ? 'הועבר' : 'Advanced'}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Required skills */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  {isRTL ? 'כישורים נדרשים' : 'Required Skills'}
                </Label>
                <p className="text-xs text-muted-foreground -mt-1">
                  {isRTL
                    ? 'מועמדים שחסרים כישורים אלו יסומנו/יידחו לפי הגדרות שאלות הסינון'
                    : 'Candidates missing these skills will be flagged/rejected per knockout question settings'}
                </p>

                {/* Skill badges */}
                {requiredSkills.length > 0 && (
                  <div className={cn('flex flex-wrap gap-2', isRTL && 'flex-row-reverse')}>
                    {requiredSkills.map(skill => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="gap-1 pl-2.5 pr-1 py-1 text-sm"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          aria-label={isRTL ? `הסר כישור ${skill}` : `Remove skill ${skill}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Skill input */}
                <div className={cn('flex gap-2', isRTL && 'flex-row-reverse')}>
                  <Input
                    value={skillInput}
                    onChange={e => setSkillInput(e.target.value)}
                    onKeyDown={handleSkillKeyDown}
                    placeholder={isRTL ? 'לדוגמה: React, Python, ניהול פרויקטים...' : 'e.g. React, Python, Project Management...'}
                    dir={isRTL ? 'rtl' : 'ltr'}
                    className="flex-1"
                    aria-label={isRTL ? 'הזן כישור נדרש' : 'Enter required skill'}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={addSkill}
                    disabled={!skillInput.trim()}
                    aria-label={isRTL ? 'הוסף כישור' : 'Add skill'}
                    className="h-10 w-10 flex-shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {isRTL ? 'לחץ Enter או על כפתור + כדי להוסיף כישור' : 'Press Enter or click + to add a skill'}
                </p>
              </div>

              {/* Minimum experience */}
              <div className="space-y-2">
                <Label htmlFor="min-exp" className="text-sm font-medium">
                  {isRTL ? 'ניסיון מינימלי (שנים)' : 'Minimum Years of Experience'}
                </Label>
                <div className={cn('flex items-center gap-3', isRTL && 'flex-row-reverse')}>
                  <Input
                    id="min-exp"
                    type="number"
                    min={0}
                    max={30}
                    value={minExperienceYears}
                    onChange={e => setMinExperienceYears(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-24"
                    aria-label={isRTL ? 'ניסיון מינימלי בשנים' : 'Minimum years of experience'}
                  />
                  <span className="text-sm text-muted-foreground">
                    {isRTL ? 'שנות ניסיון לפחות' : 'years minimum'}
                  </span>
                </div>
                {minExperienceYears > 0 && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    {isRTL
                      ? `מועמדים עם פחות מ-${minExperienceYears} שנות ניסיון יטופלו לפי הגדרות שאלות הסינון`
                      : `Candidates with fewer than ${minExperienceYears} years will be handled per knockout question settings`}
                  </p>
                )}
              </div>

              {/* Knockout fail action */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {isRTL ? 'פעולה בכישלון שאלות סינון' : 'Action on Knockout Question Failure'}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isRTL
                    ? 'מה לעשות כשמועמד כושל בשאלות חובה (כישורים נדרשים / ניסיון)'
                    : 'What to do when a candidate fails required questions (missing skills / experience)'}
                </p>
                <Select
                  value={knockoutFailAction}
                  onValueChange={v => setKnockoutFailAction(v as 'reject' | 'flag' | 'hold')}
                >
                  <SelectTrigger className="w-full md:w-64" aria-label={isRTL ? 'פעולה בכישלון' : 'Knockout action'}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reject">
                      <span className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')}>
                        <XCircle className="h-4 w-4 text-red-500" />
                        {isRTL ? 'דחה אוטומטית' : 'Auto-Reject'}
                      </span>
                    </SelectItem>
                    <SelectItem value="flag">
                      <span className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')}>
                        <Flag className="h-4 w-4 text-yellow-500" />
                        {isRTL ? 'סמן לבדיקה' : 'Flag for Review'}
                      </span>
                    </SelectItem>
                    <SelectItem value="hold">
                      <span className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')}>
                        <PauseCircle className="h-4 w-4 text-muted-foreground" />
                        {isRTL ? 'העבר להמתנה' : 'Put on Hold'}
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Save button */}
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || thresholdConflict}
                className={cn('w-full gap-2', isRTL && 'flex-row-reverse')}
                size="lg"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isRTL ? 'שמור כללי סינון' : 'Save Screening Rules'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Section 2: Screening Log ───────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <div className={cn('flex items-center justify-between', isRTL && 'flex-row-reverse')}>
            <CardTitle className={cn('flex items-center gap-2 text-base', isRTL && 'flex-row-reverse')}>
              <ClipboardList className="h-5 w-5 text-primary flex-shrink-0" />
              {isRTL ? 'יומן סינון אוטומטי' : 'Auto-Screening Log'}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-muted-foreground"
              onClick={() => setLogExpanded(prev => !prev)}
              aria-label={logExpanded ? (isRTL ? 'כווץ' : 'Collapse') : (isRTL ? 'הרחב' : 'Expand')}
            >
              {logExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {logExpanded ? (isRTL ? 'כווץ' : 'Collapse') : (isRTL ? 'הרחב' : 'Expand')}
            </Button>
          </div>
          <CardDescription>
            {isRTL
              ? 'כל פעולות הסינון האוטומטי שבוצעו עד כה למשרה זו'
              : 'All automatic screening actions taken for this job'}
          </CardDescription>
        </CardHeader>

        {logExpanded && (
          <CardContent className="space-y-4">
            {/* Stats bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: isRTL ? 'סה"כ סוננו' : 'Total Screened',
                  value: stats.total,
                  icon: <Users className="h-4 w-4 text-muted-foreground" />,
                  className: 'bg-muted/40',
                },
                {
                  label: isRTL ? 'הועברו' : 'Advanced',
                  value: stats.advanced,
                  icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
                  className: 'bg-green-500/5 border-green-500/10',
                },
                {
                  label: isRTL ? 'נדחו' : 'Rejected',
                  value: stats.rejected,
                  icon: <XCircle className="h-4 w-4 text-red-500" />,
                  className: 'bg-red-500/5 border-red-500/10',
                },
                {
                  label: isRTL ? 'סומנו' : 'Flagged',
                  value: stats.flagged,
                  icon: <Flag className="h-4 w-4 text-yellow-500" />,
                  className: 'bg-yellow-500/5 border-yellow-500/10',
                },
              ].map(stat => (
                <div
                  key={stat.label}
                  className={cn(
                    'rounded-lg border p-3 text-center space-y-1',
                    stat.className
                  )}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    {stat.icon}
                    <span className="text-xs text-muted-foreground">{stat.label}</span>
                  </div>
                  <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Log table / list */}
            {logsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                <div className="rounded-full bg-muted p-4">
                  <Bot className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {isRTL ? 'אין פעולות סינון עדיין' : 'No screening actions yet'}
                  </p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    {isRTL
                      ? 'כאשר מועמדים יגישו מועמדות, פעולות הסינון האוטומטי יופיעו כאן'
                      : 'Once candidates apply, automated screening actions will appear here'}
                  </p>
                </div>
              </div>
            ) : (
              /* Log rows */
              <div className="space-y-2">
                {/* Header row (desktop) */}
                <div className={cn(
                  'hidden md:grid grid-cols-12 gap-3 px-3 py-1.5 text-xs font-medium text-muted-foreground border-b border-border',
                  isRTL && 'text-right'
                )}>
                  <span className="col-span-3">{isRTL ? 'מועמד' : 'Candidate'}</span>
                  <span className="col-span-2 text-center">{isRTL ? 'ציון' : 'Score'}</span>
                  <span className="col-span-2 text-center">{isRTL ? 'פעולה' : 'Action'}</span>
                  <span className="col-span-3">{isRTL ? 'סיבה' : 'Reason'}</span>
                  <span className={cn('col-span-2', isRTL ? 'text-right' : 'text-left')}>
                    {isRTL ? 'זמן' : 'Time'}
                  </span>
                </div>

                {logs.map(log => (
                  <div
                    key={log.id}
                    className={cn(
                      'rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors',
                      'p-3 md:grid md:grid-cols-12 md:gap-3 md:items-center',
                      'flex flex-col gap-2',
                      isRTL && 'text-right'
                    )}
                  >
                    {/* Candidate name */}
                    <div className={cn('md:col-span-3 flex items-center gap-2 min-w-0', isRTL && 'flex-row-reverse')}>
                      <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium flex-shrink-0">
                        {log.candidate_name ? log.candidate_name.charAt(0).toUpperCase() : '?'}
                      </div>
                      <span className="text-sm font-medium truncate">
                        {log.candidate_name || (isRTL ? 'אנונימי' : 'Anonymous')}
                      </span>
                    </div>

                    {/* Match score */}
                    <div className="md:col-span-2 md:text-center">
                      <span className={cn('text-sm tabular-nums', getScoreColor(log.match_score))}>
                        {log.match_score !== null ? `${log.match_score}%` : '—'}
                      </span>
                    </div>

                    {/* Action badge */}
                    <div className={cn('md:col-span-2 md:flex md:justify-center', isRTL && 'flex flex-row-reverse')}>
                      {getActionBadge(log.action, isRTL)}
                    </div>

                    {/* Reason */}
                    <div className="md:col-span-3">
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {log.reason || '—'}
                      </p>
                    </div>

                    {/* Timestamp */}
                    <div className="md:col-span-2">
                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTimestamp(log.created_at, isRTL)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
