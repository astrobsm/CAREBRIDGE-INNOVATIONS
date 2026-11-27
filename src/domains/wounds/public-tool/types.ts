/**
 * AstroHEALTH Wound Measure: the public, no-login wound tool.
 *
 * Records live only in this browser, in the tool's own IndexedDB database
 * (see toolDb.ts). They are never sent to Supabase or to any server. They are
 * deliberately not the EMR's MonitoredWound / WoundAssessment records: there
 * is no patient record here, only a label the clinician types.
 *
 * Measurement field names match the EMR's WoundAssessment (lengthCm, areaCm2,
 * assessedAt, scaleReliable...) so woundAnalytics can read them unchanged.
 */

import type { ExudateAmount, ExudateType, TissueType } from '../monitorTypes';

export type { ExudateAmount, ExudateType, TissueType };

/** How an assessment's numbers were obtained. */
export type MeasureMethod = 'trace' | 'auto' | 'guided' | 'manual';

/** One wound followed over time. */
export interface ToolWound {
  id: string;
  /** Free text: initials or a bed number, never a full name. */
  patientLabel: string;
  /** Anatomical site. */
  site: string;
  /** Aetiology / cause. */
  aetiology?: string;
  /** yyyy-mm-dd */
  dateFirstSeen: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

/** One measurement visit on a wound. */
export interface ToolAssessment {
  id: string;
  woundId: string;
  /** ISO date-time of the assessment (the clinician can back-date it). */
  assessedAt: string;

  lengthCm?: number | null;
  widthCm?: number | null;
  areaCm2: number;
  perimeterCm?: number | null;
  depthCm?: number | null;

  granulationPct?: number | null;
  sloughPct?: number | null;
  necroticPct?: number | null;
  epithelialPct?: number | null;
  tissueTypes?: TissueType[];
  exudateAmount?: ExudateAmount;
  exudateType?: ExudateType;
  notes?: string;

  method: MeasureMethod;
  /** green_marker, grid, ruler, manual:<reference>, none... */
  calibrationMethod?: string;
  /** False when no trustworthy scale was in the frame. */
  scaleReliable: boolean;
  /** Traced outline in cm, centred, for the healing map. */
  contourCm?: Array<{ x: number; y: number }>;
  /** The stored photograph, if one was kept (ToolPhoto.id). */
  photoId?: string;

  createdAt: string; // ISO
  updatedAt: string; // ISO
}

/** The compressed photograph behind an assessment, kept as a Blob. */
export interface ToolPhoto {
  id: string;
  assessmentId: string;
  woundId: string;
  blob: Blob;
  mimeType: string;
  widthPx?: number;
  heightPx?: number;
  /** Scale of the STORED image, so it can be re-measured later. */
  pixelsPerCm?: number | null;
  /** True when the wound outline is drawn onto the stored frame. */
  hasContourOverlay?: boolean;
  createdAt: string; // ISO
}

/** Input to create a wound. */
export interface NewWoundInput {
  patientLabel: string;
  site: string;
  aetiology?: string;
  dateFirstSeen: string;
}

/** Input to add an assessment. */
export type NewAssessmentInput = Omit<ToolAssessment, 'id' | 'createdAt' | 'updatedAt' | 'photoId'>;

/** A photo about to be saved with an assessment. */
export interface NewPhotoInput {
  blob: Blob;
  widthPx?: number;
  heightPx?: number;
  pixelsPerCm?: number | null;
  hasContourOverlay?: boolean;
}
