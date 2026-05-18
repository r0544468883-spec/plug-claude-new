import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Shield, Zap, Clock, CheckCircle2 } from 'lucide-react';

export default function AfterLayoff() {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Helmet>
        <title>פוטרת? המדריך המלא לחיפוש עבודה ב-2026 | פלאג</title>
        <meta name="description" content="פוטרת מהייטק או מכל תחום אחר? פלאג עוזר לך לחזור לשוק העבודה מהר יותר. ניתוח AI, הגשה אוטומטית, מעקב. חינם." />
        <link rel="canonical" href="https://www.plug-hr.com/after-layoff" />
      </Helmet>

      <section className="bg-gradient-to-b from-amber-500/10 to-transparent py-16 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold">פוטרת? לא לבד. יש תוכנית.</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            גל הפיטורים פגע בהרבה אנשים טובים. פלאג נבנה בדיוק בשביל הרגע הזה. כלי AI חינמי שעושה את העבודה המלוכלכת של חיפוש עבודה בשבילך.
          </p>
          <Link to="/auth">
            <Button size="lg" className="gap-2 text-base mt-4">התחל עכשיו, חינם</Button>
          </Link>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">5 צעדים אחרי פיטורים</h2>
          <div className="space-y-4">
            {[
              { num: '1', title: 'נשמו', desc: 'קחו כמה ימים. אל תגישו מועמדויות מתוך פאניקה. החלטות שנלקחות מלחץ הן בד"כ לא טובות.' },
              { num: '2', title: 'עדכנו קורות חיים', desc: 'העלו את הקו"ח לפלאג. ה-AI יגיד לכם בדיוק מה לתקן ומה חסר.' },
              { num: '3', title: 'הגדירו מה אתם רוצים', desc: 'לא כל משרה מתאימה. הגדירו תחום, שכר מינימלי, ומיקום. פלאג יסנן בשבילכם.' },
              { num: '4', title: 'תנו ל-AI לעבוד', desc: 'פלאג סורק משרות בלינקדאין ובאתרי דרושים, נותן ציון התאמה, ומגיש אוטומטית.' },
              { num: '5', title: 'תתמקדו בראיונות', desc: 'במקום לבזבז שעות על הגשות, השקיעו את הזמן בהכנה לראיונות.' },
            ].map((step, i) => (
              <Card key={i}>
                <CardContent className="p-4 flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center flex-shrink-0 font-bold text-sm">{step.num}</div>
                  <div>
                    <h3 className="font-bold text-sm">{step.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{step.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 px-4 bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-6">למה פלאג בדיוק בשביל הרגע הזה</h2>
          <div className="space-y-4">
            {[
              'חינם לגמרי. כי אחרי פיטורים, אין צורך בעוד הוצאה.',
              'הגשה אוטומטית. חוסך שעות ביום על הגשות ידניות.',
              'מעקב מיילים. יודעים מי חזר ומי לא, בלי לבדוק 50 פעמים ביום.',
              'ציון התאמה. לא מבזבזים אנרגיה על משרות שלא מתאימות.',
              'שיתוף משרות עם חברים. כי הרבה פעמים, חבר שמכיר מישהו זה הדרך.',
            ].map((text, i) => (
              <div key={i} className="flex gap-3 items-start">
                <CheckCircle2 className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 px-4 text-center">
        <h2 className="text-xl font-bold mb-3">החיפוש מתחיל פה</h2>
        <p className="text-sm text-muted-foreground mb-4">10 שניות התקנה. חינם. בלי התחייבות. בהצלחה.</p>
        <Link to="/auth">
          <Button size="lg">התקן פלאג חינם</Button>
        </Link>
      </section>
    </div>
  );
}
