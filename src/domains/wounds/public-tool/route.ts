/**
 * Where the public wound tool lives, and its screens.
 *
 * The page is /wound-tool. Screens inside it are kept in the URL hash
 * (#/wound/<id>, #/new ...) so the phone's back button steps back through
 * them and the same code works inside or outside the EMR's router.
 *
 * No imports here: src/main.tsx reads this before anything else loads.
 */

export const WOUND_TOOL_PATH = '/wound-tool';

/** True for /wound-tool and anything under it (/wound-tool/, /wound-tool/x). */
export function isPublicWoundToolPath(pathname: string): boolean {
  const p = (pathname || '').toLowerCase();
  return p === WOUND_TOOL_PATH || p.startsWith(`${WOUND_TOOL_PATH}/`);
}

export type ToolView =
  | { name: 'list' }
  | { name: 'new' }
  | { name: 'wound'; id: string }
  | { name: 'edit'; id: string }
  | { name: 'assess'; id: string }
  | { name: 'data' };

export function parseHash(hash: string): ToolView {
  const parts = (hash || '').replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const [a, b, c] = parts;
  if (a === 'new') return { name: 'new' };
  if (a === 'data') return { name: 'data' };
  if (a === 'wound' && b) {
    if (c === 'assess') return { name: 'assess', id: b };
    if (c === 'edit') return { name: 'edit', id: b };
    return { name: 'wound', id: b };
  }
  return { name: 'list' };
}

export function viewHash(v: ToolView): string {
  switch (v.name) {
    case 'new': return '#/new';
    case 'data': return '#/data';
    case 'wound': return `#/wound/${encodeURIComponent(v.id)}`;
    case 'edit': return `#/wound/${encodeURIComponent(v.id)}/edit`;
    case 'assess': return `#/wound/${encodeURIComponent(v.id)}/assess`;
    default: return '#/';
  }
}
