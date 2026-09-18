import { describe, it, expect } from 'vitest';
import {
  limbVolumeMl, compareLimbs, lateralityOf, siteWarnings, limbProfileWarnings,
  sitesFor, LOWER_LIMB_SITES, UPPER_LIMB_SITES,
  type SiteMeasurement,
} from '../services/limbVolume';
import {
  determineISLStage, determineCampisiStage, calculateSeverityScore,
} from '../services/lymphedemaService';
import type {
  PittingGrade, SkinCondition, StemmerSignResult, TissueConsistency,
} from '../types';

/** A limb of constant circumference, whose volume is a plain cylinder. */
const cylinder = (circumferenceCm: number, levels = [0, 10, 20, 30]): SiteMeasurement[] =>
  levels.map(d => ({ distanceFromLandmarkCm: d, circumferenceCm }));

describe('limbVolumeMl', () => {
  it('needs at least two levels — one circumference is a ring, not a solid', () => {
    expect(limbVolumeMl([{ distanceFromLandmarkCm: 0, circumferenceCm: 40 }])).toBeNull();
    expect(limbVolumeMl([])).toBeNull();
  });

  it('matches the cylinder volume for a limb of constant girth', () => {
    // C = 2πr, so r = C/2π and V = πr²h = C²h/4π.
    const C = 40, h = 30;
    const expected = (C * C * h) / (4 * Math.PI);
    expect(limbVolumeMl(cylinder(C, [0, h]))).toBe(Math.round(expected));
  });

  it('is unaffected by the order the levels are entered in', () => {
    const ordered = limbVolumeMl(cylinder(38, [0, 10, 20, 30]));
    const shuffled = limbVolumeMl([
      { distanceFromLandmarkCm: 20, circumferenceCm: 38 },
      { distanceFromLandmarkCm: 0, circumferenceCm: 38 },
      { distanceFromLandmarkCm: 30, circumferenceCm: 38 },
      { distanceFromLandmarkCm: 10, circumferenceCm: 38 },
    ]);
    expect(shuffled).toBe(ordered);
  });

  it('grows with circumference', () => {
    expect(limbVolumeMl(cylinder(45))!).toBeGreaterThan(limbVolumeMl(cylinder(35))!);
  });

  it('ignores blank levels rather than treating them as zero girth', () => {
    const withGap = limbVolumeMl([
      { distanceFromLandmarkCm: 0, circumferenceCm: 40 },
      { distanceFromLandmarkCm: 10, circumferenceCm: 0 },
      { distanceFromLandmarkCm: 20, circumferenceCm: 40 },
    ]);
    // The empty middle level is dropped, leaving one 0–20 segment.
    expect(withGap).toBe(limbVolumeMl(cylinder(40, [0, 20])));
  });
});

describe('lateralityOf', () => {
  it('reads the affected flags', () => {
    expect(lateralityOf({ right: true, left: false })).toBe('right_only');
    expect(lateralityOf({ right: false, left: true })).toBe('left_only');
    expect(lateralityOf({ right: true, left: true })).toBe('bilateral');
    expect(lateralityOf({ right: false, left: false })).toBe('unknown');
  });
});

describe('compareLimbs — unilateral', () => {
  const input = {
    right: cylinder(44),          // affected, larger
    left: cylinder(40),           // control
    affected: { right: true, left: false },
  };

  it('uses the unaffected limb as the control', () => {
    const a = compareLimbs(input);
    expect(a.strategy).toBe('inter_limb');
    expect(a.excessPercent).toBeGreaterThan(0);
    expect(a.notes.join(' ')).toMatch(/left limb is used as the control/i);
  });

  it('computes excess against the control, not against the pair', () => {
    const a = compareLimbs(input);
    const right = limbVolumeMl(input.right)!;
    const left = limbVolumeMl(input.left)!;
    expect(a.excessMl).toBe(right - left);
    expect(a.excessPercent).toBeCloseTo(((right - left) / left) * 100, 0);
  });

  it('flags the sides being entered the wrong way round', () => {
    const a = compareLimbs({ ...input, right: cylinder(36) });
    expect(a.excessMl!).toBeLessThan(0);
    expect(a.notes.join(' ')).toMatch(/wrong way round/i);
  });

  it('declines when the control limb has not been measured', () => {
    const a = compareLimbs({ ...input, left: [] });
    expect(a.strategy).toBe('unavailable');
    expect(a.excessPercent).toBeNull();
    expect(a.needed.join(' ')).toMatch(/unaffected left limb/i);
  });
});

