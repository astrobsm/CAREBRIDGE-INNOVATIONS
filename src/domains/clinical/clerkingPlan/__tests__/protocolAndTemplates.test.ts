import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { WOUND_CLINIC_PROTOCOL_V1 as WP, WOUND_PROTOCOL_SOURCE } from '../protocols/woundClinic.v1';
import { HIGH_CRP_OWNER_DECISION } from '../ownerDecisions';
import { CONDITIONS, conditionsIn, suggestedConditions } from '../conditions';
import { COMPLAINTS, COMPLAINT_BY_ID } from '../../clerking/complaints';
import { MODULES } from '../../clerking/modules';
import { EXAM_SECTIONS } from '../../clerking/examination';
import { questionsForComplaint, examSectionsFor } from '../../clerking/engine';
import { patientText } from '../../../patient-pack/locale/en';
import { PATIENT_COPY_EXCLUDE } from '../../procedureReview/pdf';
import { SCORE_TERMS } from '../../../patient-pack/patientPack';
import { complaint } from './fixtures';

// The owner's text, with markdown emphasis and links reduced to their words.
const md = readFileSync(join(process.cwd(), 'docs/protocols/wound-clinic-protocol.md'), 'utf8')
  .replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

describe('wound clinic protocol config is the owner\'s text, verbatim', () => {
  it('names its source', () => {
    expect(WP.source).toBe(WOUND_PROTOCOL_SOURCE);
    expect(WOUND_PROTOCOL_SOURCE).toBe('AstroHEALTH Wound Clinic Protocol: Baseline Investigations and Micronutrient Support (26 Nov 2026)');
  });
  it('every table cell is in the markdown', () => {
    const cells: string[] = [
      ...WP.baseline.flatMap(t => [t.test, t.why, t.target]),
      ...WP.targeted.flatMap(t => [t.situation, t.investigation]),
      ...WP.monitoring.rows.flatMap(r => [r.when, r.what]),
      ...WP.adultMicronutrients.rows.flatMap(r => [r.nutrient, r.who, r.dose, r.duration]),
      ...WP.childMicronutrients.rows.flatMap(r => [r.nutrient, r.who, r.dose, r.duration]),
      WP.monitoring.principle, WP.adultMicronutrients.principle, WP.adultMicronutrients.upperLimits, WP.childMicronutrients.principle,
    ];
    for (const c of cells) expect(md, c).toContain(c);
  });
  it('every caution is in the markdown (citation links removed)', () => {
    for (const c of Object.values(WP.cautions)) {
      const [head, ...rest] = c.split(': ');
      const body = rest.join(': ');
      expect(md).toContain(`${head}: ${body.split('. ')[0]}`);
    }
  });
  it('the child dose numbers match the child table', () => {
    expect(md).toContain('0.5–1 mg/kg once daily (maximum 40 mg/day)');
    expect(md).toContain('3 mg/kg once daily; up to 6 mg/kg/day in severe anaemia (maximum 200 mg/day)');
    expect(WP.childDosing.adultCapMg).toEqual({ zinc: 50, iron: 65, folicAcid: 5 });
  });
  it('"high CRP" is above 5 mg/L, the owner decision of 2026-11-27 (WHO 2020)', () => {
    expect(WP.thresholds.highCrpAboveMgL).toBe(HIGH_CRP_OWNER_DECISION.highAboveMgL);
    expect(HIGH_CRP_OWNER_DECISION.highAboveMgL).toBe(5);
    expect(HIGH_CRP_OWNER_DECISION.source).toMatch(/WHO 2020/);
  });
});

describe('condition templates', () => {
  it('cover the conditions the owner listed', () => {
    const ids = CONDITIONS.map(t => t.id);
    for (const id of ['syndactyly', 'polydactyly', 'congenital_hand', 'trigger_finger', 'dupuytren', 'carpal_tunnel', 'ganglion', 'hypospadias', 'lipoma_cyst', 'keloid',
      'burn_contracture', 'chronic_wound', 'diabetic_foot', 'pressure_injury', 'cellulitis_abscess', 'hand_trauma', 'facial_laceration', 'breast_hypertrophy',
      'gynaecomastia', 'vascular_anomaly', 'pigmented_lesion', 'lymphoedema']) expect(ids).toContain(id);
  });
  it('question ids carry the template prefix and never collide', () => {
    const seen = new Set<string>();
    for (const t of CONDITIONS) {
      for (const q of [...t.history.questions, ...t.exam.questions]) {
        expect(q.id.startsWith(t.prefix), `${t.id}: ${q.id}`).toBe(true);
        expect(seen.has(q.id), q.id).toBe(false);
        seen.add(q.id);
        if (q.type === 'select' || q.type === 'multiselect') expect(q.options?.length).toBeGreaterThan(1);
        for (const r of q.redFlags ?? []) expect(q.options).toContain(r);
      }
    }
  });
  it('join the clerking catalogue: modules, exams and complaints', () => {
    expect(new Set(COMPLAINTS.map(c => c.id)).size).toBe(COMPLAINTS.length);
    for (const t of CONDITIONS) {
      expect(MODULES[t.history.id]).toBe(t.history);
      expect(EXAM_SECTIONS[t.exam.id]).toBe(t.exam);
      const ids = t.complaintIds.length ? t.complaintIds : [`cond_${t.id}`];
      for (const id of ids) {
        expect(COMPLAINT_BY_ID[id]?.modules).toContain(t.history.id);
        expect(COMPLAINT_BY_ID[id]?.exams).toContain(t.exam.id);
      }
      expect(t.sources.length).toBeGreaterThan(0);
      expect((patientText.plan.conditions as Record<string, unknown>)[t.id], `locale for ${t.id}`).toBeTruthy();
    }
  });
  it('picking the complaint shows the condition fields', () => {
    const c = complaint('cond_syndactyly', 'Syndactyly');
    expect(questionsForComplaint(c).map(m => m.title)).toContain('Syndactyly history');
    expect(examSectionsFor({ complaints: [c] })).toContain('cond_syndactyly_exam');
    expect(conditionsIn({ complaints: [complaint('keloid', 'Keloid')] }).map(t => t.id)).toEqual(['keloid']);
    expect(suggestedConditions({ complaints: [complaint('congenital_hand', 'Congenital hand difference')] }).map(t => t.id)).toEqual(['syndactyly', 'polydactyly', 'congenital_hand']);
  });
  it('AI-drafted modules are listed after the fixed ones and labelled', () => {
    const c = { ...complaint('other', 'Accessory tragus'), aiFields: { modules: [{ id: 'ai_h', title: 'History', questions: [{ id: 'ai_x', label: 'X', type: 'text' as const }] }], status: 'draft' as const, draftedAt: '', source: 'Claude' } };
    const titles = questionsForComplaint(c).map(m => m.title);
    expect(titles[titles.length - 1]).toBe('History — AI-drafted fields');
  });
  it('patient strings in the locale contain no scores or sensitive content', () => {
    const walk = (v: unknown): string[] => typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(walk) : v && typeof v === 'object' ? Object.values(v).flatMap(walk) : [];
    for (const s of walk(patientText.plan)) {
      expect(PATIENT_COPY_EXCLUDE.test(s), s).toBe(false);
      expect(SCORE_TERMS.test(s), s).toBe(false);
    }
  });
});
