import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Header } from '@/components/Header';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { getCompanyLogoUrl } from '@/lib/company-logo';
import {
  Search, Building2, ArrowLeft, ArrowRight,
  Star, Users, Globe, ChevronRight, ChevronLeft,
  ThumbsUp, Linkedin, Briefcase, Heart, HeartOff,
  ArrowUpDown, CheckCircle2, UserPlus, MapPin, CalendarDays,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Company {
  id: string;
  name: string;
  description: string | null;
  tagline: string | null;
  industry: string | null;
  size: string | null;
  website: string | null;
  logo_url: string | null;
  linkedin_url: string | null;
  founded_year: number | null;
  employee_count: string | null;
  is_claimed: boolean | null;
}

interface CompanyRating {
  company_id: string;
  avg_overall: number | null;
  avg_communication: number | null;
  avg_transparency: number | null;
  total_vouches: number;
  recommend_pct: number | null;
}

type SortOption = 'name' | 'rating' | 'reviews' | 'jobs';

// ─── Constants ────────────────────────────────────────────────────────────────

const SIZE_LABELS: Record<string, { he: string; en: string }> = {
  startup:    { he: 'סטארטאפ',        en: 'Startup' },
  small:      { he: 'קטנה (10-50)',   en: 'Small (10-50)' },
  medium:     { he: 'בינונית (50-200)', en: 'Medium (50-200)' },
  large:      { he: 'גדולה (200+)',   en: 'Large (200+)' },
  enterprise: { he: 'אנטרפרייז',      en: 'Enterprise' },
};

const MEMBER_ROLES = [
  { value: 'employee', labelHe: 'עובד/ת', labelEn: 'Employee' },
  { value: 'hr',       labelHe: 'HR / גיוס', labelEn: 'HR / Recruiting' },
];

// ─── Add Member Dialog ────────────────────────────────────────────────────────

function AddMemberDialog({
  company,
  open,
  onOpenChange,
  isHe,
}: {
  company: Company;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isHe: boolean;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [role, setRole] = useState('employee');
  const [title, setTitle] = useState('');

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await (supabase as any)
        .from('company_members')
        .upsert({
          company_id: company.id,
          user_id: user.id,
          role,
          title: title.trim() || null,
        }, { onConflict: 'company_id,user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isHe ? 'נוספת לחברה בהצלחה!' : 'Added to company!');
      queryClient.invalidateQueries({ queryKey: ['company-members-all'] });
      onOpenChange(false);
    },
    onError: () => {
      toast.error(isHe ? 'שגיאה בהוספה' : 'Failed to add');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" dir={isHe ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            {isHe ? `הצטרף ל-${company.name}` : `Join ${company.name}`}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>{isHe ? 'תפקיד' : 'Role'}</Label>
            <RadioGroup value={role} onValueChange={setRole} className="gap-2">
              {MEMBER_ROLES.map((r) => (
                <div key={r.value} className="flex items-center gap-3">
                  <RadioGroupItem value={r.value} id={`role-${r.value}`} />
                  <Label htmlFor={`role-${r.value}`} className="font-normal cursor-pointer">
                    {isHe ? r.labelHe : r.labelEn}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label>{isHe ? 'כותרת (אופציונלי)' : 'Title (optional)'}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isHe ? 'לדוגמה: Senior Developer' : 'e.g. Senior Developer'}
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              {isHe ? 'ביטול' : 'Cancel'}
            </Button>
            <Button size="sm" onClick={() => addMutation.mutate()} disabled={addMutation.isPending}>
              {isHe ? 'הוסף' : 'Add'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Company Card ─────────────────────────────────────────────────────────────

function CompanyCard({
  company,
  rating,
  jobCount,
  isFollowing,
  connectionCount,
  connectionNames,
  isHe,
  isRTL,
  onFollowToggle,
  onJoin,
}: {
  company: Company;
  rating?: CompanyRating;
  jobCount: number;
  isFollowing: boolean;
  connectionCount: number;
  connectionNames: string[];
  isHe: boolean;
  isRTL: boolean;
  onFollowToggle: () => void;
  onJoin: () => void;
}) {
  const navigate = useNavigate();
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;
  const logoUrl = getCompanyLogoUrl(company);

  const careerUrl = company.website
    ? (company.website.startsWith('http') ? company.website : 'https://' + company.website) + '/careers'
    : null;

  return (
    <div className="bg-card border border-border rounded-xl flex flex-col gap-0 overflow-hidden hover:border-primary/30 hover:shadow-sm transition-all">
      {/* Clickable main body */}
      <button
        onClick={() => navigate(`/company/${company.id}`)}
        className="text-start p-4 flex flex-col gap-3 flex-1 cursor-pointer"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-11 w-11 flex-shrink-0 rounded-lg border border-border">
              <AvatarImage src={logoUrl ?? undefined} alt={company.name} />
              <AvatarFallback className="rounded-lg text-sm font-bold bg-primary/10 text-primary">
                {company.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-semibold text-sm">{company.name}</p>
                {company.is_claimed && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                )}
              </div>
              {(company.tagline || company.industry) && (
                <p className="text-xs text-muted-foreground truncate">
                  {company.tagline || company.industry}
                </p>
              )}
            </div>
          </div>
          <NextIcon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
        </div>

        {/* Description */}
        {company.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {company.description}
          </p>
        )}

        {/* Meta badges */}
        <div className="flex flex-wrap gap-1.5">
          {company.industry && (
            <Badge variant="secondary" className="text-xs h-5 px-1.5">{company.industry}</Badge>
          )}
          {company.size && (
            <Badge variant="outline" className="text-xs h-5 px-1.5">
              {SIZE_LABELS[company.size]?.[isHe ? 'he' : 'en'] ?? company.size}
            </Badge>
          )}
          {company.founded_year && (
            <Badge variant="outline" className="text-xs h-5 px-1.5 gap-0.5">
              <CalendarDays className="h-2.5 w-2.5" />
              {company.founded_year}
            </Badge>
          )}
          {company.employee_count && (
            <Badge variant="outline" className="text-xs h-5 px-1.5 gap-0.5">
              <Users className="h-2.5 w-2.5" />
              {company.employee_count}
            </Badge>
          )}
        </div>

        {/* Rating row */}
        {rating && rating.total_vouches >= 1 ? (
          <div className="flex items-center gap-3 pt-2 border-t border-border/50 flex-wrap">
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
              <span className="text-xs font-medium">
                {rating.avg_overall ? Number(rating.avg_overall).toFixed(1) : '—'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {rating.total_vouches} {isHe ? 'ביקורות' : 'reviews'}
              </span>
            </div>
            {rating.recommend_pct !== null && (
              <div className="flex items-center gap-1 ms-auto">
                <ThumbsUp className="h-3.5 w-3.5 text-green-500" />
                <span className="text-xs text-green-600 font-medium">
                  {Math.round(Number(rating.recommend_pct))}%
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="pt-2 border-t border-border/50">
            <span className="text-xs text-muted-foreground/50">
              {isHe ? 'אין ביקורות קהילה עדיין' : 'No community reviews yet'}
            </span>
          </div>
        )}

        {/* Connections */}
        {connectionCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-primary">
            <Users className="h-3.5 w-3.5" />
            <span>
              {connectionCount === 1
                ? (isHe ? `${connectionNames[0]} עובד/ת כאן` : `${connectionNames[0]} works here`)
                : (isHe
                  ? `${connectionNames[0]} ועוד ${connectionCount - 1} עובדים כאן`
                  : `${connectionNames[0]} and ${connectionCount - 1} more work here`)}
            </span>
          </div>
        )}
      </button>

      {/* Footer actions — not part of navigate click */}
      <div className="px-4 pb-3 flex items-center gap-2 border-t border-border/40 pt-2.5">
        {/* Open jobs */}
        {jobCount > 0 ? (
          <button
            onClick={() => navigate(`/company/${company.id}`)}
            className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
          >
            <Briefcase className="h-3.5 w-3.5" />
            {jobCount} {isHe ? 'משרות פתוחות' : 'open jobs'}
          </button>
        ) : (
          <span className="text-xs text-muted-foreground/50 flex items-center gap-1">
            <Briefcase className="h-3.5 w-3.5" />
            {isHe ? 'אין משרות' : 'No jobs'}
          </span>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* LinkedIn */}
        {company.linkedin_url && (
          <a
            href={company.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="h-7 w-7 flex items-center justify-center rounded-md border border-border hover:border-[#0077b5] hover:text-[#0077b5] transition-colors"
            title="LinkedIn"
          >
            <Linkedin className="h-3.5 w-3.5" />
          </a>
        )}

        {/* Career page */}
        {careerUrl && (
          <a
            href={careerUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="h-7 w-7 flex items-center justify-center rounded-md border border-border hover:border-primary hover:text-primary transition-colors"
            title={isHe ? 'דף קריירה' : 'Career page'}
          >
            <Globe className="h-3.5 w-3.5" />
          </a>
        )}

        {/* Join button */}
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1 px-2"
          onClick={(e) => { e.stopPropagation(); onJoin(); }}
        >
          <UserPlus className="h-3 w-3" />
          {isHe ? 'עובד/ת כאן?' : 'Work here?'}
        </Button>

        {/* Follow */}
        <Button
          size="sm"
          variant={isFollowing ? 'default' : 'ghost'}
          className={cn('h-7 w-7 p-0', isFollowing && 'bg-primary/10 text-primary hover:bg-primary/20')}
          onClick={(e) => { e.stopPropagation(); onFollowToggle(); }}
          title={isFollowing ? (isHe ? 'הפסק לעקוב' : 'Unfollow') : (isHe ? 'עקוב' : 'Follow')}
        >
          <Heart className={cn('h-3.5 w-3.5', isFollowing && 'fill-current')} />
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Companies() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const isHe = language === 'he';
  const isRTL = isHe;
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  const [search, setSearch]               = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [sizeFilter, setSizeFilter]       = useState('');
  const [sortBy, setSortBy]               = useState<SortOption>('name');
  const [filterHasReviews, setFilterHasReviews] = useState(false);
  const [filterHasJobs, setFilterHasJobs] = useState(false);
  const [filterClaimed, setFilterClaimed] = useState(false);
  const [joinTarget, setJoinTarget]       = useState<Company | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies-directory'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('companies')
        .select('id, name, description, tagline, industry, size, website, logo_url, linkedin_url, founded_year, employee_count, is_claimed')
        .order('name', { ascending: true });
      if (error) throw error;
      return (data || []) as Company[];
    },
  });

  const { data: ratingsMap = {} } = useQuery({
    queryKey: ['company-ratings-all'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('company_ratings').select('*');
      const map: Record<string, CompanyRating> = {};
      (data || []).forEach((r: CompanyRating) => { map[r.company_id] = r; });
      return map;
    },
  });

  // Open jobs per company
  const { data: jobCountMap = {} } = useQuery({
    queryKey: ['companies-job-counts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('jobs')
        .select('company_id')
        .eq('status', 'active');
      const map: Record<string, number> = {};
      (data || []).forEach((j: any) => {
        if (j.company_id) map[j.company_id] = (map[j.company_id] || 0) + 1;
      });
      return map;
    },
  });

  // User's follows (company follows)
  const { data: followedIds = new Set<string>() } = useQuery({
    queryKey: ['my-company-follows', user?.id],
    queryFn: async () => {
      if (!user?.id) return new Set<string>();
      const { data } = await supabase
        .from('follows')
        .select('followed_company_id')
        .eq('follower_id', user.id)
        .not('followed_company_id', 'is', null);
      return new Set<string>((data || []).map((f: any) => f.followed_company_id));
    },
    enabled: !!user?.id,
  });

  // Company members (all) for connection detection
  const { data: allMembers = [] } = useQuery({
    queryKey: ['company-members-all'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('company_members')
        .select('company_id, user_id, role, title');
      return data || [];
    },
  });

  // User's accepted connections
  const { data: myConnectionIds = new Set<string>() } = useQuery({
    queryKey: ['my-connection-ids', user?.id],
    queryFn: async () => {
      if (!user?.id) return new Set<string>();
      const { data } = await supabase
        .from('connections')
        .select('requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
      const ids = new Set<string>();
      (data || []).forEach((c: any) => {
        if (c.requester_id !== user.id) ids.add(c.requester_id);
        if (c.addressee_id !== user.id) ids.add(c.addressee_id);
      });
      return ids;
    },
    enabled: !!user?.id,
  });

  // Profiles for connection names
  const { data: profileNames = {} } = useQuery({
    queryKey: ['connection-names', Array.from(myConnectionIds).join(',')],
    queryFn: async () => {
      if (myConnectionIds.size === 0) return {};
      const { data } = await supabase
        .from('profiles_secure')
        .select('user_id, full_name')
        .in('user_id', Array.from(myConnectionIds));
      const map: Record<string, string> = {};
      (data || []).forEach((p: any) => { map[p.user_id] = p.full_name; });
      return map;
    },
    enabled: myConnectionIds.size > 0,
  });

  // ── Derived: connection count per company ─────────────────────────────────

  const connectionsByCompany = useMemo(() => {
    const map: Record<string, string[]> = {};
    allMembers.forEach((m: any) => {
      if (myConnectionIds.has(m.user_id)) {
        if (!map[m.company_id]) map[m.company_id] = [];
        const name = profileNames[m.user_id];
        if (name) map[m.company_id].push(name);
      }
    });
    return map;
  }, [allMembers, myConnectionIds, profileNames]);

  // ── Filter & Sort ─────────────────────────────────────────────────────────

  const industries = useMemo(
    () => Array.from(new Set(companies.map((c) => c.industry).filter(Boolean) as string[])).sort(),
    [companies]
  );

  const sizes = useMemo(
    () => Array.from(new Set(companies.map((c) => c.size).filter(Boolean) as string[])),
    [companies]
  );

  const filtered = useMemo(() => {
    let list = companies.filter((c) => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (industryFilter && c.industry !== industryFilter) return false;
      if (sizeFilter && c.size !== sizeFilter) return false;
      if (filterHasReviews && !(ratingsMap[c.id]?.total_vouches >= 1)) return false;
      if (filterHasJobs && !jobCountMap[c.id]) return false;
      if (filterClaimed && !c.is_claimed) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === 'rating') {
        const ra = ratingsMap[a.id]?.avg_overall ?? 0;
        const rb = ratingsMap[b.id]?.avg_overall ?? 0;
        return Number(rb) - Number(ra);
      }
      if (sortBy === 'reviews') {
        return (ratingsMap[b.id]?.total_vouches ?? 0) - (ratingsMap[a.id]?.total_vouches ?? 0);
      }
      if (sortBy === 'jobs') {
        return (jobCountMap[b.id] ?? 0) - (jobCountMap[a.id] ?? 0);
      }
      return a.name.localeCompare(b.name, isHe ? 'he' : 'en');
    });

    return list;
  }, [companies, search, industryFilter, sizeFilter, filterHasReviews, filterHasJobs, filterClaimed, sortBy, ratingsMap, jobCountMap, isHe]);

  // ── Follow toggle ─────────────────────────────────────────────────────────

  const followMutation = useMutation({
    mutationFn: async ({ companyId, following }: { companyId: string; following: boolean }) => {
      if (!user?.id) return;
      if (following) {
        await supabase.from('follows').delete()
          .eq('follower_id', user.id)
          .eq('followed_company_id', companyId);
      } else {
        await supabase.from('follows').insert({ follower_id: user.id, followed_company_id: companyId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-company-follows'] });
    },
  });

  const SORT_LABELS: Record<SortOption, { he: string; en: string }> = {
    name:    { he: 'א-ת', en: 'A-Z' },
    rating:  { he: 'ציון גבוה', en: 'Top rated' },
    reviews: { he: 'הכי הרבה ביקורות', en: 'Most reviewed' },
    jobs:    { he: 'הכי הרבה משרות', en: 'Most jobs' },
  };

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Header />

      <main id="main-content" className="max-w-6xl mx-auto px-4 py-8">
        {/* Back + title */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1">
            <BackIcon className="h-4 w-4" />
            {isHe ? 'חזרה' : 'Back'}
          </Button>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            {isHe ? 'ספריית חברות' : 'Company Directory'}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {isHe
              ? 'גלה חברות, קרא ביקורות אנונימיות מהקהילה וחפש הזדמנויות'
              : 'Discover companies, read anonymous community reviews and find opportunities'}
          </p>
        </div>

        {/* Search + Sort row */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search
              className="absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
              style={{ [isRTL ? 'right' : 'left']: '12px' }}
            />
            <Input
              placeholder={isHe ? 'חיפוש חברה...' : 'Search companies...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={isRTL ? 'pr-9' : 'pl-9'}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 whitespace-nowrap">
                <ArrowUpDown className="h-3.5 w-3.5" />
                {SORT_LABELS[sortBy][isHe ? 'he' : 'en']}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isRTL ? 'start' : 'end'}>
              <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                {(Object.keys(SORT_LABELS) as SortOption[]).map((k) => (
                  <DropdownMenuRadioItem key={k} value={k}>
                    {SORT_LABELS[k][isHe ? 'he' : 'en']}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Industry filter chips */}
        {industries.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            <Button
              size="sm" variant={industryFilter === '' ? 'default' : 'outline'}
              className="h-7 text-xs" onClick={() => setIndustryFilter('')}
            >
              {isHe ? 'כל התחומים' : 'All industries'}
            </Button>
            {industries.map((ind) => (
              <Button key={ind} size="sm"
                variant={industryFilter === ind ? 'default' : 'outline'}
                className="h-7 text-xs"
                onClick={() => setIndustryFilter(industryFilter === ind ? '' : ind)}
              >
                {ind}
              </Button>
            ))}
          </div>
        )}

        {/* Size filter chips */}
        {sizes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {sizes.map((sz) => (
              <Button key={sz} size="sm"
                variant={sizeFilter === sz ? 'secondary' : 'ghost'}
                className="h-7 text-xs border border-border"
                onClick={() => setSizeFilter(sizeFilter === sz ? '' : sz)}
              >
                {SIZE_LABELS[sz]?.[isHe ? 'he' : 'en'] ?? sz}
              </Button>
            ))}
          </div>
        )}

        {/* Toggle filters */}
        <div className="flex flex-wrap gap-2 mb-5">
          {[
            { key: 'reviews', labelHe: 'יש ביקורות', labelEn: 'Has reviews', active: filterHasReviews, set: setFilterHasReviews },
            { key: 'jobs',    labelHe: 'יש משרות',   labelEn: 'Has jobs',    active: filterHasJobs,    set: setFilterHasJobs },
            { key: 'claimed', labelHe: 'חברה מאומתת', labelEn: 'Verified',   active: filterClaimed,    set: setFilterClaimed },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => f.set(!f.active)}
              className={cn(
                'flex items-center gap-1.5 text-xs px-3 h-7 rounded-full border transition-colors',
                f.active
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50'
              )}
            >
              {f.active && <CheckCircle2 className="h-3 w-3" />}
              {isHe ? f.labelHe : f.labelEn}
            </button>
          ))}
        </div>

        {/* Count */}
        <p className="text-xs text-muted-foreground mb-4">
          {filtered.length} {isHe ? 'חברות' : 'companies'}
        </p>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-52 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{isHe ? 'לא נמצאו חברות' : 'No companies found'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((company) => {
              const connNames = connectionsByCompany[company.id] || [];
              return (
                <CompanyCard
                  key={company.id}
                  company={company}
                  rating={ratingsMap[company.id]}
                  jobCount={jobCountMap[company.id] ?? 0}
                  isFollowing={followedIds.has(company.id)}
                  connectionCount={connNames.length}
                  connectionNames={connNames}
                  isHe={isHe}
                  isRTL={isRTL}
                  onFollowToggle={() =>
                    followMutation.mutate({ companyId: company.id, following: followedIds.has(company.id) })
                  }
                  onJoin={() => setJoinTarget(company)}
                />
              );
            })}
          </div>
        )}
      </main>

      {/* Add member dialog */}
      {joinTarget && (
        <AddMemberDialog
          company={joinTarget}
          open={!!joinTarget}
          onOpenChange={(v) => { if (!v) setJoinTarget(null); }}
          isHe={isHe}
        />
      )}
    </div>
  );
}
