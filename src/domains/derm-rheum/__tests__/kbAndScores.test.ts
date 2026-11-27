import { describe, it, expect } from 'vitest';
import { KB, KB_BY_ID, findKb } from '../kb';
import { SCORE_TOOLS, PARACELSUS, SLE_2019, SSC_2013, ANCA_2022, HURLEY, SCORTEN, SEVEN_POINT, ABCDE, CUBED, scortenItems } from '../scores';
import { INVESTIGATION_CATALOG } from '../../../services/investigationRequestService';

const codes = new Set(INVESTIGATION_CATALOG.flatMap(c => c.groups.flatMap(g => g.items.map(i => i.code))));

describe('knowledge base integrity', () => {
  it('covers the conditions the owner listed', () => {
    for (const id of ['pyoderma_gangrenosum', 'small_vessel_vasculitis', 'systemic_vasculitis', 'sle', 'systemic_sclerosis', 'rheumatoid_ulcer', 'antiphospholipid', 'cryoglobulinaemia',
      'calciphylaxis', 'necrobiosis_lipoidica', 'marjolin_scc', 'bcc', 'acral_melanoma', 'kaposi_sarcoma', 'buruli_ulcer', 'tropical_ulcer', 'cutaneous_tb', 'leprosy', 'mycetoma',
      'sickle_cell_ulcer', 'hidradenitis', 'dfsp', 'sjs_ten']) expect(KB_BY_ID[id], id).toBeTruthy();
  });
  it('every condition has sources, red flags or warnings, skin-of-colour notes, investigations and management', () => {
    expect(new Set(KB.map(c => c.id)).size).toBe(KB.length);
    for (const c of KB) {
      expect(c.sources.length, c.id).toBeGreaterThan(0);
      expect(c.redFlags.length + c.warnings.length, c.id).toBeGreaterThan(0);
      expect(c.skinOfColour.length, c.id).toBeGreaterThan(0);
      expect(c.investigations.length, c.id).toBeGreaterThan(1);
      expect(c.management.immediate.length + c.management.definitive.length, c.id).toBeGreaterThan(0);
      expect(c.history.length && c.exam.length, c.id).toBeTruthy();
    }
  });
  it('every catalogue code the KB names exists in the investigation catalogue', () => {
    for (const c of KB) for (const i of c.investigations) if (i.catalogueCode) expect(codes.has(i.catalogueCode), `${c.id}: ${i.catalogueCode}`).toBe(true);
  });
  it('every criteria tool the KB names exists', () => {
    for (const c of KB) if (c.criteria?.toolId) expect(SCORE_TOOLS.some(t => t.id === c.criteria!.toolId), c.id).toBe(true);
  });
  it('encodes the critical warnings', () => {
    expect(KB_BY_ID.pyoderma_gangrenosum.warnings.join(' ')).toMatch(/do NOT debride/i);
    expect(KB_BY_ID.marjolin_scc.warnings.join(' ')).toMatch(/3 months/);
    expect(KB_BY_ID.sjs_ten.warnings.join(' ')).toMatch(/emergency/i);
    expect(KB_BY_ID.pyoderma_gangrenosum.biopsy?.site).toMatch(/edge/i);
    expect(KB_BY_ID.calciphylaxis.biopsy?.type).toMatch(/deep/i);
    expect(KB_BY_ID.buruli_ulcer.investigations.map(i => i.catalogueCode)).toContain('buruli_pcr');
    expect(KB_BY_ID.leprosy.investigations.map(i => i.catalogueCode)).toContain('slit_skin_smear');
    expect(KB_BY_ID.small_vessel_vasculitis.investigations.map(i => i.catalogueCode)).toContain('histo_dif');
  });
  it('ANCA, SLE and SSc criteria are flagged as classification, not diagnosis', () => {
    expect(KB_BY_ID.systemic_vasculitis.criteria?.classificationOnly).toBe(true);
    for (const t of [SLE_2019, SSC_2013, ANCA_2022]) { expect(t.kind).toBe('classification'); expect(t.caveat).toMatch(/classification/i); }
  });
  it('finds entries by synonym', () => {
    expect(findKb('PG')?.id).toBe('pyoderma_gangrenosum');
    expect(findKb('Marjolin ulcer')?.id).toBe('marjolin_scc');
    expect(findKb('Madura foot')?.id).toBe('mycetoma');
  });
});

