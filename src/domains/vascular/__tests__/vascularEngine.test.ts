import { describe, it, expect } from 'vitest';
import {
  calculateAbi, calculateTbi, brachialReference, categoriseAbi,
  checkPressures, summarisePerfusion, ABI_BANDS, TBI_ABNORMAL_AT_OR_BELOW,
} from '../services/perfusion';
import {
  computeWifi, gradeWound, gradeIschaemia, gradeFootInfection,
  wifiShorthand, WIFI_STAGE_TABLE, DEFAULT_ISCHAEMIA_THRESHOLDS,
} from '../services/wifiEngine';
import { readAcuteScreen, SIX_PS, RUTHERFORD_CATEGORIES } from '../services/acuteIschaemia';
import {
  assessHealingOutlook, assessReconstructionReadiness, buildVascularAlerts,
} from '../services/healingOutlook';
import { trendFor, valueOf, MEASURES } from '../services/vascularTrend';
import type {
  PressureSet, LimbPerfusion, VascularWoundSnapshot, FootInfectionAssessment,
  AcuteIschaemiaScreen, PadAssessment,
} from '../types';

// ── Fixtures ────────────────────────────────────────────────────────────────

const pressures = (over: Partial<PressureSet> = {}): PressureSet => ({
  rightBrachialMmHg: 140,
  leftBrachialMmHg: 130,
  ankleMmHg: 100,
  ...over,
});

const perfusion = (p: Partial<PressureSet> = {}, local: LimbPerfusion['local'] = []): LimbPerfusion => ({
  side: 'left',
  pressures: pressures(p),
  local,
});

const wound = (over: Partial<VascularWoundSnapshot> = {}): VascularWoundSnapshot => ({
  present: true, areaCm2: 3, ...over,
});

const infection = (over: Partial<FootInfectionAssessment> = {}): FootInfectionAssessment => ({
  severity: 'none', ...over,
});

// ── ABI ─────────────────────────────────────────────────────────────────────

describe('brachialReference', () => {
  it('uses the higher of the two arms', () => {
    const ref = brachialReference(pressures({ rightBrachialMmHg: 120, leftBrachialMmHg: 160 }));
    expect(ref.value).toBe(160);
    expect(ref.arm).toBe('left');
  });

  it('warns when only one arm was measured', () => {
    const ref = brachialReference({ rightBrachialMmHg: 140, ankleMmHg: 90 });
    expect(ref.value).toBe(140);
    expect(ref.limitation).toMatch(/higher of the two arms/i);
  });

  it('returns nothing when no arm was measured', () => {
    expect(brachialReference({ ankleMmHg: 90 }).value).toBeNull();
  });
});

describe('calculateAbi', () => {
  it('divides the ankle pressure by the higher brachial', () => {
    // 100 / 140, not 100 / 130 and not 100 / 135.
    const r = calculateAbi(pressures());
    expect(r.value).toBeCloseTo(0.71, 2);
    expect(r.denominatorMmHg).toBe(140);
  });

  it('categorises against the published bands', () => {
    expect(categoriseAbi(0.85)).toBe('abnormal');
    expect(categoriseAbi(0.95)).toBe('borderline');
    expect(categoriseAbi(1.10)).toBe('normal');
    expect(categoriseAbi(1.55)).toBe('noncompressible');
    expect(ABI_BANDS.abnormalAtOrBelow).toBe(0.90);
  });

  it('treats 0.90 itself as abnormal, not borderline', () => {
    expect(categoriseAbi(0.90)).toBe('abnormal');
  });

  it('refuses to read a noncompressible index as good perfusion', () => {
    const r = calculateAbi(pressures({ ankleMmHg: 220 }));
    expect(r.category).toBe('noncompressible');
    expect(r.interpretation).toMatch(/not interpretable/i);
    expect(r.limitations.join(' ')).toMatch(/does NOT indicate good perfusion/i);
    expect(r.prompts.join(' ')).toMatch(/toe pressure/i);
  });

  it('warns that a normal resting index does not settle a foot with tissue loss', () => {
    const r = calculateAbi(pressures({ ankleMmHg: 145 }), { cltiSuspected: true });
    expect(r.category).toBe('normal');
    expect(r.limitations.join(' ')).toMatch(/does not exclude clinically significant distal disease/i);
  });

  it('asks for a toe pressure when calcification is likely', () => {
    const r = calculateAbi(pressures({ ankleMmHg: 130 }), { calcificationRisk: true });
    expect(r.limitations.join(' ')).toMatch(/medial calcification/i);
    expect(r.prompts.join(' ')).toMatch(/toe pressure/i);
  });

  it('returns nothing without an ankle pressure', () => {
    const r = calculateAbi({ rightBrachialMmHg: 140 });
    expect(r.value).toBeNull();
  });
});

