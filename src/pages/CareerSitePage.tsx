import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Globe, MapPin, Users, Briefcase, Star, Play, ArrowLeft } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

interface CareerSitePublicData {
  id: string;
  company_name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  primary_color: string | null;
  culture_text: string | null;
  video_url: string | null;
  is_published: boolean | null;
  hide_plug_branding: boolean | null;
}

export default function CareerSitePage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: site, isLoading, error } = useQuery({
    queryKey: ['public-career-site', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('career_sites')
        .select('*')
        .eq('slug', slug!)
        .eq('is_published', true)
        .maybeSingle();
      if (error) throw error;
      return data as CareerSitePublicData | null;
    },
    enabled: !!slug,
  });

  const { data: blocks = [] } = useQuery({
    queryKey: ['public-career-blocks', site?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('career_site_blocks')
        .select('*')
        .eq('career_site_id', site!.id)
        .eq('is_visible', true)
        .order('sort_order');
      return data || [];
    },
    enabled: !!site?.id,
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['public-career-jobs', site?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('jobs')
        .select('id, title, location, job_type, salary_min, salary_max')
        .eq('status', 'active')
        .limit(10);
      return data || [];
    },
    enabled: !!site?.id,
  });

  const { data: teamStories = [] } = useQuery({
    queryKey: ['public-team-stories', site?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('career_site_team_stories')
        .select('*')
        .eq('career_site_id', site!.id)
        .order('sort_order');
      return data || [];
    },
    enabled: !!site?.id,
  });

  // Track page view
  useEffect(() => {
    if (site?.id) {
      supabase.from('career_site_analytics').insert({
        career_site_id: site.id,
        event_type: 'page_view',
        referrer: document.referrer,
      });
    }
  }, [site?.id]);

  const primaryColor = site?.primary_color || '#6366f1';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!site) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
        <Globe className="w-16 h-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">אתר קריירה לא נמצא</h1>
        <p className="text-muted-foreground">העמוד המבוקש אינו קיים או לא פורסם.</p>
        <Button variant="outline" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4 me-2" />
          חזרה
        </Button>
      </div>
    );
  }

  const renderBlock = (block: { id: string; block_type: string; config: Record<string, unknown> }) => {
    const cfg = block.config as Record<string, unknown>;

    switch (block.block_type) {
      case 'hero':
        return (
          <section key={block.id} className="relative min-h-[400px] flex items-center justify-center text-center overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${primaryColor}22, ${primaryColor}44)` }}>
            <div className="z-10 px-6 py-16 max-w-3xl mx-auto">
              {site.logo_url && <img src={site.logo_url} alt={site.company_name} className="h-16 mx-auto mb-8 object-contain" />}
              <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: primaryColor }}>
                {(cfg.headline as string) || site.company_name}
              </h1>
              <p className="text-xl text-muted-foreground mb-8">{(cfg.subheadline as string) || site.tagline}</p>
              <Button size="lg" style={{ backgroundColor: primaryColor }} className="text-white"
                onClick={() => document.getElementById('open-positions')?.scrollIntoView({ behavior: 'smooth' })}>
                {(cfg.cta_text as string) || 'צפה במשרות פתוחות'}
              </Button>
            </div>
          </section>
        );

      case 'about':
        return (
          <section key={block.id} className="py-16 px-6 max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-6">{(cfg.title as string) || 'אודותינו'}</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {(cfg.text as string) || site.description}
            </p>
          </section>
        );

      case 'culture':
        const values = (cfg.values as string[]) || [];
        return (
          <section key={block.id} className="py-16 px-6 max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">{(cfg.title as string) || 'הערכים שלנו'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {values.map((v, i) => (
                <div key={i} className="p-6 rounded-2xl text-center border" style={{ borderColor: `${primaryColor}33` }}>
                  <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: `${primaryColor}22` }}>
                    <Star className="w-6 h-6" style={{ color: primaryColor }} />
                  </div>
                  <p className="font-semibold text-lg">{v}</p>
                </div>
              ))}
            </div>
          </section>
        );

      case 'benefits':
        const items = (cfg.items as Array<{ icon: string; title: string; desc: string }>) || [];
        return (
          <section key={block.id} className="py-16 px-6 max-w-5xl mx-auto" style={{ backgroundColor: `${primaryColor}08` }}>
            <h2 className="text-3xl font-bold mb-8 text-center">{(cfg.title as string) || 'ההטבות שלנו'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item, i) => (
                <div key={i} className="p-4 rounded-xl bg-background border flex items-start gap-4">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );

      case 'team_stories':
        return (
          <section key={block.id} className="py-16 px-6 max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">{(cfg.title as string) || 'מה הצוות אומר'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teamStories.map(story => (
                <div key={story.id} className="p-6 rounded-2xl border bg-card">
                  <p className="text-muted-foreground italic mb-4">"{story.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
                      style={{ backgroundColor: primaryColor }}>
                      {story.employee_name[0]}
                    </div>
                    <div>
                      <p className="font-semibold">{story.employee_name}</p>
                      {story.employee_title && <p className="text-sm text-muted-foreground">{story.employee_title}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );

      case 'open_jobs':
        return (
          <section key={block.id} id="open-positions" className="py-16 px-6 max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">{(cfg.title as string) || 'משרות פתוחות'}</h2>
            <div className="space-y-3">
              {jobs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">אין משרות פתוחות כרגע</p>
              ) : (
                jobs.map(job => (
                  <div key={job.id} className="p-4 rounded-xl border bg-card flex items-center justify-between hover:border-primary/50 transition-colors">
                    <div>
                      <p className="font-semibold">{job.title}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        {job.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>}
                        {job.job_type && <Badge variant="secondary">{job.job_type}</Badge>}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      style={{ borderColor: primaryColor, color: primaryColor }}
                      onClick={() => {
                        supabase.from('career_site_analytics').insert({ career_site_id: site.id, event_type: 'job_apply_click' });
                        document.getElementById('career-cta')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      הגש מועמדות
                    </Button>
                  </div>
                ))
              )}
            </div>
          </section>
        );

      case 'video':
        if (!site.video_url) return null;
        return (
          <section key={block.id} className="py-16 px-6 max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-center">{(cfg.title as string) || 'הכירו אותנו'}</h2>
            <div className="rounded-2xl overflow-hidden aspect-video border">
              <iframe src={site.video_url} className="w-full h-full" allowFullScreen />
            </div>
          </section>
        );

      case 'stats':
        const statItems = (cfg.items as Array<{ value: string; label: string }>) || [];
        return (
          <section key={block.id} className="py-16 px-6 max-w-5xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {statItems.map((stat, i) => (
                <div key={i}>
                  <p className="text-4xl font-bold" style={{ color: primaryColor }}>{stat.value}</p>
                  <p className="text-muted-foreground mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </section>
        );

      case 'cta':
        return (
          <section key={block.id} id="career-cta" className="py-20 px-6 text-center" style={{ background: `linear-gradient(135deg, ${primaryColor}22, ${primaryColor}44)` }}>
            <h2 className="text-3xl font-bold mb-4">{(cfg.headline as string) || 'מוכנים להצטרף?'}</h2>
            <p className="text-muted-foreground mb-8">{site.tagline}</p>
            <Button
              size="lg"
              style={{ backgroundColor: primaryColor }}
              className="text-white"
              onClick={() => {
                supabase.from('career_site_analytics').insert({ career_site_id: site.id, event_type: 'cta_click' });
                const openPositions = document.getElementById('open-positions');
                if (openPositions) {
                  openPositions.scrollIntoView({ behavior: 'smooth' });
                } else {
                  window.location.href = window.location.origin;
                }
              }}
            >
              {(cfg.cta_text as string) || 'שלח קורות חיים'}
            </Button>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Helmet>
        <title>{site.company_name} – {site.tagline || 'Career Site'}</title>
        <meta name="description" content={site.description || `Join ${site.company_name}`} />
        <meta property="og:title" content={`${site.company_name} – ${site.tagline || 'Careers'}`} />
        <meta property="og:description" content={site.description || ''} />
        {site.logo_url && <meta property="og:image" content={site.logo_url} />}
      </Helmet>
      <div className="min-h-screen bg-background" dir="rtl">
        {blocks.map(b => renderBlock({ id: b.id, block_type: b.block_type, config: b.config as Record<string, unknown> }))}

        {/* Footer */}
        <footer className="border-t py-8 px-6 text-center text-sm text-muted-foreground">
          {!site.hide_plug_branding && (
            <p>Powered by <a href="/" className="text-primary font-semibold">PLUG</a></p>
          )}
          <p className="mt-1">© {new Date().getFullYear()} {site.company_name}</p>
        </footer>
      </div>
    </>
  );
}