describe('score tools against worked examples', () => {
  it('every tool names its source', () => { for (const t of SCORE_TOOLS) expect(t.source.length, t.id).toBeGreaterThan(20); });

  it('PARACELSUS: case (a) progressive, violaceous, painful, undermined, IBD = 10, PG highly likely', () => {
    const r = PARACELSUS.compute(['progressive', 'violaceous', 'pain', 'undermined', 'systemic']);
    expect(r.total).toBe(10);
    expect(r.met).toBe(true);
    expect(PARACELSUS.compute(['violaceous', 'pain', 'undermined']).met).toBe(false);
    expect(PARACELSUS.compute(PARACELSUS.items.map(i => i.id)).total).toBe(20);
  });

  it('SLE 2019: entry criterion gates; domains count once; a clinical item is required', () => {
    expect(SLE_2019.compute(['acle', 'joints', 'dsdna_sm']).met).toBeNull();
    const r = SLE_2019.compute(['ana', 'acle', 'oral_ulcers', 'joints', 'dsdna_sm', 'low_c3_or_c4', 'low_c3_and_c4']);
    expect(r.total).toBe(6 + 6 + 6 + 4);
    expect(r.met).toBe(true);
    const imm = SLE_2019.compute(['ana', 'dsdna_sm', 'low_c3_and_c4']);
    expect(imm.total).toBe(10);
    expect(imm.met).toBe(false);
    expect(SLE_2019.compute(['ana', 'fever', 'oral_ulcers', 'apl']).met).toBe(false);
  });

  it('SSc 2013: case (c) sclerodactyly + puffy, ulcers + pitting, Raynaud = 4 + 3 + 3 = 10', () => {
    const r = SSC_2013.compute(['sclerodactyly', 'puffy', 'tip_ulcers', 'pitting', 'raynaud']);
    expect(r.total).toBe(10);
    expect(r.met).toBe(true);
    expect(SSC_2013.compute(['proximal']).met).toBe(true);
    expect(SSC_2013.compute(['raynaud', 'tip_ulcers', 'telangiectasia']).met).toBe(false);
  });

  it('ANCA 2022: GPA, MPA and EGPA sets with negative weights; not applicable before diagnosis', () => {
    expect(ANCA_2022.compute(['canca_pr3', 'nasal']).met).toBeNull();
    const gpa = ANCA_2022.compute(['vasculitis_diagnosed', 'canca_pr3', 'nasal', 'lung_nodules']);
    expect(gpa.band).toMatch(/Granulomatosis with polyangiitis \(10/);
    expect(gpa.detail).toContain('Microscopic polyangiitis: -4 (below 5)');
    const mpa = ANCA_2022.compute(['vasculitis_diagnosed', 'panca_mpo']);
    expect(mpa.band).toMatch(/Microscopic polyangiitis \(6/);
    const egpa = ANCA_2022.compute(['vasculitis_diagnosed', 'eos', 'obstructive']);
    expect(egpa.band).toMatch(/Eosinophilic granulomatosis with polyangiitis \(8/);
    expect(ANCA_2022.compute(['vasculitis_diagnosed', 'eos', 'haematuria']).met).toBe(false);
  });

  it('Hurley: the stage ticked', () => {
    expect(HURLEY.single).toBe(true);
    expect(HURLEY.compute(['stage2']).band).toBe('Hurley stage II');
    expect(HURLEY.compute([]).met).toBeNull();
  });

  it('SCORTEN: 45 years, HR 125, 35% detached, urea 12 = 4, mortality 58.3%', () => {
    const items = scortenItems({ age: 45, heartRate: 125, bsaPercent: 35, ureaMmolL: 12, bicarbonateMmolL: 22, glucoseMmolL: 8 });
    expect(items).toEqual(['age40', 'hr120', 'bsa10', 'urea']);
    expect(SCORTEN.compute(items).band).toBe('SCORTEN 4: predicted mortality 58.3%');
    expect(SCORTEN.compute([]).band).toBe('SCORTEN 0: predicted mortality 3.2%');
    expect(SCORTEN.compute(SCORTEN.items.map(i => i.id)).band).toMatch(/90\.0%/);
  });

  it('pigmented lesions: weighted 7-point 3 or more refers; ABCDE and CUBED flag pending thresholds', () => {
    expect(SEVEN_POINT.compute(['size', 'colour']).total).toBe(4);
    expect(SEVEN_POINT.compute(['size', 'colour']).met).toBe(true);
    expect(SEVEN_POINT.compute(['diameter7', 'oozing']).met).toBe(false);
    expect(ABCDE.compute(['e']).met).toBe(true);
    expect(ABCDE.compute(['a']).met).toBe(false);
    expect(CUBED.compute(['c', 'e']).met).toBe(true);
    expect(ABCDE.pendingValidation).toBeTruthy();
    expect(CUBED.pendingValidation).toBeTruthy();
  });
});
