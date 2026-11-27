/**
 * Entry point. Picks which app to start before anything else loads.
 *
 * /wound-tool is the public, no-login wound tool. It must not start the EMR:
 * importing the EMR creates the Supabase client (which restores a saved
 * session and refreshes its token), starts cloud sync and seeds demo data,
 * all at module load. So the two apps are separate dynamic imports, and the
 * tool's import graph never reaches the EMR's modules. Every other path starts
 * the EMR exactly as before (src/bootEmr.tsx).
 */

import { isPublicWoundToolPath } from './domains/wounds/public-tool/route';

if (isPublicWoundToolPath(window.location.pathname)) {
  void import('./domains/wounds/public-tool/boot');
} else {
  void import('./bootEmr');
}
