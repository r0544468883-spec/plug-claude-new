import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { OnlineIndicator, getTimeSinceActive } from './OnlineIndicator';
import { QuickPingButton } from './QuickPingButton';
import { ScheduleMeetingButton } from './ScheduleMeetingButton';
import { User, ChevronDown, FileText, Download, Calendar, X, Image } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ChatInfoSidebarProps {
  conversation: {
    id: string;
    participant_1: string;
    participant_2: string;
    other_user: {
      user_id: string;
      full_name: string;
      avatar_url: string | null;
      personal_tagline?: string | null;
      last_seen_at?: string | null;
    } | null;
  };
  onClose: () => void;
}

export function ChatInfoSidebar({ conversation, onClose }: ChatInfoSidebarProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const navigate = useNavigate();
  const [mediaOpen, setMediaOpen] = useState(true);
  const [meetingsOpen, setMeetingsOpen] = useState(true);

  const otherUser = conversation.other_user;
  const initials = otherUser?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  // Fetch full profile for tagline
  const { data: fullProfile } = useQuery({
    queryKey: ['chat-info-profile', otherUser?.user_id],
    queryFn: async () => {
      if (!otherUser?.user_id) return null;
      const { data } = await supabase
        .from('profiles_secure')
        .select('*')
        .eq('user_id', otherUser.user_id)
        .single();
      return data as any;
    },
    enabled: !!otherUser?.user_id,
  });

  // Fetch shared attachments
  const { data: attachments = [] } = useQuery({
    queryKey: ['chat-attachments', conversation.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('messages')
        .select('id, attachment_url, attachment_name, attachment_type, attachment_size, created_at')
        .eq('conversation_id', conversation.id)
        .not('attachment_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  // Fetch scheduled meetings with this person
  const { data: meetings = [] } = useQuery({
    queryKey: ['chat-meetings', otherUser?.full_name],
    queryFn: async () => {
      if (!user?.id || !otherUser?.full_name) return [];
      const { data } = await supabase
        .from('schedule_tasks' as any)
        .select('id, title, due_date, due_time, location, meeting_link, task_type')
        .eq('user_id', user.id)
        .eq('task_type', 'meeting')
        .ilike('related_candidate', `%${otherUser.full_name}%`)
        .gte('due_date', new Date().toISOString().split('T')[0])
        .order('due_date', { ascending: true })
        .limit(5);
      return (data || []) as any[];
    },
    enabled: !!user?.id && !!otherUser?.full_name,
  });

  const tagline = fullProfile?.personal_tagline || otherUser?.personal_tagline;
  const lastSeenAt = fullProfile?.last_seen_at || otherUser?.last_seen_at;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = (type: string | null) => type?.startsWith('image/');

  return (
    <div className="flex flex-col h-full bg-card border-s border-border overflow-y-auto">
      {/* Close button (mobile) */}
      <div className="flex justify-end p-2 md:hidden">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Profile section */}
      <div className="flex flex-col items-center px-4 pt-4 pb-5">
        <div className="relative mb-3">
          <Avatar className="w-20 h-20">
            <AvatarImage src={otherUser?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-0.5 -end-0.5">
            <OnlineIndicator lastSeenAt={lastSeenAt} size="md" />
          </div>
        </div>
        <h3 className="text-base font-semibold text-foreground text-center">
          {otherUser?.full_name || (isHebrew ? 'לא ידוע' : 'Unknown')}
        </h3>
        {tagline && (
          <p className="text-xs text-muted-foreground text-center mt-0.5 line-clamp-2">{tagline}</p>
        )}
        <p className="text-[11px] text-muted-foreground mt-1">
          {getTimeSinceActive(lastSeenAt, isHebrew)}
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex items-center justify-center gap-2 px-4 pb-4 border-b border-border">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => otherUser?.user_id && navigate(`/p/${otherUser.user_id}`)}
        >
          <User className="w-3.5 h-3.5" />
          {isHebrew ? 'פרופיל' : 'Profile'}
        </Button>
        {otherUser?.user_id && (
          <QuickPingButton
            toUserId={otherUser.user_id}
            toUserName={otherUser.full_name}
            context="suggested"
            size="sm"
            className="text-xs"
          />
        )}
        {otherUser && (
          <ScheduleMeetingButton
            otherUser={{ user_id: otherUser.user_id, full_name: otherUser.full_name }}
            conversationId={conversation.id}
            size="sm"
          />
        )}
      </div>

      {/* Scheduled meetings */}
      {meetings.length > 0 && (
        <Collapsible open={meetingsOpen} onOpenChange={setMeetingsOpen} className="border-b border-border">
          <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/30">
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              {isHebrew ? 'פגישות מתוזמנות' : 'Scheduled meetings'}
            </span>
            <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', meetingsOpen && 'rotate-180')} />
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-3 space-y-2">
            {meetings.map((m: any) => (
              <div key={m.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 text-xs">
                <Calendar className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{m.title}</p>
                  <p className="text-muted-foreground">
                    {m.due_date && format(new Date(m.due_date), 'dd/MM')}
                    {m.due_time && ` · ${m.due_time.slice(0, 5)}`}
                  </p>
                  {m.location && <p className="text-muted-foreground truncate">{m.location}</p>}
                </div>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Media & Files */}
      <Collapsible open={mediaOpen} onOpenChange={setMediaOpen} className="border-b border-border">
        <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/30">
          <span className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            {isHebrew ? 'מדיה וקבצים' : 'Media & files'}
          </span>
          <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', mediaOpen && 'rotate-180')} />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-3">
          {attachments.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              {isHebrew ? 'אין קבצים משותפים' : 'No shared files'}
            </p>
          ) : (
            <div className="space-y-1.5">
              {attachments.map((att: any) => (
                <a
                  key={att.id}
                  href={att.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  {isImage(att.attachment_type) ? (
                    <Image className="w-4 h-4 text-blue-500 shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground truncate">{att.attachment_name || 'File'}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {att.attachment_size && formatFileSize(att.attachment_size)}
                    </p>
                  </div>
                  <Download className="w-3 h-3 text-muted-foreground shrink-0" />
                </a>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
