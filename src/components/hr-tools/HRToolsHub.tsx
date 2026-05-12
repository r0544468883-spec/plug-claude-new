import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { PipelineAnalytics } from '@/components/analytics/PipelineAnalytics';
import { PredictiveAnalytics } from '@/components/analytics/PredictiveAnalytics';
import { TalentPoolList } from '@/components/talent-pool/TalentPoolList';
import { ApprovalInbox } from '@/components/approvals/ApprovalInbox';
import { JobAlertSetup } from '@/components/alerts/JobAlertSetup';
import { ReferralPanel } from '@/components/referrals/ReferralPanel';
import { SurveyResults } from '@/components/surveys/SurveyResults';
import { DocumentsPage } from '@/components/documents/DocumentsPage';
import { VideoInterviewList } from '@/components/video-interview/VideoInterviewList';
import { OfferTemplatesLibrary } from '@/components/offers/OfferTemplatesLibrary';
import { ComplianceDashboard } from '@/components/compliance/ComplianceDashboard';
import { NurtureCampaignBuilder } from '@/components/campaigns/NurtureCampaignBuilder';
import { ExternalSourcingPanel } from '@/components/sourcing/ExternalSourcingPanel';
import { MultiChannelInbox } from '@/components/messaging/MultiChannelInbox';
import { CustomDashboardBuilder } from '@/components/dashboard/CustomDashboardBuilder';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  Users,
  CheckSquare,
  Bell,
  Gift,
  Star,
  ArrowLeft,
  ArrowRight,
  LayoutGrid,
  FileSignature,
  Video,
  X,
  Lightbulb,
  TrendingUp,
  FileText,
  Shield,
  Mail,
  MessageSquare,
  Search,
  Blocks,
} from 'lucide-react';


type HRSubSection =
  | 'hub'
  | 'analytics'
  | 'predictive'
  | 'talent-pool'
  | 'approvals'
  | 'job-alerts'
  | 'referrals'
  | 'surveys'
  | 'documents'
  | 'video-interviews'
  | 'offer-templates'
  | 'compliance'
  | 'nurture-campaigns'
  | 'external-sourcing'
  | 'multi-channel'
  | 'custom-dashboard';

interface HRToolsHubProps {
  onBack?: () => void;
}

