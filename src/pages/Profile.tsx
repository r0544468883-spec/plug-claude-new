import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout, DashboardSection } from '@/components/dashboard/DashboardLayout';
import { VouchSection } from '@/components/vouch/VouchSection';
import { GiveVouchDialog } from '@/components/vouch/GiveVouchDialog';
import { ResumeEnhancer } from '@/components/documents/ResumeEnhancer';
import { JobPreferencesSettings } from '@/components/settings/JobPreferencesSettings';
import { PersonalCardEditor } from '@/components/profile/PersonalCardEditor';
import { PhotoUpload } from '@/components/profile/PhotoUpload';
import { DocumentsManager } from '@/components/profile/DocumentsManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';

export default function Profile() {
  const { user, profile, role, isLoading } = useAuth();
  const { language } = useLanguage();
  const [currentSection, setCurrentSection] = useState<DashboardSection>('overview');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url || null);
  const isHebrew = language === 'he';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const getRoleLabel = () => {
    switch (role) {
      case 'job_seeker': return isHebrew ? 'מחפש עבודה' : 'Job Seeker';
      case 'freelance_hr': return isHebrew ? 'HR פרילנס' : 'Freelance HR';
      case 'inhouse_hr': return isHebrew ? 'HR פנים-ארגוני' : 'In-House HR';
      case 'company_employee': return isHebrew ? 'עובד חברה' : 'Company Employee';
      default: return '';
    }
  };

  const getRoleBadgeVariant = () => {
    switch (role) {
      case 'job_seeker': return 'default';
      case 'freelance_hr': return 'secondary';
      case 'inhouse_hr': return 'outline';
      default: return 'default';
    }
  };

  return (
    <DashboardLayout currentSection={currentSection} onSectionChange={setCurrentSection}>
      <div className="max-w-4xl mx-auto space-y-6" dir={isHebrew ? 'rtl' : 'ltr'}>
        {/* Personal Card (public profile) - for job seekers */}
        {role === 'job_seeker' && <PersonalCardEditor />}

        {/* Photo Upload + Role Badge for non-job seekers */}
        {role !== 'job_seeker' && (
          <Card className="bg-card border-border">
            <CardContent className="p-6 flex flex-col items-center gap-4">
              <PhotoUpload
                userId={user.id}
                currentAvatarUrl={avatarUrl}
                userName={profile?.full_name || 'User'}
                onUpload={(url) => setAvatarUrl(url)}
                size="lg"
              />
              <div className="text-center">
                <h2 className="text-xl font-semibold">{profile?.full_name || 'User'}</h2>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
                <Badge variant={getRoleBadgeVariant()} className="mt-2">
                  <Briefcase className="w-3 h-3 me-1" />
                  {getRoleLabel()}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resume AI Enhance - Only for job seekers */}
        {role === 'job_seeker' && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                {isHebrew ? 'שיפור קורות חיים עם AI' : 'AI Resume Enhancement'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResumeEnhancer />
            </CardContent>
          </Card>
        )}

        {/* Career Preferences Section - Only for job seekers */}
        {role === 'job_seeker' && <JobPreferencesSettings />}

        {/* Documents Manager (CVs + Cover Letters) - Only for job seekers */}
        {role === 'job_seeker' && <DocumentsManager />}

        {/* Vouches Section */}
        {user && profile && (
          <div className="space-y-3">
            <div className={`flex ${isHebrew ? 'justify-start' : 'justify-end'}`}>
              <GiveVouchDialog />
            </div>
            <VouchSection
              userId={user.id}
              userName={profile.full_name || 'User'}
              showGiveVouch={false}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
