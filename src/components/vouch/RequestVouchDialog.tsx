import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import {
  HandHeart, Copy, Check, Send, Loader2, Share2,
  MessageCircle, Search, User, Users, Link2, CheckCircle2,
} from 'lucide-react';

interface RequestVouchDialogProps {
  trigger?: React.ReactNode;
}

export function RequestVouchDialog({ trigger }: RequestVouchDialogProps) {
  const { user, profile } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [open, setOpen] = useState(false);

  // --- External link state ---
  const [message, setMessage] = useState('');
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // --- Internal request state ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Array<{ id: string; name: string; avatar?: string }>>([]);
  const [internalMessage, setInternalMessage] = useState('');
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  // Search users for internal request
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['search-users-vouch', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) return [];

      const { data, error } = await supabase
        .from('profiles_secure')
        .select('user_id, full_name, avatar_url, email')
        .neq('user_id', user?.id || '')
        .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: searchQuery.length >= 2 && open,
  });

  // Create external link
  const createLinkMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      const code = Math.random().toString(36).substring(2, 10);
      const { error } = await (supabase.from('vouch_requests') as any).insert({
        from_user_id: user.id,
        link_code: code,
        message: message.trim() || null,
      });
      if (error) throw error;
      return code;
    },
    onSuccess: (code) => setLinkCode(code),
    onError: () => toast.error(isHebrew ? 'שגיאה ביצירת הלינק' : 'Failed to create link'),
  });

  // Send internal vouch request
  const sendInternalMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Check if we already sent a request to this user
      const { data: existing } = await (supabase.from('vouch_requests') as any)
        .select('id')
        .eq('from_user_id', user.id)
        .eq('to_user_id', targetUserId)
        .eq('status', 'pending')
        .maybeSingle();

      if (existing) throw new Error('already_sent');

      // Check if they already vouched for us
      const { data: existingVouch } = await supabase
        .from('vouches')
        .select('id')
        .eq('from_user_id', targetUserId)
        .eq('to_user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (existingVouch) throw new Error('already_vouched');

      const code = Math.random().toString(36).substring(2, 10);
      const { error } = await (supabase.from('vouch_requests') as any).insert({
        from_user_id: user.id,
        to_user_id: targetUserId,
        link_code: code,
        message: internalMessage.trim() || null,
        status: 'pending',
      });
      if (error) throw error;
      return targetUserId;
    },
    onSuccess: (targetUserId) => {
      setSentIds(prev => new Set(prev).add(targetUserId));
      toast.success(isHebrew ? 'בקשת ההמלצה נשלחה!' : 'Vouch request sent!');
    },
    onError: (error: Error) => {
      if (error.message === 'already_sent') {
        toast.info(isHebrew ? 'כבר שלחת בקשה למשתמש זה' : 'Already sent a request to this user');
      } else if (error.message === 'already_vouched') {
        toast.info(isHebrew ? 'המשתמש כבר נתן לך המלצה!' : 'This user already vouched for you!');
      } else {
        toast.error(isHebrew ? 'שגיאה בשליחת הבקשה' : 'Failed to send request');
      }
    },
  });

  const vouchUrl = linkCode ? `${window.location.origin}/vouch/${linkCode}` : '';

  const copyLink = () => {
    navigator.clipboard.writeText(vouchUrl);
    setCopied(true);
    toast.success(isHebrew ? 'הלינק הועתק!' : 'Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const text = isHebrew
      ? `היי, אשמח אם תוכל/י לכתוב עלי המלצה (Vouch) ב-PLUG:\n${vouchUrl}`
      : `Hey, I'd appreciate if you could write me a recommendation (Vouch) on PLUG:\n${vouchUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(vouchUrl)}`, '_blank');
  };

  const handleReset = () => {
    setLinkCode(null);
    setMessage('');
    setCopied(false);
    setSearchQuery('');
    setSelectedUsers([]);
    setInternalMessage('');
    setSentIds(new Set());
  };

  const toggleUser = (u: { id: string; name: string; avatar?: string }) => {
    setSelectedUsers(prev =>
      prev.some(s => s.id === u.id)
        ? prev.filter(s => s.id !== u.id)
        : [...prev, u]
    );
  };

  const sendToSelected = () => {
    selectedUsers.forEach(u => {
      if (!sentIds.has(u.id)) {
        sendInternalMutation.mutate(u.id);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) handleReset(); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <HandHeart className="h-4 w-4" />
            {isHebrew ? 'בקש המלצה' : 'Request Vouch'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" dir={isHebrew ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HandHeart className="w-5 h-5 text-primary" />
            {isHebrew ? 'בקש המלצה' : 'Request a Vouch'}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="internal" className="space-y-4">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="internal" className="gap-1.5 text-xs">
              <Users className="w-3.5 h-3.5" />
              {isHebrew ? 'משתמשי PLUG' : 'PLUG Users'}
            </TabsTrigger>
            <TabsTrigger value="external" className="gap-1.5 text-xs">
              <Link2 className="w-3.5 h-3.5" />
              {isHebrew ? 'לינק חיצוני' : 'External Link'}
            </TabsTrigger>
          </TabsList>

          {/* ===== Internal: Search & send to PLUG users ===== */}
          <TabsContent value="internal" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {isHebrew
                ? 'חפש אנשים ב-PLUG ושלח להם בקשת המלצה ישירות.'
                : 'Search PLUG users and send them a vouch request directly.'}
            </p>

            <div className="relative">
              <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={isHebrew ? 'חפש לפי שם או אימייל...' : 'Search by name or email...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rtl:pl-3 rtl:pr-10"
                autoFocus
              />
            </div>

            {/* Search results */}
            {isSearching && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isSearching && searchQuery.length >= 2 && searchResults && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4 text-sm">
                    {isHebrew ? 'לא נמצאו תוצאות' : 'No results found'}
                  </p>
                ) : (
                  searchResults.map((p) => {
                    const isSelected = selectedUsers.some(s => s.id === p.user_id);
                    const wasSent = sentIds.has(p.user_id);
                    return (
                      <button
                        key={p.user_id}
                        onClick={() => !wasSent && toggleUser({ id: p.user_id, name: p.full_name, avatar: p.avatar_url || undefined })}
                        disabled={wasSent}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors text-left rtl:text-right ${
                          wasSent
                            ? 'bg-green-500/10 cursor-default'
                            : isSelected
                            ? 'bg-primary/10 ring-1 ring-primary/30'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={p.avatar_url || ''} />
                          <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{p.full_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                        </div>
                        {wasSent ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        ) : isSelected ? (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {/* Selected users chips */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedUsers.map(u => (
                  <span
                    key={u.id}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs"
                  >
                    {u.name}
                    {!sentIds.has(u.id) && (
                      <button
                        onClick={() => toggleUser(u)}
                        className="hover:text-destructive"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}

            {/* Optional message */}
            <div className="space-y-2">
              <Label className="text-xs">{isHebrew ? 'הודעה אישית (אופציונלי)' : 'Personal message (optional)'}</Label>
              <Textarea
                value={internalMessage}
                onChange={(e) => setInternalMessage(e.target.value)}
                placeholder={isHebrew
                  ? 'היי, אשמח אם תוכל/י לכתוב עלי המלצה קצרה...'
                  : "Hey, I'd appreciate a short recommendation..."}
                className="min-h-[60px] resize-none text-sm"
              />
            </div>

            <Button
              onClick={sendToSelected}
              disabled={selectedUsers.length === 0 || selectedUsers.every(u => sentIds.has(u.id)) || sendInternalMutation.isPending}
              className="w-full gap-2"
            >
              {sendInternalMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {isHebrew
                ? `שלח בקשה (${selectedUsers.filter(u => !sentIds.has(u.id)).length})`
                : `Send Request (${selectedUsers.filter(u => !sentIds.has(u.id)).length})`}
            </Button>
          </TabsContent>

          {/* ===== External: Generate shareable link ===== */}
          <TabsContent value="external" className="space-y-4">
            {!linkCode ? (
              <>
                <p className="text-sm text-muted-foreground">
                  {isHebrew
                    ? 'צור לינק אישי ושלח לאנשים שעבדו איתך. הם יוכלו לכתוב עליך המלצה גם אם הם לא רשומים ל-PLUG (ויוזמנו להירשם!).'
                    : "Create a personal link and send it to people who worked with you. They can vouch for you even if they're not on PLUG (they'll be invited to join!)."}
                </p>

                <div className="space-y-2">
                  <Label>{isHebrew ? 'הודעה אישית (אופציונלי)' : 'Personal message (optional)'}</Label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={isHebrew
                      ? 'היי, אשמח אם תוכל/י לכתוב עלי המלצה קצרה...'
                      : "Hey, I'd appreciate a short recommendation about our work together..."}
                    className="min-h-[80px] resize-none"
                  />
                </div>

                <Button
                  onClick={() => createLinkMutation.mutate()}
                  disabled={createLinkMutation.isPending}
                  className="w-full gap-2"
                >
                  {createLinkMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {isHebrew ? 'צור לינק המלצה' : 'Create Vouch Link'}
                </Button>
              </>
            ) : (
              <>
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    {isHebrew ? 'הלינק שלך מוכן!' : 'Your link is ready!'}
                  </p>
                  <code className="text-xs bg-muted px-2 py-1 rounded break-all">{vouchUrl}</code>
                </div>

                <div className="flex gap-2">
                  <Button onClick={copyLink} variant="outline" className="flex-1 gap-2">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {isHebrew ? 'העתק' : 'Copy'}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={shareWhatsApp} variant="outline" className="gap-2 text-green-600 hover:text-green-700">
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </Button>
                  <Button onClick={shareLinkedIn} variant="outline" className="gap-2 text-blue-600 hover:text-blue-700">
                    <Share2 className="w-4 h-4" />
                    LinkedIn
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  {isHebrew
                    ? 'אנשים שלא רשומים ל-PLUG יוזמנו להירשם → vouch = referral!'
                    : 'Non-PLUG users will be invited to sign up → vouch = referral!'}
                </p>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
