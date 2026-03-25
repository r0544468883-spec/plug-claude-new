import { useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AddContactPromptProps {
  companyId: string;
  companyName: string;
  onDismiss: () => void;
}

export function AddContactPrompt({ companyId, companyName, onDismiss }: AddContactPromptProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'he';
  const queryClient = useQueryClient();

  const [contact, setContact] = useState({ full_name: '', role_title: '', email: '', phone: '' });

  const addContactMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase.from('client_contacts').insert({
        full_name: contact.full_name,
        role_title: contact.role_title || null,
        email: contact.email || null,
        phone: contact.phone || null,
        company_id: companyId,
        recruiter_id: user.id,
        is_primary: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-contacts', companyId] });
      toast.success(isRTL ? 'איש קשר נוסף בהצלחה!' : 'Contact added successfully!');
      onDismiss();
    },
    onError: () => toast.error(isRTL ? 'שגיאה בהוספת איש קשר' : 'Error adding contact'),
  });

  return (
    <Card className="border-primary/30 bg-primary/5 animate-in slide-in-from-top-2 duration-300">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-primary" />
          {isRTL ? `הוסף איש קשר ראשי ל-${companyName}` : `Add primary contact for ${companyName}`}
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onDismiss}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          {isRTL ? 'רוצה להוסיף איש קשר ראשי ללקוח החדש?' : 'Want to add a primary contact for the new client?'}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Input value={contact.full_name} onChange={(e) => setContact(p => ({ ...p, full_name: e.target.value }))} placeholder={isRTL ? 'שם מלא *' : 'Full Name *'} className="text-sm" />
          <Input value={contact.role_title} onChange={(e) => setContact(p => ({ ...p, role_title: e.target.value }))} placeholder={isRTL ? 'תפקיד' : 'Role'} className="text-sm" />
          <Input value={contact.email} onChange={(e) => setContact(p => ({ ...p, email: e.target.value }))} placeholder="Email" type="email" className="text-sm" />
          <Input value={contact.phone} onChange={(e) => setContact(p => ({ ...p, phone: e.target.value }))} placeholder={isRTL ? 'טלפון' : 'Phone'} className="text-sm" />
        </div>
        <Button onClick={() => addContactMutation.mutate()} disabled={!contact.full_name.trim() || addContactMutation.isPending} className="w-full gap-2" size="sm">
          <UserPlus className="w-3.5 h-3.5" />
          {isRTL ? 'הוסף איש קשר' : 'Add Contact'}
        </Button>
      </CardContent>
    </Card>
  );
}
