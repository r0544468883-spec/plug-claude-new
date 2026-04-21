import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { ExternalLink, History, Building2, Eye, CheckCircle2, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

interface ExtensionJob {
  id: string
  title: string
  company_name: string | null
  location: string | null
  source_url: string | null
  external_source: string | null
  external_id: string | null
  created_at: string
  // joined from applications
  application_stage: string | null
  match_score: number | null
}

const SOURCE_LABEL: Record<string, string> = {
  alljobs: 'AllJobs',
  linkedin: 'LinkedIn',
  glassdoor: 'Glassdoor',
  jobmaster: 'JobMaster',
}

const STAGE_LABEL_HE: Record<string, string> = {
  viewed: 'נצפתה',
  applied: 'הוגשה',
  screening: 'בסינון',
  interview: 'ראיון',
  offer: 'הצעה',
  hired: 'התקבלת!',
}

const STAGE_LABEL_EN: Record<string, string> = {
  viewed: 'Viewed',
  applied: 'Applied',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
}

const STAGE_COLOR: Record<string, string> = {
  viewed: 'bg-slate-500/20 text-slate-400',
  applied: 'bg-indigo-500/20 text-indigo-400',
  screening: 'bg-blue-500/20 text-blue-400',
  interview: 'bg-violet-500/20 text-violet-400',
  offer: 'bg-emerald-500/20 text-emerald-400',
  hired: 'bg-green-500/20 text-green-400',
}

export function ExtensionJobHistory() {
  const { user } = useAuth()
  const { language } = useLanguage()
  const isRTL = language === 'he'

  const [jobs, setJobs] = useState<ExtensionJob[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string>('all')

  useEffect(() => {
    if (!user?.id) return

    async function fetchJobs() {
      // Get all extension-sourced jobs (created by this user or shared)
      const { data: jobsData } = await (supabase
        .from('jobs') as any)
        .select('id, title, company_name, location, source_url, external_source, external_id, created_at')
        .not('external_source', 'is', null)
        .or(`created_by.eq.${user!.id},shared_by_user_id.eq.${user!.id}`)
        .order('created_at', { ascending: false })
        .limit(200)

      if (!jobsData) { setLoading(false); return }

      // Get applications for these jobs to show status
      const jobIds = (jobsData as any[]).map((j: any) => j.id)
      let appsMap: Record<string, { stage: string; score: number | null }> = {}

      if (jobIds.length > 0) {
        const { data: appsData } = await supabase
          .from('applications')
          .select('job_id, current_stage, match_score')
          .eq('candidate_id', user!.id)
          .in('job_id', jobIds)

        if (appsData) {
          for (const app of appsData as any[]) {
            if (app.job_id) {
              appsMap[app.job_id] = { stage: app.current_stage, score: app.match_score }
            }
          }
        }
      }

      const merged: ExtensionJob[] = (jobsData as any[]).map((j: any) => ({
        id: j.id,
        title: j.title,
        company_name: j.company_name,
        location: j.location,
        source_url: j.source_url,
        external_source: j.external_source,
        external_id: j.external_id,
        created_at: j.created_at,
        application_stage: appsMap[j.id]?.stage ?? null,
        match_score: appsMap[j.id]?.score ?? null,
      }))

      setJobs(merged)
      setLoading(false)
    }

    fetchJobs()

    // Real-time: new jobs inserted by extension
    const channel = supabase
      .channel(`ext-jobs-rt-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'jobs' },
        () => { fetchJobs() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user?.id])

  // Collect available sources for filter
  const availableSources = useMemo(() => {
    const set = new Set<string>()
    for (const j of jobs) {
      if (j.external_source) set.add(j.external_source)
    }
    return Array.from(set)
  }, [jobs])

  // Filter & search
  const filtered = useMemo(() => {
    let result = jobs
    if (sourceFilter !== 'all') {
      result = result.filter(j => j.external_source === sourceFilter)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(j =>
        j.title?.toLowerCase().includes(q) ||
        j.company_name?.toLowerCase().includes(q)
      )
    }
    return result
  }, [jobs, sourceFilter, search])

  // Stats
  const stats = useMemo(() => {
    const total = jobs.length
    const viewed = jobs.filter(j => j.application_stage === 'viewed').length
    const applied = jobs.filter(j => j.application_stage && j.application_stage !== 'viewed').length
    return { total, viewed, applied }
  }, [jobs])

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(isRTL ? 'he-IL' : 'en-US', {
      day: 'numeric', month: 'short',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-36 gap-2 text-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <History className="w-8 h-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          {isRTL ? 'אין משרות מהתוסף עדיין' : 'No extension jobs yet'}
        </p>
        <p className="text-xs text-muted-foreground/60 max-w-xs">
          {isRTL
            ? 'משרות שתצפה בהן דרך תוסף PLUG יופיעו כאן'
            : 'Jobs you view via the PLUG extension will appear here'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Stats row */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="outline" className="text-xs gap-1">
          {isRTL ? 'סה"כ' : 'Total'}: {stats.total}
        </Badge>
        <Badge variant="outline" className="text-xs gap-1 text-slate-400">
          <Eye className="w-3 h-3" />
          {isRTL ? 'נצפו' : 'Viewed'}: {stats.viewed}
        </Badge>
        <Badge variant="outline" className="text-xs gap-1 text-indigo-400">
          <CheckCircle2 className="w-3 h-3" />
          {isRTL ? 'הוגשו' : 'Applied'}: {stats.applied}
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={isRTL ? 'חיפוש משרה או חברה...' : 'Search job or company...'}
            className="ps-8 h-8 text-sm"
          />
        </div>
        {availableSources.length > 1 && (
          <div className="flex gap-1">
            <button
              onClick={() => setSourceFilter('all')}
              className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                sourceFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {isRTL ? 'הכל' : 'All'}
            </button>
            {availableSources.map(src => (
              <button
                key={src}
                onClick={() => setSourceFilter(src === sourceFilter ? 'all' : src)}
                className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                  sourceFilter === src ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {SOURCE_LABEL[src] || src}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Job list */}
      <div className="flex flex-col gap-2">
        {filtered.map((job) => {
          const stage = job.application_stage
          const stageLabel = stage
            ? (isRTL ? STAGE_LABEL_HE[stage] : STAGE_LABEL_EN[stage]) || stage
            : null

          return (
            <div
              key={job.id}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-card transition-colors ${
                stage && stage !== 'viewed' ? 'border-indigo-500/20' : 'hover:bg-accent/20'
              }`}
            >
              {/* Match score or icon */}
              {job.match_score ? (
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary">{job.match_score}%</span>
                </div>
              ) : (
                <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              )}

              {/* Job info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {job.title || (isRTL ? 'משרה לא ידועה' : 'Unknown job')}
                </p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {job.company_name && (
                    <span className="text-xs text-muted-foreground truncate">{job.company_name}</span>
                  )}
                  {job.location && (
                    <span className="text-[10px] text-muted-foreground/60 truncate">{job.location}</span>
                  )}
                </div>
              </div>

              {/* Status & meta */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {stageLabel && (
                  <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-4 ${STAGE_COLOR[stage!] || ''}`}>
                    {stageLabel}
                  </Badge>
                )}
                {job.external_source && SOURCE_LABEL[job.external_source] && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                    {SOURCE_LABEL[job.external_source]}
                  </Badge>
                )}
                <span className="text-[10px] text-muted-foreground hidden sm:block">
                  {formatDate(job.created_at)}
                </span>
                {job.source_url && (
                  <a
                    href={job.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                    title={isRTL ? 'פתח משרה' : 'Open job'}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && search.trim() && (
        <p className="text-sm text-muted-foreground text-center py-4">
          {isRTL ? 'לא נמצאו תוצאות' : 'No results found'}
        </p>
      )}
    </div>
  )
}
