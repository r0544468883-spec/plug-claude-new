import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Eye, Edit3, Save, Loader2, Plus, Trash2, Palette,
  Globe, Star, MessageSquare, HelpCircle, CreditCard,
  ImageIcon, Video, Link2, ChevronUp, ChevronDown,
  Sparkles, Users, Award, CheckCircle, ArrowRight,
} from 'lucide-react';

interface CommunityLandingPageEditorProps {
  hubId: string;
}

interface BenefitItem {
  icon: string;
  title: string;
  description: string;
}

interface TestimonialItem {
  name: string;
  role: string;
  avatar: string;
  text: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

interface LandingPageData {
  id?: string;
  hub_id: string;
  slug: string;
  is_published: boolean;
  view_count: number;
  primary_color: string;
  secondary_color: string;
  hero_title: string;
  hero_description: string;
  hero_image_url: string;
  hero_video_url: string;
  hero_cta_text: string;
  benefits: BenefitItem[];
  about_creator_name: string;
  about_creator_bio: string;
  about_creator_avatar: string;
  about_creator_socials: { linkedin?: string; twitter?: string; website?: string };
  testimonials: TestimonialItem[];
  faq: FAQItem[];
  final_cta_title: string;
  final_cta_description: string;
  final_cta_button: string;
}

const DEFAULT_PAGE: LandingPageData = {
  hub_id: '',
  slug: '',
  is_published: false,
  view_count: 0,
  primary_color: '#6366f1',
  secondary_color: '#8b5cf6',
  hero_title: '',
  hero_description: '',
  hero_image_url: '',
  hero_video_url: '',
  hero_cta_text: '',
  benefits: [
    { icon: 'star', title: '', description: '' },
    { icon: 'users', title: '', description: '' },
    { icon: 'award', title: '', description: '' },
  ],
  about_creator_name: '',
  about_creator_bio: '',
  about_creator_avatar: '',
  about_creator_socials: {},
  testimonials: [],
  faq: [],
  final_cta_title: '',
  final_cta_description: '',
  final_cta_button: '',
};

const ICON_OPTIONS = ['star', 'users', 'award', 'sparkles', 'checkCircle', 'globe', 'creditCard', 'messageSquare'];

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

export function CommunityLandingPageEditor({ hubId }: CommunityLandingPageEditorProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [page, setPage] = useState<LandingPageData>({ ...DEFAULT_PAGE, hub_id: hubId });

  // Fetch hub info for auto-slug
  const { data: hub } = useQuery({
    queryKey: ['community-hub', hubId],
    queryFn: async () => {
      const { data, error } = await supabase.from('community_hubs').select('*').eq('id', hubId).single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing landing page
  const { data: existingPage, isLoading } = useQuery({
    queryKey: ['community-landing-page', hubId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('community_landing_pages')
        .select('*')
        .eq('hub_id', hubId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch subscription plans for pricing section
  const { data: plans = [] } = useQuery({
    queryKey: ['community-plans', hubId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('community_subscription_plans')
        .select('*')
        .eq('hub_id', hubId)
        .eq('is_active', true)
        .order('price', { ascending: true });
      return data || [];
    },
  });

  useEffect(() => {
    if (existingPage) {
      setPage({
        ...DEFAULT_PAGE,
        ...existingPage,
        benefits: existingPage.benefits || DEFAULT_PAGE.benefits,
        testimonials: existingPage.testimonials || [],
        faq: existingPage.faq || [],
        about_creator_socials: existingPage.about_creator_socials || {},
      });
    } else if (hub) {
      const slug = hub.name
        .toLowerCase()
        .replace(/[^a-z0-9\u0590-\u05FF\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 60);
      setPage(prev => ({ ...prev, slug, hero_title: hub.name }));
    }
  }, [existingPage, hub]);

  const saveMutation = useMutation({
    mutationFn: async (data: LandingPageData) => {
      const payload = {
        hub_id: hubId,
        slug: data.slug,
        is_published: data.is_published,
        primary_color: data.primary_color,
        secondary_color: data.secondary_color,
        hero_title: data.hero_title,
        hero_description: data.hero_description,
        hero_image_url: data.hero_image_url,
        hero_video_url: data.hero_video_url,
        hero_cta_text: data.hero_cta_text,
        benefits: data.benefits,
        about_creator_name: data.about_creator_name,
        about_creator_bio: data.about_creator_bio,
        about_creator_avatar: data.about_creator_avatar,
        about_creator_socials: data.about_creator_socials,
        testimonials: data.testimonials,
        faq: data.faq,
        final_cta_title: data.final_cta_title,
        final_cta_description: data.final_cta_description,
        final_cta_button: data.final_cta_button,
      };

      if (data.id) {
        const { error } = await (supabase as any)
          .from('community_landing_pages')
          .update(payload)
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await (supabase as any)
          .from('community_landing_pages')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setPage(prev => ({ ...prev, id: inserted.id }));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-landing-page', hubId] });
      toast.success(isRTL ? 'הדף נשמר בהצלחה' : 'Page saved successfully');
    },
    onError: () => {
      toast.error(isRTL ? 'שגיאה בשמירה' : 'Failed to save');
    },
  });

  const updateField = <K extends keyof LandingPageData>(key: K, value: LandingPageData[K]) => {
    setPage(prev => ({ ...prev, [key]: value }));
  };

  const updateBenefit = (index: number, field: keyof BenefitItem, value: string) => {
    const updated = [...page.benefits];
    updated[index] = { ...updated[index], [field]: value };
    updateField('benefits', updated);
  };

  const addBenefit = () => {
    if (page.benefits.length >= 6) return;
    updateField('benefits', [...page.benefits, { icon: 'star', title: '', description: '' }]);
  };

  const removeBenefit = (index: number) => {
    if (page.benefits.length <= 3) return;
    updateField('benefits', page.benefits.filter((_, i) => i !== index));
  };

  const addTestimonial = () => {
    updateField('testimonials', [...page.testimonials, { name: '', role: '', avatar: '', text: '' }]);
  };

  const updateTestimonial = (index: number, field: keyof TestimonialItem, value: string) => {
    const updated = [...page.testimonials];
    updated[index] = { ...updated[index], [field]: value };
    updateField('testimonials', updated);
  };

  const removeTestimonial = (index: number) => {
    updateField('testimonials', page.testimonials.filter((_, i) => i !== index));
  };

  const addFAQ = () => {
    updateField('faq', [...page.faq, { question: '', answer: '' }]);
  };

  const updateFAQ = (index: number, field: keyof FAQItem, value: string) => {
    const updated = [...page.faq];
    updated[index] = { ...updated[index], [field]: value };
    updateField('faq', updated);
  };

  const removeFAQ = (index: number) => {
    updateField('faq', page.faq.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ─── Preview ────────────────────────────────────────────────────
  const renderPreview = () => (
    <div className="space-y-0 rounded-xl overflow-hidden border" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Hero */}
      <section
        className="relative py-20 px-6 text-center text-white"
        style={{
          background: `linear-gradient(135deg, ${page.primary_color}, ${page.secondary_color})`,
        }}
      >
        {page.hero_image_url && (
          <img
            src={page.hero_image_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-20"
          />
        )}
        <div className="relative z-10 max-w-3xl mx-auto space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold">{page.hero_title || (isRTL ? 'שם הקהילה' : 'Community Name')}</h1>
          <p className="text-lg md:text-xl opacity-90">{page.hero_description}</p>
          {page.hero_cta_text && (
            <Button size="lg" className="mt-4 bg-white text-gray-900 hover:bg-gray-100 font-bold text-lg px-8 py-3">
              {page.hero_cta_text}
            </Button>
          )}
        </div>
      </section>

      {/* Benefits */}
      {page.benefits.length > 0 && (
        <section className="py-16 px-6 bg-white">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-10">{isRTL ? 'מה תקבלו' : 'What You Get'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {page.benefits.map((b, i) => (
                <div key={i} className="text-center space-y-3">
                  <div
                    className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-white"
                    style={{ backgroundColor: page.primary_color }}
                  >
                    {getIcon(b.icon)}
                  </div>
                  <h3 className="text-xl font-semibold">{b.title}</h3>
                  <p className="text-muted-foreground">{b.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* About Creator */}
      {page.about_creator_name && (
        <section className="py-16 px-6 bg-gray-50">
          <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center gap-8">
            {page.about_creator_avatar && (
              <img
                src={page.about_creator_avatar}
                alt={page.about_creator_name}
                className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
              />
            )}
            <div className={cn('space-y-3', isRTL ? 'text-right' : 'text-left')}>
              <h2 className="text-2xl font-bold">{page.about_creator_name}</h2>
              <p className="text-muted-foreground whitespace-pre-wrap">{page.about_creator_bio}</p>
              <div className="flex gap-3">
                {page.about_creator_socials?.linkedin && (
                  <a href={page.about_creator_socials.linkedin} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">LinkedIn</a>
                )}
                {page.about_creator_socials?.twitter && (
                  <a href={page.about_creator_socials.twitter} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Twitter</a>
                )}
                {page.about_creator_socials?.website && (
                  <a href={page.about_creator_socials.website} target="_blank" rel="noreferrer" className="text-gray-600 hover:underline">{isRTL ? 'אתר' : 'Website'}</a>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Testimonials */}
      {page.testimonials.length > 0 && (
        <section className="py-16 px-6 bg-white">
          <h2 className="text-3xl font-bold text-center mb-10">{isRTL ? 'מה אומרים עלינו' : 'Testimonials'}</h2>
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {page.testimonials.map((t, i) => (
              <Card key={i} className="bg-gray-50">
                <CardContent className="p-6 space-y-4">
                  <p className="text-muted-foreground italic">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    {t.avatar && (
                      <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
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
        </section>
      )}

      {/* Pricing */}
      {plans.length > 0 && (
        <section className="py-16 px-6 bg-gray-50">
          <h2 className="text-3xl font-bold text-center mb-10">{isRTL ? 'תוכניות מחיר' : 'Pricing Plans'}</h2>
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan: any) => (
              <Card key={plan.id} className="relative overflow-hidden">
                {plan.is_popular && (
                  <div
                    className="absolute top-0 left-0 right-0 py-1 text-center text-white text-sm font-bold"
                    style={{ backgroundColor: page.primary_color }}
                  >
                    {isRTL ? 'הכי פופולרי' : 'Most Popular'}
                  </div>
                )}
                <CardContent className={cn('p-6 space-y-4 text-center', plan.is_popular && 'pt-10')}>
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <div className="text-4xl font-bold" style={{ color: page.primary_color }}>
                    {plan.currency === 'ILS' ? '\u20AA' : '$'}{plan.price}
                    <span className="text-sm text-muted-foreground font-normal">/{isRTL ? 'חודש' : 'mo'}</span>
                  </div>
                  <p className="text-muted-foreground text-sm">{plan.description}</p>
                  <Button className="w-full" style={{ backgroundColor: page.primary_color }}>
                    {isRTL ? 'הצטרפות' : 'Join'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      {page.faq.length > 0 && (
        <section className="py-16 px-6 bg-white">
          <h2 className="text-3xl font-bold text-center mb-10">{isRTL ? 'שאלות נפוצות' : 'FAQ'}</h2>
          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="space-y-2">
              {page.faq.map((item, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border rounded-lg px-4">
                  <AccordionTrigger className="text-base font-medium">{item.question}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      )}

      {/* Final CTA */}
      {page.final_cta_title && (
        <section
          className="py-16 px-6 text-center text-white"
          style={{ background: `linear-gradient(135deg, ${page.primary_color}, ${page.secondary_color})` }}
        >
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-3xl font-bold">{page.final_cta_title}</h2>
            <p className="text-lg opacity-90">{page.final_cta_description}</p>
            {page.final_cta_button && (
              <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-100 font-bold text-lg px-8">
                {page.final_cta_button}
              </Button>
            )}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-6 px-6 bg-gray-900 text-gray-400 text-center text-sm">
        Powered by <span className="text-white font-semibold">PLUG</span>
      </footer>
    </div>
  );

  // ─── Editor ─────────────────────────────────────────────────────
  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold">{isRTL ? 'עורך דף נחיתה' : 'Landing Page Editor'}</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="publish-toggle" className="text-sm">
              {isRTL ? 'פורסם' : 'Published'}
            </Label>
            <Switch
              id="publish-toggle"
              checked={page.is_published}
              onCheckedChange={v => updateField('is_published', v)}
            />
          </div>
          <Button
            variant={mode === 'edit' ? 'outline' : 'default'}
            size="sm"
            onClick={() => setMode(mode === 'edit' ? 'preview' : 'edit')}
          >
            {mode === 'edit' ? <Eye className="w-4 h-4 mr-1" /> : <Edit3 className="w-4 h-4 mr-1" />}
            {mode === 'edit' ? (isRTL ? 'תצוגה מקדימה' : 'Preview') : (isRTL ? 'עריכה' : 'Edit')}
          </Button>
          <Button size="sm" onClick={() => saveMutation.mutate(page)} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
            {isRTL ? 'שמירה' : 'Save'}
          </Button>
        </div>
      </div>

      {page.slug && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link2 className="w-4 h-4" />
          <span>{window.location.origin}/c/{page.slug}</span>
        </div>
      )}

      {mode === 'preview' ? (
        renderPreview()
      ) : (
        <Tabs defaultValue="hero" className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="hero">{isRTL ? 'כותרת ראשית' : 'Hero'}</TabsTrigger>
            <TabsTrigger value="benefits">{isRTL ? 'יתרונות' : 'Benefits'}</TabsTrigger>
            <TabsTrigger value="about">{isRTL ? 'אודות היוצר' : 'About'}</TabsTrigger>
            <TabsTrigger value="testimonials">{isRTL ? 'המלצות' : 'Testimonials'}</TabsTrigger>
            <TabsTrigger value="faq">{isRTL ? 'שאלות נפוצות' : 'FAQ'}</TabsTrigger>
            <TabsTrigger value="cta">{isRTL ? 'קריאה לפעולה' : 'CTA'}</TabsTrigger>
            <TabsTrigger value="style">{isRTL ? 'עיצוב' : 'Style'}</TabsTrigger>
          </TabsList>

          {/* Hero */}
          <TabsContent value="hero">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label>{isRTL ? 'Slug (כתובת)' : 'Slug (URL)'}</Label>
                  <Input value={page.slug} onChange={e => updateField('slug', e.target.value)} placeholder="my-community" dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? 'כותרת' : 'Title'}</Label>
                  <Input value={page.hero_title} onChange={e => updateField('hero_title', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? 'תיאור' : 'Description'}</Label>
                  <Textarea value={page.hero_description} onChange={e => updateField('hero_description', e.target.value)} rows={3} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{isRTL ? 'תמונת רקע (URL)' : 'Background Image URL'}</Label>
                    <Input value={page.hero_image_url} onChange={e => updateField('hero_image_url', e.target.value)} dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label>{isRTL ? 'סרטון (URL)' : 'Video URL'}</Label>
                    <Input value={page.hero_video_url} onChange={e => updateField('hero_video_url', e.target.value)} dir="ltr" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? 'טקסט כפתור CTA' : 'CTA Button Text'}</Label>
                  <Input value={page.hero_cta_text} onChange={e => updateField('hero_cta_text', e.target.value)} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Benefits */}
          <TabsContent value="benefits">
            <Card>
              <CardContent className="p-6 space-y-4">
                {page.benefits.map((b, i) => (
                  <div key={i} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{isRTL ? `יתרון ${i + 1}` : `Benefit ${i + 1}`}</span>
                      {page.benefits.length > 3 && (
                        <Button variant="ghost" size="sm" onClick={() => removeBenefit(i)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>{isRTL ? 'אייקון' : 'Icon'}</Label>
                      <div className="flex flex-wrap gap-2">
                        {ICON_OPTIONS.map(icon => (
                          <button
                            key={icon}
                            type="button"
                            className={cn(
                              'p-2 rounded-lg border transition-colors',
                              b.icon === icon ? 'border-primary bg-primary/10' : 'border-gray-200 hover:border-gray-300'
                            )}
                            onClick={() => updateBenefit(i, 'icon', icon)}
                          >
                            {getIcon(icon, 'w-5 h-5')}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{isRTL ? 'כותרת' : 'Title'}</Label>
                      <Input value={b.title} onChange={e => updateBenefit(i, 'title', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>{isRTL ? 'תיאור' : 'Description'}</Label>
                      <Textarea value={b.description} onChange={e => updateBenefit(i, 'description', e.target.value)} rows={2} />
                    </div>
                  </div>
                ))}
                {page.benefits.length < 6 && (
                  <Button variant="outline" onClick={addBenefit} className="w-full">
                    <Plus className="w-4 h-4 mr-1" /> {isRTL ? 'הוסף יתרון' : 'Add Benefit'}
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* About Creator */}
          <TabsContent value="about">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label>{isRTL ? 'שם' : 'Name'}</Label>
                  <Input value={page.about_creator_name} onChange={e => updateField('about_creator_name', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? 'תמונה (URL)' : 'Avatar URL'}</Label>
                  <Input value={page.about_creator_avatar} onChange={e => updateField('about_creator_avatar', e.target.value)} dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? 'ביוגרפיה' : 'Bio'}</Label>
                  <Textarea value={page.about_creator_bio} onChange={e => updateField('about_creator_bio', e.target.value)} rows={4} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>LinkedIn</Label>
                    <Input
                      value={page.about_creator_socials?.linkedin || ''}
                      onChange={e => updateField('about_creator_socials', { ...page.about_creator_socials, linkedin: e.target.value })}
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Twitter</Label>
                    <Input
                      value={page.about_creator_socials?.twitter || ''}
                      onChange={e => updateField('about_creator_socials', { ...page.about_creator_socials, twitter: e.target.value })}
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{isRTL ? 'אתר' : 'Website'}</Label>
                    <Input
                      value={page.about_creator_socials?.website || ''}
                      onChange={e => updateField('about_creator_socials', { ...page.about_creator_socials, website: e.target.value })}
                      dir="ltr"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Testimonials */}
          <TabsContent value="testimonials">
            <Card>
              <CardContent className="p-6 space-y-4">
                {page.testimonials.map((t, i) => (
                  <div key={i} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{isRTL ? `המלצה ${i + 1}` : `Testimonial ${i + 1}`}</span>
                      <Button variant="ghost" size="sm" onClick={() => removeTestimonial(i)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>{isRTL ? 'שם' : 'Name'}</Label>
                        <Input value={t.name} onChange={e => updateTestimonial(i, 'name', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>{isRTL ? 'תפקיד' : 'Role'}</Label>
                        <Input value={t.role} onChange={e => updateTestimonial(i, 'role', e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{isRTL ? 'תמונה (URL)' : 'Avatar URL'}</Label>
                      <Input value={t.avatar} onChange={e => updateTestimonial(i, 'avatar', e.target.value)} dir="ltr" />
                    </div>
                    <div className="space-y-2">
                      <Label>{isRTL ? 'ציטוט' : 'Quote'}</Label>
                      <Textarea value={t.text} onChange={e => updateTestimonial(i, 'text', e.target.value)} rows={2} />
                    </div>
                  </div>
                ))}
                <Button variant="outline" onClick={addTestimonial} className="w-full">
                  <Plus className="w-4 h-4 mr-1" /> {isRTL ? 'הוסף המלצה' : 'Add Testimonial'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FAQ */}
          <TabsContent value="faq">
            <Card>
              <CardContent className="p-6 space-y-4">
                {page.faq.map((item, i) => (
                  <div key={i} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{isRTL ? `שאלה ${i + 1}` : `Q&A ${i + 1}`}</span>
                      <Button variant="ghost" size="sm" onClick={() => removeFAQ(i)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label>{isRTL ? 'שאלה' : 'Question'}</Label>
                      <Input value={item.question} onChange={e => updateFAQ(i, 'question', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>{isRTL ? 'תשובה' : 'Answer'}</Label>
                      <Textarea value={item.answer} onChange={e => updateFAQ(i, 'answer', e.target.value)} rows={2} />
                    </div>
                  </div>
                ))}
                <Button variant="outline" onClick={addFAQ} className="w-full">
                  <Plus className="w-4 h-4 mr-1" /> {isRTL ? 'הוסף שאלה' : 'Add Q&A'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CTA */}
          <TabsContent value="cta">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label>{isRTL ? 'כותרת CTA סופי' : 'Final CTA Title'}</Label>
                  <Input value={page.final_cta_title} onChange={e => updateField('final_cta_title', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? 'תיאור' : 'Description'}</Label>
                  <Textarea value={page.final_cta_description} onChange={e => updateField('final_cta_description', e.target.value)} rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? 'טקסט כפתור' : 'Button Text'}</Label>
                  <Input value={page.final_cta_button} onChange={e => updateField('final_cta_button', e.target.value)} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Style */}
          <TabsContent value="style">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{isRTL ? 'צבע ראשי' : 'Primary Color'}</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={page.primary_color}
                        onChange={e => updateField('primary_color', e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer border"
                      />
                      <Input value={page.primary_color} onChange={e => updateField('primary_color', e.target.value)} dir="ltr" className="flex-1" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{isRTL ? 'צבע משני' : 'Secondary Color'}</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={page.secondary_color}
                        onChange={e => updateField('secondary_color', e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer border"
                      />
                      <Input value={page.secondary_color} onChange={e => updateField('secondary_color', e.target.value)} dir="ltr" className="flex-1" />
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <h3 className="font-medium mb-3">{isRTL ? 'תצוגה מקדימה של הצבעים' : 'Color Preview'}</h3>
                  <div
                    className="h-24 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                    style={{ background: `linear-gradient(135deg, ${page.primary_color}, ${page.secondary_color})` }}
                  >
                    {isRTL ? 'דוגמת גרדיאנט' : 'Gradient Preview'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
