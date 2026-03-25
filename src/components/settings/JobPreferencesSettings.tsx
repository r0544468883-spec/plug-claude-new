import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Briefcase, Loader2, Save, X, Target, GraduationCap, Layers, Wrench, MapPin } from 'lucide-react';
import {
  JOB_FIELDS,
  EXPERIENCE_LEVELS,
  getRolesByField,
  getFieldBySlug,
  getRoleBySlug,
  getExperienceLevelBySlug
} from '@/lib/job-taxonomy';

export function JobPreferencesSettings() {
  const { user, profile } = useAuth();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const isHebrew = language === 'he';

  // State for preferences
  const [preferredFields, setPreferredFields] = useState<string[]>([]);
  const [preferredRoles, setPreferredRoles] = useState<string[]>([]);
  const [experienceYears, setExperienceYears] = useState<number | ''>('');
  const [preferredExperienceLevel, setPreferredExperienceLevel] = useState<string>('');
  const [skills, setSkills] = useState<string[]>([]);
  const [targetLocations, setTargetLocations] = useState<string[]>([]);

  // Temporary state for selection
  const [selectedField, setSelectedField] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [skillInput, setSkillInput] = useState('');
  const [locationInput, setLocationInput] = useState('');

  // Get available roles based on preferred fields
  const availableRoles = useMemo(() => {
    if (preferredFields.length === 0) return [];
    return preferredFields.flatMap(fieldSlug => getRolesByField(fieldSlug));
  }, [preferredFields]);

  // Load profile data
  useEffect(() => {
    if (profile) {
      setPreferredFields((profile as any)?.preferred_fields || []);
      setPreferredRoles((profile as any)?.preferred_roles || []);
      setExperienceYears((profile as any)?.experience_years || '');
      setSkills((profile as any)?.skills || []);
      setTargetLocations((profile as any)?.target_locations || []);
      
      // Get experience level slug from ID
      const expLevelId = (profile as any)?.preferred_experience_level_id;
      if (expLevelId) {
        // We need to fetch the slug from DB
        supabase
          .from('experience_levels')
          .select('slug')
          .eq('id', expLevelId)
          .single()
          .then(({ data }) => {
            if (data) setPreferredExperienceLevel(data.slug);
          });
      }
    }
  }, [profile]);

  // Add field to preferred fields
  const handleAddField = () => {
    if (selectedField && !preferredFields.includes(selectedField)) {
      if (preferredFields.length >= 5) {
        toast.error(isHebrew ? 'ניתן לבחור עד 5 תחומים' : 'You can select up to 5 fields');
        return;
      }
      setPreferredFields([...preferredFields, selectedField]);
      setSelectedField('');
    }
  };

  // Remove field
  const handleRemoveField = (fieldSlug: string) => {
    setPreferredFields(preferredFields.filter(f => f !== fieldSlug));
    // Also remove roles from this field
    const fieldRoles = getRolesByField(fieldSlug).map(r => r.slug);
    setPreferredRoles(preferredRoles.filter(r => !fieldRoles.includes(r)));
  };

  // Add role to preferred roles
  const handleAddRole = () => {
    if (selectedRole && !preferredRoles.includes(selectedRole)) {
      if (preferredRoles.length >= 10) {
        toast.error(isHebrew ? 'ניתן לבחור עד 10 תפקידים' : 'You can select up to 10 roles');
        return;
      }
      setPreferredRoles([...preferredRoles, selectedRole]);
      setSelectedRole('');
    }
  };

  // Remove role
  const handleRemoveRole = (roleSlug: string) => {
    setPreferredRoles(preferredRoles.filter(r => r !== roleSlug));
  };

  // Skills handlers
  const handleAddSkill = () => {
    const val = skillInput.trim();
    if (val && !skills.includes(val)) setSkills([...skills, val]);
    setSkillInput('');
  };
  const handleRemoveSkill = (s: string) => setSkills(skills.filter(x => x !== s));

  // Target locations handlers
  const handleAddLocation = () => {
    const val = locationInput.trim();
    if (val && !targetLocations.includes(val)) setTargetLocations([...targetLocations, val]);
    setLocationInput('');
  };
  const handleRemoveLocation = (l: string) => setTargetLocations(targetLocations.filter(x => x !== l));

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      // Get experience level ID from slug
      let experienceLevelId = null;
      if (preferredExperienceLevel) {
        const { data: expLevel } = await supabase
          .from('experience_levels')
          .select('id')
          .eq('slug', preferredExperienceLevel)
          .single();
        if (expLevel) experienceLevelId = expLevel.id;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          preferred_fields: preferredFields,
          preferred_roles: preferredRoles,
          experience_years: experienceYears === '' ? null : experienceYears,
          preferred_experience_level_id: experienceLevelId,
          skills,
          target_locations: targetLocations,
        } as any)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isHebrew ? 'העדפות הקריירה נשמרו!' : 'Career preferences saved!');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: () => {
      toast.error(isHebrew ? 'שגיאה בשמירת ההעדפות' : 'Failed to save preferences');
    },
  });

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          {isHebrew ? 'העדפות קריירה' : 'Career Preferences'}
        </CardTitle>
        <CardDescription>
          {isHebrew 
            ? 'הגדר את התחומים והתפקידים שמעניינים אותך לשיפור התאמת המשרות' 
            : 'Set your preferred fields and roles to improve job matching'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preferred Fields */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            {isHebrew ? 'תחומי עבודה מועדפים (עד 5)' : 'Preferred Job Fields (up to 5)'}
          </Label>
          
          {/* Selected Fields */}
          {preferredFields.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {preferredFields.map(fieldSlug => {
                const field = getFieldBySlug(fieldSlug);
                return (
                  <Badge key={fieldSlug} variant="secondary" className="gap-1 py-1">
                    {field?.icon && <span>{field.icon}</span>}
                    {isHebrew ? field?.name_he : field?.name_en}
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-destructive"
                      onClick={() => handleRemoveField(fieldSlug)}
                    />
                  </Badge>
                );
              })}
            </div>
          )}

          {/* Add Field */}
          {preferredFields.length < 5 && (
            <div className="flex gap-2">
              <Select value={selectedField} onValueChange={setSelectedField}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={isHebrew ? 'בחר תחום...' : 'Select field...'} />
                </SelectTrigger>
                <SelectContent>
                  {JOB_FIELDS
                    .filter(f => !preferredFields.includes(f.slug))
                    .map(field => (
                      <SelectItem key={field.slug} value={field.slug}>
                        {field.icon} {isHebrew ? field.name_he : field.name_en}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleAddField}
                disabled={!selectedField}
              >
                {isHebrew ? 'הוסף' : 'Add'}
              </Button>
            </div>
          )}
        </div>

        {/* Preferred Roles */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            {isHebrew ? 'תפקידים מועדפים (עד 10)' : 'Preferred Roles (up to 10)'}
          </Label>
          
          {/* Selected Roles */}
          {preferredRoles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {preferredRoles.map(roleSlug => {
                const role = getRoleBySlug(roleSlug);
                return (
                  <Badge key={roleSlug} variant="outline" className="gap-1 py-1">
                    {isHebrew ? role?.name_he : role?.name_en}
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-destructive"
                      onClick={() => handleRemoveRole(roleSlug)}
                    />
                  </Badge>
                );
              })}
            </div>
          )}

          {/* Add Role (only if fields are selected) */}
          {preferredFields.length > 0 && preferredRoles.length < 10 && (
            <div className="flex gap-2">
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={isHebrew ? 'בחר תפקיד...' : 'Select role...'} />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles
                    .filter(r => !preferredRoles.includes(r.slug))
                    .map(role => (
                      <SelectItem key={role.slug} value={role.slug}>
                        {isHebrew ? role.name_he : role.name_en}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleAddRole}
                disabled={!selectedRole}
              >
                {isHebrew ? 'הוסף' : 'Add'}
              </Button>
            </div>
          )}

          {preferredFields.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {isHebrew 
                ? 'בחר תחומי עבודה קודם כדי לראות תפקידים זמינים' 
                : 'Select job fields first to see available roles'}
            </p>
          )}
        </div>

        {/* Experience */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              {isHebrew ? 'שנות ניסיון' : 'Years of Experience'}
            </Label>
            <Input
              type="number"
              min={0}
              max={50}
              value={experienceYears}
              onChange={(e) => setExperienceYears(e.target.value ? parseInt(e.target.value) : '')}
              placeholder={isHebrew ? 'מספר שנים' : 'Number of years'}
            />
          </div>

          <div className="space-y-2">
            <Label>{isHebrew ? 'רמת ותק מועדפת' : 'Preferred Experience Level'}</Label>
            <Select value={preferredExperienceLevel || 'none'} onValueChange={(v) => setPreferredExperienceLevel(v === 'none' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder={isHebrew ? 'בחר רמה' : 'Select level'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{isHebrew ? 'לא נבחר' : 'Not selected'}</SelectItem>
                {EXPERIENCE_LEVELS.map(level => (
                  <SelectItem key={level.slug} value={level.slug}>
                    {isHebrew ? level.name_he : level.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Skills */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            {isHebrew ? 'כישורים (לשימוש ה-Agent)' : 'Skills (used by Agent)'}
          </Label>
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {skills.map(s => (
                <Badge key={s} variant="secondary" className="gap-1 py-1">
                  {s}
                  <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => handleRemoveSkill(s)} />
                </Badge>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={skillInput}
              onChange={e => setSkillInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddSkill()}
              placeholder={isHebrew ? 'למשל: React, Python...' : 'e.g. React, Python...'}
            />
            <Button type="button" variant="outline" onClick={handleAddSkill} disabled={!skillInput.trim()}>
              {isHebrew ? 'הוסף' : 'Add'}
            </Button>
          </div>
        </div>

        {/* Target Locations */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            {isHebrew ? 'מיקומים מועדפים (לשימוש ה-Agent)' : 'Preferred Locations (used by Agent)'}
          </Label>
          {targetLocations.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {targetLocations.map(l => (
                <Badge key={l} variant="outline" className="gap-1 py-1">
                  {l}
                  <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => handleRemoveLocation(l)} />
                </Badge>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={locationInput}
              onChange={e => setLocationInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddLocation()}
              placeholder={isHebrew ? 'למשל: תל אביב, Remote...' : 'e.g. Tel Aviv, Remote...'}
            />
            <Button type="button" variant="outline" onClick={handleAddLocation} disabled={!locationInput.trim()}>
              {isHebrew ? 'הוסף' : 'Add'}
            </Button>
          </div>
        </div>

        <Button
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending}
          className="gap-2"
        >
          {updateMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isHebrew ? 'שמור העדפות קריירה' : 'Save Career Preferences'}
        </Button>
      </CardContent>
    </Card>
  );
}
