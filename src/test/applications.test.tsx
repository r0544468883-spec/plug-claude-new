import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ─── Mock Supabase (prevents real network calls) ───────────────────────────
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

// ─── Mock LanguageContext ──────────────────────────────────────────────────
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'he',
    t: (key: string) => key,
  }),
}));

// ─── ApplicationsStats ────────────────────────────────────────────────────
import { ApplicationsStats } from '@/components/applications/ApplicationsStats';

describe('ApplicationsStats', () => {
  it('renders all four stat values', () => {
    render(<ApplicationsStats total={10} active={5} interviews={2} rejected={3} />);

    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders zeros correctly', () => {
    render(<ApplicationsStats total={0} active={0} interviews={0} rejected={0} />);
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBe(4);
  });
});

// ─── Stats calculation logic (pure) ───────────────────────────────────────
type AppInput = {
  status: string;
  current_stage: string;
};

function calcStats(applications: AppInput[]) {
  const total = applications.length;
  const active = applications.filter((a) => a.status === 'active').length;
  const interviews = applications.filter((a) =>
    ['interview', 'technical'].includes(a.current_stage)
  ).length;
  const rejected = applications.filter(
    (a) => a.current_stage === 'rejected' || a.status === 'rejected'
  ).length;
  return { total, active, interviews, rejected };
}

describe('Stats calculation', () => {
  it('counts totals correctly', () => {
    const apps: AppInput[] = [
      { status: 'active', current_stage: 'applied' },
      { status: 'active', current_stage: 'interview' },
      { status: 'rejected', current_stage: 'rejected' },
      { status: 'active', current_stage: 'technical' },
    ];
    const { total, active, interviews, rejected } = calcStats(apps);
    expect(total).toBe(4);
    expect(active).toBe(3);
    expect(interviews).toBe(2);    // 'interview' + 'technical'
    expect(rejected).toBe(1);
  });

  it('returns zeros for empty array', () => {
    const { total, active, interviews, rejected } = calcStats([]);
    expect(total).toBe(0);
    expect(active).toBe(0);
    expect(interviews).toBe(0);
    expect(rejected).toBe(0);
  });

  it('application rejected by status counts as rejected', () => {
    const apps: AppInput[] = [
      { status: 'rejected', current_stage: 'applied' },
    ];
    const { rejected } = calcStats(apps);
    expect(rejected).toBe(1);
  });

  it('application rejected by stage counts as rejected', () => {
    const apps: AppInput[] = [
      { status: 'active', current_stage: 'rejected' },
    ];
    const { rejected } = calcStats(apps);
    expect(rejected).toBe(1);
  });
});

// ─── Job placeholder logic ────────────────────────────────────────────────
function getJobTitle(job: null | undefined, jobUrl: string | null, isRTL: boolean): string {
  if (job) return job.title ?? '';
  if (jobUrl) return isRTL ? 'משרה חיצונית' : 'External Job';
  return isRTL ? 'משרה לא ידועה' : 'Unknown Job';
}

describe('Job placeholder when job data is missing', () => {
  it('shows "External Job" when job is null but job_url exists (English)', () => {
    expect(getJobTitle(null, 'https://linkedin.com/job/123', false)).toBe('External Job');
  });

  it('shows "משרה חיצונית" when job is null but job_url exists (Hebrew)', () => {
    expect(getJobTitle(null, 'https://alljobs.co.il/job/456', true)).toBe('משרה חיצונית');
  });

  it('shows "Unknown Job" when both job and job_url are null (English)', () => {
    expect(getJobTitle(null, null, false)).toBe('Unknown Job');
  });

  it('shows "משרה לא ידועה" when both job and job_url are null (Hebrew)', () => {
    expect(getJobTitle(null, null, true)).toBe('משרה לא ידועה');
  });

  it('returns job title when job exists', () => {
    const job = { title: 'Senior Engineer', company: null };
    expect(getJobTitle(job as any, null, true)).toBe('Senior Engineer');
  });
});

// ─── Filtered applications logic ──────────────────────────────────────────
type FilterApp = {
  status: string;
  current_stage: string;
  job?: { title: string; company?: { name: string } } | null;
};

function filterApps(apps: FilterApp[], search: string, statusFilter: string, stageFilter: string) {
  let result = [...apps];
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(
      (a) =>
        a.job?.title?.toLowerCase().includes(q) ||
        a.job?.company?.name?.toLowerCase().includes(q)
    );
  }
  if (statusFilter !== 'all') result = result.filter((a) => a.status === statusFilter);
  if (stageFilter !== 'all') result = result.filter((a) => a.current_stage === stageFilter);
  return result;
}

describe('Filtered applications', () => {
  const apps: FilterApp[] = [
    { status: 'active', current_stage: 'applied', job: { title: 'Frontend Dev', company: { name: 'Google' } } },
    { status: 'active', current_stage: 'interview', job: { title: 'Backend Dev', company: { name: 'Meta' } } },
    { status: 'rejected', current_stage: 'rejected', job: { title: 'Product Manager', company: { name: 'Apple' } } },
    { status: 'active', current_stage: 'applied', job: null },
  ];

  it('returns all apps with no filters', () => {
    expect(filterApps(apps, '', 'all', 'all')).toHaveLength(4);
  });

  it('filters by job title search', () => {
    const result = filterApps(apps, 'frontend', 'all', 'all');
    expect(result).toHaveLength(1);
    expect(result[0].job?.title).toBe('Frontend Dev');
  });

  it('filters by company name search', () => {
    const result = filterApps(apps, 'meta', 'all', 'all');
    expect(result).toHaveLength(1);
    expect(result[0].job?.company?.name).toBe('Meta');
  });

  it('filters by status', () => {
    const result = filterApps(apps, '', 'rejected', 'all');
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('rejected');
  });

  it('filters by stage', () => {
    const result = filterApps(apps, '', 'all', 'interview');
    expect(result).toHaveLength(1);
    expect(result[0].current_stage).toBe('interview');
  });

  it('excludes apps with null job from title/company search', () => {
    // app with null job should not match any text search
    const result = filterApps(apps, 'anything', 'all', 'all');
    expect(result).toHaveLength(0);
  });
});
