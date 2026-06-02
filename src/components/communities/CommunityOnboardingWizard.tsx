import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Mail,
  MessageCircle,
  Instagram,
  Sparkles,
  Users,
  Loader2,
  X,
  TrendingUp,
  Rocket,
} from 'lucide-react';

interface CommunityOnboardingWizardProps {
  onComplete?: (hubId: string) => void;
  onCancel?: () => void;
}

interface FormData {
  niche: string;
  targetAudience: string;
  mainGoal: string;
  pricePoint: number;
  communityName: string;
}

interface CreatedCommunity {
  id: string;
  name: string;
  slug: string;
  description: string;
  channels: string[];
  price: number;
}

const NICHES = [
  { value: 'fitness', en: 'Fitness & Health', he: 'כושר ובריאות' },
  { value: 'business_coaching', en: 'Business Coaching', he: 'אימון עסקי' },
  { value: 'nutrition', en: 'Nutrition', he: 'תזונה' },
  { value: 'tech', en: 'Tech & Development', he: 'טכנולוגיה ופיתוח' },
  { value: 'education', en: 'Education', he: 'חינוך' },
  { value: 'art', en: 'Art & Design', he: 'אמנות ועיצוב' },
  { value: 'music', en: 'Music', he: 'מוזיקה' },
  { value: 'therapy', en: 'Therapy & Wellness', he: 'טיפול ורווחה' },
  { value: 'real_estate', en: 'Real Estate', he: 'נדל"ן' },
  { value: 'other', en: 'Other', he: 'אחר' },
];

const GOALS = [
  { value: 'sell_courses', en: 'Sell Courses', he: 'מכירת קורסים' },
  { value: 'build_community', en: 'Build Community', he: 'בניית קהילה' },
  { value: 'recurring_revenue', en: 'Recurring Revenue', he: 'הכנסה חוזרת' },
  { value: 'share_knowledge', en: 'Share Knowledge', he: 'שיתוף ידע' },
  { value: 'all', en: 'All of the above', he: 'כל האמור לעיל' },
];

const PROGRESS_STEPS_EN = [
  'Creating community structure...',
  'Setting up channels...',
  'Generating starter content...',
  'Configuring pricing...',
  'Finalizing...',
];

const PROGRESS_STEPS_HE = [
  'יוצר מבנה קהילה...',
  'מגדיר ערוצים...',
  'מייצר תוכן התחלתי...',
  'מגדיר תמחור...',
  'מסיים...',
];

const STEP_DELAYS = [1000, 1500, 2000, 1000, 500];

