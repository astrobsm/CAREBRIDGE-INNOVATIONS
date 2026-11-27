/**
 * Where the public review viewer lives.
 *
 * A review link is /review/<token>. The token is the only secret: 32 random
 * bytes, base64url. The server keeps only its sha256.
 *
 * No imports here: src/main.tsx reads this before anything else loads.
 */

export const REVIEW_PATH = '/review';

/** True for /review and anything under it. */
export function isPublicReviewPath(pathname: string): boolean {
  const p = (pathname || '').toLowerCase();
  return p === REVIEW_PATH || p.startsWith(`${REVIEW_PATH}/`);
}

/** The token in /review/<token>, or null when there is none that could be valid. */
export function reviewTokenFromPath(pathname: string): string | null {
  const m = /^\/review\/([A-Za-z0-9_-]{32,128})\/?$/i.exec(pathname || '');
  return m ? m[1] : null;
}
