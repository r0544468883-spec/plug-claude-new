import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
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

interface StarGuideProps {
  onPracticeCategory?: (categoryTitle: string) => void;
}

export function StarGuide({ onPracticeCategory }: StarGuideProps) {
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleCategory = (id: string) => {
    setExpandedCategory(expandedCategory === id ? null : id);
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
            const Icon = cat.icon;
            return (
              <Card key={cat.id} className="bg-card border-border">
                <CardContent className="p-0">
                  {/* Header — always visible */}
                  <button
                    className="w-full p-5 flex items-center gap-4 text-start hover:bg-muted/30 transition-colors rounded-xl"
                    onClick={() => toggleCategory(cat.id)}
                  >
                    <div className={`w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center shrink-0`}>
                      <Icon className={`w-5 h-5 ${cat.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold">{isRTL ? cat.titleHe : cat.titleEn}</h4>
                      <p className="text-xs text-muted-foreground truncate">{isRTL ? cat.descHe : cat.descEn}</p>
                    </div>
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
                          {cat.questions.map((q, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-primary font-bold text-xs mt-0.5">{i + 1}.</span>
                              <span>{isRTL ? q.he : q.en}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* STAR Template */}
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
                              const template = isRTL ? cat.templateHe : cat.templateEn;
                              const text = `S: ${template.s}\nT: ${template.t}\nA: ${template.a}\nR: ${template.r}`;
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
                          const template = isRTL ? cat.templateHe : cat.templateEn;
                          const labels: Record<string, string> = isRTL
                            ? { s: 'S — מצב:', t: 'T — משימה:', a: 'A — פעולה:', r: 'R — תוצאה:' }
                            : { s: 'S — Situation:', t: 'T — Task:', a: 'A — Action:', r: 'R — Result:' };
                          return (
                            <div key={key} className="text-sm">
                              <span className="font-semibold text-primary">{labels[key]}</span>{' '}
                              <span className="text-muted-foreground italic">{template[key]}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Practice this category button */}
                      {onPracticeCategory && (
                        <Button
                          onClick={() => onPracticeCategory(isRTL ? cat.titleHe : cat.titleEn)}
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
