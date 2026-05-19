import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Code, Cpu, Globe, Database, CheckCircle2 } from 'lucide-react';

export default function TechJobs() {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Helmet>
        <title>חיפוש עבודה בהייטק עם AI | משרות פיתוח, QA, דאטה | פלאג</title>
        <meta name="description" content="מחפשים עבודה בהייטק? פלאג סורק משרות פיתוח, QA, דאטה, DevOps בלינקדאין ובאתרי דרושים ישראליים. ציון התאמה AI + הגשה אוטומטית. חינם." />
        <link rel="canonical" href="https://www.plug-hr.com/tech-jobs" />
      </Helmet>

      <section className="bg-gradient-to-b from-blue-500/10 to-transparent py-16 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold">חיפוש עבודה בהייטק עם AI</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            פלאג מנתח משרות פיתוח, QA, דאטה, DevOps ועוד. ציון התאמה אישי לכל משרה. הגשה אוטומטית. חינם.
          </p>
          <Link to="/">
            <Button size="lg" className="gap-2 text-base mt-4">התחל חיפוש חכם</Button>
          </Link>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">תחומים שפלאג מכסה</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Code, label: 'פיתוח תוכנה', desc: 'Frontend, Backend, Full Stack, Mobile' },
              { icon: Database, label: 'דאטה ו-AI', desc: 'Data Science, ML, Analytics, BI' },
              { icon: Cpu, label: 'DevOps & Cloud', desc: 'AWS, GCP, K8s, CI/CD' },
              { icon: Globe, label: 'מוצר וניהול', desc: 'Product, PM, Scrum, QA' },
            ].map((item, i) => (
              <Card key={i}>
                <CardContent className="p-4 text-center space-y-2">
                  <item.icon className="w-6 h-6 text-blue-500 mx-auto" />
                  <h3 className="font-bold text-sm">{item.label}</h3>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 px-4 bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">למה הייטקיסטים עוברים ל-פלאג?</h2>
          <div className="space-y-4">
            {[
              'ה-AI מבין טכנולוגיות. React זה לא Angular. פלאג יודע את ההבדל.',
              'סריקת משרות בלינקדאין ובאולג\'ובס במקביל. לא צריך לפתוח 10 טאבים.',
              'הגשת Easy Apply אוטומטית. במקום שעתיים ביום על הגשות, 15 דקות.',
              'ציון התאמה שמבוסס על הכישורים שלך, לא על מילות באזז.',
              'מעקב אוטומטי. יודעים מתי דחו אותכם, מתי הזמינו לראיון.',
            ].map((text, i) => (
              <div key={i} className="flex gap-3 items-start">
                <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 px-4 text-center">
        <h2 className="text-xl font-bold mb-3">מוכנים למצוא את המשרה הבאה?</h2>
        <p className="text-sm text-muted-foreground mb-4">חינם. 10 שניות התקנה. בלי התחייבות.</p>
        <Link to="/">
          <Button size="lg">התקן פלאג חינם</Button>
        </Link>
      </section>
    </div>
  );
}
