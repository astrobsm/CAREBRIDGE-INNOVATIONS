/**
 * WIfI, computed from the measurements rather than typed in.
 *
 * The limb salvage module already stores a WIfI classification the clinician
 * grades by hand. This derives the same three grades from the recorded
 * measurements and states which measurement decided each one — so the grade can
 * be checked, argued with, and recomputed when a toe pressure arrives an hour
 * later.
 *
 * TWO RULES THAT KEEP THE ISCHAEMIA GRADE HONEST
 *
 * A noncompressible ABI is treated as missing, not as grade 0. Above 1.40 the
 * ankle vessels did not compress; the index says nothing about perfusion, and
 * grading a calcified diabetic limb as "no ischaemia" on that basis is the most
 * dangerous single thing this file could do.
 *
 * Where several measurements are available they are not averaged. Toe pressure
 * and TcPO2 reflect perfusion at the foot, where the tissue actually is, so
 * they take precedence over the ankle index; whichever decided the grade is
 * named, and the others are listed as present-but-not-used with the reason.
 *
 * THE OVERALL SVS STAGE IS NOT COMPUTED HERE — see WIFI_STAGE_TABLE.
 */

import type {
  FootInfectionAssessment, GradedComponent, LimbPerfusion,
  VascularWoundSnapshot, WifiGrade, WifiResult,
} from '../types';
import { calculateAbi, calculateTbi } from './perfusion';

export const WIFI_ENGINE_VERSION = 'wifi-1.0.0';

/**
 * Ischaemia thresholds, held as configurable data.
 *
 * The published WIfI ischaemia table grades on ankle-brachial index, absolute
 * ankle pressure, and toe pressure or TcPO2. The boundaries below follow the
 * Society for Vascular Surgery thresholds; an institution following a different
 * revision replaces this object and nothing else.
 *
 * The published ankle-pressure bands overlap at their edges (100 appears in
 * both grade 0 and grade 1; 70 in both 1 and 2; 50 in both 2 and 3). The rule
 * applied here is stated rather than left to the order of comparisons: a value
 * sitting exactly on a boundary takes the LESS severe grade, matching how the
 * bands are usually read, and the boundary case is noted in the reason.
 */
export interface IschaemiaThresholds {
  abi: { grade0From: number; grade1From: number; grade2From: number };
  anklePressure: { grade0Above: number; grade1From: number; grade2From: number };
  toeOrTcpo2: { grade0From: number; grade1From: number; grade2From: number };
  source: string;
}

export const DEFAULT_ISCHAEMIA_THRESHOLDS: IschaemiaThresholds = {
  abi: { grade0From: 0.80, grade1From: 0.60, grade2From: 0.40 },
  anklePressure: { grade0Above: 100, grade1From: 70, grade2From: 50 },
  toeOrTcpo2: { grade0From: 60, grade1From: 40, grade2From: 30 },
  source: 'SVS WIfI ischaemia grading',
};

/**
 * The overall SVS stage table, deliberately left unpopulated.
 *
 * WIfI's clinical stage comes from a published 4x4x4 grid mapping every
 * combination of wound, ischaemia and infection grade onto a stage — and there
 * are separate grids for estimated amputation risk and for likely benefit from
 * revascularisation. I will not reproduce sixty-four cells of a validated table
 * from memory: a stage table with a handful of wrong cells produces numbers
 * that look right, compare cleanly between visits, and misstage the limbs that
 * fall in the wrong cells.
 *
 * The three component grades below are computed from published thresholds and
 * are the useful part. Until an administrator enters the stage grid from the
 * source publication, `svsStage` stays null and the transparent limb-threat
 * signal is used instead.
 *
 * Shape when populated: STAGE[wound][ischaemia][infection] = 1..4.
 */
export const WIFI_STAGE_TABLE: number[][][] | null = null;

