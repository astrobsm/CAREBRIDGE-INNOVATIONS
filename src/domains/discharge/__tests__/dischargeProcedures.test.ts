import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { Surgery } from '../../../types';
import {
  surgeriesForAdmission,
  buildDischargeProcedures,
  surgeonNameOf,
  surgeryOutcome,
  procedureLinesFor,
} from '../services/dischargeProcedures';

const surgery = (o: Partial<Surgery>): Surgery => ({
  id: 's', patientId: 'p1', hospitalId: 'h', procedureName: 'Split skin graft', type: 'elective',
  category: 'major', preOperativeAssessment: {} as Surgery['preOperativeAssessment'],
  scheduledDate: new Date(2026, 10, 12, 9), status: 'completed', surgeon: 'Dr Okafor',
  createdAt: new Date(), updatedAt: new Date(), ...o,
});

const admission = { patientId: 'p1', admissionDate: new Date(2026, 10, 10, 14) };
const now = new Date(2026, 10, 20);

describe('surgeriesForAdmission', () => {
  it('keeps this patient\'s operations inside the admission window', () => {
    const list = [
      surgery({ id: 'in', scheduledDate: new Date(2026, 10, 12) }),
      surgery({ id: 'sameDayMorning', scheduledDate: new Date(2026, 10, 10, 0) }),
      surgery({ id: 'before', scheduledDate: new Date(2026, 9, 1) }),
      surgery({ id: 'otherPatient', patientId: 'p2' }),
      surgery({ id: 'cancelled', status: 'cancelled' }),
      surgery({ id: 'future', scheduledDate: new Date(2026, 11, 1) }),
    ];
    expect(surgeriesForAdmission(list, admission, now).map(s => s.id)).toEqual(['sameDayMorning', 'in']);
  });

  it('prefers the actual start time over the scheduled date', () => {
    const s = surgery({ scheduledDate: new Date(2026, 9, 1), actualStartTime: new Date(2026, 10, 13) });
    expect(surgeriesForAdmission([s], admission, now)).toHaveLength(1);
  });
});

describe('buildDischargeProcedures', () => {
  const s1 = surgery({ id: 's1', procedureName: 'Split skin graft', actualStartTime: new Date(2026, 10, 12, 10), surgeonId: 'u9', complications: 'Graft haematoma' });
  const s2 = surgery({ id: 's2', procedureName: 'Wound debridement', scheduledDate: new Date(2026, 10, 11), surgeon: 'Dr Eze', complications: 'None' });
  const users = [{ id: 'u9', firstName: 'Ada', lastName: 'Nwosu' }];

  it('takes date, surgeon and outcome from the matching surgery', () => {
    const [a, b] = buildDischargeProcedures('Split skin graft to leg\nwound debridement', [s1, s2], users);
    expect(a).toMatchObject({ name: 'Split skin graft to leg', surgeon: 'Ada Nwosu', outcome: 'Completed; complications: Graft haematoma', surgeryId: 's1' });
    expect(a.date?.getDate()).toBe(12);
    expect(b).toMatchObject({ surgeon: 'Dr Eze', outcome: 'Completed; no complications recorded', surgeryId: 's2' });
  });

  it('never invents details for a line with no surgery record', () => {
    const [p] = buildDischargeProcedures('Bedside escharotomy', [s1], users);
    expect(p).toEqual({ name: 'Bedside escharotomy', surgeon: '', outcome: '' });
    expect(p.date).toBeUndefined();
  });

  it('matches each surgery at most once', () => {
    const out = buildDischargeProcedures('Split skin graft\nSplit skin graft', [s1], users);
    expect(out[0].surgeryId).toBe('s1');
    expect(out[1].surgeryId).toBeUndefined();
  });

  it('returns [] for empty text', () => {
    expect(buildDischargeProcedures('', [s1])).toEqual([]);
    expect(buildDischargeProcedures('  \n ', [s1])).toEqual([]);
  });

  it('pre-fills one line per recorded surgery', () => {
    expect(procedureLinesFor([s2, s1])).toBe('Wound debridement\nSplit skin graft');
  });
});

describe('surgeonNameOf / surgeryOutcome', () => {
  it('does not return ids or "undefined undefined" as a name', () => {
    expect(surgeonNameOf({ surgeon: 'undefined undefined' })).toBe('');
    expect(surgeonNameOf({ surgeon: '3f2b1c4d-1111-2222-3333-444455556666' })).toBe('');
    expect(surgeonNameOf({ surgeon: 'Dr A' })).toBe('Dr A');
  });

  it('leaves the outcome empty when the status does not say', () => {
    expect(surgeryOutcome({ status: 'incomplete_preparation' })).toBe('');
    expect(surgeryOutcome({ status: 'completed' })).toBe('Completed');
  });
});

describe('DischargeFormModal', () => {
  it('no longer fabricates surgeon / outcome / date', () => {
    const src = readFileSync(join(process.cwd(), 'src/domains/discharge/components/DischargeFormModal.tsx'), 'utf8');
    expect(src).not.toMatch(/outcome:\s*'Successful'/);
    expect(src).toMatch(/buildDischargeProcedures\(data\.proceduresPerformed, admissionSurgeries/);
  });
});
