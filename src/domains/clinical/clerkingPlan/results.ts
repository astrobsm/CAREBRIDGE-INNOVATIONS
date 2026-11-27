/**
 * Results for the planned investigations. Pure.
 *
 * Each investigation line in the plan becomes a RESULT ROW. A numeric row
 * holds one value per analyte, entered directly (value + unit, converted with
 * the clinician-assistant engine's own unit rules and graded against its
 * reference intervals) or read from a scanned report (the clinician-assistant
 * scan pipeline → Claude vision OCR → labParser), mapped to the planned rows
 * and confirmed by the clinician. A qualitative row holds a choice or text.
 *
 * Interpretation is deterministic first: the clinician-assistant analysis
 * engine over the entered values, plus the wound clinic protocol's own action
 * points (Hb, HbA1c, ferritin with CRP, zinc with CRP, vitamin D). Child Hb is
 * graded against the owner's child cut-offs (ownerDecisions.ts, 2026-11-27).
 */
import { ANALYTE_BY_KEY, refForPatient } from '../../clinician-assistant/services/engine/referenceRanges';
import { toCanonical, round } from '../../clinician-assistant/services/engine/units';
import { analyse } from '../../clinician-assistant/services/engine/analyse';
import { emptyPatient, type Analyte, type PatientContext as EnginePatient } from '../../clinician-assistant/services/engine/types';
import { emptyExtraction } from '../../clinician-assistant/services/engine/context';
import { ACTIVE_WOUND_PROTOCOL as WP } from './protocols/woundClinic.v1';
import { SEVERE_ANAEMIA_HB_BELOW_GDL, childHbLimit } from './ownerDecisions';
import type { PlanLine } from './types';

export interface ResultRow {
  testId: string;
  lineId: string;
  label: string;
  analytes: { key: string; label: string; unit: string; units: string[] }[];
  qualitative?: { options?: string[] };
  target?: string;
}

export interface ResultValue {
  testId: string;
  /** Analyte key for a numeric value; absent for a qualitative result. */
  analyte?: string;
  raw?: { value: number; unit: string };
  value?: number;
  unit?: string;
  text?: string;
  flag?: 'low' | 'high' | 'normal';
  via: 'direct' | 'scan';
  /** A scanned value is a proposal until the clinician confirms it. */
  confirmed: boolean;
  at: string;
  /** db.investigations row this result was saved to. */
  investigationId?: string;
  error?: string;
}

/** Units offered per analyte for direct entry (canonical first). */
const EXTRA_UNITS: Record<string, string[]> = {
  hb: ['g/dL', 'g/L'], glucose: ['mmol/L', 'mg/dL'], hba1c: ['%', 'mmol/mol'], creatinine: ['umol/L', 'mg/dL'], urea: ['mmol/L', 'mg/dL'],
  albumin: ['g/L', 'g/dL'], bilirubinTotal: ['umol/L', 'mg/dL'], crp: ['mg/L', 'mg/dL'], ferritin: ['ng/mL', 'ug/L'], zinc: ['mcg/dL', 'umol/L'],
  vitaminD: ['ng/mL', 'nmol/L'], calcium: ['mmol/L', 'mg/dL'], magnesium: ['mmol/L', 'mg/dL'], phosphate: ['mmol/L', 'mg/dL'],
};

/** Display unit for a canonical analyte (ferritin's engine canonical ug/L equals the protocol's ng/mL). */
const displayUnit = (key: string, unit: string) => (key === 'ferritin' ? 'ng/mL' : unit);

