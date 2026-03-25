import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface CreateOfferProps {
  onCreated?: () => void;
}

interface Benefit {
  id: string;
  type: string;
  value: string;
}

const benefitTypes = [
  { value: 'car', label: 'רכב' },
  { value: 'vacation', label: 'ימי חופשה' },
  { value: 'health', label: 'ביטוח בריאות' },
  { value: 'training', label: 'הכשרות' },
  { value: 'bonus', label: 'בונוס' },
  { value: 'other', label: 'אחר' },
];

export function CreateOffer({ onCreated }: CreateOfferProps) {
  const { user } = useAuth();
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidateId, setCandidateId] = useState('');
  const [salary, setSalary] = useState('');
  const [currency, setCurrency] = useState('ILS');
  const [startDate, setStartDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [additionalTerms, setAdditionalTerms] = useState('');
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [saving, setSaving] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const searchCandidate = async () => {
    if (!candidateEmail.trim()) return;
    setSearchLoading(true);
    const { data } = await supabase.from('profiles').select('user_id, full_name').eq('email', candidateEmail).single();
    setSearchLoading(false);
    if (data) { setCandidateId(data.user_id); toast.success(`נמצא: ${data.full_name}`); }
    else toast.error('מועמד לא נמצא');
  };

  const addBenefit = () => setBenefits(prev => [...prev, { id: Date.now().toString(), type: 'other', value: '' }]);
  const removeBenefit = (id: string) => setBenefits(prev => prev.filter(b => b.id !== id));
  const updateBenefit = (id: string, field: keyof Benefit, val: string) =>
    setBenefits(prev => prev.map(b => b.id === id ? { ...b, [field]: val } : b));

  const save = async (status: 'draft' | 'sent') => {
    if (!user || !candidateId || !salary) { toast.error('חסרים פרטים'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('offers' as any).insert({
        created_by: user.id,
        candidate_id: candidateId,
        salary_gross: parseInt(salary),
        salary_currency: currency,
        start_date: startDate || null,
        expiry_date: expiryDate || null,
        additional_terms: additionalTerms,
        benefits: benefits.map(({ id, ...b }) => b),
        status,
        sent_at: status === 'sent' ? new Date().toISOString() : null,
      });
      if (error) throw error;
      toast.success(status === 'draft' ? 'נשמר כטיוטה' : 'הצעה נשלחה!');
      onCreated?.();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <Card className="border-border bg-card" style={{ borderRadius: 12 }}>
        <CardHeader><CardTitle>יצירת הצעת עבודה</CardTitle></CardHeader>
        <CardContent className="p-6 space-y-4">
          <div>
            <Label>חיפוש מועמד לפי אימייל</Label>
            <div className="flex gap-2 mt-1">
              <Input value={candidateEmail} onChange={e => setCandidateEmail(e.target.value)} placeholder="email@example.com" className="flex-1" />
              <Button onClick={searchCandidate} disabled={searchLoading} variant="outline" size="sm">{searchLoading ? 'מחפש...' : 'חפש'}</Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>שכר ברוטו חודשי (₪) *</Label>
              <Input type="number" value={salary} onChange={e => setSalary(e.target.value)} placeholder="25000" className="mt-1" />
            </div>
            <div>
              <Label>מטבע</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ILS">₪ שקל</SelectItem>
                  <SelectItem value="USD">$ דולר</SelectItem>
                  <SelectItem value="EUR">€ יורו</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>תאריך התחלה</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>תוקף ההצעה</Label>
              <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>תנאים נוספים</Label>
            <Textarea value={additionalTerms} onChange={e => setAdditionalTerms(e.target.value)} placeholder="שעות עבודה, ימי WFH, ועוד..." rows={3} className="mt-1" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card" style={{ borderRadius: 12 }}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>הטבות</CardTitle>
          <Button variant="outline" size="sm" onClick={addBenefit} className="gap-1.5"><Plus className="w-4 h-4" />הוסף</Button>
        </CardHeader>
        <CardContent className="p-6 pt-0 space-y-2">
          {benefits.map(b => (
            <div key={b.id} className="flex gap-2">
              <Select value={b.type} onValueChange={v => updateBenefit(b.id, 'type', v)}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>{benefitTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
              <Input value={b.value} onChange={e => updateBenefit(b.id, 'value', e.target.value)} placeholder="פרטים..." className="flex-1" />
              <Button variant="ghost" size="icon" onClick={() => removeBenefit(b.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
          {!benefits.length && <p className="text-muted-foreground text-sm text-center py-4">לא נוספו הטבות</p>}
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={() => save('draft')} disabled={saving}>שמור כטיוטה</Button>
        <Button onClick={() => save('sent')} disabled={saving} className="bg-primary text-primary-foreground">{saving ? 'שולח...' : 'שלח למועמד'}</Button>
      </div>
    </div>
  );
}
