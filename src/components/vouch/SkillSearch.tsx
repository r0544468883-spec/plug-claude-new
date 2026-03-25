import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/contexts/CreditsContext';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, X, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MasterSkill {
  id: string;
  name_en: string;
  name_he: string;
  category_en: string;
  category_he: string;
  skill_type: 'hard' | 'soft';
  is_custom: boolean;
}

interface SkillSearchProps {
  selectedSkills: MasterSkill[];
  onSkillsChange: (skills: MasterSkill[]) => void;
  maxSkills?: number;
}

export function SkillSearch({ selectedSkills, onSkillsChange, maxSkills = 10 }: SkillSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [skillTypeFilter, setSkillTypeFilter] = useState<'all' | 'hard' | 'soft'>('all');
  const { language, direction } = useLanguage();
  const { user } = useAuth();
  const { awardCredits } = useCredits();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isHebrew = language === 'he';
  const isRTL = direction === 'rtl';

  // Fetch all skills
  const { data: allSkills = [], isLoading } = useQuery({
    queryKey: ['master-skills'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('master_skills')
        .select('*')
        .order('category_en', { ascending: true })
        .order('name_en', { ascending: true });
      
      if (error) throw error;
      return data as MasterSkill[];
    },
  });

  // Add new custom skill mutation
  const addCustomSkillMutation = useMutation({
    mutationFn: async (skillName: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('master_skills')
        .insert({
          name_en: skillName,
          name_he: skillName, // User can add in either language
          category_en: 'Custom',
          category_he: 'מותאם אישית',
          skill_type: 'hard',
          is_custom: true,
          created_by: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as MasterSkill;
    },
    onSuccess: async (newSkill) => {
      queryClient.invalidateQueries({ queryKey: ['master-skills'] });
      
      // Award credits for adding a new skill
      await awardCredits('skill_added');
      
      // Auto-select the new skill
      if (selectedSkills.length < maxSkills) {
        onSkillsChange([...selectedSkills, newSkill]);
      }
      
      toast({
        title: isHebrew ? 'מיומנות נוספה!' : 'Skill Added!',
        description: isHebrew 
          ? `"${newSkill.name_en}" נוספה למאגר הגלובלי. קיבלת +10 קרדיטים!`
          : `"${newSkill.name_en}" added to the global database. You earned +10 credits!`,
      });
      
      setSearchQuery('');
    },
    onError: (error: Error) => {
      toast({
        title: isHebrew ? 'שגיאה' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Fuzzy search on both English and Hebrew names
  const filteredSkills = useMemo(() => {
    let skills = allSkills;
    
    // Filter by type
    if (skillTypeFilter !== 'all') {
      skills = skills.filter(s => s.skill_type === skillTypeFilter);
    }
    
    // Filter by search query (fuzzy on both languages)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      skills = skills.filter(s => 
        s.name_en.toLowerCase().includes(query) ||
        s.name_he.includes(searchQuery) ||
        s.category_en.toLowerCase().includes(query) ||
        s.category_he.includes(searchQuery)
      );
    }
    
    // Remove already selected skills
    const selectedIds = new Set(selectedSkills.map(s => s.id));
    skills = skills.filter(s => !selectedIds.has(s.id));
    
    return skills;
  }, [allSkills, searchQuery, skillTypeFilter, selectedSkills]);

  // Group by category
  const groupedSkills = useMemo(() => {
    const groups: Record<string, MasterSkill[]> = {};
    
    filteredSkills.forEach(skill => {
      const category = isHebrew ? skill.category_he : skill.category_en;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(skill);
    });
    
    return groups;
  }, [filteredSkills, isHebrew]);

  const handleSelectSkill = (skill: MasterSkill) => {
    if (selectedSkills.length >= maxSkills) {
      toast({
        title: isHebrew ? 'מקסימום מיומנויות' : 'Maximum Skills',
        description: isHebrew 
          ? `ניתן לבחור עד ${maxSkills} מיומנויות`
          : `You can select up to ${maxSkills} skills`,
        variant: 'destructive',
      });
      return;
    }
    onSkillsChange([...selectedSkills, skill]);
  };

  const handleRemoveSkill = (skillId: string) => {
    onSkillsChange(selectedSkills.filter(s => s.id !== skillId));
  };

  const showAddButton = searchQuery.trim().length >= 2 && 
    filteredSkills.length === 0 && 
    !allSkills.some(s => 
      s.name_en.toLowerCase() === searchQuery.toLowerCase() ||
      s.name_he === searchQuery
    );

  return (
    <div className="space-y-4">
      {/* Selected Skills */}
      {selectedSkills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedSkills.map(skill => (
            <Badge
              key={skill.id}
              variant="secondary"
              className={cn(
                "gap-1 cursor-pointer transition-all",
                skill.skill_type === 'soft' && "bg-accent/20 text-accent-foreground border-accent"
              )}
              onClick={() => handleRemoveSkill(skill.id)}
            >
              {isHebrew ? skill.name_he : skill.name_en}
              <X className="h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}

      {/* Search and Filter */}
      <div className="space-y-2">
        <div className="relative">
          <Search className={cn(
            "absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground",
            isRTL ? "right-3" : "left-3"
          )} />
          <Input
            placeholder={isHebrew ? 'חפש מיומנות בעברית או באנגלית...' : 'Search skills in English or Hebrew...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(isRTL ? "pr-10" : "pl-10")}
          />
        </div>
        
        <Tabs value={skillTypeFilter} onValueChange={(v) => setSkillTypeFilter(v as any)}>
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">
              {isHebrew ? 'הכל' : 'All'}
            </TabsTrigger>
            <TabsTrigger value="hard" className="flex-1">
              {isHebrew ? 'מקצועיות' : 'Hard Skills'}
            </TabsTrigger>
            <TabsTrigger value="soft" className="flex-1">
              {isHebrew ? 'רכות' : 'Soft Skills'}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Skills List */}
      <ScrollArea className="h-48 border rounded-md p-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : Object.keys(groupedSkills).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center p-4">
            {showAddButton ? (
              <>
                <p className="text-sm text-muted-foreground">
                  {isHebrew 
                    ? `"${searchQuery}" לא נמצאה במאגר`
                    : `"${searchQuery}" not found in database`}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => addCustomSkillMutation.mutate(searchQuery)}
                  disabled={addCustomSkillMutation.isPending}
                >
                  {addCustomSkillMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      <Sparkles className="h-3 w-3 text-primary" />
                    </>
                  )}
                  {isHebrew 
                    ? `הוסף "${searchQuery}" למאגר (+10 קרדיטים)`
                    : `Add "${searchQuery}" to Global Database (+10 credits)`}
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {isHebrew ? 'התחל להקליד לחיפוש' : 'Start typing to search'}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedSkills).map(([category, skills]) => (
              <div key={category}>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2 sticky top-0 bg-background">
                  {category}
                </h4>
                <div className="flex flex-wrap gap-1">
                  {skills.map(skill => (
                    <Badge
                      key={skill.id}
                      variant="outline"
                      className={cn(
                        "cursor-pointer hover:bg-primary/10 transition-all",
                        skill.skill_type === 'soft' && "border-accent/50 hover:bg-accent/10",
                        skill.is_custom && "border-dashed"
                      )}
                      onClick={() => handleSelectSkill(skill)}
                    >
                      {isHebrew ? skill.name_he : skill.name_en}
                      {skill.is_custom && <Sparkles className="h-2 w-2 ml-1" />}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <p className="text-xs text-muted-foreground text-center">
        {isHebrew 
          ? `${selectedSkills.length}/${maxSkills} מיומנויות נבחרו`
          : `${selectedSkills.length}/${maxSkills} skills selected`}
      </p>
    </div>
  );
}
