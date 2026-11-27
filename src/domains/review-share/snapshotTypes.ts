/**
 * The frozen summary a review link shows. Built on the sharing clinician's
 * device (summaryBuilder.ts), uploaded as JSON, rendered by the public viewer.
 *
 * Deliberately generic — sections of items of label/value fields, lines and
 * small tables — so the viewer renders whatever the builder puts in without
 * knowing the EMR's record types, and a newer builder never breaks an older
 * viewer. Everything is plain text: the viewer never renders HTML from it.
 *
 * Types only: imported by both the EMR side and the viewer.
 */

export const SNAPSHOT_VERSION = 1;

export interface SnapField {
  label: string;
  value: string;
}

export interface SnapTable {
  columns: string[];
  rows: string[][];
}

export interface SnapItem {
  title: string;
  /** ISO date-time the item is about (shown formatted). */
  date?: string;
  status?: string;
  /** One line under the title (who, where). */
  subtitle?: string;
  /** Bulleted lines (plan lines, medicines, results). */
  lines?: string[];
  fields?: SnapField[];
  table?: SnapTable;
}

export interface SnapSection {
  id: string;
  title: string;
  items: SnapItem[];
  /** Shown under the heading (e.g. "3 older entries not shown"). */
  note?: string;
}

export interface SnapPhotoSummary {
  /** Photos uploaded with this snapshot. */
  included: number;
  /** Photos found in the record. */
  total: number;
  /** total - included. */
  omitted: number;
  /** Why some were left out, in words. */
  note?: string;
}

export interface ReviewSnapshot {
  version: number;
  /** When the device built it (ISO). */
  snapshotAt: string;
  patient: {
    name: string;
    /** "45 y · Female" */
    summary: string;
    fields: SnapField[];
  };
  alerts: {
    allergies: string[];
    conditions: string[];
    medicines: string[];
  };
  sections: SnapSection[];
  photos: SnapPhotoSummary;
}

/** A photo as the viewer receives it from app_open_review_share. */
export interface ReviewPhoto {
  seq: number;
  caption?: string | null;
  source?: string | null;
  taken_at?: string | null;
  mime: string;
  data: string;
  width?: number | null;
  height?: number | null;
}
