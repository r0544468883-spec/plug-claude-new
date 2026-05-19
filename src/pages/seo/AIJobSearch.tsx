import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Zap, Target, Clock, Users, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function AIJobSearch() {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Helmet>
        <title>כלי AI חינמי לחיפוש עבודה בישראל | פלאג</title>
        <meta name="description" content="פלאג הוא תוסף כרום חינמי שמנתח כל משרה עם AI, נותן ציון התאמה, ומגיש אוטומטית. מעל 3,000 מחפשי עבודה כבר משתמשים." />
        <meta property="og:title" content="כלי AI חינמי לחיפוש עבודה בישראל | פלאג" />
        <meta property="og:description" content="תוסף כרום חינמי שמנתח כל משרה עם AI, נותן ציון התאמה, ומגיש אוטומטית." />
        <link rel="canonical" href="https://www.plug-hr.com/ai-job-search" />
      </Helmet>

      {/* Hero */}
      <section className="bg-gradient-to-b from-primary/10 to-transparent py-16 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold">כלי AI חינמי לחיפוש עבודה בישראל</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            פלאג הוא תוסף כרום שמנתח כל משרה בלינקדאין ובאתרי דרושים, נותן לך ציון התאמה אישי, ומגיש בשבילך. חינם לגמרי.
          </p>
          <div className="flex gap-3 justify-center pt-4">
            <Link to="/">
              <Button size="lg" className="gap-2 text-base">התקן תוסף חינם</Button>
            </Link>
            <Link to="/success-stories">
              <Button size="lg" variant="outline" className="gap-2 text-base">סיפורי הצלחה</Button>
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">+3,200 מחפשי עבודה כבר משתמשים</p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">איך פלאג עובד?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Zap, title: 'מתקינים בקליק', desc: 'תוסף כרום חינמי. התקנה של 10 שניות, בלי הרשמה מסובכת.' },
              { icon: Target, title: 'AI מנתח כל משרה', desc: 'גולשים בלינקדאין או אולג\'ובס. פלאג סורק כל משרה ונותן ציון התאמה מ-0 עד 100.' },
              { icon: Clock, title: 'הגשה אוטומטית', desc: 'רואים ציון גבוה? פלאג מגיש Easy Apply בשבילכם. חוסך שעות ביום.' },
            ].map((item, i) => (
              <Card key={i}>
                <CardContent className="p-5 text-center space-y-3">
                  <item.icon className="w-8 h-8 text-primary mx-auto" />
                  <h3 className="font-bold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-12 px-4 bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">למה מחפשי עבודה עוברים ל-פלאג?</h2>
          <div className="space-y-4">
            {[
              'ציון התאמה AI על כל משרה. יודעים מראש אם שווה להגיש.',
              'הגשה אוטומטית ב-Easy Apply. חוסכים שעות ביום.',
              'מעקב מיילים אוטומטי. יודעים מי דחה, מי הזמין לראיון.',
              'שיתוף משרות עם חברים בקליק. כי חיפוש עבודה לא חייב להיות לבד.',
              'חינם לגמרי. בלי כרטיס אשראי, בלי תקופת ניסיון.',
            ].map((text, i) => (
              <div key={i} className="flex gap-3 items-start">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">המספרים מדברים</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {[
              { num: '3,200+', label: 'משתמשים רשומים' },
              { num: '10,000+', label: 'משרות נותחו' },
              { num: '35', label: 'הגשות ממוצע עד הצעה (במקום 120)' },
              { num: '3:40', label: 'דקות עד ההגשה הראשונה' },
            ].map((s, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <p className="text-2xl font-black text-primary">{s.num}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 px-4 bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">שאלות נפוצות</h2>
          <div className="space-y-4">
            {[
              { q: 'פלאג באמת חינם?', a: 'כן. לגמרי. אין כרטיס אשראי, אין תקופת ניסיון, אין מלכודות. חינם.' },
              { q: 'על אילו אתרים פלאג עובד?', a: 'לינקדאין, אולג\'ובס, ועוד אתרי דרושים ישראליים. התוסף עובד מתוך הדפדפן על כל אתר שגולשים בו.' },
              { q: 'מה זה ציון התאמה?', a: 'ה-AI של פלאג מנתח את הפרופיל שלכם מול דרישות המשרה ונותן ציון מ-0 עד 100. ככל שהציון גבוה יותר, כך הסיכוי שלכם לקבל ראיון גבוה יותר.' },
              { q: 'האם פלאג מגיש בלי שאני יודע?', a: 'לא. פלאג מגיש רק כשאתם לוחצים "הגש", או כשאתם מפעילים את ה-Agent האוטומטי ומגדירים פרמטרים.' },
              { q: 'מה קורה עם הנתונים שלי?', a: 'הנתונים שלכם נשמרים בצורה מאובטחת. אנחנו לא מוכרים מידע לצד שלישי.' },
            ].map((faq, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <h3 className="font-bold text-sm">{faq.q}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 px-4 text-center">
        <h2 className="text-xl font-bold mb-3">מוכנים להתחיל?</h2>
        <p className="text-sm text-muted-foreground mb-4">ההתקנה לוקחת 10 שניות. בלי התחייבות.</p>
        <Link to="/">
          <Button size="lg">התקן תוסף חינם</Button>
        </Link>
      </section>
    </div>
  );
}