export function CommunityOnboardingWizard({ onComplete, onCancel }: CommunityOnboardingWizardProps) {
  const { user } = useAuth();
  const { language, direction } = useLanguage();
  const { toast } = useToast();
  const isHebrew = language === 'he';

  const [currentStep, setCurrentStep] = useState(1);
  const [animating, setAnimating] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    niche: '',
    targetAudience: '',
    mainGoal: '',
    pricePoint: 99,
    communityName: '',
  });

  // Step 2 state
  const [buildProgress, setBuildProgress] = useState(0);
  const [buildComplete, setBuildComplete] = useState(false);
  const [createdCommunity, setCreatedCommunity] = useState<CreatedCommunity | null>(null);
  const buildStarted = useRef(false);

  // Step 3 state
  const [linkCopied, setLinkCopied] = useState(false);

  const goToStep = (step: number) => {
    setAnimating(true);
    setTimeout(() => {
      setCurrentStep(step);
      setAnimating(false);
    }, 200);
  };

  // Step 2: build community on mount
  useEffect(() => {
    if (currentStep !== 2 || buildStarted.current) return;
    buildStarted.current = true;

    const runBuild = async () => {
      // Animate progress steps
      for (let i = 0; i < STEP_DELAYS.length; i++) {
        setBuildProgress(i);
        await new Promise((r) => setTimeout(r, STEP_DELAYS[i]));
      }

      // Actually create the community
      try {
        const result = await createCommunity();
        setCreatedCommunity(result);
        setBuildComplete(true);
        // Auto-advance after a short pause
        setTimeout(() => goToStep(3), 800);
      } catch (err: any) {
        toast({
          title: isHebrew ? 'שגיאה' : 'Error',
          description: err.message || (isHebrew ? 'נכשל ביצירת הקהילה' : 'Failed to create community'),
          variant: 'destructive',
        });
        // Go back to step 1
        buildStarted.current = false;
        goToStep(1);
      }
    };

    runBuild();
  }, [currentStep]);

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 50) || `community-${Date.now()}`;
  };

  const generateName = (): string => {
    const nicheObj = NICHES.find((n) => n.value === formData.niche);
    const nicheName = isHebrew ? nicheObj?.he : nicheObj?.en;
    return nicheName ? `${nicheName} Community` : 'My Community';
  };

  const generateDescription = (): string => {
    const nicheObj = NICHES.find((n) => n.value === formData.niche);
    const nicheName = isHebrew ? nicheObj?.he : nicheObj?.en;
    if (isHebrew) {
      return `קהילה בתחום ${nicheName || 'כללי'} עבור ${formData.targetAudience || 'כולם'}`;
    }
    return `A ${nicheName || 'general'} community for ${formData.targetAudience || 'everyone'}`;
  };

  const createCommunity = async (): Promise<CreatedCommunity> => {
    if (!user?.id) throw new Error('Not authenticated');

    const name = formData.communityName.trim() || generateName();
    const slug = generateSlug(name);
    const description = generateDescription();

    // Create hub
    const { data: hub, error: hubError } = await (supabase as any)
      .from('community_hubs')
      .insert({
        creator_id: user.id,
        name_en: name,
        name_he: formData.communityName.trim() || (isHebrew ? name : ''),
        description_en: description,
        description_he: isHebrew ? description : '',
        slug,
        template: formData.niche || 'custom',
        is_public: true,
        member_count: 1,
      })
      .select('id, slug')
      .single();

    if (hubError) throw hubError;

    // Create default channels
    const channels = [
      { name_en: '#general', name_he: '#כללי', sort_order: 0 },
      { name_en: '#welcome', name_he: '#ברוכים-הבאים', sort_order: 1 },
      { name_en: '#content', name_he: '#תוכן', sort_order: 2 },
      { name_en: '#support', name_he: '#תמיכה', sort_order: 3 },
    ];

    for (const ch of channels) {
      await (supabase as any).from('community_channels').insert({
        hub_id: hub.id,
        ...ch,
      });
    }

    // Add creator as admin
    await (supabase as any).from('community_members').insert({
      hub_id: hub.id,
      user_id: user.id,
      role: 'admin',
    });

    // Create subscription plan if price > 0
    if (formData.pricePoint > 0) {
      await (supabase as any).from('community_subscriptions').insert({
        hub_id: hub.id,
        name_en: 'Monthly Membership',
        name_he: 'מנוי חודשי',
        price: formData.pricePoint,
        currency: 'ILS',
        interval: 'monthly',
        is_active: true,
      });
    }

    // Create landing page entry
    await (supabase as any).from('community_landing_pages').insert({
      hub_id: hub.id,
      headline_en: name,
      headline_he: formData.communityName.trim() || name,
      subheadline_en: description,
      subheadline_he: isHebrew ? description : '',
      is_published: true,
    });

    return {
      id: hub.id,
      name,
      slug: hub.slug || slug,
      description,
      channels: channels.map((c) => (isHebrew ? c.name_he : c.name_en)),
      price: formData.pricePoint,
    };
  };

  const communityLink = createdCommunity
    ? `${window.location.origin}/c/${createdCommunity.slug}`
    : '';

  const copyLink = () => {
    navigator.clipboard.writeText(communityLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
    toast({
      title: isHebrew ? 'הקישור הועתק!' : 'Link copied!',
    });
  };

  const shareWhatsApp = () => {
    const text = isHebrew
      ? `הצטרפו לקהילה שלי: ${createdCommunity?.name}\n${communityLink}`
      : `Join my community: ${createdCommunity?.name}\n${communityLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareEmail = () => {
    const subject = isHebrew
      ? `הצטרפו לקהילה: ${createdCommunity?.name}`
      : `Join my community: ${createdCommunity?.name}`;
    const body = isHebrew
      ? `היי,\n\nאני מזמין/ה אותך להצטרף לקהילה שלי.\n\n${communityLink}`
      : `Hey,\n\nI'd like to invite you to join my community.\n\n${communityLink}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const monthlyRevenue = formData.pricePoint * 100;

  const isStep1Valid = formData.niche && formData.mainGoal;

  // ---------- RENDER ----------

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2, 3].map((step) => (
        <div
          key={step}
          className={`w-3 h-3 rounded-full transition-all duration-300 ${
            step === currentStep
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 scale-125'
              : step < currentStep
              ? 'bg-purple-400'
              : 'bg-muted'
          }`}
        />
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6 max-w-xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mb-4">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-2xl font-bold">
          {isHebrew ? 'ספרו לנו על העסק שלכם' : 'Tell us about your business'}
        </h2>
        <p className="text-muted-foreground mt-2">
          {isHebrew
            ? 'נבנה לכם קהילה מושלמת תוך דקה'
            : "We'll build your perfect community in under a minute"}
        </p>
      </div>

      {/* Niche */}
      <div className="space-y-2">
        <Label>{isHebrew ? 'תחום העסק' : 'Business niche/field'}</Label>
        <Select value={formData.niche} onValueChange={(v) => setFormData((p) => ({ ...p, niche: v }))}>
          <SelectTrigger>
            <SelectValue placeholder={isHebrew ? 'בחרו תחום...' : 'Select a niche...'} />
          </SelectTrigger>
          <SelectContent>
            {NICHES.map((n) => (
              <SelectItem key={n.value} value={n.value}>
                {isHebrew ? n.he : n.en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Target Audience */}
      <div className="space-y-2">
        <Label>{isHebrew ? 'קהל יעד' : 'Target audience'}</Label>
        <Textarea
          value={formData.targetAudience}
          onChange={(e) => setFormData((p) => ({ ...p, targetAudience: e.target.value }))}
          placeholder={
            isHebrew
              ? 'מי חברי הקהילה האידיאליים שלכם?'
              : 'Who are your ideal community members?'
          }
          className="resize-none min-h-[80px]"
        />
      </div>

      {/* Main Goal */}
      <div className="space-y-2">
        <Label>{isHebrew ? 'מטרה עיקרית' : 'Main goal'}</Label>
        <Select value={formData.mainGoal} onValueChange={(v) => setFormData((p) => ({ ...p, mainGoal: v }))}>
          <SelectTrigger>
            <SelectValue placeholder={isHebrew ? 'בחרו מטרה...' : 'Select a goal...'} />
          </SelectTrigger>
          <SelectContent>
            {GOALS.map((g) => (
              <SelectItem key={g.value} value={g.value}>
                {isHebrew ? g.he : g.en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Price Slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>{isHebrew ? 'מחיר מנוי חודשי' : 'Monthly subscription price'}</Label>
          <span className="text-sm font-semibold text-purple-500">
            {formData.pricePoint === 0
              ? isHebrew ? 'חינם' : 'Free'
              : `${formData.pricePoint} ILS`}
          </span>
        </div>
        <Slider
          value={[formData.pricePoint]}
          onValueChange={([v]) => setFormData((p) => ({ ...p, pricePoint: v }))}
          min={0}
          max={499}
          step={10}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{isHebrew ? 'חינם' : 'Free'}</span>
          <span>499 ILS</span>
        </div>
      </div>

      {/* Community Name */}
      <div className="space-y-2">
        <Label>
          {isHebrew ? 'שם הקהילה (אופציונלי)' : 'Community name (optional)'}
        </Label>
        <Input
          value={formData.communityName}
          onChange={(e) => setFormData((p) => ({ ...p, communityName: e.target.value }))}
          placeholder={isHebrew ? 'ה-AI ימליץ אם תשאירו ריק' : 'AI will suggest if left empty'}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onCancel} className="gap-2">
          <X className="w-4 h-4" />
          {isHebrew ? 'ביטול' : 'Cancel'}
        </Button>
        <Button
          onClick={() => goToStep(2)}
          disabled={!isStep1Valid}
          className="gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
        >
          {isHebrew ? 'המשך' : 'Continue'}
          {isHebrew ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );

  const renderStep2 = () => {
    const progressSteps = isHebrew ? PROGRESS_STEPS_HE : PROGRESS_STEPS_EN;

    return (
      <div className="space-y-8 max-w-md mx-auto text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mx-auto animate-pulse">
          <Sparkles className="w-8 h-8 text-white" />
        </div>

        <h2 className="text-2xl font-bold">
          {isHebrew ? 'AI בונה את הקהילה שלכם' : 'AI is building your community'}
        </h2>

        <div className="space-y-4 text-start">
          {progressSteps.map((step, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 transition-all duration-500 ${
                i <= buildProgress ? 'opacity-100' : 'opacity-30'
              }`}
            >
              {i < buildProgress ? (
                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-white" />
                </div>
              ) : i === buildProgress ? (
                <Loader2 className="w-6 h-6 text-purple-500 animate-spin flex-shrink-0" />
              ) : (
                <div className="w-6 h-6 rounded-full border-2 border-muted flex-shrink-0" />
              )}
              <span className={`text-sm ${i <= buildProgress ? 'font-medium' : 'text-muted-foreground'}`}>
                {step}
              </span>
            </div>
          ))}
        </div>

        {buildComplete && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
              <CardContent className="p-4 text-center">
                <Check className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="font-semibold text-green-700 dark:text-green-300">
                  {isHebrew ? 'הקהילה מוכנה!' : 'Community is ready!'}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <Button variant="ghost" onClick={() => { buildStarted.current = false; goToStep(1); }} className="gap-2">
          {isHebrew ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          {isHebrew ? 'חזרה' : 'Back'}
        </Button>
      </div>
    );
  };

  const renderStep3 = () => {
    if (!createdCommunity) return null;

    return (
      <div className="space-y-8 max-w-lg mx-auto">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mb-4">
            <Rocket className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold">
            {isHebrew ? 'שתפו והתחילו להרוויח' : 'Share & Start Earning'}
          </h2>
        </div>

        {/* Community Preview Card */}
        <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg truncate">{createdCommunity.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{createdCommunity.description}</p>
                <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> 1 {isHebrew ? 'חבר' : 'member'}
                  </span>
                  <span>{createdCommunity.channels.length} {isHebrew ? 'ערוצים' : 'channels'}</span>
                  {createdCommunity.price > 0 && (
                    <span className="text-purple-600 font-medium">{createdCommunity.price} ILS/{isHebrew ? 'חודש' : 'mo'}</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Potential */}
        {createdCommunity.price > 0 && (
          <Card className="border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    {isHebrew ? 'פוטנציאל הכנסה חודשית (100 חברים)' : 'Monthly revenue potential (100 members)'}
                  </p>
                  <p className="text-xl font-bold text-green-600">
                    {monthlyRevenue.toLocaleString()} ILS/{isHebrew ? 'חודש' : 'month'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Share Section */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            {isHebrew ? 'שתפו את הקהילה שלכם' : 'Share your community'}
          </Label>

          {/* Link display */}
          <div className="flex items-center gap-2 bg-muted rounded-lg p-2">
            <span className="text-sm text-muted-foreground truncate flex-1 px-2">{communityLink}</span>
            <Button size="sm" variant="ghost" onClick={copyLink} className="gap-1 flex-shrink-0">
              {linkCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {linkCopied ? (isHebrew ? 'הועתק' : 'Copied') : (isHebrew ? 'העתק' : 'Copy')}
            </Button>
          </div>

          {/* Share buttons */}
          <div className="grid grid-cols-3 gap-3">
            <Button variant="outline" onClick={shareWhatsApp} className="gap-2 h-11">
              <MessageCircle className="w-4 h-4 text-green-500" />
              WhatsApp
            </Button>
            <Button variant="outline" onClick={() => {
              navigator.clipboard.writeText(communityLink);
              toast({ title: isHebrew ? 'הועתק! הדביקו בביו של אינסטגרם' : 'Copied! Paste in your Instagram bio' });
            }} className="gap-2 h-11">
              <Instagram className="w-4 h-4 text-pink-500" />
              Instagram
            </Button>
            <Button variant="outline" onClick={shareEmail} className="gap-2 h-11">
              <Mail className="w-4 h-4 text-blue-500" />
              Email
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-2">
          <Button
            onClick={() => onComplete?.(createdCommunity.id)}
            className="w-full gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white h-12 text-base"
          >
            {isHebrew ? 'כניסה לקהילה שלי' : 'Go to My Community'}
            {isHebrew ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              window.location.href = `/community/${createdCommunity.id}/landing-editor`;
            }}
            className="text-sm text-muted-foreground"
          >
            {isHebrew ? 'עריכת דף הנחיתה' : 'Customize Landing Page'}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-start overflow-y-auto"
      dir={direction}
    >
      {/* Top bar */}
      <div className="w-full max-w-2xl px-6 pt-6">
        {renderStepIndicator()}
      </div>

      {/* Content */}
      <div
        className={`w-full max-w-2xl px-6 pb-12 transition-all duration-200 ${
          animating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
        }`}
      >
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </div>
    </div>
  );
}
