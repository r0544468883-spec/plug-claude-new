import { useRef } from 'react';
import { CVData, Experience, Education, Project, Language } from './types';
import { useLanguage } from '@/contexts/LanguageContext';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, GripVertical, Camera } from 'lucide-react';
import { SkillsSelector } from './SkillsSelector';
import { LanguageSelector } from './LanguageSelector';
import { CVInlineAI } from './CVInlineAI';
import { supabase } from '@/integrations/supabase/client';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface CVEditorPanelProps {
  data: CVData;
  onChange: (data: CVData) => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

// ── Sortable wrappers ─────────────────────────────────────────────────────────

function SortableExperienceItem({
  exp,
  isHe,
  onUpdate,
  onRemove,
}: {
  exp: Experience;
  isHe: boolean;
  onUpdate: (field: keyof Experience, value: unknown) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: exp.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="border rounded-lg p-3 space-y-2 bg-muted/30">
      <div className="flex justify-between items-center">
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted"
          title={isHe ? 'גרור לסידור מחדש' : 'Drag to reorder'}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </span>
        <Button variant="ghost" size="icon" onClick={onRemove}>
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>{isHe ? 'חברה' : 'Company'}</Label>
          <Input value={exp.company} onChange={(e) => onUpdate('company', e.target.value)} />
        </div>
        <div>
          <Label>{isHe ? 'תפקיד' : 'Role'}</Label>
          <CVInlineAI
            value={exp.role}
            onChange={(v) => onUpdate('role', v)}
            fieldName="title"
            placeholder={isHe ? 'תפקיד' : 'Role'}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>{isHe ? 'תאריך התחלה' : 'Start Date'}</Label>
          <Input placeholder="MM/YYYY" value={exp.startDate} onChange={(e) => onUpdate('startDate', e.target.value)} />
        </div>
        <div>
          <Label>{isHe ? 'תאריך סיום' : 'End Date'}</Label>
          <Input placeholder="MM/YYYY" value={exp.endDate || ''} disabled={exp.current} onChange={(e) => onUpdate('endDate', e.target.value)} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={exp.current} onCheckedChange={(v) => onUpdate('current', v)} />
        <Label>{isHe ? 'עובד כאן כעת' : 'Currently working here'}</Label>
      </div>
      <div>
        <Label>{isHe ? 'נקודות (כל שורה = נקודה)' : 'Bullet points (one per line)'}</Label>
        <CVInlineAI
          value={exp.bullets.join('\n')}
          onChange={(v) => onUpdate('bullets', v.split('\n').filter(Boolean))}
          fieldName="bullets"
          isMultiline
          rows={3}
          placeholder={isHe ? 'כתוב כל נקודה בשורה נפרדת' : 'Write each bullet on a new line'}
          showAtsButton
        />
      </div>
    </div>
  );
}

function SortableEducationItem({
  edu,
  isHe,
  onUpdate,
  onRemove,
}: {
  edu: Education;
  isHe: boolean;
  onUpdate: (field: keyof Education, value: string) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: edu.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="border rounded-lg p-3 space-y-2 bg-muted/30">
      <div className="flex justify-between items-center">
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted"
          title={isHe ? 'גרור לסידור מחדש' : 'Drag to reorder'}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </span>
        <Button variant="ghost" size="icon" onClick={onRemove}>
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>
      <div>
        <Label>{isHe ? 'מוסד לימודים' : 'Institution'}</Label>
        <Input value={edu.institution} onChange={(e) => onUpdate('institution', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>{isHe ? 'תואר' : 'Degree'}</Label>
          <Input value={edu.degree} onChange={(e) => onUpdate('degree', e.target.value)} />
        </div>
        <div>
          <Label>{isHe ? 'תחום' : 'Field'}</Label>
          <Input value={edu.field} onChange={(e) => onUpdate('field', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>{isHe ? 'שנת התחלה' : 'Start Year'}</Label>
          <Input value={edu.startDate} onChange={(e) => onUpdate('startDate', e.target.value)} />
        </div>
        <div>
          <Label>{isHe ? 'שנת סיום' : 'End Year'}</Label>
          <Input value={edu.endDate} onChange={(e) => onUpdate('endDate', e.target.value)} />
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export const CVEditorPanel = ({ data, onChange }: CVEditorPanelProps) => {
  const { language } = useLanguage();
  const isHe = language === 'he';
  const photoInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // ── Personal Info ─────────────────────────────────────────────────────────
  const updatePersonalInfo = (field: keyof CVData['personalInfo'], value: string) => {
    onChange({ ...data, personalInfo: { ...data.personalInfo, [field]: value } });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const ext = file.name.split('.').pop();
    const path = `${user.id}/cv-photo.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) return;
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    updatePersonalInfo('photo', publicUrl);
  };

  // ── Experience ────────────────────────────────────────────────────────────
  const addExperience = () => {
    const newExp: Experience = { id: generateId(), company: '', role: '', startDate: '', endDate: null, current: false, bullets: [] };
    onChange({ ...data, experience: [...data.experience, newExp] });
  };

  const updateExperience = (id: string, field: keyof Experience, value: unknown) => {
    onChange({ ...data, experience: data.experience.map((exp) => exp.id === id ? { ...exp, [field]: value } : exp) });
  };

  const removeExperience = (id: string) => {
    onChange({ ...data, experience: data.experience.filter((e) => e.id !== id) });
  };

  const handleExpDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = data.experience.findIndex((e) => e.id === active.id);
    const newIdx = data.experience.findIndex((e) => e.id === over.id);
    onChange({ ...data, experience: arrayMove(data.experience, oldIdx, newIdx) });
  };

  // ── Education ─────────────────────────────────────────────────────────────
  const addEducation = () => {
    const newEdu: Education = { id: generateId(), institution: '', degree: '', field: '', startDate: '', endDate: '' };
    onChange({ ...data, education: [...data.education, newEdu] });
  };

  const updateEducation = (id: string, field: keyof Education, value: string) => {
    onChange({ ...data, education: data.education.map((edu) => edu.id === id ? { ...edu, [field]: value } : edu) });
  };

  const removeEducation = (id: string) => {
    onChange({ ...data, education: data.education.filter((e) => e.id !== id) });
  };

  const handleEduDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = data.education.findIndex((e) => e.id === active.id);
    const newIdx = data.education.findIndex((e) => e.id === over.id);
    onChange({ ...data, education: arrayMove(data.education, oldIdx, newIdx) });
  };

  // ── Skills / Languages ────────────────────────────────────────────────────
  const updateTechnicalSkills = (skills: string[]) =>
    onChange({ ...data, skills: { ...data.skills, technical: skills } });
  const updateSoftSkills = (skills: string[]) =>
    onChange({ ...data, skills: { ...data.skills, soft: skills } });
  const updateLanguages = (languages: Language[]) =>
    onChange({ ...data, skills: { ...data.skills, languages } });

  // ── Projects ──────────────────────────────────────────────────────────────
  const addProject = () => {
    onChange({ ...data, projects: [...data.projects, { id: generateId(), name: '', description: '', url: '' }] });
  };
  const updateProject = (id: string, field: keyof Project, value: string) => {
    onChange({ ...data, projects: data.projects.map((p) => p.id === id ? { ...p, [field]: value } : p) });
  };
  const removeProject = (id: string) => {
    onChange({ ...data, projects: data.projects.filter((p) => p.id !== id) });
  };

  const cvDir = (data.settings.cvLanguage ?? 'en') === 'he' ? 'rtl' : 'ltr';

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4" dir={isHe ? 'rtl' : 'ltr'}>
        <div dir={cvDir}>
        <Accordion type="multiple" defaultValue={['personal', 'experience', 'education', 'skills']} className="space-y-2">

          {/* ── Personal Info ─────────────────────────────────────────────── */}
          <AccordionItem value="personal" className="border rounded-lg px-3">
            <AccordionTrigger className="font-semibold">
              {isHe ? '👤 פרטים אישיים' : '👤 Personal Info'}
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">

              {/* Photo upload */}
              <div className="flex items-center gap-3">
                {data.personalInfo.photo ? (
                  <img
                    src={data.personalInfo.photo}
                    alt="profile"
                    className="w-14 h-14 rounded-full object-cover border-2 border-border"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-border">
                    <Camera className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  <Button variant="outline" size="sm" onClick={() => photoInputRef.current?.click()}>
                    {isHe ? 'העלה תמונה' : 'Upload Photo'}
                  </Button>
                  {data.personalInfo.photo && (
                    <Button variant="ghost" size="sm" className="ms-2 text-destructive" onClick={() => updatePersonalInfo('photo', '')}>
                      {isHe ? 'הסר' : 'Remove'}
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{isHe ? 'שם מלא' : 'Full Name'}</Label>
                  <Input value={data.personalInfo.fullName} onChange={(e) => updatePersonalInfo('fullName', e.target.value)} />
                </div>
                <div>
                  <Label>{isHe ? 'תפקיד' : 'Title'}</Label>
                  <CVInlineAI
                    value={data.personalInfo.title}
                    onChange={(v) => updatePersonalInfo('title', v)}
                    fieldName="title"
                    placeholder={isHe ? 'למשל: מפתח Full Stack' : 'e.g. Full Stack Developer'}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{isHe ? 'אימייל' : 'Email'}</Label>
                  <Input type="email" value={data.personalInfo.email} onChange={(e) => updatePersonalInfo('email', e.target.value)} />
                </div>
                <div>
                  <Label>{isHe ? 'טלפון' : 'Phone'}</Label>
                  <Input value={data.personalInfo.phone} onChange={(e) => updatePersonalInfo('phone', e.target.value)} />
                </div>
              </div>
              <div>
                <Label>{isHe ? 'מיקום' : 'Location'}</Label>
                <Input value={data.personalInfo.location} onChange={(e) => updatePersonalInfo('location', e.target.value)} />
              </div>
              <div>
                <Label>{isHe ? 'תקציר מקצועי' : 'Professional Summary'}</Label>
                <CVInlineAI
                  value={data.personalInfo.summary}
                  onChange={(v) => updatePersonalInfo('summary', v)}
                  fieldName="summary"
                  isMultiline
                  rows={3}
                  placeholder={isHe ? 'תקציר מקצועי קצר...' : 'Brief professional summary...'}
                  showAtsButton
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* ── Experience ────────────────────────────────────────────────── */}
          <AccordionItem value="experience" className="border rounded-lg px-3">
            <AccordionTrigger className="font-semibold">
              {isHe ? '💼 ניסיון תעסוקתי' : '💼 Experience'}
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleExpDragEnd}>
                <SortableContext items={data.experience.map((e) => e.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {data.experience.map((exp) => (
                      <SortableExperienceItem
                        key={exp.id}
                        exp={exp}
                        isHe={isHe}
                        onUpdate={(field, value) => updateExperience(exp.id, field, value)}
                        onRemove={() => removeExperience(exp.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              <Button variant="outline" className="w-full" onClick={addExperience}>
                <Plus className="w-4 h-4 mr-2" />
                {isHe ? 'הוסף ניסיון' : 'Add Experience'}
              </Button>
            </AccordionContent>
          </AccordionItem>

          {/* ── Education ─────────────────────────────────────────────────── */}
          <AccordionItem value="education" className="border rounded-lg px-3">
            <AccordionTrigger className="font-semibold">
              {isHe ? '🎓 השכלה' : '🎓 Education'}
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleEduDragEnd}>
                <SortableContext items={data.education.map((e) => e.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {data.education.map((edu) => (
                      <SortableEducationItem
                        key={edu.id}
                        edu={edu}
                        isHe={isHe}
                        onUpdate={(field, value) => updateEducation(edu.id, field, value)}
                        onRemove={() => removeEducation(edu.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              <Button variant="outline" className="w-full" onClick={addEducation}>
                <Plus className="w-4 h-4 mr-2" />
                {isHe ? 'הוסף השכלה' : 'Add Education'}
              </Button>
            </AccordionContent>
          </AccordionItem>

          {/* ── Skills ────────────────────────────────────────────────────── */}
          <AccordionItem value="skills" className="border rounded-lg px-3">
            <AccordionTrigger className="font-semibold">
              {isHe ? '🛠️ כישורים' : '🛠️ Skills'}
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <SkillsSelector
                technicalSkills={data.skills.technical}
                softSkills={data.skills.soft}
                onTechnicalChange={updateTechnicalSkills}
                onSoftChange={updateSoftSkills}
              />
            </AccordionContent>
          </AccordionItem>

          {/* ── Languages ─────────────────────────────────────────────────── */}
          <AccordionItem value="languages" className="border rounded-lg px-3">
            <AccordionTrigger className="font-semibold">
              {isHe ? '🌍 שפות' : '🌍 Languages'}
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <LanguageSelector languages={data.skills.languages} onChange={updateLanguages} />
            </AccordionContent>
          </AccordionItem>

          {/* ── Projects ──────────────────────────────────────────────────── */}
          <AccordionItem value="projects" className="border rounded-lg px-3">
            <AccordionTrigger className="font-semibold">
              {isHe ? '🚀 פרויקטים' : '🚀 Projects'}
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              {data.projects.map((proj) => (
                <div key={proj.id} className="border rounded-lg p-3 space-y-2 bg-muted/30">
                  <div className="flex justify-end">
                    <Button variant="ghost" size="icon" onClick={() => removeProject(proj.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                  <Input
                    placeholder={isHe ? 'שם הפרויקט' : 'Project Name'}
                    value={proj.name}
                    onChange={(e) => updateProject(proj.id, 'name', e.target.value)}
                  />
                  <Input
                    placeholder="URL"
                    value={proj.url || ''}
                    onChange={(e) => updateProject(proj.id, 'url', e.target.value)}
                  />
                  <CVInlineAI
                    value={proj.description}
                    onChange={(v) => updateProject(proj.id, 'description', v)}
                    fieldName="description"
                    isMultiline
                    rows={2}
                    placeholder={isHe ? 'תיאור' : 'Description'}
                  />
                </div>
              ))}
              <Button variant="outline" className="w-full" onClick={addProject}>
                <Plus className="w-4 h-4 mr-2" />
                {isHe ? 'הוסף פרויקט' : 'Add Project'}
              </Button>
            </AccordionContent>
          </AccordionItem>

        </Accordion>
        </div>
      </div>
    </ScrollArea>
  );
};
