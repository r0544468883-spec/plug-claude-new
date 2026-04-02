import {
  Target, Clock, Users, Brain, Mic, Trophy, Briefcase, Star, Zap,
  BookOpen, Heart, Shield, Eye, MessageSquare, Lightbulb, TrendingUp,
  CheckCircle, Compass, Smartphone, Coffee,
} from 'lucide-react';

export interface StaticTip {
  icon: React.ElementType;
  titleHe: string;
  titleEn: string;
  descHe: string;
  descEn: string;
}

export const TIPS_BANK: StaticTip[] = [
  // === STAR & Structure ===
  { icon: Target, titleHe: 'שיטת STAR', titleEn: 'STAR Method', descHe: 'Situation, Task, Action, Result — מבנה מוכח לתשובות התנהגותיות שמראה חשיבה מסודרת.', descEn: 'Situation, Task, Action, Result — a proven structure for behavioral answers that shows organized thinking.' },
  { icon: Target, titleHe: 'STAR — הדגש את ה-Action', titleEn: 'STAR — Emphasize Action', descHe: 'חלק ה-Action צריך לקבל 50-60% מזמן התשובה. שם אתה מראה מה *אתה* עשית.', descEn: 'The Action part should take 50-60% of your answer time. That\'s where you show what *you* did.' },
  { icon: Target, titleHe: 'STAR — כימות התוצאה', titleEn: 'STAR — Quantify Results', descHe: 'תוצאה טובה כוללת מספרים: אחוזי שיפור, חיסכון בזמן, הכנסות, או מספר משתמשים.', descEn: 'A good result includes numbers: improvement %, time saved, revenue, or user count.' },
  { icon: Target, titleHe: 'הכן 8-10 סיפורי STAR', titleEn: 'Prepare 8-10 STAR Stories', descHe: 'הכן מגוון סיפורים מהקריירה שמכסים: הנהגה, כישלון, קונפליקט, הישג ושיתוף פעולה.', descEn: 'Prepare diverse career stories covering: leadership, failure, conflict, achievement, and collaboration.' },

  // === Time Management ===
  { icon: Clock, titleHe: 'ניהול זמן', titleEn: 'Time Management', descHe: 'שמור על תשובות של 2–3 דקות. לא קצר מדי שנראה שאין לך מה לספר, לא ארוך מדי שתאבד את תשומת הלב.', descEn: 'Keep answers 2–3 minutes. Not too short (seems like nothing to say), not too long (loses attention).' },
  { icon: Clock, titleHe: 'כלל 60 השניות', titleEn: 'The 60-Second Rule', descHe: 'אם השאלה ישירה ולא התנהגותית, ענה ב-60 שניות. ישירות = מקצועיות.', descEn: 'If the question is direct and not behavioral, answer in 60 seconds. Directness = professionalism.' },
  { icon: Clock, titleHe: 'הגע 10 דקות מוקדם', titleEn: 'Arrive 10 Minutes Early', descHe: 'הגעה מוקדמת נותנת לך זמן להירגע, לסדר מחשבות ולהתרשם מהסביבה.', descEn: 'Arriving early gives you time to settle, organize your thoughts, and observe the environment.' },
  { icon: Clock, titleHe: 'תכנן את היום', titleEn: 'Plan Your Day', descHe: 'אל תקבע ראיון אחרי פגישה מלחיצה. השאר לפחות שעה חופשית לפני הראיון.', descEn: 'Don\'t schedule an interview after a stressful meeting. Leave at least an hour free before.' },

  // === Research ===
  { icon: Users, titleHe: 'חקור את החברה', titleEn: 'Research the Company', descHe: 'הכר את הערכים, התרבות, המוצרים והחדשות האחרונות. שלב את הידע הזה בתשובותיך.', descEn: "Know the company's values, culture, products, and recent news. Weave this into your answers." },
  { icon: Users, titleHe: 'חקור את המראיין', titleEn: 'Research the Interviewer', descHe: 'בדוק את פרופיל ה-LinkedIn של המראיין. זה עוזר ליצור חיבור ולהתאים את השפה.', descEn: 'Check the interviewer\'s LinkedIn profile. It helps create rapport and adjust your language.' },
  { icon: Users, titleHe: 'הכר את המתחרים', titleEn: 'Know the Competitors', descHe: 'הכר 2-3 מתחרים של החברה והסבר למה אתה רוצה לעבוד דווקא כאן ולא שם.', descEn: 'Know 2-3 competitors and explain why you want to work here specifically, not there.' },
  { icon: Users, titleHe: 'עקוב בחדשות', titleEn: 'Follow Company News', descHe: 'חפש חדשות אחרונות, גיוסים, השקות מוצרים או כתבות על החברה. זה מרשים.', descEn: 'Search for recent news, funding rounds, product launches, or articles about the company.' },

  // === Questions to Ask ===
  { icon: Brain, titleHe: 'שאל שאלות חכמות', titleEn: 'Ask Smart Questions', descHe: 'הכן 3–5 שאלות שמראות עניין עמוק בתפקיד, בצוות ובאתגרים של החברה.', descEn: 'Prepare 3–5 questions that show genuine interest in the role, team, and company challenges.' },
  { icon: Brain, titleHe: 'שאלות על צמיחה', titleEn: 'Growth Questions', descHe: 'שאל: "מה מסלול הקידום הטיפוסי?" — זה מראה שאתה חושב לטווח ארוך.', descEn: 'Ask: "What\'s the typical career path?" — it shows you think long-term.' },
  { icon: Brain, titleHe: 'שאלות על אתגרים', titleEn: 'Challenge Questions', descHe: 'שאל: "מה האתגר הגדול ביותר שיעמוד בפניי ב-90 הימים הראשונים?" — זה מראה מוכנות.', descEn: 'Ask: "What\'s the biggest challenge I\'ll face in the first 90 days?" — shows readiness.' },
  { icon: Brain, titleHe: 'שאלות על תרבות', titleEn: 'Culture Questions', descHe: 'שאל: "מה הדבר שאתה הכי אוהב בעבודה כאן?" — תשובה כנה תגלה הרבה.', descEn: 'Ask: "What do you enjoy most about working here?" — an honest answer reveals a lot.' },

  // === Practice ===
  { icon: Mic, titleHe: 'תרגל בקול', titleEn: 'Practice Out Loud', descHe: 'אמור את התשובות בקול רם, לא רק בראש. זה חושף ניסוחים מסורבלים ובונה ביטחון.', descEn: 'Say your answers out loud, not just in your head. It reveals awkward phrasing and builds confidence.' },
  { icon: Mic, titleHe: 'הקלט את עצמך', titleEn: 'Record Yourself', descHe: 'הקלט תשובות בוידאו ותצפה. שים לב לשפת גוף, מהירות דיבור וקשר עין.', descEn: 'Record video answers and watch. Notice body language, speaking speed, and eye contact.' },
  { icon: Mic, titleHe: 'תרגול עם חבר', titleEn: 'Practice with a Friend', descHe: 'בקש מחבר לשחק את המראיין. משוב חיצוני חושף נקודות עיוורות.', descEn: 'Ask a friend to play the interviewer. External feedback reveals blind spots.' },
  { icon: Mic, titleHe: 'תרגל שאלות קשות', titleEn: 'Practice Tough Questions', descHe: 'התמקד דווקא בשאלות שגורמות לך אי-נוחות. שם יש הכי הרבה מקום לשיפור.', descEn: 'Focus on questions that make you uncomfortable. That\'s where the most improvement happens.' },

  // === Achievements ===
  { icon: Trophy, titleHe: 'הדגש הישגים מספריים', titleEn: 'Quantify Achievements', descHe: 'במקום "שיפרתי ביצועים", אמור "הפחתתי זמן עיבוד ב-30%". מספרים עושים רושם.', descEn: 'Instead of "improved performance", say "reduced processing time by 30%". Numbers make an impression.' },
  { icon: Trophy, titleHe: 'הראה השפעה', titleEn: 'Show Impact', descHe: 'לכל הישג, הסבר מה הייתה ההשפעה על הצוות, המחלקה או החברה.', descEn: 'For every achievement, explain the impact on the team, department, or company.' },
  { icon: Trophy, titleHe: 'השתמש ב"אני" לא "אנחנו"', titleEn: 'Use "I" not "We"', descHe: 'בראיון, תדבר על מה *אתה* עשית. "אנחנו" מטשטש את התרומה שלך.', descEn: 'In an interview, talk about what *you* did. "We" blurs your contribution.' },
  { icon: Trophy, titleHe: 'הכן תיק עבודות', titleEn: 'Prepare a Portfolio', descHe: 'אם רלוונטי, הכן דוגמאות עבודה (מצגת, קוד, דו"ח) שאפשר להציג במהלך הראיון.', descEn: 'If relevant, prepare work samples (presentation, code, report) you can show during the interview.' },

  // === Elevator Pitch ===
  { icon: Briefcase, titleHe: 'הכן "מעלית פיץ\'"', titleEn: 'Prepare Your Elevator Pitch', descHe: 'הכן סיכום של 30–60 שניות על עצמך שמדגיש ערך, ניסיון רלוונטי ותשוקה לתפקיד.', descEn: 'Prepare a 30–60 second summary of yourself highlighting value, relevant experience, and passion for the role.' },
  { icon: Briefcase, titleHe: 'נוסחת "ספר לי על עצמך"', titleEn: '"Tell Me About Yourself" Formula', descHe: 'הווה (מה אתה עושה) + עבר (מה הביא אותך לכאן) + עתיד (למה אתה כאן). 90 שניות.', descEn: 'Present (what you do) + Past (what brought you here) + Future (why you\'re here). 90 seconds.' },
  { icon: Briefcase, titleHe: 'התאם את הפיץ\' לתפקיד', titleEn: 'Tailor Your Pitch', descHe: 'שנה את ההדגשים בסיפור שלך לפי דרישות המשרה. אותו ניסיון, זווית שונה.', descEn: 'Adjust your story emphasis based on job requirements. Same experience, different angle.' },

  // === Closing ===
  { icon: Star, titleHe: 'סיים בחוזק', titleEn: 'Close Strong', descHe: 'חזור על הסיבות למה אתה המועמד הנכון, בקש בבירור את הצעד הבא, ושלח מייל תודה.', descEn: 'Recap why you\'re the right fit, clearly ask about next steps, and send a thank-you email.' },
  { icon: Star, titleHe: 'מייל תודה תוך 24 שעות', titleEn: 'Thank You Email Within 24h', descHe: 'שלח מייל תודה קצר שמזכיר נקודה ספציפית מהשיחה. רוב המועמדים לא עושים את זה.', descEn: 'Send a short thank-you email referencing a specific conversation point. Most candidates don\'t.' },
  { icon: Star, titleHe: 'בקש את הצעד הבא', titleEn: 'Ask About Next Steps', descHe: 'תמיד שאל: "מה הצעד הבא בתהליך?" — זה מראה רצינות ומאפשר לך לתכנן.', descEn: 'Always ask: "What\'s the next step?" — shows seriousness and lets you plan.' },

  // === Stories ===
  { icon: BookOpen, titleHe: 'הכן סיפורי הצלחה', titleEn: 'Prepare Success Stories', descHe: 'הכן 5–6 סיפורים מוכנים (STAR) שמכסים: הנהגה, פתרון בעיות, שיתוף פעולה, כישלון ולמידה.', descEn: 'Have 5–6 ready stories (STAR format) covering: leadership, problem-solving, collaboration, failure & learning.' },
  { icon: BookOpen, titleHe: 'סיפור כישלון', titleEn: 'Failure Story', descHe: 'הכן סיפור כישלון אמיתי (לא humble brag). ההדגש: מה למדת ואיך שיפרת.', descEn: 'Prepare a real failure story (not a humble brag). Focus: what you learned and how you improved.' },
  { icon: BookOpen, titleHe: 'סיפור קונפליקט', titleEn: 'Conflict Story', descHe: 'הכן סיפור על חילוקי דעות מקצועיים ואיך פתרת אותם. אל תדבר רע על אף אחד.', descEn: 'Prepare a story about professional disagreements and how you resolved them. Don\'t badmouth anyone.' },
  { icon: BookOpen, titleHe: 'סיפור יוזמה', titleEn: 'Initiative Story', descHe: 'הכן דוגמה למשהו שעשית *מעבר* לתיאור התפקיד. יוזמה = מוטיבציה פנימית.', descEn: 'Prepare an example of something you did *beyond* the job description. Initiative = intrinsic motivation.' },

  // === Body Language ===
  { icon: Eye, titleHe: 'שפת גוף', titleEn: 'Body Language', descHe: 'שמור על קשר עין, חיוך טבעי, ישיבה זקופה, ולחיצת יד חזקה. 55% מהתקשורת היא לא-מילולית.', descEn: 'Maintain eye contact, natural smile, upright posture, and firm handshake. 55% of communication is non-verbal.' },
  { icon: Eye, titleHe: 'הימנע מטיקים', titleEn: 'Avoid Filler Words', descHe: 'צמצם מילות מילוי כמו "אמממ", "כאילו", "בעצם". שתיקה קצרה עדיפה על מילוי.', descEn: 'Reduce filler words like "um", "like", "basically". A brief pause is better than filler.' },
  { icon: Eye, titleHe: 'מראה ותראות', titleEn: 'Mirror and Match', descHe: 'שקף בעדינות את שפת הגוף של המראיין. זה יוצר חיבור לא-מודע.', descEn: 'Subtly mirror the interviewer\'s body language. It creates unconscious rapport.' },
  { icon: Eye, titleHe: 'ידיים על השולחן', titleEn: 'Hands on the Table', descHe: 'השאר את הידיים גלויות על השולחן. ידיים מוסתרות = חוסר אמון לא-מודע.', descEn: 'Keep your hands visible on the table. Hidden hands = unconscious distrust.' },

  // === Mindset ===
  { icon: Heart, titleHe: 'זה גם ראיון שלך', titleEn: 'You\'re Interviewing Them Too', descHe: 'ראיון הוא שיחה דו-כיוונית. גם אתה מחליט אם זה המקום הנכון לך.', descEn: 'An interview is a two-way conversation. You\'re also deciding if this is the right place for you.' },
  { icon: Heart, titleHe: 'אל תתנצל על חוסר ניסיון', titleEn: 'Don\'t Apologize for Gaps', descHe: 'במקום "אין לי ניסיון ב-X", אמור "יש לי ניסיון ב-Y שרלוונטי ל-X".', descEn: 'Instead of "I don\'t have experience in X", say "I have experience in Y which is relevant to X".' },
  { icon: Heart, titleHe: 'גישה חיובית', titleEn: 'Positive Attitude', descHe: 'אף פעם אל תדבר רע על מעסיק קודם. התמקד במה שאתה מחפש, לא ממה אתה בורח.', descEn: 'Never badmouth a previous employer. Focus on what you\'re looking for, not what you\'re leaving.' },
  { icon: Heart, titleHe: 'ביטחון ≠ יהירות', titleEn: 'Confidence ≠ Arrogance', descHe: 'הצג את ההישגים שלך בגאווה אבל הכר בתרומות של אחרים. ענווה = חוכמה רגשית.', descEn: 'Present your achievements with pride but acknowledge others\' contributions. Humility = EQ.' },

  // === Preparation ===
  { icon: Shield, titleHe: 'הכן תשובה ל"חולשה"', titleEn: 'Prepare "Weakness" Answer', descHe: 'בחר חולשה אמיתית (לא "אני עובד קשה מדי"). הסבר מה אתה עושה לשפר אותה.', descEn: 'Choose a real weakness (not "I work too hard"). Explain what you\'re doing to improve.' },
  { icon: Shield, titleHe: 'הכן תשובה ל"שכר"', titleEn: 'Prepare Salary Answer', descHe: 'חקור טווחי שכר לפני הראיון. הסט בנימוס: "אני גמיש ומתמקד בתפקיד הנכון".', descEn: 'Research salary ranges before. Deflect politely: "I\'m flexible and focused on the right role."' },
  { icon: Shield, titleHe: 'הכן תשובה ל"למה עוזב"', titleEn: 'Prepare "Why Leaving" Answer', descHe: 'הדגש צמיחה מקצועית, אתגר חדש, או התאמה טובה יותר. תמיד חיובי.', descEn: 'Emphasize professional growth, new challenge, or better fit. Always positive.' },
  { icon: Shield, titleHe: 'הכן "למה אנחנו?"', titleEn: 'Prepare "Why Us?" Answer', descHe: 'שלב ידע ספציפי על החברה (מוצר, תרבות, משימה) עם הערכים האישיים שלך.', descEn: 'Combine specific company knowledge (product, culture, mission) with your personal values.' },

  // === Technical ===
  { icon: Lightbulb, titleHe: 'חשוב בקול', titleEn: 'Think Out Loud', descHe: 'בשאלות טכניות, דבר על תהליך החשיבה שלך. המראיין רוצה לראות *איך* אתה חושב.', descEn: 'In technical questions, talk through your thought process. The interviewer wants to see *how* you think.' },
  { icon: Lightbulb, titleHe: 'שאל שאלות הבהרה', titleEn: 'Ask Clarifying Questions', descHe: 'לפני שאתה עונה על שאלה מורכבת, שאל שאלות הבהרה. זה מראה חשיבה ביקורתית.', descEn: 'Before answering complex questions, ask clarifying questions. It shows critical thinking.' },
  { icon: Lightbulb, titleHe: 'תגיד "אני לא יודע"', titleEn: 'Say "I Don\'t Know"', descHe: 'עדיף להגיד "אני לא יודע אבל הייתי מחפש/לומד..." מאשר לבלף. כנות = אמינות.', descEn: 'Better to say "I don\'t know but I would research/learn..." than to bluff. Honesty = credibility.' },
  { icon: Lightbulb, titleHe: 'הסבר פשוט', titleEn: 'Explain Simply', descHe: 'אם תוכל להסביר מושגים מורכבים בפשטות, זה מוכיח שאתה באמת מבין אותם.', descEn: 'If you can explain complex concepts simply, it proves you truly understand them.' },

  // === Communication ===
  { icon: MessageSquare, titleHe: 'הקשבה פעילה', titleEn: 'Active Listening', descHe: 'הקשב לשאלה במלואה לפני שאתה מתחיל לענות. אל תקפוץ באמצע.', descEn: 'Listen to the entire question before answering. Don\'t jump in mid-sentence.' },
  { icon: MessageSquare, titleHe: 'בקש לחזור על שאלה', titleEn: 'Ask to Repeat', descHe: 'אם לא הבנת שאלה, בקש לשמוע אותה שוב. עדיף מתשובה לשאלה שלא נשאלה.', descEn: 'If you didn\'t understand a question, ask to hear it again. Better than answering the wrong question.' },
  { icon: MessageSquare, titleHe: 'ענה ישירות ואז הרחב', titleEn: 'Answer Directly Then Expand', descHe: 'פתח עם תשובה ישירה ("כן, אני...") ואז הרחב עם פרטים ודוגמאות.', descEn: 'Start with a direct answer ("Yes, I...") then expand with details and examples.' },
  { icon: MessageSquare, titleHe: 'אל תגזים', titleEn: 'Don\'t Over-Explain', descHe: 'אם סיימת לענות, עצור. שתיקה נוחה עדיפה על פטפוט מיותר.', descEn: 'If you\'re done answering, stop. Comfortable silence is better than unnecessary rambling.' },

  // === Emotional Intelligence ===
  { icon: Heart, titleHe: 'הראה התלהבות', titleEn: 'Show Enthusiasm', descHe: 'מגייסים רוצים מישהו שבאמת רוצה את התפקיד. אנרגיה חיובית = התאמה תרבותית.', descEn: 'Recruiters want someone who genuinely wants the role. Positive energy = cultural fit.' },
  { icon: Heart, titleHe: 'הראה מודעות עצמית', titleEn: 'Show Self-Awareness', descHe: 'הכר בנקודות שיש לשפר. מודעות עצמית = בגרות מקצועית.', descEn: 'Acknowledge areas for improvement. Self-awareness = professional maturity.' },
  { icon: Heart, titleHe: 'אמפתיה למגייס', titleEn: 'Empathize with the Recruiter', descHe: 'המגייס רוצה למצוא את המועמד הנכון כמו שאתה רוצה את העבודה. עזור לו.', descEn: 'The recruiter wants to find the right candidate as much as you want the job. Help them.' },
  { icon: Heart, titleHe: 'נהל לחץ', titleEn: 'Manage Stress', descHe: 'נשימות עמוקות לפני הראיון, מים על השולחן, ותזכורת: זו שיחה, לא מבחן.', descEn: 'Deep breaths before, water on the table, and remember: it\'s a conversation, not a test.' },

  // === Remote Interviews ===
  { icon: Smartphone, titleHe: 'ראיון בזום — רקע', titleEn: 'Zoom — Background', descHe: 'רקע נקי ומואר, מצלמה בגובה העיניים, תאורה מלפנים (לא מאחורה).', descEn: 'Clean, well-lit background, camera at eye level, light from front (not behind).' },
  { icon: Smartphone, titleHe: 'ראיון בזום — טכנולוגיה', titleEn: 'Zoom — Tech Check', descHe: 'בדוק מיקרופון, מצלמה ואינטרנט שעה לפני. הכן תוכנית גיבוי (טלפון).', descEn: 'Check mic, camera, and internet an hour before. Have a backup plan (phone).' },
  { icon: Smartphone, titleHe: 'ראיון בזום — קשר עין', titleEn: 'Zoom — Eye Contact', descHe: 'הסתכל על העדשה (לא על המסך) כשאתה מדבר. זה יוצר תחושת קשר עין.', descEn: 'Look at the lens (not the screen) when speaking. This creates the feeling of eye contact.' },
  { icon: Smartphone, titleHe: 'ראיון בזום — שפת גוף', titleEn: 'Zoom — Body Language', descHe: 'שב ישר, הנהן, חייך. בזום צריך להגביל יותר כי רק הפלג העליון נראה.', descEn: 'Sit upright, nod, smile. On Zoom you need to amplify since only upper body is visible.' },

  // === Follow-up ===
  { icon: TrendingUp, titleHe: 'מעקב אחרי ראיון', titleEn: 'Post-Interview Follow-up', descHe: 'שלח מייל תודה, המתן 5-7 ימי עבודה, ואז פנה בנימוס לעדכון סטטוס.', descEn: 'Send a thank-you email, wait 5-7 business days, then politely reach out for a status update.' },
  { icon: TrendingUp, titleHe: 'למד מכל ראיון', titleEn: 'Learn from Every Interview', descHe: 'אחרי כל ראיון, רשום מה עבד ומה לא. שפר את התשובות לפעם הבאה.', descEn: 'After every interview, note what worked and what didn\'t. Improve answers for next time.' },
  { icon: TrendingUp, titleHe: 'בקש משוב', titleEn: 'Ask for Feedback', descHe: 'אם נדחית, בקש בנימוס משוב. לא תמיד יענו, אבל כשכן — זה זהב.', descEn: 'If rejected, politely ask for feedback. They won\'t always respond, but when they do — it\'s gold.' },
  { icon: TrendingUp, titleHe: 'בנה מערכת יחסים', titleEn: 'Build Relationships', descHe: 'גם אם לא התקבלת, שמור על קשר עם המגייס ב-LinkedIn. הזדמנויות חוזרות.', descEn: 'Even if not hired, stay connected with the recruiter on LinkedIn. Opportunities recur.' },

  // === Practical ===
  { icon: Coffee, titleHe: 'ארוחת בוקר', titleEn: 'Have Breakfast', descHe: 'אכול ארוחה קלה לפני הראיון. רעב = קושי להתרכז. אבל אל תאכל משהו כבד מדי.', descEn: 'Eat a light meal before. Hunger = difficulty concentrating. But don\'t eat anything too heavy.' },
  { icon: Coffee, titleHe: 'לבוש מתאים', titleEn: 'Dress Appropriately', descHe: 'לבש רמה אחת מעל מה שעובדי החברה לובשים. קז\'ואל? בוא בביזנס קז\'ואל.', descEn: 'Dress one level above what employees wear. Casual office? Come in business casual.' },
  { icon: Coffee, titleHe: 'הבא עותקי קורות חיים', titleEn: 'Bring Resume Copies', descHe: 'הדפס 3-4 עותקים של הקורות חיים. גם בראיון דיגיטלי — שמור גרסה פתוחה.', descEn: 'Print 3-4 resume copies. Even in digital interviews — keep a version open.' },
  { icon: Coffee, titleHe: 'כבה את הטלפון', titleEn: 'Silence Your Phone', descHe: 'כבה או השתק את הטלפון. צלצול באמצע ראיון = מתכון לאסון.', descEn: 'Turn off or silence your phone. A ring during an interview = recipe for disaster.' },

  // === Strategy ===
  { icon: Compass, titleHe: 'תור ראשון ← אנרגיה', titleEn: 'First Round ← Energy', descHe: 'בראיון ראשון, מגייסים מחפשים אנרגיה, התלהבות והתאמה תרבותית. הדגש את זה.', descEn: 'In first rounds, recruiters look for energy, enthusiasm, and cultural fit. Emphasize these.' },
  { icon: Compass, titleHe: 'תור שני ← עומק', titleEn: 'Second Round ← Depth', descHe: 'בראיון שני, מצפים לעומק טכני/מקצועי. הכן דוגמאות מפורטות עם מספרים.', descEn: 'In second rounds, expect technical/professional depth. Prepare detailed examples with metrics.' },
  { icon: Compass, titleHe: 'תור סופי ← חזון', titleEn: 'Final Round ← Vision', descHe: 'בראיון סופי (עם מנהל בכיר), דבר על חזון, ערכים, ותרומה ארוכת-טווח.', descEn: 'In final rounds (with senior leadership), discuss vision, values, and long-term contribution.' },
  { icon: Compass, titleHe: 'הכר את סוג הראיון', titleEn: 'Know the Interview Type', descHe: 'ראיון טכני ≠ ראיון התנהגותי ≠ ראיון מנהלים. התכונן אחרת לכל סוג.', descEn: 'Technical interview ≠ behavioral ≠ leadership. Prepare differently for each type.' },

  // === Mindset & Confidence ===
  { icon: Zap, titleHe: 'חשיבה של יועץ', titleEn: 'Consultant Mindset', descHe: 'גש לראיון כיועץ שבוחן את הבעיה, לא כמועמד שמתחנן לעבודה.', descEn: 'Approach the interview as a consultant examining the problem, not a candidate begging for a job.' },
  { icon: Zap, titleHe: 'הישאר סקרן', titleEn: 'Stay Curious', descHe: 'הפגן סקרנות אמיתית לגבי התפקיד, הצוות והאתגרים. סקרנות = למידה מהירה.', descEn: 'Show genuine curiosity about the role, team, and challenges. Curiosity = fast learning.' },
  { icon: Zap, titleHe: 'אל תשווה את עצמך', titleEn: 'Don\'t Compare Yourself', descHe: 'אתה לא יודע מי המועמדים האחרים. התמקד בלהציג את עצמך הכי טוב שאתה יכול.', descEn: 'You don\'t know who the other candidates are. Focus on presenting yourself at your best.' },
  { icon: Zap, titleHe: 'גמישות', titleEn: 'Be Flexible', descHe: 'אם הראיון הולך לכיוון לא צפוי, אל תיבהל. התאם את עצמך ולך עם הזרם.', descEn: 'If the interview goes in an unexpected direction, don\'t panic. Adapt and go with the flow.' },

  // === Negotiation ===
  { icon: CheckCircle, titleHe: 'שכר — תן להם להציע ראשון', titleEn: 'Salary — Let Them Offer First', descHe: 'נסה שהחברה תציע מספר ראשון. המספר הראשון שנזרק הוא עוגן למו"מ.', descEn: 'Try to get the company to offer a number first. The first number thrown is an anchor for negotiation.' },
  { icon: CheckCircle, titleHe: 'שכר — חקור שוק', titleEn: 'Salary — Research Market', descHe: 'בדוק טווחי שכר ב-Glassdoor, LinkedIn Salary, ובשיחות עם אנשים בתחום.', descEn: 'Check salary ranges on Glassdoor, LinkedIn Salary, and conversations with industry peers.' },
  { icon: CheckCircle, titleHe: 'משא ומתן — לא רק שכר', titleEn: 'Negotiate — Not Just Salary', descHe: 'אפשר לנהל מו"מ על: ימי חופש, עבודה מהבית, בונוס, מניות, הכשרות.', descEn: 'You can negotiate: vacation days, remote work, bonuses, equity, training.' },
  { icon: CheckCircle, titleHe: 'אל תקבל הצעה ראשונה', titleEn: 'Don\'t Accept Immediately', descHe: 'בקש 24-48 שעות "לחשוב על זה". זה לגיטימי ומאפשר לך לשקול בשקט.', descEn: 'Ask for 24-48 hours "to think about it." It\'s legitimate and lets you consider calmly.' },

  // === Panel & Group ===
  { icon: Users, titleHe: 'ראיון פאנל', titleEn: 'Panel Interview', descHe: 'בראיון פאנל, חלק קשר עין בין כל המשתתפים. ענה למי ששאל אבל הסתכל גם על אחרים.', descEn: 'In a panel, distribute eye contact among all participants. Answer the asker but look at others too.' },
  { icon: Users, titleHe: 'הכר את התפקידים', titleEn: 'Know Their Roles', descHe: 'שאל בהתחלה מי כל אחד ומה תפקידו. זה עוזר לך להתאים תשובות.', descEn: 'Ask at the start who everyone is and their role. It helps you tailor answers.' },
  { icon: Users, titleHe: 'שמות ופרטים', titleEn: 'Names & Details', descHe: 'השתמש בשמות של המראיינים. "שאלה מצוינת, דנה" — יוצר חיבור אישי.', descEn: 'Use interviewers\' names. "Great question, Dana" — creates personal connection.' },

  // === Advanced ===
  { icon: Lightbulb, titleHe: 'מסגור מחדש', titleEn: 'Reframe Questions', descHe: 'שאלה קשה? מסגר אותה מחדש: "אני רואה את זה כהזדמנות ל..." לא כבעיה.', descEn: 'Tough question? Reframe it: "I see this as an opportunity to..." not as a problem.' },
  { icon: Lightbulb, titleHe: 'קונטקסט לפני תוכן', titleEn: 'Context Before Content', descHe: 'לפני שאתה עונה, תן 1-2 משפטים של הקשר. "כשהייתי ב-X, התמודדנו עם Y..."', descEn: 'Before answering, give 1-2 sentences of context. "When I was at X, we faced Y..."' },
  { icon: Lightbulb, titleHe: 'גשר לחוזקות', titleEn: 'Bridge to Strengths', descHe: 'כל שאלה היא הזדמנות לגשר לחוזקות שלך. "זה מזכיר לי מצב ב-..."', descEn: 'Every question is an opportunity to bridge to your strengths. "That reminds me of a situation at..."' },
  { icon: Lightbulb, titleHe: 'הכר דפוסי שאלות', titleEn: 'Know Question Patterns', descHe: 'רוב השאלות נופלות ל-5 קטגוריות: רקע, התנהגות, מצב, טכני, מוטיבציה. הכן תשובות לכל סוג.', descEn: 'Most questions fall into 5 categories: background, behavioral, situational, technical, motivation. Prepare for each.' },

  // === First Impression ===
  { icon: Star, titleHe: '90 שניות ראשונות', titleEn: 'First 90 Seconds', descHe: 'רושם ראשוני נקבע ב-90 שניות. חיוך, לחיצת יד, קשר עין, ומשפט פתיחה חזק.', descEn: 'First impressions form in 90 seconds. Smile, handshake, eye contact, and a strong opening line.' },
  { icon: Star, titleHe: 'Small Talk', titleEn: 'Small Talk', descHe: 'הכן 2-3 נושאים קלילים לשיחה: מזג אוויר, המשרד, עדכון רלוונטי. זה שובר קרח.', descEn: 'Prepare 2-3 light conversation topics: weather, office, relevant update. It breaks the ice.' },
  { icon: Star, titleHe: 'אנרגיה = הצלחה', titleEn: 'Energy = Success', descHe: 'מגייסים זוכרים אנרגיה יותר מתוכן. בוא עם חיוניות ותשוקה אמיתית.', descEn: 'Recruiters remember energy more than content. Come with vitality and genuine passion.' },
];

/**
 * Returns `count` random tips from the bank, shuffled on each call.
 */
export function getRandomTips(count: number = 4): StaticTip[] {
  const shuffled = [...TIPS_BANK].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
