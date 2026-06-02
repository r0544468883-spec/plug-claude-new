import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Plus, Link2, Copy, Share2, Mail, MessageCircle, Loader2,
  DollarSign, Eye, ToggleLeft, ToggleRight, CalendarDays, ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { he, enUS } from 'date-fns/locale';

interface PaymentLinksManagerProps {
  hubId?: string;
}

interface PaymentLink {
  id: string;
  user_id: string;
  hub_id: string | null;
  title: string;
  title_he: string | null;
  description: string | null;
  amount: number;
  currency: string;
  slug: string;
  image_url: string | null;
  max_uses: number | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  uses_count?: number;
  total_revenue?: number;
}

export function PaymentLinksManager({ hubId }: PaymentLinksManagerProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const queryClient = useQueryClient();
  const dateLocale = isRTL ? he : enUS;

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formTitleHe, setFormTitleHe] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCurrency, setFormCurrency] = useState('ILS');
  const [formSlug, setFormSlug] = useState('');
  const [formMaxUses, setFormMaxUses] = useState('');
  const [formExpiresAt, setFormExpiresAt] = useState('');
  const [formImage, setFormImage] = useState<File | null>(null);

  // Generate slug from title
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^\x00-\x7F]/g, '') // remove non-ASCII (Hebrew etc.)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || `link-${Date.now()}`;
  };

  const handleTitleChange = (value: string) => {
    setFormTitle(value);
    if (!formSlug || formSlug === generateSlug(formTitle)) {
      setFormSlug(generateSlug(value));
    }
  };

  // Fetch payment links
  const { data: links = [], isLoading } = useQuery({
    queryKey: ['payment-links', user?.id, hubId],
    queryFn: async () => {
      if (!user?.id) return [];
      let query = (supabase as any)
        .from('payment_links')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (hubId) {
        query = query.eq('hub_id', hubId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as PaymentLink[];
    },
    enabled: !!user?.id,
  });

  // Fetch analytics per link
  const { data: analytics = {} } = useQuery({
    queryKey: ['payment-link-analytics', links.map(l => l.id).join(',')],
    queryFn: async () => {
      const result: Record<string, { count: number; revenue: number }> = {};
      for (const link of links) {
        const { data } = await (supabase as any)
          .from('payment_link_transactions')
          .select('amount, status')
          .eq('payment_link_id', link.id);
        const transactions = data || [];
        const completed = transactions.filter((t: any) => t.status === 'completed' || t.status === 'pending');
        result[link.id] = {
          count: completed.length,
          revenue: completed.reduce((sum: number, t: any) => sum + (t.amount || 0), 0),
        };
      }
      return result;
    },
    enabled: links.length > 0,
  });

  // Create link mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      let imageUrl: string | null = null;
      if (formImage) {
        const ext = formImage.name.split('.').pop();
        const path = `payment-links/${user.id}/${formSlug}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, formImage, { upsert: true });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
          imageUrl = urlData.publicUrl;
        }
      }

      const { error } = await (supabase as any)
        .from('payment_links')
        .insert({
          user_id: user.id,
          hub_id: hubId || null,
          title: formTitle,
          title_he: formTitleHe || null,
          description: formDescription || null,
          amount: parseFloat(formAmount) || 0,
          currency: formCurrency,
          slug: formSlug,
          image_url: imageUrl,
          max_uses: formMaxUses ? parseInt(formMaxUses) : null,
          expires_at: formExpiresAt || null,
          is_active: true,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-links'] });
      setShowCreateDialog(false);
      resetForm();
      toast.success(isRTL ? 'קישור תשלום נוצר!' : 'Payment link created!');
    },
    onError: (err: any) => {
      toast.error(err.message?.includes('duplicate')
        ? (isRTL ? 'הסלאג כבר בשימוש' : 'Slug already in use')
        : (isRTL ? 'שגיאה ביצירת הקישור' : 'Failed to create link'));
    },
  });

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await (supabase as any)
        .from('payment_links')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-links'] });
    },
  });

  const resetForm = () => {
    setFormTitle('');
    setFormTitleHe('');
    setFormDescription('');
    setFormAmount('');
    setFormCurrency('ILS');
    setFormSlug('');
    setFormMaxUses('');
    setFormExpiresAt('');
    setFormImage(null);
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/pay/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success(isRTL ? 'הקישור הועתק!' : 'Link copied!');
  };

  const shareWhatsApp = (link: PaymentLink) => {
    const url = `${window.location.origin}/pay/${link.slug}`;
    const text = isRTL
      ? `${link.title_he || link.title} - ${link.amount} ${link.currency}\n${url}`
      : `${link.title} - ${link.amount} ${link.currency}\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareEmail = (link: PaymentLink) => {
    const url = `${window.location.origin}/pay/${link.slug}`;
    const subject = link.title;
    const body = `${link.description || link.title}\n\n${isRTL ? 'קישור לתשלום:' : 'Payment link:'} ${url}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  };

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'ILS': return '\u20AA';
      case 'USD': return '$';
      case 'EUR': return '\u20AC';
      default: return currency;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{isRTL ? 'קישורי תשלום' : 'Payment Links'}</h2>
          <p className="text-sm text-muted-foreground">
            {isRTL ? 'צור וניהל קישורי תשלום לשיתוף' : 'Create and manage shareable payment links'}
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
          <Plus className="w-4 h-4" />
          <span className={cn(isRTL ? 'mr-1.5' : 'ml-1.5')}>
            {isRTL ? 'קישור חדש' : 'New Link'}
          </span>
        </Button>
      </div>

      {/* Links list */}
      {links.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Link2 className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              {isRTL ? 'אין קישורי תשלום עדיין' : 'No payment links yet'}
            </p>
            <Button variant="outline" className="mt-4" onClick={() => { resetForm(); setShowCreateDialog(true); }}>
              <Plus className="w-4 h-4" />
              <span className={cn(isRTL ? 'mr-1.5' : 'ml-1.5')}>
                {isRTL ? 'צור קישור ראשון' : 'Create your first link'}
              </span>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {links.map(link => {
            const stats = analytics[link.id] || { count: 0, revenue: 0 };
            return (
              <Card key={link.id} className={cn('transition-all', !link.is_active && 'opacity-60')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    {/* Left: info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">
                          {isRTL ? (link.title_he || link.title) : link.title}
                        </h3>
                        <Badge variant={link.is_active ? 'default' : 'secondary'} className="text-xs">
                          {link.is_active ? (isRTL ? 'פעיל' : 'Active') : (isRTL ? 'לא פעיל' : 'Inactive')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {getCurrencySymbol(link.currency)}{link.amount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          {stats.count} {isRTL ? 'עסקאות' : 'uses'}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5" />
                          {getCurrencySymbol(link.currency)}{stats.revenue}
                        </span>
                        {link.expires_at && (
                          <span className="flex items-center gap-1">
                            <CalendarDays className="w-3.5 h-3.5" />
                            {format(new Date(link.expires_at), 'dd/MM/yyyy', { locale: dateLocale })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <code className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">
                          /pay/{link.slug}
                        </code>
                      </div>
                    </div>

                    {/* Right: actions */}
                    <div className="flex items-center gap-1.5">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyLink(link.slug)} title={isRTL ? 'העתק קישור' : 'Copy link'}>
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => shareWhatsApp(link)} title="WhatsApp">
                        <MessageCircle className="w-4 h-4 text-green-600" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => shareEmail(link)} title="Email">
                        <Mail className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => window.open(`/pay/${link.slug}`, '_blank')}
                        title={isRTL ? 'תצוגה מקדימה' : 'Preview'}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Switch
                        checked={link.is_active}
                        onCheckedChange={(checked) => toggleMutation.mutate({ id: link.id, isActive: checked })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{isRTL ? 'קישור תשלום חדש' : 'Create Payment Link'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label>{isRTL ? 'כותרת' : 'Title'}</Label>
              <Input value={formTitle} onChange={e => handleTitleChange(e.target.value)} placeholder={isRTL ? 'שם המוצר/שירות' : 'Product or service name'} />
            </div>
            <div>
              <Label>{isRTL ? 'כותרת בעברית' : 'Title (Hebrew)'}</Label>
              <Input value={formTitleHe} onChange={e => setFormTitleHe(e.target.value)} dir="rtl" placeholder="כותרת בעברית" />
            </div>
            <div>
              <Label>{isRTL ? 'תיאור' : 'Description'}</Label>
              <Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={2} placeholder={isRTL ? 'תיאור קצר (אופציונלי)' : 'Short description (optional)'} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{isRTL ? 'סכום' : 'Amount'}</Label>
                <Input type="number" min="0" step="0.01" value={formAmount} onChange={e => setFormAmount(e.target.value)} placeholder="99" />
              </div>
              <div>
                <Label>{isRTL ? 'מטבע' : 'Currency'}</Label>
                <Select value={formCurrency} onValueChange={setFormCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ILS">ILS (\u20AA)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (\u20AC)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{isRTL ? 'סלאג (URL)' : 'Slug (URL)'}</Label>
              <Input value={formSlug} onChange={e => setFormSlug(e.target.value)} placeholder="my-product" dir="ltr" className="font-mono text-sm" />
              <p className="text-xs text-muted-foreground mt-1">
                {window.location.origin}/pay/{formSlug || '...'}
              </p>
            </div>
            <div>
              <Label>{isRTL ? 'תמונה' : 'Image'}</Label>
              <Input type="file" accept="image/*" onChange={e => setFormImage(e.target.files?.[0] || null)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{isRTL ? 'מקסימום שימושים' : 'Max Uses'}</Label>
                <Input type="number" min="1" value={formMaxUses} onChange={e => setFormMaxUses(e.target.value)} placeholder={isRTL ? 'ללא הגבלה' : 'Unlimited'} />
              </div>
              <div>
                <Label>{isRTL ? 'תפוגה' : 'Expires'}</Label>
                <Input type="date" value={formExpiresAt} onChange={e => setFormExpiresAt(e.target.value)} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {isRTL ? 'ביטול' : 'Cancel'}
            </Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !formTitle || !formAmount || !formSlug}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <span className={createMutation.isPending ? (isRTL ? 'mr-1.5' : 'ml-1.5') : ''}>
                {isRTL ? 'יצירה' : 'Create'}
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
