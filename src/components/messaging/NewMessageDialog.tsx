import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Plus, Loader2, Send, Search, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Profile {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  email?: string | null;
  personal_tagline?: string | null;
}

interface NewMessageDialogProps {
  trigger?: React.ReactNode;
}

export function NewMessageDialog({ trigger }: NewMessageDialogProps = {}) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [message, setMessage] = useState('');

  // Search for users
  const { data: users = [], isLoading: searchLoading } = useQuery({
    queryKey: ['user-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) return [];

      // Use profiles_secure view for user search
      const { data, error } = await supabase
        .from('profiles_secure')
        .select('*')
        .neq('user_id', user?.id || '')
        .ilike('full_name', `%${searchQuery}%`)
        .limit(10);

      if (error) {
        console.error('User search error:', error);
        throw error;
      }
      return (data || []) as Profile[];
    },
    enabled: searchQuery.length >= 2,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !selectedUser || !message.trim()) {
        throw new Error('Missing required fields');
      }

      const participant1 = user.id < selectedUser.user_id ? user.id : selectedUser.user_id;
      const participant2 = user.id < selectedUser.user_id ? selectedUser.user_id : user.id;

      // Find or create conversation
      let { data: existingConvo } = await supabase
        .from('conversations')
        .select('id')
        .eq('participant_1', participant1)
        .eq('participant_2', participant2)
        .single();

      let conversationId: string;

      if (existingConvo) {
        conversationId = existingConvo.id;
      } else {
        const { data: newConvo, error: convoError } = await supabase
          .from('conversations')
          .insert({
            participant_1: participant1,
            participant_2: participant2,
          })
          .select('id')
          .single();

        if (convoError) throw convoError;
        conversationId = newConvo.id;
      }

      // Send message
      const { error: msgError } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        from_user_id: user.id,
        to_user_id: selectedUser.user_id,
        content: message.trim(),
      });

      if (msgError) throw msgError;

      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);
    },
    onSuccess: () => {
      toast.success(isHebrew ? 'ההודעה נשלחה!' : 'Message sent!');
      setMessage('');
      setSelectedUser(null);
      setSearchQuery('');
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: () => {
      toast.error(isHebrew ? 'שגיאה בשליחת ההודעה' : 'Failed to send message');
    },
  });

  const handleReset = () => {
    setSelectedUser(null);
    setSearchQuery('');
    setMessage('');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) handleReset();
    }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            {isHebrew ? 'הודעה חדשה' : 'New Message'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" dir={isHebrew ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            {isHebrew ? 'שלח הודעה חדשה' : 'Send New Message'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!selectedUser ? (
            <>
              <div className="space-y-2">
                <Label>{isHebrew ? 'חפש משתמש' : 'Search User'}</Label>
                <div className="relative">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isHebrew ? 'הקלד שם או אימייל...' : 'Type name or email...'}
                    className="ps-9"
                    dir={isHebrew ? 'rtl' : 'ltr'}
                  />
                </div>
              </div>

              {searchQuery.length >= 2 && (
                <ScrollArea className="h-[200px] border rounded-lg">
                  {searchLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : users.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      {isHebrew ? 'לא נמצאו משתמשים' : 'No users found'}
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {users.map((u) => (
                        <button
                          key={u.user_id}
                          onClick={() => setSelectedUser(u)}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-start"
                        >
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={u.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {u.full_name?.charAt(0)?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{u.full_name}</p>
                            {(u.personal_tagline || u.email) && (
                              <p className="text-sm text-muted-foreground truncate">{u.personal_tagline || u.email}</p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={selectedUser.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {selectedUser.full_name?.charAt(0)?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{selectedUser.full_name}</p>
                  {(selectedUser.personal_tagline || selectedUser.email) && (
                    <p className="text-sm text-muted-foreground truncate">{selectedUser.personal_tagline || selectedUser.email}</p>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  {isHebrew ? 'שנה' : 'Change'}
                </Button>
              </div>

              <div className="space-y-2">
                <Label>{isHebrew ? 'הודעה' : 'Message'}</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={isHebrew ? 'הקלד את ההודעה שלך...' : 'Type your message...'}
                  className="min-h-[120px] resize-none"
                  dir={isHebrew ? 'rtl' : 'ltr'}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  {isHebrew ? 'ביטול' : 'Cancel'}
                </Button>
                <Button
                  onClick={() => sendMutation.mutate()}
                  disabled={!message.trim() || sendMutation.isPending}
                  className="gap-2"
                >
                  {sendMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {isHebrew ? 'שלח' : 'Send'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}