/** The result rows for the investigations of a plan (one per test id). */
export function plannedRows(lines: PlanLine[]): ResultRow[] {
  const out: ResultRow[] = [];
  for (const l of lines) {
    if (l.section !== 'investigations' || !l.test || l.withheld) continue;
    if (out.some(r => r.testId === l.test!.id && r.lineId === l.id)) continue;
    const analytes = (l.test.analytes ?? []).map(k => ANALYTE_BY_KEY[k]).filter(Boolean).map(d => ({
      key: d.key, label: d.label, unit: displayUnit(d.key, d.unit), units: EXTRA_UNITS[d.key] ?? [displayUnit(d.key, d.unit)],
    }));
    if (out.some(r => r.testId === l.test!.id && analytes.length && r.analytes.length)) continue;
    out.push({ testId: l.test.id, lineId: l.id, label: l.text, analytes, qualitative: analytes.length ? undefined : l.test.qualitative ?? {}, target: l.test.target });
  }
  return out;
}

/** NGSP % from IFCC mmol/mol (the master equation: % = 0.09148 × mmol/mol + 2.152). */
export const hba1cPercentFromIfcc = (mmolMol: number) => round(0.09148 * mmolMol + 2.152, 1);

export interface EntryContext { sex?: 'male' | 'female' | null; ageYears?: number | null; pregnant?: boolean }

/** A directly entered value: converted to the canonical unit, checked for plausibility, graded. */
export function enterValue(testId: string, analyte: string, value: number, unit: string, e: EntryContext = {}, via: 'direct' | 'scan' = 'direct', at = new Date().toISOString()): ResultValue {
  const def = ANALYTE_BY_KEY[analyte];
  const base: ResultValue = { testId, analyte, raw: { value, unit }, via, confirmed: via === 'direct', at };
  if (!def || !Number.isFinite(value)) return { ...base, error: 'Not a number' };
  let v = value, u = unit;
  if (analyte === 'hba1c' && /mmol\/mol/i.test(unit)) { v = hba1cPercentFromIfcc(value); u = '%'; }
  const c = toCanonical(def.unitRule, v, u);
  if (def.plausible && ((def.plausible.low != null && c.value < def.plausible.low) || (def.plausible.high != null && c.value > def.plausible.high))) {
    return { ...base, error: `${c.value} ${displayUnit(def.key, c.unit)} is outside what is possible for ${def.label} — check the value and unit` };
  }
  const ref = refForPatient(def, { ...emptyPatient(), sex: e.sex ?? 'unspecified', age: e.ageYears ?? null, pregnant: !!e.pregnant });
  const flag = ref ? (ref.low != null && c.value < ref.low ? 'low' : ref.high != null && c.value > ref.high ? 'high' : 'normal') : undefined;
  return { ...base, value: c.value, unit: displayUnit(def.key, c.unit), flag };
}

export const qualitativeValue = (testId: string, text: string, at = new Date().toISOString()): ResultValue => ({ testId, text, via: 'direct', confirmed: true, at });

/** Latest confirmed value per analyte, and per qualitative test. */
export function resultMaps(values: ResultValue[]): { labs: Record<string, number>; qualitative: Record<string, string> } {
  const labs: Record<string, number> = {};
  const qualitative: Record<string, string> = {};
  for (const v of [...values].filter(x => x.confirmed && !x.error).sort((a, b) => a.at.localeCompare(b.at))) {
    if (v.analyte && v.value != null) labs[v.analyte] = v.value;
    else if (v.text) qualitative[v.testId] = v.text;
  }
  return { labs, qualitative };
}

/** "7 of 11 results in". A row counts when each of its analytes (or its qualitative answer) is in. */
export function completeness(rows: ResultRow[], values: ResultValue[]): { done: number; total: number; complete: boolean; missing: string[] } {
  const ok = values.filter(v => v.confirmed && !v.error);
  const missing: string[] = [];
  let done = 0;
  for (const r of rows) {
    const inn = r.analytes.length
      ? r.analytes.every(a => ok.some(v => v.testId === r.testId && v.analyte === a.key)) || ok.some(v => v.testId === r.testId && v.text)
      : ok.some(v => v.testId === r.testId && (v.text || v.value != null));
    if (inn) done++; else missing.push(r.label);
  }
  return { done, total: rows.length, complete: rows.length > 0 && done === rows.length, missing };
}

