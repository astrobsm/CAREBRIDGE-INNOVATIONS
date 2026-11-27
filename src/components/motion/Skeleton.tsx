/**
 * Skeletons: grey placeholders with a soft shimmer, shown where content is on
 * its way (instead of a spinner). The shimmer is a transform-only sweep and
 * stops under reduced motion. Each skeleton block is aria-hidden; wrap a group
 * in <SkeletonGroup label="Loading ..."> so screen readers hear one message.
 */
import type { ReactNode } from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return <span className={`cb-skeleton block ${className}`} aria-hidden="true" />;
}

/** A busy region with one accessible "Loading..." message. */
export function SkeletonGroup({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className} role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** Lines of text; the last one is shorter, like a paragraph. */
export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <span className={`block space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={`h-3 ${i === lines - 1 && lines > 1 ? 'w-3/5' : 'w-full'}`} />
      ))}
    </span>
  );
}

/** List rows: optional avatar, a title line and a detail line. */
export function SkeletonRows({ count = 4, avatar = false, className = '' }: { count?: number; avatar?: boolean; className?: string }) {
  return (
    <ul className={`divide-y divide-gray-100 ${className}`} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="flex items-center gap-3 px-4 sm:px-6 py-3">
          {avatar && <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />}
          <span className="flex-1 min-w-0 space-y-2">
            <Skeleton className={`h-3.5 ${i % 2 ? 'w-2/5' : 'w-1/2'}`} />
            <Skeleton className={`h-3 ${i % 3 === 2 ? 'w-1/3' : 'w-3/4'}`} />
          </span>
          <Skeleton className="h-3 w-12 flex-shrink-0" />
        </li>
      ))}
    </ul>
  );
}

export default Skeleton;
