/**
 * Pure helpers for PreviousPlansReviewGuard's "tell the parent" step.
 *
 * The guard used to notify its parent from an effect that depended on the
 * parent's inline callback and on freshly built objects. Each notification
 * set parent state, the parent re-rendered with a new callback, the effect
 * ran again, and React stopped with "Maximum update depth exceeded" on
 * /patients/:id/encounter. The guard now notifies only when the content of
 * the acknowledgement changes, identified by the key below.
 */

export interface AckContent {
  allAcked: boolean;
  executedCount: number;
  missedCount: number;
  outstandingCount: number;
  ackedExecuted: string[];
  ackedMissed: string[];
  ackedOutstanding: string[];
}

/** A stable string for the acknowledgement's content (order of ticks ignored). */
export function ackContentKey(c: AckContent): string {
  const ids = (xs: string[]) => [...xs].sort().join(',');
  return [
    c.allAcked ? 1 : 0,
    c.executedCount,
    c.missedCount,
    c.outstandingCount,
    ids(c.ackedExecuted),
    ids(c.ackedMissed),
    ids(c.ackedOutstanding),
  ].join('|');
}

/**
 * Wrap a notifier so it fires only when the content changes. Re-renders that
 * rebuild identical content (new arrays, a new callback) do not notify again.
 */
export function createAckNotifier(notify: (c: AckContent) => void): (c: AckContent) => boolean {
  let last: string | null = null;
  return (c) => {
    const key = ackContentKey(c);
    if (key === last) return false;
    last = key;
    notify(c);
    return true;
  };
}
