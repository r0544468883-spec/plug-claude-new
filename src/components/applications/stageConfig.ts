/**
 * Shared stage configuration for applications pipeline.
 * Used by: Pipeline UI, VerticalApplicationCard, ApplicationsStatsPanel, Filters.
 *
 * Stage order matters — it determines the pipeline progression.
 * Terminal stages (rejected/withdrawn) are excluded from the pipeline display.
 */

export interface StageDefinition {
  slug: string;
  he: string;
  en: string;
  group: 'application' | 'screening' | 'interview' | 'assignment' | 'final' | 'terminal';
  color: string;        // Tailwind badge class
  chartColor: string;   // Hex for recharts
  /** Numeric order for funnel/sort — higher = further in the process */
  order: number;
}

export const STAGES: StageDefinition[] = [
  // ── Application ──
  { slug: 'applied',            he: 'הגשתי',            en: 'Applied',            group: 'application', color: 'bg-secondary text-secondary-foreground',  chartColor: '#6366f1', order: 0 },

  // ── Screening ──
  { slug: 'screening',          he: 'סינון',             en: 'Screening',          group: 'screening',   color: 'bg-blue-500/20 text-blue-400',           chartColor: '#3b82f6', order: 1 },
  { slug: 'phone_screen',       he: 'ראיון טלפוני',      en: 'Phone Screen',       group: 'screening',   color: 'bg-blue-500/20 text-blue-400',           chartColor: '#60a5fa', order: 2 },

  // ── Interviews ──
  { slug: 'hr_interview',       he: 'ראיון HR',          en: 'HR Interview',       group: 'interview',   color: 'bg-accent/20 text-accent',               chartColor: '#8b5cf6', order: 3 },
  { slug: 'technical',          he: 'ראיון טכני',        en: 'Technical',          group: 'interview',   color: 'bg-accent/20 text-accent',               chartColor: '#a78bfa', order: 4 },
  { slug: 'interview',          he: 'ראיון',             en: 'Interview',          group: 'interview',   color: 'bg-accent/20 text-accent',               chartColor: '#7c3aed', order: 5 },
  { slug: 'manager_interview',  he: 'ראיון מנהל',        en: 'Manager Interview',  group: 'interview',   color: 'bg-violet-500/20 text-violet-400',       chartColor: '#c084fc', order: 6 },
  { slug: 'team_interview',     he: 'ראיון צוות',        en: 'Team Interview',     group: 'interview',   color: 'bg-violet-500/20 text-violet-400',       chartColor: '#ddd6fe', order: 7 },
  { slug: 'ceo_interview',      he: 'ראיון מנכ"ל',       en: 'CEO Interview',      group: 'interview',   color: 'bg-purple-500/20 text-purple-400',       chartColor: '#e879f9', order: 8 },

  // ── Assignments ──
  { slug: 'home_assignment',    he: 'מטלת בית',          en: 'Home Assignment',    group: 'assignment',  color: 'bg-orange-500/20 text-orange-400',       chartColor: '#f97316', order: 9 },
  { slug: 'second_assignment',  he: 'מטלה נוספת',        en: '2nd Assignment',     group: 'assignment',  color: 'bg-orange-500/20 text-orange-400',       chartColor: '#fb923c', order: 10 },

  // ── Final ──
  { slug: 'offer',              he: 'הצעה',              en: 'Offer',              group: 'final',       color: 'bg-primary/20 text-primary',             chartColor: '#10b981', order: 11 },
  { slug: 'hired',              he: 'התקבלתי',           en: 'Hired',              group: 'final',       color: 'bg-emerald-500/20 text-emerald-400',     chartColor: '#06b6d4', order: 12 },

  // ── Terminal (not shown in pipeline) ──
  { slug: 'rejected',           he: 'נדחה',              en: 'Rejected',           group: 'terminal',    color: 'bg-destructive/20 text-destructive',     chartColor: '#ef4444', order: -1 },
  { slug: 'withdrawn',          he: 'נמשך',              en: 'Withdrawn',          group: 'terminal',    color: 'bg-muted text-muted-foreground',         chartColor: '#6b7280', order: -2 },
];

/** Stages shown in the pipeline UI (excludes terminal) */
export const PIPELINE_STAGES = STAGES.filter(s => s.group !== 'terminal');

/** All stages as a lookup map by slug */
export const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.slug, s])) as Record<string, StageDefinition>;

/** Get stage definition with fallback to 'applied' */
export function getStage(slug: string | null | undefined): StageDefinition {
  return STAGE_MAP[slug || 'applied'] || STAGE_MAP.applied;
}

/**
 * Stage groups for statistics aggregation.
 * A user "reached" a group if their current_stage is at or beyond that group's order.
 */
export const STAT_GROUPS = [
  { key: 'applied',    he: 'הגשה',     en: 'Applied',     minOrder: 0 },
  { key: 'screening',  he: 'סינון',    en: 'Screening',   minOrder: 1 },
  { key: 'interview',  he: 'ראיונות',  en: 'Interviews',  minOrder: 3 },
  { key: 'assignment', he: 'מטלות',    en: 'Assignments',  minOrder: 9 },
  { key: 'offer',      he: 'הצעה',     en: 'Offer',       minOrder: 11 },
  { key: 'hired',      he: 'התקבלתי',  en: 'Hired',       minOrder: 12 },
] as const;
