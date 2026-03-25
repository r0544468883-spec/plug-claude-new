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
import { Loader2, Search, X, UserSearch, Lock, Star, BookmarkPlus, BookmarkCheck, ExternalLink } from 'lucide-react';
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
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 20);

      setResults(scored);

      if (scored.length === 0) {
        toast.info(isHebrew ? 'לא נמצאו מועמדים מתאימים' : 'No matching candidates found');
      }
    } catch (err) {
      console.error(err);
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

  if (!isPremium) {
    return (
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
        <Button className="gap-2" onClick={() => toast.info(isHebrew ? 'צור קשר לשדרוג' : 'Contact us to upgrade')}>
          <Star className="w-4 h-4" />
          {isHebrew ? 'שדרג לפרימיום' : 'Upgrade to Premium'}
        </Button>
      </div>
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
            <Label>{isHebrew ? 'כישורים נדרשים *' : 'Required Skills *'}</Label>
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

      {/* Results */}
      {results !== null && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {isHebrew ? `נמצאו ${results.length} מועמדים` : `Found ${results.length} candidates`}
          </p>
          {results.map(candidate => (
            <Card key={candidate.id} className="plug-card-hover">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
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

                  <div className="flex items-center gap-2 flex-shrink-0">
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
        </div>
      )}
    </div>
  );
}
