import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { ExternalLink, History, Building2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface JobHistoryRow {
  id: string
  url: string
  title: string | null
  company: string | null
  source: string | null
  created_at: string
}

const SOURCE_LABEL: Record<string, string> = {
  alljobs: 'AllJobs',
  linkedin: 'LinkedIn',
}

export function ExtensionJobHistory() {
  const { user } = useAuth()
  const { language } = useLanguage()
  const isRTL = language === 'he'

  const [rows, setRows] = useState<JobHistoryRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return

    supabase
      .from('job_history')
      .select('id, url, title, company, source, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setRows((data as JobHistoryRow[]) ?? [])
        setLoading(false)
      })

    // Real-time: append new rows as the extension browses jobs
    const channel = supabase
      .channel(`job-history-rt-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'job_history', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setRows((prev) => [payload.new as JobHistoryRow, ...prev].slice(0, 50))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user?.id])

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(isRTL ? 'he-IL' : 'en-US', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-36 gap-2 text-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <History className="w-8 h-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          {isRTL ? 'אין היסטוריית משרות עדיין' : 'No job history yet'}
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
    <div className="flex flex-col gap-2" dir={isRTL ? 'rtl' : 'ltr'}>
      {rows.map((row) => (
        <div
          key={row.id}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-card hover:bg-accent/20 transition-colors"
        >
          <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{row.title || (isRTL ? 'משרה לא ידועה' : 'Unknown job')}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {row.company && (
                <span className="text-xs text-muted-foreground truncate">{row.company}</span>
              )}
              {row.source && SOURCE_LABEL[row.source] && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                  {SOURCE_LABEL[row.source]}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[11px] text-muted-foreground hidden sm:block">{formatDate(row.created_at)}</span>
            <a
              href={row.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
              title={isRTL ? 'פתח משרה' : 'Open job'}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}
