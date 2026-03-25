import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Hash, ArrowLeft, ArrowRight, Users, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HubSettingsDialog } from './HubSettingsDialog';

interface Channel {
  id: string;
  name_en: string;
  name_he: string;
  access_mode: string;
}

interface HubSettings {
  allow_posts: boolean;
  allow_comments: boolean;
  allow_polls: boolean;
  allow_video: boolean;
  allow_images: boolean;
  allow_member_invite: boolean;
}

interface ChannelSidebarProps {
  hubName: string;
  channels: Channel[];
  activeChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  onBack: () => void;
  memberCount: number;
  isAdmin?: boolean;
  hubId?: string;
  hubSettings?: HubSettings;
  unreadCounts?: Record<string, number>;
}

export function ChannelSidebar({ hubName, channels, activeChannelId, onSelectChannel, onBack, memberCount, isAdmin, hubId, hubSettings, unreadCounts }: ChannelSidebarProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const BackIcon = isHebrew ? ArrowRight : ArrowLeft;
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <div className="w-60 bg-card border-e border-border flex flex-col h-full">
        {/* Hub Header */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="shrink-0 w-8 h-8" onClick={onBack}>
              <BackIcon className="w-4 h-4" />
            </Button>
            <h3 className="font-semibold truncate text-sm flex-1">{hubName}</h3>
            {isAdmin && hubId && (
              <Button variant="ghost" size="icon" className="shrink-0 w-8 h-8" onClick={() => setShowSettings(true)}>
                <Settings className="w-4 h-4 text-muted-foreground" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 ps-10">
            <Users className="w-3 h-3" />
            <span>{memberCount} {isHebrew ? 'חברים' : 'members'}</span>
          </div>
        </div>

        {/* Channels List */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            <p className="text-xs font-medium text-muted-foreground px-2 py-1 uppercase tracking-wider">
              {isHebrew ? 'ערוצים' : 'Channels'}
            </p>
            {channels.map((channel) => {
              const unread = unreadCounts?.[channel.id] || 0;
              return (
                <button
                  key={channel.id}
                  onClick={() => onSelectChannel(channel.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors text-start',
                    activeChannelId === channel.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : unread > 0
                      ? 'text-foreground font-medium hover:bg-muted/50'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <Hash className="w-4 h-4 shrink-0" />
                  <span className="truncate flex-1">{isHebrew ? channel.name_he : channel.name_en}</span>
                  {unread > 0 && activeChannelId !== channel.id && (
                    <span className="shrink-0 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Settings Dialog */}
      {isAdmin && hubId && hubSettings && (
        <HubSettingsDialog
          open={showSettings}
          onOpenChange={setShowSettings}
          hubId={hubId}
          settings={hubSettings}
          channels={channels}
        />
      )}
    </>
  );
}
