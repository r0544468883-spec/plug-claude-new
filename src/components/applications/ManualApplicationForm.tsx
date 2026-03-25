import { useState } from 'react';
import { Loader2, Building2, Briefcase, MapPin, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ManualApplicationFormProps {
  onApplicationAdded: () => void;
  onCancel: () => void;
}

const jobTypes = [
  { value: 'Full-time', label: { en: 'Full-time', he: 'משרה מלאה' } },
  { value: 'Part-time', label: { en: 'Part-time', he: 'משרה חלקית' } },
  { value: 'Contract', label: { en: 'Contract', he: 'חוזה' } },
  { value: 'Freelance', label: { en: 'Freelance', he: 'פרילנס' } },
  { value: 'Internship', label: { en: 'Internship', he: 'התמחות' } },
];

export function ManualApplicationForm({ onApplicationAdded, onCancel }: ManualApplicationFormProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'he';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    jobTitle: '',
    location: '',
    jobType: 'Full-time',
    description: '',
    sourceUrl: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error(isRTL ? 'יש להתחבר קודם' : 'Please login first');
      return;
    }

    if (!formData.companyName.trim() || !formData.jobTitle.trim()) {
      toast.error(isRTL ? 'יש למלא שם חברה ותפקיד' : 'Company name and job title are required');
      return;
    }

    try {
      setIsSubmitting(true);

      // Use edge function to bypass RLS
      const { data, error } = await supabase.functions.invoke('scrape-job', {
        body: {
          manual: true,
          user_id: user.id,
          company_name: formData.companyName.trim(),
          job_title: formData.jobTitle.trim(),
          location: formData.location.trim() || null,
          job_type: formData.jobType,
          description: formData.description.trim() || null,
          source_url: formData.sourceUrl.trim() || null,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      toast.success(isRTL ? 'המועמדות נוספה!' : 'Application added!');
      onApplicationAdded();
    } catch (error: any) {
      console.error('Error adding manual application:', error);
      toast.error(isRTL ? 'שגיאה בהוספת המועמדות' : 'Error adding application');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Company Name */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          {isRTL ? 'שם החברה *' : 'Company Name *'}
        </Label>
        <Input
          value={formData.companyName}
          onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
          placeholder={isRTL ? 'לדוגמה: Google' : 'e.g. Google'}
          required
        />
      </div>

      {/* Job Title */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Briefcase className="h-4 w-4" />
          {isRTL ? 'תפקיד *' : 'Job Title *'}
        </Label>
        <Input
          value={formData.jobTitle}
          onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
          placeholder={isRTL ? 'לדוגמה: Software Engineer' : 'e.g. Software Engineer'}
          required
        />
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          {isRTL ? 'מיקום' : 'Location'}
        </Label>
        <Input
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder={isRTL ? 'לדוגמה: תל אביב' : 'e.g. Tel Aviv'}
        />
      </div>

      {/* Job Type */}
      <div className="space-y-2">
        <Label>{isRTL ? 'סוג משרה' : 'Job Type'}</Label>
        <Select
          value={formData.jobType}
          onValueChange={(value) => setFormData({ ...formData, jobType: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {jobTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {isRTL ? type.label.he : type.label.en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {isRTL ? 'תיאור (אופציונלי)' : 'Description (optional)'}
        </Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder={isRTL ? 'הוסף פרטים על המשרה...' : 'Add details about the job...'}
          className="min-h-[80px] resize-none"
        />
      </div>

      {/* Source URL */}
      <div className="space-y-2">
        <Label>{isRTL ? 'לינק למשרה (אופציונלי)' : 'Job URL (optional)'}</Label>
        <Input
          value={formData.sourceUrl}
          onChange={(e) => setFormData({ ...formData, sourceUrl: e.target.value })}
          placeholder="https://..."
          type="url"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            isRTL ? 'הוסף מועמדות' : 'Add Application'
          )}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          {isRTL ? 'ביטול' : 'Cancel'}
        </Button>
      </div>
    </form>
  );
}
