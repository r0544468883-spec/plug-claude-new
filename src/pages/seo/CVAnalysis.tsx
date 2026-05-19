import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Search, Zap, BarChart, CheckCircle2 } from 'lucide-react';

export default function CVAnalysis() {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Helmet>
        <title>ניתוח קורות חיים חינם עם AI | בדיקת CV | פלאג</title>
        <meta name="description" content="העלו קורות חיים ותקבלו ניתוח AI תוך שניות. מה לתקן, מה חסר, ואיזה מילות מפתח להוסיף. חינם לגמרי." />
        <link rel="canonical" href="https://www.plug-hr.com/cv-analysis" />
      </Helmet>

      <section className="relative overflow-hidden bg-gradient-to-b from-green-500/10 to-transparent py-20 px-4">
        <div className="absolute top-10 start-10 w-72 h-72 bg-emerald-500/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 end-20 w-56 h-56 bg-primary/15 rounded-full blur-3xl animate-pulse [animation-delay:1s]" />
        <div className="relative max-w-3xl mx-auto text-center space-y-4">
          <span className="inline-block bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full mb-2">ניתוח CV מבוסס בינה מלאכותית</span>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight">ניתוח קורות חיים חינם עם AI</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            העלו את ה-CV שלכם. תוך 8 שניות תקבלו רשימה מדויקת של מה לתקן, מה חסר, ואיזה מילות מפתח להוסיף כדי לעבור את ה-ATS.
          </p>
          <Link to="/">
            <Button size="lg" className="gap-2 text-base mt-4 shadow-lg shadow-primary/25">
              <FileText className="w-4 h-4" />
              בדוק את ה-CV שלי
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground">חינם. בלי הרשמה מסובכת. מעלים ומקבלים ניתוח.</p>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">מה הניתוח בודק?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: Search, title: 'מילות מפתח חסרות', desc: 'ה-AI משווה את ה-CV שלכם למשרות שחיפשתם ומזהה מילות מפתח שחסרות. ATS מסנן לפי מילים. אם הן לא שם, אתם בחוץ.' },
              { icon: BarChart, title: 'כימות הישגים', desc: '"ניהלתי פרויקט" לא אומר כלום. "ניהלתי פרויקט של 8 אנשים שהגדיל הכנסות ב-30%" כן. ה-AI מזהה היכן חסר כימות.' },
              { icon: FileText, title: 'מבנה ופורמט', desc: 'סיכום ארוך מדי? חסרה כותרת ברורה? הניסיון לא בסדר כרונולוגי? ה-AI מזהה בעיות מבניות.' },
              { icon: Zap, title: 'ציון התאמה למשרות', desc: 'אחרי הניתוח, פלאג מראה לכם ציון התאמה לכל משרה שגולשים בה. יודעים מראש אם שווה להגיש.' },
            ].map((item, i) => (
              <Card key={i} className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <item.icon className="w-5 h-5 text-green-500" />
                    <h3 className="font-bold text-sm">{item.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 px-4 bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">שאלות נפוצות</h2>
          <div className="space-y-4">
            {[
              { q: 'באיזה פורמט אפשר להעלות?', a: 'PDF או Word. העלו את הקובץ ופלאג יעשה את השאר.' },
              { q: 'כמה זמן לוקח הניתוח?', a: 'כ-8 שניות. ה-AI קורא את ה-CV, מנתח מול אלפי משרות, ומחזיר רשימה מדויקת.' },
              { q: 'הניתוח עובד גם בעברית?', a: 'כן. פלאג תומך בעברית ובאנגלית. הניתוח מותאם לשפה שבה כתבתם.' },
              { q: 'מה קורה עם ה-CV שלי אחרי ההעלאה?', a: 'ה-CV נשמר בצורה מאובטחת ומשמש רק לניתוח ולהגשת מועמדויות. לא מוכרים מידע.' },
            ].map((faq, i) => (
              <Card key={i} className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <CardContent className="p-4">
                  <h3 className="font-bold text-sm">{faq.q}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 px-4 text-center">
        <h2 className="text-xl font-bold mb-3">מוכנים לשדרג את ה-CV?</h2>
        <p className="text-sm text-muted-foreground mb-4">העלו קובץ ותקבלו ניתוח תוך שניות. חינם.</p>
        <Link to="/">
          <Button size="lg" className="shadow-lg shadow-primary/25">בדוק את ה-CV שלי</Button>
        </Link>
      </section>
    </div>
  );
}
