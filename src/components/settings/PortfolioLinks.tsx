import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link2, Briefcase, Linkedin, Github, ExternalLink, Loader2, Save, Sparkles, Brain } from 'lucide-react';

export function PortfolioLinks() {
  const { user, profile } = useAuth();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const isHebrew = language === 'he';

  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [portfolioSummary, setPortfolioSummary] = useState<any>(null);

  // Load existing portfolio summary
  useEffect(() => {
    if (profile && (profile as any)?.portfolio_summary) {
      setPortfolioSummary((profile as any).portfolio_summary);
    }
  }, [profile]);

  useEffect(() => {
    if (profile) {
      setPortfolioUrl((profile as any)?.portfolio_url || '');
      setLinkedinUrl((profile as any)?.linkedin_url || '');
      setGithubUrl((profile as any)?.github_url || '');
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          portfolio_url: portfolioUrl || null,
          linkedin_url: linkedinUrl || null,
          github_url: githubUrl || null,
        })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isHebrew ? 'הקישורים נשמרו!' : 'Links saved!');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: () => {
      toast.error(isHebrew ? 'שגיאה בשמירת הקישורים' : 'Failed to save links');
    },
  });

  const hasLinks = portfolioUrl || linkedinUrl || githubUrl;

  return (
    <Card className="bg-card border-border" dir={isHebrew ? 'rtl' : 'ltr'} data-tour="portfolio-links">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-primary" />
          {isHebrew ? 'קישורים ותיק עבודות' : 'Portfolio & Links'}
        </CardTitle>
        <CardDescription>
          {isHebrew 
            ? 'הוסף קישורים שמגייסים יוכלו לראות' 
            : 'Add links that recruiters can view'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Portfolio URL */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            {isHebrew ? 'תיק עבודות' : 'Portfolio'}
          </Label>
          <div className="flex gap-2">
            <Input
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              placeholder="https://yourportfolio.com"
              type="url"
              className="flex-1"
            />
            {portfolioUrl && (
              <Button
                variant="outline"
                size="icon"
                onClick={async () => {
                  if (!portfolioUrl || !user) return;
                  setIsAnalyzing(true);
                  try {
                    const { data, error } = await supabase.functions.invoke('analyze-portfolio', {
                      body: { portfolioUrl }
                    });
                    if (error) throw error;
                    setPortfolioSummary(data.summary);
                    toast.success(isHebrew ? 'הפורטפוליו נותח בהצלחה!' : 'Portfolio analyzed successfully!');
                    queryClient.invalidateQueries({ queryKey: ['profile'] });
                  } catch (err) {
                    console.error('Portfolio analysis error:', err);
                    toast.error(isHebrew ? 'שגיאה בניתוח הפורטפוליו' : 'Failed to analyze portfolio');
                  } finally {
                    setIsAnalyzing(false);
                  }
                }}
                disabled={isAnalyzing}
                title={isHebrew ? 'נתח עם AI' : 'Analyze with AI'}
              >
                {isAnalyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Brain className="w-4 h-4 text-primary" />
                )}
              </Button>
            )}
          </div>
          
          {/* Portfolio AI Summary */}
          {portfolioSummary && (
            <div className="mt-3 p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <Sparkles className="w-4 h-4" />
                {isHebrew ? 'סיכום AI של הפורטפוליו' : 'AI Portfolio Summary'}
              </div>
              
              {portfolioSummary.overall_summary && (
                <p className="text-sm text-muted-foreground">{portfolioSummary.overall_summary}</p>
              )}
              
              {portfolioSummary.tech_stack?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-foreground mb-1">
                    {isHebrew ? 'טכנולוגיות' : 'Tech Stack'}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {portfolioSummary.tech_stack.map((tech: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">{tech}</Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {portfolioSummary.style && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">{isHebrew ? 'סגנון: ' : 'Style: '}</span>
                  {portfolioSummary.style}
                </p>
              )}
            </div>
          )}
        </div>

        {/* LinkedIn URL */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Linkedin className="w-4 h-4" />
            LinkedIn
          </Label>
          <Input
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="https://linkedin.com/in/yourprofile"
            type="url"
          />
        </div>

        {/* GitHub URL */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Github className="w-4 h-4" />
            GitHub
          </Label>
          <Input
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            placeholder="https://github.com/yourusername"
            type="url"
          />
        </div>

        {/* Preview Links */}
        {hasLinks && (
          <div className="space-y-2">
            <Label className="text-muted-foreground">
              {isHebrew ? 'תצוגה מקדימה' : 'Preview'}
            </Label>
            <div className="flex flex-wrap gap-2">
              {portfolioUrl && (
                <a href={portfolioUrl} target="_blank" rel="noopener noreferrer">
                  <Badge variant="outline" className="gap-1.5 cursor-pointer hover:bg-primary/10">
                    <Briefcase className="w-3 h-3" />
                    Portfolio
                    <ExternalLink className="w-3 h-3" />
                  </Badge>
                </a>
              )}
              {linkedinUrl && (
                <a href={linkedinUrl} target="_blank" rel="noopener noreferrer">
                  <Badge variant="outline" className="gap-1.5 cursor-pointer hover:bg-primary/10">
                    <Linkedin className="w-3 h-3" />
                    LinkedIn
                    <ExternalLink className="w-3 h-3" />
                  </Badge>
                </a>
              )}
              {githubUrl && (
                <a href={githubUrl} target="_blank" rel="noopener noreferrer">
                  <Badge variant="outline" className="gap-1.5 cursor-pointer hover:bg-primary/10">
                    <Github className="w-3 h-3" />
                    GitHub
                    <ExternalLink className="w-3 h-3" />
                  </Badge>
                </a>
              )}
            </div>
          </div>
        )}

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
          {isHebrew ? 'שמור קישורים' : 'Save Links'}
        </Button>
      </CardContent>
    </Card>
  );
}
