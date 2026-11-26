import { describe, it, expect, vi } from 'vitest';
import { ackContentKey, createAckNotifier, type AckContent } from '../previousPlansAck';

const base = (): AckContent => ({
  allAcked: false,
  executedCount: 2,
  missedCount: 1,
  outstandingCount: 0,
  ackedExecuted: ['a'],
  ackedMissed: [],
  ackedOutstanding: [],
});

describe('PreviousPlansReviewGuard acknowledgement notifier', () => {
  it('notifies once for content rebuilt on every render (the update-depth loop)', () => {
    const notify = vi.fn();
    const send = createAckNotifier(notify);
    // Simulate the parent re-rendering many times with fresh arrays/objects.
    for (let i = 0; i < 100; i++) send(base());
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it('notifies again when a tick changes, and when everything is acknowledged', () => {
    const notify = vi.fn();
    const send = createAckNotifier(notify);
    send(base());
    send({ ...base(), ackedExecuted: ['a', 'b'] });
    send({ ...base(), ackedExecuted: ['a', 'b'], ackedMissed: ['m'], allAcked: true });
    expect(notify).toHaveBeenCalledTimes(3);
    expect(notify.mock.calls[2][0].allAcked).toBe(true);
  });

  it('ignores the order in which items were ticked', () => {
    expect(ackContentKey({ ...base(), ackedExecuted: ['b', 'a'] }))
      .toBe(ackContentKey({ ...base(), ackedExecuted: ['a', 'b'] }));
  });

  it('notifies when the counts change (sessions loaded)', () => {
    const notify = vi.fn();
    const send = createAckNotifier(notify);
    send({ ...base(), executedCount: 0, missedCount: 0, ackedExecuted: [], allAcked: true });
    send(base());
    expect(notify).toHaveBeenCalledTimes(2);
  });
});
