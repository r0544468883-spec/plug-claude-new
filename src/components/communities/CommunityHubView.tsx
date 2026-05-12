import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ChannelSidebar } from './ChannelSidebar';
import { CommunityChannel } from './CommunityChannel';
import { CoursesTab } from './CoursesTab';
import { EventsTab } from './EventsTab';
import { QATab } from './QATab';
import { BadgesSection } from './BadgesSection';
import { GamificationPanel } from './GamificationPanel';
import { NotificationsPanel } from './NotificationsPanel';
import { LiveRoomButton } from './LiveRoomButton';
import { LurkerWidget } from './LurkerWidget';
import { EngagementHeatmap } from './EngagementHeatmap';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Hash, MessageSquare, GraduationCap, Calendar, HelpCircle, Award, Video, Trophy } from 'lucide-react';

interface CommunityHubViewProps {
  hubId: string;
  onBack: () => void;
}

export function CommunityHubView({ hubId, onBack }: CommunityHubViewProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);

  const { data: hub, isLoading: hubLoading } = useQuery({
    queryKey: ['community-hub', hubId],
    queryFn: async () => {
      const { data, error } = await supabase.from('community_hubs').select('*').eq('id', hubId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: channels = [], isLoading: channelsLoading } = useQuery({
    queryKey: ['community-channels', hubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_channels')
        .select('*')
        .eq('hub_id', hubId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      if (data && data.length > 0 && !activeChannelId) {
        setActiveChannelId(data[0].id);
      }
      return data;
    },
  });

  // Check if current user is admin
  const { data: membership } = useQuery({
    queryKey: ['community-membership', hubId, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('community_members')
        .select('role')
        .eq('hub_id', hubId)
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const isAdmin = membership?.role === 'admin';

  if (hubLoading || channelsLoading) {
    return <div className="flex gap-4 h-[600px]"><Skeleton className="w-60 h-full" /><Skeleton className="flex-1 h-full" /></div>;
  }

  const activeChannel = channels.find(c => c.id === activeChannelId);

  // Compute unread counts from localStorage timestamps
  const { data: unreadCounts } = useQuery({
    queryKey: ['unread-counts', hubId, channels.map(c => c.id).join(',')],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      for (const ch of channels) {
        const lastRead = localStorage.getItem(`channel-${ch.id}-lastRead`);
        if (!lastRead) {
          // Never visited — count all messages
          const { count } = await supabase
            .from('community_messages')
            .select('id', { count: 'exact', head: true })
            .eq('channel_id', ch.id);
          counts[ch.id] = count || 0;
        } else {
          const { count } = await supabase
            .from('community_messages')
            .select('id', { count: 'exact', head: true })
            .eq('channel_id', ch.id)
            .gt('created_at', lastRead);
          counts[ch.id] = count || 0;
        }
      }
      return counts;
    },
    enabled: channels.length > 0,
    refetchInterval: 30_000, // refresh every 30s
  });

  const [activeTab, setActiveTab] = useState('chat');

  const hubSettings = hub ? {
    allow_posts: (hub as any).allow_posts ?? true,
    allow_comments: (hub as any).allow_comments ?? true,
    allow_polls: (hub as any).allow_polls ?? true,
    allow_video: (hub as any).allow_video ?? true,
    allow_images: (hub as any).allow_images ?? true,
    allow_member_invite: (hub as any).allow_member_invite ?? true,
    allow_courses: (hub as any).allow_courses ?? true,
    allow_events: (hub as any).allow_events ?? true,
    allow_qa: (hub as any).allow_qa ?? true,
    allow_badges: (hub as any).allow_badges ?? true,
  } : undefined;

  const showCourses = hubSettings?.allow_courses !== false;
  const showEvents = hubSettings?.allow_events !== false;
  const showQA = hubSettings?.allow_qa !== false;
  const showBadges = hubSettings?.allow_badges !== false;

  return (
    <div dir={isHebrew ? 'rtl' : 'ltr'}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4 bg-muted/50">
          <TabsTrigger value="chat" className="gap-1.5">
            <MessageSquare className="w-4 h-4" />
            {isHebrew ? 'צ\'אט' : 'Chat'}
          </TabsTrigger>
          {showCourses && (
            <TabsTrigger value="courses" className="gap-1.5">
              <GraduationCap className="w-4 h-4" />
              {isHebrew ? 'קורסים' : 'Courses'}
            </TabsTrigger>
          )}
          {showEvents && (
            <TabsTrigger value="events" className="gap-1.5">
              <Calendar className="w-4 h-4" />
              {isHebrew ? 'אירועים' : 'Events'}
            </TabsTrigger>
          )}
          {showQA && (
            <TabsTrigger value="qa" className="gap-1.5">
              <HelpCircle className="w-4 h-4" />
              {isHebrew ? 'שאלות ותשובות' : 'Q&A'}
            </TabsTrigger>
          )}
          {showBadges && (
            <TabsTrigger value="badges" className="gap-1.5">
              <Award className="w-4 h-4" />
              {isHebrew ? 'תגים' : 'Badges'}
            </TabsTrigger>
          )}
          <TabsTrigger value="live" className="gap-1.5">
            <Video className="w-4 h-4" />
            {isHebrew ? 'שידור חי' : 'Live'}
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="gap-1.5">
            <Trophy className="w-4 h-4" />
            {isHebrew ? 'דירוג' : 'Leaderboard'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat">
          <div className="flex gap-4">
            <div className="flex h-[600px] rounded-xl overflow-hidden border border-border bg-card flex-1">
              <ChannelSidebar
                hubName={isHebrew ? (hub?.name_he || hub?.name_en || '') : (hub?.name_en || '')}
                channels={channels}
                activeChannelId={activeChannelId}
                onSelectChannel={(id) => { setActiveChannelId(id); }}
                onBack={onBack}
                memberCount={hub?.member_count || 0}
                isAdmin={isAdmin}
                hubId={hubId}
                hubSettings={hubSettings}
                unreadCounts={unreadCounts}
              />

              <div className="flex-1 flex flex-col">
                {activeChannel ? (
                  <CommunityChannel
                    channelId={activeChannel.id}
                    channelName={isHebrew ? activeChannel.name_he : activeChannel.name_en}
                    hubSettings={hubSettings ? { allow_posts: hubSettings.allow_posts, allow_comments: hubSettings.allow_comments } : undefined}
                    isAdmin={isAdmin}
                  />
                ) : (
                  <Card className="m-auto border-none shadow-none bg-transparent">
                    <CardContent className="text-center p-12">
                      <Hash className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-30" />
                      <p className="text-muted-foreground">{isHebrew ? 'בחר ערוץ להתחיל' : 'Select a channel to start'}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Admin Widgets */}
            {isAdmin && (
              <div className="w-64 space-y-4 hidden lg:block">
                <LurkerWidget hubId={hubId} />
                <EngagementHeatmap hubId={hubId} />
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="courses">
          <CoursesTab hubId={hubId} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="events">
          <EventsTab hubId={hubId} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="qa">
          <QATab hubId={hubId} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="badges">
          <BadgesSection hubId={hubId} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="live">
          <LiveRoomButton hubId={hubId} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="leaderboard">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <GamificationPanel hubId={hubId} />
            </div>
            <div>
              <NotificationsPanel hubId={hubId} />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
