import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Header } from '@/components/Header';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getCompanyLogoUrl } from '@/lib/company-logo';
import {
  Search, Building2, ArrowLeft, ArrowRight,
  Star, Users, Globe, ChevronRight, ChevronLeft,
  ThumbsUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Company {
  id: string;
  name: string;
  description: string | null;
  industry: string | null;
  size: string | null;
  website: string | null;
  logo_url: string | null;
}

interface CompanyRating {
  company_id: string;
  avg_overall: number | null;
  avg_communication: number | null;
  avg_transparency: number | null;
  total_vouches: number;
  recommend_pct: number | null;
}

const SIZE_LABELS: Record<string, { he: string; en: string }> = {
  startup: { he: 'סטארטאפ', en: 'Startup' },
  small: { he: 'קטנה (10-50)', en: 'Small (10-50)' },
  medium: { he: 'בינונית (50-200)', en: 'Medium (50-200)' },
  large: { he: 'גדולה (200+)', en: 'Large (200+)' },
  enterprise: { he: 'אנטרפרייז', en: 'Enterprise' },
};

export default function Companies() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isHe = language === 'he';
  const isRTL = isHe;
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;

  const [search, setSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');

  // Fetch all companies
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies-directory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, description, industry, size, website, logo_url')
        .order('name', { ascending: true });
      if (error) throw error;
      return (data || []) as Company[];
    },
  });

  // Fetch company ratings from view
  const { data: ratingsMap = {} } = useQuery({
    queryKey: ['company-ratings-all'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('company_ratings')
        .select('*');
      const map: Record<string, CompanyRating> = {};
      (data || []).forEach((r: CompanyRating) => {
        map[r.company_id] = r;
      });
      return map;
    },
  });

  // Unique industries for filter chips
  const industries = Array.from(
    new Set(companies.map((c) => c.industry).filter(Boolean) as string[])
  ).sort();

  const sizes = Array.from(
    new Set(companies.map((c) => c.size).filter(Boolean) as string[])
  ).sort();

  // Filter logic
  const filtered = companies.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (industryFilter && c.industry !== industryFilter) return false;
    if (sizeFilter && c.size !== sizeFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Header />

      <main id="main-content" className="max-w-6xl mx-auto px-4 py-8">
        {/* Back button + title */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1">
            <BackIcon className="h-4 w-4" />
            {isHe ? 'חזרה' : 'Back'}
          </Button>
        </div>

        <div className="mb-8">
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

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
            style={{ [isRTL ? 'right' : 'left']: '12px' }} />
          <Input
            placeholder={isHe ? 'חיפוש חברה...' : 'Search companies...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={isRTL ? 'pr-9' : 'pl-9'}
          />
        </div>

        {/* Industry filter chips */}
        {industries.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            <Button
              size="sm"
              variant={industryFilter === '' ? 'default' : 'outline'}
              className="h-7 text-xs"
              onClick={() => setIndustryFilter('')}
            >
              {isHe ? 'הכל' : 'All'}
            </Button>
            {industries.map((ind) => (
              <Button
                key={ind}
                size="sm"
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
          <div className="flex flex-wrap gap-2 mb-6">
            {sizes.map((sz) => (
              <Button
                key={sz}
                size="sm"
                variant={sizeFilter === sz ? 'secondary' : 'ghost'}
                className="h-7 text-xs border border-border"
                onClick={() => setSizeFilter(sizeFilter === sz ? '' : sz)}
              >
                {SIZE_LABELS[sz]?.[isHe ? 'he' : 'en'] ?? sz}
              </Button>
            ))}
          </div>
        )}

        {/* Results count */}
        <p className="text-xs text-muted-foreground mb-4">
          {isHe
            ? `${filtered.length} חברות`
            : `${filtered.length} companies`}
        </p>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-xl" />
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
              const rating = ratingsMap[company.id];
              const logoUrl = getCompanyLogoUrl(company);

              return (
                <button
                  key={company.id}
                  onClick={() => navigate(`/company/${company.id}`)}
                  className="text-start bg-card border border-border rounded-xl p-4 hover:border-primary/40 hover:shadow-sm transition-all flex flex-col gap-3 cursor-pointer"
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-10 w-10 flex-shrink-0 rounded-lg border border-border">
                        <AvatarImage src={logoUrl} alt={company.name} />
                        <AvatarFallback className="rounded-lg text-xs font-bold bg-primary/10 text-primary">
                          {company.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{company.name}</p>
                        {company.industry && (
                          <p className="text-xs text-muted-foreground truncate">{company.industry}</p>
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

                  {/* Rating row */}
                  {rating && rating.total_vouches >= 1 ? (
                    <div className="flex items-center gap-3 mt-auto pt-2 border-t border-border/50">
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
                    <div className="mt-auto pt-2 border-t border-border/50">
                      <span className="text-xs text-muted-foreground/60">
                        {isHe ? 'אין ביקורות עדיין' : 'No reviews yet'}
                      </span>
                    </div>
                  )}

                  {/* Badges row */}
                  <div className="flex flex-wrap gap-1">
                    {company.size && (
                      <Badge variant="secondary" className="text-xs h-5 px-1.5">
                        {SIZE_LABELS[company.size]?.[isHe ? 'he' : 'en'] ?? company.size}
                      </Badge>
                    )}
                    {company.website && (
                      <Badge variant="outline" className="text-xs h-5 px-1.5 gap-1">
                        <Globe className="h-2.5 w-2.5" />
                        {isHe ? 'אתר' : 'Website'}
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
