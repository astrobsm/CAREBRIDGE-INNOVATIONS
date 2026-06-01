// Realtime subscription helper for family.* tables.
// Returns an unsubscribe function. Caller passes the parent_id scope.
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../../../services/supabaseClient';

type Handler = (payload: { table: string; eventType: string }) => void;

export function subscribeFamilyChanges(parentId: string, onChange: Handler): () => void {
  if (!supabase || !parentId) return () => undefined;
  const channel: RealtimeChannel = supabase
    .channel(`family-${parentId}`)
    .on(
      // @ts-expect-error - postgres_changes event is supported at runtime
      'postgres_changes',
      { event: '*', schema: 'family' },
      (payload: { table?: string; eventType?: string }) => {
        onChange({ table: payload.table || 'unknown', eventType: payload.eventType || 'change' });
      }
    )
    .subscribe();
  return () => {
    supabase?.removeChannel(channel);
  };
}
