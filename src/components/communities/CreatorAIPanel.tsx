import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import {
  Sparkles, Loader2, Copy, CheckCircle, Clock,
  FileText, Megaphone, Zap, Globe, Mail,
  ArrowRight, History, Wand2,
} from 'lucide-react';

interface CreatorAIPanelProps {
  hubId: string;
  isAdmin: boolean;
}

type TemplateType = 'post' | 'challenge' | 'ad' | 'landing_copy' | 'email';

interface TemplateConfig {
  type: TemplateType;
  nameHe: string;
  nameEn: string;
  icon: React.ReactNode;
  fields: { key: string; labelHe: string; labelEn: string; type: 'input' | 'textarea' }[];
  systemPrompt: string;
}

const TEMPLATES: TemplateConfig[] = [
  {
    type: 'post',
    nameHe: 'פוסט לקהילה',
    nameEn: 'Community Post',
    icon: <FileText className="w-5 h-5" />,
    fields: [
      { key: 'niche', labelHe: 'נישה / תחום', labelEn: 'Niche', type: 'input' },
      { key: 'topic', labelHe: 'נושא הפוסט', labelEn: 'Post Topic', type: 'input' },
      { key: 'tone', labelHe: 'טון (מקצועי/ידידותי/הומוריסטי)', labelEn: 'Tone (professional/friendly/humorous)', type: 'input' },
    ],
    systemPrompt: 'You are a community content creator. Write an engaging community post about the given topic in the specified niche and tone. Make it conversational, add a call-to-action at the end to encourage discussion.',
  },
  {
    type: 'challenge',
    nameHe: 'אתגר קהילתי',
    nameEn: 'Community Challenge',
    icon: <Zap className="w-5 h-5" />,
    fields: [
      { key: 'niche', labelHe: 'נישה / תחום', labelEn: 'Niche', type: 'input' },
      { key: 'topic', labelHe: 'נושא האתגר', labelEn: 'Challenge Topic', type: 'input' },
      { key: 'duration', labelHe: 'משך (ימים)', labelEn: 'Duration (days)', type: 'input' },
    ],
    systemPrompt: 'You are a community engagement expert. Create a detailed community challenge plan. Include: challenge name, description, daily/weekly tasks, rules, and how to track progress. Make it fun and motivating.',
  },
  {
    type: 'ad',
    nameHe: 'מודעת פרסום',
    nameEn: 'Ad Copy',
    icon: <Megaphone className="w-5 h-5" />,
    fields: [
      { key: 'product', labelHe: 'מוצר / שירות', labelEn: 'Product/Service', type: 'input' },
      { key: 'audience', labelHe: 'קהל יעד', labelEn: 'Target Audience', type: 'input' },
      { key: 'platform', labelHe: 'פלטפורמה (Facebook/Instagram/LinkedIn)', labelEn: 'Platform (Facebook/Instagram/LinkedIn)', type: 'input' },
    ],
    systemPrompt: 'You are a digital marketing expert. Write compelling ad copy for the specified platform. Include: headline, body text, call-to-action. Optimize for the platform character limits and best practices.',
  },
  {
    type: 'landing_copy',
    nameHe: 'טקסט לדף נחיתה',
    nameEn: 'Landing Page Copy',
    icon: <Globe className="w-5 h-5" />,
    fields: [
      { key: 'product', labelHe: 'מוצר / קהילה', labelEn: 'Product/Community', type: 'input' },
      { key: 'usp', labelHe: 'יתרון ייחודי', labelEn: 'Unique Selling Point', type: 'input' },
      { key: 'audience', labelHe: 'קהל יעד', labelEn: 'Target Audience', type: 'input' },
    ],
    systemPrompt: 'You are a conversion copywriting expert. Write landing page copy sections: hero headline + subheadline, 3 benefit blocks, a social proof section framework, and a final CTA section. Make it persuasive and clear.',
  },
  {
    type: 'email',
    nameHe: 'אימייל לחברי קהילה',
    nameEn: 'Community Email',
    icon: <Mail className="w-5 h-5" />,
    fields: [
      { key: 'purpose', labelHe: 'מטרת המייל', labelEn: 'Email Purpose', type: 'input' },
      { key: 'topic', labelHe: 'נושא / תוכן עיקרי', labelEn: 'Main Topic/Content', type: 'textarea' },
      { key: 'cta', labelHe: 'קריאה לפעולה', labelEn: 'Call to Action', type: 'input' },
    ],
    systemPrompt: 'You are an email marketing expert for online communities. Write a community email with: subject line, preview text, greeting, body (2-3 paragraphs), and a clear call-to-action button text. Keep it warm and personal.',
  },
];