describe('calculateTbi', () => {
  it('uses the same denominator as the ABI, so the two are comparable', () => {
    const p = pressures({ toeMmHg: 70 });
    expect(calculateTbi(p).denominatorMmHg).toBe(calculateAbi(p).denominatorMmHg);
  });

  it('calls 0.70 abnormal', () => {
    // 98 / 140 = 0.70 exactly.
    const r = calculateTbi(pressures({ toeMmHg: 98 }));
    expect(r.value).toBeCloseTo(0.70, 2);
    expect(r.category).toBe('abnormal');
    expect(TBI_ABNORMAL_AT_OR_BELOW).toBe(0.70);
  });
});

describe('checkPressures', () => {
  it('flags a large inter-arm difference as a finding', () => {
    const problems = checkPressures(pressures({ rightBrachialMmHg: 160, leftBrachialMmHg: 120 }));
    expect(problems.join(' ')).toMatch(/subclavian/i);
  });

  it('catches a toe pressure entered above the ankle pressure', () => {
    const problems = checkPressures(pressures({ ankleMmHg: 60, toeMmHg: 120 }));
    expect(problems.join(' ')).toMatch(/wrong way round/i);
  });

  it('catches an implausible value', () => {
    expect(checkPressures(pressures({ ankleMmHg: 900 })).join(' ')).toMatch(/plausible range/i);
  });

  it('is quiet about an ordinary set', () => {
    expect(checkPressures(pressures({ toeMmHg: 60 }))).toEqual([]);
  });
});

// ── WIfI: wound ─────────────────────────────────────────────────────────────

describe('gradeWound', () => {
  it('grades 0 when there is no ulcer', () => {
    const g = gradeWound(wound({ present: false }));
    expect(g.grade).toBe(0);
  });

  it('grades a shallow ulcer 1', () => {
    expect(gradeWound(wound({ areaCm2: 2 })).grade).toBe(1);
  });

  it('grades exposed tendon 2, whatever the area', () => {
    const g = gradeWound(wound({ areaCm2: 0.5, exposedStructure: ['tendon'] }));
    expect(g.grade).toBe(2);
    expect(g.reason).toMatch(/tendon/i);
  });

  it('does not let a large shallow ulcer outrank a small deep one', () => {
    const big = gradeWound(wound({ areaCm2: 20 }));
    const deep = gradeWound(wound({ areaCm2: 1, exposedStructure: ['bone'] }));
    expect(deep.grade as number).toBeGreaterThan(big.grade as number);
  });

  it('grades gangrene confined to the toes as 2', () => {
    expect(gradeWound(wound({ gangrene: 'dry_toe' })).grade).toBe(2);
  });

  it('grades gangrene beyond the toes as 3', () => {
    expect(gradeWound(wound({ gangrene: 'forefoot' })).grade).toBe(3);
    expect(gradeWound(wound({ gangrene: 'extensive' })).grade).toBe(3);
  });

  it('grades a heel ulcer with exposed bone as 3', () => {
    const g = gradeWound(wound({ heelInvolved: true, exposedStructure: ['bone'] }));
    expect(g.grade).toBe(3);
    expect(g.reason).toMatch(/heel/i);
  });

  it('will not grade without a wound assessment', () => {
    const g = gradeWound(undefined);
    expect(g.grade).toBeNull();
    expect(g.missing).toContain('Wound assessment');
  });
});

// ── WIfI: ischaemia ─────────────────────────────────────────────────────────

