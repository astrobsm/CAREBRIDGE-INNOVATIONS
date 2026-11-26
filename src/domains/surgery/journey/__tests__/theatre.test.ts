import { describe, it, expect } from 'vitest';
import { WHO_PHASES, completePhase, phaseOutstanding, theatreStepBlockers } from '../whoChecklist';
import { startSurgeryDecision, overrideRecord } from '../theatreGate';
import type { Readiness } from '../readiness';

const NOW = new Date('2026-11-25T08:00:00Z');
const all = (id: 'signIn' | 'timeOut' | 'signOut') =>
  Object.fromEntries(WHO_PHASES.find(p => p.id === id)!.items.map(i => [i.id, true]));
const ready: Readiness = { ready: true, items: [], missing: [] };
const notReady: Readiness = { ready: false, items: [], missing: ['Payment evidence uploaded'] };
const who = { id: 'u1', name: 'Dr A' };

describe('WHO Surgical Safety Checklist', () => {
  it('has the three WHO 2009 phases with their items', () => {
    expect(WHO_PHASES.map(p => p.id)).toEqual(['signIn', 'timeOut', 'signOut']);
    expect(WHO_PHASES.map(p => p.items.length)).toEqual([7, 7, 5]);
  });

  it('refuses to complete a phase with an unticked item', () => {
    const items = { ...all('signIn'), pulse_oximeter: false };
    expect(() => completePhase('signIn', undefined, items, who, NOW)).toThrow(/Pulse oximeter/);
    expect(phaseOutstanding('signIn', { items }).map(i => i.id)).toEqual(['pulse_oximeter']);
  });

  it('records who completed a phase and when', () => {
    const c = completePhase('signIn', undefined, all('signIn'), who, NOW);
    expect(c.signIn).toMatchObject({ completedBy: 'u1', completedByName: 'Dr A', completedAt: NOW });
  });

  it('ending the operation needs time out, sign out and the wound class', () => {
    let c = completePhase('signIn', undefined, all('signIn'), who, NOW);
    expect(theatreStepBlockers('start', c)).toEqual([]);
    expect(theatreStepBlockers('end', c)).toEqual(['WHO Time out', 'WHO Sign out', 'Wound class']);
    c = completePhase('timeOut', c, all('timeOut'), who, NOW);
    c = completePhase('signOut', c, all('signOut'), who, NOW);
    expect(theatreStepBlockers('end', c, 'clean')).toEqual([]);
  });
});

describe('Start Surgery gate', () => {
  const signedIn = completePhase('signIn', undefined, all('signIn'), who, NOW);

  it('starts when ready and signed in', () => {
    expect(startSurgeryDecision(ready, signedIn).allowed).toBe(true);
  });

  it('does not start without the WHO sign in, even with an override', () => {
    const d = startSurgeryDecision(notReady, undefined, 'Emergency: necrotising infection, cannot wait');
    expect(d.allowed).toBe(false);
    expect(d.checklistMissing).toEqual(['WHO Sign in']);
  });

  it('does not start when not ready, unless an override reason is given', () => {
    expect(startSurgeryDecision(notReady, signedIn).allowed).toBe(false);
    expect(startSurgeryDecision(notReady, signedIn, 'short').allowed).toBe(false);
    const d = startSurgeryDecision(notReady, signedIn, 'Emergency: bleeding, payment to follow');
    expect(d).toMatchObject({ allowed: true, overridden: true });
    expect(overrideRecord(d, ' Emergency: bleeding, payment to follow ', who, NOW)).toEqual({
      at: NOW, by: 'u1', byName: 'Dr A', reason: 'Emergency: bleeding, payment to follow', missing: ['Payment evidence uploaded'],
    });
  });

  it('treats unreadable readiness as not ready', () => {
    expect(startSurgeryDecision(null, signedIn).allowed).toBe(false);
  });
});
