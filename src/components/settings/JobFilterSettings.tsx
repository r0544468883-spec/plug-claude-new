import { useState, useEffect, KeyboardEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Ban, Clock, X, Plus, Save, Loader2, AlertTriangle } from 'lucide-react';

const AGE_OPTIONS = [
  { value: '7',   he: '7 ימים',   en: '7 days' },
  { value: '14',  he: '14 ימים',  en: '14 days' },
  { value: '30',  he: 'חודש',     en: '1 month' },
  { value: '60',  he: 'חודשיים',  en: '2 months' },
  { value: '90',  he: '3 חודשים', en: '3 months' },
  { value: '180', he: 'חצי שנה',  en: '6 months' },
  { value: '0',   he: 'ללא הגבלה', en: 'No limit' },
];

export function JobFilterSettings() {
  const { user, profile } = useAuth();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const isHe = language === 'he';

  const [blockedCompanies, setBlockedCompanies] = useState<string[]>([]);
  const [maxAgeDays, setMaxAgeDays] = useState<string>('90');
  const [input, setInput] = useState('');

  useEffect(() => {
    if (profile) {
      setBlockedCompanies((profile as any)?.blocked_companies || []);
      const age = (profile as any)?.max_job_age_days;
      setMaxAgeDays(age != null ? String(age) : '90');
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('profiles')
        .update({
          blocked_companies: blockedCompanies,
          max_job_age_days: parseInt(maxAgeDays) || 90,
        } as any)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isHe ? 'הגדרות סינון נשמרו' : 'Filter settings saved');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: () => {
      toast.error(isHe ? 'שגיאה בשמירה' : 'Failed to save');
    },
  });

  const addCompany = () => {
    const val = input.trim();
    if (!val) return;
    if (blockedCompanies.some((c) => c.toLowerCase() === val.toLowerCase())) {
      toast.info(isHe ? 'כבר קיים ברשימה' : 'Already in list');
      return;
    }
    setBlockedCompanies((prev) => [...prev, val]);
    setInput('');
  };

  const removeCompany = (name: string) => {
    setBlockedCompanies((prev) => prev.filter((c) => c !== name));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); addCompany(); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Ban className="h-4 w-4 text-destructive" />
          {isHe ? 'סינון משרות' : 'Job Filters'}
        </CardTitle>
        <CardDescription>
          {isHe
            ? 'הסתר משרות מחברות מסוימות ומשרות ישנות'
            : 'Hide jobs from specific companies and old listings'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6" dir={isHe ? 'rtl' : 'ltr'}>
        {/* Company blocklist */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Ban className="h-3.5 w-3.5 text-destructive" />
            {isHe ? 'חסום חברות' : 'Block companies'}
          </Label>
          <p className="text-xs text-muted-foreground -mt-1">
            {isHe
              ? 'משרות מחברות אלה לא יופיעו בהתאמות ובספרינט'
              : 'Jobs from these companies won\'t appear in matches or sprint'}
          </p>

          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isHe ? 'שם חברה...' : 'Company name...'}
              className="flex-1"
            />
            <Button type="button" size="sm" variant="outline" onClick={addCompany} className="gap-1">
              <Plus className="h-3.5 w-3.5" />
              {isHe ? 'הוסף' : 'Add'}
            </Button>
          </div>

          {blockedCompanies.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {blockedCompanies.map((company) => (
                <Badge key={company} variant="destructive" className="gap-1 pr-1 text-xs">
                  {company}
                  <button
                    onClick={() => removeCompany(company)}
                    className="hover:opacity-70 transition-opacity ms-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/50">
              {isHe ? 'אין חברות חסומות' : 'No blocked companies'}
            </p>
          )}
        </div>

        {/* Job age filter */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-primary" />
            {isHe ? 'הסתר משרות ישנות מ...' : 'Hide jobs older than...'}
          </Label>
          <Select value={maxAgeDays} onValueChange={setMaxAgeDays}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {isHe ? opt.he : opt.en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {maxAgeDays !== '0' && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {isHe
                ? `משרות ישנות מ-${maxAgeDays} ימים יוסתרו אוטומטית`
                : `Jobs older than ${maxAgeDays} days will be hidden automatically`}
            </p>
          )}
        </div>

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="gap-2"
          size="sm"
        >
          {saveMutation.isPending
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Save className="h-3.5 w-3.5" />}
          {isHe ? 'שמור הגדרות' : 'Save settings'}
        </Button>
      </CardContent>
    </Card>
  );
}
