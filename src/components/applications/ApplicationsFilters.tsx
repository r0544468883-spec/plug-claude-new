import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export type StatusFilter = 'all' | 'active' | 'withdrawn' | 'rejected' | 'accepted';
export type StageFilter = 'all' | 'applied' | 'screening' | 'interview' | 'technical' | 'offer';
export type SortOption = 'newest' | 'oldest' | 'match_score';

interface ApplicationsFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;
  stageFilter: StageFilter;
  onStageChange: (value: StageFilter) => void;
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
}

export function ApplicationsFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  stageFilter,
  onStageChange,
  sortBy,
  onSortChange,
}: ApplicationsFiltersProps) {
  const { language, t } = useLanguage();

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: language === 'he' ? 'הכל' : 'All Status' },
    { value: 'active', label: language === 'he' ? 'פעיל' : 'Active' },
    { value: 'withdrawn', label: language === 'he' ? 'בוטל' : 'Withdrawn' },
    { value: 'rejected', label: language === 'he' ? 'נדחה' : 'Rejected' },
    { value: 'accepted', label: language === 'he' ? 'התקבל' : 'Accepted' },
  ];

  const stageOptions: { value: StageFilter; label: string }[] = [
    { value: 'all', label: language === 'he' ? 'כל השלבים' : 'All Stages' },
    { value: 'applied', label: language === 'he' ? 'הוגש' : 'Applied' },
    { value: 'screening', label: language === 'he' ? 'סינון' : 'Screening' },
    { value: 'interview', label: language === 'he' ? 'ראיון' : 'Interview' },
    { value: 'technical', label: language === 'he' ? 'טכני' : 'Technical' },
    { value: 'offer', label: language === 'he' ? 'הצעה' : 'Offer' },
  ];

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'newest', label: language === 'he' ? 'החדש ביותר' : 'Newest First' },
    { value: 'oldest', label: language === 'he' ? 'הישן ביותר' : 'Oldest First' },
    { value: 'match_score', label: language === 'he' ? 'ציון התאמה' : 'Match Score' },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('applications.searchPlaceholder') || 'Search by job or company...'}
          className="pl-10 bg-card border-border"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[140px] bg-card border-border">
            <SelectValue placeholder={t('applications.status') || 'Status'} />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={stageFilter} onValueChange={onStageChange}>
          <SelectTrigger className="w-[140px] bg-card border-border">
            <SelectValue placeholder={t('applications.stage') || 'Stage'} />
          </SelectTrigger>
          <SelectContent>
            {stageOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-[150px] bg-card border-border">
            <SelectValue placeholder={t('applications.sortBy') || 'Sort By'} />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
