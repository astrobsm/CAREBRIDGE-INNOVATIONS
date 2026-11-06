/**
 * The plan builder: rules fire from answers and scores, every line has a why,
 * nothing appears twice, urgent comes first, and the output is a ScribePlan
 * that the existing approval pipeline accepts unchanged.
 */
import { describe, it, expect } from 'vitest';
import { buildReviewPlan, normaliseLine, planLines } from '../planBuilder';
import { PLAN_HEADINGS, type PlanRule } from '../types';
import { skinGraft } from '../procedures/reconstruction/skinGraft';
import { woundCareReview } from '../procedures/wound/woundCareReview';
import { filterPlan, toTreatmentPlan } from '../../scribe/approval';
import { flattenPlan } from '../../scribe/planItems';
import { adult, contextFor, planFor, provocativeAnswers } from './fixtures';

const text = (p: ReturnType<typeof planFor>) => planLines(p.plan).map(x => x.line.text).join('\n');

describe('core rules fire from the answers', () => {
  it('pre-op smoking: cessation 4 weeks before, with the reason and a counselling point', () => {
    const out = planFor(skinGraft, 'pre_op', { 'core.smoking': 'current' });
    const line = planLines(out.plan).find(x => /Stop smoking/.test(x.line.text))!;
    expect(line.where).toBe('Optimisation before surgery');
    expect(line.line.why).toMatch(/WHO 2020/);
    expect(out.counselling.some(c => c.topic === 'Smoking')).toBe(true);
  });

  it('VTE: LMWH at Caprini 3 or more, mechanical only when low, mechanical-first when bleeding risk is high', () => {
    const base = { 'core.surgery_extent': 'major', 'core.weight_kg': 70, 'core.height_cm': 175 };
    const high = planFor(skinGraft, 'pre_op', { ...base, 'core.caprini': ['malignancy'] }, adult({ ageYears: 50 }));
    expect(text(high)).toMatch(/enoxaparin 40 mg SC once daily/);
    const low = planFor(skinGraft, 'pre_op', { 'core.surgery_extent': 'minor', 'core.caprini': ['none'] }, adult({ ageYears: 30 }));
    expect(text(low)).toMatch(/Mechanical prophylaxis/);
    expect(text(low)).not.toMatch(/enoxaparin/);
    const bleed = planFor(skinGraft, 'pre_op', { ...base, 'core.caprini': ['malignancy'], 'core.platelets': 40 }, adult({ ageYears: 50 }));
    expect(text(bleed)).toMatch(/start pharmacological prophylaxis once the bleeding risk/);
  });

  it('anticoagulants: timings from preoperativeService, bridging for a mechanical valve', () => {
    const out = planFor(skinGraft, 'pre_op', { 'core.anticoagulant': ['warfarin'], 'core.anticoag_indication': 'mechanical_valve', 'core.surgery_extent': 'major' });
    expect(text(out)).toMatch(/Warfarin: stop 5 days before surgery/);
    expect(planLines(out.plan).find(x => /bridging plan/.test(x.line.text))?.line.priority).toBe('urgent');
  });

  it('PHQ-9 item 9: an urgent same-day risk assessment and a caution', () => {
    const out = planFor(woundCareReview, 'wound_review', { 'core.phq.q1': '0', 'core.phq.q2': '0', 'core.phq.q9': '2' });
    const l = planLines(out.plan).find(x => /Same-day risk assessment/.test(x.line.text))!;
    expect(l.line.priority).toBe('urgent');
    expect(out.plan.cautions.join(' ')).toMatch(/item 9/);
  });

  it('cost and distance: social work, itemised estimate, nearest PHC', () => {
    const out = planFor(woundCareReview, 'wound_review', { 'core.cost_barrier': 'no', 'core.distance': 'over_2h' });
    expect(text(out)).toMatch(/itemised estimate/);
    expect(text(out)).toMatch(/nearest primary health centre/);
  });

  it('spreading infection becomes its own problem with culture and systemic antibiotics', () => {
    const out = planFor(woundCareReview, 'wound_review', { 'core.wound_aetiology': 'venous', 'core.iwii_spreading': ['lymphangitis'] });
    const p = out.plan.problems.find(x => x.problem === 'Spreading wound infection')!;
    expect(p.investigations[0].text).toMatch(/Tissue sample for culture/);
    expect(p.treatment[0].text).toMatch(/Systemic antibiotics/);
  });

  it('compression only after an ABPI, and not with arterial disease', () => {
    expect(text(planFor(woundCareReview, 'wound_review', { 'core.wound_aetiology': 'venous' }))).toMatch(/Measure ABPI before any compression/);
    expect(text(planFor(woundCareReview, 'wound_review', { 'core.wound_aetiology': 'venous', 'wound_care_review.abpi': 1.0 }))).toMatch(/Strong compression/);
    const arterial = planFor(woundCareReview, 'wound_review', { 'core.wound_aetiology': 'venous', 'wound_care_review.abpi': 0.4 });
    expect(text(arterial)).toMatch(/Urgent vascular surgery referral; no compression/);
    expect(text(arterial)).not.toMatch(/Strong compression/);
  });

  it('post-op haematoma under a graft: urgent evacuation', () => {
    const out = planFor(skinGraft, 'post_op', { 'skin_graft.appearance': ['fluid_under'] });
    expect(planLines(out.plan).find(x => /Evacuate fluid under the graft/.test(x.line.text))?.line.priority).toBe('urgent');
    expect(out.plan.dischargeCriteria.length).toBeGreaterThan(3);
  });

  it('the module\'s follow-up schedule comes first', () => {
    const out = planFor(skinGraft, 'post_op', {});
    expect(out.followUp[0].when).toBe('Day 3–7');
    expect(out.plan.followUp[0]).toMatch(/^Day 3–7: First graft inspection/);
  });
});

