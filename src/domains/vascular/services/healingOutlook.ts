/**
 * Healing outlook, reconstruction readiness, and the alerts that sit on top.
 *
 * NO PERCENTAGES. The specification is explicit and it is right: an
 * individualised figure like "73% chance of healing" requires a model validated
 * on a known population with known calibration, and none exists here. What this
 * produces instead is a stratum — favourable, guarded, poor, very poor — with
 * the favourable and concerning factors listed separately, so a clinician reads
 * the reasoning rather than a number.
 *
 * That is not a lesser output. A surgeon can act on "severe ischaemia,
 * persistent necrosis, wound enlarging" in a way they cannot act on 73%, and
 * they can disagree with any single line of it.
 *
 * WHY RECONSTRUCTION READINESS IS SEPARATE
 * This module lives inside a plastic surgery application, and the question that
 * actually gets asked is not "how ischaemic is this limb" but "can I graft
 * this". Readiness is therefore its own output — and it is never a
 * contraindication, only a statement of what the documented perfusion does and
 * does not support.
 *
 * Pure functions: no DOM, no database.
 */

import type {
  FootInfectionAssessment, LimbPerfusion, VascularWoundSnapshot,
  WifiResult, VascularAlert, RestPainRecord,
} from '../types';
import { calculateAbi, calculateTbi } from './perfusion';

export const OUTLOOK_VERSION = 'healing-outlook-1.0.0';

export type HealingOutlook = 'favourable' | 'guarded' | 'poor' | 'very_poor' | 'insufficient_data';

export interface OutlookResult {
  outlook: HealingOutlook;
  favourable: string[];
  concerning: string[];
  /** What would most improve the assessment, in order. */
  missing: string[];
  /** Always present: this is a stratum, not a probability. */
  statement: string;
}

export interface OutlookInput {
  wifi: WifiResult;
  perfusion?: LimbPerfusion;
  wound?: VascularWoundSnapshot;
  infection?: FootInfectionAssessment;
  restPain?: RestPainRecord;
  /** Percentage change in wound area since the previous assessment. */
  woundAreaChangePercent?: number | null;
  /** Change in toe pressure since the previous assessment, mmHg. */
  toePressureChangeMmHg?: number | null;
  diabetes?: boolean;
  hba1cPercent?: number;
  smoker?: boolean;
  renalImpairment?: boolean;
  albuminGL?: number;
  haemoglobinGDl?: number;
  revascularisedSince?: boolean;
}

/**
 * Stratify the outlook.
 *
 * Ischaemia dominates, because it is the factor that makes every other one
 * irrelevant: a clean, well-offloaded, well-nourished wound on a limb with a
 * toe pressure of 20 mmHg will not heal. Everything else modifies from there.
 */
