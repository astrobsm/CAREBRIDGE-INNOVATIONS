/**
 * The wound tool's storage layer: wounds, assessments and photos on this
 * device only.
 *
 * Written against a small table interface rather than Dexie directly, so the
 * logic (validation, cascade delete, import merge) is tested in node with an
 * in-memory implementation. toolDb.ts provides the Dexie one.
 */

import { computeHealingAnalytics, toProgressEntries } from '../services/woundAnalytics';
import type { HealingAnalytics, WoundAssessment } from '../monitorTypes';
import type { WoundProgressEntry } from '../services/aiWoundMeasurement';
import type {
  NewAssessmentInput, NewPhotoInput, NewWoundInput, ToolAssessment, ToolPhoto, ToolWound,
} from './types';

/** The subset of a Dexie table the store uses. */
export interface ToolTable<T extends { id: string }> {
  get(id: string): Promise<T | undefined>;
  put(row: T): Promise<unknown>;
  bulkPut(rows: T[]): Promise<unknown>;
  delete(id: string): Promise<void>;
  bulkDelete(ids: string[]): Promise<void>;
  toArray(): Promise<T[]>;
  /** Rows whose `field` equals `value`. */
  whereEquals(field: keyof T & string, value: string): Promise<T[]>;
  clear(): Promise<void>;
  count(): Promise<number>;
}

export interface ToolTables {
  wounds: ToolTable<ToolWound>;
  assessments: ToolTable<ToolAssessment>;
  photos: ToolTable<ToolPhoto>;
  /** Run `fn` atomically across all three tables. */
  transaction<R>(fn: () => Promise<R>): Promise<R>;
}