describe('gradeIschaemia', () => {
  it('grades from toe pressure when it is available', () => {
    const g = gradeIschaemia(perfusion({ toeMmHg: 24 }));
    expect(g.grade).toBe(3);
    expect(g.decidedBy).toMatch(/Toe pressure/);
    expect(g.reason).toMatch(/24 mmHg/);
  });

  it('NEVER grades a noncompressible ABI as no ischaemia', () => {
    // The whole point: ankle 220 over brachial 140 gives ABI 1.57. Read
    // naively that is "high", and a calcified diabetic limb would be graded 0.
    const g = gradeIschaemia(perfusion({ ankleMmHg: 220, toeMmHg: 25 }));
    expect(g.grade).toBe(3);
    expect(g.decidedBy).toMatch(/Toe pressure/);
    expect(g.notUsed?.join(' ')).toMatch(/noncompressible/i);
  });

  it('asks for a toe pressure when the ankle index is uninterpretable', () => {
    const g = gradeIschaemia({ side: 'left', pressures: { rightBrachialMmHg: 140, ankleMmHg: 230 } });
    expect(g.missing?.join(' ')).toMatch(/Toe pressure or TcPO2/i);
  });

  it('lets foot-level perfusion outrank the ankle index, and says so', () => {
    // Ankle 130/140 = 0.93 would grade 0; toe pressure of 28 grades 3.
    const g = gradeIschaemia(perfusion({ ankleMmHg: 130, toeMmHg: 28 }));
    expect(g.grade).toBe(3);
    expect(g.notUsed?.join(' ')).toMatch(/closer to the tissue takes precedence/i);
  });

  it('uses TcPO2 ahead of toe pressure', () => {
    const g = gradeIschaemia(perfusion({ toeMmHg: 70 }, [
      { kind: 'tcpo2', value: 18, unit: 'mmHg', site: 'dorsum' },
    ]));
    expect(g.grade).toBe(3);
    expect(g.decidedBy).toMatch(/TcPO2/);
  });

  it('grades a healthy limb 0 from the ankle index', () => {
    const g = gradeIschaemia(perfusion({ ankleMmHg: 140 }));
    expect(g.grade).toBe(0);
  });

  it('applies the published ABI bands', () => {
    const at = (abi: number) => {
      // brachial 100 makes the ankle pressure equal the index x 100, but the
      // absolute ankle pressure would then drive the grade, so use a high
      // brachial and back-compute.
      const brachial = 200;
      return gradeIschaemia({
        side: 'left',
        pressures: { rightBrachialMmHg: brachial, leftBrachialMmHg: brachial, ankleMmHg: abi * brachial },
      });
    };
    expect(DEFAULT_ISCHAEMIA_THRESHOLDS.abi.grade0From).toBe(0.80);
    expect(at(0.85).grade).toBe(0);
    expect(at(0.70).grade).toBe(1);
    expect(at(0.50).grade).toBe(2);
    expect(at(0.30).grade).toBe(3);
  });

  it('notes when a value sits exactly on a band boundary', () => {
    const g = gradeIschaemia(perfusion({ toeMmHg: 60 }));
    expect(g.grade).toBe(0);
    expect(g.reason).toMatch(/band boundary/i);
  });

  it('records the TBI but grades on the toe pressure', () => {
    const g = gradeIschaemia(perfusion({ toeMmHg: 35 }));
    expect(g.notUsed?.join(' ')).toMatch(/grades on absolute toe pressure/i);
  });

  it('will not grade with nothing to grade from', () => {
    const g = gradeIschaemia(undefined);
    expect(g.grade).toBeNull();
    expect(g.missing?.length).toBeGreaterThan(0);
  });
});

// ── WIfI: infection ─────────────────────────────────────────────────────────

describe('gradeFootInfection', () => {
  it('grades each severity', () => {
    expect(gradeFootInfection(infection({ severity: 'none' })).grade).toBe(0);
    expect(gradeFootInfection(infection({ severity: 'mild_local' })).grade).toBe(1);
    expect(gradeFootInfection(infection({ severity: 'moderate_deeper' })).grade).toBe(2);
    expect(gradeFootInfection(infection({ severity: 'severe_systemic' })).grade).toBe(3);
  });

  it('refuses to infer infection when nobody assessed it', () => {
    const g = gradeFootInfection(undefined);
    expect(g.grade).toBeNull();
    expect(g.reason).toMatch(/not been assessed/i);
  });
});

// ── WIfI overall ────────────────────────────────────────────────────────────