export function assessHealingOutlook(input: OutlookInput): OutlookResult {
  const favourable: string[] = [];
  const concerning: string[] = [];
  const missing: string[] = [];

  const iGrade = input.wifi.ischaemia.grade;
  const wGrade = input.wifi.wound.grade;
  const fGrade = input.wifi.footInfection.grade;

  if (iGrade === null) {
    missing.push('A perfusion measurement — toe pressure, TcPO2 or a usable ankle index.');
  }
  if (wGrade === null) missing.push('A wound assessment.');
  if (fGrade === null) missing.push('An infection assessment.');

  // ── Perfusion ────────────────────────────────────────────────────────────
  const toe = input.perfusion?.pressures?.toeMmHg;
  const tcpo2 = input.perfusion?.local?.find(l => l.kind === 'tcpo2')?.value;

  if (iGrade === 0) {
    favourable.push(input.wifi.ischaemia.reason);
  } else if (iGrade === 1) {
    concerning.push(`Mild ischaemia — ${input.wifi.ischaemia.reason}`);
  } else if (iGrade === 2) {
    concerning.push(`Moderate ischaemia — ${input.wifi.ischaemia.reason}`);
  } else if (iGrade === 3) {
    concerning.push(`Severe ischaemia — ${input.wifi.ischaemia.reason}`);
  }

  if (toe != null && toe < 30) {
    concerning.push(
      `Toe pressure of ${toe} mmHg. Spontaneous healing of tissue loss is unlikely at this level `
      + 'without improved perfusion.',
    );
  }
  if (tcpo2 != null && tcpo2 < 30) {
    concerning.push(`TcPO2 of ${tcpo2} mmHg at the wound.`);
  }

  if (input.perfusion?.pressures) {
    const abi = calculateAbi(input.perfusion.pressures);
    if (abi.category === 'noncompressible') {
      concerning.push(
        'The ankle index is noncompressible, so it cannot be used to judge perfusion. Healing '
        + 'assessment rests on toe pressure or TcPO2.',
      );
      if (toe == null && tcpo2 == null) {
        missing.push('Toe pressure or TcPO2 — the ankle index is uninterpretable in this limb.');
      }
    }
    const tbi = calculateTbi(input.perfusion.pressures);
    if (tbi.value !== null && tbi.value > 0.70) {
      favourable.push(`Toe-brachial index of ${tbi.value}, above the abnormal threshold.`);
    }
  }

  // ── Trajectory ───────────────────────────────────────────────────────────
  //
  // Direction of travel carries more weight than any single reading: a wound
  // shrinking on a marginal limb is doing better than a static one on a
  // comfortable index.
  if (input.woundAreaChangePercent != null) {
    if (input.woundAreaChangePercent <= -20) {
      favourable.push(`Wound area down ${Math.abs(input.woundAreaChangePercent)}% since the previous assessment.`);
    } else if (input.woundAreaChangePercent >= 10) {
      concerning.push(`Wound area up ${input.woundAreaChangePercent}% since the previous assessment.`);
    } else {
      concerning.push('Wound area has not meaningfully reduced since the previous assessment.');
    }
  } else {
    missing.push('A previous wound area, so the direction of travel can be measured.');
  }

  if (input.toePressureChangeMmHg != null) {
    if (input.toePressureChangeMmHg >= 10) {
      favourable.push(`Toe pressure improved by ${input.toePressureChangeMmHg} mmHg.`);
    } else if (input.toePressureChangeMmHg <= -10) {
      concerning.push(`Toe pressure fell by ${Math.abs(input.toePressureChangeMmHg)} mmHg.`);
    }
  }

  if (input.revascularisedSince) {
    favourable.push('Revascularisation has been performed since the previous assessment.');
  }

  // ── Wound and infection ──────────────────────────────────────────────────
  if (wGrade !== null && wGrade >= 2) {
    concerning.push(`Extensive tissue loss — ${input.wifi.wound.reason}`);
  } else if (wGrade === 0) {
    favourable.push('No tissue loss.');
  }

  if (input.wound?.gangrene && input.wound.gangrene !== 'none') {
    concerning.push(`Gangrene recorded (${input.wound.gangrene.replace(/_/g, ' ')}).`);
  }
  if (input.wound?.durationWeeks != null && input.wound.durationWeeks > 12) {
    concerning.push(`Wound present for ${input.wound.durationWeeks} weeks without healing.`);
  }

  if (fGrade !== null && fGrade >= 2) {
    concerning.push(`Infection — ${input.wifi.footInfection.reason}`);
  } else if (fGrade === 0) {
    favourable.push('No infection.');
  }
  if (input.infection?.osteomyelitisSuspected) {
    concerning.push('Osteomyelitis suspected.');
  }

  if (input.restPain?.present) {
    concerning.push('Ischaemic rest pain is present.');
  }

  // ── Patient factors ──────────────────────────────────────────────────────
  if (input.diabetes && input.hba1cPercent != null) {
    if (input.hba1cPercent >= 8.5) {
      concerning.push(`HbA1c of ${input.hba1cPercent}% — glycaemic control is impairing healing.`);
    } else if (input.hba1cPercent < 7.5) {
      favourable.push(`HbA1c of ${input.hba1cPercent}%.`);
    }
  } else if (input.diabetes) {
    missing.push('An HbA1c.');
  }

  if (input.smoker) concerning.push('Current smoking.');
  if (input.renalImpairment) concerning.push('Renal impairment.');
  if (input.albuminGL != null && input.albuminGL < 30) {
    concerning.push(`Albumin of ${input.albuminGL} g/L — nutritional state is limiting healing.`);
  }
  if (input.haemoglobinGDl != null && input.haemoglobinGDl < 10) {
    concerning.push(`Haemoglobin of ${input.haemoglobinGDl} g/dL.`);
  }
  if (input.albuminGL == null) missing.push('An albumin, as a marker of nutritional state.');

  // ── Stratify ─────────────────────────────────────────────────────────────
  let outlook: HealingOutlook;

  if (iGrade === null || wGrade === null) {
    outlook = 'insufficient_data';
  } else if (iGrade === 3) {
    // Severe ischaemia dominates everything else.
    outlook = wGrade >= 2 || (fGrade ?? 0) >= 2 ? 'very_poor' : 'poor';
  } else if (iGrade === 2) {
    outlook = wGrade >= 2 || (fGrade ?? 0) >= 2 ? 'poor' : 'guarded';
  } else if (iGrade === 1) {
    outlook = concerning.length > favourable.length ? 'guarded' : 'favourable';
  } else {
    // No significant ischaemia; the wound and the patient decide.
    const heavy = (wGrade >= 2 ? 1 : 0) + ((fGrade ?? 0) >= 2 ? 1 : 0);
    outlook = heavy >= 2 ? 'poor' : heavy === 1 ? 'guarded' : 'favourable';
  }

  return {
    outlook,
    favourable,
    concerning,
    missing: Array.from(new Set(missing)),
    statement:
      'A transparent stratum based on the documented findings, not a validated probability. '
      + 'No individualised percentage is produced because no model validated on a comparable '
      + 'population has been implemented.',
  };
}

