/**
 * Bridge between AstroHEALTH's patient record and the diagnostic engine.
 *
 * The engine was written for a standalone tool that read everything off a
 * scanned page. Here the same values already exist locally — lab results, vital
 * signs, demographics — so the scan becomes optional and the record becomes the
 * primary source.
 *
 * ADAPTED FOR ASTROHEALTH: the original read Postgres through a REST client.
 * This reads IndexedDB (Dexie) directly, which means it works on a ward with no
 * network — the same property the engine itself has, and the reason the
 * interpretation is client-side in the first place.
 *
 * MAPPING IS NOT INVENTED. Test names coming off lab requests are matched to
 * canonical analyte keys using the engine's OWN synonym dictionary
 * (ANALYTES[].synonyms) and its own unit normaliser (toCanonical). Writing a
 * second mapping table here would be a duplicate that silently drifts from the
 * one the parsers use, so anything the engine cannot recognise is reported as
 * unmapped rather than guessed at.
 */

import { db } from '../../../database';
import { resolvePercentages } from './parse/labParser';
import {
  toAnalyte,
  toPercentage,
  isPercentageResult,
  type UnmappedResult,
  type PercentageResult,
} from './analyteMapping';
import { emptyExtraction, type Extraction } from './engine/context';
import { emptyPatient, type PatientContext, type Observation, type Sex } from './engine/types';

export type { UnmappedResult };

export interface BridgeResult {
  patient: PatientContext;
  extraction: Extraction;
  /** Results the engine could not recognise — shown to the clinician, never dropped silently. */
  unmapped: UnmappedResult[];
  sources: { investigations: number; vitals: number };
}

const sexFrom = (gender: unknown): Sex => {
  const g = String(gender || '').toLowerCase();
  if (g.startsWith('m')) return 'male';
  if (g.startsWith('f')) return 'female';
  return 'unspecified';
};

function ageFrom(dateOfBirth: unknown): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(String(dateOfBirth));
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

const time = (v: unknown): number => {
  if (!v) return 0;
  const t = new Date(v as string).getTime();
  return Number.isFinite(t) ? t : 0;
};

/**
 * Vital signs the engine can correlate against laboratory findings — fever
 * driving an infective interpretation, hypoxia driving a respiratory one.
 */
function vitalsToObservations(v: Record<string, unknown>): Observation[] {
  const out: Observation[] = [];
  // Observation.value is a string: the type carries qualitative findings
  // ("clear", "growth") as well as numeric ones, so the unit travels in the
  // value text rather than a separate field.
  const add = (key: string, label: string, value: unknown, unit: string) => {
    const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
    if (Number.isFinite(n)) {
      out.push({ key, label, value: String(n), rawText: `${n} ${unit}`, confidence: 1, edited: false });
    }
  };
  add('temperature', 'Temperature', v.temperature, 'degC');
  add('pulse', 'Pulse', v.pulse ?? v.heartRate, 'bpm');
  add('sbp', 'Systolic BP', v.bloodPressureSystolic, 'mmHg');
  add('dbp', 'Diastolic BP', v.bloodPressureDiastolic, 'mmHg');
  add('rr', 'Respiratory rate', v.respiratoryRate, '/min');
  add('spo2', 'SpO2', v.oxygenSaturation, '%');
  return out;
}

/**
 * Assemble everything the engine needs for one patient, straight from the local
 * mirror. Each read degrades independently: a patient with no recorded lab
 * results still yields a valid context, and the UI reports what was found
 * rather than failing the whole analysis.
 */
export async function buildFromPatientRecord(patientId: string | number): Promise<BridgeResult> {
  const pid = String(patientId);

  const [patientRow, labRows, vitalRows] = await Promise.all([
    db.patients.get(pid).catch(() => undefined),
    db.labRequests.where('patientId').equals(pid).toArray().catch(() => []),
    db.vitalSigns.where('patientId').equals(pid).toArray().catch(() => []),
  ]);

  const p = (patientRow || {}) as Record<string, unknown>;
  const patient: PatientContext = {
    ...emptyPatient(),
    name: [p.firstName, p.lastName].filter(Boolean).join(' ').trim(),
    hospitalNumber: (p.hospitalNumber as string) || '',
    age: ageFrom(p.dateOfBirth),
    sex: sexFrom(p.gender),
    weightKg: Number.isFinite(Number(p.weight)) ? Number(p.weight) : null,
    heightCm: Number.isFinite(Number(p.height)) ? Number(p.height) : null,
    ward: (p.ward as string) || '',
    diagnosis: (p.primaryDiagnosis as string) || '',
    collectedAt: new Date().toISOString(),
  };

  const extraction: Extraction = emptyExtraction();
  const unmapped: UnmappedResult[] = [];
  const percentages: PercentageResult[] = [];
  let investigationCount = 0;

  // ── Lab results ──
  // Newest request last so that, where the same analyte was measured more than
  // once, the most recent value is the one the engine ends up interpreting.
  const orderedLabs = [...labRows].sort((a, b) => time(a.requestedAt) - time(b.requestedAt));

  for (const request of orderedLabs) {
    for (const t of request.tests || []) {
      const testName = t?.name ?? '';
      const value = t?.result ?? '';
      const unit = t?.unit ?? '';
      // A requested-but-unresulted test carries no information for the engine.
      if (!testName || value === '' || value == null) continue;

      // A differential percentage is not an analyte. Held back and converted to
      // an absolute count below, once the white cell count is known — filing
      // "LYM% 14.36" as a cell count would be a hundredfold error.
      if (isPercentageResult(String(testName), String(unit))) {
        const pct = toPercentage(String(testName), value);
        if (pct) { percentages.push(pct); continue; }
      }

      const { analyte, reason } = toAnalyte(testName, value, unit);
      if (analyte) {
        extraction.analytes.push(analyte);
        investigationCount++;
      } else {
        unmapped.push({
          testName: String(testName),
          value: String(value),
          unit: String(unit),
          reason: reason!,
        });
      }
    }
  }

  // ── Differential percentages → absolute counts ──
  // resolvePercentages is the engine's own routine: it derives the absolute
  // count from the white cell count and detects a lost decimal point in the
  // differential. Reusing it keeps one implementation of that logic.
  if (percentages.length) {
    const parseResult = {
      analytes: extraction.analytes,
      percentages,
      observations: extraction.observations,
    };
    const derived = resolvePercentages(parseResult as never, patient, 'patient-record', 1);
    extraction.analytes.push(...derived);
    investigationCount += derived.length;
  }

  // ── Vital signs: most recent set only ──
  const latestVitals = [...vitalRows].sort(
    (a, b) => time(b.recordedAt) - time(a.recordedAt),
  )[0] as unknown as Record<string, unknown> | undefined;

  if (latestVitals) {
    extraction.observations.push(...vitalsToObservations(latestVitals));
    // Temperature drives infective correlation rules in the engine.
    const temp = Number(latestVitals.temperature);
    if (Number.isFinite(temp) && temp >= 38) patient.fever = true;
    const wt = Number(latestVitals.weight);
    if (!patient.weightKg && Number.isFinite(wt) && wt > 0) patient.weightKg = wt;
    const ht = Number(latestVitals.height);
    if (!patient.heightCm && Number.isFinite(ht) && ht > 0) patient.heightCm = ht;
  }

  return {
    patient,
    extraction,
    unmapped,
    sources: { investigations: investigationCount, vitals: latestVitals ? 1 : 0 },
  };
}