export const WIFI_STAGE_NOTE =
  'The overall SVS WIfI stage is not calculated: its published grid has not been entered for this '
  + 'installation. The three component grades above are computed from published thresholds and are '
  + 'shown with the measurement that decided each. The limb-threat signal is this module’s own '
  + 'transparent rule, not the SVS stage.';

// ── Wound grade ─────────────────────────────────────────────────────────────

/**
 * W: the extent of tissue loss.
 *
 * Driven by depth and gangrene rather than by area alone — a 1 cm ulcer over
 * exposed calcaneus is a graver wound than a 6 cm superficial one, and grading
 * on size would invert them.
 */
export function gradeWound(w: VascularWoundSnapshot | undefined): GradedComponent {
  if (!w) {
    return { grade: null, reason: 'No wound assessment recorded.', missing: ['Wound assessment'] };
  }

  if (!w.present) {
    return {
      grade: 0,
      reason: 'No ulcer and no gangrene recorded.',
      decidedBy: 'Wound assessment',
    };
  }

  const exposed = w.exposedStructure ?? [];
  const deepStructure = exposed.filter(s => s === 'bone' || s === 'joint' || s === 'tendon');
  const gangrene = w.gangrene ?? 'none';
  const missing: string[] = [];
  if (w.areaCm2 == null) missing.push('Wound area');
  if (w.gangrene == null) missing.push('Gangrene extent');

  // Grade 3: extensive tissue loss, full-thickness heel involvement, or
  // gangrene beyond the toes.
  if (gangrene === 'extensive' || gangrene === 'midfoot' || gangrene === 'forefoot'
      || gangrene === 'heel') {
    return {
      grade: 3,
      reason: `Gangrene recorded as ${gangrene.replace(/_/g, ' ')}, which extends beyond the toes.`,
      decidedBy: 'Gangrene extent',
      missing: missing.length ? missing : undefined,
    };
  }
  if (w.heelInvolved && exposed.includes('bone')) {
    return {
      grade: 3,
      reason: 'Heel ulcer with exposed bone — extensive tissue loss.',
      decidedBy: 'Heel involvement with exposed bone',
      missing: missing.length ? missing : undefined,
    };
  }

  // Grade 2: deeper ulcer exposing bone, joint or tendon, or gangrene confined
  // to the toes.
  if (deepStructure.length > 0) {
    return {
      grade: 2,
      reason: `Deeper ulcer with exposed ${deepStructure.join(', ')}.`,
      decidedBy: 'Exposed deep structure',
      missing: missing.length ? missing : undefined,
    };
  }
  if (gangrene === 'dry_toe' || gangrene === 'wet_toe') {
    return {
      grade: 2,
      reason: 'Gangrene limited to the toes.',
      decidedBy: 'Gangrene extent',
      missing: missing.length ? missing : undefined,
    };
  }

  // Grade 1: small, shallow ulcer without exposed deep structure.
  return {
    grade: 1,
    reason: w.areaCm2 != null
      ? `Shallow ulcer of ${w.areaCm2} cm² with no exposed bone, joint or tendon and no gangrene.`
      : 'Ulcer present with no exposed bone, joint or tendon and no gangrene.',
    decidedBy: 'Wound depth and gangrene extent',
    missing: missing.length ? missing : undefined,
  };
}

// ── Ischaemia grade ─────────────────────────────────────────────────────────

interface Candidate {
  grade: WifiGrade;
  label: string;
  detail: string;
  /** Lower runs first: foot-level perfusion outranks the ankle index. */
  priority: number;
  onBoundary?: boolean;
}

const gradeFromBands = (
  value: number,
  g0: number, g1: number, g2: number,
): { grade: WifiGrade; onBoundary: boolean } => {
  // Boundary values take the less severe grade; see the note on the thresholds.
  if (value >= g0) return { grade: 0, onBoundary: value === g0 };
  if (value >= g1) return { grade: 1, onBoundary: value === g1 };
  if (value >= g2) return { grade: 2, onBoundary: value === g2 };
  return { grade: 3, onBoundary: false };
};