describe('computeWifi', () => {
  it('gives each component its own reason', () => {
    const r = computeWifi({
      wound: wound({ exposedStructure: ['tendon'] }),
      perfusion: perfusion({ toeMmHg: 24 }),
      infection: infection({ severity: 'mild_local' }),
    });
    expect(r.wound.reason).toBeTruthy();
    expect(r.ischaemia.reason).toMatch(/24 mmHg/);
    expect(r.footInfection.reason).toBeTruthy();
    expect(wifiShorthand(r)).toBe('W2 I3 fI1');
  });

  it('does not invent the SVS stage', () => {
    const r = computeWifi({
      wound: wound(), perfusion: perfusion({ toeMmHg: 24 }), infection: infection(),
    });
    expect(WIFI_STAGE_TABLE).toBeNull();
    expect(r.svsStage).toBeNull();
    expect(r.svsStageNote).toMatch(/not calculated/i);
  });

  it('marks itself incomplete when a component cannot be graded', () => {
    const r = computeWifi({ wound: wound(), perfusion: perfusion({ toeMmHg: 40 }) });
    expect(r.complete).toBe(false);
    expect(r.limbThreat).toBe('insufficient_data');
    expect(wifiShorthand(r)).toMatch(/fI\?/);
  });

  it('raises the limb-threat signal when severity compounds', () => {
    const mild = computeWifi({
      wound: wound({ areaCm2: 1 }),
      perfusion: perfusion({ ankleMmHg: 140 }),
      infection: infection({ severity: 'none' }),
    });
    const severe = computeWifi({
      wound: wound({ gangrene: 'forefoot' }),
      perfusion: perfusion({ toeMmHg: 18 }),
      infection: infection({ severity: 'moderate_deeper' }),
    });
    expect(mild.limbThreat).toBe('low');
    expect(severe.limbThreat).toBe('very_high');
    expect(severe.limbThreatBasis.join(' ')).toMatch(/compounded/i);
  });

  it('shows its working for the limb-threat signal', () => {
    const r = computeWifi({
      wound: wound({ exposedStructure: ['bone'] }),
      perfusion: perfusion({ toeMmHg: 25 }),
      infection: infection({ severity: 'none' }),
    });
    expect(r.limbThreatBasis[0]).toMatch(/Wound 2, ischaemia 3, infection 0/);
    expect(r.limbThreatBasis.join(' ')).toMatch(/healing without improved perfusion/i);
  });
});

// ── Acute limb ischaemia ────────────────────────────────────────────────────

const screen = (over: Partial<AcuteIschaemiaScreen> = {}): AcuteIschaemiaScreen => ({ ...over });

describe('readAcuteScreen', () => {
  it('lists the six Ps', () => {
    expect(SIX_PS.map(p => p.label)).toEqual([
      'Pain', 'Pallor', 'Pulselessness', 'Paraesthesia', 'Paralysis', 'Poikilothermia',
    ]);
  });

  it('raises the alert on any positive feature', () => {
    const r = readAcuteScreen(screen({ suddenOnsetPain: true, pallor: true }));
    expect(r.concerning).toBe(true);
    expect(r.headline).toMatch(/acute limb ischaemia/i);
    expect(r.positiveFeatures).toEqual(['Pain', 'Pallor']);
  });

  it('NEVER clears a limb, even with nothing recorded', () => {
    const r = readAcuteScreen(screen({ sensoryLoss: 'none', motorDeficit: 'none' }));
    expect(r.concerning).toBe(false);
    expect(r.headline).not.toMatch(/no acute/i);
    expect(r.headline).toMatch(/were recorded/i);
    expect(r.caveats.join(' ')).toMatch(/not that the limb has been cleared/i);
    expect(r.caveats.join(' ')).toMatch(/does not exclude acute limb ischaemia/i);
  });

  it('suggests IIb when there is a motor deficit', () => {
    const r = readAcuteScreen(screen({
      sensoryLoss: 'more_than_toes', motorDeficit: 'mild_moderate',
    }));
    expect(r.suggestedCategory).toBe('IIb');
    expect(r.action).toMatch(/now/i);
  });

  it('suggests IIa for sensory loss confined to the toes', () => {
    const r = readAcuteScreen(screen({ sensoryLoss: 'toes_only', motorDeficit: 'none' }));
    expect(r.suggestedCategory).toBe('IIa');
  });

  it('suggests III for profound anaesthesia with paralysis', () => {
    const r = readAcuteScreen(screen({
      sensoryLoss: 'profound_anaesthesia', motorDeficit: 'profound_paralysis',
      venousDopplerAudible: false,
    }));
    expect(r.suggestedCategory).toBe('III');
    expect(r.categoryBasis.join(' ')).toMatch(/supports category III/i);
  });

  it('flags a finding that contradicts the suggested category', () => {
    const r = readAcuteScreen(screen({
      sensoryLoss: 'profound_anaesthesia', motorDeficit: 'profound_paralysis',
      venousDopplerAudible: true,
    }));
    expect(r.categoryBasis.join(' ')).toMatch(/not typical of category III/i);
  });

  it('suggests no category from a partial examination', () => {
    const r = readAcuteScreen(screen({ suddenOnsetPain: true }));
    expect(r.suggestedCategory).toBeNull();
    expect(r.categoryBasis.join(' ')).toMatch(/have not both been recorded/i);
  });

  it('publishes the criteria alongside the categories', () => {
    expect(RUTHERFORD_CATEGORIES).toHaveLength(4);
    for (const c of RUTHERFORD_CATEGORIES) {
      expect(c.sensory.length).toBeGreaterThan(0);
      expect(c.motor.length).toBeGreaterThan(0);
    }
  });
});