export function HRToolsHub({ onBack }: HRToolsHubProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [subSection, setSubSection] = useState<HRSubSection>('hub');
  const [showTip, setShowTip] = useState(() => !localStorage.getItem('hr-tools-tip-dismissed'));

  const BackIcon = isHebrew ? ArrowRight : ArrowLeft;

  const tools = [
    {
      id: 'analytics' as HRSubSection,
      icon: BarChart3,
      labelHe: 'אנליטיקות גיוס',
      labelEn: 'Pipeline Analytics',
      descHe: 'משפך גיוס, שיעורי המרה, מקורות ומדדי זמן',
      descEn: 'Funnel, conversion rates, sources & time metrics',
      color: 'from-blue-500/10 to-cyan-500/10 border-blue-500/20',
      iconColor: 'text-blue-500',
    },
    {
      id: 'talent-pool' as HRSubSection,
      icon: Users,
      labelHe: 'בנק מועמדים',
      labelEn: 'Talent Pool',
      descHe: 'ניהול מועמדים שמורים לפי קטגוריות',
      descEn: 'Manage saved candidates by categories',
      color: 'from-violet-500/10 to-purple-500/10 border-violet-500/20',
      iconColor: 'text-violet-500',
    },
    {
      id: 'approvals' as HRSubSection,
      icon: CheckSquare,
      labelHe: 'תיבת אישורים',
      labelEn: 'Approval Inbox',
      descHe: 'בקשות ממתינות לאישור – משרות, הצעות ותקציב',
      descEn: 'Pending approvals – jobs, offers & budget',
      color: 'from-orange-500/10 to-amber-500/10 border-orange-500/20',
      iconColor: 'text-orange-500',
    },
    {
      id: 'job-alerts' as HRSubSection,
      icon: Bell,
      labelHe: 'התראות משרות',
      labelEn: 'Job Alerts',
      descHe: 'הגדר התראות חכמות לפי תפקיד, מיקום ושכר',
      descEn: 'Smart alerts by role, location & salary',
      color: 'from-green-500/10 to-emerald-500/10 border-green-500/20',
      iconColor: 'text-green-500',
    },
    {
      id: 'referrals' as HRSubSection,
      icon: Gift,
      labelHe: 'חבר מביא חבר',
      labelEn: 'Referral Program',
      descHe: 'הזמן חברים וקבל Fuel על כל הצטרפות',
      descEn: 'Invite friends and earn Fuel for each signup',
      color: 'from-pink-500/10 to-rose-500/10 border-pink-500/20',
      iconColor: 'text-pink-500',
    },
    {
      id: 'surveys' as HRSubSection,
      icon: Star,
      labelHe: 'סקרי מועמדים',
      labelEn: 'Candidate Surveys',
      descHe: 'ציוני שביעות רצון, דירוגים ומשוב אנונימי מהתהליך',
      descEn: 'NPS, ratings & anonymous process feedback',
      color: 'from-yellow-500/10 to-amber-500/10 border-yellow-500/20',
      iconColor: 'text-yellow-500',
    },
    {
      id: 'video-interviews' as HRSubSection,
      icon: Video,
      labelHe: 'ראיונות וידאו',
      labelEn: 'Video Interviews',
      descHe: 'ראיונות וידאו אסינכרוניים — שלח שאלות וצפה בתשובות',
      descEn: 'Async video interviews — send questions & review answers',
      color: 'from-red-500/10 to-orange-500/10 border-red-500/20',
      iconColor: 'text-red-500',
    },
    {
      id: 'documents' as HRSubSection,
      icon: FileSignature,
      labelHe: 'מסמכים לחתימה',
      labelEn: 'eSignature Documents',
      descHe: 'שלח מסמכים לחתימה דיגיטלית – חוזים, NDA, הצעות',
      descEn: 'Send documents for digital signing – contracts, NDAs, offers',
      color: 'from-indigo-500/10 to-blue-500/10 border-indigo-500/20',
      iconColor: 'text-indigo-500',
    },
    {
      id: 'offer-templates' as HRSubSection,
      icon: FileText,
      labelHe: 'תבניות הצעות',
      labelEn: 'Offer Templates',
      descHe: 'ספריית תבניות מוכנות להצעות עבודה, NDA וחוזים',
      descEn: 'Ready-made templates for offers, NDAs & contracts',
      color: 'from-teal-500/10 to-emerald-500/10 border-teal-500/20',
      iconColor: 'text-teal-500',
    },
    {
      id: 'compliance' as HRSubSection,
      icon: Shield,
      labelHe: 'ציות ושוויון הזדמנויות',
      labelEn: 'EEO Compliance',
      descHe: 'דוחות OFCCP, שוויון הזדמנויות ומניעת הטיה בגיוס',
      descEn: 'OFCCP reports, equal opportunity & hiring bias prevention',
      color: 'from-slate-500/10 to-gray-500/10 border-slate-500/20',
      iconColor: 'text-slate-500',
    },
    {
      id: 'predictive' as HRSubSection,
      icon: TrendingUp,
      labelHe: 'תחזיות גיוס',
      labelEn: 'Hiring Forecasts',
      descHe: 'חיזוי צרכי גיוס, זמני מילוי משרות ועלויות',
      descEn: 'Predict hiring needs, time-to-fill & costs',
      color: 'from-cyan-500/10 to-sky-500/10 border-cyan-500/20',
      iconColor: 'text-cyan-500',
    },
    {
      id: 'nurture-campaigns' as HRSubSection,
      icon: Mail,
      labelHe: 'קמפיינים אוטומטיים',
      labelEn: 'Nurture Campaigns',
      descHe: 'רצפי מיילים אוטומטיים לטיפוח מועמדים פאסיביים',
      descEn: 'Automated email sequences for passive candidate nurturing',
      color: 'from-fuchsia-500/10 to-pink-500/10 border-fuchsia-500/20',
      iconColor: 'text-fuchsia-500',
    },
    {
      id: 'multi-channel' as HRSubSection,
      icon: MessageSquare,
      labelHe: 'SMS ו-WhatsApp',
      labelEn: 'SMS & WhatsApp',
      descHe: 'תקשורת רב-ערוצית עם מועמדים — SMS, WhatsApp ומייל',
      descEn: 'Multi-channel candidate messaging — SMS, WhatsApp & email',
      color: 'from-lime-500/10 to-green-500/10 border-lime-500/20',
      iconColor: 'text-lime-600',
    },
    {
      id: 'external-sourcing' as HRSubSection,
      icon: Search,
      labelHe: 'סורסינג חיצוני',
      labelEn: 'External Sourcing',
      descHe: 'חפש מועמדים ב-LinkedIn, GitHub, StackOverflow ועוד',
      descEn: 'Source candidates from LinkedIn, GitHub, StackOverflow & more',
      color: 'from-amber-500/10 to-yellow-500/10 border-amber-500/20',
      iconColor: 'text-amber-600',
    },
    {
      id: 'custom-dashboard' as HRSubSection,
      icon: Blocks,
      labelHe: 'דשבורד מותאם אישית',
      labelEn: 'Custom Dashboard',
      descHe: 'בנה דשבורד משלך עם ווידג\'טים לפי בחירה',
      descEn: 'Build your own dashboard with customizable widgets',
      color: 'from-rose-500/10 to-red-500/10 border-rose-500/20',
      iconColor: 'text-rose-500',
    },
  ];

  const renderSubSection = () => {
    switch (subSection) {
      case 'analytics':
        return <PipelineAnalytics />;
      case 'predictive':
        return <PredictiveAnalytics />;
      case 'talent-pool':
        return <TalentPoolList />;
      case 'approvals':
        return <ApprovalInbox />;
      case 'job-alerts':
        return <JobAlertSetup />;
      case 'referrals':
        return <ReferralPanel />;
      case 'surveys':
        return <SurveyResults />;
      case 'video-interviews':
        return <VideoInterviewList />;
      case 'documents':
        return <DocumentsPage onBack={() => setSubSection('hub')} />;
      case 'offer-templates':
        return <OfferTemplatesLibrary />;
      case 'compliance':
        return <ComplianceDashboard />;
      case 'nurture-campaigns':
        return <NurtureCampaignBuilder />;
      case 'external-sourcing':
        return <ExternalSourcingPanel />;
      case 'multi-channel':
        return <MultiChannelInbox />;
      case 'custom-dashboard':
        return <CustomDashboardBuilder />;
      default:
        return null;
    }
  };

  if (subSection !== 'hub') {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => setSubSection('hub')}
        >
          <BackIcon className="w-4 h-4" />
          {isHebrew ? 'חזרה לכלי HR' : 'Back to HR Tools'}
        </Button>
        {renderSubSection()}
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isHebrew ? 'rtl' : 'ltr'} data-tour="hr-tools-hub">
      {/* Header */}
      <div className="flex items-center gap-3">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground"
          >
            <BackIcon className="w-5 h-5" />
          </Button>
        )}
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <LayoutGrid className="w-6 h-6 text-primary" />
            {isHebrew ? 'כלי HR מתקדמים' : 'HR Power Tools'}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isHebrew
              ? 'כל הכלים המקצועיים לניהול גיוס במקום אחד'
              : 'All professional recruitment tools in one place'}
          </p>
        </div>
      </div>

      {/* First-use tip */}
      {showTip && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{isHebrew ? 'טיפ: התחל מאנליטיקות הגיוס' : 'Tip: Start with Pipeline Analytics'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isHebrew
                ? 'לחץ על כרטיס כדי לפתוח כלי. אנליטיקות הגיוס נותנות תמונה כוללת של תהליך הגיוס שלך.'
                : 'Click a card to open a tool. Pipeline Analytics gives an overview of your entire recruitment process.'}
            </p>
          </div>
          <button
            onClick={() => { setShowTip(false); localStorage.setItem('hr-tools-tip-dismissed', 'true'); }}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tools Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((tool) => (
          <Card
            key={tool.id}
            className={`bg-gradient-to-br ${tool.color} border cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md`}
            onClick={() => setSubSection(tool.id)}
          >
            <CardContent className="p-5 flex items-start gap-4">
              <div className={`p-3 rounded-xl bg-background/50 shrink-0`}>
                <tool.icon className={`w-6 h-6 ${tool.iconColor}`} />
              </div>
              <div>
                <h3 className="font-semibold text-base leading-tight">
                  {isHebrew ? tool.labelHe : tool.labelEn}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {isHebrew ? tool.descHe : tool.descEn}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
