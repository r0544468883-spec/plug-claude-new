import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Layers } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { JOB_FIELDS, getRolesByField } from '@/lib/job-taxonomy';

interface EditJobFieldFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  currentFieldId: string | null;
  currentRoleId: string | null;
  onSuccess?: () => void;
}

export function EditJobFieldForm({ 
  open, 
  onOpenChange, 
  jobId, 
  currentFieldId,
  currentRoleId,
  onSuccess 
}: EditJobFieldFormProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  
  const [selectedFieldSlug, setSelectedFieldSlug] = useState('');
  const [selectedRoleSlug, setSelectedRoleSlug] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Get available roles based on selected field
  const availableRoles = useMemo(() => {
    if (!selectedFieldSlug) return [];
    return getRolesByField(selectedFieldSlug);
  }, [selectedFieldSlug]);

  // Get the field and role objects
  const selectedField = JOB_FIELDS.find(f => f.slug === selectedFieldSlug);
  const selectedRole = availableRoles.find(r => r.slug === selectedRoleSlug);

  const handleSubmit = async () => {
    if (!selectedField) {
      toast.error(isHebrew ? 'נא לבחור תחום' : 'Please select a field');
      return;
    }

    setIsLoading(true);
    
    try {
      // First, get or create the field_id and role_id from the database
      const { data: fieldData, error: fieldError } = await supabase
        .from('job_fields')
        .select('id')
        .eq('slug', selectedFieldSlug)
        .maybeSingle();

      let fieldId = fieldData?.id;

      // If field doesn't exist in DB, create it
      if (!fieldId) {
        const { data: newField, error: createFieldError } = await supabase
          .from('job_fields')
          .insert({
            name_en: selectedField.name_en,
            name_he: selectedField.name_he,
            slug: selectedField.slug,
            icon: selectedField.icon,
          })
          .select('id')
          .single();
        
        if (createFieldError) throw createFieldError;
        fieldId = newField?.id;
      }

      let roleId = null;
      if (selectedRole) {
        const { data: roleData } = await supabase
          .from('job_roles')
          .select('id')
          .eq('slug', selectedRoleSlug)
          .maybeSingle();

        roleId = roleData?.id;

        if (!roleId && fieldId) {
          const { data: newRole } = await supabase
            .from('job_roles')
            .insert({
              name_en: selectedRole.name_en,
              name_he: selectedRole.name_he,
              slug: selectedRole.slug,
              field_id: fieldId,
            })
            .select('id')
            .single();
          roleId = newRole?.id;
        }
      }

      // Update the job with new field and role
      const { error: updateError } = await supabase
        .from('jobs')
        .update({
          field_id: fieldId,
          role_id: roleId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      if (updateError) throw updateError;

      toast.success(isHebrew ? 'התחום עודכן בהצלחה!' : 'Field updated successfully!');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating job field:', error);
      toast.error(isHebrew ? 'שגיאה בעדכון התחום' : 'Failed to update field');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir={isHebrew ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            {isHebrew ? 'עריכת תחום משרה' : 'Edit Job Field'}
          </DialogTitle>
          <DialogDescription>
            {isHebrew 
              ? 'ניתן לשנות רק את תחום ותפקיד המשרה. שאר הפרטים אינם ניתנים לעריכה.'
              : 'You can only change the job field and role. Other details cannot be edited.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Field Selection */}
          <div className="space-y-2">
            <Label>{isHebrew ? 'תחום עבודה' : 'Job Field'}</Label>
            <Select 
              value={selectedFieldSlug} 
              onValueChange={(v) => {
                setSelectedFieldSlug(v);
                setSelectedRoleSlug('');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={isHebrew ? 'בחר תחום' : 'Select field'} />
              </SelectTrigger>
              <SelectContent>
                {JOB_FIELDS.map((field) => (
                  <SelectItem key={field.slug} value={field.slug}>
                    {isHebrew ? field.name_he : field.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label>{isHebrew ? 'תפקיד' : 'Role'}</Label>
            <Select 
              value={selectedRoleSlug} 
              onValueChange={setSelectedRoleSlug}
              disabled={!selectedFieldSlug || availableRoles.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={isHebrew ? 'בחר תפקיד' : 'Select role'} />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => (
                  <SelectItem key={role.slug} value={role.slug}>
                    {isHebrew ? role.name_he : role.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isHebrew ? 'ביטול' : 'Cancel'}
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !selectedFieldSlug}>
            {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {isHebrew ? 'שמור שינויים' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
