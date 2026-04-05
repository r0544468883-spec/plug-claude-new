import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/Header';
import { Loader2, Plus, ClipboardList, ArrowLeft, ArrowRight, Search, Sparkles, BookOpen, Send, Info, X, Bookmark } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AssignmentCard } from '@/components/assignments/AssignmentCard';
import { CreateAssignmentDialog } from '@/components/assignments/CreateAssignmentDialog';
import { SubmitSolutionDialog } from '@/components/assignments/SubmitSolutionDialog';
import { SubmissionsViewDialog } from '@/components/assignments/SubmissionsViewDialog';
import { RequestAccessDialog } from '@/components/assignments/RequestAccessDialog';
import { useNavigate } from 'react-router-dom';
import type { AssignmentTemplate, AssignmentSubmission } from '@/components/assignments/AssignmentCard';

type TabId = 'all' | 'my-submissions' | 'my-posts' | 'favorites';

export default function Assignments() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const navigate = useNavigate();

  const [tab, setTab] = useState<TabId>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [posterFilter, setPosterFilter] = useState<string>('all');
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'match' | 'deadline'>('newest');
  const [search, setSearch] = useState('');

  const [templates, setTemplates] = useState<AssignmentTemplate[]>([]);
  const [mySubmissions, setMySubmissions] = useState<Map<string, AssignmentSubmission>>(new Map());
  const [submissionCounts, setSubmissionCounts] = useState<Map<string, number>>(new Map());
  const [myAccessRequests, setMyAccessRequests] = useState<Map<string, 'pending' | 'approved' | 'rejected'>>(new Map());
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('plug_assignment_favorites') || '[]')); } catch { return new Set(); }
  });
  const [myLikes, setMyLikes] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('plug_assignment_likes') || '[]')); } catch { return new Set(); }
  });
  const [likeCounts, setLikeCounts] = useState<Map<string, number>>(new Map());
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showOnboarding, setShowOnboarding] = useState(() => {
    try { return localStorage.getItem('plug_assignments_onboarding_dismissed') !== 'true'; } catch { return true; }
  });
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<AssignmentTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AssignmentTemplate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [submitTarget, setSubmitTarget] = useState<AssignmentTemplate | null>(null);
  const [viewTarget, setViewTarget] = useState<AssignmentTemplate | null>(null);
  const [requestTarget, setRequestTarget] = useState<AssignmentTemplate | null>(null);

  // Fetch user skills from profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('cv_data')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        const skills: string[] = [
          ...((data?.cv_data as any)?.skills?.technical ?? []),
          ...((data?.cv_data as any)?.skills?.soft ?? []),
        ].filter(Boolean);
        setUserSkills(skills);
      });
  }, [user]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('assignment_templates' as any)
        .select('*')
        .eq('is_active', true);

      if (difficultyFilter !== 'all') query = query.eq('difficulty', difficultyFilter);
      if (sortBy === 'popular') {
        query = query.order('view_count', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data: tmplData, error: tmplError } = await query;
      if (tmplError) { console.error('Fetch templates error:', tmplError); }
      const allFetched = (tmplData as AssignmentTemplate[]) ?? [];

      // Fetch profiles for all creators
      const creatorIds = [...new Set(allFetched.map(t => t.created_by))];
      let profilesMap = new Map<string, any>();
      if (creatorIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, visible_to_hr, role')
          .in('id', creatorIds);
        (profilesData ?? []).forEach((p: any) => profilesMap.set(p.id, p));
      }

      // Attach profiles to templates
      const withProfiles = allFetched.map(t => ({
        ...t,
        profiles: profilesMap.get(t.created_by) ?? null,
      }));

      // Client-side visibility filter: hide assignments from non-visible job seekers
      const tmpl = withProfiles.filter(t => {
        if (t.created_by === user?.id) return true;
        const poster = t.profiles as any;
        if (poster?.role && poster.role !== 'job_seeker') return true;
        return poster?.visible_to_hr === true;
      });

      setTemplates(tmpl);

      if (user && tmpl.length > 0) {
        const ids = tmpl.map(t => t.id);

        // My submissions
        const { data: subData } = await supabase
          .from('assignment_submissions' as any)
          .select('*')
          .eq('submitted_by', user.id)
          .in('template_id', ids);

        const subMap = new Map<string, AssignmentSubmission>();
        ((subData as AssignmentSubmission[]) ?? []).forEach(s => subMap.set(s.template_id, s));
        setMySubmissions(subMap);

        // My access requests
        const { data: reqData } = await supabase
          .from('assignment_access_requests' as any)
          .select('template_id, status')
          .eq('requester_id', user.id)
          .in('template_id', ids);

        const reqMap = new Map<string, 'pending' | 'approved' | 'rejected'>();
        ((reqData as any[]) ?? []).forEach(r => reqMap.set(r.template_id, r.status));
        setMyAccessRequests(reqMap);

        // Submission counts for my templates
        const myTemplateIds = tmpl.filter(t => t.created_by === user.id).map(t => t.id);
        if (myTemplateIds.length > 0) {
          const { data: countData } = await supabase
            .from('assignment_submissions' as any)
            .select('template_id')
            .in('template_id', myTemplateIds);

          const countMap = new Map<string, number>();
          ((countData as { template_id: string }[]) ?? []).forEach(r => {
            countMap.set(r.template_id, (countMap.get(r.template_id) ?? 0) + 1);
          });
          setSubmissionCounts(countMap);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, difficultyFilter, sortBy]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const incrementViewCount = async (templateId: string) => {
    await supabase
      .from('assignment_templates' as any)
      .update({ view_count: templates.find(t => t.id === templateId)!.view_count + 1 })
      .eq('id', templateId);
    setTemplates(prev => prev.map(t => t.id === templateId ? { ...t, view_count: t.view_count + 1 } : t));
  };

  const handleSubmit = (template: AssignmentTemplate) => {
    setSubmitTarget(template);
    incrementViewCount(template.id);
  };

  const handleViewSubmissions = (template: AssignmentTemplate) => {
    setViewTarget(template);
  };

  const handleRequestAccess = (template: AssignmentTemplate) => {
    setRequestTarget(template);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('assignment_templates' as any)
        .update({ is_active: false })
        .eq('id', deleteTarget.id);
      if (error) throw error;
      toast.success(isHebrew ? 'המטלה נמחקה' : 'Assignment deleted');
      setTemplates(prev => prev.filter(t => t.id !== deleteTarget.id));
    } catch {
      toast.error(isHebrew ? 'שגיאה במחיקת המטלה' : 'Failed to delete assignment');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const toggleFavorite = (templateId: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(templateId)) { next.delete(templateId); } else { next.add(templateId); }
      try { localStorage.setItem('plug_assignment_favorites', JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const toggleLike = (templateId: string) => {
    setMyLikes(prev => {
      const next = new Set(prev);
      const wasLiked = next.has(templateId);
      if (wasLiked) { next.delete(templateId); } else { next.add(templateId); }
      try { localStorage.setItem('plug_assignment_likes', JSON.stringify([...next])); } catch {}
      // Update count
      setLikeCounts(prevCounts => {
        const map = new Map(prevCounts);
        const current = map.get(templateId) ?? 0;
        map.set(templateId, wasLiked ? Math.max(0, current - 1) : current + 1);
        return map;
      });
      return next;
    });
  };

  const handleAccessRequested = (templateId: string) => {
    setMyAccessRequests(prev => new Map(prev).set(templateId, 'pending'));
  };

  // Dynamic tags (top 12 by frequency)
  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    templates.forEach(t => ((t as any).tags ?? []).forEach((tag: string) =>
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    ));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(e => e[0]);
  }, [templates]);

  // Unique poster names for filter
  const allPosters = useMemo(() => {
    const names = new Set<string>();
    templates.forEach(t => {
      const name = (t.profiles as any)?.full_name;
      if (name) names.add(name);
    });
    return [...names].sort();
  }, [templates]);

  // Match score: % of user skills that appear in assignment tags
  const calcMatchScore = useCallback((template: AssignmentTemplate): number => {
    if (userSkills.length === 0) return 0;
    const tags: string[] = ((template as any).tags ?? []).map((t: string) => t.toLowerCase());
    if (tags.length === 0) return 0;
    const matches = userSkills.filter(s => tags.includes(s.toLowerCase())).length;
    return Math.min(100, Math.round((matches / userSkills.length) * 100));
  }, [userSkills]);

  // Recommended: templates whose tags match user's skills
  const recommended = useMemo(() => {
    if (!user || userSkills.length === 0) return [];
    return templates.filter(t =>
      ((t as any).tags ?? []).some((tag: string) =>
        userSkills.some(s => s.toLowerCase() === tag.toLowerCase())
      )
    ).slice(0, 3);
  }, [templates, userSkills, user]);

  // Filtered & searched templates
  const displayedTemplates = useMemo(() => {
    const filtered = templates.filter(t => {
      if (tab === 'my-submissions') return mySubmissions.has(t.id);
      if (tab === 'my-posts') return t.created_by === user?.id;
      if (tab === 'favorites') return favorites.has(t.id);
      return true;
    }).filter(t =>
      posterFilter === 'all' || (t.profiles as any)?.full_name === posterFilter
    ).filter(t =>
      domainFilter === 'all' || (t as any).domain === domainFilter
    ).filter(t => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        ((t as any).tags ?? []).some((tag: string) => tag.toLowerCase().includes(q)) ||
        ((t as any).company_name ?? '').toLowerCase().includes(q)
      );
    });

    // Client-side sorting for match/deadline
    if (sortBy === 'match') {
      return [...filtered].sort((a, b) => calcMatchScore(b) - calcMatchScore(a));
    }
    if (sortBy === 'deadline') {
      return [...filtered].sort((a, b) => {
        const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const db = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        return da - db;
      });
    }
    return filtered;
  }, [templates, tab, mySubmissions, favorites, user, posterFilter, domainFilter, search, sortBy, calcMatchScore]);

  const myPostsCount = templates.filter(t => t.created_by === user?.id).length;
  const mySubsCount = user ? templates.filter(t => mySubmissions.has(t.id)).length : 0;
  const favCount = templates.filter(t => favorites.has(t.id)).length;

  return (
    <div className="min-h-screen bg-background" dir={isHebrew ? 'rtl' : 'ltr'}>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">

        {/* Page header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="gap-1 text-muted-foreground hover:text-foreground"
            >
              {isHebrew ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
              {isHebrew ? 'חזרה' : 'Back'}
            </Button>
            <ClipboardList className="w-7 h-7 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">{isHebrew ? 'לוח המטלות' : 'Assignments'}</h1>
              <p className="text-sm text-muted-foreground">
                {isHebrew ? 'הוכח את כישוריך עם אתגרים אמיתיים' : 'Prove your skills with real challenges'}
              </p>
            </div>
          </div>
          {user && (
            <Button onClick={() => setShowCreate(true)} className="gap-2 flex-shrink-0">
              <Plus className="w-4 h-4" />
              {isHebrew ? 'פרסם מטלה' : 'Post Assignment'}
            </Button>
          )}
        </div>

        {/* Onboarding banner */}
        {showOnboarding && (
          <div className="relative rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
            <button
              onClick={() => { setShowOnboarding(false); try { localStorage.setItem('plug_assignments_onboarding_dismissed', 'true'); } catch {} }}
              className="absolute top-3 end-3 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-primary flex-shrink-0" />
              <h2 className="font-semibold text-sm">
                {isHebrew ? 'ברוכים הבאים ללוח המטלות!' : 'Welcome to the Assignments Board!'}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {isHebrew
                ? 'כאן חברות ומגייסים מפרסמים מטלות טכניות — ואתם יכולים להגיש פתרונות כדי להוכיח את הכישורים שלכם. זו הדרך הטובה ביותר להתבלט מול מגייסים ולהשיג את העבודה הבאה שלכם.'
                : 'Companies and recruiters post technical challenges here — and you can submit solutions to prove your skills. This is the best way to stand out to recruiters and land your next job.'}
            </p>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-1">
              <span>
                {isHebrew ? '📋 חפשו מטלות שמתאימות לכישורים שלכם' : '📋 Find assignments that match your skills'}
              </span>
              <span>
                {isHebrew ? '📤 הגישו פתרונות ותבלטו' : '📤 Submit solutions and stand out'}
              </span>
              <span>
                {isHebrew ? '🏢 חברות? פרסמו מטלות כדי למצוא מועמדים' : '🏢 Companies? Post challenges to find talent'}
              </span>
            </div>
          </div>
        )}

        {/* Recommended section */}
        {tab === 'all' && recommended.length > 0 && !search && posterFilter === 'all' && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold flex items-center gap-1.5 text-primary">
              <Sparkles className="w-4 h-4" />
              {isHebrew ? 'מומלץ לך' : 'Recommended for you'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {recommended.map(template => (
                <AssignmentCard
                  key={template.id}
                  template={template}
                  mySubmission={mySubmissions.get(template.id) ?? null}
                  isOwner={template.created_by === user?.id}
                  submissionsCount={submissionCounts.get(template.id) ?? 0}
                  myAccessRequest={myAccessRequests.get(template.id) ?? null}
                  matchScore={calcMatchScore(template)}
                  onSubmit={handleSubmit}
                  onViewSubmissions={handleViewSubmissions}
                  onRequestAccess={handleRequestAccess}
                  onEdit={setEditTarget}
                  onDelete={setDeleteTarget}
                  isFavorite={favorites.has(template.id)}
                  onToggleFavorite={toggleFavorite}
                  isLiked={myLikes.has(template.id)}
                  likesCount={likeCounts.get(template.id) ?? 0}
                  onToggleLike={toggleLike}
                />
              ))}
            </div>
            <div className="border-b border-dashed" />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b">
          {([
            { id: 'all', label: isHebrew ? 'כל המטלות' : 'All Assignments', count: templates.length },
            ...(user ? [{ id: 'my-submissions', label: isHebrew ? 'הגשות שלי' : 'My Submissions', count: mySubsCount }] : []),
            ...(favCount > 0 ? [{ id: 'favorites', label: isHebrew ? 'שמורים' : 'Saved', count: favCount }] : []),
            ...(myPostsCount > 0 ? [{ id: 'my-posts', label: isHebrew ? 'פרסמתי' : 'Posted by Me', count: myPostsCount }] : []),
          ] as { id: TabId; label: string; count: number }[]).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 -mb-px ${
                tab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
              <Badge variant="secondary" className="h-5 px-1.5 text-[11px]">{t.count}</Badge>
            </button>
          ))}
        </div>

        {/* Search + Filters */}
        <div className="space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={isHebrew ? 'חפש לפי כותרת, חברה, תיאור או כישור...' : 'Search by title, company, description or skill...'}
              className="ps-9"
            />
          </div>

          {/* Tag chips + selects */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setTagFilter('all')}
              className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                tagFilter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-foreground'
              }`}
            >
              {isHebrew ? 'הכל' : 'All'}
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setTagFilter(tag === tagFilter ? 'all' : tag)}
                className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                  tagFilter === tag ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-foreground'
                }`}
              >
                {tag}
              </button>
            ))}

            <div className="ms-auto flex gap-2 flex-wrap">
              {/* Poster filter */}
              {allPosters.length > 0 && (
                <Select value={posterFilter} onValueChange={setPosterFilter}>
                  <SelectTrigger className="w-36 h-8 text-sm">
                    <SelectValue placeholder={isHebrew ? 'מפרסם' : 'Posted by'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isHebrew ? 'כל המפרסמים' : 'All posters'}</SelectItem>
                    {allPosters.map(name => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Select value={domainFilter} onValueChange={setDomainFilter}>
                <SelectTrigger className="w-36 h-8 text-sm">
                  <SelectValue placeholder={isHebrew ? 'תחום' : 'Domain'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isHebrew ? 'כל התחומים' : 'All Domains'}</SelectItem>
                  <SelectItem value="frontend">{isHebrew ? 'פרונטאנד' : 'Frontend'}</SelectItem>
                  <SelectItem value="backend">{isHebrew ? 'בקאנד' : 'Backend'}</SelectItem>
                  <SelectItem value="fullstack">{isHebrew ? 'פולסטאק' : 'Full Stack'}</SelectItem>
                  <SelectItem value="data">{isHebrew ? 'דאטה' : 'Data'}</SelectItem>
                  <SelectItem value="devops">{isHebrew ? 'דבאופס' : 'DevOps'}</SelectItem>
                  <SelectItem value="design">{isHebrew ? 'עיצוב' : 'Design'}</SelectItem>
                  <SelectItem value="product">{isHebrew ? 'מוצר' : 'Product'}</SelectItem>
                  <SelectItem value="mobile">{isHebrew ? 'מובייל' : 'Mobile'}</SelectItem>
                  <SelectItem value="qa">{isHebrew ? 'בדיקות' : 'QA'}</SelectItem>
                  <SelectItem value="security">{isHebrew ? 'אבטחה' : 'Security'}</SelectItem>
                  <SelectItem value="ai_ml">{isHebrew ? 'AI / למידת מכונה' : 'AI / ML'}</SelectItem>
                  <SelectItem value="blockchain">{isHebrew ? 'בלוקצ׳יין' : 'Blockchain'}</SelectItem>
                  <SelectItem value="embedded">{isHebrew ? 'מערכות משובצות' : 'Embedded'}</SelectItem>
                  <SelectItem value="gaming">{isHebrew ? 'גיימינג' : 'Gaming'}</SelectItem>
                  <SelectItem value="cloud">{isHebrew ? 'ענן' : 'Cloud'}</SelectItem>
                  <SelectItem value="marketing">{isHebrew ? 'שיווק' : 'Marketing'}</SelectItem>
                  <SelectItem value="hr">{isHebrew ? 'משאבי אנוש' : 'HR'}</SelectItem>
                  <SelectItem value="finance">{isHebrew ? 'פיננסים' : 'Finance'}</SelectItem>
                  <SelectItem value="other">{isHebrew ? 'אחר' : 'Other'}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger className="w-32 h-8 text-sm">
                  <SelectValue placeholder={isHebrew ? 'קושי' : 'Difficulty'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isHebrew ? 'כל הרמות' : 'All Levels'}</SelectItem>
                  <SelectItem value="easy">{isHebrew ? 'קל' : 'Easy'}</SelectItem>
                  <SelectItem value="medium">{isHebrew ? 'בינוני' : 'Medium'}</SelectItem>
                  <SelectItem value="hard">{isHebrew ? 'קשה' : 'Hard'}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <SelectTrigger className="w-32 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{isHebrew ? 'חדש ביותר' : 'Newest'}</SelectItem>
                  <SelectItem value="popular">{isHebrew ? 'פופולרי' : 'Popular'}</SelectItem>
                  {userSkills.length > 0 && (
                    <SelectItem value="match">{isHebrew ? 'התאמה' : 'Best Match'}</SelectItem>
                  )}
                  <SelectItem value="deadline">{isHebrew ? 'דדליין קרוב' : 'Deadline'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border p-5 space-y-3">
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-8 w-24 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : displayedTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            {tab === 'my-submissions' ? (
              <>
                <Send className="w-14 h-14 opacity-20" />
                <p className="text-lg font-medium">{isHebrew ? 'עדיין לא הגשת פתרונות' : 'No submissions yet'}</p>
                <p className="text-sm text-center max-w-xs">
                  {isHebrew
                    ? 'חפש מטלות שמתאימות לכישורים שלך והגש פתרונות כדי להוכיח את היכולות שלך'
                    : 'Find assignments that match your skills and submit solutions to showcase your abilities'}
                </p>
                <Button onClick={() => setTab('all')} variant="outline" className="gap-2 mt-2">
                  <Search className="w-4 h-4" />
                  {isHebrew ? 'חפש מטלות' : 'Browse Assignments'}
                </Button>
              </>
            ) : tab === 'favorites' ? (
              <>
                <Bookmark className="w-14 h-14 opacity-20" />
                <p className="text-lg font-medium">{isHebrew ? 'אין מטלות שמורות' : 'No saved assignments'}</p>
                <p className="text-sm text-center max-w-xs">
                  {isHebrew
                    ? 'לחץ על הכוכב בכרטיס מטלה כדי לשמור אותה לעתיד'
                    : 'Click the star on an assignment card to save it for later'}
                </p>
                <Button onClick={() => setTab('all')} variant="outline" className="gap-2 mt-2">
                  <Search className="w-4 h-4" />
                  {isHebrew ? 'חפש מטלות' : 'Browse Assignments'}
                </Button>
              </>
            ) : tab === 'my-posts' ? (
              <>
                <BookOpen className="w-14 h-14 opacity-20" />
                <p className="text-lg font-medium">{isHebrew ? 'לא פרסמת מטלות' : 'No posted assignments'}</p>
                <p className="text-sm text-center max-w-xs">
                  {isHebrew
                    ? 'פרסם מטלות טכניות כדי למצוא מועמדים מוכשרים'
                    : 'Post technical challenges to find talented candidates'}
                </p>
                <Button onClick={() => setShowCreate(true)} className="gap-2 mt-2">
                  <Plus className="w-4 h-4" />
                  {isHebrew ? 'פרסם מטלה' : 'Post Assignment'}
                </Button>
              </>
            ) : search ? (
              <>
                <Search className="w-14 h-14 opacity-20" />
                <p className="text-lg font-medium">{isHebrew ? 'לא נמצאו תוצאות' : 'No results found'}</p>
                <p className="text-sm">
                  {isHebrew ? `לא נמצאו מטלות עבור "${search}"` : `No assignments match "${search}"`}
                </p>
                <Button onClick={() => setSearch('')} variant="outline" className="gap-2 mt-2">
                  {isHebrew ? 'נקה חיפוש' : 'Clear Search'}
                </Button>
              </>
            ) : (
              <>
                <ClipboardList className="w-14 h-14 opacity-20" />
                <p className="text-lg font-medium">{isHebrew ? 'אין מטלות עדיין' : 'No assignments yet'}</p>
                <p className="text-sm text-center max-w-xs">
                  {isHebrew
                    ? 'היה הראשון לפרסם מטלה טכנית ולמצוא מועמדים מוכשרים'
                    : 'Be the first to post a technical challenge and find talented candidates'}
                </p>
                {user && (
                  <Button onClick={() => setShowCreate(true)} className="gap-2 mt-2">
                    <Plus className="w-4 h-4" />
                    {isHebrew ? 'פרסם מטלה' : 'Post Assignment'}
                  </Button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedTemplates.map(template => (
              <AssignmentCard
                key={template.id}
                template={template}
                mySubmission={mySubmissions.get(template.id) ?? null}
                isOwner={template.created_by === user?.id}
                submissionsCount={submissionCounts.get(template.id) ?? 0}
                myAccessRequest={myAccessRequests.get(template.id) ?? null}
                matchScore={calcMatchScore(template)}
                onSubmit={handleSubmit}
                onViewSubmissions={handleViewSubmissions}
                onRequestAccess={handleRequestAccess}
                onEdit={setEditTarget}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        )}
      </main>

      <CreateAssignmentDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onSuccess={fetchData}
      />
      <SubmitSolutionDialog
        template={submitTarget}
        open={!!submitTarget}
        onOpenChange={(o) => { if (!o) setSubmitTarget(null); }}
        onSuccess={fetchData}
      />
      <SubmissionsViewDialog
        template={viewTarget}
        open={!!viewTarget}
        onOpenChange={(o) => { if (!o) setViewTarget(null); }}
      />
      <RequestAccessDialog
        template={requestTarget}
        open={!!requestTarget}
        onOpenChange={(o) => { if (!o) setRequestTarget(null); }}
        onSuccess={handleAccessRequested}
      />

      {/* Edit dialog — reuse CreateAssignmentDialog with initial data */}
      <CreateAssignmentDialog
        open={!!editTarget}
        onOpenChange={(o) => { if (!o) setEditTarget(null); }}
        onSuccess={fetchData}
        editTemplate={editTarget ?? undefined}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent dir={isHebrew ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isHebrew ? 'מחיקת מטלה' : 'Delete Assignment'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isHebrew
                ? `האם אתה בטוח שברצונך למחוק את "${deleteTarget?.title}"? פעולה זו לא ניתנת לביטול.`
                : `Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {isHebrew ? 'ביטול' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
              {isHebrew ? 'מחק' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
