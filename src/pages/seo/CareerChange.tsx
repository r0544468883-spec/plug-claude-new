import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Compass, BookOpen, Target, Users, CheckCircle2 } from 'lucide-react';

export default function CareerChange() {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Helmet>
        <title>הסבת קריירה? כך תמצא עבודה מהר יותר עם AI | פלאג</title>
        <meta name="description" content="עשית הסבה להייטק או מחליף תחום? פלאג מנתח את הכישורים שלך ומוצא משרות שמתאימות גם בלי ניסיון ישיר. חינם." />
        <link rel="canonical" href="https://www.plug-hr.com/career-change" />
      </Helmet>

      <section className="bg-gradient-to-b from-purple-500/10 to-transparent py-16 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold">הסבת קריירה? כך תמצא עבודה מהר יותר</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            סיימת בוטקמפ, קורס, או תואר חדש? פלאג מנתח את מה שאתה כן יודע ומוצא משרות שמתאימות. לא רק את מה שדורשים 5 שנות ניסיון.
          </p>
          <Link to="/auth">
            <Button size="lg" className="gap-2 text-base mt-4">התחל חיפוש חכם</Button>
          </Link>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">האתגר של מחליפי קריירה</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: Target, title: 'תחרות על משרות ג\'וניור', desc: 'מאות מועמדים על כל משרת כניסה. פלאג עוזר לך להגיש יותר, מהר יותר, ולמשרות שבאמת מתאימות לפרופיל שלך.' },
              { icon: BookOpen, title: 'כישורים שלא יודעים לשווק', desc: 'יש לך ניסיון מעולם אחר שרלוונטי. פלאג מזהה transferable skills ומתאים אותם למשרות.' },
              { icon: Compass, title: 'לא יודעים לאן לכוון', desc: 'ה-AI של פלאג מציע משרות שלא חשבתם עליהן. UX designer עם רקע בפסיכולוגיה? יש משרות שמחפשות בדיוק את זה.' },
              { icon: Users, title: 'בלי נטוורק בתחום החדש', desc: 'פלאג לא צריך קשרים. הוא מוצא משרות על סמך כישורים, לא על סמך מי שאתה מכיר.' },
            ].map((item, i) => (
              <Card key={i}>
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <item.icon className="w-5 h-5 text-purple-500" />
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
          <h2 className="text-2xl font-bold text-center mb-6">איך פלאג עוזר למחליפי קריירה</h2>
          <div className="space-y-4">
            {[
              'מנתח את הכישורים שלך (גם מתחומים אחרים) ומחפש התאמות',
              'מציע משרות שלא דורשות ניסיון ישיר בתחום',
              'ציון התאמה שעוזר לך לא לבזבז זמן על משרות "5+ שנות ניסיון"',
              'הגשה אוטומטית. כי כשאין לך ניסיון, כמות ההגשות היא היתרון',
              'חינם לגמרי. כי מישהו שמשקיע בשינוי קריירה לא צריך לשלם עוד',
            ].map((text, i) => (
              <div key={i} className="flex gap-3 items-start">
                <CheckCircle2 className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 px-4 text-center">
        <h2 className="text-xl font-bold mb-3">הקריירה החדשה שלך מתחילה פה</h2>
        <p className="text-sm text-muted-foreground mb-4">התקנה של 10 שניות. חינם. בלי התחייבות.</p>
        <Link to="/auth">
          <Button size="lg">התקן פלאג חינם</Button>
        </Link>
      </section>
    </div>
  );
}
