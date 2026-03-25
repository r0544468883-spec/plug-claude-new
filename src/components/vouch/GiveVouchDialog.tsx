import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { VouchFormContent } from './VouchFormContent';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, Search, User, Loader2, ArrowLeft, ArrowRight } from 'lucide-react';

interface GiveVouchDialogProps {
  trigger?: React.ReactNode;
}

export function GiveVouchDialog({ trigger }: GiveVouchDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    name: string;
    avatar?: string;
  } | null>(null);
  const { language, direction } = useLanguage();
  const { user } = useAuth();
  const isHebrew = language === 'he';

  // Search users
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['search-users', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) return [];
      
      // Use profiles_secure view to protect contact details
      const { data, error } = await supabase
        .from('profiles_secure')
        .select('user_id, full_name, avatar_url, email')
        .neq('user_id', user?.id || '')
        .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: searchQuery.length >= 2,
  });

  const handleSelectUser = (profile: any) => {
    setSelectedUser({
      id: profile.user_id,
      name: profile.full_name,
      avatar: profile.avatar_url,
    });
  };

  const handleBack = () => {
    setSelectedUser(null);
    setSearchQuery('');
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedUser(null);
    setSearchQuery('');
  };

  const BackIcon = direction === 'rtl' ? ArrowRight : ArrowLeft;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) handleClose(); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Heart className="h-4 w-4" />
            {isHebrew ? 'תן Vouch' : 'Give Vouch'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {selectedUser ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleBack} className="h-8 px-2">
                  <BackIcon className="h-4 w-4" />
                </Button>
                {isHebrew ? `Vouch עבור ${selectedUser.name}` : `Vouch for ${selectedUser.name}`}
              </DialogTitle>
            </DialogHeader>
            <VouchFormContent 
              toUserId={selectedUser.id} 
              toUserName={selectedUser.name}
              onSuccess={handleClose}
            />
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                {isHebrew ? 'חפש משתמש לתת Vouch' : 'Find someone to vouch for'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={isHebrew ? 'חפש לפי שם או אימייל...' : 'Search by name or email...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
              </div>

              {isSearching && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}

              {!isSearching && searchQuery.length >= 2 && searchResults && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {searchResults.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      {isHebrew ? 'לא נמצאו תוצאות' : 'No results found'}
                    </p>
                  ) : (
                    searchResults.map((profile) => (
                      <button
                        key={profile.user_id}
                        onClick={() => handleSelectUser(profile)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={profile.avatar_url || ''} />
                          <AvatarFallback>
                            <User className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{profile.full_name}</p>
                          <p className="text-sm text-muted-foreground truncate">{profile.email}</p>
                        </div>
                        <Heart className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))
                  )}
                </div>
              )}

              {!isSearching && searchQuery.length < 2 && (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  {isHebrew 
                    ? 'הקלד לפחות 2 תווים לחיפוש' 
                    : 'Type at least 2 characters to search'}
                </p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