// ── Healing outlook ─────────────────────────────────────────────────────────

describe('assessHealingOutlook', () => {
  const wifiFor = (toe: number, w: VascularWoundSnapshot, inf: FootInfectionAssessment) =>
    computeWifi({ wound: w, perfusion: perfusion({ toeMmHg: toe }), infection: inf });

  it('never produces a percentage', () => {
    const r = assessHealingOutlook({
      wifi: wifiFor(20, wound({ exposedStructure: ['bone'] }), infection({ severity: 'mild_local' })),
    });
    expect(r.statement).toMatch(/not a validated probability/i);
    expect(JSON.stringify(r)).not.toMatch(/\d+% chance/);
  });

  it('lets severe ischaemia dominate an otherwise clean wound', () => {
    const r = assessHealingOutlook({
      wifi: wifiFor(18, wound({ areaCm2: 1 }), infection({ severity: 'none' })),
    });
    expect(['poor', 'very_poor']).toContain(r.outlook);
    expect(r.concerning.join(' ')).toMatch(/Severe ischaemia/i);
  });

  it('is favourable on a well-perfused, uninfected limb', () => {
    const r = assessHealingOutlook({
      wifi: computeWifi({
        wound: wound({ present: false }),
        perfusion: perfusion({ ankleMmHg: 140 }),
        infection: infection({ severity: 'none' }),
      }),
    });
    expect(r.outlook).toBe('favourable');
  });

  it('separates favourable from concerning factors', () => {
    const r = assessHealingOutlook({
      wifi: wifiFor(70, wound({ areaCm2: 4 }), infection({ severity: 'none' })),
      woundAreaChangePercent: -35,
      smoker: true,
    });
    expect(r.favourable.join(' ')).toMatch(/down 35%/i);
    expect(r.concerning.join(' ')).toMatch(/smoking/i);
  });

  it('says what is missing rather than guessing', () => {
    const r = assessHealingOutlook({ wifi: computeWifi({}) });
    expect(r.outlook).toBe('insufficient_data');
    expect(r.missing.length).toBeGreaterThan(0);
  });
});

describe('assessReconstructionReadiness', () => {
  it('is never phrased as a contraindication', () => {
    const r = assessReconstructionReadiness({
      wifi: computeWifi({
        wound: wound(), perfusion: perfusion({ toeMmHg: 15 }), infection: infection(),
      }),
    });
    expect(r.disclaimer).toMatch(/not a contraindication/i);
    expect(r.disclaimer).toMatch(/remains the surgeon/i);
  });

  it('calls for vascular assessment before reconstruction when ischaemia is significant', () => {
    const r = assessReconstructionReadiness({
      wifi: computeWifi({
        wound: wound(), perfusion: perfusion({ toeMmHg: 35 }), infection: infection(),
      }),
    });
    expect(r.readiness).toBe('vascular_assessment_first');
  });

  it('is favourable when perfusion is good', () => {
    const r = assessReconstructionReadiness({
      wifi: computeWifi({
        wound: wound(), perfusion: perfusion({ toeMmHg: 80 }), infection: infection(),
      }),
    });
    expect(r.readiness).toBe('favourable_perfusion');
  });

  it('lists what is still outstanding', () => {
    const r = assessReconstructionReadiness({
      wifi: computeWifi({
        wound: wound(), perfusion: perfusion({ ankleMmHg: 120 }), infection: infection(),
      }),
    });
    expect(r.outstanding.join(' ')).toMatch(/Toe pressure or TcPO2/i);
  });
});

