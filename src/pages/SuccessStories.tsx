import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { PartyPopper, Quote, Lightbulb, ArrowLeft, ChevronDown } from 'lucide-react';
import { useState } from 'react';

export default function SuccessStories() {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [showAll, setShowAll] = useState(false);

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ['public-success-stories'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('success_stories')
        .select('*, profiles:user_id(full_name, avatar_url, tagline)')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const displayStories = showAll ? stories : stories.slice(0, 12);

  return (
    <div className="min-h-screen bg-background" dir={isHebrew ? 'rtl' : 'ltr'}>
      <Helmet>
        <title>{isHebrew ? 'סיפורי הצלחה — PLUG' : 'Success Stories — PLUG'}</title>
        <meta name="description" content={isHebrew
          ? 'מחפשי עבודה שמצאו את העבודה המושלמת עם PLUG — סיפורים אמיתיים'
          : 'Job seekers who found their dream job with PLUG — real stories'} />
      </Helmet>

      {/* Header */}
      <div className="bg-gradient-to-b from-primary/10 to-transparent py-12 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <PartyPopper className="w-10 h-10 text-yellow-500 mx-auto" />
          <h1 className="text-3xl font-bold">{isHebrew ? 'סיפורי הצלחה' : 'Success Stories'}</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            {isHebrew
              ? 'אנשים אמיתיים שמצאו עבודה עם PLUG. הסיפור הבא יכול להיות שלך.'
              : 'Real people who found jobs with PLUG. Your story could be next.'}
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Link to="/">
              <Button>{isHebrew ? 'התחל/י עכשיו — חינם' : 'Get Started — Free'}</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stories grid */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="text-center text-muted-foreground py-12">
            {isHebrew ? 'טוען...' : 'Loading...'}
          </div>
        ) : stories.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            <PartyPopper className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p>{isHebrew ? 'הסיפור הראשון ממתין לך' : 'Be the first to share your story'}</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {displayStories.map((story: any) => (
                <Card key={story.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardContent className="p-5 space-y-3">
                    {/* User info */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                        {story.profiles?.avatar_url ? (
                          <img src={story.profiles.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <span className="text-sm font-bold">{story.profiles?.full_name?.charAt(0)}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{story.profiles?.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {story.job_title} {isHebrew ? 'ב-' : 'at '}{story.company_name}
                        </p>
                      </div>
                      <Badge className="bg-emerald-500/20 text-emerald-600 text-xs flex-shrink-0">
                        {isHebrew ? 'התקבל/ה!' : 'Hired!'}
                      </Badge>
                    </div>

                    {/* Story text */}
                    <div className="relative">
                      <Quote className="w-4 h-4 text-primary/30 absolute -top-1 -start-1" />
                      <p className="text-sm text-muted-foreground ps-4 leading-relaxed line-clamp-4">
                        {story.story}
                      </p>
                    </div>

                    {/* Tip */}
                    {story.tip_for_others && (
                      <div className="flex gap-2 bg-yellow-500/10 rounded-lg p-2.5">
                        <Lightbulb className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs">{story.tip_for_others}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {stories.length > 12 && !showAll && (
              <div className="text-center pt-6">
                <Button variant="outline" onClick={() => setShowAll(true)} className="gap-2">
                  <ChevronDown className="w-4 h-4" />
                  {isHebrew ? `עוד ${stories.length - 12} סיפורים` : `${stories.length - 12} more stories`}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* CTA footer */}
      <div className="bg-primary/5 py-10 px-4 text-center">
        <h2 className="text-xl font-bold mb-2">{isHebrew ? 'הסיפור הבא הוא שלך' : 'Your story is next'}</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {isHebrew
            ? 'תוסף AI חינמי שמנתח לך כל משרה בלינקדאין'
            : 'Free AI extension that analyzes every LinkedIn job for you'}
        </p>
        <Link to="/">
          <Button size="lg">{isHebrew ? 'הצטרף/י חינם' : 'Join Free'}</Button>
        </Link>
      </div>
    </div>
  );
}
