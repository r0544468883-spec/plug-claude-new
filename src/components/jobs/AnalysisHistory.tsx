import React, { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Analysis {
  id: string
  title: string
  company: string | null
  score: number | null
  summary: string | null
  recommendation: string | null
  source_url: string | null
  analyzed_at: string
}

type Filter = 'all' | 'apply' | 'maybe' | 'skip'

interface Props {
  userId: string
  language?: string
}

export default function AnalysisHistory({ userId, language = 'he' }: Props) {
  const isHebrew = language === 'he'
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    if (!userId) return
    supabase
      .from('job_analyses')
      .select('id, title, company, score, summary, recommendation, source_url, analyzed_at')
      .eq('user_id', userId)
      .order('analyzed_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setAnalyses((data as Analysis[]) ?? [])
        setLoading(false)
      })

    // Real-time: add new analyses as they arrive from the extension
    const channel = supabase
      .channel(`job-analyses-rt-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'job_analyses', filter: `user_id=eq.${userId}` },
        (payload) => {
          setAnalyses((prev) => [payload.new as Analysis, ...prev].slice(0, 100))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const filtered = filter === 'all'
    ? analyses
    : analyses.filter(a => a.recommendation === filter)

  function scoreColor(score: number | null) {
    if (score === null) return 'text-muted-foreground'
    if (score >= 80) return 'text-green-500'
    if (score >= 60) return 'text-yellow-500'
    return 'text-red-500'
  }

  function recBadge(rec: string | null) {
    if (rec === 'apply') return <Badge className="bg-green-500/15 text-green-600 border-green-500/30 text-[10px]">{isHebrew ? 'להגיש' : 'Apply'}</Badge>
    if (rec === 'maybe') return <Badge className="bg-yellow-500/15 text-yellow-600 border-yellow-500/30 text-[10px]">{isHebrew ? 'שקול' : 'Maybe'}</Badge>
    if (rec === 'skip') return <Badge className="bg-red-500/15 text-red-600 border-red-500/30 text-[10px]">{isHebrew ? 'לדלג' : 'Skip'}</Badge>
    return null
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(isHebrew ? 'he-IL' : 'en-US', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    })
  }

  const filterLabels: Record<Filter, string> = {
    all: isHebrew ? 'הכל' : 'All',
    apply: isHebrew ? 'להגיש' : 'Apply',
    maybe: isHebrew ? 'שקול' : 'Maybe',
    skip: isHebrew ? 'לדלג' : 'Skip',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (analyses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
        <span className="text-4xl">🎯</span>
        <p className="text-muted-foreground text-sm">
          {isHebrew ? 'אין ניתוחים עדיין' : 'No analyses yet'}
        </p>
        <p className="text-muted-foreground text-xs max-w-xs">
          {isHebrew
            ? 'נתח משרות בתוסף PLUG כדי לראות היסטוריית ניתוחים כאן'
            : 'Analyze jobs in the PLUG extension to see your analysis history here'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4" dir={isHebrew ? 'rtl' : 'ltr'}>
      {/* Filter buttons */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'apply', 'maybe', 'skip'] as Filter[]).map((f) => {
          const count = f === 'all' ? analyses.length : analyses.filter(a => a.recommendation === f).length
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                filter === f
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-primary'
              }`}
            >
              {filterLabels[f]} ({count})
            </button>
          )
        })}
      </div>

      {/* Analysis cards */}
      <div className="flex flex-col gap-3">
        {filtered.map((a) => (
          <div
            key={a.id}
            className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
          >
            {/* Score */}
            <div className="flex-shrink-0 text-center min-w-[48px]">
              <span className={`text-xl font-bold ${scoreColor(a.score)}`}>
                {a.score !== null ? `${a.score}%` : '—'}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{a.title}</p>
                  {a.company && (
                    <p className="text-xs text-muted-foreground">{a.company}</p>
                  )}
                </div>
                {recBadge(a.recommendation)}
              </div>

              {a.summary && (
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                  {a.summary}
                </p>
              )}

              <div className="flex items-center justify-between mt-2">
                <span className="text-[11px] text-muted-foreground">{formatDate(a.analyzed_at)}</span>
                {a.source_url && (
                  <a
                    href={a.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isHebrew ? 'צפה במשרה' : 'View Job'}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