// ── Reconstruction readiness ────────────────────────────────────────────────

export type ReconstructionReadiness =
  | 'favourable_perfusion'
  | 'potentially_adequate'
  | 'uncertain'
  | 'significant_ischaemia'
  | 'severe_ischaemia'
  | 'vascular_assessment_first';

export const READINESS_LABEL: Record<ReconstructionReadiness, string> = {
  favourable_perfusion: 'Favourable documented perfusion',
  potentially_adequate: 'Potentially adequate perfusion',
  uncertain: 'Perfusion uncertain',
  significant_ischaemia: 'Significant ischaemia documented',
  severe_ischaemia: 'Severe ischaemia documented',
  vascular_assessment_first: 'Vascular assessment indicated before definitive reconstruction',
};

export interface ReadinessResult {
  readiness: ReconstructionReadiness;
  basis: string[];
  /** The checklist items that are not yet satisfied. */
  outstanding: string[];
  /** Never a contraindication. Rendered with the result. */
  disclaimer: string;
}

/**
 * What the documented perfusion supports, for a planned reconstruction.
 *
 * This deliberately stops short of a recommendation. It reports what has been
 * measured and what has not; whether to graft remains entirely the surgeon's
 * decision, and a surgeon may quite reasonably graft a limb this flags.
 */
export function assessReconstructionReadiness(input: OutlookInput): ReadinessResult {
  const basis: string[] = [];
  const outstanding: string[] = [];

  const iGrade = input.wifi.ischaemia.grade;
  const fGrade = input.wifi.footInfection.grade;
  const toe = input.perfusion?.pressures?.toeMmHg;
  const tcpo2 = input.perfusion?.local?.find(l => l.kind === 'tcpo2')?.value;

  if (iGrade === null) outstanding.push('A perfusion measurement adequate to grade ischaemia.');
  if (fGrade === null) outstanding.push('An infection assessment.');
  if (toe == null && tcpo2 == null) {
    outstanding.push('Toe pressure or TcPO2 — perfusion measured at the level of the planned reconstruction.');
  }
  if (!input.perfusion?.doppler) outstanding.push('A Doppler study of the limb.');

  let readiness: ReconstructionReadiness;

  if (iGrade === null) {
    readiness = 'uncertain';
    basis.push('Ischaemia could not be graded from the recorded measurements.');
  } else if (iGrade === 3) {
    readiness = 'severe_ischaemia';
    basis.push(input.wifi.ischaemia.reason);
    basis.push('Perfusion at this level is generally insufficient to support graft take or flap healing.');
  } else if (iGrade === 2) {
    readiness = 'significant_ischaemia';
    basis.push(input.wifi.ischaemia.reason);
  } else if (iGrade === 1) {
    readiness = 'potentially_adequate';
    basis.push(input.wifi.ischaemia.reason);
  } else {
    readiness = 'favourable_perfusion';
    basis.push(input.wifi.ischaemia.reason);
  }

  if ((iGrade ?? 0) >= 2) {
    readiness = 'vascular_assessment_first';
    basis.push('Revascularisation assessment before definitive reconstruction is worth considering.');
  }

  if (fGrade !== null && fGrade >= 2) {
    basis.push(`Active infection: ${input.wifi.footInfection.reason} Infection is usually addressed before definitive closure.`);
  }

  if (tcpo2 != null) {
    basis.push(`TcPO2 at the wound is ${tcpo2} mmHg.`);
  }

  return {
    readiness,
    basis,
    outstanding,
    disclaimer:
      'A statement of what the documented perfusion supports, not a contraindication. The decision '
      + 'to operate remains the surgeon’s.',
  };
}

// ── Alerts ──────────────────────────────────────────────────────────────────