/**
 * I: how ischaemic the limb is.
 *
 * Foot-level perfusion decides when it is available. That is the substantive
 * choice in this function: toe pressure and TcPO2 measure perfusion where the
 * wound is, while the ankle index measures it proximal to the disease that most
 * often matters in diabetes and renal failure.
 */
export function gradeIschaemia(
  perfusion: LimbPerfusion | undefined,
  thresholds: IschaemiaThresholds = DEFAULT_ISCHAEMIA_THRESHOLDS,
): GradedComponent {
  const candidates: Candidate[] = [];
  const notUsed: string[] = [];
  const missing: string[] = [];

  const pressures = perfusion?.pressures;
  const local = perfusion?.local ?? [];

  // ── TcPO2 / skin perfusion pressure ──────────────────────────────────────
  const tcpo2 = local.find(l => l.kind === 'tcpo2');
  const spp = local.find(l => l.kind === 'spp');
  for (const [record, name] of [[tcpo2, 'TcPO2'], [spp, 'Skin perfusion pressure']] as const) {
    if (!record) continue;
    const t = thresholds.toeOrTcpo2;
    const { grade, onBoundary } = gradeFromBands(record.value, t.grade0From, t.grade1From, t.grade2From);
    candidates.push({
      grade,
      label: `${name} ${record.value} mmHg`,
      detail: `${name} of ${record.value} mmHg at ${record.site}`,
      priority: 0,
      onBoundary,
    });
  }

  // ── Toe pressure ─────────────────────────────────────────────────────────
  if (pressures?.toeMmHg != null) {
    const t = thresholds.toeOrTcpo2;
    const { grade, onBoundary } = gradeFromBands(
      pressures.toeMmHg, t.grade0From, t.grade1From, t.grade2From,
    );
    candidates.push({
      grade,
      label: `Toe pressure ${pressures.toeMmHg} mmHg`,
      detail: `Toe pressure of ${pressures.toeMmHg} mmHg`,
      priority: 1,
      onBoundary,
    });
  } else {
    missing.push('Toe pressure');
  }

  // ── Ankle pressure ───────────────────────────────────────────────────────
  if (pressures?.ankleMmHg != null) {
    const a = thresholds.anklePressure;
    const value = pressures.ankleMmHg;
    let grade: WifiGrade;
    let onBoundary = false;
    if (value > a.grade0Above) grade = 0;
    else if (value >= a.grade1From) { grade = 1; onBoundary = value === a.grade1From || value === a.grade0Above; }
    else if (value >= a.grade2From) { grade = 2; onBoundary = value === a.grade2From; }
    else grade = 3;

    candidates.push({
      grade,
      label: `Ankle pressure ${value} mmHg`,
      detail: `Ankle pressure of ${value} mmHg`,
      // Ranked below the index deliberately. Both are measured at the ankle, so
      // "closer to the tissue" cannot separate them — but the absolute pressure
      // ignores the systemic pressure driving it. In a hypertensive patient an
      // ankle of 110 over a brachial of 200 is an index of 0.55, which is
      // significant disease, while the absolute figure alone would grade 0.
      priority: 3,
      onBoundary,
    });
  }

  // ── Ankle-brachial index ─────────────────────────────────────────────────
  if (pressures) {
    const abi = calculateAbi(pressures);
    if (abi.value !== null) {
      if (abi.category === 'noncompressible') {
        // The load-bearing refusal. A noncompressible index is not evidence of
        // perfusion, and must not be allowed to produce a grade 0.
        notUsed.push(
          `Ankle-brachial index of ${abi.value} is noncompressible (above 1.40) and cannot be used `
          + 'to grade ischaemia — it reflects vessel calcification, not perfusion.',
        );
        if (pressures.toeMmHg == null && !tcpo2 && !spp) {
          missing.push('Toe pressure or TcPO2 — required because the ankle index is uninterpretable');
        }
      } else {
        const b = thresholds.abi;
        const { grade, onBoundary } = gradeFromBands(
          abi.value, b.grade0From, b.grade1From, b.grade2From,
        );
        candidates.push({
          grade,
          label: `ABI ${abi.value}`,
          detail: `Ankle-brachial index of ${abi.value}`,
          priority: 2,
          onBoundary,
        });
      }
    }

    // TBI is recorded and shown, but the published ischaemia table grades on
    // toe *pressure*, not on the index, so it is not used as a grading input.
    const tbi = calculateTbi(pressures);
    if (tbi.value !== null) {
      notUsed.push(
        `Toe-brachial index of ${tbi.value} is recorded; the WIfI ischaemia table grades on absolute `
        + 'toe pressure rather than the index, so the pressure was used.',
      );
    }
  }

  if (candidates.length === 0) {
    return {
      grade: null,
      reason: 'No usable perfusion measurement, so ischaemia cannot be graded.',
      notUsed: notUsed.length ? notUsed : undefined,
      missing: missing.length
        ? missing
        : ['Toe pressure, ankle pressure, TcPO2 or a usable ankle-brachial index'],
    };
  }

  // Foot-level perfusion wins; among equals, the more severe grade is taken so
  // a limb is not understaged by an optimistic second measurement.
  candidates.sort((a, b) => a.priority - b.priority || b.grade - a.grade);
  const decided = candidates[0];

  for (const c of candidates.slice(1)) {
    if (c.grade !== decided.grade) {
      const why = c.priority > 2 && decided.priority <= 1
        ? 'perfusion measured closer to the tissue takes precedence'
        : c.label.startsWith('Ankle pressure')
          ? 'the index accounts for the systemic pressure driving it, and the absolute ankle '
            + 'pressure does not'
          : 'it is the more direct measure of perfusion at the tissue';
      notUsed.push(
        `${c.label} alone would grade ${c.grade}; ${decided.label} was used because ${why}.`,
      );
    }
  }

  const boundaryNote = decided.onBoundary
    ? ' This value sits exactly on a band boundary and was taken as the less severe grade.'
    : '';

  return {
    grade: decided.grade,
    reason: `${decided.detail}.${boundaryNote}`,
    decidedBy: decided.label,
    notUsed: notUsed.length ? notUsed : undefined,
    missing: missing.length ? missing : undefined,
  };
}

