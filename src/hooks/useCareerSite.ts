import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface CareerSiteBlock {
  id: string;
  career_site_id: string;
  block_type: string;
  sort_order: number;
  config: Record<string, unknown>;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamStory {
  id: string;
  career_site_id: string;
  employee_name: string;
  employee_title: string | null;
  employee_avatar_url: string | null;
  quote: string;
  sort_order: number;
}

export interface CareerSiteData {
  id: string;
  company_id: string;
  company_name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  custom_css: string | null;
  custom_font: string | null;
  benefits: unknown;
  social_links: unknown;
  culture_text: string | null;
  is_published: boolean | null;
  hide_plug_branding: boolean | null;
  video_url: string | null;
}

export const BLOCK_TYPES = [
  { id: 'hero', labelHe: 'כותרת ראשית (Hero)', labelEn: 'Hero Banner', icon: '🏠' },
  { id: 'about', labelHe: 'אודות החברה', labelEn: 'About Company', icon: '🏢' },
  { id: 'culture', labelHe: 'תרבות ארגונית', labelEn: 'Company Culture', icon: '🌱' },
  { id: 'benefits', labelHe: 'הטבות ויתרונות', labelEn: 'Benefits & Perks', icon: '🎁' },
  { id: 'team_stories', labelHe: 'סיפורי צוות', labelEn: 'Team Stories', icon: '👥' },
  { id: 'open_jobs', labelHe: 'משרות פתוחות', labelEn: 'Open Positions', icon: '💼' },
  { id: 'video', labelHe: 'סרטון תדמית', labelEn: 'Company Video', icon: '🎬' },
  { id: 'stats', labelHe: 'מספרים ועובדות', labelEn: 'Company Stats', icon: '📊' },
  { id: 'gallery', labelHe: 'גלריית תמונות', labelEn: 'Photo Gallery', icon: '🖼️' },
  { id: 'cta', labelHe: 'קריאה לפעולה', labelEn: 'Call to Action', icon: '🚀' },
] as const;

export function useCareerSite(companyId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: careerSite, isLoading } = useQuery({
    queryKey: ['career-site', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('career_sites')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();
      if (error) throw error;
      return data as CareerSiteData | null;
    },
    enabled: !!companyId,
  });

  const { data: blocks = [] } = useQuery({
    queryKey: ['career-site-blocks', careerSite?.id],
    queryFn: async () => {
      if (!careerSite?.id) return [];
      const { data, error } = await supabase
        .from('career_site_blocks')
        .select('*')
        .eq('career_site_id', careerSite.id)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as CareerSiteBlock[];
    },
    enabled: !!careerSite?.id,
  });

  const { data: teamStories = [] } = useQuery({
    queryKey: ['team-stories', careerSite?.id],
    queryFn: async () => {
      if (!careerSite?.id) return [];
      const { data, error } = await supabase
        .from('career_site_team_stories')
        .select('*')
        .eq('career_site_id', careerSite.id)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as TeamStory[];
    },
    enabled: !!careerSite?.id,
  });

  const createSite = useMutation({
    mutationFn: async (payload: Partial<CareerSiteData>) => {
      const { data, error } = await supabase
        .from('career_sites')
        .insert([{ 
          company_id: companyId,
          company_name: (payload.company_name as string) || 'My Company',
          slug: (payload.slug as string) || `company-${Date.now()}`,
          tagline: payload.tagline,
          description: payload.description,
          logo_url: payload.logo_url,
          cover_image_url: payload.cover_image_url,
          primary_color: payload.primary_color,
          secondary_color: payload.secondary_color,
          culture_text: payload.culture_text,
          video_url: payload.video_url,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career-site', companyId] });
      toast.success('אתר קריירה נוצר בהצלחה!');
    },
    onError: () => toast.error('שגיאה ביצירת אתר הקריירה'),
  });

  const updateSite = useMutation({
    mutationFn: async (updates: Partial<CareerSiteData>) => {
      if (!careerSite?.id) throw new Error('No site');
      // Pick only the scalar fields to avoid JSON type issues
      const safeUpdates = {
        tagline: updates.tagline,
        description: updates.description,
        logo_url: updates.logo_url,
        cover_image_url: updates.cover_image_url,
        primary_color: updates.primary_color,
        secondary_color: updates.secondary_color,
        culture_text: updates.culture_text,
        video_url: updates.video_url,
        is_published: updates.is_published,
        hide_plug_branding: updates.hide_plug_branding,
        company_name: updates.company_name,
        custom_css: updates.custom_css,
        custom_font: updates.custom_font,
      };
      const { error } = await supabase
        .from('career_sites')
        .update(safeUpdates)
        .eq('id', careerSite.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career-site', companyId] });
      toast.success('השינויים נשמרו');
    },
  });

  const addBlock = useMutation({
    mutationFn: async (blockType: string) => {
      if (!careerSite?.id) throw new Error('No site');
      const maxOrder = blocks.length > 0 ? Math.max(...blocks.map(b => b.sort_order)) : -1;
      const config = getDefaultBlockConfig(blockType) as import('@/integrations/supabase/types').Json;
      const { error } = await supabase
        .from('career_site_blocks')
        .insert([{
          career_site_id: careerSite.id,
          block_type: blockType,
          sort_order: maxOrder + 1,
          config,
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career-site-blocks', careerSite?.id] });
    },
  });

  const updateBlock = useMutation({
    mutationFn: async ({ id, config }: { id: string; config: Record<string, unknown> }) => {
      const { error } = await supabase
        .from('career_site_blocks')
        .update({ config: config as import('@/integrations/supabase/types').Json })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career-site-blocks', careerSite?.id] });
    },
  });

  const deleteBlock = useMutation({
    mutationFn: async (blockId: string) => {
      const { error } = await supabase
        .from('career_site_blocks')
        .delete()
        .eq('id', blockId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career-site-blocks', careerSite?.id] });
    },
  });

  const toggleBlock = useMutation({
    mutationFn: async ({ id, is_visible }: { id: string; is_visible: boolean }) => {
      const { error } = await supabase
        .from('career_site_blocks')
        .update({ is_visible })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career-site-blocks', careerSite?.id] });
    },
  });

  const addTeamStory = useMutation({
    mutationFn: async (story: Omit<TeamStory, 'id' | 'career_site_id' | 'sort_order'>) => {
      if (!careerSite?.id) throw new Error('No site');
      const { error } = await supabase
        .from('career_site_team_stories')
        .insert({ ...story, career_site_id: careerSite.id, sort_order: teamStories.length });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-stories', careerSite?.id] });
      toast.success('סיפור נוסף בהצלחה');
    },
  });

  const deleteTeamStory = useMutation({
    mutationFn: async (storyId: string) => {
      const { error } = await supabase.from('career_site_team_stories').delete().eq('id', storyId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-stories', careerSite?.id] }),
  });

  const trackAnalytics = async (eventType: string) => {
    if (!careerSite?.id) return;
    await supabase.from('career_site_analytics').insert({
      career_site_id: careerSite.id,
      event_type: eventType,
      session_id: sessionStorage.getItem('plug_session') || Math.random().toString(36),
      referrer: document.referrer,
    });
  };

  return {
    careerSite, isLoading, blocks, teamStories,
    createSite, updateSite, addBlock, updateBlock, deleteBlock, toggleBlock,
    addTeamStory, deleteTeamStory, trackAnalytics,
  };
}

function getDefaultBlockConfig(blockType: string): Record<string, unknown> {
  const defaults: Record<string, Record<string, unknown>> = {
    hero: { headline: 'בואו לעבוד איתנו', subheadline: 'אנחנו מחפשים אנשים מוכשרים', cta_text: 'צפה במשרות פתוחות', style: 'gradient' },
    about: { title: 'אודותינו', text: 'ספר על החברה...', style: 'text_image' },
    culture: { title: 'התרבות שלנו', values: ['חדשנות', 'שיתוף פעולה', 'אמינות'], style: 'cards' },
    benefits: { title: 'ההטבות שלנו', items: [{ icon: '🏖️', title: 'חופשה נדיבה', desc: '20 ימי חופשה בשנה' }] },
    team_stories: { title: 'מה אומר הצוות שלנו', style: 'carousel' },
    open_jobs: { title: 'משרות פתוחות', show_filters: true, style: 'cards' },
    video: { url: '', title: 'הכירו אותנו', style: 'full_width' },
    stats: { items: [{ value: '100+', label: 'עובדים' }, { value: '5', label: 'שנות ניסיון' }] },
    gallery: { images: [], style: 'grid' },
    cta: { headline: 'מוכנים להצטרף?', cta_text: 'שלח קורות חיים', style: 'centered' },
  };
  return defaults[blockType] || {};
}
