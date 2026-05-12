import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import {
  Plus,
  Pencil,
  Trash2,
  FileText,
  DollarSign,
  Gift,
  BarChart2,
  Car,
  UmbrellaOff,
  Heart,
  GraduationCap,
  Banknote,
  MoreHorizontal,
  CheckCircle2,
  Loader2,
  ClipboardList,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type BenefitType = 'car' | 'vacation' | 'health' | 'training' | 'bonus' | 'other';

interface Benefit {
  type: BenefitType;
  value: string;
}

interface OfferTemplate {
  id: string;
  company_id: string | null;
  created_by: string;
  name: string;
  description: string | null;
  category: string;
  salary_range_min: number | null;
  salary_range_max: number | null;
  currency: string;
  benefits: Benefit[];
  additional_terms: string | null;
  template_body: string | null;
  is_default: boolean;
  use_count: number;
  created_at: string;
  updated_at: string;
}

type OfferCategory =
  | 'employment'
  | 'nda'
  | 'offer_letter'
  | 'contractor'
  | 'internship'
  | 'general';

type Currency = 'ILS' | 'USD' | 'EUR';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: { value: OfferCategory; he: string; en: string; color: string }[] = [
  { value: 'employment',  he: 'חוזה עבודה',       en: 'Employment',    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  { value: 'nda',         he: 'הסכם סודיות',       en: 'NDA',           color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  { value: 'offer_letter',he: 'מכתב הצעה',         en: 'Offer Letter',  color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  { value: 'contractor',  he: 'חוזה קבלן',         en: 'Contractor',    color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  { value: 'internship',  he: 'מתמחה / סטאז׳',    en: 'Internship',    color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20' },
  { value: 'general',     he: 'כללי',              en: 'General',       color: 'bg-gray-500/10 text-gray-600 border-gray-500/20' },
];

const BENEFIT_TYPES: { value: BenefitType; he: string; en: string; icon: React.ElementType }[] = [
  { value: 'car',      he: 'רכב חברה',   en: 'Company Car',   icon: Car },
  { value: 'vacation', he: 'ימי חופשה',  en: 'Vacation Days', icon: UmbrellaOff },
  { value: 'health',   he: 'ביטוח בריאות', en: 'Health Insurance', icon: Heart },
  { value: 'training', he: 'הכשרות',     en: 'Training',      icon: GraduationCap },
  { value: 'bonus',    he: 'בונוס',      en: 'Bonus',         icon: Banknote },
  { value: 'other',    he: 'אחר',        en: 'Other',         icon: MoreHorizontal },
];

const CURRENCIES: Currency[] = ['ILS', 'USD', 'EUR'];

const CURRENCY_SYMBOLS: Record<Currency, string> = { ILS: '₪', USD: '$', EUR: '€' };

const EMPTY_FORM = {
  name: '',
  category: 'offer_letter' as OfferCategory,
  description: '',
  salary_range_min: '',
  salary_range_max: '',
  currency: 'ILS' as Currency,
  benefits: [] as Benefit[],
  additional_terms: '',
  template_body: '',
  is_default: false,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCategoryMeta(value: string) {
  return CATEGORIES.find(c => c.value === value) ?? CATEGORIES[CATEGORIES.length - 1];
}

function getBenefitMeta(value: string) {
  return BENEFIT_TYPES.find(b => b.value === value) ?? BENEFIT_TYPES[BENEFIT_TYPES.length - 1];
}

function formatSalary(min: number | null, max: number | null, currency: string, isRTL: boolean) {
  const sym = CURRENCY_SYMBOLS[currency as Currency] ?? currency;
  if (!min && !max) return null;
  if (min && max) return isRTL ? `${sym}${max.toLocaleString()} – ${sym}${min.toLocaleString()}` : `${sym}${min.toLocaleString()} – ${sym}${max.toLocaleString()}`;
  if (min) return `${sym}${min.toLocaleString()}+`;
  return `${isRTL ? 'עד ' : 'up to '}${sym}${max!.toLocaleString()}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border p-5 space-y-3">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex items-center justify-between pt-2">
            <Skeleton className="h-4 w-24" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16 rounded-md" />
              <Skeleton className="h-8 w-16 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Template Form Dialog ─────────────────────────────────────────────────────

interface TemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTemplate?: OfferTemplate | null;
  onSuccess: () => void;
  isRTL: boolean;
}

function TemplateFormDialog({ open, onOpenChange, editTemplate, onSuccess, isRTL }: TemplateFormDialogProps) {
  const { user } = useAuth();
  const isEdit = !!editTemplate;

  const [form, setForm] = useState(() =>
    editTemplate
      ? {
          name: editTemplate.name,
          category: editTemplate.category as OfferCategory,
          description: editTemplate.description ?? '',
          salary_range_min: editTemplate.salary_range_min?.toString() ?? '',
          salary_range_max: editTemplate.salary_range_max?.toString() ?? '',
          currency: (editTemplate.currency ?? 'ILS') as Currency,
          benefits: editTemplate.benefits ?? [],
          additional_terms: editTemplate.additional_terms ?? '',
          template_body: editTemplate.template_body ?? '',
          is_default: editTemplate.is_default ?? false,
        }
      : { ...EMPTY_FORM }
  );

  // Reset form when dialog opens
  const handleOpenChange = (val: boolean) => {
    if (!val) {
      setTimeout(() => setForm({ ...EMPTY_FORM }), 200);
    } else if (editTemplate) {
      setForm({
        name: editTemplate.name,
        category: editTemplate.category as OfferCategory,
        description: editTemplate.description ?? '',
        salary_range_min: editTemplate.salary_range_min?.toString() ?? '',
        salary_range_max: editTemplate.salary_range_max?.toString() ?? '',
        currency: (editTemplate.currency ?? 'ILS') as Currency,
        benefits: editTemplate.benefits ?? [],
        additional_terms: editTemplate.additional_terms ?? '',
        template_body: editTemplate.template_body ?? '',
        is_default: editTemplate.is_default ?? false,
      });
    }
    onOpenChange(val);
  };

  const [saving, setSaving] = useState(false);

  const addBenefit = () => {
    setForm(f => ({ ...f, benefits: [...f.benefits, { type: 'other', value: '' }] }));
  };

  const updateBenefit = (idx: number, field: keyof Benefit, value: string) => {
    setForm(f => {
      const benefits = f.benefits.map((b, i) => i === idx ? { ...b, [field]: value } : b);
      return { ...f, benefits };
    });
  };

  const removeBenefit = (idx: number) => {
    setForm(f => ({ ...f, benefits: f.benefits.filter((_, i) => i !== idx) }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error(isRTL ? 'שם התבנית נדרש' : 'Template name is required');
      return;
    }
    if (!user) return;

    setSaving(true);
    try {
      const payload: any = {
        name: form.name.trim(),
        category: form.category,
        description: form.description.trim() || null,
        salary_range_min: form.salary_range_min ? Number(form.salary_range_min) : null,
        salary_range_max: form.salary_range_max ? Number(form.salary_range_max) : null,
        currency: form.currency,
        benefits: form.benefits.filter(b => b.value.trim()),
        additional_terms: form.additional_terms.trim() || null,
        template_body: form.template_body.trim() || null,
        is_default: form.is_default,
        updated_at: new Date().toISOString(),
      };

      if (isEdit && editTemplate) {
        const { error } = await (supabase as any)
          .from('offer_templates')
          .update(payload)
          .eq('id', editTemplate.id);
        if (error) throw error;
        toast.success(isRTL ? 'התבנית עודכנה' : 'Template updated');
      } else {
        payload.created_by = user.id;
        const { error } = await (supabase as any)
          .from('offer_templates')
          .insert(payload);
        if (error) throw error;
        toast.success(isRTL ? 'התבנית נוצרה' : 'Template created');
      }

      onSuccess();
      handleOpenChange(false);
    } catch (err: any) {
      console.error('Save template error:', err);
      toast.error(isRTL ? 'שגיאה בשמירת התבנית' : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            {isEdit
              ? (isRTL ? 'עריכת תבנית' : 'Edit Template')
              : (isRTL ? 'יצירת תבנית חדשה' : 'Create New Template')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="tpl-name">
              {isRTL ? 'שם התבנית' : 'Template Name'} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="tpl-name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder={isRTL ? 'לדוגמה: מכתב הצעה — מפתח בכיר' : 'e.g. Offer Letter — Senior Developer'}
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label>{isRTL ? 'קטגוריה' : 'Category'}</Label>
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v as OfferCategory }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {isRTL ? cat.he : cat.en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="tpl-desc">
              {isRTL ? 'תיאור קצר' : 'Short Description'}
            </Label>
            <Input
              id="tpl-desc"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder={isRTL ? 'תיאור קצר של מטרת התבנית' : 'Brief description of this template\'s purpose'}
            />
          </div>

          {/* Salary range */}
          <div className="space-y-1.5">
            <Label>{isRTL ? 'טווח שכר' : 'Salary Range'}</Label>
            <div className="flex items-center gap-2">
              <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v as Currency }))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(c => (
                    <SelectItem key={c} value={c}>{c} {CURRENCY_SYMBOLS[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={0}
                value={form.salary_range_min}
                onChange={e => setForm(f => ({ ...f, salary_range_min: e.target.value }))}
                placeholder={isRTL ? 'מינימום' : 'Min'}
                className="flex-1"
              />
              <span className="text-muted-foreground">–</span>
              <Input
                type="number"
                min={0}
                value={form.salary_range_max}
                onChange={e => setForm(f => ({ ...f, salary_range_max: e.target.value }))}
                placeholder={isRTL ? 'מקסימום' : 'Max'}
                className="flex-1"
              />
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{isRTL ? 'הטבות' : 'Benefits'}</Label>
              <Button type="button" variant="outline" size="sm" onClick={addBenefit} className="gap-1 h-7 text-xs">
                <Plus className="w-3 h-3" />
                {isRTL ? 'הוסף הטבה' : 'Add Benefit'}
              </Button>
            </div>
            {form.benefits.length === 0 && (
              <p className="text-xs text-muted-foreground">
                {isRTL ? 'לא נוספו הטבות עדיין' : 'No benefits added yet'}
              </p>
            )}
            <div className="space-y-2">
              {form.benefits.map((benefit, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Select
                    value={benefit.type}
                    onValueChange={v => updateBenefit(idx, 'type', v)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BENEFIT_TYPES.map(bt => (
                        <SelectItem key={bt.value} value={bt.value}>
                          {isRTL ? bt.he : bt.en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={benefit.value}
                    onChange={e => updateBenefit(idx, 'value', e.target.value)}
                    placeholder={isRTL ? 'פרט / ערך' : 'Details / value'}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeBenefit(idx)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Additional terms */}
          <div className="space-y-1.5">
            <Label htmlFor="tpl-terms">
              {isRTL ? 'תנאים נוספים' : 'Additional Terms'}
            </Label>
            <Textarea
              id="tpl-terms"
              value={form.additional_terms}
              onChange={e => setForm(f => ({ ...f, additional_terms: e.target.value }))}
              placeholder={isRTL ? 'תנאים מיוחדים, הגבלות, הערות...' : 'Special conditions, restrictions, notes...'}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Template body */}
          <div className="space-y-1.5">
            <Label htmlFor="tpl-body">
              {isRTL ? 'גוף המסמך / תוכן התבנית' : 'Template Body / Document Content'}
            </Label>
            <Textarea
              id="tpl-body"
              value={form.template_body}
              onChange={e => setForm(f => ({ ...f, template_body: e.target.value }))}
              placeholder={isRTL
                ? 'הזן את תוכן התבנית כאן. ניתן להשתמש בפלייסהולדרים כגון {{candidate_name}}, {{start_date}}, {{salary}}...'
                : 'Enter your template content here. You can use placeholders like {{candidate_name}}, {{start_date}}, {{salary}}...'}
              rows={8}
              className="resize-y font-mono text-sm"
            />
          </div>

          {/* Is default */}
          <div className="flex items-center gap-3">
            <Switch
              id="tpl-default"
              checked={form.is_default}
              onCheckedChange={v => setForm(f => ({ ...f, is_default: v }))}
            />
            <Label htmlFor="tpl-default" className="cursor-pointer">
              {isRTL ? 'הגדר כברירת מחדל לקטגוריה זו' : 'Set as default for this category'}
            </Label>
          </div>
        </div>

        {/* Footer actions */}
        <div className={`flex items-center gap-3 pt-4 border-t ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <CheckCircle2 className="w-4 h-4" />}
            {isEdit
              ? (isRTL ? 'שמור שינויים' : 'Save Changes')
              : (isRTL ? 'צור תבנית' : 'Create Template')}
          </Button>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
            {isRTL ? 'ביטול' : 'Cancel'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Template Card ────────────────────────────────────────────────────────────

interface TemplateCardProps {
  template: OfferTemplate;
  isOwner: boolean;
  isRTL: boolean;
  onEdit: (template: OfferTemplate) => void;
  onDelete: (template: OfferTemplate) => void;
  onUseTemplate?: (template: OfferTemplate) => void;
}

function TemplateCard({ template, isOwner, isRTL, onEdit, onDelete, onUseTemplate }: TemplateCardProps) {
  const cat = getCategoryMeta(template.category);
  const salary = formatSalary(template.salary_range_min, template.salary_range_max, template.currency, isRTL);

  return (
    <Card className="flex flex-col h-full border-border hover:shadow-md transition-shadow">
      <CardContent className="p-5 flex flex-col gap-3 h-full">
        {/* Category badge + default indicator */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`text-xs ${cat.color}`}>
            {isRTL ? cat.he : cat.en}
          </Badge>
          {template.is_default && (
            <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
              {isRTL ? 'ברירת מחדל' : 'Default'}
            </Badge>
          )}
        </div>

        {/* Name + description */}
        <div className="flex-1">
          <h3 className="font-semibold text-base leading-tight mb-1">{template.name}</h3>
          {template.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{template.description}</p>
          )}
        </div>

        {/* Salary */}
        {salary && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <DollarSign className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{salary}</span>
          </div>
        )}

        {/* Benefits */}
        {template.benefits && template.benefits.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {template.benefits.slice(0, 4).map((benefit, idx) => {
              const meta = getBenefitMeta(benefit.type);
              const Icon = meta.icon;
              return (
                <Badge key={idx} variant="outline" className="text-xs gap-1 px-1.5 h-5">
                  <Icon className="w-3 h-3" />
                  {isRTL ? meta.he : meta.en}
                </Badge>
              );
            })}
            {template.benefits.length > 4 && (
              <Badge variant="outline" className="text-xs px-1.5 h-5">
                +{template.benefits.length - 4}
              </Badge>
            )}
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3 mt-auto">
          <div className="flex items-center gap-1.5">
            <BarChart2 className="w-3.5 h-3.5" />
            <span>{isRTL ? `שימושים: ${template.use_count}` : `Used ${template.use_count}x`}</span>
          </div>
          {template.benefits && template.benefits.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Gift className="w-3.5 h-3.5" />
              <span>
                {template.benefits.length}{' '}
                {isRTL ? 'הטבות' : template.benefits.length === 1 ? 'benefit' : 'benefits'}
              </span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {onUseTemplate && (
            <Button
              size="sm"
              className="flex-1 gap-1.5 h-8"
              onClick={() => onUseTemplate(template)}
            >
              <FileText className="w-3.5 h-3.5" />
              {isRTL ? 'השתמש בתבנית' : 'Use Template'}
            </Button>
          )}
          {isOwner && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => onEdit(template)}
                title={isRTL ? 'ערוך' : 'Edit'}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                onClick={() => onDelete(template)}
                title={isRTL ? 'מחק' : 'Delete'}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface OfferTemplatesLibraryProps {
  onUseTemplate?: (template: any) => void;
}

export function OfferTemplatesLibrary({ onUseTemplate }: OfferTemplatesLibraryProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const queryClient = useQueryClient();

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<OfferTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OfferTemplate | null>(null);

  // ── Query ──────────────────────────────────────────────────────────────────

  const { data: templates = [], isLoading } = useQuery<OfferTemplate[]>({
    queryKey: ['offer_templates', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from('offer_templates')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as OfferTemplate[];
    },
    enabled: !!user,
  });

  // ── Delete mutation ────────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('offer_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'התבנית נמחקה' : 'Template deleted');
      queryClient.invalidateQueries({ queryKey: ['offer_templates'] });
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      console.error('Delete template error:', err);
      toast.error(isRTL ? 'שגיאה במחיקת התבנית' : 'Failed to delete template');
    },
  });

  // ── Use template handler (increments use_count) ────────────────────────────

  const handleUseTemplate = async (template: OfferTemplate) => {
    onUseTemplate?.(template);
    // Optimistically update use_count in background
    (supabase as any)
      .from('offer_templates')
      .update({ use_count: template.use_count + 1 })
      .eq('id', template.id)
      .then(() => queryClient.invalidateQueries({ queryKey: ['offer_templates'] }));
  };

  // ── Filtered list ──────────────────────────────────────────────────────────

  const displayed = categoryFilter === 'all'
    ? templates
    : templates.filter(t => t.category === categoryFilter);

  const categoryCounts: Record<string, number> = {};
  templates.forEach(t => {
    categoryCounts[t.category] = (categoryCounts[t.category] ?? 0) + 1;
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold">
              {isRTL ? 'ספריית תבניות הצעות' : 'Offer Templates Library'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isRTL
                ? 'צור ונהל תבניות לחוזים, מכתבי הצעה והסכמים'
                : 'Create and manage templates for contracts, offer letters and agreements'}
            </p>
          </div>
        </div>

        <Button onClick={() => setShowForm(true)} className="gap-2 flex-shrink-0 min-h-[44px]">
          <Plus className="w-4 h-4" />
          {isRTL ? 'תבנית חדשה' : 'Create Template'}
        </Button>
      </div>

      {/* Category filter chips */}
      {!isLoading && templates.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1 rounded-full text-sm border transition-colors min-h-[36px] ${
              categoryFilter === 'all'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
            }`}
          >
            {isRTL ? 'הכל' : 'All'} ({templates.length})
          </button>
          {CATEGORIES.filter(cat => (categoryCounts[cat.value] ?? 0) > 0).map(cat => (
            <button
              key={cat.value}
              onClick={() => setCategoryFilter(cat.value)}
              className={`px-3 py-1 rounded-full text-sm border transition-colors min-h-[36px] ${
                categoryFilter === cat.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
              }`}
            >
              {isRTL ? cat.he : cat.en} ({categoryCounts[cat.value]})
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-muted-foreground">
          <FileText className="w-14 h-14 opacity-20" />
          <div className="text-center space-y-1">
            <p className="text-lg font-medium">
              {categoryFilter !== 'all'
                ? (isRTL ? 'אין תבניות בקטגוריה זו' : 'No templates in this category')
                : (isRTL ? 'אין תבניות עדיין' : 'No templates yet')}
            </p>
            <p className="text-sm max-w-xs">
              {isRTL
                ? 'צור תבניות כדי לחסוך זמן בהכנת חוזים ומכתבי הצעה'
                : 'Create templates to save time preparing contracts and offer letters'}
            </p>
          </div>
          <Button onClick={() => setShowForm(true)} className="gap-2 mt-2 min-h-[44px]">
            <Plus className="w-4 h-4" />
            {isRTL ? 'צור תבנית ראשונה' : 'Create Your First Template'}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              isOwner={template.created_by === user?.id}
              isRTL={isRTL}
              onEdit={t => setEditTarget(t)}
              onDelete={t => setDeleteTarget(t)}
              onUseTemplate={onUseTemplate ? handleUseTemplate : undefined}
            />
          ))}
        </div>
      )}

      {/* Create dialog */}
      <TemplateFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['offer_templates'] })}
        isRTL={isRTL}
      />

      {/* Edit dialog */}
      {editTarget && (
        <TemplateFormDialog
          open={!!editTarget}
          onOpenChange={open => { if (!open) setEditTarget(null); }}
          editTemplate={editTarget}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['offer_templates'] });
            setEditTarget(null);
          }}
          isRTL={isRTL}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent dir={isRTL ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isRTL ? 'מחיקת תבנית' : 'Delete Template'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL
                ? `האם אתה בטוח שברצונך למחוק את "${deleteTarget?.name}"? פעולה זו לא ניתנת לביטול.`
                : `Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              {isRTL ? 'ביטול' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin me-2" />}
              {isRTL ? 'מחק' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