describe('merging', () => {
  it('de-duplicates across rules: one line, both reasons, the higher priority', () => {
    const a: PlanRule = () => ({ general: [{ heading: 'Analgesia', items: [{ text: 'Regular paracetamol', why: 'Rule A' }] }] });
    const b: PlanRule = () => ({ problem: { treatment: [{ text: 'regular  paracetamol.', why: 'Rule B', priority: 'urgent' }] } });
    const out = buildReviewPlan(contextFor(skinGraft, 'pre_op', {}), [a, b]);
    const hits = planLines(out.plan).filter(x => normaliseLine(x.line.text) === 'regular paracetamol');
    expect(hits).toHaveLength(1);
    expect(hits[0].line.why).toBe('Rule A; Rule B');
    expect(hits[0].line.priority).toBe('urgent');
  });

  it('orders general headings by PLAN_HEADINGS and urgent lines first', () => {
    const out = planFor(skinGraft, 'pre_op', provocativeAnswers(skinGraft, 'pre_op'));
    const idx = out.plan.general.map(g => PLAN_HEADINGS.indexOf(g.heading as typeof PLAN_HEADINGS[number]));
    expect(idx).toEqual([...idx].sort((x, y) => x - y));
    for (const g of out.plan.general) {
      const firstRoutine = g.items.findIndex(l => l.priority !== 'urgent');
      if (firstRoutine >= 0) expect(g.items.slice(firstRoutine).some(l => l.priority === 'urgent')).toBe(false);
    }
  });

  it('is deterministic', () => {
    const answers = provocativeAnswers(woundCareReview, 'wound_review');
    expect(JSON.stringify(planFor(woundCareReview, 'wound_review', answers))).toBe(JSON.stringify(planFor(woundCareReview, 'wound_review', answers)));
  });
});

describe('the plan goes through the existing approval pipeline', () => {
  it('is a ScribePlan that filterPlan, flattenPlan and toTreatmentPlan accept', () => {
    const { plan } = planFor(skinGraft, 'pre_op', provocativeAnswers(skinGraft, 'pre_op'));
    const items = flattenPlan(plan);
    expect(items.length).toBeGreaterThan(10);
    const edited = filterPlan(plan, new Set([items[0].key]), 'Book theatre');
    expect(flattenPlan(edited).length).toBe(items.length);   // one removed, one added
    const tp = toTreatmentPlan(edited, { id: 't1', patientId: 'p1', scribePlanId: 's1', version: 1, createdBy: 'u1', now: new Date('2026-11-06') });
    expect(tp.orders.length).toBeGreaterThan(0);
    expect(tp.title).toMatch(/Skin graft/);
    // VTE and Analgesia lines become medication orders.
    expect(tp.orders.some(o => o.category === 'medication')).toBe(true);
  });
});
