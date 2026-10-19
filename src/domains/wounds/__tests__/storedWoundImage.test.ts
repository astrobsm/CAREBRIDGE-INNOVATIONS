/**
 * Wound photographs render from what was stored for them, or say plainly that
 * they are not available — never as a broken-image icon where clinical
 * evidence should be. Records imported from older modules can carry a storage
 * reference rather than a loadable URL.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { isLoadableImageSrc, pickImageSrc } from '../components/StoredWoundImage';

describe('stored wound photographs', () => {
  it('renders only what a browser can load', () => {
    expect(isLoadableImageSrc('data:image/jpeg;base64,AAAA')).toBe(true);
    expect(isLoadableImageSrc('blob:https://app/123')).toBe(true);
    expect(isLoadableImageSrc('https://cdn.example/w.jpg')).toBe(true);
    expect(isLoadableImageSrc('/wound-images?ref=abc')).toBe(false);
    expect(isLoadableImageSrc('abc123')).toBe(false);
    expect(isLoadableImageSrc('')).toBe(false);
    expect(isLoadableImageSrc(undefined)).toBe(false);
  });

  it('prefers the first loadable source', () => {
    expect(pickImageSrc(undefined, '/wound-images?ref=x', 'https://a/b.jpg')).toBe('https://a/b.jpg');
    expect(pickImageSrc('data:image/png;base64,A', 'https://a/b.jpg')).toBe('data:image/png;base64,A');
    expect(pickImageSrc(null, 'ref-only')).toBeNull();
  });
});

describe('the wound monitor uses it for every stored photograph', () => {
  const page = readFileSync(join(process.cwd(), 'src/domains/wounds/pages/WoundProgressMonitorPage.tsx'), 'utf8');
  it('thumbnails and the viewer go through StoredWoundImage', () => {
    expect((page.match(/<StoredWoundImage/g) || []).length).toBe(2);
    expect(page).not.toMatch(/src=\{(r\.)?photo\.imageData \|\| (r\.)?photo\.url\}/);
  });
});