/** A wound row for the list, with its latest figures. */
export interface WoundSummary extends ToolWound {
  assessmentCount: number;
  latestAreaCm2: number | null;
  latestAssessedAt: string | null;
  analytics: HealingAnalytics;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

const MAX_LABEL = 40;

/**
 * A label that looks like a full name ("Ngozi Okafor") rather than initials or
 * a bed number. Only a nudge: the clinician can still save it.
 */
export function looksLikeFullName(label: string): boolean {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return false;
  // Two or more alphabetic words of three or more letters, with no digit.
  if (/\d/.test(label)) return false;
  return words.filter(w => /^[A-Za-z'-]{3,}$/.test(w)).length >= 2;
}

const isFiniteNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const nowIso = () => new Date().toISOString();
const newId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** Check and tidy a new wound. Throws ValidationError. */
export function validateWound(input: NewWoundInput): NewWoundInput {
  const patientLabel = (input.patientLabel || '').trim();
  const site = (input.site || '').trim();
  const dateFirstSeen = (input.dateFirstSeen || '').trim();
  if (!patientLabel) throw new ValidationError('Enter a label: initials or a bed number.');
  if (patientLabel.length > MAX_LABEL) throw new ValidationError(`Keep the label under ${MAX_LABEL} characters.`);
  if (!site) throw new ValidationError('Choose the wound site.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFirstSeen)) throw new ValidationError('Enter the date first seen.');
  return { patientLabel, site, aetiology: input.aetiology?.trim() || undefined, dateFirstSeen };
}

/** Check and tidy a new assessment. Throws ValidationError. */
export function validateAssessment(input: NewAssessmentInput): NewAssessmentInput {
  const area = Number(input.areaCm2);
  if (!Number.isFinite(area) || area <= 0) {
    throw new ValidationError('Enter the wound area, or length and width.');
  }
  if (!input.assessedAt || Number.isNaN(new Date(input.assessedAt).getTime())) {
    throw new ValidationError('Enter the assessment date.');
  }
  const num = (v: unknown): number | null => {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };
  const pct = (v: unknown): number | null => {
    const n = num(v);
    return n === null ? null : Math.min(100, n);
  };
  return {
    ...input,
    areaCm2: area,
    lengthCm: num(input.lengthCm),
    widthCm: num(input.widthCm),
    perimeterCm: num(input.perimeterCm),
    depthCm: num(input.depthCm),
    granulationPct: pct(input.granulationPct),
    sloughPct: pct(input.sloughPct),
    necroticPct: pct(input.necroticPct),
    epithelialPct: pct(input.epithelialPct),
    notes: input.notes?.trim() || undefined,
    scaleReliable: Boolean(input.scaleReliable),
  };
}

/**
 * Area from length x width when the clinician only has a ruler: the ellipse
 * (pi/4 x L x W), which is closer to a real wound than the rectangle and is
 * the usual bedside estimate.
 */
export function ellipseAreaCm2(lengthCm: number, widthCm: number): number {
  if (!isFiniteNum(lengthCm) || !isFiniteNum(widthCm) || lengthCm <= 0 || widthCm <= 0) return 0;
  return Math.round((Math.PI / 4) * lengthCm * widthCm * 100) / 100;
}

/** The tool's assessments in the shape woundAnalytics reads. */
export function asAnalyticsAssessments(rows: ToolAssessment[]): WoundAssessment[] {
  return rows.map(a => ({
    ...a,
    woundId: a.woundId,
    patientId: '',
    clinicalDescription: a.notes,
    calibrationType: a.calibrationMethod,
  }));
}

export function analyticsFor(rows: ToolAssessment[]): HealingAnalytics {
  return computeHealingAnalytics(asAnalyticsAssessments(rows));
}

export function progressEntriesFor(rows: ToolAssessment[]): WoundProgressEntry[] {
  return toProgressEntries(asAnalyticsAssessments(rows));
}

const byDate = (a: ToolAssessment, b: ToolAssessment) =>
  new Date(a.assessedAt).getTime() - new Date(b.assessedAt).getTime();

export function createWoundStore(t: ToolTables) {
  async function listAssessments(woundId: string): Promise<ToolAssessment[]> {
    const rows = await t.assessments.whereEquals('woundId', woundId);
    return rows.slice().sort(byDate);
  }

  function summarise(w: ToolWound, rows: ToolAssessment[]): WoundSummary {
    const sorted = rows.slice().sort(byDate);
    const latest = sorted[sorted.length - 1];
    return {
      ...w,
      assessmentCount: sorted.length,
      latestAreaCm2: latest ? latest.areaCm2 : null,
      latestAssessedAt: latest ? latest.assessedAt : null,
      analytics: analyticsFor(sorted),
    };
  }

  return {
    /** Every wound, most recently changed first. */
    async listWounds(): Promise<WoundSummary[]> {
      const [wounds, assessments] = await Promise.all([t.wounds.toArray(), t.assessments.toArray()]);
      const byWound = new Map<string, ToolAssessment[]>();
      for (const a of assessments) {
        const list = byWound.get(a.woundId) ?? [];
        list.push(a);
        byWound.set(a.woundId, list);
      }
      return wounds
        .map(w => summarise(w, byWound.get(w.id) ?? []))
        .sort((a, b) => (b.latestAssessedAt || b.updatedAt).localeCompare(a.latestAssessedAt || a.updatedAt));
    },

    getWound: (id: string) => t.wounds.get(id),

    async createWound(input: NewWoundInput): Promise<ToolWound> {
      const clean = validateWound(input);
      const ts = nowIso();
      const wound: ToolWound = { id: newId(), ...clean, createdAt: ts, updatedAt: ts };
      await t.wounds.put(wound);
      return wound;
    },

    async updateWound(id: string, input: NewWoundInput): Promise<ToolWound> {
      const existing = await t.wounds.get(id);
      if (!existing) throw new ValidationError('That wound is no longer on this phone.');
      const clean = validateWound(input);
      const wound: ToolWound = { ...existing, ...clean, updatedAt: nowIso() };
      await t.wounds.put(wound);
      return wound;
    },

    /** Delete a wound with all its assessments and photos. */
    async deleteWound(id: string): Promise<void> {
      await t.transaction(async () => {
        const rows = await t.assessments.whereEquals('woundId', id);
        const photos = await t.photos.whereEquals('woundId', id);
        await t.photos.bulkDelete(photos.map(p => p.id));
        await t.assessments.bulkDelete(rows.map(a => a.id));
        await t.wounds.delete(id);
      });
    },

    listAssessments,

    async addAssessment(input: NewAssessmentInput, photo?: NewPhotoInput | null): Promise<ToolAssessment> {
      const clean = validateAssessment(input);
      return t.transaction(async () => {
        const wound = await t.wounds.get(clean.woundId);
        if (!wound) throw new ValidationError('That wound is no longer on this phone.');
        const ts = nowIso();
        const id = newId();
        let photoId: string | undefined;
        if (photo?.blob) {
          photoId = newId();
          await t.photos.put({
            id: photoId,
            assessmentId: id,
            woundId: wound.id,
            blob: photo.blob,
            mimeType: photo.blob.type || 'image/jpeg',
            widthPx: photo.widthPx,
            heightPx: photo.heightPx,
            pixelsPerCm: photo.pixelsPerCm ?? null,
            hasContourOverlay: photo.hasContourOverlay,
            createdAt: ts,
          });
        }
        const row: ToolAssessment = { ...clean, id, photoId, createdAt: ts, updatedAt: ts };
        await t.assessments.put(row);
        await t.wounds.put({ ...wound, updatedAt: ts });
        return row;
      });
    },

    async deleteAssessment(id: string): Promise<void> {
      await t.transaction(async () => {
        const row = await t.assessments.get(id);
        if (!row) return;
        const photos = await t.photos.whereEquals('assessmentId', id);
        await t.photos.bulkDelete(photos.map(p => p.id));
        await t.assessments.delete(id);
      });
    },

    getPhoto: (id: string) => t.photos.get(id),

    async counts() {
      const [wounds, assessments, photos] = await Promise.all([
        t.wounds.count(), t.assessments.count(), t.photos.count(),
      ]);
      return { wounds, assessments, photos };
    },

    /** Everything, for a backup. */
    async dumpAll() {
      const [wounds, assessments, photos] = await Promise.all([
        t.wounds.toArray(), t.assessments.toArray(), t.photos.toArray(),
      ]);
      return { wounds, assessments, photos };
    },

    /**
     * Put records from a backup. A record with the same id is replaced, so
     * importing the same backup twice changes nothing. `replace` empties the
     * device first.
     */
    async loadAll(
      data: { wounds: ToolWound[]; assessments: ToolAssessment[]; photos: ToolPhoto[] },
      mode: 'merge' | 'replace' = 'merge',
    ): Promise<void> {
      await t.transaction(async () => {
        if (mode === 'replace') {
          await t.photos.clear();
          await t.assessments.clear();
          await t.wounds.clear();
        }
        await t.wounds.bulkPut(data.wounds);
        await t.assessments.bulkPut(data.assessments);
        await t.photos.bulkPut(data.photos);
      });
    },
  };
}

export type WoundStore = ReturnType<typeof createWoundStore>;

/** In-memory tables, for tests and as a fallback when IndexedDB is missing. */
export function createMemoryTables(): ToolTables {
  function table<T extends { id: string }>(): ToolTable<T> {
    const rows = new Map<string, T>();
    return {
      async get(id) { return rows.get(id); },
      async put(row) { rows.set(row.id, row); },
      async bulkPut(list) { for (const r of list) rows.set(r.id, r); },
      async delete(id) { rows.delete(id); },
      async bulkDelete(ids) { for (const id of ids) rows.delete(id); },
      async toArray() { return [...rows.values()]; },
      async whereEquals(field, value) {
        return [...rows.values()].filter(r => (r as Record<string, unknown>)[field] === value);
      },
      async clear() { rows.clear(); },
      async count() { return rows.size; },
    };
  }
  return {
    wounds: table<ToolWound>(),
    assessments: table<ToolAssessment>(),
    photos: table<ToolPhoto>(),
    // No rollback in memory; Dexie provides the real atomicity.
    transaction: fn => fn(),
  };
}
