import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RevenueCalculator } from '@/components/communities/RevenueCalculator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Search,
  Users,
  Star,
  ArrowUpDown,
  Compass,
  Dumbbell,
  Briefcase,
  Code2,
  GraduationCap,
  Palette,
  HeartPulse,
  Music,
  Layers,
} from 'lucide-react';

// ── Category definitions ────────────────────────────────────────────
const categories = [
  { key: 'all', labelHe: 'הכל', labelEn: 'All', icon: Layers },
  { key: 'general', labelHe: 'כללי', labelEn: 'General', icon: Compass },
  { key: 'fitness', labelHe: 'כושר', labelEn: 'Fitness', icon: Dumbbell },
  { key: 'business', labelHe: 'עסקים', labelEn: 'Business', icon: Briefcase },
  { key: 'tech', labelHe: 'טכנולוגיה', labelEn: 'Tech', icon: Code2 },
  { key: 'education', labelHe: 'חינוך', labelEn: 'Education', icon: GraduationCap },
  { key: 'art', labelHe: 'אמנות', labelEn: 'Art', icon: Palette },
  { key: 'health', labelHe: 'בריאות', labelEn: 'Health', icon: HeartPulse },
  { key: 'music', labelHe: 'מוזיקה', labelEn: 'Music', icon: Music },
] as const;

type SortOption = 'popular' | 'newest' | 'price_asc';