/**
 * Scanned analytes (from scanReports) as proposals for the planned rows:
 * each analyte is assigned to the first row that plans it. Unconfirmed.
 */
export function mapScanned(analytes: Pick<Analyte, 'key' | 'value' | 'unit' | 'confidence'>[], rows: ResultRow[], e: EntryContext = {}, at = new Date().toISOString()): { proposals: ResultValue[]; unplanned: string[] } {
  const proposals: ResultValue[] = [];
  const unplanned: string[] = [];
  for (const a of analytes) {
    const row = rows.find(r => r.analytes.some(x => x.key === a.key));
    if (!row) { unplanned.push(ANALYTE_BY_KEY[a.key]?.label ?? a.key); continue; }
    proposals.push(enterValue(row.testId, a.key, a.value, a.unit, e, 'scan', at));
  }
  return { proposals, unplanned };
}

// ── Deterministic interpretation ───────────────────────────────────────────

export interface Interpretation {
  findings: { text: string; severity: 'normal' | 'abnormal' | 'critical'; source: string }[];
  /** Plan changes the protocol thresholds imply (the rules plan already reflects them). */
  implications: string[];
}

const T = WP.thresholds;

export function interpretResults(values: ResultValue[], e: EntryContext & { weightKg?: number | null; isChild?: boolean; ageMonths?: number | null } = {}): Interpretation {
  const { labs, qualitative } = resultMaps(values);
  const findings: Interpretation['findings'] = [];
  const implications: string[] = [];
  const proto = `Wound clinic protocol v${WP.version}`;
  const highCrp = labs.crp != null && labs.crp > T.highCrpAboveMgL;

  if (labs.hb != null && !e.isChild) {
    if (labs.hb < T.hbAdultMinGdl) { findings.push({ text: `Hb ${labs.hb} g/dL — below the protocol's 10 g/dL (adult): investigate`, severity: labs.hb < 7 ? 'critical' : 'abnormal', source: proto }); implications.push('Investigate the anaemia (iron studies, film, B12 / folate as indicated).'); }
    else findings.push({ text: `Hb ${labs.hb} g/dL — at or above the protocol target (10 g/dL)`, severity: 'normal', source: proto });
  }
  const months = e.ageMonths ?? (e.ageYears != null ? e.ageYears * 12 : null);
  if (labs.hb != null && e.isChild && months != null) {
    const l = childHbLimit(months, e.sex ?? null);
    const note = l.note ? ` ${l.note}` : '';
    if (l.belowGdl == null) findings.push({ text: `Hb ${labs.hb} g/dL —${note}`, severity: 'normal', source: l.source });
    else if (labs.hb < l.belowGdl) { findings.push({ text: `Hb ${labs.hb} g/dL — below ${l.belowGdl.toFixed(1)} g/dL (${l.band}): anaemia, investigate.${note}`, severity: labs.hb < SEVERE_ANAEMIA_HB_BELOW_GDL ? 'critical' : 'abnormal', source: l.source }); implications.push('Investigate the anaemia (iron studies, film, B12 / folate as indicated).'); }
    else findings.push({ text: `Hb ${labs.hb} g/dL — at or above ${l.belowGdl.toFixed(1)} g/dL (${l.band}).${note}`, severity: 'normal', source: l.source });
  }
  if (labs.hba1c != null) {
    if (labs.hba1c >= T.hba1cTargetBelowPercent) { findings.push({ text: `HbA1c ${labs.hba1c}% — above the protocol target (below 7%, 53 mmol/mol, where safe)`, severity: 'abnormal', source: proto }); implications.push('Improve glycaemic control (diabetes team); repeat HbA1c in 3 months.'); }
    else findings.push({ text: `HbA1c ${labs.hba1c}% — within target`, severity: 'normal', source: proto });
  }
  if (labs.ferritin != null) {
    const low = labs.ferritin < T.ferritinLowNgMl || (labs.ferritin < T.ferritinLowWithHighCrpNgMl && highCrp);
    findings.push({
      text: `Ferritin ${labs.ferritin} ng/mL${labs.crp != null ? ` with CRP ${labs.crp} mg/L` : ' (CRP not entered)'} — ${low ? 'suggests iron deficiency' : labs.crp == null && labs.ferritin < T.ferritinLowWithHighCrpNgMl ? 'interpret with CRP (below 100 with high CRP suggests iron deficiency)' : 'does not suggest iron deficiency'}`,
      severity: low ? 'abnormal' : 'normal', source: proto,
    });
    if (low) implications.push('Iron deficiency: iron only if anaemic (and in sickle cell only when proven) — see the plan.');
  }
  if (labs.zinc != null) {
    const low = labs.zinc < T.zincLowMcgDl;
    findings.push({ text: `Serum zinc ${labs.zinc} mcg/dL — ${low ? `below ${T.zincLowMcgDl}${highCrp ? '; may be falsely low because CRP is high' : ''}` : 'not low'}`, severity: low ? 'abnormal' : 'normal', source: proto });
    if (low) implications.push(`Zinc course of ${T.zincCourseWeeks.low}–${T.zincCourseWeeks.high} weeks, then stop; repeat serum zinc.`);
  }
  if (labs.vitaminD != null) {
    const low = labs.vitaminD < T.vitaminDDeficientBelowNgMl;
    findings.push({ text: `25-OH vitamin D ${labs.vitaminD} ng/mL — ${low ? 'deficient (below 20 ng/mL)' : 'not deficient'}`, severity: low ? 'abnormal' : 'normal', source: proto });
    if (low) implications.push('Vitamin D loading course per the protocol; check calcium.');
  }
  if (qualitative.hiv === 'Positive') { findings.push({ text: 'HIV screening positive', severity: 'abnormal', source: proto }); implications.push('Refer for HIV care (protocol).'); }
  if (qualitative.genotype && /^(SS|SC)$/.test(qualitative.genotype)) { findings.push({ text: `Genotype ${qualitative.genotype} — sickle cell disease`, severity: 'abnormal', source: proto }); implications.push('Sickle cell disease: folic acid continuously; iron only for proven iron deficiency.'); }
  if (qualitative.urinalysis && qualitative.urinalysis !== 'Normal') { findings.push({ text: `Urinalysis: ${qualitative.urinalysis}`, severity: 'abnormal', source: proto }); implications.push('Follow up the abnormal urinalysis (protocol).'); }

  // The clinician-assistant engine over the same values (renal, FBC, LFT, electrolytes, inflammatory).
  const extraction = emptyExtraction();
  for (const v of values.filter(x => x.confirmed && !x.error && x.analyte && x.value != null)) {
    const def = ANALYTE_BY_KEY[v.analyte!];
    if (!def || def.module === 'other') continue;
    extraction.analytes.push({ key: def.key, label: def.label, value: v.value!, unit: def.unit, rawText: `${v.raw?.value ?? v.value} ${v.raw?.unit ?? v.unit}`, confidence: 1, edited: false, manual: v.via === 'direct' });
  }
  if (extraction.analytes.length) {
    const patient: EnginePatient = { ...emptyPatient(), age: e.ageYears ?? null, sex: e.sex ?? 'unspecified', weightKg: e.weightKg ?? null, pregnant: !!e.pregnant };
    const result = analyse(patient, extraction, []);
    for (const m of result.modules) {
      for (const f of m.findings) {
        if (f.severity === 'normal' || findings.some(x => x.text.startsWith(f.title))) continue;
        findings.push({ text: `${f.title}: ${f.interpretation}`, severity: /critical|life/i.test(f.severity) ? 'critical' : 'abnormal', source: 'Clinician Assistant engine' });
      }
    }
  }
  return { findings, implications: [...new Set(implications)] };
}
