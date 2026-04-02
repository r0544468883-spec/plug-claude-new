import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCredits } from '@/contexts/CreditsContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Target,
  Users,
  Lightbulb,
  Trophy,
  TrendingDown,
  Wrench,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Check,
  Play,
  X,
  Save,
  Sparkles,
  Loader2,
  Star,
  Zap,
} from 'lucide-react';

interface StoryCategory {
  id: string;
  icon: React.ElementType;
  titleHe: string;
  titleEn: string;
  descHe: string;
  descEn: string;
  color: string;
  questions: { he: string; en: string }[];
  templateHe: { s: string; t: string; a: string; r: string };
  templateEn: { s: string; t: string; a: string; r: string };
}

interface AIFeedback {
  score: number;
  feedback: string;
  dimensions?: { substance: number; structure: number; relevance: number; credibility: number; differentiation: number };
  priorityMove?: string;
}

const storyCategories: StoryCategory[] = [
  {
    id: 'leadership',
    icon: Target,
    titleHe: 'מנהיגות',
    titleEn: 'Leadership',
    descHe: 'סיפורים על הובלת צוות, קבלת החלטות קשות, וניהול קונפליקטים',
    descEn: 'Stories about leading teams, making tough decisions, and managing conflicts',
    color: 'text-blue-500',
    questions: [
      { he: 'ספר על פעם שהובלת צוות דרך אתגר', en: 'Tell me about a time you led a team through a challenge' },
      { he: 'תאר מצב שבו קיבלת החלטה לא פופולרית', en: 'Describe a situation where you made an unpopular decision' },
      { he: 'איך פיתחת חברי צוות?', en: 'How have you developed team members?' },
      { he: 'ספר על התמודדות עם חבר צוות קשה', en: 'Tell me about dealing with a difficult team member' },
    ],
    templateHe: {
      s: 'כשהייתי [תפקיד] ב[חברה], הצוות שלי התמודד עם [אתגר]...',
      t: 'הייתי אחראי/ת ל[משימה ספציפית]...',
      a: 'הובלתי את הצוות ב[פעולה 1], [פעולה 2], ו[פעולה 3]...',
      r: 'בזכות זה, השגנו [תוצאה מספרית] — לדוגמה שיפור של X% ב...',
    },
    templateEn: {
      s: 'When I was [role] at [company], my team was facing [challenge]...',
      t: 'I was responsible for [specific task]...',
      a: 'I led the team by [action 1], [action 2], and [action 3]...',
      r: 'As a result, we achieved [quantified outcome] — e.g., X% improvement in...',
    },
  },
  {
    id: 'problem-solving',
    icon: Wrench,
    titleHe: 'פתרון בעיות',
    titleEn: 'Problem Solving',
    descHe: 'סיפורים על פתרון בעיות מורכבות, תיקון תהליכים, והתמודדות עם מכשולים',
    descEn: 'Stories about solving complex problems, fixing processes, and handling obstacles',
    color: 'text-amber-500',
    questions: [
      { he: 'תאר בעיה מורכבת שפתרת', en: 'Describe a complex problem you solved' },
      { he: 'ספר על מצב שלא הלך לפי התוכנית', en: 'Tell me about when something didn\'t go as planned' },
      { he: 'איך אתה ניגש לבעיות עם מידע חלקי?', en: 'How do you approach problems with incomplete information?' },
      { he: 'תן דוגמה לפתרון חדשני שפיתחת', en: 'Give an example of an innovative solution you developed' },
    ],
    templateHe: {
      s: 'גילינו ש[בעיה/תקלה] שגרמה ל[השפעה שלילית]...',
      t: 'נדרשתי ל[מטרה] תוך [מגבלת זמן/משאבים]...',
      a: 'חקרתי את [שורש הבעיה], ואז [פעולה 1] ו[פעולה 2]...',
      r: 'הפתרון הוביל ל[תוצאה] — לדוגמה חיסכון של X שעות/שקלים ב...',
    },
    templateEn: {
      s: 'We discovered that [problem/issue] was causing [negative impact]...',
      t: 'I needed to [goal] within [time/resource constraint]...',
      a: 'I investigated [root cause], then [action 1] and [action 2]...',
      r: 'The solution led to [outcome] — e.g., saving X hours/dollars in...',
    },
  },
  {
    id: 'collaboration',
    icon: Users,
    titleHe: 'שיתוף פעולה',
    titleEn: 'Collaboration',
    descHe: 'סיפורים על עבודה עם אנשים קשים, בניית קונצנזוס, והשפעה ללא סמכות',
    descEn: 'Stories about working with difficult people, building consensus, and influencing without authority',
    color: 'text-green-500',
    questions: [
      { he: 'ספר על עבודה עם מישהו קשה', en: 'Tell me about working with someone difficult' },
      { he: 'תאר מצב שבו השפעת ללא סמכות רשמית', en: 'Describe influencing someone without authority' },
      { he: 'איך אתה מתמודד עם חילוקי דעות?', en: 'How do you handle disagreements with colleagues?' },
      { he: 'ספר על פרויקט חוצה-צוותים מוצלח', en: 'Tell me about a successful cross-functional project' },
    ],
    templateHe: {
      s: 'בפרויקט [X], הייתי צריך לעבוד עם [צד/צוות] שהיה [אתגר]...',
      t: 'המטרה שלי הייתה [ליישר/להגיע להסכמה על]...',
      a: 'יזמתי [פגישה/שיחה], הקשבתי ל[דאגות שלהם], והצעתי [פשרה/פתרון]...',
      r: 'הצלחנו ל[תוצאה] ומאז שיתוף הפעולה [השתפר/המשיך]...',
    },
    templateEn: {
      s: 'On project [X], I needed to work with [party/team] who was [challenge]...',
      t: 'My goal was to [align/reach agreement on]...',
      a: 'I initiated [meeting/conversation], listened to [their concerns], and proposed [compromise/solution]...',
      r: 'We managed to [outcome] and the collaboration [improved/continued]...',
    },
  },
  {
    id: 'achievements',
    icon: Trophy,
    titleHe: 'הישגים',
    titleEn: 'Achievements',
    descHe: 'סיפורים על חריגה מיעדים, עבודה תחת לחץ, ויוזמה עצמית',
    descEn: 'Stories about exceeding goals, working under pressure, and taking initiative',
    color: 'text-purple-500',
    questions: [
      { he: 'מה ההישג המקצועי שאתה הכי גאה בו?', en: 'What\'s your proudest professional accomplishment?' },
      { he: 'ספר על פעם שחרגת מהציפיות', en: 'Tell me about a time you exceeded expectations' },
      { he: 'תאר מטרה שהשגת נגד כל הסיכויים', en: 'Describe a goal you achieved against the odds' },
      { he: 'מה ההשפעה הגדולה ביותר שעשית בקריירה?', en: 'What\'s the biggest impact you\'ve had in your career?' },
    ],
    templateHe: {
      s: 'ב[חברה/פרויקט], היעד היה [X] אבל [מכשול/אתגר]...',
      t: 'לקחתי על עצמי ל[משימה] למרות ש[קושי]...',
      a: 'עבדתי על [פעולה 1], יזמתי [פעולה 2], ו[פעולה 3]...',
      r: 'לא רק שהשגתי את היעד, אלא חרגתי ב-X% — ו[השפעה ארוכת טווח]...',
    },
    templateEn: {
      s: 'At [company/project], the target was [X] but [obstacle/challenge]...',
      t: 'I took on [task] despite [difficulty]...',
      a: 'I worked on [action 1], initiated [action 2], and [action 3]...',
      r: 'Not only did I hit the target, I exceeded it by X% — and [long-term impact]...',
    },
  },
  {
    id: 'failure-growth',
    icon: TrendingDown,
    titleHe: 'כישלונות וצמיחה',
    titleEn: 'Failure & Growth',
    descHe: 'סיפורים על טעויות, קבלת ביקורת, ולמידה מכישלון',
    descEn: 'Stories about mistakes, receiving criticism, and learning from failure',
    color: 'text-red-500',
    questions: [
      { he: 'ספר על פעם שנכשלת', en: 'Tell me about a time you failed' },
      { he: 'מה הטעות הגדולה ביותר שעשית בעבודה?', en: 'What\'s the biggest mistake you\'ve made at work?' },
      { he: 'איך אתה מתמודד עם ביקורת?', en: 'How do you handle criticism?' },
      { he: 'מה היית עושה אחרת בקריירה שלך?', en: 'What would you do differently in your career?' },
    ],
    templateHe: {
      s: '[מה קרה] — תאר את המצב בכנות...',
      t: 'הייתי אחראי/ת ל[X] ו[מה השתבש]...',
      a: 'אחרי שהבנתי את הטעות, [מה עשית לתקן] ו[מה למדת]...',
      r: 'מאז, שיניתי את הגישה שלי ל[שינוי] — ובעקבות זה [תוצאה חיובית]...',
    },
    templateEn: {
      s: '[What happened] — describe the situation honestly...',
      t: 'I was responsible for [X] and [what went wrong]...',
      a: 'After recognizing the mistake, [what you did to fix it] and [what you learned]...',
      r: 'Since then, I changed my approach to [change] — and as a result [positive outcome]...',
    },
  },
];

