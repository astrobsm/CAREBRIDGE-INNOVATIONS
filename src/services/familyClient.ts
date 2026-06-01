// Family domain Supabase client.
// Talks directly to the `family.*` Postgres schema. Same Supabase project
// AstroHEALTH uses for cloud sync — no separate backend.
import { supabase } from './supabaseClient';

export function getFamilyClient() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
    );
  }
  // @ts-expect-error - schema() is supported at runtime; types restrict to declared schemas
  return supabase.schema('family');
}

export const isFamilyConfigured = () => supabase !== null;
