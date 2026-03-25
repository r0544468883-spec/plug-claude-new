import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback } from 'react';

export interface DocumentTemplate {
  id: string;
  created_by: string;
  name: string;
  description: string | null;
  content_html: string;
  category: string;
  is_active: boolean;
  created_at: string;
}

export interface SigningDocument {
  id: string;
  document_number: string;
  created_by: string;
  template_id: string | null;
  candidate_id: string | null;
  application_id: string | null;
  title: string;
  content_html: string;
  status: 'draft' | 'sent' | 'viewed' | 'signed' | 'declined' | 'expired' | 'cancelled';
  recipient_name: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  send_channel: 'plug' | 'email' | 'whatsapp' | null;
  signing_token: string | null;
  original_file_url: string | null;
  original_file_name: string | null;
  original_file_type: string | null;
  sent_at: string | null;
  expires_at: string | null;
  signed_at: string | null;
  declined_at: string | null;
  decline_reason: string | null;
  signature_data: string | null;
  signed_document_url: string | null;
  reminder_sent_at: string | null;
  view_count: number;
  last_viewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditEvent {
  id: string;
  document_id: string;
  event_type: string;
  actor_id: string | null;
  actor_name: string | null;
  ip_address: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function useSigningDocuments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['signing-documents', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('signing_documents')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as SigningDocument[];
    },
    enabled: !!user?.id,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['document-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as DocumentTemplate[];
    },
    enabled: !!user?.id,
  });

  const stats = {
    total: documents.length,
    pending: documents.filter(d => d.status === 'sent' || d.status === 'viewed').length,
    signed: documents.filter(d => d.status === 'signed').length,
    declined: documents.filter(d => d.status === 'declined').length,
    draft: documents.filter(d => d.status === 'draft').length,
  };

  const uploadFile = useCallback(async (file: File): Promise<{ url: string; name: string; type: string }> => {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const path = `${user!.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage
      .from('signing-documents')
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('signing-documents').getPublicUrl(path);
    // For private bucket, use signed URL
    const { data: signedData } = await supabase.storage
      .from('signing-documents')
      .createSignedUrl(path, 60 * 60 * 24 * 30); // 30 days
    return {
      url: signedData?.signedUrl || urlData.publicUrl,
      name: file.name,
      type: ext,
    };
  }, [user]);

  const createDocument = useMutation({
    mutationFn: async (payload: {
      title: string;
      content_html: string;
      candidate_id?: string;
      application_id?: string;
      template_id?: string;
      expires_at?: string;
      original_file_url?: string;
      original_file_name?: string;
      original_file_type?: string;
    }) => {
      const { data, error } = await supabase
        .from('signing_documents')
        .insert({ ...payload, created_by: user!.id, document_number: '' })
        .select()
        .single();
      if (error) throw error;
      await addAuditEvent(data.id, 'created', user!.id, 'מסמך נוצר');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signing-documents'] });
      toast.success('מסמך נוצר בהצלחה');
    },
    onError: () => toast.error('שגיאה ביצירת המסמך'),
  });

  const sendDocument = useMutation({
    mutationFn: async ({
      documentId,
      recipientName,
      recipientEmail,
      recipientPhone,
      channel,
    }: {
      documentId: string;
      recipientName: string;
      recipientEmail?: string;
      recipientPhone?: string;
      channel: 'plug' | 'email' | 'whatsapp';
    }) => {
      const { error } = await supabase
        .from('signing_documents')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          recipient_name: recipientName,
          recipient_email: recipientEmail || null,
          recipient_phone: recipientPhone || null,
          send_channel: channel,
        })
        .eq('id', documentId);
      if (error) throw error;
      await addAuditEvent(documentId, 'sent', user!.id, `מסמך נשלח ל-${recipientName} דרך ${channel}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signing-documents'] });
      toast.success('מסמך נשלח לחתימה');
    },
  });

  const cancelDocument = useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase
        .from('signing_documents')
        .update({ status: 'cancelled' })
        .eq('id', documentId);
      if (error) throw error;
      await addAuditEvent(documentId, 'cancelled', user!.id, 'מסמך בוטל');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signing-documents'] });
      toast.success('מסמך בוטל');
    },
  });

  const signDocument = useMutation({
    mutationFn: async ({ documentId, signatureData, signerName }: { documentId: string; signatureData: string; signerName: string }) => {
      const { error } = await supabase
        .from('signing_documents')
        .update({ status: 'signed', signed_at: new Date().toISOString(), signature_data: signatureData })
        .eq('id', documentId);
      if (error) throw error;
      await addAuditEvent(documentId, 'signed', user?.id, `${signerName} חתם על המסמך`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signing-documents'] });
      toast.success('המסמך נחתם בהצלחה! 🎉');
    },
  });

  const declineDocument = useMutation({
    mutationFn: async ({ documentId, reason }: { documentId: string; reason: string }) => {
      const { error } = await supabase
        .from('signing_documents')
        .update({ status: 'declined', declined_at: new Date().toISOString(), decline_reason: reason })
        .eq('id', documentId);
      if (error) throw error;
      await addAuditEvent(documentId, 'declined', user?.id, `מסמך נדחה: ${reason}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signing-documents'] });
      toast.info('המסמך נדחה');
    },
  });

  const sendReminder = useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase
        .from('signing_documents')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', documentId);
      if (error) throw error;
      await addAuditEvent(documentId, 'reminder_sent', user!.id, 'תזכורת נשלחה');
    },
    onSuccess: () => toast.success('תזכורת נשלחה'),
  });

  const createTemplate = useMutation({
    mutationFn: async (payload: Omit<DocumentTemplate, 'id' | 'created_by' | 'created_at' | 'is_active'>) => {
      const { data, error } = await supabase
        .from('document_templates')
        .insert({ ...payload, created_by: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-templates'] });
      toast.success('תבנית נשמרה');
    },
  });

  const trackView = async (documentId: string) => {
    const doc = documents.find(d => d.id === documentId);
    if (!doc) return;
    await supabase
      .from('signing_documents')
      .update({ view_count: doc.view_count + 1, last_viewed_at: new Date().toISOString(), status: doc.status === 'sent' ? 'viewed' : doc.status })
      .eq('id', documentId);
    await addAuditEvent(documentId, 'viewed', user?.id, 'מסמך נצפה');
  };

  return {
    documents, templates, stats, isLoading,
    createDocument, sendDocument, cancelDocument, signDocument, declineDocument, sendReminder, createTemplate, trackView, uploadFile,
  };
}

async function addAuditEvent(documentId: string, eventType: string, actorId?: string, description?: string) {
  await supabase.from('signing_document_audit').insert({
    document_id: documentId,
    event_type: eventType,
    actor_id: actorId || null,
    actor_name: description || null,
    metadata: {},
  });
}
