import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Send, Loader2, Gift } from 'lucide-react';

interface Benefit {
  id: string;
  type: string;
  value: string;
}

const benefitTypes = [
  { value: 'car', labelHe: 'רכב', labelEn: 'Company Car' },
  { value: 'vacation', labelHe: 'ימי חופשה', labelEn: 'Vacation Days' },
  { value: 'health', labelHe: 'ביטוח בריאות', labelEn: 'Health Insurance' },
  { value: 'training', labelHe: 'הכשרות', labelEn: 'Training Budget' },
  { value: 'bonus', labelHe: 'בונוס', labelEn: 'Bonus' },
  { value: 'stock', labelHe: 'אופציות', labelEn: 'Stock Options' },
  { value: 'wfh', labelHe: 'עבודה מהבית', labelEn: 'Work From Home' },
  { value: 'other', labelHe: 'אחר', labelEn: 'Other' },
];

interface SendOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string;
  candidateId: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
  companyName?: string;
  onOfferSent?: () => void;
}

export function SendOfferDialog({
  open,
  onOpenChange,
  applicationId,
  candidateId,
  candidateName,
  jobId,
  jobTitle,
  companyName,
  onOfferSent,
}: SendOfferDialogProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const [salary, setSalary] = useState('');
  const [currency, setCurrency] = useState('ILS');
  const [startDate, setStartDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [additionalTerms, setAdditionalTerms] = useState('');
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [saving, setSaving] = useState(false);

  const addBenefit = () =>
    setBenefits((prev) => [...prev, { id: Date.now().toString(), type: 'other', value: '' }]);
  const removeBenefit = (id: string) => setBenefits((prev) => prev.filter((b) => b.id !== id));
  const updateBenefit = (id: string, field: keyof Benefit, val: string) =>
    setBenefits((prev) => prev.map((b) => (b.id === id ? { ...b, [field]: val } : b)));

  const handleSend = async (status: 'draft' | 'sent') => {
    if (!user || !salary) {
      toast.error(isHebrew ? 'יש להזין שכר' : 'Please enter salary');
      return;
    }

    setSaving(true);
    try {
      const { error } = await (supabase as any).from('offers').insert({
        created_by: user.id,
        candidate_id: candidateId,
        job_id: jobId,
        salary_gross: parseInt(salary),
        salary_currency: currency,
        start_date: startDate || null,
        expiry_date: expiryDate || null,
        additional_terms: additionalTerms || null,
        benefits: benefits.map(({ id, ...b }) => b),
        status,
        sent_at: status === 'sent' ? new Date().toISOString() : null,
      });

      if (error) throw error;

      // Add timeline event
      await supabase.from('application_timeline').insert({
        application_id: applicationId,
        event_type: 'offer_sent',
        new_value: `${currency} ${parseInt(salary).toLocaleString()}`,
        description: isHebrew
          ? `הצעת עבודה ${status === 'sent' ? 'נשלחה' : 'נשמרה כטיוטה'}`
          : `Job offer ${status === 'sent' ? 'sent' : 'saved as draft'}`,
      });

      toast.success(
        status === 'draft'
          ? isHebrew ? 'נשמר כטיוטה' : 'Saved as draft'
          : isHebrew ? 'ההצעה נשלחה!' : 'Offer sent!'
      );

      onOfferSent?.();
      onOpenChange(false);

      // Reset form
      setSalary('');
      setStartDate('');
      setExpiryDate('');
      setAdditionalTerms('');
      setBenefits([]);
    } catch (e: any) {
      console.error('Error sending offer:', e);
      toast.error(e.message || (isHebrew ? 'שגיאה' : 'Error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto" dir={isHebrew ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            {isHebrew ? 'שליחת הצעת עבודה' : 'Send Job Offer'}
          </DialogTitle>
          <DialogDescription>
            {isHebrew
              ? `הצעת עבודה ל-${candidateName} למשרת ${jobTitle}${companyName ? ` ב-${companyName}` : ''}`
              : `Job offer for ${candidateName} — ${jobTitle}${companyName ? ` at ${companyName}` : ''}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Salary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>{isHebrew ? 'שכר ברוטו חודשי *' : 'Monthly Gross Salary *'}</Label>
              <Input
                type="number"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="25000"
              />
            </div>
            <div className="space-y-1">
              <Label>{isHebrew ? 'מטבע' : 'Currency'}</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ILS">₪</SelectItem>
                  <SelectItem value="USD">$</SelectItem>
                  <SelectItem value="EUR">€</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{isHebrew ? 'תאריך התחלה' : 'Start Date'}</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>{isHebrew ? 'תוקף ההצעה' : 'Offer Expiry'}</Label>
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{isHebrew ? 'הטבות' : 'Benefits'}</Label>
              <Button variant="ghost" size="sm" onClick={addBenefit} className="gap-1 h-7 text-xs">
                <Plus className="w-3 h-3" />
                {isHebrew ? 'הוסף' : 'Add'}
              </Button>
            </div>
            {benefits.map((b) => (
              <div key={b.id} className="flex gap-2">
                <Select value={b.type} onValueChange={(v) => updateBenefit(b.id, 'type', v)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {benefitTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {isHebrew ? t.labelHe : t.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={b.value}
                  onChange={(e) => updateBenefit(b.id, 'value', e.target.value)}
                  placeholder={isHebrew ? 'פרטים...' : 'Details...'}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeBenefit(b.id)}
                  className="text-destructive h-9 w-9"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {benefits.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                {isHebrew ? 'לא נוספו הטבות' : 'No benefits added'}
              </p>
            )}
          </div>

          {/* Additional Terms */}
          <div className="space-y-1">
            <Label>{isHebrew ? 'תנאים נוספים' : 'Additional Terms'}</Label>
            <Textarea
              value={additionalTerms}
              onChange={(e) => setAdditionalTerms(e.target.value)}
              placeholder={isHebrew ? 'שעות עבודה, ימי WFH, ועוד...' : 'Working hours, WFH days, etc.'}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleSend('draft')} disabled={saving}>
            {isHebrew ? 'שמור כטיוטה' : 'Save Draft'}
          </Button>
          <Button onClick={() => handleSend('sent')} disabled={saving || !salary} className="gap-2">
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {isHebrew ? 'שלח הצעה' : 'Send Offer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
