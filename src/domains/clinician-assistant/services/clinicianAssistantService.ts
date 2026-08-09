/**
 * Clinician Assistant — service layer (offline-first, AstroHEALTH data layer).
 *
 * Runs the diagnostic engine against a patient's record and persists what it
 * produced. The interpretation itself happens HERE, client-side: the engine is
 * pure, so it runs unchanged with no network, which is the condition a ward
 * round actually happens in. Storage holds the result only; it contains no
 * clinical logic and must not acquire any.
 *
 * ADAPTED FOR ASTROHEALTH: the original persisted through a REST API. This
 * writes to IndexedDB (Dexie) and mirrors to Supabase via `syncRecord`, exactly
 * as woundMonitorService and tumourBoardService do.
 */

import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../database';
import { syncRecord } from '../../../services/cloudSyncService';
import { analyse } from './engine/analyse';
import { buildFromPatientRecord, type BridgeResult, type UnmappedResult } from './patientBridge';
import type { AnalysisResult, PatientContext, Severity } from './engine/types';
import type { Extraction } from './engine/context';

/**
 * Bumped whenever the engine's rules change. Stored with every analysis: an
 * impression cannot be interpreted later without knowing which ruleset wrote it.
 */
export const ENGINE_VERSION = '1.0.0';

export type AnalysisSource = 'record' | 'scan' | 'manual' | 'mixed';

/** A persisted analysis. Append-only: an impression is a record of what was thought when. */
export interface ClinicianAnalysis {
  id: string;
  patientId: string | null;
  hospitalId?: string;
  hospitalNumber?: string | null;
  source: AnalysisSource;
  overallSeverity: Severity;
  impression: string[];
  nextSteps?: unknown;
  modules?: unknown;
  correlations?: unknown;
  patientContext?: unknown;
  unmapped?: UnmappedResult[];
  engineVersion?: string;
  notes?: string | null;
  analysedAt: string;
  analysedBy?: string;
  createdAt: string;
  updatedAt: string;
  /** Denormalised for the recent-analyses list. */
  firstName?: string;
  lastName?: string;
}

export interface RunResult {
  analysis: AnalysisResult;
  unmapped: UnmappedResult[];
  sources: BridgeResult['sources'];
}

const nowIso = (): string => new Date().toISOString();
const time = (v?: string): number => (v ? new Date(v).getTime() : 0);

/**
 * Pull a patient's record, interpret it, and return the result WITHOUT saving.
 * Saving is a separate, deliberate act — an analysis run to look at something
 * should not silently become part of the record.
 */
export async function runForPatient(patientId: string | number): Promise<RunResult> {
  const bridge = await buildFromPatientRecord(patientId);
  const analysis = analyse(bridge.patient, bridge.extraction, []);
  return { analysis, unmapped: bridge.unmapped, sources: bridge.sources };
}

/** Interpret values the clinician entered or scanned, rather than the record. */
export function runForContext(patient: PatientContext, extraction: Extraction): AnalysisResult {
  return analyse(patient, extraction, []);
}

export async function saveAnalysis(
  patientId: string | null,
  result: RunResult,
  opts: { source?: AnalysisSource; notes?: string; analysedBy?: string; hospitalId?: string } = {},
): Promise<ClinicianAnalysis> {
  const { analysis, unmapped } = result;
  const ts = nowIso();

  let firstName: string | undefined;
  let lastName: string | undefined;
  if (patientId) {
    try {
      const p = await db.patients.get(patientId);
      firstName = p?.firstName;
      lastName = p?.lastName;
    } catch { /* patient not mirrored locally */ }
  }

  const record: ClinicianAnalysis = {
    id: uuidv4(),
    patientId: patientId ?? null,
    hospitalId: opts.hospitalId,
    hospitalNumber: analysis.patient.hospitalNumber || null,
    source: opts.source || 'record',
    overallSeverity: analysis.overallSeverity,
    impression: analysis.impression,
    nextSteps: analysis.nextSteps,
    modules: analysis.modules,
    correlations: analysis.correlations,
    patientContext: analysis.patient,
    unmapped,
    engineVersion: ENGINE_VERSION,
    notes: opts.notes || null,
    analysedAt: ts,
    analysedBy: opts.analysedBy,
    createdAt: ts,
    updatedAt: ts,
    firstName,
    lastName,
  };

  await db.clinicianAnalyses.add(record);
  syncRecord('clinicianAnalyses', record as unknown as Record<string, unknown>);
  return record;
}

/** A patient's saved analyses, newest first. */
export async function listForPatient(patientId: string): Promise<ClinicianAnalysis[]> {
  try {
    const rows = await db.clinicianAnalyses.where('patientId').equals(patientId).toArray();
    return rows.sort((a, b) => time(b.analysedAt) - time(a.analysedAt));
  } catch (e) {
    console.error('[ClinicianAssistant] listForPatient failed:', e);
    return [];
  }
}

/** Recent analyses across all patients, newest first. */
export async function listRecent(limit = 50): Promise<ClinicianAnalysis[]> {
  try {
    const rows = await db.clinicianAnalyses.toArray();
    return rows.sort((a, b) => time(b.analysedAt) - time(a.analysedAt)).slice(0, limit);
  } catch (e) {
    console.error('[ClinicianAssistant] listRecent failed:', e);
    return [];
  }
}

export async function getAnalysis(id: string): Promise<ClinicianAnalysis | null> {
  try {
    return (await db.clinicianAnalyses.get(id)) ?? null;
  } catch {
    return null;
  }
}

/**
 * Attach a clinician's note to a saved analysis.
 *
 * The impression itself is never rewritten — it is a record of what the engine
 * said at the time. Disagreement belongs in the note beside it.
 */
export async function annotateAnalysis(id: string, notes: string): Promise<ClinicianAnalysis | undefined> {
  await db.clinicianAnalyses.update(id, { notes, updatedAt: nowIso() });
  const updated = await db.clinicianAnalyses.get(id);
  if (updated) syncRecord('clinicianAnalyses', updated as unknown as Record<string, unknown>);
  return updated;
}

export type { AnalysisResult, UnmappedResult };
