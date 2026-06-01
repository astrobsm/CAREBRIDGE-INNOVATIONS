// Resolves (and lazily provisions) the family.users row that corresponds to
// the currently signed-in AstroHEALTH user. The astrohealth_user_id column
// is the linking key.
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { getFamilyClient, isFamilyConfigured } from '../../../services/familyClient';
import type { FamilyParent } from '../types';

interface State {
  parent: FamilyParent | null;
  loading: boolean;
  error: string | null;
  configured: boolean;
  reload: () => void;
}

export function useFamilyParent(): State {
  const { user } = useAuth();
  const [parent, setParent] = useState<FamilyParent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const configured = isFamilyConfigured();

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!user) {
        setParent(null);
        setLoading(false);
        return;
      }
      if (!configured) {
        setLoading(false);
        setError('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const fam = getFamilyClient();
        const existing = await fam
          .from('users')
          .select('*')
          .eq('astrohealth_user_id', user.id)
          .maybeSingle();
        if (existing.error) throw existing.error;
        if (existing.data) {
          if (!cancelled) setParent(existing.data as FamilyParent);
        } else {
          const insert = await fam
            .from('users')
            .insert({
              email: user.email,
              password_hash: 'astrohealth_sso',
              first_name: user.firstName || 'User',
              last_name: user.lastName || '',
              phone: user.phone || null,
              astrohealth_user_id: user.id,
            })
            .select('*')
            .single();
          if (insert.error) throw insert.error;
          if (!cancelled) setParent(insert.data as FamilyParent);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [user, configured, tick]);

  return { parent, loading, error, configured, reload };
}
