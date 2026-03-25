import { useState } from 'react';
import { Loader2, Building2, Briefcase, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';

interface PartialJobData {
  company_name?: string;
  job_title?: string;
  location?: string;
  job_type?: string;
  description?: string;
  source_url?: string;
}

interface PartialJobCompleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partialData: PartialJobData;
  missingFields: string[];
  onComplete: (completedData: PartialJobData) => void;
  isSubmitting: boolean;
}

export function PartialJobCompleteDialog({
  open,
  onOpenChange,
  partialData,
  missingFields,
  onComplete,
  isSubmitting,
}: PartialJobCompleteDialogProps) {
  const { language } = useLanguage();
  const isRTL = language === 'he';

  const [formData, setFormData] = useState<PartialJobData>({
    company_name: partialData.company_name || '',
    job_title: partialData.job_title || '',
    location: partialData.location || '',
    job_type: partialData.job_type || '',
    description: partialData.description || '',
    source_url: partialData.source_url || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete(formData);
  };

  const needsCompanyName = missingFields.includes('company_name');
  const needsJobTitle = missingFields.includes('job_title');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            {isRTL ? 'נדרשת השלמת פרטים' : 'Details Required'}
          </DialogTitle>
          <DialogDescription>
            {isRTL
              ? 'לא הצלחנו לחלץ את כל הפרטים מהקישור. אנא השלם את השדות החסרים:'
              : "We couldn't extract all details from the link. Please complete the missing fields:"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Company Name */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {isRTL ? 'שם החברה' : 'Company Name'}
              {needsCompanyName && <span className="text-destructive">*</span>}
            </Label>
            <Input
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              placeholder={isRTL ? 'לדוגמה: Google' : 'e.g. Google'}
              required={needsCompanyName}
              className={needsCompanyName ? 'border-warning focus:border-warning' : ''}
            />
          </div>

          {/* Job Title */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              {isRTL ? 'תפקיד' : 'Job Title'}
              {needsJobTitle && <span className="text-destructive">*</span>}
            </Label>
            <Input
              value={formData.job_title}
              onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
              placeholder={isRTL ? 'לדוגמה: Software Engineer' : 'e.g. Software Engineer'}
              required={needsJobTitle}
              className={needsJobTitle ? 'border-warning focus:border-warning' : ''}
            />
          </div>

          {/* Show extracted info that was found */}
          {partialData.location && (
            <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
              <span className="font-medium">{isRTL ? 'מיקום:' : 'Location:'}</span> {partialData.location}
            </div>
          )}
          {partialData.job_type && (
            <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
              <span className="font-medium">{isRTL ? 'סוג משרה:' : 'Job Type:'}</span> {partialData.job_type}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                isRTL ? 'הוסף מועמדות' : 'Add Application'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {isRTL ? 'ביטול' : 'Cancel'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
