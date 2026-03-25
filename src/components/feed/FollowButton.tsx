import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { UserPlus, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FollowButtonProps {
  targetUserId?: string;
  targetCompanyId?: string;
  size?: 'sm' | 'default';
  className?: string;
}

export function FollowButton({ targetUserId, targetCompanyId, size = 'sm', className }: FollowButtonProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    checkFollowStatus();
  }, [user?.id, targetUserId, targetCompanyId]);

  const checkFollowStatus = async () => {
    if (!user?.id) return;
    let query = supabase.from('follows').select('id').eq('follower_id', user.id);
    if (targetUserId) query = query.eq('followed_user_id', targetUserId);
    if (targetCompanyId) query = query.eq('followed_company_id', targetCompanyId);
    const { data } = await query.maybeSingle();
    setIsFollowing(!!data);
  };

  const handleToggle = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      if (isFollowing) {
        let query = supabase.from('follows').delete().eq('follower_id', user.id);
        if (targetUserId) query = query.eq('followed_user_id', targetUserId);
        if (targetCompanyId) query = query.eq('followed_company_id', targetCompanyId);
        await query;
        setIsFollowing(false);
        toast.success(isRTL ? 'הפסקת לעקוב' : 'Unfollowed');
      } else {
        const row: any = { follower_id: user.id };
        if (targetUserId) row.followed_user_id = targetUserId;
        if (targetCompanyId) row.followed_company_id = targetCompanyId;
        await supabase.from('follows').insert(row);
        setIsFollowing(true);
        toast.success(isRTL ? 'עוקב/ת! 🔔' : 'Following! 🔔');
      }
    } catch {
      toast.error(isRTL ? 'שגיאה' : 'Error');
    } finally {
      setLoading(false);
    }
  };

  // Don't show follow button for own content
  if (user?.id === targetUserId) return null;

  return (
    <Button
      variant={isFollowing ? 'secondary' : 'outline'}
      size={size}
      onClick={(e) => { e.stopPropagation(); handleToggle(); }}
      disabled={loading}
      className={cn('gap-1.5', className)}
    >
      {isFollowing ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
      <span className="text-xs">{isFollowing ? (isRTL ? 'עוקב' : 'Following') : (isRTL ? 'עקוב' : 'Follow')}</span>
    </Button>
  );
}
