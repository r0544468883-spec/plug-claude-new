import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Download, Star, CheckCircle2, XCircle, User, ExternalLink, Lock, Check, X, Eye, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import type { AssignmentTemplate, AssignmentSubmission } from './AssignmentCard';

interface SubmissionsViewDialogProps {
  template: AssignmentTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AccessRequest {
  id: string;
  requester_id: string;
  status: 'pending' | 'approved' | 'rejected';
  message: string | null;
  created_at: string;
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
}

const STATUS_CONFIG = {
  pending: { label: { he: 'ממתין', en: 'Pending' }, color: 'bg-gray-100 text-gray-600' },
  viewed: { label: { he: 'נצפה', en: 'Viewed' }, color: 'bg-blue-100 text-blue-600' },
  starred: { label: { he: 'מסומן', en: 'Starred' }, color: 'bg-yellow-100 text-yellow-700' },
  rejected: { label: { he: 'לא מתאים', en: 'Not a fit' }, color: 'bg-red-100 text-red-600' },
};

export function SubmissionsViewDialog({ template, open, onOpenChange }: SubmissionsViewDialogProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [selected, setSelected] = useState<AssignmentSubmission | null>(null);
  const [recruiterNotes, setRecruiterNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [processingReqId, setProcessingReqId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !template) return;
    fetchAll();
  }, [open, template]);

  useEffect(() => {
    if (selected) {
      setRecruiterNotes(selected.recruiter_notes ?? '');
      if (selected.status === 'pending') {
        updateStatus(selected.id, 'viewed');
      }
    }
  }, [selected?.id]);

