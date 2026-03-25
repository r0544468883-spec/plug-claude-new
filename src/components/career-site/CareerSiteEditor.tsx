import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCareerSite, BLOCK_TYPES, CareerSiteBlock } from '@/hooks/useCareerSite';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Globe, Eye, EyeOff, Plus, Trash2, Settings, ExternalLink,
  GripVertical, Palette, Image, Users, ArrowLeft, ArrowRight, Save, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

interface CareerSiteEditorProps {
  companyId: string;
  companyName: string;
  onBack?: () => void;
}

export function CareerSiteEditor({ companyId, companyName, onBack }: CareerSiteEditorProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const { user } = useAuth();
  const BackIcon = isHebrew ? ArrowRight : ArrowLeft;

  const {
    careerSite, isLoading, blocks, teamStories,
    createSite, updateSite, addBlock, deleteBlock, toggleBlock,
    addTeamStory, deleteTeamStory,
  } = useCareerSite(companyId);

  const [editingField, setEditingField] = useState<Record<string, string>>({});
  const [newStory, setNewStory] = useState({ employee_name: '', employee_title: '', quote: '', employee_avatar_url: null as string | null });

  const [showStoryForm, setShowStoryForm] = useState(false);
  const [tab, setTab] = useState('blocks');

  const handleCreateSite = () => {
    createSite.mutate({
      company_name: companyName,
      slug: companyName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now(),
      tagline: isHebrew ? 'הצטרף לצוות שלנו' : 'Join our team',
      description: '',
    });
  };

  const handleSaveField = (field: string) => {
    if (!editingField[field]) return;
    updateSite.mutate({ [field]: editingField[field] } as Record<string, string>);
    setEditingField(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const handleAddStory = () => {
    if (!newStory.employee_name || !newStory.quote) return;
    addTeamStory.mutate(newStory);
    setNewStory({ employee_name: '', employee_title: '', quote: '', employee_avatar_url: null });
    setShowStoryForm(false);
  };

  const publicUrl = careerSite ? `${window.location.origin}/careers/${careerSite.slug}` : null;

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  if (!careerSite) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16" dir={isHebrew ? 'rtl' : 'ltr'}>
        <div className="p-6 rounded-full bg-primary/10">
          <Globe className="w-16 h-16 text-primary" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">{isHebrew ? 'צור אתר קריירה' : 'Create Career Site'}</h2>
          <p className="text-muted-foreground max-w-md">
            {isHebrew
              ? 'אתר הקריירה שלך הוא ויטרינת המותג המעסיק. צור עמוד ייחודי עם בלוקים מותאמים אישית.'
              : 'Your career site is your employer brand showcase. Build a unique page with custom blocks.'}
          </p>
        </div>
        <Button onClick={handleCreateSite} className="gap-2" size="lg">
          <Sparkles className="w-5 h-5" />
          {isHebrew ? 'צור אתר קריירה' : 'Create Career Site'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir={isHebrew ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <BackIcon className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              {isHebrew ? 'עורך אתר קריירה' : 'Career Site Editor'}
            </h2>
            <p className="text-sm text-muted-foreground">{companyName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {publicUrl && (
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" />
                {isHebrew ? 'צפה באתר' : 'View Site'}
              </a>
            </Button>
          )}
          <Button
            size="sm"
            variant={careerSite.is_published ? 'destructive' : 'default'}
            onClick={() => updateSite.mutate({ is_published: !careerSite.is_published })}
            className="gap-2"
          >
            <Globe className="w-4 h-4" />
            {careerSite.is_published
              ? (isHebrew ? 'הסר פרסום' : 'Unpublish')
              : (isHebrew ? 'פרסם' : 'Publish')}
          </Button>
        </div>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2">
        <Badge variant={careerSite.is_published ? 'default' : 'secondary'}>
          {careerSite.is_published ? (isHebrew ? 'פעיל' : 'Live') : (isHebrew ? 'טיוטה' : 'Draft')}
        </Badge>
        {publicUrl && (
          <span className="text-xs text-muted-foreground font-mono">{publicUrl}</span>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="blocks">{isHebrew ? 'בלוקים' : 'Blocks'}</TabsTrigger>
          <TabsTrigger value="branding">{isHebrew ? 'מיתוג' : 'Branding'}</TabsTrigger>
          <TabsTrigger value="stories">{isHebrew ? 'סיפורי צוות' : 'Team Stories'}</TabsTrigger>
        </TabsList>

        {/* BLOCKS TAB */}
        <TabsContent value="blocks" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Current blocks */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                {isHebrew ? 'בלוקים פעילים' : 'Active Blocks'} ({blocks.length})
              </h3>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2 pe-2">
                  {blocks.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="p-8 text-center text-muted-foreground">
                        {isHebrew ? 'הוסף בלוקים מהרשימה מצד ימין' : 'Add blocks from the list on the right'}
                      </CardContent>
                    </Card>
                  ) : (
                    blocks.map((block) => {
                      const blockMeta = BLOCK_TYPES.find(b => b.id === block.block_type);
                      return (
                        <Card key={block.id} className={`border transition-all ${!block.is_visible ? 'opacity-50' : ''}`}>
                          <CardContent className="p-3 flex items-center gap-3">
                            <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                            <span className="text-lg">{blockMeta?.icon || '📦'}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">
                                {isHebrew ? blockMeta?.labelHe : blockMeta?.labelEn}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Switch
                                checked={block.is_visible}
                                onCheckedChange={(v) => toggleBlock.mutate({ id: block.id, is_visible: v })}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive h-7 w-7"
                                onClick={() => deleteBlock.mutate(block.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Add blocks */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                {isHebrew ? 'הוסף בלוק' : 'Add Block'}
              </h3>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2 pe-2">
                  {BLOCK_TYPES.map((blockType) => {
                    const alreadyAdded = blocks.some(b => b.block_type === blockType.id);
                    return (
                      <Card
                        key={blockType.id}
                        className={`cursor-pointer transition-all hover:border-primary/50 ${alreadyAdded ? 'opacity-60' : ''}`}
                        onClick={() => !alreadyAdded && addBlock.mutate(blockType.id)}
                      >
                        <CardContent className="p-3 flex items-center gap-3">
                          <span className="text-xl">{blockType.icon}</span>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{isHebrew ? blockType.labelHe : blockType.labelEn}</p>
                          </div>
                          {alreadyAdded ? (
                            <Badge variant="secondary" className="text-xs">{isHebrew ? 'נוסף' : 'Added'}</Badge>
                          ) : (
                            <Plus className="w-4 h-4 text-muted-foreground" />
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>
        </TabsContent>

        {/* BRANDING TAB */}
        <TabsContent value="branding" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { field: 'tagline', label: isHebrew ? 'כותרת (Tagline)' : 'Tagline', type: 'input', placeholder: isHebrew ? 'הצטרף לצוות שלנו' : 'Join our team' },
              { field: 'description', label: isHebrew ? 'תיאור החברה' : 'Company Description', type: 'textarea', placeholder: isHebrew ? 'ספר על החברה...' : 'Tell about your company...' },
              { field: 'culture_text', label: isHebrew ? 'תרבות ארגונית' : 'Culture Text', type: 'textarea', placeholder: '' },
              { field: 'video_url', label: isHebrew ? 'קישור לסרטון' : 'Video URL', type: 'input', placeholder: 'https://youtube.com/...' },
              { field: 'primary_color', label: isHebrew ? 'צבע ראשי' : 'Primary Color', type: 'color', placeholder: '#3B82F6' },
              { field: 'logo_url', label: isHebrew ? 'לוגו URL' : 'Logo URL', type: 'input', placeholder: 'https://...' },
            ].map(({ field, label, type, placeholder }) => (
              <Card key={field} className="bg-card border-border">
                <CardContent className="p-4 space-y-2">
                  <label className="text-sm font-medium">{label}</label>
                  {type === 'textarea' ? (
                    <Textarea
                      defaultValue={String((careerSite as unknown as Record<string, unknown>)[field] ?? '')}
                      onChange={(e) => setEditingField(prev => ({ ...prev, [field]: e.target.value }))}
                      placeholder={placeholder}
                      rows={3}
                    />
                  ) : (
                    <Input
                      type={type === 'color' ? 'color' : 'text'}
                      defaultValue={String((careerSite as unknown as Record<string, unknown>)[field] ?? '')}
                      onChange={(e) => setEditingField(prev => ({ ...prev, [field]: e.target.value }))}
                      placeholder={placeholder}
                    />
                  )}
                  {editingField[field] !== undefined && (
                    <Button size="sm" onClick={() => handleSaveField(field)} className="gap-1">
                      <Save className="w-3 h-3" />
                      {isHebrew ? 'שמור' : 'Save'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{isHebrew ? 'הסתר מיתוג PLUG' : 'Hide PLUG Branding'}</p>
                <p className="text-sm text-muted-foreground">{isHebrew ? 'white-label – 100 קרדיטים לחודש' : 'White-label – 100 credits/month'}</p>
              </div>
              <Switch
                checked={careerSite.hide_plug_branding || false}
                onCheckedChange={(v) => updateSite.mutate({ hide_plug_branding: v })}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* TEAM STORIES TAB */}
        <TabsContent value="stories" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">{isHebrew ? 'סיפורי הצוות' : 'Team Stories'} ({teamStories.length})</h3>
            <Button size="sm" onClick={() => setShowStoryForm(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              {isHebrew ? 'הוסף סיפור' : 'Add Story'}
            </Button>
          </div>

          {showStoryForm && (
            <Card className="border-primary/40">
              <CardContent className="p-4 space-y-3">
                <Input
                  placeholder={isHebrew ? 'שם העובד' : 'Employee Name'}
                  value={newStory.employee_name}
                  onChange={e => setNewStory(p => ({ ...p, employee_name: e.target.value }))}
                />
                <Input
                  placeholder={isHebrew ? 'תפקיד' : 'Title'}
                  value={newStory.employee_title}
                  onChange={e => setNewStory(p => ({ ...p, employee_title: e.target.value }))}
                />
                <Textarea
                  placeholder={isHebrew ? 'ציטוט...' : 'Quote...'}
                  value={newStory.quote}
                  onChange={e => setNewStory(p => ({ ...p, quote: e.target.value }))}
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddStory}>{isHebrew ? 'הוסף' : 'Add'}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowStoryForm(false)}>{isHebrew ? 'ביטול' : 'Cancel'}</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {teamStories.map(story => (
              <Card key={story.id} className="bg-card">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{story.employee_name}</p>
                      {story.employee_title && <p className="text-sm text-muted-foreground">{story.employee_title}</p>}
                      <p className="text-sm mt-2 italic">"{story.quote}"</p>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => deleteTeamStory.mutate(story.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
