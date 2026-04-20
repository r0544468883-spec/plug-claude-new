import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Sparkles, Building2, Users, ArrowLeft, ArrowRight, ExternalLink, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

interface CompanyInsight {
  id: string;
  company_name: string;
  company_url: string | null;
  tagline: string | null;
  industry: string | null;
  company_size: string | null;
  insights: string | null;
  known_people: string[];
  analyzed_at: string;
}

export default function MySecrets() {
  const { user, isLoading: authLoading } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: insights = [], isLoading, refetch } = useQuery({
    queryKey: ['company-insights', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase.from('company_insights') as any)
        .select('*')
        .eq('user_id', user.id)
        .order('analyzed_at', { ascending: false });
      if (error) throw error;
      return (data || []) as CompanyInsight[];
    },
    enabled: !!user,
  });

  const handleDelete = async (id: string) => {
    await (supabase.from('company_insights') as any).delete().eq('id', id);
    refetch();
  };

  if (authLoading) return null;
  if (!user) return <Navigate to="/" replace />;

  return (
    <DashboardLayout activeSection="my-secrets">
      <div className="max-w-4xl mx-auto p-4 md:p-6" dir={isHebrew ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="text-plug-gray hover:text-white"
          >
            {isHebrew ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          </Button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-plug-mint" />
            <h1 className="text-xl font-bold text-white">
              {isHebrew ? 'My Secrets — תובנות חברות' : 'My Secrets — Company Insights'}
            </h1>
          </div>
        </div>

        <p className="text-plug-gray text-sm mb-6">
          {isHebrew
            ? 'כאן מרוכזים כל הניתוחים שפלאג ביצע על חברות שביקרת בהן בלינקדאין — מידע על החברה, אנשי קשר, והתאמת התפקיד.'
            : 'All company analyses PLUG performed when you visited LinkedIn company pages — company info, contacts, and role fit.'}
        </p>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 w-full rounded-xl bg-plug-card" />
            ))}
          </div>
        ) : insights.length === 0 ? (
          <Card className="bg-plug-card border-plug-border">
            <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
              <Building2 className="w-12 h-12 text-plug-gray/40" />
              <p className="text-plug-gray text-center">
                {isHebrew
                  ? 'עדיין אין תובנות. בקר בדפי חברות בלינקדאין עם התוסף פעיל כדי לראות ניתוחים כאן.'
                  : 'No insights yet. Visit LinkedIn company pages with the extension active to see analyses here.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {insights.map((insight) => {
              const isExpanded = expandedId === insight.id;
              return (
                <Card
                  key={insight.id}
                  className="bg-plug-card border-plug-border hover:border-plug-mint/30 transition-colors cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : insight.id)}
                >
                  <CardContent className="p-4">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-plug-mint/10 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-5 h-5 text-plug-mint" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-white font-semibold text-sm truncate">{insight.company_name}</h3>
                          <div className="flex items-center gap-2 text-[11px] text-plug-gray">
                            {insight.industry && <span>{insight.industry}</span>}
                            {insight.company_size && <span>• {insight.company_size}</span>}
                          </div>
                          {insight.tagline && (
                            <p className="text-[11px] text-plug-gray/70 truncate mt-0.5">{insight.tagline}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] text-plug-gray">
                          {new Date(insight.analyzed_at).toLocaleDateString(isHebrew ? 'he-IL' : 'en-US')}
                        </span>
                        {isExpanded ? '▲' : '▼'}
                      </div>
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="mt-4 pt-3 border-t border-plug-border/40 space-y-3">
                        {/* AI Insights */}
                        {insight.insights && (
                          <div
                            className="text-sm text-plug-gray leading-relaxed whitespace-pre-wrap"
                            dangerouslySetInnerHTML={{
                              __html: insight.insights.replace(
                                /\*\*(.*?)\*\*/g,
                                '<strong class="text-plug-mint">$1</strong>'
                              ),
                            }}
                          />
                        )}

                        {/* Known people */}
                        {insight.known_people?.length > 0 && (
                          <div className="mt-2">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Users className="w-3.5 h-3.5 text-plug-mint" />
                              <span className="text-xs text-plug-mint font-semibold">
                                {isHebrew ? 'אנשי קשר' : 'Contacts'}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {insight.known_people.map((person, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] bg-plug-navy border border-plug-border px-2 py-0.5 rounded-full text-plug-gray"
                                >
                                  {person}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 mt-2">
                          {insight.company_url && (
                            <a
                              href={insight.company_url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 text-[11px] text-plug-mint hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" />
                              {isHebrew ? 'פתח בלינקדאין' : 'Open in LinkedIn'}
                            </a>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(insight.id); }}
                            className="inline-flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-3 h-3" />
                            {isHebrew ? 'מחק' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
