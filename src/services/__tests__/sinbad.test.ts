/** SINBAD (Ince P et al. Diabetes Care 2008;31:964-7). */
import { describe, it, expect } from 'vitest';
import { calculateSINBADScore, sinbadFindingsFromAssessment, sinbadSite } from '../limbSalvageService';
import type { LimbSalvageAssessment } from '../../types';

describe('calculateSINBADScore', () => {
  it('scores 0 for a superficial, uninfected, small forefoot ulcer with flow and sensation', () => {
    const r = calculateSINBADScore({ site: 'forefoot', reducedPedalFlow: false, protectiveSensationLost: false, infection: false, areaCm2: 0.5, deepToMuscleOrTendon: false });
    expect(r.total).toBe(0);
    expect(r.missing).toEqual([]);
    expect(r.severe).toBe(false);
  });

  it('adds up to 6 and calls 3 or more severe', () => {
    const r = calculateSINBADScore({ site: 'hindfoot', reducedPedalFlow: true, protectiveSensationLost: true, infection: true, areaCm2: 1, deepToMuscleOrTendon: true });
    expect(r).toMatchObject({ site: 1, ischemia: 1, neuropathy: 1, bacterialInfection: 1, area: 1, depth: 1, total: 6, severe: true });
    expect(calculateSINBADScore({ site: 'midfoot', infection: true, areaCm2: 2 }).severe).toBe(true);
    expect(calculateSINBADScore({ site: 'toe', infection: true, areaCm2: 2 }).total).toBe(2);
  });

  it('never treats an unassessed item as abnormal', () => {
    const r = calculateSINBADScore({});
    expect(r.total).toBe(0);
    expect(r.bacterialInfection).toBe(0);
    expect(r.missing).toEqual(['site', 'ischemia', 'neuropathy', 'bacterialInfection', 'area', 'depth']);
  });

  it('area threshold is 1 cm2', () => {
    expect(calculateSINBADScore({ areaCm2: 0.99 }).area).toBe(0);
    expect(calculateSINBADScore({ areaCm2: 1 }).area).toBe(1);
  });

  it('reads the site from free text', () => {
    expect(sinbadSite('1st metatarsal head')).toBe(0);
    expect(sinbadSite('Great toe')).toBe(0);
    expect(sinbadSite('Heel')).toBe(1);
    expect(sinbadSite('midfoot plantar')).toBe(1);
    expect(sinbadSite('leg')).toBeUndefined();
  });
});

describe('sinbadFindingsFromAssessment', () => {
  it('does not call an assessment without a sepsis record infected', () => {
    const f = sinbadFindingsFromAssessment({ woundLocation: 'forefoot' } as Partial<LimbSalvageAssessment>);
    expect(f.infection).toBeUndefined();
    expect(calculateSINBADScore(f).bacterialInfection).toBe(0);
  });

  it('reads flow, sensation, infection, area and depth from what was recorded', () => {
    const f = sinbadFindingsFromAssessment({
      woundLocation: 'heel', monofilamentTest: true, wagnerGrade: 3,
      sepsis: { sepsisSeverity: 'none' } as LimbSalvageAssessment['sepsis'],
      osteomyelitis: { suspected: false, probeToBone: false } as LimbSalvageAssessment['osteomyelitis'],
      woundSize: { length: 2, width: 2, depth: 1, area: 4 },
      dopplerFindings: { arterial: { dorsalisPedisArtery: 'occluded', posteriorTibialArtery: 'normal', abi: 1, waveform: 'biphasic' } } as unknown as LimbSalvageAssessment['dopplerFindings'],
    });
    const r = calculateSINBADScore(f);
    expect(r).toMatchObject({ site: 1, ischemia: 1, neuropathy: 1, bacterialInfection: 0, area: 1, depth: 1, total: 5 });
  });
});
