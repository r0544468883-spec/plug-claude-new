import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Eye, TrendingUp, Users } from 'lucide-react';

export function FeedProfileSidebar() {
  const { user, profile } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isRTL = language === 'he';

  const fullName = (profile as any)?.full_name || '';
  const title = (profile as any)?.title || (isRTL ? 'מחפש/ת עבודה' : 'Job Seeker');
  const city = (profile as any)?.city || '';
  const avatarUrl = (profile as any)?.avatar_url || '';
  const initials = fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['feed-profile-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return { followers: 0, following: 0, applications: 0 };

      const [{ count: followers }, { count: following }, { count: applications }] = await Promise.all([
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('followed_user_id', user.id),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', user.id),
        supabase.from('applications').select('id', { count: 'exact', head: true }).eq('candidate_id', user.id),
      ]);

      return {
        followers: followers || 0,
        following: following || 0,
        applications: applications || 0,
      };
    },
    enabled: !!user?.id,
  });

  return (
    <div className="space-y-3">
      {/* Profile Card */}
      <Card
        className="bg-white shadow-sm border border-gray-200 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => navigate('/profile')}
      >
        {/* Cover gradient */}
        <div className="h-16 bg-gradient-to-r from-primary/80 to-primary/40" />

        <CardContent className="px-4 pb-4 -mt-8">
          <Avatar className="h-16 w-16 border-3 border-white shadow-md">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
            <AvatarFallback className="bg-primary text-white text-lg font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>

          <h3 className="font-semibold text-gray-900 mt-2 text-base leading-tight hover:underline">{fullName}</h3>
          <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{title}</p>
          {city && <p className="text-xs text-gray-400 mt-1">{city}</p>}
        </CardContent>
      </Card>

      {/* Stats Card */}
      <Card className="bg-white shadow-sm border border-gray-200">
        <CardContent className="p-0">
          <StatRow
            icon={<Eye className="w-4 h-4 text-gray-400" />}
            label={isRTL ? 'צפיות בפרופיל' : 'Profile viewers'}
            value={stats?.followers || 0}
          />
          <StatRow
            icon={<TrendingUp className="w-4 h-4 text-gray-400" />}
            label={isRTL ? 'מעקבים' : 'Following'}
            value={stats?.following || 0}
            border
          />
          <StatRow
            icon={<Users className="w-4 h-4 text-gray-400" />}
            label={isRTL ? 'מועמדויות' : 'Applications'}
            value={stats?.applications || 0}
            border
          />
        </CardContent>
      </Card>
    </div>
  );
}

function StatRow({ icon, label, value, border }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  border?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors ${border ? 'border-t border-gray-100' : ''}`}>
      <div className="flex items-center gap-2.5">
        {icon}
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <span className="text-sm font-semibold text-primary">{value}</span>
    </div>
  );
}