const STAR_STORAGE_KEY = 'plug-star-practice';

interface StarAnswers {
  s: string;
  t: string;
  a: string;
  r: string;
}

type SavedStories = Record<string, Record<number, StarAnswers>>;

function loadSavedStories(): SavedStories {
  try {
    return JSON.parse(localStorage.getItem(STAR_STORAGE_KEY) || '{}');
  } catch { return {}; }
}

function saveSavedStories(stories: SavedStories) {
  localStorage.setItem(STAR_STORAGE_KEY, JSON.stringify(stories));
}

export function StarGuide() {
  const { language } = useLanguage();
  const { deductCredits, canAfford, getCost } = useCredits();
  const isRTL = language === 'he';
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Inline practice state
  const [practicingCategory, setPracticingCategory] = useState<string | null>(null);
  const [practiceQuestionIndex, setPracticeQuestionIndex] = useState(0);
  const [starAnswers, setStarAnswers] = useState<StarAnswers>({ s: '', t: '', a: '', r: '' });
  const [savedStories] = useState<SavedStories>(() => loadSavedStories());

  // AI feedback state
  const [aiFeedback, setAiFeedback] = useState<AIFeedback | null>(null);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);

  const feedbackCost = getCost('AI_INTERVIEW');

  const toggleCategory = (id: string) => {
    setExpandedCategory(expandedCategory === id ? null : id);
  };

  const startPractice = (categoryId: string, questionIndex: number = 0) => {
    setPracticingCategory(categoryId);
    setPracticeQuestionIndex(questionIndex);
    setAiFeedback(null);
    const saved = loadSavedStories();
    const existing = saved[categoryId]?.[questionIndex];
    setStarAnswers(existing || { s: '', t: '', a: '', r: '' });
  };

  const closePractice = () => {
    setPracticingCategory(null);
    setPracticeQuestionIndex(0);
    setStarAnswers({ s: '', t: '', a: '', r: '' });
    setAiFeedback(null);
  };

  const handleSaveStory = () => {
    if (!practicingCategory) return;
    const hasContent = starAnswers.s.trim() || starAnswers.t.trim() || starAnswers.a.trim() || starAnswers.r.trim();
    if (!hasContent) {
      toast.error(isRTL ? 'כתוב לפחות חלק אחד מהתשובה' : 'Write at least one part of the answer');
      return;
    }
    const stories = loadSavedStories();
    if (!stories[practicingCategory]) stories[practicingCategory] = {};
    stories[practicingCategory][practiceQuestionIndex] = { ...starAnswers };
    saveSavedStories(stories);
    toast.success(isRTL ? 'הסיפור נשמר!' : 'Story saved!');
  };

  const handleCopyFull = () => {
    const labels = isRTL
      ? { s: 'מצב:', t: 'משימה:', a: 'פעולה:', r: 'תוצאה:' }
      : { s: 'Situation:', t: 'Task:', a: 'Action:', r: 'Result:' };
    const text = `S — ${labels.s}\n${starAnswers.s}\n\nT — ${labels.t}\n${starAnswers.t}\n\nA — ${labels.a}\n${starAnswers.a}\n\nR — ${labels.r}\n${starAnswers.r}`;
    navigator.clipboard.writeText(text);
    toast.success(isRTL ? 'תשובה הועתקה' : 'Answer copied');
  };

  const switchQuestion = (categoryId: string, qIndex: number) => {
    if (practicingCategory) {
      const hasContent = starAnswers.s.trim() || starAnswers.t.trim() || starAnswers.a.trim() || starAnswers.r.trim();
      if (hasContent) {
        const stories = loadSavedStories();
        if (!stories[practicingCategory]) stories[practicingCategory] = {};
        stories[practicingCategory][practiceQuestionIndex] = { ...starAnswers };
        saveSavedStories(stories);
      }
    }
    setPracticeQuestionIndex(qIndex);
    setAiFeedback(null);
    const saved = loadSavedStories();
    const existing = saved[categoryId]?.[qIndex];
    setStarAnswers(existing || { s: '', t: '', a: '', r: '' });
  };

  // AI Feedback
  const handleGetAIFeedback = async (cat: StoryCategory) => {
    const fullAnswer = `Situation: ${starAnswers.s}\nTask: ${starAnswers.t}\nAction: ${starAnswers.a}\nResult: ${starAnswers.r}`;
    if (!starAnswers.s.trim() && !starAnswers.t.trim() && !starAnswers.a.trim() && !starAnswers.r.trim()) {
      toast.error(isRTL ? 'כתוב את התשובה לפני בקשת משוב' : 'Write your answer before requesting feedback');
      return;
    }

    if (!canAfford(feedbackCost)) {
      toast.error(isRTL ? 'אין מספיק דלק. עבור לדף הקרדיטים.' : 'Not enough fuel. Go to Credits.');
      return;
    }

    const result = await deductCredits('ai_interview');
    if (!result.success) {
      if (!result.error?.toLowerCase().includes('cancel')) {
        toast.error(isRTL ? 'שגיאה בניכוי קרדיטים' : 'Credit deduction failed');
      }
      return;
    }

    setIsLoadingFeedback(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const question = cat.questions[practiceQuestionIndex];

      const res = await fetch(`${supabaseUrl}/functions/v1/interview-answer-feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${session?.access_token || anonKey}`,
        },
        body: JSON.stringify({
          question: isRTL ? question.he : question.en,
          answer: fullAnswer,
          category: 'behavioral',
          language,
          jobTitle: '',
          seniority: 'mid',
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAiFeedback(data);
    } catch {
      toast.error(isRTL ? 'שגיאה בקבלת משוב AI' : 'Error getting AI feedback');
    } finally {
      setIsLoadingFeedback(false);
    }
  };

  // Render AI feedback panel
  const renderFeedback = () => {
    if (!aiFeedback) return null;
    const sc = aiFeedback.score;
    const scoreCls = sc >= 7 ? 'text-green-500' : sc >= 4 ? 'text-yellow-500' : 'text-red-500';
    const bgCls = sc >= 7 ? 'border-green-500/30 bg-green-500/5' : sc >= 4 ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-red-500/30 bg-red-500/5';

    const dimLabels: { key: keyof NonNullable<AIFeedback['dimensions']>; he: string; en: string }[] = [
      { key: 'substance', he: 'תוכן', en: 'Substance' },
      { key: 'structure', he: 'מבנה', en: 'Structure' },
      { key: 'relevance', he: 'רלוונטיות', en: 'Relevance' },
      { key: 'credibility', he: 'אמינות', en: 'Credibility' },
      { key: 'differentiation', he: 'ייחודיות', en: 'Differentiation' },
    ];

    return (
      <div className={`rounded-lg border-2 p-4 space-y-3 ${bgCls}`}>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`text-xl font-bold ${scoreCls}`}>{sc}/10</span>
          <div className="flex gap-0.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <Star key={i} className={`w-3 h-3 ${i < sc ? scoreCls : 'text-muted-foreground/30'}`} fill={i < sc ? 'currentColor' : 'none'} />
            ))}
          </div>
          <span className="text-xs text-muted-foreground ms-auto flex items-center gap-1">
            <Sparkles className="w-3 h-3" />{isRTL ? 'משוב AI' : 'AI Feedback'}
          </span>
        </div>

        {aiFeedback.dimensions && (
          <div className="space-y-1.5">
            {dimLabels.map(({ key, he, en }) => {
              const val = aiFeedback.dimensions![key];
              const barCls = val >= 4 ? 'bg-green-500' : val >= 3 ? 'bg-yellow-500' : 'bg-red-500';
              return (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-20 shrink-0 text-end">{isRTL ? he : en}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${barCls}`} style={{ width: `${(val / 5) * 100}%` }} />
                  </div>
                  <span className="text-xs font-semibold w-5 text-end">{val}</span>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-sm leading-relaxed">{aiFeedback.feedback}</p>

        {aiFeedback.priorityMove && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/15">
            <Target className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-primary mb-0.5">{isRTL ? 'מהלך עדיפות:' : 'Priority Move:'}</p>
              <p className="text-sm text-muted-foreground">{aiFeedback.priorityMove}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render inline practice panel
  const renderPracticePanel = (cat: StoryCategory) => {
    const question = cat.questions[practiceQuestionIndex];
    const template = isRTL ? cat.templateHe : cat.templateEn;
    const starParts = [
      { key: 's' as const, letter: 'S', labelHe: 'Situation — מצב', labelEn: 'Situation', color: 'border-blue-500/30 bg-blue-500/5', textColor: 'text-blue-600' },
      { key: 't' as const, letter: 'T', labelHe: 'Task — משימה', labelEn: 'Task', color: 'border-amber-500/30 bg-amber-500/5', textColor: 'text-amber-600' },
      { key: 'a' as const, letter: 'A', labelHe: 'Action — פעולה', labelEn: 'Action', color: 'border-green-500/30 bg-green-500/5', textColor: 'text-green-600' },
      { key: 'r' as const, letter: 'R', labelHe: 'Result — תוצאה', labelEn: 'Result', color: 'border-purple-500/30 bg-purple-500/5', textColor: 'text-purple-600' },
    ];

    const saved = loadSavedStories();

    return (
      <div className="mt-4 space-y-4 border-t border-primary/20 pt-4">
        {/* Practice header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-semibold">{isRTL ? 'תרגול STAR' : 'STAR Practice'}</h4>
          </div>
          <Button variant="ghost" size="sm" onClick={closePractice} className="h-7 w-7 p-0">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Question selector */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">
            {isRTL ? 'בחר שאלה לתרגול:' : 'Choose a question to practice:'}
          </p>
          <div className="flex flex-wrap gap-2">
            {cat.questions.map((_, i) => {
              const hasSaved = !!saved[cat.id]?.[i];
              return (
                <button
                  key={i}
                  onClick={() => switchQuestion(cat.id, i)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                    i === practiceQuestionIndex
                      ? 'bg-primary text-primary-foreground border-primary'
                      : hasSaved
                        ? 'bg-green-500/10 border-green-500/30 text-green-600 hover:bg-green-500/20'
                        : 'bg-muted/50 border-border hover:border-primary/50'
                  }`}
                >
                  {hasSaved && i !== practiceQuestionIndex && <Check className="w-3 h-3 inline me-1" />}
                  {isRTL ? `שאלה ${i + 1}` : `Q${i + 1}`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected question */}
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
          <p className="text-sm font-medium">{isRTL ? question.he : question.en}</p>
        </div>

        {/* STAR structured fields */}
        <div className="space-y-3">
          {starParts.map((part) => (
            <div key={part.key} className={`rounded-lg border p-3 ${part.color}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`font-black text-lg ${part.textColor}`}>{part.letter}</span>
                <span className={`text-xs font-semibold ${part.textColor}`}>
                  {isRTL ? part.labelHe : part.labelEn}
                </span>
              </div>
              <Textarea
                value={starAnswers[part.key]}
                onChange={(e) => setStarAnswers(prev => ({ ...prev, [part.key]: e.target.value }))}
                placeholder={template[part.key]}
                rows={2}
                className="bg-background/80 border-0 text-sm resize-none focus-visible:ring-1"
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button onClick={handleSaveStory} variant="outline" className="flex-1 gap-2" size="sm">
            <Save className="w-4 h-4" />
            {isRTL ? 'שמור' : 'Save'}
          </Button>
          <Button variant="outline" onClick={handleCopyFull} size="sm" className="gap-2">
            <Copy className="w-4 h-4" />
            {isRTL ? 'העתק' : 'Copy'}
          </Button>
          <Button
            onClick={() => handleGetAIFeedback(cat)}
            disabled={isLoadingFeedback}
            className="flex-1 gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground"
            size="sm"
          >
            {isLoadingFeedback ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {isRTL ? 'משוב AI' : 'AI Feedback'}
            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-white/20">
              <Zap className="w-2.5 h-2.5 me-0.5" />{feedbackCost}
            </Badge>
          </Button>
        </div>

        {/* AI Feedback result */}
        {isLoadingFeedback && (
          <div className="text-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">{isRTL ? 'מנתח את התשובה שלך...' : 'Analyzing your answer...'}</p>
          </div>
        )}
        {renderFeedback()}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* STAR Explanation */}
      <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <CardContent className="p-6">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            {isRTL ? 'שיטת STAR' : 'The STAR Method'}
          </h3>
          <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
            {isRTL
              ? 'שיטת STAR היא מבנה מוכח לתשובות על שאלות התנהגותיות בראיונות עבודה. היא עוזרת לך לספר סיפור ממוקד, ברור ומשכנע.'
              : 'The STAR method is a proven structure for answering behavioral interview questions. It helps you tell a focused, clear, and compelling story.'}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {([
              { letter: 'S', labelHe: 'Situation', labelEn: 'Situation', descHe: 'הקשר — 1-2 משפטים', descEn: 'Set context — 1-2 sentences', color: 'bg-blue-500/10 border-blue-500/20 text-blue-600' },
              { letter: 'T', labelHe: 'Task', labelEn: 'Task', descHe: 'אחריות — משפט אחד', descEn: 'Your responsibility — 1 sentence', color: 'bg-amber-500/10 border-amber-500/20 text-amber-600' },
              { letter: 'A', labelHe: 'Action', labelEn: 'Action', descHe: 'מה עשית — 2-3 משפטים', descEn: 'What YOU did — 2-3 sentences', color: 'bg-green-500/10 border-green-500/20 text-green-600' },
              { letter: 'R', labelHe: 'Result', labelEn: 'Result', descHe: 'תוצאה + מספרים', descEn: 'Outcome with metrics', color: 'bg-purple-500/10 border-purple-500/20 text-purple-600' },
            ] as const).map((step) => (
              <div key={step.letter} className={`rounded-xl border p-4 text-center ${step.color}`}>
                <div className="text-2xl font-black mb-1">{step.letter}</div>
                <div className="text-xs font-semibold mb-1">{isRTL ? step.labelHe : step.labelEn}</div>
                <div className="text-xs opacity-75">{isRTL ? step.descHe : step.descEn}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Timing Guide */}
      <Card className="bg-card border-border">
        <CardContent className="p-5">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            {isRTL ? 'כמה זמן לכל גרסה?' : 'How long for each version?'}
          </h4>
          <div className="grid grid-cols-3 gap-3">
            {([
              { timeHe: '2 דקות', timeEn: '2 min', labelHe: 'גרסה מלאה', labelEn: 'Full version', descHe: 'כל הפרטים + מספרים', descEn: 'All details + metrics' },
              { timeHe: '60 שניות', timeEn: '60 sec', labelHe: 'גרסה קצרה', labelEn: 'Short version', descHe: 'עיקרי הדברים בלבד', descEn: 'Key points only' },
              { timeHe: '15 שניות', timeEn: '15 sec', labelHe: 'משפט אחד', labelEn: 'One-liner', descHe: 'תמצית לכשצריך', descEn: 'Quick summary when needed' },
            ] as const).map((v, i) => (
              <div key={i} className="rounded-lg bg-muted/40 p-3 text-center">
                <Badge variant="secondary" className="mb-2">{isRTL ? v.timeHe : v.timeEn}</Badge>
                <p className="text-sm font-semibold">{isRTL ? v.labelHe : v.labelEn}</p>
                <p className="text-xs text-muted-foreground">{isRTL ? v.descHe : v.descEn}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Story Categories */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          {isRTL ? '5 קטגוריות סיפורים שחייבים להכין' : '5 Story Categories You Must Prepare'}
        </h3>
        <div className="space-y-3">
          {storyCategories.map((cat) => {
            const isExpanded = expandedCategory === cat.id;
            const isPracticing = practicingCategory === cat.id;
            const Icon = cat.icon;
            const saved = savedStories[cat.id] || {};
            const savedCount = Object.keys(saved).length;
            return (
              <Card key={cat.id} className={`bg-card border-border ${isPracticing ? 'border-primary/40 ring-1 ring-primary/20' : ''}`}>
                <CardContent className="p-0">
                  {/* Header */}
                  <button
                    className="w-full p-5 flex items-center gap-4 text-start hover:bg-muted/30 transition-colors rounded-xl"
                    onClick={() => toggleCategory(cat.id)}
                  >
                    <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
                      <Icon className={`w-5 h-5 ${cat.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold">{isRTL ? cat.titleHe : cat.titleEn}</h4>
                      <p className="text-xs text-muted-foreground truncate">{isRTL ? cat.descHe : cat.descEn}</p>
                    </div>
                    {savedCount > 0 && (
                      <Badge variant="secondary" className="shrink-0 text-xs bg-green-500/10 text-green-600 border-green-500/20">
                        {savedCount}/{cat.questions.length}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {cat.questions.length} {isRTL ? 'שאלות' : 'Q\'s'}
                    </Badge>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
                      {/* Common questions */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">
                          {isRTL ? 'שאלות נפוצות בקטגוריה:' : 'Common questions in this category:'}
                        </p>
                        <ul className="space-y-1.5">
                          {cat.questions.map((q, i) => {
                            const hasSaved = !!loadSavedStories()[cat.id]?.[i];
                            return (
                              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                <span className="text-primary font-bold text-xs mt-0.5">{i + 1}.</span>
                                <span className="flex-1">{isRTL ? q.he : q.en}</span>
                                {hasSaved && <Check className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />}
                                {!isPracticing && (
                                  <button
                                    onClick={() => startPractice(cat.id, i)}
                                    className="text-primary text-xs hover:underline shrink-0"
                                  >
                                    {isRTL ? 'תרגל' : 'Practice'}
                                  </button>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>

                      {/* STAR Template */}
                      {!isPracticing && (
                        <div className="rounded-lg bg-muted/30 border border-border p-4 space-y-2">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                              <Lightbulb className="w-3.5 h-3.5 text-primary" />
                              {isRTL ? 'תבנית תשובה:' : 'Answer template:'}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs gap-1.5"
                              onClick={() => {
                                const tpl = isRTL ? cat.templateHe : cat.templateEn;
                                const text = `S: ${tpl.s}\nT: ${tpl.t}\nA: ${tpl.a}\nR: ${tpl.r}`;
                                navigator.clipboard.writeText(text);
                                setCopiedId(cat.id);
                                toast.success(isRTL ? 'תבנית הועתקה' : 'Template copied');
                                setTimeout(() => setCopiedId(null), 2000);
                              }}
                            >
                              {copiedId === cat.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                              {copiedId === cat.id ? (isRTL ? 'הועתק' : 'Copied') : (isRTL ? 'העתק' : 'Copy')}
                            </Button>
                          </div>
                          {(['s', 't', 'a', 'r'] as const).map((key) => {
                            const tpl = isRTL ? cat.templateHe : cat.templateEn;
                            const labels: Record<string, string> = isRTL
                              ? { s: 'S — מצב:', t: 'T — משימה:', a: 'A — פעולה:', r: 'R — תוצאה:' }
                              : { s: 'S — Situation:', t: 'T — Task:', a: 'A — Action:', r: 'R — Result:' };
                            return (
                              <div key={key} className="text-sm">
                                <span className="font-semibold text-primary">{labels[key]}</span>{' '}
                                <span className="text-muted-foreground italic">{tpl[key]}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Practice button or inline practice panel */}
                      {isPracticing ? (
                        renderPracticePanel(cat)
                      ) : (
                        <Button
                          onClick={() => startPractice(cat.id)}
                          className="w-full gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground"
                        >
                          <Play className="w-4 h-4" />
                          {isRTL ? `תתאמן על ${cat.titleHe}` : `Practice ${cat.titleEn}`}
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
