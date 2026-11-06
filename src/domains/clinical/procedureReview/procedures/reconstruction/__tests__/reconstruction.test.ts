/** Key behaviours of the reconstruction flap / contracture modules (the registry test checks the contract). */
import { describe, it, expect } from 'vitest';
import { planLines } from '../../../planBuilder';
import { patientRisks } from '../../../consent';
import { contextFor, planFor, adult } from '../../../__tests__/fixtures';
import type { PriorReview } from '../../../types';
import { localRegionalFlap } from '../localRegionalFlap';
import { freeFlap } from '../freeFlap';
import { pressureSoreFlap } from '../pressureSoreFlap';
import { scalpReconstruction } from '../scalpReconstruction';
import { contractureRelease, vssScore, romGainScore } from '../contractureRelease';
import { flapCompromise } from '../flapShared';

const lines = (out: ReturnType<typeof planFor>) => planLines(out.plan).map(l => l.line);
const has = (out: ReturnType<typeof planFor>, re: RegExp) => lines(out).some(l => re.test(l.text));

describe('flap monitoring (shared)', () => {
  it('reads venous congestion and arterial insufficiency from the bedside signs', () => {
    expect(flapCompromise({ 'x.flap_colour': 'congested' }, 'x')).toBe('venous');
    expect(flapCompromise({ 'x.cap_refill': 'brisk' }, 'x')).toBe('venous');
    expect(flapCompromise({ 'x.flap_colour': 'pale', 'x.flap_temp': 'cool' }, 'x')).toBe('arterial');
    expect(flapCompromise({ 'x.doppler': 'absent' }, 'x')).toBe('arterial');
    expect(flapCompromise({ 'x.flap_colour': 'normal', 'x.cap_refill': 'normal' }, 'x')).toBeNull();
  });
});

describe('local / regional flap', () => {
  it('decompresses a congested pedicled flap first, urgently', () => {
    const out = planFor(localRegionalFlap, 'post_op', { 'local_regional_flap.flap_colour': 'congested', 'local_regional_flap.turgor': 'tense' });
    const l = lines(out).find(x => /^Venous congestion: release/.test(x.text));
    expect(l?.priority).toBe('urgent');
    expect(has(out, /^Arterial insufficiency/)).toBe(false);
  });

  it('says leeches do not help arterial insufficiency', () => {
    const out = planFor(localRegionalFlap, 'post_op', { 'local_regional_flap.flap_colour': 'pale' });
    expect(has(out, /leeches do not help arterial insufficiency/)).toBe(true);
  });

  it('adds Aeromonas prophylaxis and Hb monitoring when leeches are used', () => {
    const out = planFor(localRegionalFlap, 'post_op', { 'local_regional_flap.decongestion': ['leeches'] });
    expect(has(out, /Aeromonas/)).toBe(true);
    expect(has(out, /Haemoglobin at least daily/)).toBe(true);
  });

  it('flags open-fracture cover after 72 hours (BOAST 2017)', () => {
    const ctx = contextFor(localRegionalFlap, 'pre_op', { 'local_regional_flap.indication': 'open_fracture', 'local_regional_flap.days_since_injury': 5 });
    expect(ctx.flags.some(f => /72 hours/.test(f.reason))).toBe(true);
    const out = planFor(localRegionalFlap, 'pre_op', { 'local_regional_flap.indication': 'open_fracture', 'local_regional_flap.days_since_injury': 5 });
    expect(lines(out).find(l => /orthoplastic plan/.test(l.text))?.priority).toBe('urgent');
  });
});

describe('free flap', () => {
  it('sends a compromised free flap back to theatre', () => {
    const out = planFor(freeFlap, 'post_op', { 'free_flap.flap_colour': 'congested' });
    expect(has(out, /return to theatre to explore the anastomosis/)).toBe(true);
    expect(out.plan.cautions.some(c => /surgical emergency/.test(c))).toBe(true);
  });

  it('refuses to start without trained observation and re-exploration capacity', () => {
    const out = planFor(freeFlap, 'pre_op', { 'free_flap.ward_capability': ['hdu', 'microscope'] });
    const l = lines(out).find(x => /^Do not start the free flap until/.test(x.text));
    expect(l?.text).toMatch(/trained flap nurses/);
    expect(l?.text).toMatch(/24-hour theatre access/);
    expect(l?.priority).toBe('urgent');
  });

  it('reduces the observation frequency with time since anastomosis', () => {
    expect(has(planFor(freeFlap, 'post_op', { 'free_flap.hours_since': 10 }), /hourly for the first 24 hours/)).toBe(true);
    expect(has(planFor(freeFlap, 'post_op', { 'free_flap.hours_since': 40 }), /2-hourly from 24 to 72 hours/)).toBe(true);
    expect(has(planFor(freeFlap, 'post_op', { 'free_flap.hours_since': 100 }), /4-hourly after 72 hours/)).toBe(true);
  });

  it('warms a hypothermic patient (NICE CG65)', () => {
    const out = planFor(freeFlap, 'post_op', { 'core.obs_temp': 35.4 });
    expect(lines(out).find(l => /^Active warming/.test(l.text))?.why).toMatch(/CG65/);
  });
});

