import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { MessageSquare, Loader2, Send, Paperclip, X, Briefcase, Globe, Linkedin, Github, Heart, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SendMessageDialogProps {
  toUserId: string;
  toUserName: string;
  trigger?: React.ReactNode;
  relatedJobId?: string;
  relatedApplicationId?: string;
  defaultMessage?: string;
}

export function SendMessageDialog({
  toUserId,
  toUserName,
  trigger,
  relatedJobId,
  relatedApplicationId,
  defaultMessage = '',
}: SendMessageDialogProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(defaultMessage);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string>(relatedJobId || '');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch candidate profile
  const { data: candidateProfile } = useQuery({
    queryKey: ['candidate-profile-preview', toUserId],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles_secure')
        .select('user_id, full_name, email, avatar_url, bio, personal_tagline, portfolio_url, linkedin_url, github_url')
        .eq('user_id', toUserId)
        .single();
      return data;
    },
    enabled: open && !!toUserId,
  });

  // Fetch vouch count
  const { data: vouchCount } = useQuery({
    queryKey: ['vouch-count-preview', toUserId],
    queryFn: async () => {
      const { count } = await supabase
        .from('vouches')
        .select('*', { count: 'exact', head: true })
        .eq('to_user_id', toUserId)
        .eq('is_public', true);
      return count || 0;
    },
    enabled: open && !!toUserId,
  });

  // Fetch recruiter's jobs for linking
  const { data: myJobs = [] } = useQuery({
    queryKey: ['my-jobs-for-message', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('jobs')
        .select('id, title')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: open && !!user?.id,
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(isHebrew ? 'הקובץ גדול מדי (מקסימום 10MB)' : 'File too large (max 10MB)');
        return;
      }
      setSelectedFile(file);
    }
  };

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      if (!message.trim() && !selectedFile) throw new Error('Message is empty');

      let attachmentData: { url: string; name: string; type: string; size: number } | undefined;

      // Upload file if selected
      if (selectedFile) {
        setUploading(true);
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('message-attachments')
          .upload(fileName, selectedFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from('message-attachments')
          .getPublicUrl(fileName);
        attachmentData = { url: publicUrl, name: selectedFile.name, type: selectedFile.type, size: selectedFile.size };
        setUploading(false);
      }

      // Find or create conversation
      const participant1 = user.id < toUserId ? user.id : toUserId;
      const participant2 = user.id < toUserId ? toUserId : user.id;

      let { data: existingConvo } = await supabase
        .from('conversations')
        .select('id')
        .eq('participant_1', participant1)
        .eq('participant_2', participant2)
        .single();

      let conversationId: string;

      if (existingConvo) {
        conversationId = existingConvo.id;
      } else {
        const { data: newConvo, error: convoError } = await supabase
          .from('conversations')
          .insert({ participant_1: participant1, participant_2: participant2 })
          .select('id')
          .single();
        if (convoError) throw convoError;
        conversationId = newConvo.id;
      }

      const { error: msgError } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        from_user_id: user.id,
        to_user_id: toUserId,
        content: message.trim() || (selectedFile ? `📎 ${selectedFile.name}` : ''),
        related_job_id: selectedJobId || relatedJobId || null,
        related_application_id: relatedApplicationId || null,
        attachment_url: attachmentData?.url || null,
        attachment_name: attachmentData?.name || null,
        attachment_type: attachmentData?.type || null,
        attachment_size: attachmentData?.size || null,
      });

      if (msgError) throw msgError;

      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);
    },
    onSuccess: () => {
      toast.success(isHebrew ? 'ההודעה נשלחה!' : 'Message sent!');
      setMessage('');
      setSelectedFile(null);
      setSelectedJobId('');
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: () => {
      setUploading(false);
      toast.error(isHebrew ? 'שגיאה בשליחת ההודעה' : 'Failed to send message');
    },
  });

  const selectedJob = myJobs.find(j => j.id === selectedJobId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            {isHebrew ? 'שלח הודעה' : 'Send Message'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg" dir={isHebrew ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            {isHebrew ? `שלח הודעה ל${toUserName}` : `Message ${toUserName}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Candidate Profile Preview */}
          {candidateProfile && (
            <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={candidateProfile.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {candidateProfile.full_name?.charAt(0)?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{candidateProfile.full_name}</p>
                  {candidateProfile.personal_tagline && (
                    <p className="text-sm text-muted-foreground truncate">{candidateProfile.personal_tagline}</p>
                  )}
                </div>
                {(vouchCount ?? 0) > 0 && (
                  <Badge variant="secondary" className="gap-1 shrink-0">
                    <Heart className="w-3 h-3" />
                    {vouchCount}
                  </Badge>
                )}
              </div>
              {candidateProfile.bio && (
                <p className="text-sm text-muted-foreground line-clamp-2">{candidateProfile.bio}</p>
              )}
              <div className="flex gap-2">
                {candidateProfile.portfolio_url && (
                  <a href={candidateProfile.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                    <Globe className="w-4 h-4" />
                  </a>
                )}
                {candidateProfile.linkedin_url && (
                  <a href={candidateProfile.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                    <Linkedin className="w-4 h-4" />
                  </a>
                )}
                {candidateProfile.github_url && (
                  <a href={candidateProfile.github_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                    <Github className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Message */}
          <div className="space-y-2">
            <Label>{isHebrew ? 'הודעה' : 'Message'}</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={isHebrew ? 'הקלד את ההודעה שלך...' : 'Type your message...'}
              className="min-h-[100px] resize-none"
              dir={isHebrew ? 'rtl' : 'ltr'}
            />
          </div>

          {/* Attach File */}
          <div className="flex items-center gap-2 flex-wrap">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              onChange={handleFileSelect}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="w-4 h-4" />
              {isHebrew ? 'צרף קובץ' : 'Attach File'}
            </Button>

            {selectedFile && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted text-sm">
                <FileText className="w-4 h-4 text-primary" />
                <span className="truncate max-w-[150px]">{selectedFile.name}</span>
                <button onClick={() => setSelectedFile(null)} className="text-muted-foreground hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Attach Job Link */}
          {myJobs.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                {isHebrew ? 'קשר למשרה' : 'Link to Job'}
              </Label>
              <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                <SelectTrigger>
                  <SelectValue placeholder={isHebrew ? 'בחר משרה (אופציונלי)' : 'Select a job (optional)'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{isHebrew ? 'ללא' : 'None'}</SelectItem>
                  {myJobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedJob && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary/5 border border-primary/20 text-sm">
                  <Briefcase className="w-4 h-4 text-primary" />
                  <span>{selectedJob.title}</span>
                  <button onClick={() => setSelectedJobId('')} className="ms-auto text-muted-foreground hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {isHebrew ? 'ביטול' : 'Cancel'}
            </Button>
            <Button
              onClick={() => sendMutation.mutate()}
              disabled={(!message.trim() && !selectedFile) || sendMutation.isPending || uploading}
              className="gap-2"
            >
              {(sendMutation.isPending || uploading) ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {isHebrew ? 'שלח' : 'Send'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