// ── Foot infection grade ────────────────────────────────────────────────────

/**
 * fI: infection severity, assessed independently of ischaemia.
 *
 * Deliberately not inferred from wound appearance. An ischaemic foot can look
 * dreadful and be uninfected, and an infected one can look unremarkable until
 * it is opened — so this grades only what was actually assessed, and returns
 * null when nobody assessed it.
 */
export function gradeFootInfection(f: FootInfectionAssessment | undefined): GradedComponent {
  if (!f || f.severity == null) {
    return {
      grade: null,
      reason: 'Infection has not been assessed.',
      missing: ['Foot infection assessment'],
    };
  }

  switch (f.severity) {
    case 'none':
      return { grade: 0, reason: 'No symptoms or signs of infection recorded.', decidedBy: 'Infection assessment' };
    case 'mild_local':
      return {
        grade: 1,
        reason: f.erythemaRimCm != null
          ? `Local infection of skin and subcutaneous tissue, erythema rim ${f.erythemaRimCm} cm.`
          : 'Local infection of skin and subcutaneous tissue only.',
        decidedBy: 'Infection assessment',
      };
    case 'moderate_deeper':
      return {
        grade: 2,
        reason: f.deeperStructuresInvolved
          ? 'Infection involving structures deeper than skin and subcutaneous tissue.'
          : 'Local infection with extensive erythema.',
        decidedBy: 'Infection assessment',
      };
    case 'severe_systemic':
      return {
        grade: 3,
        reason: 'Local infection with systemic inflammatory response.',
        decidedBy: 'Infection assessment',
      };
  }
}

