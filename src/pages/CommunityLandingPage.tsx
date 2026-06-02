import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { Helmet } from 'react-helmet-async';
import { cn } from '@/lib/utils';
import {
  Star, Users, Award, Sparkles, CheckCircle, Globe,
  CreditCard, MessageSquare, ChevronRight, ArrowRight,
  ExternalLink,
} from 'lucide-react';

function getIcon(name: string, className = 'w-6 h-6') {
  const map: Record<string, React.ReactNode> = {
    star: <Star className={className} />,
    users: <Users className={className} />,
    award: <Award className={className} />,
    sparkles: <Sparkles className={className} />,
    checkCircle: <CheckCircle className={className} />,
    globe: <Globe className={className} />,
    creditCard: <CreditCard className={className} />,
    messageSquare: <MessageSquare className={className} />,
  };
  return map[name] || <Star className={className} />;
}

export default function CommunityLandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const { language } = useLanguage();
  const isRTL = language === 'he';

  // Store affiliate ref in localStorage
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      localStorage.setItem('plug_affiliate_ref', ref);
      localStorage.setItem('plug_affiliate_slug', slug || '');
    }
  }, [searchParams, slug]);

  const { data: page, isLoading, error } = useQuery({
    queryKey: ['public-community-landing', slug],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('community_landing_pages')
        .select('*')
        .eq('slug', slug!)
        .eq('is_published', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  // Fetch subscription plans
  const { data: plans = [] } = useQuery({
    queryKey: ['public-community-plans', page?.hub_id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('community_subscription_plans')
        .select('*')
        .eq('hub_id', page.hub_id)
        .eq('is_active', true)
        .order('price', { ascending: true });
      return data || [];
    },
    enabled: !!page?.hub_id,
  });

  // Increment view count
  useEffect(() => {
    if (page?.id) {
      (supabase as any)
        .rpc('increment_landing_page_views', { page_id: page.id })
        .then(() => {})
        .catch(() => {
          // Fallback: direct update
          (supabase as any)
            .from('community_landing_pages')
            .update({ view_count: (page.view_count || 0) + 1 })
            .eq('id', page.id)
            .then(() => {});
        });
    }
  }, [page?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="space-y-4 w-full max-w-md px-4">
          <Skeleton className="h-12 w-3/4 mx-auto" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-2/3 mx-auto" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
        <h1 className="text-3xl font-bold mb-4">{isRTL ? 'הדף לא נמצא' : 'Page Not Found'}</h1>
        <p className="text-muted-foreground mb-6">{isRTL ? 'הקהילה אינה קיימת או לא פורסמה עדיין' : 'This community does not exist or has not been published yet.'}</p>
        <Button onClick={() => window.location.href = '/'}>{isRTL ? 'לדף הבית' : 'Go Home'}</Button>
      </div>
    );
  }

  const primaryColor = page.primary_color || '#6366f1';
  const secondaryColor = page.secondary_color || '#8b5cf6';
  const benefits = page.benefits || [];
  const testimonials = page.testimonials || [];
  const faq = page.faq || [];
  const socials = page.about_creator_socials || {};

  return (
    <>
      <Helmet>
        <title>{page.hero_title} | PLUG</title>
        <meta name="description" content={page.hero_description || ''} />
      </Helmet>

      <div className="min-h-screen" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Hero Section */}
        <section
          className="relative py-24 md:py-32 px-6 text-center text-white overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
        >
          {page.hero_image_url && (
            <img
              src={page.hero_image_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-15 pointer-events-none"
            />
          )}
          <div className="relative z-10 max-w-4xl mx-auto space-y-6">
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight">
              {page.hero_title}
            </h1>
            {page.hero_description && (
              <p className="text-lg md:text-2xl opacity-90 max-w-2xl mx-auto leading-relaxed">
                {page.hero_description}
              </p>
            )}
            {page.hero_video_url && (
              <div className="max-w-2xl mx-auto mt-8 rounded-2xl overflow-hidden shadow-2xl">
                <iframe
                  src={page.hero_video_url}
                  className="w-full aspect-video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
            {page.hero_cta_text && (
              <Button
                size="lg"
                className="mt-6 bg-white text-gray-900 hover:bg-gray-100 font-bold text-lg px-10 py-4 rounded-full shadow-xl hover:shadow-2xl transition-all hover:scale-105"
              >
                {page.hero_cta_text}
                <ArrowRight className={cn('w-5 h-5', isRTL ? 'mr-2 rotate-180' : 'ml-2')} />
              </Button>
            )}
          </div>
          {/* Decorative shapes */}
          <div className="absolute top-0 left-0 w-72 h-72 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3" />
        </section>

        {/* Benefits Section */}
        {benefits.length > 0 && (
          <section className="py-20 px-6 bg-white">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
                {isRTL ? 'מה תקבלו בקהילה' : 'What You Get'}
              </h2>
              <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
                {isRTL ? 'כל מה שאתם צריכים כדי להצליח' : 'Everything you need to succeed'}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {benefits.map((b: any, i: number) => (
                  <div
                    key={i}
                    className="group p-6 rounded-2xl border bg-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                  >
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {getIcon(b.icon)}
                    </div>
                    <h3 className="text-xl font-bold mb-2">{b.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{b.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* About Creator */}
        {page.about_creator_name && (
          <section className="py-20 px-6 bg-gray-50">
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row items-center gap-10">
                {page.about_creator_avatar && (
                  <div className="flex-shrink-0">
                    <img
                      src={page.about_creator_avatar}
                      alt={page.about_creator_name}
                      className="w-40 h-40 rounded-full object-cover border-4 border-white shadow-xl"
                    />
                  </div>
                )}
                <div className={cn('space-y-4 flex-1', isRTL ? 'text-right' : 'text-left')}>
                  <h2 className="text-3xl font-bold">{page.about_creator_name}</h2>
                  <p className="text-muted-foreground text-lg leading-relaxed whitespace-pre-wrap">
                    {page.about_creator_bio}
                  </p>
                  <div className="flex gap-4 pt-2">
                    {socials.linkedin && (
                      <a href={socials.linkedin} target="_blank" rel="noreferrer"
                        className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                        LinkedIn <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {socials.twitter && (
                      <a href={socials.twitter} target="_blank" rel="noreferrer"
                        className="text-sky-500 hover:text-sky-700 font-medium flex items-center gap-1">
                        Twitter <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {socials.website && (
                      <a href={socials.website} target="_blank" rel="noreferrer"
                        className="text-gray-600 hover:text-gray-800 font-medium flex items-center gap-1">
                        {isRTL ? 'אתר' : 'Website'} <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Testimonials */}
        {testimonials.length > 0 && (
          <section className="py-20 px-6 bg-white">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
                {isRTL ? 'מה אומרים החברים שלנו' : 'What Our Members Say'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {testimonials.map((t: any, i: number) => (
                  <Card key={i} className="bg-gray-50 border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, si) => (
                          <Star key={si} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                      <p className="text-gray-700 leading-relaxed italic">"{t.text}"</p>
                      <div className="flex items-center gap-3 pt-2 border-t">
                        {t.avatar ? (
                          <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: primaryColor }}>
                            {t.name?.charAt(0) || '?'}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-sm">{t.name}</p>
                          <p className="text-xs text-muted-foreground">{t.role}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Pricing */}
        {plans.length > 0 && (
          <section className="py-20 px-6 bg-gray-50">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
                {isRTL ? 'תוכניות מחיר' : 'Choose Your Plan'}
              </h2>
              <p className="text-center text-muted-foreground mb-12">
                {isRTL ? 'בחרו את התוכנית המתאימה לכם' : 'Pick the plan that works best for you'}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {plans.map((plan: any, i: number) => (
                  <Card
                    key={plan.id}
                    className={cn(
                      'relative overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1',
                      plan.is_popular && 'ring-2 scale-105',
                    )}
                    style={plan.is_popular ? { borderColor: primaryColor, ringColor: primaryColor } : undefined}
                  >
                    {plan.is_popular && (
                      <div
                        className="absolute top-0 left-0 right-0 py-1.5 text-center text-white text-xs font-bold uppercase tracking-wide"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {isRTL ? 'הכי פופולרי' : 'Most Popular'}
                      </div>
                    )}
                    <CardContent className={cn('p-8 text-center space-y-5', plan.is_popular && 'pt-12')}>
                      <h3 className="text-xl font-bold">{plan.name}</h3>
                      <div className="space-y-1">
                        <div className="text-5xl font-extrabold" style={{ color: primaryColor }}>
                          {plan.currency === 'ILS' ? '\u20AA' : '$'}{plan.price}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          /{isRTL ? 'חודש' : 'month'}
                        </span>
                      </div>
                      {plan.description && (
                        <p className="text-muted-foreground text-sm">{plan.description}</p>
                      )}
                      <Button
                        className="w-full text-white font-bold py-3 rounded-xl"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {isRTL ? 'הצטרפות עכשיו' : 'Join Now'}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* FAQ */}
        {faq.length > 0 && (
          <section className="py-20 px-6 bg-white">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
                {isRTL ? 'שאלות נפוצות' : 'Frequently Asked Questions'}
              </h2>
              <Accordion type="single" collapsible className="space-y-3">
                {faq.map((item: any, i: number) => (
                  <AccordionItem
                    key={i}
                    value={`faq-${i}`}
                    className="border rounded-xl px-6 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <AccordionTrigger className="text-base md:text-lg font-medium py-5">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>
        )}

        {/* Final CTA */}
        {page.final_cta_title && (
          <section
            className="py-20 px-6 text-center text-white relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
          >
            <div className="relative z-10 max-w-3xl mx-auto space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold">{page.final_cta_title}</h2>
              {page.final_cta_description && (
                <p className="text-lg opacity-90 leading-relaxed">{page.final_cta_description}</p>
              )}
              {page.final_cta_button && (
                <Button
                  size="lg"
                  className="bg-white text-gray-900 hover:bg-gray-100 font-bold text-lg px-10 py-4 rounded-full shadow-xl hover:shadow-2xl transition-all hover:scale-105"
                >
                  {page.final_cta_button}
                  <ArrowRight className={cn('w-5 h-5', isRTL ? 'mr-2 rotate-180' : 'ml-2')} />
                </Button>
              )}
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/5 rounded-full -translate-x-1/3 translate-y-1/3" />
          </section>
        )}

        {/* Footer */}
        <footer className="py-8 px-6 bg-gray-900 text-center">
          <p className="text-gray-400 text-sm">
            Powered by <span className="text-white font-semibold">PLUG</span>
          </p>
        </footer>
      </div>
    </>
  );
}
