import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, X, MapPin, Briefcase, DollarSign, Building2, Navigation, Loader2, Layers, GraduationCap, Globe, SlidersHorizontal } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  JOB_FIELDS,
  EXPERIENCE_LEVELS,
  getRolesByField,
  getFieldBySlug,
  getRoleBySlug,
  getExperienceLevelBySlug
} from '@/lib/job-taxonomy';

const INDUSTRIES = [
  { value: 'digital-agency', labelEn: 'Digital Agency', labelHe: 'סוכנות דיגיטל' },
  { value: 'architecture', labelEn: 'Architecture', labelHe: 'אדריכלות' },
  { value: 'banking', labelEn: 'Banking', labelHe: 'בנקאות' },
  { value: 'insurance', labelEn: 'Insurance', labelHe: 'ביטוח' },
  { value: 'startup', labelEn: 'Startup', labelHe: 'סטארטאפ' },
  { value: 'enterprise', labelEn: 'Enterprise', labelHe: 'ארגון גדול' },
  { value: 'consulting', labelEn: 'Consulting', labelHe: 'ייעוץ' },
  { value: 'government', labelEn: 'Government', labelHe: 'ממשלתי' },
  { value: 'ngo', labelEn: 'Non-Profit', labelHe: 'מלכ"ר' },
  { value: 'healthcare', labelEn: 'Healthcare', labelHe: 'בריאות' },
  { value: 'education', labelEn: 'Education', labelHe: 'חינוך' },
  { value: 'retail', labelEn: 'Retail', labelHe: 'קמעונאות' },
  { value: 'manufacturing', labelEn: 'Manufacturing', labelHe: 'ייצור' },
  { value: 'telecom', labelEn: 'Telecom', labelHe: 'טלקום' },
  { value: 'fintech', labelEn: 'Fintech', labelHe: 'פינטק' },
  { value: 'cyber', labelEn: 'Cybersecurity', labelHe: 'סייבר' },
  { value: 'gaming', labelEn: 'Gaming', labelHe: 'גיימינג' },
  { value: 'ecommerce', labelEn: 'E-Commerce', labelHe: 'מסחר אלקטרוני' },
  { value: 'media', labelEn: 'Media & Entertainment', labelHe: 'מדיה ובידור' },
  { value: 'real-estate', labelEn: 'Real Estate', labelHe: 'נדל"ן' },
];

export interface JobFiltersState {
  search: string;
  location: string;
  jobType: string;
  salaryRange: string;
  companySearch: string;
  industry: string;
  category: string;
  fieldSlug: string;
  roleSlug: string;
  experienceLevelSlug: string;
  userLatitude: number | null;
  userLongitude: number | null;
  maxDistance: number;
  source: string;
  seniority: string;
  remoteType: string;
}

interface JobFiltersProps {
  filters: JobFiltersState;
  onFiltersChange: (filters: JobFiltersState) => void;
  onClearFilters: () => void;
  compact?: boolean;
}

const JOB_TYPES = [
  { value: 'full-time', labelEn: 'Full-time', labelHe: 'משרה מלאה' },
  { value: 'part-time', labelEn: 'Part-time', labelHe: 'משרה חלקית' },
  { value: 'contract', labelEn: 'Contract', labelHe: 'חוזה' },
  { value: 'freelance', labelEn: 'Freelance', labelHe: 'פרילנס' },
  { value: 'internship', labelEn: 'Internship', labelHe: 'התמחות' },
];

const SALARY_RANGES = [
  { value: 'any', labelEn: 'Any salary', labelHe: 'כל שכר' },
  { value: '0-10000', labelEn: '₪0 - ₪10,000', labelHe: '₪0 - ₪10,000' },
  { value: '10000-20000', labelEn: '₪10,000 - ₪20,000', labelHe: '₪10,000 - ₪20,000' },
  { value: '20000-35000', labelEn: '₪20,000 - ₪35,000', labelHe: '₪20,000 - ₪35,000' },
  { value: '35000-50000', labelEn: '₪35,000 - ₪50,000', labelHe: '₪35,000 - ₪50,000' },
  { value: '50000+', labelEn: '₪50,000+', labelHe: '₪50,000+' },
];

