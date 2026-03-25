import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { PipelineAnalytics } from '@/components/analytics/PipelineAnalytics';
import { TalentPoolList } from '@/components/talent-pool/TalentPoolList';
import { ApprovalInbox } from '@/components/approvals/ApprovalInbox';
import { JobAlertSetup } from '@/components/alerts/JobAlertSetup';
import { ReferralPanel } from '@/components/referrals/ReferralPanel';
import { SurveyResults } from '@/components/surveys/SurveyResults';
import { DocumentsPage } from '@/components/documents/DocumentsPage';
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
} from 'lucide-react';


type HRSubSection =
  | 'hub'
  | 'analytics'
  | 'talent-pool'
  | 'approvals'
  | 'job-alerts'
  | 'referrals'
  | 'surveys'
  | 'documents';

interface HRToolsHubProps {
  onBack?: () => void;
}

export function HRToolsHub({ onBack }: HRToolsHubProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [subSection, setSubSection] = useState<HRSubSection>('hub');

  const BackIcon = isHebrew ? ArrowRight : ArrowLeft;

  const tools = [
    {
      id: 'analytics' as HRSubSection,
      icon: BarChart3,
      labelHe: 'אנליטיקות גיוס',
      labelEn: 'Pipeline Analytics',
      descHe: 'Funnel, conversion rates, מקורות ומדדי זמן',
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
      descHe: 'NPS, דירוגים ומשוב אנונימי מהתהליך',
      descEn: 'NPS, ratings & anonymous process feedback',
      color: 'from-yellow-500/10 to-amber-500/10 border-yellow-500/20',
      iconColor: 'text-yellow-500',
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
  ];

  const renderSubSection = () => {
    switch (subSection) {
      case 'analytics':
        return <PipelineAnalytics />;
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
      case 'documents':
        return <DocumentsPage onBack={() => setSubSection('hub')} />;
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
