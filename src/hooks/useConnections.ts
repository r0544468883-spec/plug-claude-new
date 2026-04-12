import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { ConnectionStatus } from '@/lib/connection-utils';

interface Connection {
  id: string;
  requester_id: string;
  addressee_id: string;
  circle: 'colleague' | 'recruiter';
  status: string;
  source: string;
  message: string | null;
  created_at: string;
  accepted_at: string | null;
  profile?: {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
    personal_tagline?: string | null;
  };
}

export function useConnections(filterCircle?: 'colleague' | 'recruiter') {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all connections for the current user
  const { data: allConnections = [], isLoading } = useQuery({
    queryKey: ['connections', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await (supabase as any)
        .from('connections')
        .select('*')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get all related user IDs
      const userIds = new Set<string>();
      (data || []).forEach((c: any) => {
        if (c.requester_id !== user.id) userIds.add(c.requester_id);
        if (c.addressee_id !== user.id) userIds.add(c.addressee_id);
      });

      if (userIds.size === 0) return data || [];

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles_secure')
        .select('user_id, full_name, avatar_url')
        .in('user_id', Array.from(userIds));

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p])
      );

      return (data || []).map((c: any) => ({
        ...c,
        profile: profileMap.get(
          c.requester_id === user.id ? c.addressee_id : c.requester_id
        ),
      }));
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  // Derived lists
  const connections = allConnections.filter(
    (c: Connection) =>
      c.status === 'accepted' &&
      (!filterCircle || c.circle === filterCircle)
  );

  const pendingReceived = allConnections.filter(
    (c: Connection) =>
      c.status === 'pending' && c.addressee_id === user?.id
  );

  const pendingSent = allConnections.filter(
    (c: Connection) =>
      c.status === 'pending' && c.requester_id === user?.id
  );

  // Get connection status for a specific user
  function connectionStatus(targetUserId: string): ConnectionStatus {
    const conn = allConnections.find(
      (c: Connection) =>
        (c.requester_id === targetUserId || c.addressee_id === targetUserId) &&
        c.status !== 'declined'
    );
    if (!conn) return 'none';
    if (conn.status === 'accepted') return 'connected';
    if (conn.requester_id === user?.id) return 'pending_sent';
    return 'pending_received';
  }

  // Find connection record for a user
  function findConnection(targetUserId: string): Connection | undefined {
    return allConnections.find(
      (c: Connection) =>
        (c.requester_id === targetUserId || c.addressee_id === targetUserId) &&
        c.status !== 'declined'
    );
  }

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['connections'] });
  };

  // Send connection request
  const sendRequest = useMutation({
    mutationFn: async ({
      targetUserId,
      circle = 'colleague' as 'colleague' | 'recruiter',
      message,
      source = 'manual',
    }: {
      targetUserId: string;
      circle?: 'colleague' | 'recruiter';
      message?: string;
      source?: string;
    }) => {
      // Recruiter circle = auto-accept
      const autoAccept = circle === 'recruiter';

      const { error } = await (supabase as any)
        .from('connections')
        .insert({
          requester_id: user!.id,
          addressee_id: targetUserId,
          circle,
          status: autoAccept ? 'accepted' : 'pending',
          accepted_at: autoAccept ? new Date().toISOString() : null,
          source,
          message: message || null,
        });

      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  // Accept connection request
  const acceptRequest = useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await (supabase as any)
        .from('connections')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', connectionId);

      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  // Decline connection request
  const declineRequest = useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await (supabase as any)
        .from('connections')
        .update({ status: 'declined' })
        .eq('id', connectionId);

      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  // Remove connection
  const removeConnection = useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await (supabase as any)
        .from('connections')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    connections,
    pendingReceived,
    pendingSent,
    allConnections,
    isLoading,
    connectionStatus,
    findConnection,
    sendRequest,
    acceptRequest,
    declineRequest,
    removeConnection,
    connectionCount: connections.length,
    pendingCount: pendingReceived.length,
  };
}
