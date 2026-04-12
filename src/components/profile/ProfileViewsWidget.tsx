import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, TrendingUp, Download, ExternalLink, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export function ProfileViewsWidget() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isRTL = language === 'he';
  const [copied, setCopied] = useState(false);

  const { data: analytics } = useQuery({
    queryKey: ['profile-analytics', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get all views
      const { data: views, error } = await (supabase as any)
        .from('profile_views')
        .select('action, created_at')
        .eq('profile_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) return null;

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const totalViews = views?.filter((v: any) => v.action === 'view').length || 0;
      const weekViews = views?.filter((v: any) => v.action === 'view' && new Date(v.created_at) >= weekAgo).length || 0;
      const totalDownloads = views?.filter((v: any) => v.action === 'resume_download').length || 0;
      const weekDownloads = views?.filter((v: any) => v.action === 'resume_download' && new Date(v.created_at) >= weekAgo).length || 0;

      return { totalViews, weekViews, totalDownloads, weekDownloads };
    },
    enabled: !!user?.id,
  });

  const profileUrl = `${window.location.origin}/profile/${user?.id}`;

  const copyLink = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    toast.success(isRTL ? 'הלינק הועתק!' : 'Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="bg-card border-border plug-card-hover">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Eye className="w-4 h-4 text-blue-500" />
            </div>
            <span className="font-medium text-sm">
              {isRTL ? 'צפיות בפרופיל' : 'Profile Views'}
            </span>
          </div>
          <span className="text-2xl font-bold text-foreground">
            {analytics?.totalViews || 0}
          </span>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="p-2 rounded-lg bg-muted/50 text-center">
            <div className="flex items-center justify-center gap-1">
              <Eye className="w-3 h-3 text-blue-400" />
              <span className="text-sm font-bold">{analytics?.weekViews || 0}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {isRTL ? 'צפיות השבוע' : 'This week'}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50 text-center">
            <div className="flex items-center justify-center gap-1">
              <Download className="w-3 h-3 text-emerald-400" />
              <span className="text-sm font-bold">{analytics?.totalDownloads || 0}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {isRTL ? 'הורדות קו"ח' : 'CV downloads'}
            </p>
          </div>
        </div>

        {/* Copy profile link */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 text-xs"
            onClick={copyLink}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {isRTL ? 'העתק לינק' : 'Copy Link'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 text-xs"
            onClick={() => navigate(`/profile/${user?.id}`)}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {isRTL ? 'צפה בפרופיל' : 'View Profile'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
