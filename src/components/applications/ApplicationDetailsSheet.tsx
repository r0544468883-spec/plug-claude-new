import { useState, useEffect, useRef } from 'react';
import { RejectionFeedbackDialog } from './RejectionFeedbackDialog';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { 
  MapPin, 
  Briefcase, 
  Clock, 
  Building2, 
  ExternalLink, 
  Save, 
  XCircle,
  Loader2,
  Calendar,
  FileText,
  Sparkles,
  Globe,
  Linkedin,
  Github,
  Phone,
  MessageSquare,
  User,
  Download,
  Users,
  Mail
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { InterviewScheduler } from './InterviewScheduler';
import { HomeAssignmentTab } from './HomeAssignmentTab';
import { ApplicationPlugChat } from './ApplicationPlugChat';
import { TeamNotesTab } from './TeamNotesTab';
import { StageProgressBar } from './StageProgressBar';
import MatchScoreCircle from './MatchScoreCircle';
import { CandidateVouchBadge } from '@/components/vouch/CandidateVouchBadge';
import { CompanyRatingBadge } from '@/components/vouch/CompanyRatingBadge';
import { CompanyVouchModal } from '@/components/vouch/CompanyVouchModal';
import { SendMessageDialog } from '@/components/messaging/SendMessageDialog';
import { EmailThreadView } from '@/components/email/EmailThreadView';
import { ComposeEmailDialog } from '@/components/email/ComposeEmailDialog';
import { Undo2, Heart } from 'lucide-react';
import { buildEmailWebLink } from '@/lib/email-utils';

interface ApplicationDetails {
  id: string;
  status: string;
  current_stage: string;
  match_score: number | null;
  created_at: string;
  notes: string | null;
  candidate_id?: string;
  job: {
    id: string;
    title: string;
    location: string | null;
    job_type: string | null;
    description: string | null;
    requirements: string | null;
    source_url: string | null;
    salary_range: string | null;
    company: {
      id: string;
      name: string;
      logo_url: string | null;
    } | null;
  } | null;
}

interface ApplicationDetailsSheetProps {
  application: ApplicationDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

function RejectionBanner({ applicationId, isRTL, onRevert }: { applicationId: string; isRTL: boolean; onRevert: () => void }) {
  const [reverting, setReverting] = useState(false);

  const { data: rejectionEmail } = useQuery({
    queryKey: ['rejection-email', applicationId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('application_emails')
        .select('id, provider_msg_id, provider, previous_stage, subject')
        .eq('application_id', applicationId)
        .eq('ai_classification', 'rejection')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      return data;
    },
    enabled: !!applicationId,
  });

  const emailLink = rejectionEmail?.provider_msg_id
    ? buildEmailWebLink(rejectionEmail.provider || 'gmail', rejectionEmail.provider_msg_id)
    : null;

  const handleRevert = async () => {
    if (!rejectionEmail?.previous_stage) return;
    setReverting(true);
    try {
      await supabase
        .from('applications')
        .update({
          current_stage: rejectionEmail.previous_stage,
          status: 'active',
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', applicationId);

      await (supabase as any)
        .from('application_emails')
        .update({ auto_updated: false })
        .eq('id', rejectionEmail.id);

      toast.success(isRTL ? 'העדכון בוטל בהצלחה' : 'Auto-update reverted');
      onRevert();
    } catch {
      toast.error(isRTL ? 'שגיאה בביטול' : 'Error reverting');
    } finally {
      setReverting(false);
    }
  };

  return (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Heart className="w-4 h-4 text-amber-600" />
        <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
          {isRTL ? 'תהליך זה הסתיים, אבל הדרך ממשיכה' : 'This process ended, but the journey continues'}
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        {isRTL
          ? 'כל דחייה מקרבת אותך להזדמנות הנכונה. זה חלק טבעי מחיפוש עבודה.'
          : 'Every rejection brings you closer to the right opportunity.'}
      </p>
      <div className="flex items-center gap-3 mt-1">
        {emailLink && (
          <a
            href={emailLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            {isRTL ? 'צפה במייל המקורי' : 'View original email'}
          </a>
        )}
        {rejectionEmail?.previous_stage && (
          <button
            onClick={handleRevert}
            disabled={reverting}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <Undo2 className="w-3 h-3" />
            {isRTL ? 'זה לא דחייה? בטל עדכון' : 'Not a rejection? Undo'}
          </button>
        )}
      </div>
    </div>
  );
}

export function ApplicationDetailsSheet({
  application,
  open,
  onOpenChange,
  onUpdate,
}: ApplicationDetailsSheetProps) {
  const { language } = useLanguage();
  const { role, user } = useAuth();
  const navigate = useNavigate();
  const isRTL = language === 'he';
  const isRecruiter = role === 'freelance_hr' || role === 'inhouse_hr';

  const [currentStage, setCurrentStage] = useState(application?.current_stage || 'applied');
  const [showRejectionFeedback, setShowRejectionFeedback] = useState(false);
  const savedApplicationId = useRef<string | null>(null);
  const [notes, setNotes] = useState(application?.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Company Vouch modal state
  const [showVouchModal, setShowVouchModal] = useState(false);
  const [vouchTrigger, setVouchTrigger] = useState<{
    type: 'time_based' | 'stage_change' | 'completion';
    stage?: string;
  } | null>(null);

  // Fetch candidate profile for recruiters
  const { data: candidateProfile } = useQuery({
    queryKey: ['candidate-profile', application?.candidate_id],
    queryFn: async () => {
      if (!application?.candidate_id) return null;
      
      // Use profiles_secure view for recruiter access to candidate profiles
      const { data, error } = await supabase
        .from('profiles_secure')
        .select('*')
        .eq('user_id', application.candidate_id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!application?.candidate_id && isRecruiter,
  });

  // Fetch candidate resume
  const { data: candidateResume } = useQuery({
    queryKey: ['candidate-resume', application?.candidate_id],
    queryFn: async () => {
      if (!application?.candidate_id) return null;
      
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('owner_id', application.candidate_id)
        .eq('doc_type', 'resume')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!application?.candidate_id && isRecruiter,
  });

  // Reset state when application changes
  useEffect(() => {
    if (application) {
      setCurrentStage(application.current_stage);
      setNotes(application.notes || '');
      setHasChanges(false);
    }
  }, [application]);

  // Track changes
  useEffect(() => {
    if (application) {
      const stageChanged = currentStage !== application.current_stage;
      const notesChanged = notes !== (application.notes || '');
      setHasChanges(stageChanged || notesChanged);
    }
  }, [currentStage, notes, application]);

  // Stages that trigger vouch prompts
  const VOUCH_STAGES = ['interview', 'technical', 'offer'];
  const COMPLETION_STAGES = ['hired', 'rejected', 'withdrawn'];

  const handleStageChange = (stage: string) => {
    setCurrentStage(stage);
  };

  const handleSave = async () => {
    if (!application) return;

    try {
      setIsSaving(true);

      const oldStage = application.current_stage;
      const oldNotes = application.notes || '';

      const updateData: any = {
        current_stage: currentStage,
        notes: notes || null,
        last_interaction: new Date().toISOString(),
      };

      // If rejected or withdrawn, update status too
      if (currentStage === 'rejected' || currentStage === 'withdrawn') {
        updateData.status = currentStage;
      } else if (currentStage === 'hired') {
        updateData.status = 'hired';
      } else {
        updateData.status = 'active';
      }

      const { error } = await supabase
        .from('applications')
        .update(updateData)
        .eq('id', application.id);

      if (error) throw error;

      // Add timeline events for changes
      const timelineEvents = [];

      if (currentStage !== oldStage) {
        timelineEvents.push({
          application_id: application.id,
          event_type: 'stage_change',
          old_value: oldStage,
          new_value: currentStage,
        });
      }

      if (notes !== oldNotes && notes.trim()) {
        timelineEvents.push({
          application_id: application.id,
          event_type: 'note_added',
          new_value: notes.substring(0, 100),
        });
      }

      if (timelineEvents.length > 0) {
        await supabase.from('application_timeline').insert(timelineEvents);
      }

      toast.success(isRTL ? 'השינויים נשמרו' : 'Changes saved');
      setHasChanges(false);
      onUpdate();

      // Show rejection feedback dialog for candidates (not recruiters)
      if (currentStage === 'rejected' && currentStage !== oldStage && !isRecruiter) {
        savedApplicationId.current = application.id;
        setShowRejectionFeedback(true);
      }

      // Check for auto-send email templates on stage change
      if (currentStage !== oldStage && isRecruiter) {
        try {
          const { data: autoTemplates } = await (supabase as any)
            .from('email_templates')
            .select('*')
            .eq('trigger_stage', currentStage)
            .eq('auto_send', true)
            .eq('is_active', true)
            .eq('created_by', user?.id);

          if (autoTemplates?.length > 0 && candidateProfile?.email) {
            const template = autoTemplates[0];
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;

            const personalizedBody = template.body
              .replace(/\{candidate_name\}/g, candidateProfile.full_name || '')
              .replace(/\{job_title\}/g, job?.title || '')
              .replace(/\{company_name\}/g, company?.name || '');
            const personalizedSubject = template.subject
              .replace(/\{candidate_name\}/g, candidateProfile.full_name || '')
              .replace(/\{job_title\}/g, job?.title || '')
              .replace(/\{company_name\}/g, company?.name || '');

            const emailRes = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email-via-user`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                  'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                },
                body: JSON.stringify({
                  to: candidateProfile.email,
                  subject: personalizedSubject,
                  body_html: `<div dir="${isRTL ? 'rtl' : 'ltr'}" style="font-family: Arial, sans-serif;">${personalizedBody.replace(/\n/g, '<br/>')}</div>`,
                  application_id: application.id,
                }),
              }
            );

            if (emailRes.ok) {
              toast.success(isRTL ? 'מייל אוטומטי נשלח למועמד' : 'Auto-email sent to candidate');
            }
          }
        } catch (emailErr) {
          console.error('Auto-send email error:', emailErr);
        }
      }

      // Check if we should show vouch modal for stage changes
      if (currentStage !== oldStage && company?.id) {
        if (COMPLETION_STAGES.includes(currentStage)) {
          setVouchTrigger({ type: 'completion', stage: currentStage });
          setShowVouchModal(true);
        } else if (VOUCH_STAGES.includes(currentStage)) {
          setVouchTrigger({ type: 'stage_change', stage: currentStage });
          setShowVouchModal(true);
        }
      }
    } catch (error) {
      console.error('Error saving application:', error);
      toast.error(isRTL ? 'שגיאה בשמירה' : 'Error saving changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleWithdraw = async () => {
    if (!application) return;

    try {
      setIsSaving(true);

      const { error } = await supabase
        .from('applications')
        .update({
          status: 'withdrawn',
          current_stage: 'withdrawn',
          last_interaction: new Date().toISOString(),
        })
        .eq('id', application.id);

      if (error) throw error;

      toast.success(isRTL ? 'המועמדות בוטלה' : 'Application withdrawn');
      onUpdate();
      
      // Show vouch modal for withdrawal
      if (company?.id) {
        setVouchTrigger({ type: 'completion', stage: 'withdrawn' });
        setShowVouchModal(true);
      } else {
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error withdrawing application:', error);
      toast.error(isRTL ? 'שגיאה בביטול' : 'Error withdrawing');
    } finally {
      setIsSaving(false);
    }
  };

  if (!application) return null;

  const job = application.job;
  const company = job?.company;
  const timeAgo = formatDistanceToNow(new Date(application.created_at), {
    addSuffix: true,
    locale: isRTL ? he : enUS,
  });

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side={isRTL ? 'left' : 'right'} 
        className="w-full sm:max-w-lg overflow-y-auto"
      >
        <SheetHeader className="text-start" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="flex items-start gap-4">
            {/* Company Logo or Match Score */}
            {application.match_score ? (
              <MatchScoreCircle score={application.match_score} size="lg" />
            ) : (
              <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl mb-1">
                {job?.title || (isRTL ? 'משרה לא ידועה' : 'Unknown Job')}
              </SheetTitle>
              <p className="text-primary font-medium">
                {company?.name || (isRTL ? 'חברה לא ידועה' : 'Unknown Company')}
              </p>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
          {/* Meta Info */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {job?.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {job.location}
              </span>
            )}
            {job?.job_type && (
              <span className="flex items-center gap-1">
                <Briefcase className="h-4 w-4" />
                {job.job_type}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {timeAgo}
            </span>
          </div>

          {/* Company Rating (from PLUG community) */}
          {company?.id && (
            <CompanyRatingBadge 
              companyId={company.id} 
              companyName={company.name}
              showDetails={true}
            />
          )}

          {/* Candidate Vouches Badge */}
          <CandidateVouchBadge 
            candidateId={application.candidate_id || ''} 
            candidateName={candidateProfile?.full_name}
          />

          {/* Candidate Profile Section (for recruiters) */}
          {isRecruiter && candidateProfile && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {isRTL ? 'פרופיל מועמד' : 'Candidate Profile'}
                </h3>
                
                <div className="flex items-center gap-4">
                  <Avatar className="w-14 h-14">
                    <AvatarImage src={candidateProfile.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-lg">
                      {candidateProfile.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{candidateProfile.full_name}</p>
                    <p className="text-sm text-muted-foreground">{candidateProfile.email}</p>
                  </div>
                </div>

                {/* Bio */}
                {candidateProfile.bio && (
                  <p className="text-sm text-muted-foreground">
                    {candidateProfile.bio}
                  </p>
                )}

                {/* Professional Links */}
                <div className="flex flex-wrap gap-2">
                  {candidateProfile.portfolio_url && (
                    <a
                      href={candidateProfile.portfolio_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-muted">
                        <Globe className="h-3 w-3" />
                        Portfolio
                      </Badge>
                    </a>
                  )}
                  {candidateProfile.linkedin_url && (
                    <a
                      href={candidateProfile.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-muted">
                        <Linkedin className="h-3 w-3" />
                        LinkedIn
                      </Badge>
                    </a>
                  )}
                  {candidateProfile.github_url && (
                    <a
                      href={candidateProfile.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-muted">
                        <Github className="h-3 w-3" />
                        GitHub
                      </Badge>
                    </a>
                  )}
                </div>

                {/* Resume Download */}
                {candidateResume && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={async () => {
                      const { data } = await supabase.storage
                        .from('documents')
                        .createSignedUrl(candidateResume.file_path, 60);
                      if (data?.signedUrl) {
                        window.open(data.signedUrl, '_blank');
                      }
                    }}
                  >
                    <Download className="h-4 w-4" />
                    {isRTL ? 'הורד קורות חיים' : 'Download Resume'}
                  </Button>
                )}

                {/* Contact Buttons */}
                <div className="flex gap-2 flex-wrap">
                  {/* View Full Profile Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      onOpenChange(false);
                      navigate(`/candidate/${application.candidate_id}`);
                    }}
                  >
                    <User className="h-4 w-4" />
                    {isRTL ? 'פרופיל מלא' : 'Full Profile'}
                  </Button>

                  {candidateProfile.phone && candidateProfile.allow_recruiter_contact && (
                    <Button
                      variant="default"
                      size="sm"
                      className="gap-2 bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        const phone = candidateProfile.phone?.replace(/[^0-9+]/g, '');
                        const message = encodeURIComponent(
                          isRTL 
                            ? `שלום ${candidateProfile.full_name}, ראיתי את המועמדות שלך למשרת ${job?.title} ואשמח לשוחח איתך.`
                            : `Hi ${candidateProfile.full_name}, I saw your application for ${job?.title} and would love to chat with you.`
                        );
                        window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
                      }}
                    >
                      <Phone className="h-4 w-4" />
                      WhatsApp
                    </Button>
                  )}
                  
                  <SendMessageDialog
                    toUserId={application.candidate_id || ''}
                    toUserName={candidateProfile.full_name}
                    relatedJobId={job?.id}
                    relatedApplicationId={application.id}
                    trigger={
                      <Button variant="outline" size="sm" className="gap-2">
                        <MessageSquare className="h-4 w-4" />
                        {isRTL ? 'שלח הודעה' : 'Send Message'}
                      </Button>
                    }
                  />

                  <ComposeEmailDialog
                    defaultTo={candidateProfile.email || ''}
                    applicationId={application.id}
                    candidateName={candidateProfile.full_name}
                    jobTitle={job?.title}
                    companyName={company?.name}
                    trigger={
                      <Button variant="outline" size="sm" className="gap-2">
                        <Mail className="h-4 w-4" />
                        {isRTL ? 'שלח מייל' : 'Send Email'}
                      </Button>
                    }
                  />
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Rejection banner — empathetic UX with email link + undo */}
          {currentStage === 'rejected' && !isRecruiter && (
            <RejectionBanner
              applicationId={application.id}
              isRTL={isRTL}
              onRevert={() => {
                setCurrentStage('applied');
                onUpdate();
              }}
            />
          )}

          {/* Tabs for Status, Interviews, Home Assignment, Team Notes, Plug */}
          <Tabs defaultValue="status" className="w-full">
            <TabsList className={`grid w-full ${isRecruiter ? 'grid-cols-6' : 'grid-cols-5'}`}>
              <TabsTrigger value="status" className="text-xs">
                {isRTL ? 'סטטוס' : 'Status'}
              </TabsTrigger>
              <TabsTrigger value="emails" className="text-xs">
                <Mail className="h-3 w-3 mr-1" />
                {isRTL ? 'מיילים' : 'Emails'}
              </TabsTrigger>
              <TabsTrigger value="interviews" className="text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                {isRTL ? 'ראיונות' : 'Interviews'}
              </TabsTrigger>
              <TabsTrigger value="assignment" className="text-xs">
                <FileText className="h-3 w-3 mr-1" />
                {isRTL ? 'מטלה' : 'Assignment'}
              </TabsTrigger>
              {isRecruiter && (
                <TabsTrigger value="team" className="text-xs">
                  <Users className="h-3 w-3 mr-1" />
                  {isRTL ? 'צוות' : 'Team'}
                </TabsTrigger>
              )}
              <TabsTrigger value="plug" className="text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                Plug
              </TabsTrigger>
            </TabsList>

            <TabsContent value="status" className="space-y-4 mt-4">
              {/* Stage Progress Bar */}
              <div>
                <h3 className="text-sm font-semibold mb-2">
                  {isRTL ? 'שלב במועמדות' : 'Application Stage'}
                </h3>
                <StageProgressBar
                  currentStage={currentStage}
                  onStageChange={handleStageChange}
                  disabled={isSaving}
                />
              </div>

              {/* Notes */}
              <div>
                <h3 className="text-sm font-semibold mb-2">
                  {isRTL ? 'הערות' : 'Notes'}
                </h3>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isRTL ? 'הוסף הערות על המועמדות...' : 'Add notes about this application...'}
                  className="min-h-[100px] resize-none"
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              </div>
            </TabsContent>

            <TabsContent value="emails" className="mt-4">
              <EmailThreadView
                applicationId={application.id}
                jobTitle={job?.title}
                companyName={company?.name}
                candidateName={isRecruiter ? candidateProfile?.full_name : undefined}
                candidateEmail={isRecruiter ? candidateProfile?.email : undefined}
              />
            </TabsContent>

            <TabsContent value="interviews" className="mt-4">
              <InterviewScheduler
                applicationId={application.id}
                onInterviewScheduled={onUpdate}
              />
            </TabsContent>

            <TabsContent value="assignment" className="mt-4">
              <HomeAssignmentTab applicationId={application.id} />
            </TabsContent>

            {isRecruiter && (
              <TabsContent value="team" className="mt-4">
                <TeamNotesTab
                  applicationId={application.id}
                  jobId={job?.id || ''}
                />
              </TabsContent>
            )}

            <TabsContent value="plug" className="mt-4">
              <ApplicationPlugChat 
                applicationId={application.id}
                context={{
                  jobTitle: job?.title || '',
                  companyName: company?.name || '',
                  status: currentStage,
                  matchScore: application.match_score,
                  location: job?.location || null,
                  jobType: job?.job_type || null,
                }}
              />
            </TabsContent>
          </Tabs>

          {/* Job Description */}
          {job?.description && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold mb-2">
                  {isRTL ? 'תיאור המשרה' : 'Job Description'}
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6">
                  {job.description}
                </p>
              </div>
            </>
          )}

          {/* Source URL */}
          {job?.source_url && (
            <a
              href={job.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              {isRTL ? 'צפה במשרה המקורית' : 'View Original Job Posting'}
            </a>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="flex gap-3 pb-4">
            <Button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="flex-1"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isRTL ? 'שמור שינויים' : 'Save Changes'}
                </>
              )}
            </Button>
            <Button
              variant="destructive"
              onClick={handleWithdraw}
              disabled={isSaving || currentStage === 'withdrawn'}
            >
              <XCircle className="h-4 w-4 mr-2" />
              {isRTL ? 'בטל מועמדות' : 'Withdraw'}
            </Button>
          </div>
        </div>

        {/* Company Vouch Modal */}
        {company?.id && vouchTrigger && (
          <CompanyVouchModal
            open={showVouchModal}
            onOpenChange={(open) => {
              setShowVouchModal(open);
              if (!open) {
                setVouchTrigger(null);
              }
            }}
            applicationId={application.id}
            companyId={company.id}
            companyName={company.name}
            triggerType={vouchTrigger.type}
            triggerStage={vouchTrigger.stage}
            onComplete={() => {
              setShowVouchModal(false);
              setVouchTrigger(null);
            }}
          />
        )}
      </SheetContent>
    </Sheet>

    {showRejectionFeedback && savedApplicationId.current && (
      <RejectionFeedbackDialog
        applicationId={savedApplicationId.current}
        open={showRejectionFeedback}
        onClose={() => setShowRejectionFeedback(false)}
      />
    )}
    </>
  );
}
