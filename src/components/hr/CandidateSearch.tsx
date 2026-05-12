import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Search, X, UserSearch, Lock, Star, BookmarkPlus, BookmarkCheck, ExternalLink, Mail, MessageSquare, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

interface CandidateResult {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  title: string | null;
  experience_years: number | null;
  cv_data: any;
  matchScore: number;
  matchingSkills: string[];
}

export function CandidateSearch() {
  const { user, profile } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const navigate = useNavigate();

  const isPremium = (profile as any)?.is_hr_premium === true;

  const [jobTitle, setJobTitle] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [experienceLevel, setExperienceLevel] = useState<string>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<CandidateResult[] | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(20);
  const [searchError, setSearchError] = useState(false);

  const addSkill = (skill: string) => {
    const s = skill.trim();
    if (!s || requiredSkills.includes(s) || requiredSkills.length >= 10) return;
    setRequiredSkills(prev => [...prev, s]);
    setSkillInput('');
  };

  const removeSkill = (skill: string) => setRequiredSkills(prev => prev.filter(s => s !== skill));

  const handleSkillKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill(skillInput);
    }
  };

  const handleSearch = useCallback(async () => {
    if (!user || requiredSkills.length === 0) return;

    if (!isPremium) {
      toast.error(isHebrew ? 'נדרש חשבון פרימיום' : 'Premium account required');
      return;
    }

    setIsSearching(true);
    try {
      let query = supabase
        .from('profiles')
        .select('id, full_name, avatar_url, title, experience_years, cv_data')
        .eq('visible_to_hr', true)
        .eq('role', 'job_seeker')
        .neq('id', user.id);

      if (experienceLevel !== 'all') {
        const [minY, maxY] = {
          junior: [0, 2],
          mid: [2, 5],
          senior: [5, 100],
        }[experienceLevel] ?? [0, 100];
        query = query.gte('experience_years', minY).lte('experience_years', maxY);
      }

      const { data, error } = await query.limit(200);
      if (error) throw error;

      const skillsLower = requiredSkills.map(s => s.toLowerCase());

      const scored: CandidateResult[] = ((data ?? []) as any[]).map(p => {
        const technical: string[] = (p.cv_data as any)?.skills?.technical ?? [];
        const soft: string[] = (p.cv_data as any)?.skills?.soft ?? [];
        const allSkills = [...technical, ...soft].map(s => s.toLowerCase());
        const matchingSkills = requiredSkills.filter(s => allSkills.includes(s.toLowerCase()));
        const score = Math.round((matchingSkills.length / skillsLower.length) * 100);
        return { ...p, matchScore: score, matchingSkills };
      })
      .filter(p => p.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);

      setResults(scored);
      setVisibleCount(20);
      setSearchError(false);

      if (scored.length === 0) {
        toast.info(isHebrew ? 'לא נמצאו מועמדים מתאימים' : 'No matching candidates found');
      }
    } catch (err) {
      console.error(err);
      setSearchError(true);
      toast.error(isHebrew ? 'שגיאה בחיפוש' : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  }, [user, requiredSkills, experienceLevel, isPremium, isHebrew]);

  const handleSave = async (candidateId: string) => {
    if (!user) return;
    if (savedIds.has(candidateId)) return;

    const { error } = await supabase
      .from('talent_pool_saved' as any)
      .insert({ hr_user_id: user.id, candidate_id: candidateId })
      .single();

    if (!error) {
      setSavedIds(prev => new Set([...prev, candidateId]));
      toast.success(isHebrew ? 'נשמר לרשימה' : 'Saved to pool');
    } else if ((error as any)?.code === '23505') {
      toast.info(isHebrew ? 'כבר ברשימה' : 'Already saved');
    }
  };

  const getScoreColor = (score: number) =>
    score >= 70 ? 'bg-green-500 text-white' : score >= 40 ? 'bg-yellow-500 text-white' : 'bg-muted text-muted-foreground';

  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  if (!isPremium) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold">{isHebrew ? 'חיפוש מועמדים — פרימיום' : 'Candidate Search — Premium'}</h2>
          <p className="text-muted-foreground max-w-sm">
            {isHebrew
              ? 'חפש מועמדים מכל המאגר לפי כישורים, ניסיון ותחום. זמין לחשבונות פרימיום בלבד.'
              : 'Search all candidates by skills, experience and field. Available for premium accounts only.'}
          </p>
          <div className="space-y-3 w-full max-w-xs">
            <div className="text-sm text-muted-foreground space-y-2">
              {[
                isHebrew ? 'חיפוש לפי כישורים ורמת ניסיון' : 'Search by skills and experience level',
                isHebrew ? 'ציון התאמה חכם למועמדים' : 'Smart candidate match scoring',
                isHebrew ? 'שמירה למאגר מועמדים' : 'Save to talent pool',
                isHebrew ? 'גישה ישירה לפרופיל מועמד' : 'Direct access to candidate profile',
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
            <Button className="w-full gap-2" onClick={() => setShowUpgradeDialog(true)}>
              <Star className="w-4 h-4" />
              {isHebrew ? 'שדרג לפרימיום' : 'Upgrade to Premium'}
            </Button>
          </div>
        </div>

        <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
          <DialogContent className="sm:max-w-md" dir={isHebrew ? 'rtl' : 'ltr'}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-primary" />
                {isHebrew ? 'שדרוג לפרימיום' : 'Upgrade to Premium'}
              </DialogTitle>
              <DialogDescription>
                {isHebrew
                  ? 'לגישה מלאה למאגר המועמדים, צור איתנו קשר ונחזור אלייך תוך 24 שעות.'
                  : 'For full access to the candidate pool, contact us and we\'ll get back to you within 24 hours.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <a
                href="mailto:support@plug-hr.com?subject=Premium%20Upgrade%20Request"
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <Mail className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">support@plug-hr.com</p>
                  <p className="text-xs text-muted-foreground">{isHebrew ? 'שלח מייל' : 'Send email'}</p>
                </div>
              </a>
              <a
                href="https://wa.me/972544468883?text=Hi%2C%20I%27d%20like%20to%20upgrade%20to%20PLUG%20Premium"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <MessageSquare className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium">WhatsApp</p>
                  <p className="text-xs text-muted-foreground">{isHebrew ? 'שלח הודעה' : 'Send message'}</p>
                </div>
              </a>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
                {isHebrew ? 'סגור' : 'Close'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="space-y-6" dir={isHebrew ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <UserSearch className="w-6 h-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold">{isHebrew ? 'חיפוש מועמדים' : 'Candidate Search'}</h2>
          <p className="text-sm text-muted-foreground">
            {isHebrew ? 'מצא מועמדים מתאימים מכל המאגר' : 'Find matching candidates from the entire pool'}
          </p>
        </div>
      </div>

      {/* Search form */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{isHebrew ? 'כותרת המשרה (אופציונלי)' : 'Job Title (optional)'}</Label>
              <Input
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
                placeholder={isHebrew ? 'למשל: Full Stack Developer' : 'e.g. Full Stack Developer'}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{isHebrew ? 'רמת ניסיון' : 'Experience Level'}</Label>
              <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isHebrew ? 'כל הרמות' : 'All Levels'}</SelectItem>
                  <SelectItem value="junior">{isHebrew ? 'ג\'וניור (0-2 שנים)' : 'Junior (0-2 yrs)'}</SelectItem>
                  <SelectItem value="mid">{isHebrew ? 'מיד (2-5 שנים)' : 'Mid (2-5 yrs)'}</SelectItem>
                  <SelectItem value="senior">{isHebrew ? 'סניור (5+ שנים)' : 'Senior (5+ yrs)'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>{isHebrew ? 'כישורים נדרשים *' : 'Required Skills *'}</Label>
              {requiredSkills.length >= 2 && (
                <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" onClick={() => setRequiredSkills([])}>
                  {isHebrew ? 'נקה הכל' : 'Clear all'}
                </Button>
              )}
            </div>
            {requiredSkills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {requiredSkills.map(s => (
                  <Badge key={s} variant="secondary" className="gap-1 pe-1">
                    {s}
                    <button onClick={() => removeSkill(s)} className="hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <Input
              value={skillInput}
              onChange={e => setSkillInput(e.target.value)}
              onKeyDown={handleSkillKeyDown}
              placeholder={isHebrew ? 'הקלד כישור ולחץ Enter...' : 'Type a skill and press Enter...'}
              disabled={requiredSkills.length >= 10}
            />
          </div>

          <Button
            onClick={handleSearch}
            disabled={isSearching || requiredSkills.length === 0}
            className="w-full gap-2"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {isHebrew ? 'חפש מועמדים' : 'Search Candidates'}
          </Button>
        </CardContent>
      </Card>

      {/* Search loading skeleton */}
      {isSearching && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      )}

      {/* Search error state */}
      {searchError && !isSearching && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-5 flex flex-col items-center gap-3 text-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
            <p className="text-sm font-medium">
              {isHebrew ? 'החיפוש נכשל. אנא נסה שוב.' : 'Search failed. Please try again.'}
            </p>
            <Button variant="outline" size="sm" onClick={handleSearch} className="gap-2">
              <Search className="w-4 h-4" />
              {isHebrew ? 'נסה שוב' : 'Retry'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results !== null && !isSearching && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {isHebrew ? `נמצאו ${results.length} מועמדים` : `Found ${results.length} candidates`}
            </p>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setResults(null); setVisibleCount(20); }}>
              {isHebrew ? 'חיפוש חדש' : 'New search'}
            </Button>
          </div>
          {results.slice(0, visibleCount).map(candidate => (
            <Card key={candidate.id} className="plug-card-hover">
              <CardContent className="p-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <Avatar className="w-12 h-12 flex-shrink-0">
                    <AvatarImage src={candidate.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {(candidate.full_name || '?').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{candidate.full_name || (isHebrew ? 'משתמש' : 'User')}</span>
                      <Badge className={`text-xs ${getScoreColor(candidate.matchScore)}`}>
                        {candidate.matchScore}% {isHebrew ? 'התאמה' : 'match'}
                      </Badge>
                      {candidate.experience_years != null && (
                        <span className="text-xs text-muted-foreground">
                          {candidate.experience_years} {isHebrew ? 'שנות ניסיון' : 'yrs exp'}
                        </span>
                      )}
                    </div>
                    {candidate.title && (
                      <p className="text-sm text-muted-foreground">{candidate.title}</p>
                    )}
                    {candidate.matchingSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {candidate.matchingSkills.slice(0, 5).map(s => (
                          <Badge key={s} variant="outline" className="text-xs px-1.5 py-0 h-4 text-green-600 border-green-500/30 bg-green-500/10">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 mt-2 sm:mt-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title={isHebrew ? 'שמור לרשימה' : 'Save to pool'}
                      onClick={() => handleSave(candidate.id)}
                    >
                      {savedIds.has(candidate.id)
                        ? <BookmarkCheck className="w-4 h-4 text-primary" />
                        : <BookmarkPlus className="w-4 h-4" />
                      }
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1"
                      onClick={() => navigate(`/p/${candidate.id}`)}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {isHebrew ? 'פרופיל' : 'Profile'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {results.length > visibleCount && (
            <Button variant="outline" className="w-full" onClick={() => setVisibleCount(prev => prev + 20)}>
              {isHebrew ? `הצג עוד (${results.length - visibleCount} נוספים)` : `Show more (${results.length - visibleCount} remaining)`}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