describe('pressure-sore flap', () => {
  it('plans for autonomic dysreflexia at T6 or above and treats an episode urgently', () => {
    expect(has(planFor(pressureSoreFlap, 'pre_op', { 'pressure_sore_flap.sci_level': 't6_above' }), /^Autonomic dysreflexia plan/)).toBe(true);
    const out = planFor(pressureSoreFlap, 'post_op', { 'pressure_sore_flap.sci_level': 't6_above', 'pressure_sore_flap.dysreflexia': true });
    expect(lines(out).find(l => /^Autonomic dysreflexia: sit/.test(l.text))?.priority).toBe('urgent');
  });

  it('cautions against elective closure while the causes are uncontrolled', () => {
    const out = planFor(pressureSoreFlap, 'pre_op', { 'pressure_sore_flap.bowel': 'frequent', 'pressure_sore_flap.surface': 'none' });
    expect(out.plan.cautions.some(c => /faecal soiling/.test(c) && /support surface/.test(c))).toBe(true);
    expect(has(out, /temporary faecal diversion/)).toBe(true);
  });

  it('adds the EPUAP protein / energy target only where the core nutrition rule does not', () => {
    const plain = planFor(pressureSoreFlap, 'pre_op', {});
    expect(lines(plain).filter(l => /30–35 kcal\/kg\/day/.test(l.text))).toHaveLength(1);
  });
});

describe('scalp reconstruction', () => {
  it('stages the reconstruction when margins are unknown', () => {
    const out = planFor(scalpReconstruction, 'pre_op', { 'scalp_reconstruction.cause': 'tumour', 'scalp_reconstruction.margins': 'unknown' });
    expect(lines(out).find(l => /^Stage the reconstruction/.test(l.text))?.priority).toBe('urgent');
  });

  it('suggests the rung of the ladder by defect size', () => {
    expect(has(planFor(scalpReconstruction, 'pre_op', { 'scalp_reconstruction.defect_cm': 2 }), /under about 3 cm/)).toBe(true);
    expect(has(planFor(scalpReconstruction, 'pre_op', { 'scalp_reconstruction.defect_cm': 6 }), /about 3–10 cm/)).toBe(true);
    expect(has(planFor(scalpReconstruction, 'pre_op', { 'scalp_reconstruction.defect_cm': 14 }), /over about 10 cm/)).toBe(true);
  });
});

describe('contracture release', () => {
  const vssAnswers = (v: number, p: number, pl: number, h: number) => ({
    'contracture_release.vss.vascularity': String(v), 'contracture_release.vss.pigmentation': String(p),
    'contracture_release.vss.pliability': String(pl), 'contracture_release.vss.height': String(h),
  });

  it('scores the VSS with the scar module and compares it with the last review', () => {
    const before = vssScore({ phase: 'pre_op', answers: vssAnswers(2, 3, 4, 2), patient: adult(), prior: [] });
    expect(before?.total).toBe(11);
    const prior: PriorReview[] = [{ encounterId: 'e1', at: '2026-06-01', moduleId: 'contracture_release', phase: 'pre_op', answers: {}, scores: [before!] }];
    const after = vssScore({ phase: 'follow_up', answers: vssAnswers(1, 3, 2, 1), patient: adult(), prior });
    expect(after?.total).toBe(7);
    expect(after?.band?.label).toMatch(/better by 4/);
    expect(after?.flag).toBeUndefined();
  });

  it('returns no VSS total when an item is unanswered', () => {
    const s = vssScore({ phase: 'follow_up', answers: { 'contracture_release.vss.vascularity': '1' }, patient: adult(), prior: [] });
    expect(s?.total).toBeNull();
  });

  it('computes range gained against the pre-operative baseline from an earlier review', () => {
    const prior: PriorReview[] = [{ encounterId: 'e1', at: '2026-06-01', moduleId: 'contracture_release', phase: 'pre_op', answers: { 'contracture_release.rom_arc_pre': 60 }, scores: [] }];
    const s = romGainScore({ phase: 'follow_up', answers: { 'contracture_release.rom_arc_now': 110 }, patient: adult(), prior });
    expect(s?.total).toBe(50);
    expect(s?.flag).toBeUndefined();
    const lost = romGainScore({ phase: 'follow_up', answers: { 'contracture_release.rom_arc_now': 55, 'contracture_release.rom_arc_pre': 60 }, patient: adult(), prior: [] });
    expect(lost?.flag?.level).toBe('amber');
  });

  it('defers release of an immature scar unless an indication cannot wait', () => {
    expect(has(planFor(contractureRelease, 'pre_op', { 'contracture_release.maturity': 'immature' }), /^Defer release until the scar matures/)).toBe(true);
    expect(has(planFor(contractureRelease, 'pre_op', { 'contracture_release.maturity': 'immature', 'contracture_release.urgent_indication': ['ectropion'] }), /^Defer release/)).toBe(false);
  });

  it('warns a growing child that contractures recur', () => {
    const risks = patientRisks(contextFor(contractureRelease, 'pre_op', {}, adult({ ageYears: 7 })));
    expect(risks.some(r => r.why === 'Child')).toBe(true);
  });
});
