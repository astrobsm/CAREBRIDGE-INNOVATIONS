/**
 * Entry point. Picks which app to start before anything else loads.
 *
 * /wound-tool is the public, no-login wound tool. It must not start the EMR:
 * importing the EMR creates the Supabase client (which restores a saved
 * session and refreshes its token), starts cloud sync and seeds demo data,
 * all at module load. So the two apps are separate dynamic imports, and the
 * tool's import graph never reaches the EMR's modules. Every other path starts
 * the EMR exactly as before (src/bootEmr.tsx).
 *
 * /review/<token> is a view-only patient review link, opened by an invited
 * doctor without signing in. Same rule: its own light start-up, which talks
 * to the server only through two anonymous RPCs (src/domains/review-share/viewer).
 */

import { isPublicWoundToolPath } from './domains/wounds/public-tool/route';
import { isPublicReviewPath } from './domains/review-share/route';

if (isPublicWoundToolPath(window.location.pathname)) {
  void import('./domains/wounds/public-tool/boot');
} else if (isPublicReviewPath(window.location.pathname)) {
  void import('./domains/review-share/viewer/boot');
} else {
  void import('./bootEmr');
}