describe('compareLimbs — bilateral', () => {
  const bilateral = {
    right: cylinder(44),
    left: cylinder(42),
    affected: { right: true, left: true },
  };

  it('NEVER uses one swollen limb as a control for the other', () => {
    const a = compareLimbs(bilateral);
    expect(a.strategy).not.toBe('inter_limb');
    expect(a.notes.join(' ')).toMatch(/neither can serve as a control/i);
  });

  it('returns null excess rather than zero when there is no baseline', () => {
    const a = compareLimbs(bilateral);
    expect(a.excessPercent).toBeNull();
    expect(a.excessPercent).not.toBe(0);
    expect(a.strategy).toBe('unavailable');
    expect(a.needed.join(' ')).toMatch(/earlier volume/i);
  });

  it('still reports each limb’s absolute volume', () => {
    const a = compareLimbs(bilateral);
    expect(a.right.volumeMl).toBeGreaterThan(0);
    expect(a.left.volumeMl).toBeGreaterThan(0);
  });

  it('reports the difference as asymmetry, explicitly not as excess', () => {
    const a = compareLimbs(bilateral);
    expect(a.asymmetryMl).toBeGreaterThan(0);
    expect(a.excessPercent).toBeNull();
    expect(a.notes.join(' ')).toMatch(/asymmetry, not excess/i);
  });

  it('uses each limb’s own baseline when one exists', () => {
    const a = compareLimbs({
      ...bilateral,
      baseline: { right: 3000, left: 3000 },
    });
    expect(a.strategy).toBe('intra_limb');
    expect(a.excessPercent).not.toBeNull();
    expect(a.notes.join(' ')).toMatch(/own earlier volume/i);
  });

  it('stages on the worse limb, so the better leg cannot understate the disease', () => {
    const a = compareLimbs({
      right: cylinder(50),   // much bigger than its baseline
      left: cylinder(41),    // barely changed
      affected: { right: true, left: true },
      baseline: { right: 3000, left: 4000 },
    });
    expect(a.strategy).toBe('intra_limb');
    expect(a.excessPercent).toBe(a.right.changeFromBaselinePercent);
    expect(a.notes.join(' ')).toMatch(/right limb has changed most/i);
  });
});

describe('compareLimbs — nothing marked', () => {
  it('asks which limb is affected before computing anything', () => {
    const a = compareLimbs({
      right: cylinder(44), left: cylinder(40),
      affected: { right: false, left: false },
    });
    expect(a.strategy).toBe('unavailable');
    expect(a.excessPercent).toBeNull();
    expect(a.needed.join(' ')).toMatch(/which limb/i);
  });
});

describe('siteWarnings', () => {
  it('flags a side difference large enough to suggest swapped columns', () => {
    expect(siteWarnings('Ankle', 50, 30).join(' ')).toMatch(/wrong columns/i);
  });

  it('leaves a plausible asymmetry alone — bilateral limbs do differ', () => {
    // 26 vs 33 is only a 27% difference; asymmetric bilateral disease does
    // that legitimately, so the side comparison should not cry wolf.
    expect(siteWarnings('10 cm above malleolus', 26, 33)).toEqual([]);
  });

  it('flags an implausible circumference', () => {
    expect(siteWarnings('Ankle', 2, 36).join(' ')).toMatch(/plausible range/i);
  });

  it('is quiet about an ordinary pair', () => {
    expect(siteWarnings('Ankle', 38, 36.5)).toEqual([]);
  });
});

