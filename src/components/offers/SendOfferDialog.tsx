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
import { Plus, Trash2, Send, Loader2, FileText } from 'lucide-react';

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

  const [salaryRange, setSalaryRange] = useState('');
  const [currency, setCurrency] = useState('ILS');
  const [workHours, setWorkHours] = useState('');
  const [wfhDays, setWfhDays] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [additionalTerms, setAdditionalTerms] = useState('');
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [saving, setSaving] = useState(false);

  const addBenefit = () =>
    setBenefits((prev) => [...prev, { id: Date.now().toString(), type: 'other', value: '' }]);
  const removeBenefit = (id: string) => setBenefits((prev) => prev.filter((b) => b.id !== id));
  const updateBenefit = (id: string, field: keyof Benefit, val: string) =>
    setBenefits((prev) => prev.map((b) => (b.id === id ? { ...b, [field]: val } : b)));

  const handleSend = async () => {
    if (!user) return;

    // At least one field should be filled
    if (!salaryRange && !workHours && !wfhDays && !location && !additionalTerms && benefits.length === 0) {
      toast.error(isHebrew ? 'יש למלא לפחות שדה אחד' : 'Please fill at least one field');
      return;
    }

    setSaving(true);
    try {
      const { error } = await (supabase as any).from('offers').insert({
        created_by: user.id,
        candidate_id: candidateId,
        job_id: jobId,
        salary_gross: salaryRange ? parseInt(salaryRange) : 0,
        salary_currency: currency,
        start_date: startDate || null,
        expiry_date: null,
        additional_terms: [
          workHours && `${isHebrew ? 'שעות עבודה' : 'Work hours'}: ${workHours}`,
          wfhDays && `${isHebrew ? 'ימי עבודה מהבית' : 'WFH days'}: ${wfhDays}`,
          location && `${isHebrew ? 'מיקום' : 'Location'}: ${location}`,
          additionalTerms,
        ].filter(Boolean).join('\n') || null,
        benefits: benefits.map(({ id, ...b }) => b),
        status: 'sent',
        sent_at: new Date().toISOString(),
      });

      if (error) throw error;

      // Add timeline event
      await supabase.from('application_timeline').insert({
        application_id: applicationId,
        event_type: 'offer_sent',
        new_value: salaryRange ? `${currency} ${parseInt(salaryRange).toLocaleString()}` : (isHebrew ? 'פרטי משרה' : 'Job details'),
        description: isHebrew ? 'פרטי המשרה נשלחו למועמד' : 'Job details sent to candidate',
      });

      toast.success(isHebrew ? 'הפרטים נשלחו למועמד!' : 'Details sent to candidate!');
      onOfferSent?.();
      onOpenChange(false);

      // Reset form
      setSalaryRange('');
      setWorkHours('');
      setWfhDays('');
      setLocation('');
      setStartDate('');
      setAdditionalTerms('');
      setBenefits([]);
    } catch (e: any) {
      console.error('Error sending job details:', e);
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
            <FileText className="w-5 h-5 text-primary" />
            {isHebrew ? 'שליחת פרטי המשרה' : 'Send Job Details'}
          </DialogTitle>
          <DialogDescription>
            {isHebrew
              ? `שלח ל-${candidateName} את האותיות הקטנות של משרת ${jobTitle}${companyName ? ` ב-${companyName}` : ''}`
              : `Send ${candidateName} the fine print for ${jobTitle}${companyName ? ` at ${companyName}` : ''}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Salary Range */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>{isHebrew ? 'טווח שכר (ברוטו חודשי)' : 'Salary Range (Monthly Gross)'}</Label>
              <Input
                type="number"
                value={salaryRange}
                onChange={(e) => setSalaryRange(e.target.value)}
                placeholder={isHebrew ? 'למשל 18,000' : 'e.g. 18000'}
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

          {/* Work Hours & WFH */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{isHebrew ? 'שעות עבודה' : 'Work Hours'}</Label>
              <Input
                value={workHours}
                onChange={(e) => setWorkHours(e.target.value)}
                placeholder={isHebrew ? 'למשל 9:00-18:00' : 'e.g. 9:00-18:00'}
              />
            </div>
            <div className="space-y-1">
              <Label>{isHebrew ? 'ימי WFH בשבוע' : 'WFH Days/Week'}</Label>
              <Input
                value={wfhDays}
                onChange={(e) => setWfhDays(e.target.value)}
                placeholder={isHebrew ? 'למשל 2' : 'e.g. 2'}
              />
            </div>
          </div>

          {/* Location & Start Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{isHebrew ? 'מיקום העבודה' : 'Office Location'}</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={isHebrew ? 'למשל תל אביב, רוטשילד 45' : 'e.g. Tel Aviv, Rothschild 45'}
              />
            </div>
            <div className="space-y-1">
              <Label>{isHebrew ? 'תאריך התחלה משוער' : 'Estimated Start Date'}</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
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

          {/* Additional Notes */}
          <div className="space-y-1">
            <Label>{isHebrew ? 'פרטים נוספים' : 'Additional Details'}</Label>
            <Textarea
              value={additionalTerms}
              onChange={(e) => setAdditionalTerms(e.target.value)}
              placeholder={isHebrew ? 'דרישות ביגוד, חניה, ארוחות, ועוד...' : 'Dress code, parking, meals, etc.'}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSend} disabled={saving} className="gap-2">
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {isHebrew ? 'שלח למועמד' : 'Send to Candidate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
