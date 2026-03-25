import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { LANGUAGES, LANGUAGE_LEVELS, LanguageOption } from '@/lib/cv-skills-taxonomy';
import { Language } from './types';

interface LanguageSelectorProps {
  languages: Language[];
  onChange: (languages: Language[]) => void;
}

export const LanguageSelector = ({ languages, onChange }: LanguageSelectorProps) => {
  const { language: uiLang } = useLanguage();
  const isHe = uiLang === 'he';
  
  const [selectedNewLang, setSelectedNewLang] = useState<string>('');

  const addLanguage = (langName: string) => {
    if (!langName || languages.some(l => l.name === langName)) return;
    
    onChange([...languages, { name: langName, level: 'intermediate' }]);
    setSelectedNewLang('');
  };

  const updateLanguageLevel = (index: number, level: Language['level']) => {
    const updated = [...languages];
    updated[index] = { ...updated[index], level };
    onChange(updated);
  };

  const removeLanguage = (index: number) => {
    onChange(languages.filter((_, i) => i !== index));
  };

  // Get available languages (not already selected)
  const availableLanguages = LANGUAGES.filter(
    lang => !languages.some(l => l.name === lang.nameEn || l.name === lang.name)
  );

  const getLevelLabel = (level: Language['level']) => {
    const levelOption = LANGUAGE_LEVELS.find(l => l.value === level);
    return isHe ? levelOption?.labelHe : levelOption?.labelEn;
  };

  const getLevelBadgeColor = (level: Language['level']) => {
    switch (level) {
      case 'native': return 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30';
      case 'fluent': return 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30';
      case 'advanced': return 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30';
      case 'intermediate': return 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30';
      case 'basic': return 'bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30';
      default: return '';
    }
  };

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">
        {isHe ? '🌍 שפות' : '🌍 Languages'}
        <span className="text-muted-foreground text-xs mr-2">
          ({languages.length} {isHe ? 'נבחרו' : 'selected'})
        </span>
      </Label>

      {/* Selected Languages */}
      <div className="space-y-2">
        {languages.map((lang, idx) => (
          <div 
            key={idx} 
            className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg border"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
            
            <div className="flex-1 font-medium text-sm">
              {lang.name}
            </div>
            
            <Select 
              value={lang.level} 
              onValueChange={(value) => updateLanguageLevel(idx, value as Language['level'])}
            >
              <SelectTrigger className="w-[140px] h-8 text-sm">
                <SelectValue>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getLevelBadgeColor(lang.level)}`}
                  >
                    {getLevelLabel(lang.level)}
                  </Badge>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_LEVELS.map(level => (
                  <SelectItem key={level.value} value={level.value}>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getLevelBadgeColor(level.value as Language['level'])}`}
                    >
                      {isHe ? level.labelHe : level.labelEn}
                    </Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => removeLanguage(idx)}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      {/* Quick Add Popular Languages */}
      {availableLanguages.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            {isHe ? 'הוסף שפה:' : 'Add language:'}
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {availableLanguages.slice(0, 8).map(lang => (
              <Badge
                key={lang.code}
                variant="outline"
                className="cursor-pointer text-xs hover:bg-primary/20 transition-colors"
                onClick={() => addLanguage(lang.nameEn)}
              >
                <Plus className="w-3 h-3 mr-1" />
                {isHe ? lang.name : lang.nameEn}
              </Badge>
            ))}
          </div>
          
          {/* Dropdown for all languages */}
          {availableLanguages.length > 8 && (
            <Select value={selectedNewLang} onValueChange={addLanguage}>
              <SelectTrigger className="w-full h-9 text-sm">
                <SelectValue placeholder={isHe ? 'עוד שפות...' : 'More languages...'} />
              </SelectTrigger>
              <SelectContent>
                {availableLanguages.map(lang => (
                  <SelectItem key={lang.code} value={lang.nameEn}>
                    {lang.name} ({lang.nameEn})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {languages.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          {isHe ? 'לחץ על שפה להוספה' : 'Click a language to add it'}
        </p>
      )}
    </div>
  );
};
