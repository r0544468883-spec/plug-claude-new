import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VideoPlayer } from './VideoPlayer';
import { Calendar, ExternalLink, Radio, Users } from 'lucide-react';
import { format } from 'date-fns';
import { he, enUS } from 'date-fns/locale';

export interface WebinarData {
  id: string;
  title_en: string;
  title_he: string;
  description_en: string;
  description_he: string;
  scheduled_at: string;
  link_url: string | null;
  is_internal: boolean;
  internal_stream_url: string | null;
  creator_name?: string;
  company_name?: string;
  registration_count?: number;
  is_registered?: boolean;
}

interface WebinarFeedCardProps {
  webinar: WebinarData;
}

export function WebinarFeedCard({ webinar }: WebinarFeedCardProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'he';
  const [registered, setRegistered] = useState(webinar.is_registered || false);
  const [loading, setLoading] = useState(false);
  const [regCount, setRegCount] = useState(webinar.registration_count || 0);

  const isUpcoming = new Date(webinar.scheduled_at) > new Date();
  const isLive = !isUpcoming && new Date(webinar.scheduled_at).getTime() > Date.now() - 2 * 60 * 60 * 1000;

  const handleRegister = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      if (registered) {
        await supabase.from('webinar_registrations').delete()
          .eq('webinar_id', webinar.id).eq('user_id', user.id);
        setRegistered(false);
        setRegCount(c => Math.max(0, c - 1));
        toast.success(isRTL ? 'ההרשמה בוטלה' : 'Registration cancelled');
      } else {
        await supabase.from('webinar_registrations').insert({
          webinar_id: webinar.id,
          user_id: user.id,
        } as any);
        setRegistered(true);
        setRegCount(c => c + 1);
        toast.success(isRTL ? 'נרשמת בהצלחה! 🎉 תקבל/י תזכורת' : 'Registered! 🎉 You\'ll get a reminder');
      }
    } catch {
      toast.error(isRTL ? 'שגיאה' : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = () => {
    if (webinar.link_url) {
      window.open(webinar.link_url, '_blank');
    }
  };

  const formattedDate = format(
    new Date(webinar.scheduled_at),
    'EEEE, dd MMM yyyy · HH:mm',
    { locale: isRTL ? he : enUS }
  );

  const title = isRTL ? webinar.title_he : webinar.title_en;
  const description = isRTL ? webinar.description_he : webinar.description_en;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="bg-card border-border overflow-hidden">
        {/* Mint green top accent */}
        <div className="h-1 bg-[#00FF9D]" />
        <CardContent className="p-4">
          {/* Header badges */}
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="secondary" className="bg-[#00FF9D]/10 text-[#00FF9D] border-[#00FF9D]/30">
              <Radio className="w-3 h-3 mr-1" />
              {isLive ? (isRTL ? 'שידור חי' : 'LIVE') : (isRTL ? 'וובינר' : 'Webinar')}
            </Badge>
            {webinar.company_name && (
              <span className="text-xs text-muted-foreground">{webinar.company_name}</span>
            )}
          </div>

          {/* Title & description */}
          <h3 className="font-semibold text-base mb-1">{title}</h3>
          {description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{description}</p>}

          {/* Date */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Calendar className="w-4 h-4" />
            <span>{formattedDate}</span>
          </div>

          {/* Internal video player */}
          {webinar.is_internal && webinar.internal_stream_url && isLive && (
            <div className="mb-3 relative">
              <VideoPlayer src={webinar.internal_stream_url} />
              <Badge className="absolute top-2 left-2 bg-red-500 text-white animate-pulse">LIVE</Badge>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            {isUpcoming ? (
              <Button
                onClick={handleRegister}
                disabled={loading}
                variant={registered ? 'secondary' : 'default'}
                className="gap-2 flex-1"
              >
                <Users className="w-4 h-4" />
                {registered
                  ? (isRTL ? `נרשמת (${regCount})` : `Registered (${regCount})`)
                  : (isRTL ? 'הרשמה' : 'Register')}
              </Button>
            ) : (
              <>
                {!webinar.is_internal && webinar.link_url && (
                  <Button onClick={handleJoin} className="gap-2 flex-1">
                    <ExternalLink className="w-4 h-4" />
                    {isRTL ? 'הצטרף/י' : 'Join'}
                  </Button>
                )}
              </>
            )}
            {regCount > 0 && isUpcoming && (
              <span className="text-xs text-muted-foreground">
                {isRTL ? `${regCount} נרשמו` : `${regCount} registered`}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
