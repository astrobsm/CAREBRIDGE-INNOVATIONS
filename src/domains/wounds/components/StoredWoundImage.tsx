/**
 * A wound photograph from whatever was stored for it.
 *
 * Assessment photos are kept as data URLs, or carry a `url` when an uploaded
 * copy exists. Records imported from older modules can carry anything in that
 * field — including a logical storage reference ("/wound-images?ref=abc", or a
 * bare key) rather than a URL a browser can load. As an <img src> such a path
 * hits the app's own router and the picture silently never appears, leaving a
 * broken-image icon where clinical evidence should be.
 *
 * So only sources a browser can actually load (data:, blob:, http(s):) are
 * rendered; anything else — and any image that fails to load — shows a plain
 * "not available" placeholder that says what is missing.
 */
import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';

/** True when `src` is something an <img> can load, rather than a storage reference. */
export function isLoadableImageSrc(src?: string | null): src is string {
  return !!src && /^(data:image\/|blob:|https?:)/i.test(src.trim());
}

/** The first loadable source among the candidates, in order of preference. */
export function pickImageSrc(...candidates: Array<string | null | undefined>): string | null {
  for (const c of candidates) if (isLoadableImageSrc(c)) return c.trim();
  return null;
}

export function StoredWoundImage({
  src,
  alt,
  className,
  loading = 'lazy',
}: {
  src?: string | null;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}) {
  const usable = isLoadableImageSrc(src) ? src.trim() : null;
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [usable]);

  if (!usable || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1 bg-gray-50 text-gray-400 text-xs text-center p-2 ${className || ''}`}
        role="img"
        aria-label={`${alt} (not available)`}
      >
        <ImageOff className="w-5 h-5" />
        Photograph not available on this device yet
      </div>
    );
  }
  return <img src={usable} alt={alt} className={className} loading={loading} onError={() => setFailed(true)} />;
}

export default StoredWoundImage;