export default function Discover() {
  const { user } = useAuth();
  const { language, direction } = useLanguage();
  const isHe = language === 'he';
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState<SortOption>('popular');
  const [joiningId, setJoiningId] = useState<string | null>(null);

  // ── Fetch public hubs ───────────────────────────────────────────
  const { data: hubs = [], isLoading } = useQuery({
    queryKey: ['discover-hubs'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('community_hubs')
        .select('*')
        .eq('is_public', true);
      if (error) throw error;
      return data as any[];
    },
  });

  // ── Fetch user memberships ──────────────────────────────────────
  const { data: memberships = [] } = useQuery({
    queryKey: ['discover-memberships', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await (supabase as any)
        .from('community_members')
        .select('hub_id')
        .eq('user_id', user.id);
      return (data || []) as any[];
    },
    enabled: !!user?.id,
  });

  const memberHubIds = useMemo(
    () => new Set(memberships.map((m: any) => m.hub_id)),
    [memberships]
  );

  // ── Filter & sort ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = [...hubs];

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (h: any) =>
          (h.name_en || '').toLowerCase().includes(q) ||
          (h.name_he || '').toLowerCase().includes(q) ||
          (h.description_en || '').toLowerCase().includes(q) ||
          (h.description_he || '').toLowerCase().includes(q)
      );
    }

    // Category filter
    if (category !== 'all') {
      result = result.filter((h: any) => h.category === category);
    }

    // Sort
    switch (sort) {
      case 'popular':
        result.sort((a: any, b: any) => (b.member_count || 0) - (a.member_count || 0));
        break;
      case 'newest':
        result.sort((a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
      case 'price_asc':
        result.sort((a: any, b: any) => (a.monthly_price || 0) - (b.monthly_price || 0));
        break;
    }

    return result;
  }, [hubs, search, category, sort]);

  // ── Join handler ───────────────────────────────────────────────
  const handleJoin = async (hubId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    setJoiningId(hubId);
    try {
      const { error } = await (supabase as any)
        .from('community_members')
        .insert({ hub_id: hubId, user_id: user.id, role: 'member' });
      if (error) throw error;

      const hub = hubs.find((h: any) => h.id === hubId);
      if (hub) {
        await (supabase as any)
          .from('community_hubs')
          .update({ member_count: (hub.member_count || 0) + 1 })
          .eq('id', hubId);
      }

      toast.success(isHe ? 'הצטרפת לקהילה!' : 'Joined community!');
    } catch {
      toast.error(isHe ? 'שגיאה בהצטרפות' : 'Failed to join');
    } finally {
      setJoiningId(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div dir={direction} className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero / Header */}
      <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-pink-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-12 md:py-16 text-center space-y-4">
          <h1 className="text-3xl md:text-4xl font-extrabold">
            {isHe ? 'גילוי קהילות' : 'Discover Communities'}
          </h1>
          <p className="text-white/80 text-lg max-w-xl mx-auto">
            {isHe
              ? 'מצא קהילות מקצועיות, למד מהמומחים הטובים ביותר והתחבר לאנשים כמוך'
              : 'Find professional communities, learn from the best experts and connect with like-minded people'}
          </p>

          {/* Search bar */}
          <div className="relative max-w-lg mx-auto mt-6">
            <Search className={cn(
              'absolute top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400',
              isHe ? 'right-3' : 'left-3'
            )} />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isHe ? 'חפש קהילה...' : 'Search communities...'}
              className={cn(
                'bg-white/95 border-0 text-gray-900 h-12 rounded-full shadow-lg',
                isHe ? 'pr-10 pl-4' : 'pl-10 pr-4'
              )}
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Category chips */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = category === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all min-h-[44px]',
                  isActive
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-purple-300 hover:text-purple-600'
                )}
              >
                <Icon className="w-4 h-4" />
                {isHe ? cat.labelHe : cat.labelEn}
              </button>
            );
          })}
        </div>

        {/* Sort + count row */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {isHe
              ? `${filtered.length} קהילות נמצאו`
              : `${filtered.length} communities found`}
          </p>
          <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
            <SelectTrigger className="w-[180px] h-10">
              <ArrowUpDown className="w-4 h-4 opacity-50" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">{isHe ? 'פופולריות' : 'Most Popular'}</SelectItem>
              <SelectItem value="newest">{isHe ? 'חדשות' : 'Newest'}</SelectItem>
              <SelectItem value="price_asc">{isHe ? 'מחיר: נמוך לגבוה' : 'Price: Low to High'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-14 h-14 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                  <div className="flex justify-between pt-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-9 w-20 rounded-md" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <Compass className="w-12 h-12 mx-auto text-gray-300" />
            <p className="text-lg font-medium text-gray-500">
              {isHe ? 'לא נמצאו קהילות' : 'No communities found'}
            </p>
            <p className="text-sm text-muted-foreground">
              {isHe ? 'נסה לשנות את החיפוש או הקטגוריה' : 'Try changing your search or category'}
            </p>
          </div>
        )}

        {/* Community grid */}
        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((hub: any) => {
              const isMember = memberHubIds.has(hub.id);
              const name = isHe ? (hub.name_he || hub.name_en) : (hub.name_en || hub.name_he);
              const description = isHe
                ? (hub.description_he || hub.description_en)
                : (hub.description_en || hub.description_he);
              const price = hub.monthly_price || 0;
              const isFeatured = hub.featured === true;

              return (
                <Card
                  key={hub.id}
                  className={cn(
                    'overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all group',
                    isFeatured && 'ring-2 ring-purple-400 ring-offset-2'
                  )}
                >
                  <CardContent className="p-5 space-y-3">
                    {/* Top row */}
                    <div className="flex items-start gap-3">
                      <Avatar className="w-14 h-14 rounded-xl shrink-0">
                        <AvatarImage src={hub.avatar_url || undefined} />
                        <AvatarFallback className="bg-purple-100 text-purple-600 rounded-xl font-bold text-lg">
                          {name?.charAt(0)?.toUpperCase() || 'C'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate">{name}</h3>
                          {isFeatured && (
                            <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white border-0 text-[10px] px-1.5 shrink-0">
                              <Star className="w-3 h-3 fill-current" />
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Users className="w-3.5 h-3.5" />
                          <span>
                            {(hub.member_count || 0).toLocaleString()} {isHe ? 'חברים' : 'members'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    {description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {description}
                      </p>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-1">
                      {price === 0 ? (
                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          {isHe ? 'חינם' : 'Free'}
                        </Badge>
                      ) : (
                        <span className="text-sm font-semibold text-gray-700">
                          {isHe ? `${price}\u20AA / חודש` : `\u20AA${price}/mo`}
                        </span>
                      )}

                      {isMember ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/community/${hub.id}`)}
                        >
                          {isHe ? 'כניסה' : 'Enter'}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={joiningId === hub.id}
                          onClick={() => handleJoin(hub.id)}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          {joiningId === hub.id
                            ? (isHe ? 'מצטרף...' : 'Joining...')
                            : (isHe ? 'הצטרף' : 'Join')}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Revenue Calculator */}
        <div className="pt-12 pb-8">
          <RevenueCalculator
            onCTA={() => navigate(user ? '/dashboard' : '/auth')}
            className="max-w-2xl mx-auto"
          />
        </div>
      </div>
    </div>
  );
}
