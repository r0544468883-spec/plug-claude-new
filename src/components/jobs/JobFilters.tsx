import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Search, X, MapPin, Briefcase, DollarSign, Building2, Navigation, Loader2, Layers, GraduationCap, Globe } from 'lucide-react';
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

// Industry types for filtering
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
}

interface JobFiltersProps {
  filters: JobFiltersState;
  onFiltersChange: (filters: JobFiltersState) => void;
  onClearFilters: () => void;
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

export function JobFilters({ filters, onFiltersChange, onClearFilters }: JobFiltersProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // Get available roles based on selected field
  const availableRoles = useMemo(() => {
    if (!filters.fieldSlug) return [];
    return getRolesByField(filters.fieldSlug);
  }, [filters.fieldSlug]);

  // Fetch job title suggestions based on search
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

  const updateFilter = <K extends keyof JobFiltersState>(key: K, value: JobFiltersState[K]) => {
    const newFilters = { ...filters, [key]: value };
    
    // Reset role when field changes
    if (key === 'fieldSlug') {
      newFilters.roleSlug = '';
    }
    
    onFiltersChange(newFilters);
    if (key === 'search') {
      setShowSuggestions(false);
    }
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
        onFiltersChange({
          ...filters,
          userLatitude: position.coords.latitude,
          userLongitude: position.coords.longitude,
        });
        toast.success(isHebrew ? 'המיקום התקבל!' : 'Location received!');
        setIsLoadingLocation(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error(isHebrew ? 'לא הצלחנו לקבל את המיקום שלך' : 'Could not get your location');
        setIsLoadingLocation(false);
      }
    );
  };

  const clearLocation = () => {
    onFiltersChange({
      ...filters,
      userLatitude: null,
      userLongitude: null,
      maxDistance: 25,
    });
  };

