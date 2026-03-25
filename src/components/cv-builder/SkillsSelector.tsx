import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, X, ChevronDown, ChevronRight } from 'lucide-react';
import { 
  TECHNICAL_SKILLS, 
  SOFT_SKILLS, 
  SOFT_SKILLS_HE, 
  TECHNICAL_CATEGORIES_HE 
} from '@/lib/cv-skills-taxonomy';

interface SkillsSelectorProps {
  technicalSkills: string[];
  softSkills: string[];
  onTechnicalChange: (skills: string[]) => void;
  onSoftChange: (skills: string[]) => void;
}

export const SkillsSelector = ({
  technicalSkills,
  softSkills,
  onTechnicalChange,
  onSoftChange,
}: SkillsSelectorProps) => {
  const { language } = useLanguage();
  const isHe = language === 'he';
  
  const [customTechnical, setCustomTechnical] = useState('');
  const [customSoft, setCustomSoft] = useState('');
  const [openCategories, setOpenCategories] = useState<string[]>(['programming', 'frontend']);

  const toggleTechnicalSkill = (skill: string) => {
    if (technicalSkills.includes(skill)) {
      onTechnicalChange(technicalSkills.filter(s => s !== skill));
    } else {
      onTechnicalChange([...technicalSkills, skill]);
    }
  };

  const toggleSoftSkill = (skill: string) => {
    if (softSkills.includes(skill)) {
      onSoftChange(softSkills.filter(s => s !== skill));
    } else {
      onSoftChange([...softSkills, skill]);
    }
  };

  const addCustomTechnical = () => {
    if (customTechnical.trim() && !technicalSkills.includes(customTechnical.trim())) {
      onTechnicalChange([...technicalSkills, customTechnical.trim()]);
      setCustomTechnical('');
    }
  };

  const addCustomSoft = () => {
    if (customSoft.trim() && !softSkills.includes(customSoft.trim())) {
      onSoftChange([...softSkills, customSoft.trim()]);
      setCustomSoft('');
    }
  };

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  return (
    <div className="space-y-6">
      {/* Technical Skills */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          {isHe ? '💻 כישורים טכניים' : '💻 Technical Skills'}
          <span className="text-muted-foreground text-xs mr-2">
            ({technicalSkills.length} {isHe ? 'נבחרו' : 'selected'})
          </span>
        </Label>
        
        {/* Selected Skills */}
        {technicalSkills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 p-2 bg-primary/5 rounded-lg border border-primary/20">
            {technicalSkills.map(skill => (
              <Badge 
                key={skill} 
                variant="default"
                className="cursor-pointer gap-1 text-xs"
                onClick={() => toggleTechnicalSkill(skill)}
              >
                {skill}
                <X className="w-3 h-3" />
              </Badge>
            ))}
          </div>
        )}
        
        {/* Categories */}
        <div className="space-y-1">
          {Object.entries(TECHNICAL_SKILLS).map(([category, skills]) => (
            <Collapsible 
              key={category} 
              open={openCategories.includes(category)}
              onOpenChange={() => toggleCategory(category)}
            >
              <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 hover:bg-muted/50 rounded text-sm">
                {openCategories.includes(category) ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <span className="font-medium">
                  {isHe ? TECHNICAL_CATEGORIES_HE[category] : category.charAt(0).toUpperCase() + category.slice(1)}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({skills.filter(s => technicalSkills.includes(s)).length}/{skills.length})
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="flex flex-wrap gap-1.5 p-2 mr-6">
                  {skills.map(skill => (
                    <Badge
                      key={skill}
                      variant={technicalSkills.includes(skill) ? 'default' : 'outline'}
                      className="cursor-pointer text-xs hover:bg-primary/20 transition-colors"
                      onClick={() => toggleTechnicalSkill(skill)}
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
        
        {/* Custom Skill Input */}
        <div className="flex gap-2">
          <Input
            placeholder={isHe ? 'הוסף מיומנות...' : 'Add custom skill...'}
            value={customTechnical}
            onChange={(e) => setCustomTechnical(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustomTechnical()}
            className="flex-1 text-sm"
          />
          <Button type="button" size="sm" variant="outline" onClick={addCustomTechnical}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Soft Skills */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          {isHe ? '🤝 כישורים רכים' : '🤝 Soft Skills'}
          <span className="text-muted-foreground text-xs mr-2">
            ({softSkills.length} {isHe ? 'נבחרו' : 'selected'})
          </span>
        </Label>
        
        {/* Selected Soft Skills */}
        {softSkills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 p-2 bg-accent/10 rounded-lg border border-accent/20">
            {softSkills.map(skill => (
              <Badge 
                key={skill} 
                className="cursor-pointer gap-1 text-xs bg-accent text-accent-foreground hover:bg-accent/80"
                onClick={() => toggleSoftSkill(skill)}
              >
                {isHe && SOFT_SKILLS_HE[skill] ? SOFT_SKILLS_HE[skill] : skill}
                <X className="w-3 h-3" />
              </Badge>
            ))}
          </div>
        )}
        
        {/* All Soft Skills */}
        <div className="flex flex-wrap gap-1.5 p-2 border rounded-lg">
          {SOFT_SKILLS.map(skill => (
            <Badge
              key={skill}
              variant={softSkills.includes(skill) ? 'default' : 'outline'}
              className={`cursor-pointer text-xs transition-colors ${
                softSkills.includes(skill) 
                  ? 'bg-accent text-accent-foreground' 
                  : 'hover:bg-accent/20'
              }`}
              onClick={() => toggleSoftSkill(skill)}
            >
              {isHe && SOFT_SKILLS_HE[skill] ? SOFT_SKILLS_HE[skill] : skill}
            </Badge>
          ))}
        </div>
        
        {/* Custom Soft Skill Input */}
        <div className="flex gap-2">
          <Input
            placeholder={isHe ? 'הוסף כישור...' : 'Add custom skill...'}
            value={customSoft}
            onChange={(e) => setCustomSoft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustomSoft()}
            className="flex-1 text-sm"
          />
          <Button type="button" size="sm" variant="outline" onClick={addCustomSoft}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