// ── Putting it together ─────────────────────────────────────────────────────

/**
 * A transparent limb-threat signal.
 *
 * NOT the SVS stage, and labelled as such wherever it appears. The rule is
 * declared here in full so it can be read and disagreed with: the signal rises
 * with the worst component and is escalated when several are high, because a
 * limb with severe ischaemia AND deep tissue loss AND infection is in more
 * trouble than the arithmetic of any single grade suggests.
 */
function limbThreatFrom(
  w: GradedComponent, i: GradedComponent, f: GradedComponent,
): { level: WifiResult['limbThreat']; basis: string[] } {
  const grades = [w.grade, i.grade, f.grade];
  if (grades.some(g => g === null)) {
    const absent = [
      w.grade === null ? 'wound' : null,
      i.grade === null ? 'ischaemia' : null,
      f.grade === null ? 'infection' : null,
    ].filter(Boolean);
    return {
      level: 'insufficient_data',
      basis: [`Not all components are graded — ${absent.join(', ')} outstanding.`],
    };
  }

  const [wg, ig, fg] = grades as WifiGrade[];
  const worst = Math.max(wg, ig, fg);
  const highCount = [wg, ig, fg].filter(g => g >= 2).length;
  const basis: string[] = [
    `Wound ${wg}, ischaemia ${ig}, infection ${fg}.`,
  ];

  let level: WifiResult['limbThreat'];
  if (worst === 0) {
    level = 'low';
    basis.push('No component is graded above 0.');
  } else if (worst === 1 && highCount === 0) {
    level = 'low';
    basis.push('No component reaches grade 2.');
  } else if (highCount >= 2 || worst === 3) {
    level = highCount >= 2 && worst === 3 ? 'very_high' : 'high';
    basis.push(
      worst === 3
        ? `A component is at grade 3 (${wg === 3 ? 'wound' : ig === 3 ? 'ischaemia' : 'infection'}).`
        : `${highCount} components are at grade 2 or above.`,
    );
    if (highCount >= 2 && worst === 3) {
      basis.push('Severity is compounded across more than one component.');
    }
  } else {
    level = 'moderate';
    basis.push('One component reaches grade 2.');
  }

  if (ig >= 2 && wg >= 1) {
    basis.push('Tissue loss in the presence of significant ischaemia — healing without improved perfusion is less likely.');
  }

  return { level, basis };
}

export interface WifiInput {
  wound?: VascularWoundSnapshot;
  perfusion?: LimbPerfusion;
  infection?: FootInfectionAssessment;
  thresholds?: IschaemiaThresholds;
}

export function computeWifi(input: WifiInput): WifiResult {
  const wound = gradeWound(input.wound);
  const ischaemia = gradeIschaemia(input.perfusion, input.thresholds);
  const footInfection = gradeFootInfection(input.infection);

  const complete = wound.grade !== null && ischaemia.grade !== null && footInfection.grade !== null;
  const { level, basis } = limbThreatFrom(wound, ischaemia, footInfection);

  // Populated only if an institution has entered the published grid.
  let svsStage: number | null = null;
  if (complete && WIFI_STAGE_TABLE) {
    svsStage = WIFI_STAGE_TABLE[wound.grade as number]?.[ischaemia.grade as number]
      ?.[footInfection.grade as number] ?? null;
  }

  return {
    wound, ischaemia, footInfection,
    complete,
    svsStage,
    svsStageNote: WIFI_STAGE_NOTE,
    limbThreat: level,
    limbThreatBasis: basis,
  };
}

/** How the three grades read as one line, e.g. "W2 I3 fI1". */
export function wifiShorthand(r: WifiResult): string {
  const part = (g: WifiGrade | null, prefix: string) => (g === null ? `${prefix}?` : `${prefix}${g}`);
  return `${part(r.wound.grade, 'W')} ${part(r.ischaemia.grade, 'I')} ${part(r.footInfection.grade, 'fI')}`;
}