  return (
    <Card className="bg-card border-border" data-tour="job-filters">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          {/* Row 1: Search and Company */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search with Autocomplete */}
            <div className="flex-1 relative">
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                <Search className="w-3.5 h-3.5" />
                {isHebrew ? 'חיפוש משרה' : 'Search Jobs'}
              </Label>
              <Input
                placeholder={isHebrew ? 'חפש לפי שם משרה...' : 'Search by job title...'}
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                onFocus={() => filters.search.length >= 2 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="h-9"
              />
              {/* Autocomplete Suggestions */}
              {showSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-popover border border-border rounded-md shadow-lg">
                  {searchSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors first:rounded-t-md last:rounded-b-md"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Company Search */}
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                {isHebrew ? 'חברה' : 'Company'}
              </Label>
              <Input
                placeholder={isHebrew ? 'חפש לפי שם חברה...' : 'Search by company...'}
                value={filters.companySearch}
                onChange={(e) => updateFilter('companySearch', e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          {/* Row 2: Field, Role, Experience Level */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Field (תחום) */}
            <div className="w-full lg:w-48">
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                {isHebrew ? 'תחום עבודה' : 'Job Field'}
              </Label>
              <Select value={filters.fieldSlug || 'all'} onValueChange={(v) => updateFilter('fieldSlug', v === 'all' ? '' : v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={isHebrew ? 'בחר תחום' : 'Select field'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isHebrew ? 'כל התחומים' : 'All fields'}</SelectItem>
                  {JOB_FIELDS.map((field) => (
                    <SelectItem key={field.slug} value={field.slug}>
                      {isHebrew ? field.name_he : field.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Role (תפקיד) */}
            <div className="w-full lg:w-48">
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5" />
                {isHebrew ? 'תפקיד' : 'Role'}
              </Label>
              <Select 
                value={filters.roleSlug || 'all'} 
                onValueChange={(v) => updateFilter('roleSlug', v === 'all' ? '' : v)}
                disabled={!filters.fieldSlug}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={isHebrew ? 'בחר תפקיד' : 'Select role'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isHebrew ? 'כל התפקידים' : 'All roles'}</SelectItem>
                  {availableRoles.map((role) => (
                    <SelectItem key={role.slug} value={role.slug}>
                      {isHebrew ? role.name_he : role.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Experience Level (רמת ותק) */}
            <div className="w-full lg:w-44">
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5" />
                {isHebrew ? 'רמת ותק' : 'Experience'}
              </Label>
              <Select value={filters.experienceLevelSlug || 'all'} onValueChange={(v) => updateFilter('experienceLevelSlug', v === 'all' ? '' : v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={isHebrew ? 'בחר רמה' : 'Select level'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isHebrew ? 'כל הרמות' : 'All levels'}</SelectItem>
                  {EXPERIENCE_LEVELS.map((level) => (
                    <SelectItem key={level.slug} value={level.slug}>
                      {isHebrew ? level.name_he : level.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Location with GPS */}
          <div className="flex flex-col lg:flex-row gap-4">

            {/* Location */}
            <div className="w-full lg:w-44">
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {isHebrew ? 'מיקום' : 'Location'}
              </Label>
              <Select value={filters.location || 'all'} onValueChange={(v) => updateFilter('location', v === 'all' ? '' : v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={isHebrew ? 'בחר מיקום' : 'Select'} />
                </SelectTrigger>
                <SelectContent>
                  {LOCATIONS.map((loc) => (
                    <SelectItem key={loc.value} value={loc.value}>
                      {isHebrew ? loc.labelHe : loc.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* GPS Location */}
            <div className="w-full lg:w-auto">
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                <Navigation className="w-3.5 h-3.5" />
                {isHebrew ? 'מיקום GPS' : 'GPS Location'}
              </Label>
              <div className="flex gap-2">
                <Button
                  variant={filters.userLatitude ? 'secondary' : 'outline'}
                  size="sm"
                  className="h-9 gap-2"
                  onClick={handleGetLocation}
                  disabled={isLoadingLocation}
                >
                  {isLoadingLocation ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Navigation className="w-4 h-4" />
                  )}
                  {filters.userLatitude 
                    ? (isHebrew ? 'מיקום פעיל' : 'Location Active') 
                    : (isHebrew ? 'השתמש במיקום שלי' : 'Use My Location')}
                </Button>
                {filters.userLatitude && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-2"
                    onClick={clearLocation}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Distance Slider (when GPS is active) */}
          {filters.userLatitude && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {isHebrew ? 'מרחק מקסימלי' : 'Maximum Distance'}
                </span>
                <span className="font-medium text-foreground">
                  {filters.maxDistance} {isHebrew ? 'ק"מ' : 'km'}
                </span>
              </Label>
              <Slider
                value={[filters.maxDistance]}
                onValueChange={(v) => updateFilter('maxDistance', v[0])}
                min={5}
                max={100}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>5 {isHebrew ? 'ק"מ' : 'km'}</span>
                <span>100 {isHebrew ? 'ק"מ' : 'km'}</span>
              </div>
            </div>
          )}

          {/* Row 4: Job Type, Salary, Industry */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Industry */}
            <div className="w-full lg:w-48">
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                {isHebrew ? 'ענף' : 'Industry'}
              </Label>
              <Select value={filters.industry || 'all'} onValueChange={(v) => updateFilter('industry', v === 'all' ? '' : v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={isHebrew ? 'בחר ענף' : 'Select industry'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isHebrew ? 'כל הענפים' : 'All industries'}</SelectItem>
                  {INDUSTRIES.map((ind) => (
                    <SelectItem key={ind.value} value={ind.value}>
                      {isHebrew ? ind.labelHe : ind.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Job Type */}
            <div className="w-full lg:w-40">
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5" />
                {isHebrew ? 'סוג משרה' : 'Job Type'}
              </Label>
              <Select value={filters.jobType || 'all'} onValueChange={(v) => updateFilter('jobType', v === 'all' ? '' : v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={isHebrew ? 'בחר סוג' : 'Select'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isHebrew ? 'כל הסוגים' : 'All types'}</SelectItem>
                  {JOB_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {isHebrew ? type.labelHe : type.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Salary Range */}
            <div className="w-full lg:w-48">
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" />
                {isHebrew ? 'טווח שכר' : 'Salary Range'}
              </Label>
              <Select value={filters.salaryRange || 'any'} onValueChange={(v) => updateFilter('salaryRange', v === 'any' ? '' : v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={isHebrew ? 'בחר טווח' : 'Select range'} />
                </SelectTrigger>
                <SelectContent>
                  {SALARY_RANGES.map((range) => (
                    <SelectItem key={range.value} value={range.value}>
                      {isHebrew ? range.labelHe : range.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Source Filter */}
            <div className="w-full lg:w-40">
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" />
                {isHebrew ? 'מקור' : 'Source'}
              </Label>
              <Select value={filters.source || 'all'} onValueChange={(v) => updateFilter('source', v === 'all' ? '' : v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={isHebrew ? 'הכל' : 'All'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isHebrew ? 'הכל' : 'All'}</SelectItem>
                  <SelectItem value="alljobs">AllJobs</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearFilters}
                  className="gap-1 text-muted-foreground hover:text-foreground h-9"
                >
                  <X className="w-4 h-4" />
                  {isHebrew ? 'נקה' : 'Clear'}
                </Button>
              </div>
            )}
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2">
              {filters.search && (
                <Badge variant="secondary" className="gap-1">
                  {isHebrew ? 'חיפוש:' : 'Search:'} {filters.search}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => updateFilter('search', '')} 
                  />
                </Badge>
              )}
              {filters.companySearch && (
                <Badge variant="secondary" className="gap-1">
                  {isHebrew ? 'חברה:' : 'Company:'} {filters.companySearch}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => updateFilter('companySearch', '')} 
                  />
                </Badge>
              )}
              {filters.fieldSlug && (
                <Badge variant="secondary" className="gap-1">
                  <Layers className="w-3 h-3" />
                  {getFieldBySlug(filters.fieldSlug)?.[isHebrew ? 'name_he' : 'name_en']}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => updateFilter('fieldSlug', '')} 
                  />
                </Badge>
              )}
              {filters.roleSlug && (
                <Badge variant="secondary" className="gap-1">
                  {getRoleBySlug(filters.roleSlug)?.[isHebrew ? 'name_he' : 'name_en']}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => updateFilter('roleSlug', '')} 
                  />
                </Badge>
              )}
              {filters.experienceLevelSlug && (
                <Badge variant="secondary" className="gap-1">
                  <GraduationCap className="w-3 h-3" />
                  {getExperienceLevelBySlug(filters.experienceLevelSlug)?.[isHebrew ? 'name_he' : 'name_en']}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => updateFilter('experienceLevelSlug', '')} 
                  />
                </Badge>
              )}
              {filters.location && (
                <Badge variant="secondary" className="gap-1">
                  {LOCATIONS.find(l => l.value === filters.location)?.[isHebrew ? 'labelHe' : 'labelEn']}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => updateFilter('location', '')} 
                  />
                </Badge>
              )}
              {filters.userLatitude && (
                <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary border-primary/20">
                  <Navigation className="w-3 h-3" />
                  {filters.maxDistance} {isHebrew ? 'ק"מ מהמיקום שלי' : 'km from me'}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={clearLocation} 
                  />
                </Badge>
              )}
              {filters.jobType && (
                <Badge variant="secondary" className="gap-1">
                  {JOB_TYPES.find(t => t.value === filters.jobType)?.[isHebrew ? 'labelHe' : 'labelEn']}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => updateFilter('jobType', '')} 
                  />
                </Badge>
              )}
              {filters.salaryRange && filters.salaryRange !== 'any' && (
                <Badge variant="secondary" className="gap-1">
                  {SALARY_RANGES.find(r => r.value === filters.salaryRange)?.[isHebrew ? 'labelHe' : 'labelEn']}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => updateFilter('salaryRange', '')} 
                  />
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
