import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDistanceToNow, format } from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { SendMessageDialog } from '@/components/messaging/SendMessageDialog';
import { VouchCard } from '@/components/vouch/VouchCard';
import { ApplicationDetailsSheet } from '@/components/applications/ApplicationDetailsSheet';
import { PersonalCard } from '@/components/profile/PersonalCard';

import {
  ArrowLeft,
  ArrowRight,
  Heart,
  Globe,
  Linkedin,
  Github,
  Phone,
  Mail,
  MessageSquare,
  User,
  Briefcase,
  FileText,
  Download,
  Calendar,
  Building2,
  Eye,
  Clock,
  Star,
  StickyNote,
  Save,
  Loader2,
  FileDown,
  Video,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Stage colors for application history
const stageColors: Record<string, string> = {
  applied: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  screening: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  interview: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  offer: 'bg-green-500/10 text-green-500 border-green-500/20',
  hired: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
  withdrawn: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
};

const stageLabels: Record<string, { en: string; he: string }> = {
  applied: { en: 'Applied', he: 'הוגש' },
  screening: { en: 'Screening', he: 'סינון' },
  interview: { en: 'Interview', he: 'ראיון' },
  offer: { en: 'Offer', he: 'הצעה' },
  hired: { en: 'Hired', he: 'התקבל' },
  rejected: { en: 'Rejected', he: 'נדחה' },
  withdrawn: { en: 'Withdrawn', he: 'בוטל' },
};

export default function CandidateProfile() {
  const { candidateId } = useParams<{ candidateId: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const isHebrew = language === 'he';
  const isRecruiter = role === 'freelance_hr' || role === 'inhouse_hr';

  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [applicationSheetOpen, setApplicationSheetOpen] = useState(false);
  const [internalNote, setInternalNote] = useState('');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Fetch candidate profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['candidate-full-profile', candidateId],
    queryFn: async () => {
      if (!candidateId) return null;
      
      // Use profiles_secure view for recruiter access to candidate profiles
      const { data, error } = await supabase
        .from('profiles_secure')
        .select('*')
        .eq('user_id', candidateId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!candidateId && isRecruiter,
  });

  // Fetch career preferences (job fields, roles, experience level)
  const { data: careerPrefs } = useQuery({
    queryKey: ['candidate-career-prefs', candidateId, profile?.preferred_fields, profile?.preferred_roles, profile?.preferred_experience_level_id],
    queryFn: async () => {
      if (!profile) return null;

      const [fieldsResult, rolesResult, expResult] = await Promise.all([
        profile.preferred_fields?.length 
          ? supabase.from('job_fields').select('id, name_en, name_he').in('id', profile.preferred_fields)
          : { data: [] },
        profile.preferred_roles?.length
          ? supabase.from('job_roles').select('id, name_en, name_he').in('id', profile.preferred_roles)
          : { data: [] },
        profile.preferred_experience_level_id
          ? supabase.from('experience_levels').select('id, name_en, name_he').eq('id', profile.preferred_experience_level_id).maybeSingle()
          : { data: null },
      ]);

      return {
        fields: fieldsResult.data || [],
        roles: rolesResult.data || [],
        experienceLevel: expResult.data,
      };
    },
    enabled: !!profile,
  });

  // Fetch applications history (only for recruiter's jobs)
  const { data: applications = [], refetch: refetchApplications } = useQuery({
    queryKey: ['candidate-applications-history', candidateId, user?.id],
    queryFn: async () => {
      if (!candidateId || !user?.id) return [];

      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          current_stage,
          match_score,
          created_at,
          updated_at,
          notes,
          candidate_id,
          job:jobs (
            id,
            title,
            location,
            job_type,
            description,
            requirements,
            source_url,
            salary_range,
            company:companies (
              id,
              name,
              logo_url
            )
          )
        `)
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!candidateId && !!user?.id && isRecruiter,
  });

  // Fetch documents (resume and home assignments)
  const { data: documents = [] } = useQuery({
    queryKey: ['candidate-documents', candidateId],
    queryFn: async () => {
      if (!candidateId) return [];

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('owner_id', candidateId)
        .in('doc_type', ['resume', 'cover_letter'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!candidateId && isRecruiter,
  });

  // Fetch home assignments for recruiter's job applications
  const { data: homeAssignments = [] } = useQuery({
    queryKey: ['candidate-home-assignments', candidateId, applications],
    queryFn: async () => {
      if (!applications.length) return [];
      
      const applicationIds = applications.map(a => a.id);
      
      const { data, error } = await supabase
        .from('home_assignments')
        .select('*')
        .in('application_id', applicationIds)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: applications.length > 0 && isRecruiter,
  });

  // Fetch vouches
  const { data: vouches = [] } = useQuery({
    queryKey: ['candidate-vouches', candidateId],
    queryFn: async () => {
      if (!candidateId) return [];

      const { data, error } = await supabase
        .from('vouches')
        .select(`
          id,
          from_user_id,
          vouch_type,
          relationship,
          message,
          skills,
          created_at,
          is_public
        `)
        .eq('to_user_id', candidateId)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for vouch senders (use profiles_secure for safety)
      if (data?.length) {
        const senderIds = [...new Set(data.map(v => v.from_user_id))];
        const { data: profiles } = await supabase
          .from('profiles_secure')
          .select('user_id, full_name, avatar_url')
          .in('user_id', senderIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        
        return data.map(vouch => ({
          ...vouch,
          from_profile: profileMap.get(vouch.from_user_id) || null,
        }));
      }

      return data || [];
    },
    enabled: !!candidateId && isRecruiter,
  });

  // Fetch recruiter's internal note
  const { data: existingNote } = useQuery({
    queryKey: ['recruiter-candidate-note', user?.id, candidateId],
    queryFn: async () => {
      if (!candidateId || !user?.id) return null;

      const { data, error } = await supabase
        .from('recruiter_candidate_notes')
        .select('*')
        .eq('recruiter_id', user.id)
        .eq('candidate_id', candidateId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!candidateId && !!user?.id && isRecruiter,
  });

  // Fetch video signed URL if needed
  useEffect(() => {
    const fetchVideoUrl = async () => {
      const videoPath = (profile as any)?.intro_video_url;
      if (!videoPath) return;

      if (videoPath.startsWith('profile-videos/')) {
        const filePath = videoPath.replace('profile-videos/', '');
        const { data } = await supabase.storage
          .from('profile-videos')
          .createSignedUrl(filePath, 60 * 60); // 1 hour
        
        if (data?.signedUrl) {
          setVideoUrl(data.signedUrl);
        }
      } else if (videoPath.startsWith('http')) {
        setVideoUrl(videoPath);
      }
    };

    fetchVideoUrl();
  }, [(profile as any)?.intro_video_url]);

  // Update internal note state when existingNote changes
  const noteInitialized = useRef(false);
  if (existingNote?.note && !noteInitialized.current) {
    setInternalNote(existingNote.note);
    noteInitialized.current = true;
  }

  // Fetch conversation history
  const { data: messages = [] } = useQuery({
    queryKey: ['candidate-conversation', user?.id, candidateId],
    queryFn: async () => {
      if (!candidateId || !user?.id) return [];

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${candidateId}),and(from_user_id.eq.${candidateId},to_user_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!candidateId && !!user?.id,
  });

  // Save internal note mutation
  const saveNoteMutation = useMutation({
    mutationFn: async (note: string) => {
      if (!candidateId || !user?.id) throw new Error('Missing data');

      if (existingNote) {
        // Update existing note
        const { error } = await supabase
          .from('recruiter_candidate_notes')
          .update({ note })
          .eq('id', existingNote.id);
        if (error) throw error;
      } else {
        // Create new note
        const { error } = await supabase
          .from('recruiter_candidate_notes')
          .insert({
            recruiter_id: user.id,
            candidate_id: candidateId,
            note,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isHebrew ? 'ההערה נשמרה' : 'Note saved');
      queryClient.invalidateQueries({ queryKey: ['recruiter-candidate-note', user?.id, candidateId] });
    },
    onError: () => {
      toast.error(isHebrew ? 'שגיאה בשמירת ההערה' : 'Error saving note');
    },
  });

  const handleDownloadDocument = async (filePath: string, fileName: string) => {
    const { data } = await supabase.storage
      .from('resumes')
      .createSignedUrl(filePath, 60);
    
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  };

  const handleDownloadAssignment = async (filePath: string) => {
    const { data } = await supabase.storage
      .from('home-assignments')
      .createSignedUrl(filePath, 60);
    
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  };

  const openWhatsApp = () => {
    if (!profile?.phone) return;
    const phone = profile.phone.replace(/\D/g, '');
    const message = encodeURIComponent(
      isHebrew
        ? `שלום ${profile.full_name}, אני מגייס/ת ואשמח לשוחח איתך על הזדמנויות תעסוקה.`
        : `Hi ${profile.full_name}, I'm a recruiter and would love to discuss job opportunities with you.`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  // PDF Export function
  const exportToPdf = async () => {
    if (!profile) return;
    
    setIsExportingPdf(true);
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      let yPosition = 20;
      const margin = 20;
      const lineHeight = 7;

      // Helper function to add text with word wrap
      const addText = (text: string, fontSize: number = 10, isBold: boolean = false) => {
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
        const lines = pdf.splitTextToSize(text, pageWidth - 2 * margin);
        
        // Check if we need a new page
        if (yPosition + lines.length * lineHeight > pdf.internal.pageSize.getHeight() - margin) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.text(lines, margin, yPosition);
        yPosition += lines.length * lineHeight + 2;
      };

      const addSection = (title: string) => {
        yPosition += 5;
        addText(title, 14, true);
        yPosition += 2;
      };

      // Title
      addText(`Candidate Profile: ${profile.full_name}`, 18, true);
      addText(`Generated: ${format(new Date(), 'PPP')}`, 10);
      yPosition += 5;

      // Basic Info
      addSection(isHebrew ? 'Basic Information' : 'Basic Information');
      addText(`Email: ${profile.email}`);
      if (profile.phone) addText(`Phone: ${profile.phone}`);
      if (profile.bio) addText(`Bio: ${profile.bio}`);
      
      // Links
      if (profile.linkedin_url) addText(`LinkedIn: ${profile.linkedin_url}`);
      if (profile.github_url) addText(`GitHub: ${profile.github_url}`);
      if (profile.portfolio_url) addText(`Portfolio: ${profile.portfolio_url}`);

      // Career Preferences
      if (careerPrefs) {
        addSection('Career Preferences');
        if (careerPrefs.fields?.length) {
          addText(`Preferred Fields: ${careerPrefs.fields.map((f: any) => f.name_en).join(', ')}`);
        }
        if (careerPrefs.roles?.length) {
          addText(`Preferred Roles: ${careerPrefs.roles.map((r: any) => r.name_en).join(', ')}`);
        }
        if (careerPrefs.experienceLevel) {
          addText(`Experience Level: ${careerPrefs.experienceLevel.name_en}`);
        }
        if (profile.experience_years != null) {
          addText(`Years of Experience: ${profile.experience_years}`);
        }
      }

      // Application History
      if (applications.length > 0) {
        addSection('Application History');
        applications.forEach((app: any) => {
          const stageName = stageLabels[app.current_stage]?.en || app.current_stage;
          addText(`• ${app.job?.title || 'Unknown Job'} at ${app.job?.company?.name || 'Unknown Company'} - ${stageName} (${format(new Date(app.created_at), 'PP')})`);
        });
      }

      // Vouches
      if (vouches.length > 0) {
        addSection('Recommendations');
        vouches.forEach((vouch: any) => {
          addText(`• From ${vouch.from_profile?.full_name || 'Anonymous'} (${vouch.vouch_type}): "${vouch.message}"`);
          if (vouch.skills?.length) {
            addText(`  Skills: ${vouch.skills.join(', ')}`);
          }
        });
      }

      // Internal Note
      if (internalNote) {
        addSection('Internal Notes');
        addText(internalNote);
      }

      // Save PDF
      pdf.save(`${profile.full_name.replace(/\s+/g, '_')}_profile.pdf`);
      toast.success(isHebrew ? 'קובץ PDF נוצר בהצלחה' : 'PDF exported successfully');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error(isHebrew ? 'שגיאה ביצירת PDF' : 'Error exporting PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Access check
  if (!isRecruiter) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {isHebrew ? 'אין גישה' : 'Access Denied'}
            </h2>
            <p className="text-muted-foreground mb-4">
              {isHebrew 
                ? 'רק מגייסים יכולים לצפות בפרופילי מועמדים'
                : 'Only recruiters can view candidate profiles'}
            </p>
            <Button onClick={() => navigate('/')}>
              {isHebrew ? 'חזרה לדף הבית' : 'Back to Home'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8" dir={isHebrew ? 'rtl' : 'ltr'}>
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-10 w-32" />
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="w-20 h-20 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {isHebrew ? 'מועמד לא נמצא' : 'Candidate Not Found'}
            </h2>
            <p className="text-muted-foreground mb-4">
              {isHebrew 
                ? 'לא הצלחנו למצוא את המועמד המבוקש'
                : 'We could not find the requested candidate'}
            </p>
            <Button onClick={() => navigate(-1)}>
              {isHebrew ? 'חזרה' : 'Go Back'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const BackIcon = isHebrew ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen bg-background" dir={isHebrew ? 'rtl' : 'ltr'}>
      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
            <BackIcon className="w-4 h-4" />
            {isHebrew ? 'חזרה' : 'Back'}
          </Button>

          <Button 
            variant="outline" 
            onClick={exportToPdf} 
            disabled={isExportingPdf}
            className="gap-2"
          >
            {isExportingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            {isHebrew ? 'ייצוא PDF' : 'Export PDF'}
          </Button>
        </div>

        {/* Personal Card */}
        <PersonalCard
          profile={{
            user_id: candidateId || '',
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            personal_tagline: (profile as any).personal_tagline,
            about_me: (profile as any).about_me,
            intro_video_url: videoUrl,
            portfolio_url: profile.portfolio_url,
            linkedin_url: profile.linkedin_url,
            github_url: profile.github_url,
            phone: profile.phone,
            email: profile.email,
            allow_recruiter_contact: profile.allow_recruiter_contact ?? true,
          }}
          showActions={true}
          showVideo={true}
          relatedApplicationId={applications[0]?.id}
          relatedJobId={applications[0]?.job?.id}
        />

        {/* Extra Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {vouches.length > 0 && (
            <Badge variant="outline" className="gap-1 border-pink-500/20 text-pink-500">
              <Heart className="w-3 h-3" />
              {vouches.length} {isHebrew ? 'המלצות' : 'vouches'}
            </Badge>
          )}
          {profile.visible_to_hr && (
            <Badge variant="outline" className="gap-1 border-emerald-500/20 text-emerald-600">
              <Eye className="w-3 h-3" />
              {isHebrew ? 'גלוי למגייסים' : 'Visible to HR'}
            </Badge>
          )}
          {(profile as any).intro_video_url && (
            <Badge variant="outline" className="gap-1 border-primary/20 text-primary">
              <Video className="w-3 h-3" />
              {isHebrew ? 'יש סרטון היכרות' : 'Has Intro Video'}
            </Badge>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="gap-1 text-xs sm:text-sm">
              <User className="w-4 h-4 hidden sm:inline" />
              {isHebrew ? 'סקירה' : 'Overview'}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1 text-xs sm:text-sm">
              <Briefcase className="w-4 h-4 hidden sm:inline" />
              {isHebrew ? 'היסטוריה' : 'History'}
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1 text-xs sm:text-sm">
              <FileText className="w-4 h-4 hidden sm:inline" />
              {isHebrew ? 'מסמכים' : 'Docs'}
            </TabsTrigger>
            <TabsTrigger value="vouches" className="gap-1 text-xs sm:text-sm">
              <Heart className="w-4 h-4 hidden sm:inline" />
              {isHebrew ? 'המלצות' : 'Vouches'}
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-1 text-xs sm:text-sm">
              <MessageSquare className="w-4 h-4 hidden sm:inline" />
              {isHebrew ? 'שיחות' : 'Chat'}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            {/* Internal Notes Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <StickyNote className="w-5 h-5 text-yellow-500" />
                  {isHebrew ? 'הערות פנימיות' : 'Internal Notes'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  placeholder={isHebrew ? 'הוסף הערות פנימיות על המועמד...' : 'Add internal notes about this candidate...'}
                  className="min-h-[100px] resize-none"
                  dir={isHebrew ? 'rtl' : 'ltr'}
                />
                <Button
                  onClick={() => saveNoteMutation.mutate(internalNote)}
                  disabled={saveNoteMutation.isPending}
                  className="gap-2"
                >
                  {saveNoteMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {isHebrew ? 'שמור הערה' : 'Save Note'}
                </Button>
              </CardContent>
            </Card>

            {/* Career Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="w-5 h-5 text-primary" />
                  {isHebrew ? 'העדפות קריירה' : 'Career Preferences'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Preferred Fields */}
                {careerPrefs?.fields && careerPrefs.fields.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      {isHebrew ? 'תחומים מועדפים' : 'Preferred Fields'}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {careerPrefs.fields.map((field: any) => (
                        <Badge key={field.id} variant="secondary">
                          {isHebrew ? field.name_he : field.name_en}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preferred Roles */}
                {careerPrefs?.roles && careerPrefs.roles.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      {isHebrew ? 'תפקידים מועדפים' : 'Preferred Roles'}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {careerPrefs.roles.map((r: any) => (
                        <Badge key={r.id} variant="outline">
                          {isHebrew ? r.name_he : r.name_en}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Experience Level */}
                {careerPrefs?.experienceLevel && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      {isHebrew ? 'רמת ותק' : 'Experience Level'}
                    </h4>
                    <Badge variant="outline" className="bg-primary/5">
                      {isHebrew ? careerPrefs.experienceLevel.name_he : careerPrefs.experienceLevel.name_en}
                    </Badge>
                  </div>
                )}

                {/* Experience Years */}
                {profile.experience_years != null && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      {isHebrew ? 'שנות ניסיון' : 'Years of Experience'}
                    </h4>
                    <p className="text-sm">{profile.experience_years} {isHebrew ? 'שנים' : 'years'}</p>
                  </div>
                )}

                {!careerPrefs?.fields?.length && !careerPrefs?.roles?.length && !careerPrefs?.experienceLevel && profile.experience_years == null && (
                  <p className="text-sm text-muted-foreground">
                    {isHebrew ? 'המועמד טרם הגדיר העדפות קריירה' : 'Candidate has not set career preferences yet'}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Briefcase className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{applications.length}</p>
                  <p className="text-xs text-muted-foreground">
                    {isHebrew ? 'מועמדויות' : 'Applications'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Heart className="w-8 h-8 mx-auto mb-2 text-pink-500" />
                  <p className="text-2xl font-bold">{vouches.length}</p>
                  <p className="text-xs text-muted-foreground">
                    {isHebrew ? 'המלצות' : 'Vouches'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <p className="text-2xl font-bold">{documents.length + homeAssignments.length}</p>
                  <p className="text-xs text-muted-foreground">
                    {isHebrew ? 'מסמכים' : 'Documents'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <p className="text-2xl font-bold">{messages.length}</p>
                  <p className="text-xs text-muted-foreground">
                    {isHebrew ? 'הודעות' : 'Messages'}
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" />
                  {isHebrew ? 'היסטוריית מועמדויות' : 'Application History'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {applications.length === 0 ? (
                  <div className="text-center py-8">
                    <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {isHebrew 
                        ? 'אין מועמדויות למשרות שלך'
                        : 'No applications to your jobs yet'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {applications.map((app: any) => (
                      <Card 
                        key={app.id} 
                        className="hover:border-primary/30 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedApplication(app);
                          setApplicationSheetOpen(true);
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            {/* Company Logo */}
                            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                              {app.job?.company?.logo_url ? (
                                <img 
                                  src={app.job.company.logo_url} 
                                  alt={app.job.company.name}
                                  className="w-10 h-10 rounded object-cover"
                                />
                              ) : (
                                <Building2 className="w-6 h-6 text-muted-foreground" />
                              )}
                            </div>

                            {/* Job Info */}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium truncate">{app.job?.title || 'Unknown Job'}</h3>
                              <p className="text-sm text-muted-foreground truncate">
                                {app.job?.company?.name || 'Unknown Company'}
                              </p>
                            </div>

                            {/* Stage & Score */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {app.match_score && (
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-sm font-bold text-primary">{app.match_score}%</span>
                                </div>
                              )}
                              <Badge
                                variant="outline"
                                className={cn('border', stageColors[app.current_stage] || stageColors.applied)}
                              >
                                {stageLabels[app.current_stage]?.[isHebrew ? 'he' : 'en'] || app.current_stage}
                              </Badge>
                            </div>
                          </div>

                          {/* Time */}
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-3">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(app.created_at), {
                              addSuffix: true,
                              locale: isHebrew ? he : enUS,
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="mt-6 space-y-6">
            {/* Resume */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  {isHebrew ? 'קורות חיים' : 'Resume'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {documents.filter(d => d.doc_type === 'resume').length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    {isHebrew ? 'לא הועלו קורות חיים' : 'No resume uploaded'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {documents.filter(d => d.doc_type === 'resume').map((doc) => (
                      <div 
                        key={doc.id} 
                        className="flex items-center justify-between p-3 rounded-lg bg-muted"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium truncate">{doc.file_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(doc.created_at), {
                                addSuffix: true,
                                locale: isHebrew ? he : enUS,
                              })}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 flex-shrink-0"
                          onClick={() => handleDownloadDocument(doc.file_path, doc.file_name)}
                        >
                          <Download className="w-4 h-4" />
                          {isHebrew ? 'הורד' : 'Download'}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Home Assignments */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" />
                  {isHebrew ? 'מטלות בית' : 'Home Assignments'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {homeAssignments.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    {isHebrew ? 'לא הוגשו מטלות בית' : 'No home assignments submitted'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {homeAssignments.map((assignment) => {
                      const relatedApp = applications.find(a => a.id === assignment.application_id);
                      return (
                        <div 
                          key={assignment.id} 
                          className="flex items-center justify-between p-3 rounded-lg bg-muted"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium truncate">{assignment.file_name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {relatedApp?.job?.title || 'Unknown job'} • {formatDistanceToNow(new Date(assignment.uploaded_at), {
                                  addSuffix: true,
                                  locale: isHebrew ? he : enUS,
                                })}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 flex-shrink-0"
                            onClick={() => handleDownloadAssignment(assignment.file_path)}
                          >
                            <Download className="w-4 h-4" />
                            {isHebrew ? 'הורד' : 'Download'}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vouches Tab */}
          <TabsContent value="vouches" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-500" />
                  {isHebrew ? 'המלצות' : 'Vouches'} ({vouches.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {vouches.length === 0 ? (
                  <div className="text-center py-8">
                    <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {isHebrew ? 'אין המלצות עדיין' : 'No vouches yet'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {vouches.map((vouch) => (
                      <VouchCard key={vouch.id} vouch={vouch} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Chat History Tab */}
          <TabsContent value="chat" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-green-500" />
                  {isHebrew ? 'היסטוריית שיחות' : 'Conversation History'}
                </CardTitle>
                <SendMessageDialog
                  toUserId={candidateId || ''}
                  toUserName={profile.full_name}
                  trigger={
                    <Button size="sm" className="gap-2">
                      <MessageSquare className="w-4 h-4" />
                      {isHebrew ? 'הודעה חדשה' : 'New Message'}
                    </Button>
                  }
                />
              </CardHeader>
              <CardContent>
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">
                      {isHebrew ? 'אין הודעות עדיין' : 'No messages yet'}
                    </p>
                    <SendMessageDialog
                      toUserId={candidateId || ''}
                      toUserName={profile.full_name}
                      trigger={
                        <Button variant="outline" className="gap-2">
                          <MessageSquare className="w-4 h-4" />
                          {isHebrew ? 'שלח הודעה ראשונה' : 'Send First Message'}
                        </Button>
                      }
                    />
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto">
                    {messages.map((message) => {
                      const isFromMe = message.from_user_id === user?.id;
                      return (
                        <div
                          key={message.id}
                          className={cn(
                            'flex flex-col max-w-[80%] p-3 rounded-lg',
                            isFromMe
                              ? 'ms-auto bg-primary text-primary-foreground'
                              : 'me-auto bg-muted'
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <span className={cn(
                            'text-xs mt-1',
                            isFromMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          )}>
                            {format(new Date(message.created_at), 'Pp', {
                              locale: isHebrew ? he : enUS,
                            })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Application Details Sheet */}
      <ApplicationDetailsSheet
        application={selectedApplication}
        open={applicationSheetOpen}
        onOpenChange={setApplicationSheetOpen}
        onUpdate={() => refetchApplications()}
      />
    </div>
  );
}
