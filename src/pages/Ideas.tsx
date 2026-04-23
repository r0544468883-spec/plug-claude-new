import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { FeatureRequestCard } from '@/components/ideas/FeatureRequestCard';
import { FeatureRequestForm } from '@/components/ideas/FeatureRequestForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SYSTEM_AREAS, REQUEST_STATUSES } from '@/lib/feature-badges';
import { ArrowLeft, ArrowRight, Lightbulb, Plus, Search, Rocket, TrendingUp, FileText, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type Tab = 'all' | 'mine' | 'top' | 'shipped';

export default function Ideas() {
  const { language, direction } = useLanguage();
  const isHe = language === 'he';
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'most_voted'>('newest');
  const [requests, setRequests] = useState<any[]>([]);
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showBanner, setShowBanner] = useState(() => !localStorage.getItem('ideas_banner_dismissed'));

  // Stats
  const [stats, setStats] = useState({ total: 0, shipped: 0, mine: 0 });

  const BackIcon = direction === 'rtl' ? ArrowRight : ArrowLeft;

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      let query = (supabase.from('feature_requests') as any)
        .select('*, profiles:author_id(full_name)')
        .eq('is_active', true);

      // Tab filters
      if (tab === 'mine' && user) {
        query = query.eq('author_id', user.id);
      } else if (tab === 'shipped') {
        query = query.eq('status', 'shipped');
      }

      // Area filter
      if (areaFilter !== 'all') {
        query = query.eq('system_area', areaFilter);
      }

      // Status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Search
      if (search.trim()) {
        query = query.or(`title.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%`);
      }

      // Sort
      if (tab === 'top' || sortBy === 'most_voted') {
        query = query.order('votes_count', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      console.error('Fetch feature requests error:', err);
    }
    setLoading(false);
  }, [tab, areaFilter, statusFilter, search, sortBy, user]);

  const fetchVotes = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await (supabase.from('feature_request_votes') as any)
        .select('request_id')
        .eq('user_id', user.id);
      setUserVotes(new Set((data || []).map((v: any) => v.request_id)));
    } catch { /* ignore */ }
  }, [user]);

  const fetchStats = useCallback(async () => {
    try {
      const { count: total } = await (supabase.from('feature_requests') as any)
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);

      const { count: shipped } = await (supabase.from('feature_requests') as any)
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('status', 'shipped');

      let mine = 0;
      if (user) {
        const { count } = await (supabase.from('feature_requests') as any)
          .select('id', { count: 'exact', head: true })
          .eq('author_id', user.id);
        mine = count || 0;
      }

      setStats({ total: total || 0, shipped: shipped || 0, mine: mine || 0 });
    } catch { /* ignore */ }
  }, [user]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    fetchVotes();
    fetchStats();
  }, [fetchVotes, fetchStats]);

  const handleVoteChange = () => {
    fetchRequests();
    fetchVotes();
  };

  const handleSubmitted = () => {
    fetchRequests();
    fetchStats();
  };

  const tabs: { key: Tab; label: string; icon: typeof FileText }[] = [
    { key: 'all', label: isHe ? 'כל הרעיונות' : 'All Ideas', icon: Lightbulb },
    { key: 'mine', label: isHe ? 'הרעיונות שלי' : 'My Ideas', icon: FileText },
    { key: 'top', label: isHe ? 'הכי מבוקשים' : 'Top Voted', icon: TrendingUp },
    { key: 'shipped', label: isHe ? 'שוחררו!' : 'Shipped', icon: Rocket },
  ];

  const dismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem('ideas_banner_dismissed', '1');
  };

  return (
    <DashboardLayout currentSection="ideas" onSectionChange={() => {}}>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <BackIcon className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary" />
                {isHe ? 'לוח רעיונות' : 'Ideas Board'}
              </h1>
              <p className="text-xs text-muted-foreground">
                {isHe ? 'הציעו פיצ׳רים, הצביעו וצרו את העתיד של PLUG' : 'Suggest features, vote and shape the future of PLUG'}
              </p>
            </div>
          </div>
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            {isHe ? 'רעיון חדש' : 'New Idea'}
          </Button>
        </div>

        {/* Onboarding banner */}
        {showBanner && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 relative">
            <button onClick={dismissBanner} className="absolute top-2 end-2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
            <p className="text-sm font-medium text-primary">
              {isHe ? '💡 הגישו רעיון לפיצ׳ר וקבלו 5 קרדיטים + 10 XP!' : '💡 Submit a feature idea and earn 5 credits + 10 XP!'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isHe
                ? 'כל רעיון עובר בדיקה. אם הרעיון שלכם יתקבל — תקבלו תג "בעל חזון". אם הוא יצא לאוויר — תג "מייסד"!'
                : 'Every idea is reviewed. If your idea is planned — you get a "Visionary" badge. If it ships — a "Founder" badge!'}
            </p>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: isHe ? 'רעיונות' : 'Ideas', value: stats.total, icon: Lightbulb },
            { label: isHe ? 'שוחררו' : 'Shipped', value: stats.shipped, icon: Rocket },
            { label: isHe ? 'הרעיונות שלי' : 'My Ideas', value: stats.mine, icon: FileText },
          ].map((s, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-3 text-center">
              <s.icon className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                tab === t.key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={isHe ? 'חפש רעיונות...' : 'Search ideas...'}
              className="ps-9 h-9 text-sm"
            />
          </div>
          <Select value={areaFilter} onValueChange={setAreaFilter}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue placeholder={isHe ? 'איזור' : 'Area'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isHe ? 'כל האזורים' : 'All Areas'}</SelectItem>
              {Object.entries(SYSTEM_AREAS).map(([key, val]) => (
                <SelectItem key={key} value={key}>{val[isHe ? 'he' : 'en']}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue placeholder={isHe ? 'סטטוס' : 'Status'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isHe ? 'כל הסטטוסים' : 'All Statuses'}</SelectItem>
              {Object.entries(REQUEST_STATUSES).map(([key, val]) => (
                <SelectItem key={key} value={key}>{val[isHe ? 'he' : 'en']}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {tab !== 'top' && (
            <Select value={sortBy} onValueChange={v => setSortBy(v as any)}>
              <SelectTrigger className="w-[140px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{isHe ? 'חדש ביותר' : 'Newest'}</SelectItem>
                <SelectItem value="most_voted">{isHe ? 'הכי מבוקש' : 'Most Voted'}</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-28 w-full rounded-lg" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16">
            <Lightbulb className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              {tab === 'mine'
                ? (isHe ? 'עוד לא הגשת רעיונות' : "You haven't submitted any ideas yet")
                : tab === 'shipped'
                ? (isHe ? 'עוד לא שוחררו רעיונות' : 'No shipped ideas yet')
                : search
                ? (isHe ? 'לא נמצאו תוצאות' : 'No results found')
                : (isHe ? 'היו הראשונים להציע רעיון!' : 'Be the first to suggest an idea!')}
            </p>
            {tab !== 'mine' && !search && (
              <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4" />
                {isHe ? 'הגש רעיון' : 'Submit Idea'}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(req => (
              <FeatureRequestCard
                key={req.id}
                request={req}
                hasVoted={userVotes.has(req.id)}
                onVoteChange={handleVoteChange}
              />
            ))}
          </div>
        )}

        {/* Form dialog */}
        <FeatureRequestForm
          open={showForm}
          onOpenChange={setShowForm}
          onSubmitted={handleSubmitted}
        />
      </div>
    </DashboardLayout>
  );
}
