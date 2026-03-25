import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Bot, Play, Square, Pause, Zap, CheckCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';

type AgentStatus = 'running' | 'idle' | 'paused';

interface AgentStats {
  totalScanned?: number;
  totalApplied?: number;
  startedAt?: number;
  completedAt?: number;
}

interface AgentControlRow {
  status: AgentStatus;
  command: string;
  criteria: { minMatchScore?: number; maxApplicationsPerSession?: number };
  stats: AgentStats;
  last_updated: string;
}

export function ExtensionAgentPanel() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';

  const [agentRow, setAgentRow] = useState<AgentControlRow | null>(null);
  const [minScore, setMinScore] = useState(70);
  const [maxApps, setMaxApps] = useState(10);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [manualApplyToAll, setManualApplyToAll] = useState(true);
  const [manualMinScore, setManualMinScore] = useState(70);

  // Load current agent control row
  useEffect(() => {
    if (!user?.id) return;

    supabase
      .from('extension_agent_control')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setAgentRow(data as AgentControlRow);
          if (data.criteria?.minMatchScore) setMinScore(data.criteria.minMatchScore);
          if (data.criteria?.maxApplicationsPerSession) setMaxApps(data.criteria.maxApplicationsPerSession);
          const c = data.criteria as Record<string, unknown>;
          if (typeof c?.applyToAll === 'boolean') setManualApplyToAll(c.applyToAll as boolean);
          if (typeof c?.applyMinScore === 'number') setManualMinScore(c.applyMinScore as number);
        }
      });

    // Real-time subscription
    const channel = supabase
      .channel(`agent-panel-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'extension_agent_control',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setAgentRow(payload.new as AgentControlRow);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const saveManualApplySettings = async (newApplyToAll: boolean, newMinScore: number) => {
    if (!user?.id) return;
    await supabase.from('extension_agent_control').upsert({
      user_id: user.id,
      command: 'settings',
      criteria: {
        minMatchScore: minScore,
        maxApplicationsPerSession: maxApps,
        mode: 'auto',
        applyToAll: newApplyToAll,
        applyMinScore: newMinScore,
      },
      last_updated: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  };

  const sendCommand = async (command: 'start' | 'stop' | 'pause') => {
    if (!user?.id) return;
    setLoading(true);
    try {
      await supabase.from('extension_agent_control').upsert({
        user_id: user.id,
        command,
        criteria: { minMatchScore: minScore, maxApplicationsPerSession: maxApps, mode: 'auto' },
        last_updated: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    } finally {
      setLoading(false);
    }
  };

  const status: AgentStatus = agentRow?.status ?? 'idle';
  const stats: AgentStats = agentRow?.stats ?? {};
  const isRunning = status === 'running';
  const isPaused = status === 'paused';

  const statusLabel = isRTL
    ? { running: '🤖 רץ', idle: '💤 ממתין', paused: '⏸ מושהה' }[status]
    : { running: '🤖 Running', idle: '💤 Idle', paused: '⏸ Paused' }[status];

  const statusColor = {
    running: 'bg-green-500/20 text-green-400 border-green-500/30',
    idle: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    paused: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  }[status];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
      {/* Compact header — always visible */}
      <button
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-start">
            <p className="text-sm font-semibold text-white">
              {isRTL ? 'סוכן AI אוטומטי' : 'AI Auto Agent'}
            </p>
            <p className="text-xs text-white/40">
              {isRTL ? 'מחפש ומגיש מועמדויות ברקע' : 'Searches & applies in the background'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`text-xs border ${statusColor}`}>
            {statusLabel}
          </Badge>
          {expanded
            ? <ChevronUp className="w-4 h-4 text-white/40" />
            : <ChevronDown className="w-4 h-4 text-white/40" />
          }
        </div>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/10 pt-4">
          {/* Stats row */}
          {(stats.totalScanned !== undefined || stats.totalApplied !== undefined) && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/5 p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Clock className="w-3 h-3 text-white/40" />
                  <p className="text-xs text-white/40">{isRTL ? 'נסרקו' : 'Scanned'}</p>
                </div>
                <p className="text-lg font-bold text-white">{stats.totalScanned ?? 0}</p>
              </div>
              <div className="rounded-xl bg-white/5 p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <CheckCircle className="w-3 h-3 text-violet-400" />
                  <p className="text-xs text-white/40">{isRTL ? 'הוגשו' : 'Applied'}</p>
                </div>
                <p className="text-lg font-bold text-violet-400">{stats.totalApplied ?? 0}</p>
              </div>
            </div>
          )}

          {/* Settings (only when idle/paused) */}
          {!isRunning && (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-white/50 mb-2">
                  <span>{isRTL ? 'ציון מינימום' : 'Min match score'}</span>
                  <span className="text-violet-400 font-medium">{minScore}%</span>
                </div>
                <Slider
                  value={[minScore]}
                  onValueChange={([v]) => setMinScore(v)}
                  min={50}
                  max={95}
                  step={5}
                  className="w-full"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs text-white/50 mb-2">
                  <span>{isRTL ? 'מקסימום בקשות לסשן' : 'Max apps per session'}</span>
                  <span className="text-violet-400 font-medium">{maxApps}</span>
                </div>
                <Slider
                  value={[maxApps]}
                  onValueChange={([v]) => setMaxApps(v)}
                  min={1}
                  max={25}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* Manual apply settings */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <p className="text-xs text-white/50 font-medium">
              {isRTL ? 'הגשה ידנית מהסייד-פאנל' : 'Manual apply from sidebar'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { setManualApplyToAll(true); saveManualApplySettings(true, manualMinScore); }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${manualApplyToAll ? 'bg-violet-600 text-white border-violet-600' : 'text-white/50 border-white/10 hover:border-white/30'}`}
              >
                {isRTL ? 'כל המשרות' : 'All jobs'}
              </button>
              <button
                onClick={() => { setManualApplyToAll(false); saveManualApplySettings(false, manualMinScore); }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${!manualApplyToAll ? 'bg-violet-600 text-white border-violet-600' : 'text-white/50 border-white/10 hover:border-white/30'}`}
              >
                {isRTL ? `מעל ${manualMinScore}%` : `Above ${manualMinScore}%`}
              </button>
            </div>
            {!manualApplyToAll && (
              <div>
                <div className="flex justify-between text-xs text-white/40 mb-1">
                  <span>{isRTL ? 'סף מינימום' : 'Min threshold'}</span>
                  <span className="text-violet-400">{manualMinScore}%</span>
                </div>
                <Slider
                  value={[manualMinScore]}
                  onValueChange={([v]) => { setManualMinScore(v); saveManualApplySettings(false, v); }}
                  min={50}
                  max={95}
                  step={5}
                  className="w-full"
                />
              </div>
            )}
          </div>

          {/* Control buttons */}
          <div className="flex gap-2">
            {!isRunning ? (
              <Button
                onClick={() => sendCommand('start')}
                disabled={loading}
                size="sm"
                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white gap-2"
              >
                <Play className="w-3.5 h-3.5" />
                {isRTL ? 'הפעל אגנט' : 'Start Agent'}
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => sendCommand('pause')}
                  disabled={loading}
                  size="sm"
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10 gap-2"
                >
                  <Pause className="w-3.5 h-3.5" />
                  {isRTL ? 'השהה' : 'Pause'}
                </Button>
                <Button
                  onClick={() => sendCommand('stop')}
                  disabled={loading}
                  size="sm"
                  variant="outline"
                  className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 gap-2"
                >
                  <Square className="w-3.5 h-3.5" />
                  {isRTL ? 'עצור' : 'Stop'}
                </Button>
              </>
            )}
          </div>

          {/* Extension hint */}
          {status === 'idle' && (
            <p className="text-xs text-white/30 text-center flex items-center justify-center gap-1">
              <Zap className="w-3 h-3" />
              {isRTL
                ? 'פתח את התוסף בדפדפן ונווט לאתר עבודה לפני ההפעלה'
                : 'Open the extension in your browser and navigate to a job site first'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