describe('limbProfileWarnings', () => {
  const sites = LOWER_LIMB_SITES;
  const at = (name: string) => sites.findIndex(s => s.locationName.startsWith(name));

  it('catches a limb that narrows moving upwards — the reported case', () => {
    // Ankle 38, then 26 ten centimetres above it. A calf is not narrower than
    // the ankle below it, so this is a misplaced row, and that 26 would
    // otherwise flow straight into the volume and the stage.
    const values: (number | undefined)[] = [];
    values[at('Ankle')] = 38;
    values[at('10 cm above malleolus')] = 26;

    const warnings = limbProfileWarnings(sites, values, 'right');
    expect(warnings.join(' ')).toMatch(/narrower than/i);
    expect(warnings.join(' ')).toMatch(/does not normally narrow/i);
    expect(warnings.join(' ')).toMatch(/Right limb/);
  });

  it('accepts a normally tapering limb', () => {
    const values: (number | undefined)[] = [];
    values[at('Ankle')] = 26;
    values[at('10 cm above malleolus')] = 32;
    values[at('20 cm above malleolus')] = 38;
    expect(limbProfileWarnings(sites, values, 'left')).toEqual([]);
  });

  it('allows the foot to be narrower than the ankle', () => {
    const values: (number | undefined)[] = [];
    values[at('Metatarsals')] = 22;
    values[at('Ankle')] = 38;
    expect(limbProfileWarnings(sites, values, 'right')).toEqual([]);
  });

  it('says nothing when only one level is recorded', () => {
    const values: (number | undefined)[] = [];
    values[at('Ankle')] = 38;
    expect(limbProfileWarnings(sites, values, 'right')).toEqual([]);
  });
});

describe('measurement sites', () => {
  it('offers the right landmarks for each region', () => {
    expect(sitesFor('lower')).toBe(LOWER_LIMB_SITES);
    expect(sitesFor('upper')).toBe(UPPER_LIMB_SITES);
    expect(sitesFor('upper').some(s => /wrist/i.test(s.locationName))).toBe(true);
    expect(sitesFor('lower').some(s => /malleolus/i.test(s.locationName))).toBe(true);
  });

  it('gives every site a distinct distance, so segments have height', () => {
    for (const sites of [LOWER_LIMB_SITES, UPPER_LIMB_SITES]) {
      const d = sites.map(s => s.distanceFromLandmarkCm);
      expect(new Set(d).size).toBe(d.length);
    }
  });
});

// ── The bug this whole change exists to fix ─────────────────────────────────

describe('staging with an undeterminable volume', () => {
  const skin: SkinCondition[] = [];

  it('does not stage a bilateral patient as having no volume excess', () => {
    // Before the fix, bilateral disease produced excess = 0, which satisfied
    // "volumeExcessPercent > 0 && < 10" nowhere and failed every upper branch,
    // silently staging severe disease as Campisi IA.
    const withUnknown = determineCampisiStage(
      2, null, 'no_change', 3, 'fibrotic', skin, 2,
    );
    const withZero = determineCampisiStage(
      2, 0, 'no_change', 3, 'fibrotic', skin, 2,
    );
    // Both reach IIIB on the fibrosis criterion — the point is that null does
    // not silently behave like a measured zero elsewhere.
    expect(withUnknown).toBe(withZero);
    expect(withUnknown).toBe('IIIB');
  });

  it('never lets an unknown volume satisfy a volume threshold', () => {
    // A null must not upstage.
    expect(determineISLStage(
      2 as PittingGrade, 'soft_pitting' as TissueConsistency,
      'reduces_partially', ['papillomatosis'] as SkinCondition[],
      null, 'positive' as StemmerSignResult,
    )).not.toBe(3);

    // The same findings with a genuinely high measured excess do upstage.
    expect(determineISLStage(
      2 as PittingGrade, 'soft_pitting' as TissueConsistency,
      'reduces_partially', ['papillomatosis'] as SkinCondition[],
      55, 'positive' as StemmerSignResult,
    )).toBe(3);
  });

  it('does not let an unknown volume report a measured zero excess in severity', () => {
    const unknown = calculateSeverityScore(
      null, skin, 'soft_pitting' as TissueConsistency, 0, 0,
    );
    const measuredZero = calculateSeverityScore(
      0, skin, 'soft_pitting' as TissueConsistency, 0, 0,
    );
    // Both score the volume component as 0 — but only one of them is a claim
    // about the limb. The distinction is preserved upstream, in what is stored.
    expect(unknown.severity).toBe(measuredZero.severity);
  });

  it('scores a high measured excess above an unknown one', () => {
    const high = calculateSeverityScore(
      55, skin, 'soft_pitting' as TissueConsistency, 0, 0,
    );
    const unknown = calculateSeverityScore(
      null, skin, 'soft_pitting' as TissueConsistency, 0, 0,
    );
    expect(high.totalScore).toBeGreaterThan(unknown.totalScore);
  });
});
