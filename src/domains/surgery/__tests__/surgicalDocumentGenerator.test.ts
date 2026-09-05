/**
 * The consent document is a medico-legal record. Two things must hold:
 *
 *  1. It never attaches the wrong procedure's leaflet. A confident-looking
 *     consent form describing the wrong operation is worse than a generic one,
 *     so a weak match must fall back rather than guess.
 *  2. It always states the risks, the alternatives and what to watch for, even
 *     when the education library has nothing for the procedure.
 */

import { describe, it, expect } from 'vitest';
import {
  findEducationForProcedure,
  buildSurgicalDocument,
} from '../utils/surgicalDocumentGenerator';

const titles = (sections: ReturnType<typeof buildSurgicalDocument>) =>
  sections.map(s => s.title.toLowerCase());

describe('findEducationForProcedure', () => {
  it('returns nothing for an empty or meaningless procedure name', () => {
    expect(findEducationForProcedure('')).toBeNull();
    expect(findEducationForProcedure('   ')).toBeNull();
    // Only stop-words: carries no signal about which operation this is.
    expect(findEducationForProcedure('the of and')).toBeNull();
  });

  it('does not match on a single generic shared word', () => {
    // "surgery"/"repair"/"excision" are stop-words precisely because almost
    // every library title contains one; matching on them would attach an
    // arbitrary leaflet.
    expect(findEducationForProcedure('surgery')).toBeNull();
    expect(findEducationForProcedure('repair')).toBeNull();
    expect(findEducationForProcedure('procedure')).toBeNull();
  });

  it('does not match a procedure the library has no content for', () => {
    expect(findEducationForProcedure('Zygomaticomaxillary osteotomy')).toBeNull();
  });

  it('matches a real procedure through a verbose booking name', () => {
    // A booked case is rarely titled the way the library titles its content.
    const match = findEducationForProcedure('Left inguinal hernia mesh repair');
    expect(match).not.toBeNull();
    expect(match!.name.toLowerCase()).toContain('hernia');
  });

  it('is stable regardless of case and punctuation', () => {
    const a = findEducationForProcedure('Inguinal hernia repair');
    const b = findEducationForProcedure('INGUINAL  HERNIA, repair!');
    expect(a?.id).toBe(b?.id);
  });
});

describe('buildSurgicalDocument', () => {
  const base = {
    procedureName: 'Left inguinal hernia mesh repair',
    patient: { name: 'Test Patient', hospitalNumber: 'H1' },
  };

  it('always states the procedure, risks, alternatives and warning signs', () => {
    const t = titles(buildSurgicalDocument(base));
    expect(t).toContain('the proposed operation');
    expect(t.some(x => x.includes('risks'))).toBe(true);
    expect(t.some(x => x.includes('alternatives'))).toBe(true);
    expect(t.some(x => x.includes('urgently'))).toBe(true);
    expect(t.some(x => x.includes('before your operation'))).toBe(true);
  });

  it('still produces a complete document when nothing in the library matches', () => {
    const sections = buildSurgicalDocument({
      ...base,
      procedureName: 'Zygomaticomaxillary osteotomy',
    });
    const t = titles(sections);
    expect(t.some(x => x.includes('risks'))).toBe(true);
    expect(t.some(x => x.includes('alternatives'))).toBe(true);
    // Generic fallbacks must be non-empty, or the consent says nothing.
    const risks = sections.find(s => s.title.toLowerCase().includes('risks'));
    expect(risks?.bullets?.length).toBeGreaterThan(3);
  });

  it('names the procedure and the anaesthetic in the opening paragraph', () => {
    const sections = buildSurgicalDocument({
      ...base,
      anaesthesiaType: 'general',
      indication: 'a painful groin swelling',
    });
    const body = sections[0].body || '';
    expect(body).toContain('Left inguinal hernia mesh repair');
    expect(body).toContain('general');
    expect(body).toContain('painful groin swelling');
  });

  it('adds comorbidity-specific risks only when comorbidities are recorded', () => {
    const without = titles(buildSurgicalDocument(base));
    expect(without.some(x => x.includes('other medical conditions'))).toBe(false);

    const withDiabetes = titles(buildSurgicalDocument({
      ...base,
      comorbidities: ['diabetes'],
    }));
    expect(withDiabetes.some(x => x.includes('other medical conditions'))).toBe(true);
  });

  it('ignores "none" as a comorbidity rather than rendering an empty section', () => {
    const t = titles(buildSurgicalDocument({ ...base, comorbidities: ['none'] }));
    expect(t.some(x => x.includes('other medical conditions'))).toBe(false);
  });

  it('appends the surgeon free-text verbatim when present', () => {
    const sections = buildSurgicalDocument({
      ...base,
      additionalNotes: 'Discussed recurrence risk with the patient.',
    });
    const extra = sections.find(s => s.title.toLowerCase().includes('additional information'));
    expect(extra?.body).toBe('Discussed recurrence risk with the patient.');
  });

  it('does not emit an empty additional-information section for blank notes', () => {
    const t = titles(buildSurgicalDocument({ ...base, additionalNotes: '   ' }));
    expect(t.some(x => x.includes('additional information'))).toBe(false);
  });

  it('never emits a section that would render blank', () => {
    for (const s of buildSurgicalDocument(base)) {
      const hasBody = Boolean(s.body && s.body.trim());
      const hasBullets = Boolean(s.bullets && s.bullets.length);
      expect(hasBody || hasBullets).toBe(true);
    }
  });
});
