import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { ShieldCheck, Search, Building2, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getCompanyLogoUrl } from '@/lib/company-logo';

interface CompanyClaimDialogProps {
  /** Pre-set companyId when claiming from CompanyProfile page */
  companyId?: string;
  companyName?: string;
  /** Trigger variant */
  triggerLabel?: string;
}

export function CompanyClaimDialog({ companyId, companyName, triggerLabel }: CompanyClaimDialogProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHe = language === 'he';

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'search' | 'confirm' | 'done'>(companyId ? 'confirm' : 'search');
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(companyId ? { id: companyId, name: companyName } : null);
  const [claiming, setClaiming] = useState(false);

  const handleSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    const { data } = await supabase
      .from('companies')
      .select('id, name, website, logo_url, industry, is_claimed')
      .ilike('name', `%${search.trim()}%`)
      .limit(8);
    setResults(data || []);
    setSearching(false);
  };

  const handleClaim = async () => {
    if (!user || !selected) return;
    setClaiming(true);
    try {
      // 1. Claim the company
      const { error } = await supabase
        .from('companies')
        .update({ claimed_by: user.id, is_claimed: true })
        .eq('id', selected.id);
      if (error) throw error;

      // 2. Link profile → company
      await supabase
        .from('profiles')
        .update({ active_company_id: selected.id } as any)
        .eq('user_id', user.id);

      setStep('done');
      toast.success(isHe ? '🎉 הדף נתבע בהצלחה!' : '🎉 Company page claimed!');
    } catch {
      toast.error(isHe ? 'שגיאה בתביעת הדף' : 'Error claiming page');
    }
    setClaiming(false);
  };

  const handleCreateNew = async () => {
    if (!user || !search.trim()) return;
    setClaiming(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .insert({ name: search.trim(), created_by: user.id, claimed_by: user.id, is_claimed: true } as any)
        .select('id')
        .single();
      if (error) throw error;

      await supabase
        .from('profiles')
        .update({ active_company_id: data.id } as any)
        .eq('user_id', user.id);

      setStep('done');
      toast.success(isHe ? '🎉 החברה נוצרה ונקשרה לפרופיל שלך!' : '🎉 Company created and linked to your profile!');
    } catch {
      toast.error(isHe ? 'שגיאה ביצירת החברה' : 'Error creating company');
    }
    setClaiming(false);
  };

  const handleOpen = (v: boolean) => {
    setOpen(v);
    if (!v) {
      if (!companyId) { setStep('search'); setResults([]); setSearch(''); setSelected(null); }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs border-amber-500/50 text-amber-700 hover:bg-amber-500/10">
          <ShieldCheck className="w-3.5 h-3.5" />
          {triggerLabel || (isHe ? 'תבע דף' : 'Claim Page')}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            {isHe ? 'תביעת דף חברה' : 'Claim Company Page'}
          </DialogTitle>
        </DialogHeader>

        {step === 'done' ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <p className="font-semibold">{isHe ? 'הצלחה!' : 'Success!'}</p>
            <p className="text-sm text-muted-foreground">
              {isHe
                ? 'הדף מקושר לפרופיל שלך. כעת תוכל לנהל את החברה, לפרסם משרות ולפרסם בפיד.'
                : 'Page linked to your profile. You can now manage the company, post jobs and publish to the feed.'}
            </p>
            <Button onClick={() => setOpen(false)} className="w-full">
              {isHe ? 'סגור' : 'Close'}
            </Button>
          </div>
        ) : step === 'confirm' && selected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Avatar className="w-12 h-12 rounded-lg flex-shrink-0">
                <AvatarImage src={getCompanyLogoUrl(selected) || undefined} />
                <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold">
                  {selected.name?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm">{selected.name}</p>
                {selected.industry && <p className="text-xs text-muted-foreground">{selected.industry}</p>}
                {selected.is_claimed && (
                  <p className="text-xs text-amber-600">
                    {isHe ? '⚠️ דף זה כבר נתבע' : '⚠️ This page is already claimed'}
                  </p>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {isHe
                ? 'על ידי לחיצה על "אשר", הדף יקושר לפרופיל שלך ותקבל גישת עריכה.'
                : 'By confirming, this page will be linked to your profile and you\'ll get edit access.'}
            </p>
            <div className="flex gap-2">
              {!companyId && (
                <Button variant="outline" className="flex-1" onClick={() => setStep('search')}>
                  {isHe ? 'חזרה' : 'Back'}
                </Button>
              )}
              <Button className="flex-1 gap-1.5" onClick={handleClaim} disabled={claiming}>
                {claiming ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {isHe ? 'אשר ותבע' : 'Confirm & Claim'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {isHe ? 'חפש את החברה שלך לפי שם' : 'Search for your company by name'}
            </p>
            <div className="flex gap-2">
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={isHe ? 'שם החברה...' : 'Company name...'}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button size="sm" onClick={handleSearch} disabled={searching || !search.trim()}>
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>

            {results.length > 0 && (
              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {results.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setSelected(c); setStep('confirm'); }}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/50 transition-colors text-start"
                  >
                    <Avatar className="w-8 h-8 rounded-md flex-shrink-0">
                      <AvatarImage src={getCompanyLogoUrl(c) || undefined} />
                      <AvatarFallback className="rounded-md bg-primary/10 text-primary text-xs font-bold">
                        {c.name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      {c.industry && <p className="text-xs text-muted-foreground">{c.industry}</p>}
                    </div>
                    {c.is_claimed && <ShieldCheck className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            )}

            {results.length === 0 && search.trim() && !searching && (
              <div className="text-center py-3 space-y-2">
                <p className="text-sm text-muted-foreground">
                  {isHe ? 'לא נמצאה חברה בשם זה' : 'No company found with this name'}
                </p>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCreateNew} disabled={claiming}>
                  {claiming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Building2 className="w-3.5 h-3.5" />}
                  {isHe ? `צור "${search}"` : `Create "${search}"`}
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
