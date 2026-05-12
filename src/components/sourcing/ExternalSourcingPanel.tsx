import { useState, useRef, KeyboardEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  Linkedin,
  Github,
  Globe,
  MessageSquare,
  ExternalLink,
  UserPlus,
  Loader2,
  AlertCircle,
  Users,
  TrendingUp,
  Database,
  X,
  MapPin,
  Briefcase,
  Star,
  Filter,
  ChevronDown,
  CheckCircle2,
  Building2,
  Twitter,
  BookOpen,
  Rocket,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

type SourceKey = 'linkedin' | 'github' | 'stackoverflow' | 'twitter' | 'angellist' | 'personal';

interface SourceConfig {
  key: SourceKey;
  labelEn: string;
  labelHe: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  connected: boolean;
}

interface ExternalProfile {
  id: string;
  sourced_by: string;
  source: SourceKey;
  external_url: string | null;
  external_id: string | null;
  full_name: string;
  headline: string | null;
  location: string | null;
  skills: string[] | null;
  experience_years: number | null;
  current_company: string | null;
  current_title: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  raw_data: Record<string, unknown> | null;
  match_score: number | null;
  linked_profile_id: string | null;
  created_at?: string;
}

interface SearchFilters {
  keywords: string;
  skills: string[];
  location: string;
  expMin: string;
  expMax: string;
  currentCompany: string;
}

interface SourcingStats {
  total: number;
  bySource: Record<SourceKey, number>;
  linkedCount: number;
}

// ─── Source Configs ───────────────────────────────────────────────────────────

const SOURCE_CONFIGS: SourceConfig[] = [
  {
    key: 'linkedin',
    labelEn: 'LinkedIn',
    labelHe: 'LinkedIn',
    color: '#0A66C2',
    bgColor: 'bg-[#0A66C2]',
    icon: <Linkedin className="w-3.5 h-3.5" />,
    connected: true,
  },
  {
    key: 'github',
    labelEn: 'GitHub',
    labelHe: 'GitHub',
    color: '#171515',
    bgColor: 'bg-[#171515]',
    icon: <Github className="w-3.5 h-3.5" />,
    connected: true,
  },
  {
    key: 'stackoverflow',
    labelEn: 'Stack Overflow',
    labelHe: 'Stack Overflow',
    color: '#F48024',
    bgColor: 'bg-[#F48024]',
    icon: <BookOpen className="w-3.5 h-3.5" />,
    connected: false,
  },
  {
    key: 'twitter',
    labelEn: 'Twitter / X',
    labelHe: 'Twitter / X',
    color: '#000000',
    bgColor: 'bg-black',
    icon: <Twitter className="w-3.5 h-3.5" />,
    connected: false,
  },
  {
    key: 'angellist',
    labelEn: 'AngelList',
    labelHe: 'AngelList',
    color: '#000000',
    bgColor: 'bg-neutral-800',
    icon: <Rocket className="w-3.5 h-3.5" />,
    connected: false,
  },
  {
    key: 'personal',
    labelEn: 'Personal Sites',
    labelHe: 'אתרים אישיים',
    color: '#7C3AED',
    bgColor: 'bg-violet-600',
    icon: <Globe className="w-3.5 h-3.5" />,
    connected: true,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getSourceConfig(key: SourceKey): SourceConfig {
  return SOURCE_CONFIGS.find((s) => s.key === key) ?? SOURCE_CONFIGS[0];
}

function getScoreBadgeClass(score: number): string {
  if (score >= 85) return 'bg-green-500/10 text-green-600 border-green-500/20';
  if (score >= 60) return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
  return 'bg-muted text-muted-foreground border-border';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SourceToggle({
  config,
  active,
  onToggle,
  isRTL,
}: {
  config: SourceConfig;
  active: boolean;
  onToggle: () => void;
  isRTL: boolean;
}) {
  const isHe = isRTL;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all min-h-[44px] select-none',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/40'
      )}
    >
      <span
        className={cn(
          'w-6 h-6 rounded-full flex items-center justify-center text-white flex-shrink-0',
          config.bgColor
        )}
      >
        {config.icon}
      </span>
      <span>{isHe ? config.labelHe : config.labelEn}</span>
      <span
        className={cn(
          'text-xs px-1.5 py-0.5 rounded-full',
          config.connected
            ? 'bg-green-500/10 text-green-600'
            : 'bg-yellow-500/10 text-yellow-600'
        )}
      >
        {config.connected
          ? isHe ? 'מחובר' : 'Connected'
          : isHe ? 'נדרש API' : 'API Key Required'}
      </span>
    </button>
  );
}

function SkillTagInput({
  skills,
  onChange,
  isRTL,
}: {
  skills: string[];
  onChange: (skills: string[]) => void;
  isRTL: boolean;
}) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addSkill = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !skills.includes(trimmed)) {
      onChange([...skills, trimmed]);
    }
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill(input);
    } else if (e.key === 'Backspace' && !input && skills.length > 0) {
      onChange(skills.slice(0, -1));
    }
  };

  const removeSkill = (skill: string) => {
    onChange(skills.filter((s) => s !== skill));
  };

  return (
    <div
      className="flex flex-wrap gap-1.5 min-h-[44px] p-2 border border-input rounded-md bg-background cursor-text focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
      onClick={() => inputRef.current?.focus()}
    >
      {skills.map((skill) => (
        <span
          key={skill}
          className="flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-1 rounded-full"
        >
          {skill}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeSkill(skill); }}
            className="hover:text-destructive transition-colors"
            aria-label={isRTL ? `הסר ${skill}` : `Remove ${skill}`}
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (input) addSkill(input); }}
        placeholder={
          skills.length === 0
            ? isRTL ? 'הוסף כישורים (Enter לאישור)' : 'Add skills (press Enter)'
            : ''
        }
        className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        aria-label={isRTL ? 'הוסף כישור' : 'Add skill'}
      />
    </div>
  );
}