const LOCATIONS = [
  { value: 'all', labelEn: 'All locations', labelHe: 'כל המיקומים' },
  { value: 'tel-aviv', labelEn: 'Tel Aviv', labelHe: 'תל אביב' },
  { value: 'jerusalem', labelEn: 'Jerusalem', labelHe: 'ירושלים' },
  { value: 'haifa', labelEn: 'Haifa', labelHe: 'חיפה' },
  { value: 'beer-sheva', labelEn: 'Beer Sheva', labelHe: 'באר שבע' },
  { value: 'herzliya', labelEn: 'Herzliya', labelHe: 'הרצליה' },
  { value: 'remote', labelEn: 'Remote', labelHe: 'עבודה מרחוק' },
  { value: 'hybrid', labelEn: 'Hybrid', labelHe: 'היברידי' },
];

export function JobFilters({ filters, onFiltersChange, onClearFilters, compact = false }: JobFiltersProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const availableRoles = useMemo(() => {
    if (!filters.fieldSlug) return [];
    return getRolesByField(filters.fieldSlug);
  }, [filters.fieldSlug]);

  const { data: suggestions } = useQuery({
    queryKey: ['job-suggestions', filters.search],
    queryFn: async () => {
      if (!filters.search || filters.search.length < 2) return [];
      const { data } = await supabase
        .from('jobs')
        .select('title')
        .ilike('title', `%${filters.search}%`)
        .eq('status', 'active')
        .limit(5);
      return [...new Set(data?.map(j => j.title) || [])];
    },
    enabled: filters.search.length >= 2,
  });

  useEffect(() => {
    if (suggestions && suggestions.length > 0) {
      setSearchSuggestions(suggestions);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [suggestions]);

  const hasActiveFilters = filters.search || filters.location || filters.jobType ||
    filters.salaryRange || filters.companySearch || filters.fieldSlug ||
    filters.roleSlug || filters.experienceLevelSlug || filters.userLatitude ||
    filters.industry || filters.source;

  // Count of "more" filters active (excludes search, location, field which are inline)
  const moreFilterCount = [
    filters.companySearch, filters.roleSlug, filters.experienceLevelSlug,
    filters.jobType, filters.salaryRange, filters.industry, filters.source,
    filters.userLatitude,
  ].filter(Boolean).length;

  const updateFilter = <K extends keyof JobFiltersState>(key: K, value: JobFiltersState[K]) => {
    const newFilters = { ...filters, [key]: value };
    if (key === 'fieldSlug') newFilters.roleSlug = '';
    onFiltersChange(newFilters);
    if (key === 'search') setShowSuggestions(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    updateFilter('search', suggestion);
    setShowSuggestions(false);
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error(isHebrew ? 'הדפדפן לא תומך במיקום' : 'Geolocation is not supported');
      return;
    }
    setIsLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onFiltersChange({ ...filters, userLatitude: position.coords.latitude, userLongitude: position.coords.longitude });
        toast.success(isHebrew ? 'המיקום התקבל!' : 'Location received!');
        setIsLoadingLocation(false);
      },
      () => {
        toast.error(isHebrew ? 'לא הצלחנו לקבל את המיקום שלך' : 'Could not get your location');
        setIsLoadingLocation(false);
      }
    );
  };

  const clearLocation = () => {
    onFiltersChange({ ...filters, userLatitude: null, userLongitude: null, maxDistance: 25 });
  };

  // ── Search input with autocomplete (shared) ──
  const searchInput = (
    <div className="flex-1 relative">
      <Input
        placeholder={isHebrew ? 'חפש משרה או חברה...' : 'Search job title or company...'}
        value={filters.search}
        onChange={(e) => updateFilter('search', e.target.value)}
        onFocus={() => filters.search.length >= 2 && setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        className="h-9 ps-9"
      />
      <Search className="w-4 h-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      {showSuggestions && searchSuggestions.length > 0 && (
        <div className="absolute top-full inset-x-0 z-10 mt-1 bg-popover border border-border rounded-md shadow-lg">
          {searchSuggestions.map((suggestion, index) => (
            <button key={index} type="button"
              className="w-full text-start px-3 py-2 text-sm hover:bg-muted transition-colors first:rounded-t-md last:rounded-b-md"
              onClick={() => handleSuggestionClick(suggestion)}>
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // ── More filters content (used in popover or inline) ──
  const moreFiltersContent = (
    <div className="flex flex-col gap-4 p-1">
      {/* Company */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
          <Building2 className="w-3.5 h-3.5" />{isHebrew ? 'חברה' : 'Company'}
        </Label>
        <Input placeholder={isHebrew ? 'שם חברה...' : 'Company name...'} value={filters.companySearch}
          onChange={(e) => updateFilter('companySearch', e.target.value)} className="h-9" />
      </div>

      {/* Role */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
          <Briefcase className="w-3.5 h-3.5" />{isHebrew ? 'תפקיד' : 'Role'}
        </Label>
        <Select value={filters.roleSlug || 'all'} onValueChange={(v) => updateFilter('roleSlug', v === 'all' ? '' : v)} disabled={!filters.fieldSlug}>
          <SelectTrigger className="h-9"><SelectValue placeholder={isHebrew ? 'בחר תפקיד' : 'Select role'} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isHebrew ? 'כל התפקידים' : 'All roles'}</SelectItem>
            {availableRoles.map((role) => (
              <SelectItem key={role.slug} value={role.slug}>{isHebrew ? role.name_he : role.name_en}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Experience Level */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
          <GraduationCap className="w-3.5 h-3.5" />{isHebrew ? 'רמת ותק' : 'Experience'}
        </Label>
        <Select value={filters.experienceLevelSlug || 'all'} onValueChange={(v) => updateFilter('experienceLevelSlug', v === 'all' ? '' : v)}>
          <SelectTrigger className="h-9"><SelectValue placeholder={isHebrew ? 'בחר רמה' : 'Select level'} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isHebrew ? 'כל הרמות' : 'All levels'}</SelectItem>
            {EXPERIENCE_LEVELS.map((level) => (
              <SelectItem key={level.slug} value={level.slug}>{isHebrew ? level.name_he : level.name_en}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Industry */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
          <Building2 className="w-3.5 h-3.5" />{isHebrew ? 'ענף' : 'Industry'}
        </Label>
        <Select value={filters.industry || 'all'} onValueChange={(v) => updateFilter('industry', v === 'all' ? '' : v)}>
          <SelectTrigger className="h-9"><SelectValue placeholder={isHebrew ? 'בחר ענף' : 'Select industry'} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isHebrew ? 'כל הענפים' : 'All industries'}</SelectItem>
            {INDUSTRIES.map((ind) => (
              <SelectItem key={ind.value} value={ind.value}>{isHebrew ? ind.labelHe : ind.labelEn}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Job Type */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
          <Briefcase className="w-3.5 h-3.5" />{isHebrew ? 'סוג משרה' : 'Job Type'}
        </Label>
        <Select value={filters.jobType || 'all'} onValueChange={(v) => updateFilter('jobType', v === 'all' ? '' : v)}>
          <SelectTrigger className="h-9"><SelectValue placeholder={isHebrew ? 'בחר סוג' : 'Select'} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isHebrew ? 'כל הסוגים' : 'All types'}</SelectItem>
            {JOB_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>{isHebrew ? type.labelHe : type.labelEn}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Salary */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
          <DollarSign className="w-3.5 h-3.5" />{isHebrew ? 'טווח שכר' : 'Salary Range'}
        </Label>
        <Select value={filters.salaryRange || 'any'} onValueChange={(v) => updateFilter('salaryRange', v === 'any' ? '' : v)}>
          <SelectTrigger className="h-9"><SelectValue placeholder={isHebrew ? 'בחר טווח' : 'Select range'} /></SelectTrigger>
          <SelectContent>
            {SALARY_RANGES.map((range) => (
              <SelectItem key={range.value} value={range.value}>{isHebrew ? range.labelHe : range.labelEn}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Source */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
          <Globe className="w-3.5 h-3.5" />{isHebrew ? 'מקור' : 'Source'}
        </Label>
        <Select value={filters.source || 'all'} onValueChange={(v) => updateFilter('source', v === 'all' ? '' : v)}>
          <SelectTrigger className="h-9"><SelectValue placeholder={isHebrew ? 'הכל' : 'All'} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isHebrew ? 'הכל' : 'All'}</SelectItem>
            <SelectItem value="alljobs">AllJobs</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* GPS Location */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
          <Navigation className="w-3.5 h-3.5" />{isHebrew ? 'מיקום GPS' : 'GPS Location'}
        </Label>
        <div className="flex gap-2">
          <Button variant={filters.userLatitude ? 'secondary' : 'outline'} size="sm" className="h-9 gap-2"
            onClick={handleGetLocation} disabled={isLoadingLocation}>
            {isLoadingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
            {filters.userLatitude ? (isHebrew ? 'מיקום פעיל' : 'Active') : (isHebrew ? 'השתמש במיקום שלי' : 'Use My Location')}
          </Button>
          {filters.userLatitude && (
            <Button variant="ghost" size="sm" className="h-9 px-2" onClick={clearLocation}><X className="w-4 h-4" /></Button>
          )}
        </div>
        {filters.userLatitude && (
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{isHebrew ? 'מרחק מקסימלי' : 'Max distance'}</span>
              <span className="font-medium text-foreground">{filters.maxDistance} {isHebrew ? 'ק"מ' : 'km'}</span>
            </div>
            <Slider value={[filters.maxDistance]} onValueChange={(v) => updateFilter('maxDistance', v[0])} min={5} max={100} step={5} />
          </div>
        )}
      </div>
    </div>
  );

  // ── Active filter chips ──
  const activeFilterChips = hasActiveFilters ? (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {filters.search && (
        <Badge variant="secondary" className="gap-1 text-xs">
          {isHebrew ? 'חיפוש:' : 'Search:'} {filters.search}
          <X className="w-3 h-3 cursor-pointer" onClick={() => updateFilter('search', '')} />
        </Badge>
      )}
      {filters.companySearch && (
        <Badge variant="secondary" className="gap-1 text-xs">
          {isHebrew ? 'חברה:' : 'Company:'} {filters.companySearch}
          <X className="w-3 h-3 cursor-pointer" onClick={() => updateFilter('companySearch', '')} />
        </Badge>
      )}
      {filters.fieldSlug && (
        <Badge variant="secondary" className="gap-1 text-xs">
          <Layers className="w-3 h-3" />{getFieldBySlug(filters.fieldSlug)?.[isHebrew ? 'name_he' : 'name_en']}
          <X className="w-3 h-3 cursor-pointer" onClick={() => updateFilter('fieldSlug', '')} />
        </Badge>
      )}
      {filters.roleSlug && (
        <Badge variant="secondary" className="gap-1 text-xs">
          {getRoleBySlug(filters.roleSlug)?.[isHebrew ? 'name_he' : 'name_en']}
          <X className="w-3 h-3 cursor-pointer" onClick={() => updateFilter('roleSlug', '')} />
        </Badge>
      )}
      {filters.experienceLevelSlug && (
        <Badge variant="secondary" className="gap-1 text-xs">
          <GraduationCap className="w-3 h-3" />{getExperienceLevelBySlug(filters.experienceLevelSlug)?.[isHebrew ? 'name_he' : 'name_en']}
          <X className="w-3 h-3 cursor-pointer" onClick={() => updateFilter('experienceLevelSlug', '')} />
        </Badge>
      )}
      {filters.location && (
        <Badge variant="secondary" className="gap-1 text-xs">
          {LOCATIONS.find(l => l.value === filters.location)?.[isHebrew ? 'labelHe' : 'labelEn']}
          <X className="w-3 h-3 cursor-pointer" onClick={() => updateFilter('location', '')} />
        </Badge>
      )}
      {filters.userLatitude && (
        <Badge variant="secondary" className="gap-1 text-xs bg-primary/10 text-primary border-primary/20">
          <Navigation className="w-3 h-3" />{filters.maxDistance} {isHebrew ? 'ק"מ' : 'km'}
          <X className="w-3 h-3 cursor-pointer" onClick={clearLocation} />
        </Badge>
      )}
      {filters.jobType && (
        <Badge variant="secondary" className="gap-1 text-xs">
          {JOB_TYPES.find(t => t.value === filters.jobType)?.[isHebrew ? 'labelHe' : 'labelEn']}
          <X className="w-3 h-3 cursor-pointer" onClick={() => updateFilter('jobType', '')} />
        </Badge>
      )}
      {filters.salaryRange && filters.salaryRange !== 'any' && (
        <Badge variant="secondary" className="gap-1 text-xs">
          {SALARY_RANGES.find(r => r.value === filters.salaryRange)?.[isHebrew ? 'labelHe' : 'labelEn']}
          <X className="w-3 h-3 cursor-pointer" onClick={() => updateFilter('salaryRange', '')} />
        </Badge>
      )}
    </div>
  ) : null;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // COMPACT MODE — single row: search + location + field + more filters button
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (compact) {
    return (
      <div data-tour="job-filters">
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
          {/* Search */}
          {searchInput}

          {/* Location */}
          <Select value={filters.location || 'all'} onValueChange={(v) => updateFilter('location', v === 'all' ? '' : v)}>
            <SelectTrigger className="h-9 w-full sm:w-36">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground me-1" />
              <SelectValue placeholder={isHebrew ? 'מיקום' : 'Location'} />
            </SelectTrigger>
            <SelectContent>
              {LOCATIONS.map((loc) => (
                <SelectItem key={loc.value} value={loc.value}>{isHebrew ? loc.labelHe : loc.labelEn}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Field */}
          <Select value={filters.fieldSlug || 'all'} onValueChange={(v) => updateFilter('fieldSlug', v === 'all' ? '' : v)}>
            <SelectTrigger className="h-9 w-full sm:w-40">
              <Layers className="w-3.5 h-3.5 text-muted-foreground me-1" />
              <SelectValue placeholder={isHebrew ? 'תחום' : 'Field'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isHebrew ? 'כל התחומים' : 'All fields'}</SelectItem>
              {JOB_FIELDS.map((field) => (
                <SelectItem key={field.slug} value={field.slug}>{isHebrew ? field.name_he : field.name_en}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* More Filters Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 shrink-0">
                <SlidersHorizontal className="w-4 h-4" />
                {isHebrew ? 'עוד' : 'More'}
                {moreFilterCount > 0 && (
                  <Badge variant="default" className="px-1.5 py-0 h-4 text-[10px] ms-0.5">{moreFilterCount}</Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 max-h-[70vh] overflow-y-auto" align="end">
              {moreFiltersContent}
            </PopoverContent>
          </Popover>

          {/* Clear */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onClearFilters} className="h-9 gap-1 text-muted-foreground hover:text-foreground shrink-0">
              <X className="w-4 h-4" />{isHebrew ? 'נקה' : 'Clear'}
            </Button>
          )}
        </div>

        {activeFilterChips}
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FULL MODE (original 4-row layout, used elsewhere if needed)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return (
    <Card className="bg-card border-border" data-tour="job-filters">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          {/* Row 1: Search and Company */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                <Search className="w-3.5 h-3.5" />{isHebrew ? 'חיפוש משרה' : 'Search Jobs'}
              </Label>
              <Input placeholder={isHebrew ? 'חפש לפי שם משרה...' : 'Search by job title...'} value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                onFocus={() => filters.search.length >= 2 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} className="h-9" />
              {showSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute top-full inset-x-0 z-10 mt-1 bg-popover border border-border rounded-md shadow-lg">
                  {searchSuggestions.map((suggestion, index) => (
                    <button key={index} type="button"
                      className="w-full text-start px-3 py-2 text-sm hover:bg-muted transition-colors first:rounded-t-md last:rounded-b-md"
                      onClick={() => handleSuggestionClick(suggestion)}>{suggestion}</button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />{isHebrew ? 'חברה' : 'Company'}
              </Label>
              <Input placeholder={isHebrew ? 'חפש לפי שם חברה...' : 'Search by company...'} value={filters.companySearch}
                onChange={(e) => updateFilter('companySearch', e.target.value)} className="h-9" />
            </div>
          </div>

          {/* Row 2: Field, Role, Experience */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="w-full lg:w-48">
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1"><Layers className="w-3.5 h-3.5" />{isHebrew ? 'תחום עבודה' : 'Job Field'}</Label>
              <Select value={filters.fieldSlug || 'all'} onValueChange={(v) => updateFilter('fieldSlug', v === 'all' ? '' : v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder={isHebrew ? 'בחר תחום' : 'Select field'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isHebrew ? 'כל התחומים' : 'All fields'}</SelectItem>
                  {JOB_FIELDS.map((field) => (<SelectItem key={field.slug} value={field.slug}>{isHebrew ? field.name_he : field.name_en}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full lg:w-48">
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />{isHebrew ? 'תפקיד' : 'Role'}</Label>
              <Select value={filters.roleSlug || 'all'} onValueChange={(v) => updateFilter('roleSlug', v === 'all' ? '' : v)} disabled={!filters.fieldSlug}>
                <SelectTrigger className="h-9"><SelectValue placeholder={isHebrew ? 'בחר תפקיד' : 'Select role'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isHebrew ? 'כל התפקידים' : 'All roles'}</SelectItem>
                  {availableRoles.map((role) => (<SelectItem key={role.slug} value={role.slug}>{isHebrew ? role.name_he : role.name_en}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full lg:w-44">
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" />{isHebrew ? 'רמת ותק' : 'Experience'}</Label>
              <Select value={filters.experienceLevelSlug || 'all'} onValueChange={(v) => updateFilter('experienceLevelSlug', v === 'all' ? '' : v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder={isHebrew ? 'בחר רמה' : 'Select level'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isHebrew ? 'כל הרמות' : 'All levels'}</SelectItem>
                  {EXPERIENCE_LEVELS.map((level) => (<SelectItem key={level.slug} value={level.slug}>{isHebrew ? level.name_he : level.name_en}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Location + GPS */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="w-full lg:w-44">
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{isHebrew ? 'מיקום' : 'Location'}</Label>
              <Select value={filters.location || 'all'} onValueChange={(v) => updateFilter('location', v === 'all' ? '' : v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder={isHebrew ? 'בחר מיקום' : 'Select'} /></SelectTrigger>
                <SelectContent>{LOCATIONS.map((loc) => (<SelectItem key={loc.value} value={loc.value}>{isHebrew ? loc.labelHe : loc.labelEn}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="w-full lg:w-auto">
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1"><Navigation className="w-3.5 h-3.5" />{isHebrew ? 'מיקום GPS' : 'GPS Location'}</Label>
              <div className="flex gap-2">
                <Button variant={filters.userLatitude ? 'secondary' : 'outline'} size="sm" className="h-9 gap-2" onClick={handleGetLocation} disabled={isLoadingLocation}>
                  {isLoadingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                  {filters.userLatitude ? (isHebrew ? 'מיקום פעיל' : 'Location Active') : (isHebrew ? 'השתמש במיקום שלי' : 'Use My Location')}
                </Button>
                {filters.userLatitude && <Button variant="ghost" size="sm" className="h-9 px-2" onClick={clearLocation}><X className="w-4 h-4" /></Button>}
              </div>
            </div>
          </div>

          {filters.userLatitude && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center justify-between">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{isHebrew ? 'מרחק מקסימלי' : 'Maximum Distance'}</span>
                <span className="font-medium text-foreground">{filters.maxDistance} {isHebrew ? 'ק"מ' : 'km'}</span>
              </Label>
              <Slider value={[filters.maxDistance]} onValueChange={(v) => updateFilter('maxDistance', v[0])} min={5} max={100} step={5} className="w-full" />
            </div>
          )}

          {/* Row 4: Industry, Type, Salary, Source */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="w-full lg:w-48">
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{isHebrew ? 'ענף' : 'Industry'}</Label>
              <Select value={filters.industry || 'all'} onValueChange={(v) => updateFilter('industry', v === 'all' ? '' : v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder={isHebrew ? 'בחר ענף' : 'Select industry'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isHebrew ? 'כל הענפים' : 'All industries'}</SelectItem>
                  {INDUSTRIES.map((ind) => (<SelectItem key={ind.value} value={ind.value}>{isHebrew ? ind.labelHe : ind.labelEn}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full lg:w-40">
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />{isHebrew ? 'סוג משרה' : 'Job Type'}</Label>
              <Select value={filters.jobType || 'all'} onValueChange={(v) => updateFilter('jobType', v === 'all' ? '' : v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder={isHebrew ? 'בחר סוג' : 'Select'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isHebrew ? 'כל הסוגים' : 'All types'}</SelectItem>
                  {JOB_TYPES.map((type) => (<SelectItem key={type.value} value={type.value}>{isHebrew ? type.labelHe : type.labelEn}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full lg:w-48">
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />{isHebrew ? 'טווח שכר' : 'Salary Range'}</Label>
              <Select value={filters.salaryRange || 'any'} onValueChange={(v) => updateFilter('salaryRange', v === 'any' ? '' : v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder={isHebrew ? 'בחר טווח' : 'Select range'} /></SelectTrigger>
                <SelectContent>{SALARY_RANGES.map((range) => (<SelectItem key={range.value} value={range.value}>{isHebrew ? range.labelHe : range.labelEn}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="w-full lg:w-40">
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1"><Globe className="w-3.5 h-3.5" />{isHebrew ? 'מקור' : 'Source'}</Label>
              <Select value={filters.source || 'all'} onValueChange={(v) => updateFilter('source', v === 'all' ? '' : v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder={isHebrew ? 'הכל' : 'All'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isHebrew ? 'הכל' : 'All'}</SelectItem>
                  <SelectItem value="alljobs">AllJobs</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full lg:w-36">
              <Select value={filters.seniority || 'all'} onValueChange={(v) => updateFilter('seniority', v === 'all' ? '' : v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder={isHebrew ? 'סניוריטי' : 'Seniority'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isHebrew ? 'כל הרמות' : 'All levels'}</SelectItem>
                  <SelectItem value="intern">{isHebrew ? 'סטז׳' : 'Intern'}</SelectItem>
                  <SelectItem value="junior">{isHebrew ? 'ג׳וניור' : 'Junior'}</SelectItem>
                  <SelectItem value="mid">{isHebrew ? 'מיד' : 'Mid'}</SelectItem>
                  <SelectItem value="senior">{isHebrew ? 'סניור' : 'Senior'}</SelectItem>
                  <SelectItem value="lead">{isHebrew ? 'ליד' : 'Lead'}</SelectItem>
                  <SelectItem value="manager">{isHebrew ? 'מנהל' : 'Manager'}</SelectItem>
                  <SelectItem value="director">{isHebrew ? 'דירקטור' : 'Director'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full lg:w-36">
              <Select value={filters.remoteType || 'all'} onValueChange={(v) => updateFilter('remoteType', v === 'all' ? '' : v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder={isHebrew ? 'עבודה מרחוק' : 'Remote'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isHebrew ? 'הכל' : 'All'}</SelectItem>
                  <SelectItem value="remote">{isHebrew ? 'מרחוק' : 'Remote'}</SelectItem>
                  <SelectItem value="hybrid">{isHebrew ? 'היברידי' : 'Hybrid'}</SelectItem>
                  <SelectItem value="onsite">{isHebrew ? 'פיזי' : 'On-site'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {hasActiveFilters && (
              <div className="flex items-end">
                <Button variant="ghost" size="sm" onClick={onClearFilters} className="gap-1 text-muted-foreground hover:text-foreground h-9">
                  <X className="w-4 h-4" />{isHebrew ? 'נקה' : 'Clear'}
                </Button>
              </div>
            )}
          </div>

          {activeFilterChips}
        </div>
      </CardContent>
    </Card>
  );
}
