/**
 * Consent composition: the existing document builder, extended with the
 * procedure's education record, the module's ConsentSpec and the patient's
 * own risk modifiers.
 */
import { describe, it, expect } from 'vitest';
import {
  buildConsentDraft, consentApplies, counsellingGaps, CORE_COUNSELLING_TOPICS, emptyCounselling, finaliseCounselling, patientRisks,
} from '../consent';
import { skinGraft } from '../procedures/reconstruction/skinGraft';
import { woundCareReview } from '../procedures/wound/woundCareReview';
import { buildSurgicalDocument } from '../../../surgery/utils/surgicalDocumentGenerator';
import { adult, contextFor } from './fixtures';

const doc = { patient: { name: 'Test Patient', hospitalNumber: 'H1' } };
const titles = (d: ReturnType<typeof buildConsentDraft>) => d!.sections.map(s => s.title);

describe('patient-specific risk modifiers', () => {
  it('fire on the patient\'s own answers', () => {
    const ctx = contextFor(skinGraft, 'pre_op', {
      'core.smoking': 'current', 'core.diabetes': 'insulin', 'core.radiotherapy_site': true, 'skin_graft.bed': 'irradiated',
    });
    const ids = patientRisks(ctx).map(r => r.why);
    expect(ids).toEqual(expect.arrayContaining(['Smoking / nicotine (WHO 2020)', 'Diabetes', 'Previous radiotherapy to the site', 'Recipient bed not ready / irradiated']));
  });

  it('add nothing for a patient without risk factors', () => {
    expect(patientRisks(contextFor(skinGraft, 'pre_op', { 'core.smoking': 'never' }))).toEqual([]);
  });

  it('use BMI from the review for obesity', () => {
    const ctx = contextFor(skinGraft, 'pre_op', { 'core.weight_kg': 110, 'core.height_cm': 170 });
    expect(patientRisks(ctx).some(r => r.why === 'BMI 30 or more')).toBe(true);
  });
});

describe('buildConsentDraft', () => {
  const ctx = contextFor(skinGraft, 'pre_op', { 'core.smoking': 'current', 'core.anaesthesia_planned': 'spinal' });
  const draft = buildConsentDraft(ctx, [{ topic: 'Smoking', text: 'Stop', why: 'x' }], doc)!;

  it('builds on buildSurgicalDocument with the patient-specific section', () => {
    expect(titles(draft)).toEqual(expect.arrayContaining([
      'The proposed operation', 'Risks and possible complications', 'Risks that apply to you in particular',
      'Alternatives to this operation', 'If you decide not to have treatment', 'Additional procedures that may become necessary',
      'Other matters you are asked to agree to',
    ]));
    expect(draft.sections[0].body).toMatch(/spinal/i);
  });

  it('states procedure risks with frequencies from the education record, without repeating them', () => {
    const risks = draft.sections.find(s => s.title === 'Risks and possible complications')!.bullets!;
    expect(risks.some(r => /^Graft Failure: .*\(about/.test(r))).toBe(true);
    // The module's own "Graft failure" is not added again beside the record's "Graft Failure".
    expect(risks.filter(r => /^graft failure/i.test(r))).toHaveLength(1);
  });

  it('keeps non-operative care among the alternatives', () => {
    const alt = draft.sections.find(s => s.title === 'Alternatives to this operation')!.bullets!;
    expect(alt[0]).toMatch(/No treatment/);
    expect(alt.some(a => /secondary intention/.test(a))).toBe(true);
  });

  it('lists each alternative once (module list replaces the education record list)', () => {
    const alt = draft.sections.find(s => s.title === 'Alternatives to this operation')!.bullets!;
    expect(alt.filter(a => /secondary intention/i.test(a))).toHaveLength(1);
    expect(alt.filter(a => /negative[- ]pressure/i.test(a))).toHaveLength(1);
  });

  it('asks about photography and blood products', () => {
    const other = draft.sections.find(s => s.title === 'Other matters you are asked to agree to')!.bullets!.join(' ');
    expect(other).toMatch(/photographs/);
    expect(other).toMatch(/Blood transfusion is possible/);
  });

  it('offers the core topics, the module topics and the plan\'s counselling points', () => {
    expect(draft.topics).toEqual(expect.arrayContaining([...CORE_COUNSELLING_TOPICS, 'Sun protection for at least 12 months', 'Smoking: Stop']));
  });

  it('is null where the module takes no consent at that phase', () => {
    expect(consentApplies({ module: skinGraft, phase: 'post_op' })).toBe(false);
    expect(buildConsentDraft(contextFor(skinGraft, 'post_op', {}), [], doc)).toBeNull();
    expect(consentApplies({ module: woundCareReview, phase: 'wound_review' })).toBe(true);
  });
});

describe('buildSurgicalDocument is extended, not changed', () => {
  it('produces none of the new sections when the new inputs are absent', () => {
    const t = buildSurgicalDocument({ procedureName: 'Zygomaticomaxillary osteotomy', patient: doc.patient }).map(s => s.title);
    expect(t).not.toContain('Risks that apply to you in particular');
    expect(t).not.toContain('If you decide not to have treatment');
    expect(t).not.toContain('Other matters you are asked to agree to');
  });
});

describe('the counselling record', () => {
  it('takes capacity, language and interpreter from the assessment and the clinician from the session', () => {
    const r = finaliseCounselling(emptyCounselling(), { 'core.capacity': 'has_capacity', 'core.language': 'yoruba', 'core.interpreter_needed': true },
      { id: 'u1', name: 'Dr A', role: 'registrar' }, '2026-11-06T10:00:00Z');
    expect(r).toMatchObject({ capacity: 'has_capacity', language: 'yoruba', interpreterUsed: true, clinicianName: 'Dr A', recordedAt: '2026-11-06T10:00:00Z' });
  });

  it('lists what is missing without blocking', () => {
    const draft = buildConsentDraft(contextFor(skinGraft, 'pre_op', {}), [], doc);
    const gaps = counsellingGaps({ ...emptyCounselling(), decision: 'consents', interpreterUsed: true }, draft);
    expect(gaps).toEqual(expect.arrayContaining(['How understanding was checked (teach-back)', 'Photography consent', 'Interpreter\'s name', 'Witness name']));
    expect(gaps.some(g => /topic/.test(g))).toBe(true);
  });
});

describe('a module with no risk factors still has a complete consent form', () => {
  it('for the wound debridement consent', () => {
    const d = buildConsentDraft(contextFor(woundCareReview, 'wound_review', {}, adult()), [], doc)!;
    expect(d.procedureName).toBe('Wound debridement and dressing');
    expect(titles(d)).toContain('Get medical help urgently if you notice');
  });
});