function ProfileCard({
  profile,
  isRTL,
  onSave,
  onMessage,
  isSaving,
  isSaved,
}: {
  profile: ExternalProfile;
  isRTL: boolean;
  onSave: () => void;
  onMessage: () => void;
  isSaving: boolean;
  isSaved: boolean;
}) {
  const config = getSourceConfig(profile.source);
  const displaySkills = (profile.skills ?? []).slice(0, 5);
  const extraSkills = (profile.skills ?? []).length - displaySkills.length;

  return (
    <Card className="bg-card border-border hover:border-primary/30 transition-colors flex flex-col">
      <CardContent className="p-4 flex flex-col gap-3 flex-1">
        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
            style={{ backgroundColor: config.color }}
            aria-hidden="true"
          >
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              getInitials(profile.full_name)
            )}
          </div>

          {/* Name / headline */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{profile.full_name}</h3>
            {profile.headline && (
              <p className="text-xs text-muted-foreground truncate">{profile.headline}</p>
            )}
          </div>

          {/* Match score */}
          {profile.match_score != null && (
            <Badge
              variant="outline"
              className={cn('font-bold text-xs flex-shrink-0', getScoreBadgeClass(profile.match_score))}
            >
              <Star className="w-3 h-3 mr-0.5" />
              {profile.match_score}%
            </Badge>
          )}
        </div>

        {/* Meta: location + company */}
        <div className="flex flex-col gap-1">
          {profile.location && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{profile.location}</span>
            </div>
          )}
          {(profile.current_company || profile.current_title) && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Building2 className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">
                {[profile.current_title, profile.current_company].filter(Boolean).join(' @ ')}
              </span>
            </div>
          )}
          {profile.experience_years != null && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Briefcase className="w-3 h-3 flex-shrink-0" />
              <span>
                {profile.experience_years}{' '}
                {isRTL ? 'שנות ניסיון' : 'yrs experience'}
              </span>
            </div>
          )}
        </div>

        {/* Skills */}
        {displaySkills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {displaySkills.map((skill) => (
              <Badge key={skill} variant="secondary" className="text-xs px-2 py-0.5">
                {skill}
              </Badge>
            ))}
            {extraSkills > 0 && (
              <Badge variant="outline" className="text-xs px-2 py-0.5 text-muted-foreground">
                +{extraSkills}
              </Badge>
            )}
          </div>
        )}

        {/* Source badge */}
        <div className="flex items-center justify-between mt-auto">
          <span
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-full text-white"
            style={{ backgroundColor: config.color }}
          >
            {config.icon}
            {isRTL ? config.labelHe : config.labelEn}
          </span>
          {profile.linked_profile_id && (
            <Badge variant="outline" className="text-xs text-green-600 border-green-500/20 bg-green-500/10">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              {isRTL ? 'ב-PLUG' : 'In PLUG'}
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          {isSaved ? (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5 bg-green-500/10 text-green-600 border-green-500/20 cursor-default"
              disabled
            >
              <CheckCircle2 className="w-4 h-4" />
              {isRTL ? 'נשמר' : 'Saved'}
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="flex-1 gap-1.5"
              onClick={onSave}
              disabled={isSaving}
              aria-label={isRTL ? 'שמור לבריכת כישרונות' : 'Save to Talent Pool'}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {isRTL ? 'שמור' : 'Save'}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={onMessage}
            aria-label={isRTL ? 'שלח הודעה' : 'Send Message'}
          >
            <MessageSquare className="w-4 h-4" />
          </Button>

          {profile.external_url && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => window.open(profile.external_url!, '_blank', 'noopener,noreferrer')}
              aria-label={isRTL ? 'צפה בפרופיל חיצוני' : 'View External Profile'}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SavedProfileRow({
  profile,
  isRTL,
  onImport,
  isImporting,
  isImported,
}: {
  profile: ExternalProfile;
  isRTL: boolean;
  onImport: () => void;
  isImporting: boolean;
  isImported: boolean;
}) {
  const config = getSourceConfig(profile.source);

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:border-primary/20 transition-colors">
      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
        style={{ backgroundColor: config.color }}
        aria-hidden="true"
      >
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full rounded-full object-cover" />
        ) : (
          getInitials(profile.full_name)
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{profile.full_name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {[profile.current_title, profile.current_company].filter(Boolean).join(' @ ')}
        </p>
      </div>

      {/* Source badge */}
      <span
        className="hidden sm:flex items-center gap-1 text-xs px-2 py-1 rounded-full text-white flex-shrink-0"
        style={{ backgroundColor: config.color }}
      >
        {config.icon}
        {isRTL ? config.labelHe : config.labelEn}
      </span>

      {/* Import */}
      {isImported || profile.linked_profile_id ? (
        <Badge variant="outline" className="text-xs text-green-600 border-green-500/20 bg-green-500/10 flex-shrink-0">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          {isRTL ? 'יובא' : 'Imported'}
        </Badge>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 flex-shrink-0"
          onClick={onImport}
          disabled={isImporting}
          aria-label={isRTL ? 'ייבא ל-PLUG' : 'Import to PLUG'}
        >
          {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          {isRTL ? 'ייבא' : 'Import'}
        </Button>
      )}

      {profile.external_url && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.open(profile.external_url!, '_blank', 'noopener,noreferrer')}
          aria-label={isRTL ? 'פתח קישור חיצוני' : 'Open external link'}
          className="flex-shrink-0"
        >
          <ExternalLink className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}

// ─── Message Dialog ────────────────────────────────────────────────────────────

function MessageDialog({
  profile,
  isRTL,
  open,
  onOpenChange,
}: {
  profile: ExternalProfile | null;
  isRTL: boolean;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (!message.trim()) return;
    toast.success(
      isRTL
        ? `הודעה נשמרה לטיוטה עבור ${profile?.full_name}`
        : `Message saved as draft for ${profile?.full_name}`
    );
    setMessage('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle>
            {isRTL ? `שלח הודעה ל-${profile?.full_name}` : `Send Message to ${profile?.full_name}`}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Label htmlFor="sourcing-message">
            {isRTL ? 'הודעה' : 'Message'}
          </Label>
          <textarea
            id="sourcing-message"
            className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            placeholder={
              isRTL
                ? 'כתוב הודעת גיוס...'
                : 'Write your outreach message...'
            }
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        <DialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isRTL ? 'ביטול' : 'Cancel'}
          </Button>
          <Button onClick={handleSend} disabled={!message.trim()}>
            {isRTL ? 'שמור טיוטה' : 'Save Draft'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const PAGE_SIZE = 12;

export function ExternalSourcingPanel() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const queryClient = useQueryClient();

  // Source toggles
  const [activeSources, setActiveSources] = useState<Set<SourceKey>>(
    new Set(['linkedin', 'github', 'personal'])
  );

  // Search filters
  const [filters, setFilters] = useState<SearchFilters>({
    keywords: '',
    skills: [],
    location: '',
    expMin: '',
    expMax: '',
    currentCompany: '',
  });

  // Search state
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [page, setPage] = useState(0);
  const [resultProfiles, setResultProfiles] = useState<ExternalProfile[]>([]);

  // Saved tab filter
  const [savedSourceFilter, setSavedSourceFilter] = useState<string>('all');

  // Message dialog
  const [messageTarget, setMessageTarget] = useState<ExternalProfile | null>(null);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);

  // Track saving / saved / importing / imported per profile
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [importingIds, setImportingIds] = useState<Set<string>>(new Set());
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());

  // ── Query: search results ──────────────────────────────────────────────────

  const {
    data: searchData,
    isLoading: isSearching,
    error: searchError,
    refetch: runSearch,
  } = useQuery({
    queryKey: ['external-sourcing-search', user?.id, filters, Array.from(activeSources), page],
    queryFn: async () => {
      if (!user?.id) return { profiles: [], total: 0 };

      let query = (supabase as any)
        .from('external_source_profiles')
        .select('*', { count: 'exact' })
        .eq('sourced_by', user.id)
        .in('source', Array.from(activeSources))
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
        .order('match_score', { ascending: false, nullsFirst: false });

      if (filters.keywords) {
        query = query.or(
          `full_name.ilike.%${filters.keywords}%,headline.ilike.%${filters.keywords}%,current_title.ilike.%${filters.keywords}%`
        );
      }
      if (filters.location) {
        query = query.ilike('location', `%${filters.location}%`);
      }
      if (filters.currentCompany) {
        query = query.ilike('current_company', `%${filters.currentCompany}%`);
      }
      if (filters.expMin) {
        query = query.gte('experience_years', parseInt(filters.expMin, 10));
      }
      if (filters.expMax) {
        query = query.lte('experience_years', parseInt(filters.expMax, 10));
      }
      if (filters.skills.length > 0) {
        query = query.overlaps('skills', filters.skills);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      return { profiles: (data ?? []) as ExternalProfile[], total: count ?? 0 };
    },
    enabled: searchTriggered && !!user?.id && activeSources.size > 0,
  });

  // ── Query: saved profiles ──────────────────────────────────────────────────

  const { data: savedData, isLoading: isSavedLoading } = useQuery({
    queryKey: ['external-sourcing-saved', user?.id, savedSourceFilter],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = (supabase as any)
        .from('external_source_profiles')
        .select('*')
        .eq('sourced_by', user.id)
        .order('created_at', { ascending: false });

      if (savedSourceFilter !== 'all') {
        query = query.eq('source', savedSourceFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ExternalProfile[];
    },
    enabled: !!user?.id,
  });

  // ── Query: stats ───────────────────────────────────────────────────────────

  const { data: stats } = useQuery<SourcingStats>({
    queryKey: ['external-sourcing-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return { total: 0, bySource: {} as Record<SourceKey, number>, linkedCount: 0 };

      const { data, error } = await (supabase as any)
        .from('external_source_profiles')
        .select('source, linked_profile_id')
        .eq('sourced_by', user.id);

      if (error) throw error;

      const rows = (data ?? []) as { source: SourceKey; linked_profile_id: string | null }[];
      const bySource = {} as Record<SourceKey, number>;
      SOURCE_CONFIGS.forEach((s) => { bySource[s.key] = 0; });
      rows.forEach((r) => { bySource[r.source] = (bySource[r.source] ?? 0) + 1; });

      return {
        total: rows.length,
        bySource,
        linkedCount: rows.filter((r) => r.linked_profile_id).length,
      };
    },
    enabled: !!user?.id,
  });

  // ── Mutation: save to talent pool ─────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async (profileId: string) => {
      // Mark as "saved" — in a real flow this might set a flag or copy to talent_pool table
      const { error } = await (supabase as any)
        .from('external_source_profiles')
        .update({ raw_data: { saved_to_talent_pool: true } })
        .eq('id', profileId)
        .eq('sourced_by', user!.id);
      if (error) throw error;
    },
    onSuccess: (_, profileId) => {
      setSavedIds((prev) => new Set([...prev, profileId]));
      toast.success(isRTL ? 'הפרופיל נשמר לבריכת הכישרונות' : 'Profile saved to Talent Pool');
      queryClient.invalidateQueries({ queryKey: ['external-sourcing-saved'] });
      queryClient.invalidateQueries({ queryKey: ['external-sourcing-stats'] });
    },
    onError: () => {
      toast.error(isRTL ? 'שגיאה בשמירת הפרופיל' : 'Failed to save profile');
    },
  });

  // ── Mutation: import to PLUG ───────────────────────────────────────────────

  const importMutation = useMutation({
    mutationFn: async (profile: ExternalProfile) => {
      // Create a PLUG profile entry linked to this external profile
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          full_name: profile.full_name,
          email: profile.email ?? null,
          phone: profile.phone ?? null,
          linkedin_url: profile.source === 'linkedin' ? profile.external_url : null,
          github_url: profile.source === 'github' ? profile.external_url : null,
        } as any)
        .select('id')
        .single();

      if (profileError) throw profileError;

      // Link back
      await (supabase as any)
        .from('external_source_profiles')
        .update({ linked_profile_id: (newProfile as any).id })
        .eq('id', profile.id)
        .eq('sourced_by', user!.id);

      return (newProfile as any).id;
    },
    onSuccess: (_, profile) => {
      setImportedIds((prev) => new Set([...prev, profile.id]));
      toast.success(isRTL ? 'הפרופיל יובא ל-PLUG בהצלחה' : 'Profile imported to PLUG successfully');
      queryClient.invalidateQueries({ queryKey: ['external-sourcing-saved'] });
    },
    onError: () => {
      toast.error(isRTL ? 'שגיאה בייבוא הפרופיל' : 'Failed to import profile');
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  const toggleSource = (key: SourceKey) => {
    setActiveSources((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSearch = () => {
    setPage(0);
    setResultProfiles([]);
    setSearchTriggered(true);
    // Force refetch even if queryKey hasn't changed
    setTimeout(() => runSearch(), 0);
  };

  const handleLoadMore = () => {
    setPage((p) => p + 1);
  };

  const handleSave = async (profile: ExternalProfile) => {
    setSavingIds((prev) => new Set([...prev, profile.id]));
    try {
      await saveMutation.mutateAsync(profile.id);
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(profile.id);
        return next;
      });
    }
  };

  const handleImport = async (profile: ExternalProfile) => {
    setImportingIds((prev) => new Set([...prev, profile.id]));
    try {
      await importMutation.mutateAsync(profile);
    } finally {
      setImportingIds((prev) => {
        const next = new Set(prev);
        next.delete(profile.id);
        return next;
      });
    }
  };

  const openMessage = (profile: ExternalProfile) => {
    setMessageTarget(profile);
    setMessageDialogOpen(true);
  };

  // Merge pages
  const allResults: ExternalProfile[] = searchData
    ? page === 0
      ? searchData.profiles
      : [...resultProfiles, ...searchData.profiles]
    : resultProfiles;

  const totalResults = searchData?.total ?? 0;
  const hasMore = allResults.length < totalResults;

  const conversionRate =
    stats && stats.total > 0
      ? Math.round((stats.linkedCount / stats.total) * 100)
      : 0;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <Tabs defaultValue="search">
        <TabsList className="mb-4" aria-label={isRTL ? 'לשוניות sourcing' : 'Sourcing tabs'}>
          <TabsTrigger value="search">
            <Search className="w-4 h-4 mr-1.5" />
            {isRTL ? 'חיפוש' : 'Search'}
          </TabsTrigger>
          <TabsTrigger value="saved">
            <Users className="w-4 h-4 mr-1.5" />
            {isRTL ? 'שמורים' : 'Saved'}
            {(savedData?.length ?? 0) > 0 && (
              <Badge className="ms-1.5 text-xs" variant="secondary">
                {savedData!.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="stats">
            <TrendingUp className="w-4 h-4 mr-1.5" />
            {isRTL ? 'סטטיסטיקות' : 'Stats'}
          </TabsTrigger>
        </TabsList>

        {/* ── Section 1 + 2 + 3: Search ──────────────────────────────────── */}
        <TabsContent value="search" className="space-y-4 mt-0">

          {/* Section 1 — Source Selection */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" />
                {isRTL ? 'בחר מקורות' : 'Select Sources'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {SOURCE_CONFIGS.map((config) => (
                  <SourceToggle
                    key={config.key}
                    config={config}
                    active={activeSources.has(config.key)}
                    onToggle={() => toggleSource(config.key)}
                    isRTL={isRTL}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Section 2 — Search Panel */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="w-4 h-4 text-primary" />
                {isRTL ? 'פרמטרי חיפוש' : 'Search Parameters'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Keywords */}
                <div className="space-y-1.5">
                  <Label htmlFor="sourcing-keywords">
                    {isRTL ? 'מילות מפתח' : 'Keywords'}
                  </Label>
                  <Input
                    id="sourcing-keywords"
                    placeholder={isRTL ? 'תפקיד, טכנולוגיה...' : 'Role, technology...'}
                    value={filters.keywords}
                    onChange={(e) => setFilters((f) => ({ ...f, keywords: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="min-h-[44px]"
                  />
                </div>

                {/* Location */}
                <div className="space-y-1.5">
                  <Label htmlFor="sourcing-location">
                    {isRTL ? 'מיקום' : 'Location'}
                  </Label>
                  <Input
                    id="sourcing-location"
                    placeholder={isRTL ? 'תל אביב, ישראל...' : 'Tel Aviv, Israel...'}
                    value={filters.location}
                    onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="min-h-[44px]"
                  />
                </div>

                {/* Skills */}
                <div className="space-y-1.5 md:col-span-2">
                  <Label>{isRTL ? 'כישורים' : 'Skills'}</Label>
                  <SkillTagInput
                    skills={filters.skills}
                    onChange={(skills) => setFilters((f) => ({ ...f, skills }))}
                    isRTL={isRTL}
                  />
                </div>

                {/* Experience range */}
                <div className="space-y-1.5">
                  <Label>{isRTL ? 'שנות ניסיון (טווח)' : 'Experience Years (range)'}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      placeholder={isRTL ? 'מינ׳' : 'Min'}
                      value={filters.expMin}
                      onChange={(e) => setFilters((f) => ({ ...f, expMin: e.target.value }))}
                      className="min-h-[44px]"
                      aria-label={isRTL ? 'ניסיון מינימלי' : 'Minimum experience'}
                    />
                    <span className="text-muted-foreground text-sm">–</span>
                    <Input
                      type="number"
                      min="0"
                      placeholder={isRTL ? 'מקס׳' : 'Max'}
                      value={filters.expMax}
                      onChange={(e) => setFilters((f) => ({ ...f, expMax: e.target.value }))}
                      className="min-h-[44px]"
                      aria-label={isRTL ? 'ניסיון מקסימלי' : 'Maximum experience'}
                    />
                  </div>
                </div>

                {/* Current company */}
                <div className="space-y-1.5">
                  <Label htmlFor="sourcing-company">
                    {isRTL ? 'חברה נוכחית' : 'Current Company'}
                  </Label>
                  <Input
                    id="sourcing-company"
                    placeholder={isRTL ? 'Google, Meta...' : 'Google, Meta...'}
                    value={filters.currentCompany}
                    onChange={(e) => setFilters((f) => ({ ...f, currentCompany: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="min-h-[44px]"
                  />
                </div>
              </div>

              {/* Search button + results count */}
              <div className="flex items-center gap-3 pt-1">
                <Button
                  onClick={handleSearch}
                  disabled={isSearching || activeSources.size === 0}
                  className="gap-2 min-h-[44px]"
                  aria-label={isRTL ? 'חפש מועמדים' : 'Search candidates'}
                >
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  {isRTL ? 'חפש' : 'Search'}
                </Button>

                {searchTriggered && !isSearching && totalResults > 0 && (
                  <Badge variant="secondary" className="text-sm px-3 py-1.5">
                    {totalResults} {isRTL ? 'תוצאות' : 'results'}
                  </Badge>
                )}

                {activeSources.size === 0 && (
                  <p className="text-xs text-destructive">
                    {isRTL ? 'בחר לפחות מקור אחד' : 'Select at least one source'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Section 3 — Results Grid */}
          {isSearching && page === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="bg-card border-border">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                    <div className="flex gap-2">
                      <Skeleton className="h-7 flex-1" />
                      <Skeleton className="h-7 w-9" />
                      <Skeleton className="h-7 w-9" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {searchError && (
            <Card className="bg-card border-border">
              <CardContent className="p-8 text-center">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" aria-hidden="true" />
                <p className="text-destructive font-medium">
                  {isRTL ? 'שגיאה בטעינת תוצאות' : 'Error loading results'}
                </p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => runSearch()}>
                  {isRTL ? 'נסה שוב' : 'Retry'}
                </Button>
              </CardContent>
            </Card>
          )}

          {searchTriggered && !isSearching && !searchError && allResults.length === 0 && (
            <Card className="bg-card border-border">
              <CardContent className="p-12 text-center">
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
                <p className="font-medium text-muted-foreground">
                  {isRTL ? 'לא נמצאו פרופילים' : 'No profiles found'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isRTL
                    ? 'נסה לשנות את פרמטרי החיפוש'
                    : 'Try adjusting your search parameters'}
                </p>
              </CardContent>
            </Card>
          )}

          {!searchTriggered && (
            <Card className="bg-card border-border">
              <CardContent className="p-12 text-center">
                <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
                <p className="font-medium text-muted-foreground">
                  {isRTL
                    ? 'הגדר פרמטרי חיפוש ולחץ על חפש'
                    : 'Set search parameters and click Search'}
                </p>
              </CardContent>
            </Card>
          )}

          {allResults.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allResults.map((profile) => (
                  <ProfileCard
                    key={profile.id}
                    profile={profile}
                    isRTL={isRTL}
                    onSave={() => handleSave(profile)}
                    onMessage={() => openMessage(profile)}
                    isSaving={savingIds.has(profile.id)}
                    isSaved={savedIds.has(profile.id)}
                  />
                ))}
              </div>

              {/* Load more */}
              {hasMore && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={isSearching}
                    className="gap-2 min-h-[44px]"
                  >
                    {isSearching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                    {isRTL ? 'טען עוד' : 'Load More'}
                    <Badge variant="secondary" className="text-xs">
                      {totalResults - allResults.length}
                    </Badge>
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Section 4: Saved Profiles ───────────────────────────────────── */}
        <TabsContent value="saved" className="space-y-4 mt-0">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  {isRTL ? 'פרופילים שמורים' : 'Saved Profiles'}
                </CardTitle>

                {/* Filter by source */}
                <Select value={savedSourceFilter} onValueChange={setSavedSourceFilter}>
                  <SelectTrigger
                    className="w-[160px] min-h-[44px]"
                    aria-label={isRTL ? 'סנן לפי מקור' : 'Filter by source'}
                  >
                    <SelectValue placeholder={isRTL ? 'כל המקורות' : 'All Sources'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isRTL ? 'כל המקורות' : 'All Sources'}</SelectItem>
                    {SOURCE_CONFIGS.map((s) => (
                      <SelectItem key={s.key} value={s.key}>
                        {isRTL ? s.labelHe : s.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {isSavedLoading && (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-9 w-20" />
                    </div>
                  ))}
                </div>
              )}

              {!isSavedLoading && (savedData ?? []).length === 0 && (
                <div className="py-12 text-center">
                  <Database className="w-12 h-12 text-muted-foreground mx-auto mb-3" aria-hidden="true" />
                  <p className="text-muted-foreground">
                    {isRTL
                      ? 'אין פרופילים שמורים עדיין'
                      : 'No saved profiles yet'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isRTL
                      ? 'חפש מועמדים ושמור אותם לכאן'
                      : 'Search candidates and save them here'}
                  </p>
                </div>
              )}

              {(savedData ?? []).map((profile) => (
                <SavedProfileRow
                  key={profile.id}
                  profile={profile}
                  isRTL={isRTL}
                  onImport={() => handleImport(profile)}
                  isImporting={importingIds.has(profile.id)}
                  isImported={importedIds.has(profile.id)}
                />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Section 5: Stats ────────────────────────────────────────────── */}
        <TabsContent value="stats" className="space-y-4 mt-0">
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? 'סה"כ שנאספו' : 'Total Sourced'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-green-600" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.linkedCount ?? 0}</p>
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? 'יובאו ל-PLUG' : 'Imported to PLUG'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-accent-foreground" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{conversionRate}%</p>
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? 'שיעור המרה לבריכה' : 'Conversion Rate'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* By source breakdown */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {isRTL ? 'פירוט לפי מקור' : 'Breakdown by Source'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {SOURCE_CONFIGS.map((config) => {
                const count = stats?.bySource[config.key] ?? 0;
                const pct = stats && stats.total > 0 ? (count / stats.total) * 100 : 0;
                return (
                  <div key={config.key} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            'w-5 h-5 rounded-full flex items-center justify-center text-white',
                            config.bgColor
                          )}
                        >
                          {config.icon}
                        </span>
                        {isRTL ? config.labelHe : config.labelEn}
                      </span>
                      <span className="font-medium tabular-nums">
                        {count}
                      </span>
                    </div>
                    <div
                      className="h-2 rounded-full bg-muted overflow-hidden"
                      role="progressbar"
                      aria-valuenow={Math.round(pct)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${isRTL ? config.labelHe : config.labelEn}: ${count}`}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: config.color }}
                      />
                    </div>
                  </div>
                );
              })}

              {(stats?.total ?? 0) === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {isRTL
                    ? 'אין נתונים עדיין — התחל לחפש ולשמור פרופילים'
                    : 'No data yet — start searching and saving profiles'}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Message Dialog */}
      <MessageDialog
        profile={messageTarget}
        isRTL={isRTL}
        open={messageDialogOpen}
        onOpenChange={setMessageDialogOpen}
      />
    </div>
  );
}