export function CreatorAIPanel({ hubId, isAdmin }: CreatorAIPanelProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const queryClient = useQueryClient();

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('post');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [genLanguage, setGenLanguage] = useState<'he' | 'en'>(isRTL ? 'he' : 'en');
  const [result, setResult] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const template = TEMPLATES.find(t => t.type === selectedTemplate)!;

  // Fetch generation history
  const { data: history = [] } = useQuery({
    queryKey: ['creator-ai-history', hubId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('creator_ai_generations')
        .select('*')
        .eq('hub_id', hubId)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const langInstruction = genLanguage === 'he'
        ? 'IMPORTANT: Write your entire response in Hebrew.'
        : 'Write your entire response in English.';

      const fieldsSummary = template.fields
        .map(f => `${f.labelEn}: ${fieldValues[f.key] || '(not specified)'}`)
        .join('\n');

      const formattedPrompt = `${template.systemPrompt}\n\n${langInstruction}\n\nInput:\n${fieldsSummary}`;

      const { data, error } = await supabase.functions.invoke('ai-proxy', {
        body: { prompt: formattedPrompt, max_tokens: 1000 },
      });

      if (error) throw error;
      const generatedText = data?.result || data?.content || data?.text || '';

      // Save generation to history
      await (supabase as any).from('creator_ai_generations').insert({
        hub_id: hubId,
        user_id: user?.id,
        template_type: selectedTemplate,
        input_fields: fieldValues,
        output_text: generatedText,
        language: genLanguage,
      });

      return generatedText;
    },
    onSuccess: (text) => {
      setResult(text);
      queryClient.invalidateQueries({ queryKey: ['creator-ai-history', hubId] });
      toast.success(isRTL ? 'התוכן נוצר בהצלחה' : 'Content generated successfully');
    },
    onError: () => {
      toast.error(isRTL ? 'שגיאה ביצירת תוכן' : 'Failed to generate content');
    },
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    toast.success(isRTL ? 'הועתק ללוח' : 'Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const updateField = (key: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [key]: value }));
  };

  const canGenerate = template.fields.some(f => fieldValues[f.key]?.trim());

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-3">
        <Wand2 className="w-6 h-6 text-purple-600" />
        <h2 className="text-xl font-bold">{isRTL ? 'AI ליוצרים' : 'Creator AI'}</h2>
      </div>

      {/* Template Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {TEMPLATES.map(t => (
          <button
            key={t.type}
            type="button"
            onClick={() => {
              setSelectedTemplate(t.type);
              setResult('');
              setFieldValues({});
            }}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all text-center',
              selectedTemplate === t.type
                ? 'border-purple-500 bg-purple-50 shadow-md'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            )}
          >
            <div className={cn(
              'p-2 rounded-lg',
              selectedTemplate === t.type ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
            )}>
              {t.icon}
            </div>
            <span className="text-xs font-medium leading-tight">
              {isRTL ? t.nameHe : t.nameEn}
            </span>
          </button>
        ))}
      </div>

      {/* Input Fields */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            {isRTL ? template.nameHe : template.nameEn}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {template.fields.map(field => (
            <div key={field.key} className="space-y-2">
              <Label>{isRTL ? field.labelHe : field.labelEn}</Label>
              {field.type === 'textarea' ? (
                <Textarea
                  value={fieldValues[field.key] || ''}
                  onChange={e => updateField(field.key, e.target.value)}
                  rows={3}
                />
              ) : (
                <Input
                  value={fieldValues[field.key] || ''}
                  onChange={e => updateField(field.key, e.target.value)}
                />
              )}
            </div>
          ))}

          {/* Language toggle */}
          <div className="flex items-center gap-4 pt-2">
            <Label className="text-sm">{isRTL ? 'שפת הפלט:' : 'Output language:'}</Label>
            <div className="flex gap-2">
              <Button
                variant={genLanguage === 'he' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGenLanguage('he')}
              >
                עברית
              </Button>
              <Button
                variant={genLanguage === 'en' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGenLanguage('en')}
              >
                English
              </Button>
            </div>
          </div>

          <Button
            onClick={() => generateMutation.mutate()}
            disabled={!canGenerate || generateMutation.isPending}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                {isRTL ? 'מייצר...' : 'Generating...'}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                {isRTL ? 'צור תוכן' : 'Generate'}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-purple-900">{isRTL ? 'תוצאה' : 'Result'}</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-1"
              >
                {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                {copied ? (isRTL ? 'הועתק!' : 'Copied!') : (isRTL ? 'העתק' : 'Copy')}
              </Button>
            </div>
            <div className="bg-white rounded-lg p-4 border whitespace-pre-wrap text-sm leading-relaxed">
              {result}
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {history.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4" />
              {isRTL ? 'היסטוריית יצירות' : 'Generation History'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {history.map((item: any) => {
              const tmpl = TEMPLATES.find(t => t.type === item.template_type);
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                  onClick={() => {
                    setResult(item.output_text || '');
                    setSelectedTemplate(item.template_type);
                    setFieldValues(item.input_fields || {});
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded bg-gray-200">
                      {tmpl?.icon || <FileText className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {isRTL ? tmpl?.nameHe : tmpl?.nameEn}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(item.created_at), {
                          addSuffix: true,
                          locale: isRTL ? he : enUS,
                        })}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {item.language === 'he' ? 'עב' : 'EN'}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