// ── Alerts ──────────────────────────────────────────────────────────────────

describe('buildVascularAlerts', () => {
  const baseWifi = computeWifi({
    wound: wound({ present: false }),
    perfusion: perfusion({ ankleMmHg: 140 }),
    infection: infection({ severity: 'none' }),
  });

  it('puts acute ischaemia at red', () => {
    const alerts = buildVascularAlerts({
      wifi: baseWifi,
      acuteConcerning: true,
      acuteHeadline: 'Possible acute limb ischaemia.',
      acuteEvidence: ['Pain', 'Pallor'],
    });
    expect(alerts[0].level).toBe('red');
    expect(alerts[0].evidence).toContain('Pain');
  });

  it('returns green when nothing is wrong, rather than nothing at all', () => {
    const alerts = buildVascularAlerts({ wifi: baseWifi });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].level).toBe('green');
  });

  it('raises amber on a falling toe pressure', () => {
    const alerts = buildVascularAlerts({ wifi: baseWifi, toePressureChangeMmHg: -18 });
    const a = alerts.find(x => x.title.match(/deteriorating/i));
    expect(a?.level).toBe('amber');
    expect(a?.evidence.join(' ')).toMatch(/18 mmHg/);
  });

  it('gives every alert its evidence', () => {
    const alerts = buildVascularAlerts({
      wifi: computeWifi({
        wound: wound({ gangrene: 'dry_toe' }),
        perfusion: perfusion({ toeMmHg: 18 }),
        infection: infection({ severity: 'severe_systemic' }),
      }),
      woundAreaChangePercent: 30,
    });
    expect(alerts.length).toBeGreaterThan(2);
    for (const a of alerts) expect(a.action.length).toBeGreaterThan(0);
  });
});

// ── Trending ────────────────────────────────────────────────────────────────

const assessment = (at: string, over: Partial<PadAssessment> = {}): PadAssessment => ({
  id: at, patientId: 'p1', side: 'left',
  assessedAt: at, isBaseline: false,
  presentation: {},
  status: 'finalized',
  createdAt: at, updatedAt: at,
  ...over,
});

describe('trendFor', () => {
  const day = (n: number) => new Date(2026, 0, 1 + n).toISOString();

  it('reads a rising toe pressure as improvement', () => {
    const t = trendFor('toe_pressure', [
      assessment(day(0), { perfusion: perfusion({ toeMmHg: 22 }) }),
      assessment(day(60), { perfusion: perfusion({ toeMmHg: 51 }) }),
    ]);
    expect(t.trend).toBe('improving');
    expect(t.changeFromPrevious).toBe(29);
  });

  it('reads a shrinking wound as improvement', () => {
    const t = trendFor('wound_area', [
      assessment(day(0), { wound: wound({ areaCm2: 12.5 }) }),
      assessment(day(30), { wound: wound({ areaCm2: 7.2 }) }),
    ]);
    expect(t.trend).toBe('improving');
    expect(t.percentChangeFromPrevious).toBeCloseTo(-42.4, 1);
  });

  it('will not call a small toe-pressure swing a real change', () => {
    const t = trendFor('toe_pressure', [
      assessment(day(0), { perfusion: perfusion({ toeMmHg: 40 }) }),
      assessment(day(30), { perfusion: perfusion({ toeMmHg: 46 }) }),
    ]);
    expect(t.withinNoise).toBe(true);
    expect(t.note).toMatch(/repeatability/i);
    expect(MEASURES.toe_pressure.noiseFloorAbsolute).toBe(10);
  });

  it('says so when a measure was never recorded', () => {
    const t = trendFor('tcpo2', [assessment(day(0))]);
    expect(t.series).toHaveLength(0);
    expect(t.note).toMatch(/Not recorded/i);
  });

  it('reads the ABI back out of the stored raw pressures', () => {
    const a = assessment(day(0), { perfusion: perfusion({ ankleMmHg: 70 }) });
    expect(valueOf('abi', a)).toBeCloseTo(0.5, 2);
  });
});