export interface AlertInput extends OutlookInput {
  acuteConcerning?: boolean;
  acuteHeadline?: string;
  acuteEvidence?: string[];
  newAbsentPulse?: boolean;
  newLossOfDopplerSignal?: boolean;
}

let alertSeq = 0;
const nextId = () => `va-${Date.now().toString(36)}-${(alertSeq++).toString(36)}`;

/**
 * Red, amber and green, in that order.
 *
 * Every alert carries the findings that raised it. The thresholds are
 * deliberately conservative about red: an alert level that fires often stops
 * being read, and the one thing this module cannot afford is for a genuine
 * acute limb to arrive in a list of seven amber warnings.
 */
export function buildVascularAlerts(input: AlertInput): VascularAlert[] {
  const alerts: VascularAlert[] = [];

  // ── Red ──────────────────────────────────────────────────────────────────
  if (input.acuteConcerning) {
    alerts.push({
      id: nextId(),
      level: 'red',
      title: input.acuteHeadline ?? 'Possible acute limb ischaemia.',
      evidence: input.acuteEvidence ?? [],
      action: 'Urgent vascular assessment. Do not wait for the rest of this assessment.',
    });
  }
  if (input.newLossOfDopplerSignal) {
    alerts.push({
      id: nextId(),
      level: 'red',
      title: 'New loss of Doppler signal.',
      evidence: ['A previously audible Doppler signal is now absent.'],
      action: 'Urgent vascular assessment.',
    });
  }
  if (input.wifi.footInfection.grade === 3) {
    alerts.push({
      id: nextId(),
      level: 'red',
      title: 'Foot infection with systemic inflammatory response.',
      evidence: [input.wifi.footInfection.reason],
      action: 'Urgent surgical and medical review.',
    });
  }

  // ── Amber ────────────────────────────────────────────────────────────────
  const iGrade = input.wifi.ischaemia.grade;
  if (iGrade === 3) {
    alerts.push({
      id: nextId(),
      level: 'amber',
      title: 'Severe ischaemia documented.',
      evidence: [input.wifi.ischaemia.reason],
      action: 'Consider vascular specialist assessment for revascularisation suitability.',
    });
  }
  if (input.restPain?.present) {
    alerts.push({
      id: nextId(),
      level: 'amber',
      title: 'Ischaemic rest pain.',
      evidence: [
        input.restPain.nocturnal ? 'Night pain recorded.' : 'Rest pain recorded.',
        input.restPain.relievedByDependency ? 'Relieved by hanging the limb down.' : '',
      ].filter(Boolean),
      action: 'Chronic limb-threatening ischaemia should be considered and assessed.',
    });
  }
  if (input.wound?.gangrene && input.wound.gangrene !== 'none') {
    alerts.push({
      id: nextId(),
      level: 'amber',
      title: 'Gangrene documented.',
      evidence: [`Recorded as ${input.wound.gangrene.replace(/_/g, ' ')}.`],
      action: 'Consider urgent vascular specialist assessment.',
    });
  }
  if (input.woundAreaChangePercent != null && input.woundAreaChangePercent >= 20) {
    alerts.push({
      id: nextId(),
      level: 'amber',
      title: 'Wound is enlarging.',
      evidence: [`Area up ${input.woundAreaChangePercent}% since the previous assessment.`],
      action: 'Review perfusion, infection, offloading and the wound diagnosis itself.',
    });
  }
  if (input.toePressureChangeMmHg != null && input.toePressureChangeMmHg <= -10) {
    alerts.push({
      id: nextId(),
      level: 'amber',
      title: 'Perfusion is deteriorating.',
      evidence: [`Toe pressure fell by ${Math.abs(input.toePressureChangeMmHg)} mmHg since the previous assessment.`],
      action: 'Consider vascular specialist assessment.',
    });
  }
  if (input.newAbsentPulse) {
    alerts.push({
      id: nextId(),
      level: 'amber',
      title: 'New absent pulse.',
      evidence: ['A previously present pulse is no longer palpable.'],
      action: 'Confirm with Doppler and consider vascular assessment.',
    });
  }

  // ── Green ────────────────────────────────────────────────────────────────
  if (alerts.length === 0) {
    alerts.push({
      id: nextId(),
      level: 'green',
      title: 'No alert-level findings recorded.',
      evidence: input.wifi.complete
        ? [`WIfI components complete: ${input.wifi.limbThreatBasis[0] ?? ''}`.trim()]
        : ['Note that not every WIfI component has been graded.'],
      action: 'Continue the routine monitoring and risk-management pathway.',
    });
  }

  return alerts;
}