  const fetchAll = async () => {
    if (!template) return;
    setIsLoading(true);

    const [{ data: subData, error: subError }, { data: reqData }] = await Promise.all([
      supabase
        .from('assignment_submissions' as any)
        .select('*, profiles!submitted_by(full_name, avatar_url)')
        .eq('template_id', template.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('assignment_access_requests' as any)
        .select('*, profiles!requester_id(full_name, avatar_url)')
        .eq('template_id', template.id)
        .order('created_at', { ascending: false }),
    ]);

    if (subError) {
      toast.error(isHebrew ? 'שגיאה בטעינת הגשות' : 'Failed to load submissions');
    } else {
      setSubmissions((subData as AssignmentSubmission[]) ?? []);
      if (subData?.length) setSelected(subData[0] as AssignmentSubmission);
    }

    setAccessRequests((reqData as AccessRequest[]) ?? []);
    setIsLoading(false);
  };

  const updateStatus = async (subId: string, status: string) => {
    await supabase.from('assignment_submissions' as any).update({ status }).eq('id', subId);
    setSubmissions(prev => prev.map(s => s.id === subId ? { ...s, status: status as any } : s));
    if (selected?.id === subId) setSelected(prev => prev ? { ...prev, status: status as any } : prev);
  };

  const saveRecruiterNotes = async () => {
    if (!selected) return;
    setIsSaving(true);
    const { error } = await supabase
      .from('assignment_submissions' as any)
      .update({ recruiter_notes: recruiterNotes.trim() || null })
      .eq('id', selected.id);
    if (error) {
      toast.error(isHebrew ? 'שגיאה בשמירת הערות' : 'Failed to save notes');
    } else {
      toast.success(isHebrew ? 'הערות נשמרו' : 'Notes saved');
      setSubmissions(prev =>
        prev.map(s => s.id === selected.id ? { ...s, recruiter_notes: recruiterNotes.trim() || null } : s)
      );
      setSelected(prev => prev ? { ...prev, recruiter_notes: recruiterNotes.trim() || null } : prev);
    }
    setIsSaving(false);
  };

  const handleAccessDecision = async (req: AccessRequest, decision: 'approved' | 'rejected') => {
    setProcessingReqId(req.id);
    try {
      await supabase.from('assignment_access_requests' as any)
        .update({ status: decision })
        .eq('id', req.id);

      await supabase.from('notifications' as any).insert({
        user_id: req.requester_id,
        type: 'access_decision',
        title: decision === 'approved'
          ? (isHebrew ? 'בקשת הגישה אושרה!' : 'Access request approved!')
          : (isHebrew ? 'בקשת הגישה נדחתה' : 'Access request declined'),
        message: `"${template?.title}"`,
        metadata: { template_id: template?.id },
      }).catch(() => {});

      setAccessRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: decision } : r));
      toast.success(decision === 'approved'
        ? (isHebrew ? 'גישה אושרה' : 'Access approved')
        : (isHebrew ? 'גישה נדחתה' : 'Access declined')
      );
    } catch {
      toast.error(isHebrew ? 'שגיאה' : 'Error');
    }
    setProcessingReqId(null);
  };

  if (!template) return null;

  const pendingRequests = accessRequests.filter(r => r.status === 'pending');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-hidden flex flex-col" dir={isHebrew ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-primary" />
            {isHebrew ? `מטלה — ${template.title}` : `Assignment — ${template.title}`}
            <Badge variant="secondary" className="ms-auto">{submissions.length}</Badge>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="submissions" className="flex-1 flex flex-col overflow-hidden min-h-0">
            <TabsList className="w-full justify-start shrink-0">
              <TabsTrigger value="submissions" className="gap-1.5">
                {isHebrew ? 'פתרונות' : 'Solutions'}
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">{submissions.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="requests" className="gap-1.5">
                {isHebrew ? 'בקשות גישה' : 'Access Requests'}
                {pendingRequests.length > 0 && (
                  <Badge variant="destructive" className="h-4 px-1 text-[10px]">{pendingRequests.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="stats" className="gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" />
                {isHebrew ? 'סטטיסטיקות' : 'Stats'}
              </TabsTrigger>
            </TabsList>

            {/* Solutions tab */}
            <TabsContent value="submissions" className="flex-1 overflow-hidden min-h-0 mt-3">
              {submissions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                  <User className="w-10 h-10 opacity-30" />
                  <p>{isHebrew ? 'אין הגשות עדיין' : 'No submissions yet'}</p>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4 overflow-hidden flex-1 min-h-0 max-h-[60vh] sm:max-h-[500px]">
                  {/* Left: list */}
                  <div className="w-full sm:w-56 flex-shrink-0 overflow-y-auto space-y-1 sm:border-e sm:pe-3 max-h-[30vh] sm:max-h-none border-b sm:border-b-0 pb-3 sm:pb-0">
                    {submissions.map(sub => {
                      const statusCfg = STATUS_CONFIG[sub.status] ?? STATUS_CONFIG.pending;
                      const name = (sub.profiles as any)?.full_name || (isHebrew ? 'משתמש' : 'User');
                      const avatar = (sub.profiles as any)?.avatar_url;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => setSelected(sub)}
                          className={cn(
                            'w-full flex items-center gap-2 p-2 rounded-lg text-start transition-colors',
                            selected?.id === sub.id ? 'bg-primary/10' : 'hover:bg-muted'
                          )}
                        >
                          <Avatar className="w-8 h-8 flex-shrink-0">
                            <AvatarImage src={avatar || undefined} />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{name}</p>
                            <Badge className={cn('text-[10px] h-4', statusCfg.color)} variant="outline">
                              {statusCfg.label[isHebrew ? 'he' : 'en']}
                            </Badge>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Right: detail */}
                  {selected && (
                    <div className="flex-1 overflow-y-auto space-y-4">
                      <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={(selected.profiles as any)?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {((selected.profiles as any)?.full_name ?? '?').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-semibold">{(selected.profiles as any)?.full_name || (isHebrew ? 'משתמש' : 'User')}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(selected.created_at).toLocaleDateString(isHebrew ? 'he-IL' : 'en-US')}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => navigate(`/p/${selected.submitted_by}`)}>
                          <ExternalLink className="w-3.5 h-3.5" />
                          {isHebrew ? 'פרופיל' : 'Profile'}
                        </Button>
                      </div>

                      <a href={selected.file_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline">
                        <Download className="w-4 h-4" />
                        {isHebrew ? 'הורד קובץ פתרון' : 'Download Solution File'}
                      </a>

                      {selected.notes && (
                        <div className="p-3 rounded-lg bg-muted/30 border text-sm">
                          <p className="text-xs text-muted-foreground mb-1">{isHebrew ? 'הערות המועמד:' : 'Candidate notes:'}</p>
                          <p className="whitespace-pre-wrap">{selected.notes}</p>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground font-medium">{isHebrew ? 'סטטוס:' : 'Status:'}</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant={selected.status === 'starred' ? 'default' : 'outline'} className="gap-1"
                            onClick={() => updateStatus(selected.id, selected.status === 'starred' ? 'viewed' : 'starred')}>
                            <Star className="w-3.5 h-3.5" />
                            {isHebrew ? 'מעניין' : 'Interesting'}
                          </Button>
                          <Button size="sm" variant={selected.status === 'viewed' ? 'secondary' : 'outline'} className="gap-1"
                            onClick={() => updateStatus(selected.id, 'viewed')}>
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                            {isHebrew ? 'בחנתי' : 'Reviewed'}
                          </Button>
                          <Button size="sm" variant={selected.status === 'rejected' ? 'destructive' : 'outline'} className="gap-1"
                            onClick={() => updateStatus(selected.id, selected.status === 'rejected' ? 'viewed' : 'rejected')}>
                            <XCircle className="w-3.5 h-3.5" />
                            {isHebrew ? 'לא מתאים' : 'Not a fit'}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground font-medium">
                          {isHebrew ? 'הערות פרטיות שלי:' : 'My private notes:'}
                        </p>
                        <Textarea value={recruiterNotes} onChange={(e) => setRecruiterNotes(e.target.value)}
                          placeholder={isHebrew ? 'הערות פנימיות...' : 'Internal notes...'} rows={3} />
                        <Button size="sm" onClick={saveRecruiterNotes} disabled={isSaving} className="gap-1">
                          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                          {isHebrew ? 'שמור הערות' : 'Save Notes'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Access Requests tab */}
            <TabsContent value="requests" className="overflow-y-auto min-h-0 mt-3 max-h-[500px]">
              {accessRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                  <Lock className="w-10 h-10 opacity-30" />
                  <p>{isHebrew ? 'אין בקשות גישה' : 'No access requests'}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {accessRequests.map(req => {
                    const name = (req.profiles as any)?.full_name || (isHebrew ? 'משתמש' : 'User');
                    const avatar = (req.profiles as any)?.avatar_url;
                    const isPending = req.status === 'pending';
                    return (
                      <div key={req.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20">
                        <Avatar className="w-9 h-9 flex-shrink-0">
                          <AvatarImage src={avatar || undefined} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{name}</p>
                            <Badge variant="outline" className={cn('text-[10px] h-4 px-1',
                              req.status === 'pending' ? 'text-amber-600 border-amber-500/30' :
                              req.status === 'approved' ? 'text-green-600 border-green-500/30' :
                              'text-red-500 border-red-500/30'
                            )}>
                              {req.status === 'pending' ? (isHebrew ? 'ממתין' : 'Pending') :
                               req.status === 'approved' ? (isHebrew ? 'אושר' : 'Approved') :
                               (isHebrew ? 'נדחה' : 'Rejected')}
                            </Badge>
                          </div>
                          {req.message && (
                            <p className="text-xs text-muted-foreground mt-0.5">{req.message}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(req.created_at).toLocaleDateString(isHebrew ? 'he-IL' : 'en-US')}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                            onClick={() => navigate(`/p/${req.requester_id}`)}>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                          {isPending && (
                            <>
                              <Button size="sm" className="h-7 gap-1 bg-green-500 hover:bg-green-600 text-white px-2"
                                onClick={() => handleAccessDecision(req, 'approved')}
                                disabled={processingReqId === req.id}>
                                {processingReqId === req.id
                                  ? <Loader2 className="w-3 h-3 animate-spin" />
                                  : <Check className="w-3 h-3" />}
                                {isHebrew ? 'אשר' : 'Approve'}
                              </Button>
                              <Button size="sm" variant="destructive" className="h-7 gap-1 px-2"
                                onClick={() => handleAccessDecision(req, 'rejected')}
                                disabled={processingReqId === req.id}>
                                <X className="w-3 h-3" />
                                {isHebrew ? 'דחה' : 'Decline'}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
            {/* Stats tab */}
            <TabsContent value="stats" className="overflow-y-auto min-h-0 mt-3 max-h-[500px]">
              {(() => {
                const ratings = submissions.map(s => s.recruiter_rating).filter(Boolean) as number[];
                const avgRating = ratings.length > 0
                  ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
                  : null;
                const statusCounts = {
                  pending: submissions.filter(s => s.status === 'pending').length,
                  viewed: submissions.filter(s => s.status === 'viewed').length,
                  starred: submissions.filter(s => s.status === 'starred').length,
                  rejected: submissions.filter(s => s.status === 'rejected').length,
                };
                const reqCounts = {
                  pending: accessRequests.filter(r => r.status === 'pending').length,
                  approved: accessRequests.filter(r => r.status === 'approved').length,
                  rejected: accessRequests.filter(r => r.status === 'rejected').length,
                };

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: isHebrew ? 'צפיות' : 'Views', value: template.view_count ?? 0, icon: Eye, color: 'text-blue-500' },
                        { label: isHebrew ? 'הגשות' : 'Submissions', value: submissions.length, icon: CheckCircle2, color: 'text-green-500' },
                        { label: isHebrew ? 'ציון ממוצע' : 'Avg Rating', value: avgRating ?? '—', icon: Star, color: 'text-yellow-500' },
                        { label: isHebrew ? 'בקשות גישה' : 'Access Requests', value: accessRequests.length, icon: Lock, color: 'text-primary' },
                      ].map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className="p-3 rounded-lg border bg-muted/20 text-center">
                          <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
                          <p className="text-2xl font-bold">{value}</p>
                          <p className="text-xs text-muted-foreground">{label}</p>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {isHebrew ? 'סטטוס הגשות' : 'Submission Status'}
                        </p>
                        {Object.entries(statusCounts).map(([status, count]) => (
                          count > 0 && (
                            <div key={status} className="flex items-center gap-2">
                              <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${Math.round((count / submissions.length) * 100)}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-20 text-end">
                                {STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.label[isHebrew ? 'he' : 'en']} ({count})
                              </span>
                            </div>
                          )
                        ))}
                        {submissions.length === 0 && (
                          <p className="text-xs text-muted-foreground">{isHebrew ? 'אין הגשות' : 'No submissions'}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {isHebrew ? 'בקשות גישה' : 'Access Requests'}
                        </p>
                        {Object.entries(reqCounts).map(([status, count]) => (
                          count > 0 && (
                            <div key={status} className="flex items-center gap-2">
                              <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${Math.round((count / Math.max(accessRequests.length, 1)) * 100)}%`,
                                    backgroundColor: status === 'approved' ? '#22c55e' : status === 'rejected' ? '#ef4444' : '#f59e0b'
                                  }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-24 text-end">
                                {status === 'approved' ? (isHebrew ? 'אושר' : 'Approved') :
                                 status === 'rejected' ? (isHebrew ? 'נדחה' : 'Rejected') :
                                 (isHebrew ? 'ממתין' : 'Pending')} ({count})
                              </span>
                            </div>
                          )
                        ))}
                        {accessRequests.length === 0 && (
                          <p className="text-xs text-muted-foreground">{isHebrew ? 'אין בקשות' : 'No requests'}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
