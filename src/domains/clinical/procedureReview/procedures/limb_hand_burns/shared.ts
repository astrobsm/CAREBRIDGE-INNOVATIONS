/**
 * Fields, scores and rules shared by the limb, hand and burns modules.
 *
 * Several of these procedures need the same measurement — the diabetic foot
 * and the amputation both grade limb perfusion; every traumatic wound needs
 * its tetanus status. Each is written ONCE here as a factory that namespaces
 * it to the calling module (`${moduleId}.<field>`), so the question is the
 * same everywhere and no module re-words it.
 *
 * The ankle- and toe-brachial indices are computed by the vascular domain's
 * calculateAbi / calculateTbi (perfusion.ts) — the higher brachial pressure as
 * the denominator, the >1.40 non-compressible refusal and the calcification
 * caveat all come from there.
 */
import type { EncounterAnswers, EncounterField } from '../../../data/encounterModel';
import { TETANUS_FIELD } from '../../../data/encounterModel';
import { calculateAbi, calculateTbi } from '../../../../vascular/services/perfusion';
import type { PressureSet } from '../../../../vascular/types';
import type { ComputedScore, PlanRule, ScoreRule } from '../../types';
import { isOneOf, numOf } from '../../core/answers';
import { L } from '../../ruleKit';

type Ns = (id: string) => string;

// ── Tetanus ─────────────────────────────────────────────────────────────────

/** The encounter model's tetanus question, namespaced to the module. */
export const tetanusField = (f: Ns, showWhen?: EncounterField['showWhen']): EncounterField =>
  ({ ...TETANUS_FIELD, id: f('tetanus'), ...(showWhen ? { showWhen } : {}) });

/** Tetanus prophylaxis when the status is due or unknown. */
export const tetanusRule = (f: Ns): PlanRule => ctx => {
  if (!isOneOf(ctx.answers, f('tetanus'), 'due', 'unknown')) return null;
  return { problem: { treatment: [L(
    'Tetanus prophylaxis now: tetanus-diphtheria toxoid, plus human tetanus immunoglobulin for a tetanus-prone wound (burn, crush, devitalised or soil-contaminated tissue) when immunisation is incomplete or unknown',
    `Tetanus status ${String(ctx.answers[f('tetanus')])} (WHO tetanus position paper 2017; national immunisation schedule)`, 'urgent')] } };
};

// ── Limb perfusion (IWGDF / ESVS / SVS 2023 PAD guideline) ──────────────────

/**
 * Bedside and Doppler perfusion of the affected leg, for the indices and the
 * WIfI ischaemia grade. Thresholds are the IWGDF 2023 PAD guideline's.
 */
export function perfusionFields(f: Ns): EncounterField[] {
  return [
    {
      id: f('pedal_pulses'), label: 'Foot pulses (dorsalis pedis and posterior tibial), affected side', kind: 'select', important: true,
      options: [
        { value: 'both', label: 'Both palpable' },
        { value: 'one', label: 'One palpable', flag: 'amber', flagReason: 'A missing foot pulse: PAD is possible — Doppler waveforms, ABI and toe pressure / TBI (IWGDF 2023 PAD).' },
        { value: 'none', label: 'Neither palpable', flag: 'amber', flagReason: 'Impalpable foot pulses: PAD likely — Doppler waveforms, ABI and toe pressure / TBI (IWGDF 2023 PAD).' },
        { value: 'oedema', label: 'Not assessable (oedema)' },
      ],
    },
    {
      id: f('waveform'), label: 'Pedal Doppler waveform', kind: 'select',
      options: [
        { value: 'triphasic', label: 'Triphasic' },
        { value: 'biphasic', label: 'Biphasic' },
        { value: 'monophasic', label: 'Monophasic', flag: 'amber', flagReason: 'Monophasic pedal waveform: significant PAD likely (IWGDF 2023 PAD).' },
        { value: 'absent', label: 'Absent signal', flag: 'red', flagReason: 'No pedal Doppler signal: severe ischaemia — urgent vascular assessment.' },
        { value: 'not_done', label: 'Not done (no Doppler)' },
      ],
    },
    { id: f('brachial_r'), label: 'Right brachial systolic pressure', kind: 'number', unit: 'mmHg', min: 40, max: 300,
      help: 'Both arms: the ABI uses the HIGHER brachial pressure.' },
    { id: f('brachial_l'), label: 'Left brachial systolic pressure', kind: 'number', unit: 'mmHg', min: 40, max: 300 },
    {
      id: f('ankle_pressure'), label: 'Ankle systolic pressure (highest pedal artery), affected side', kind: 'number', unit: 'mmHg', min: 0, max: 350,
      numericFlags: [{ op: '<', value: 50, level: 'red', reason: 'Ankle pressure below 50 mmHg: urgent vascular imaging and consider revascularisation (IWGDF 2023 PAD).' }],
    },
    {
      id: f('toe_pressure'), label: 'Toe systolic pressure (hallux)', kind: 'number', unit: 'mmHg', min: 0, max: 250,
      help: 'Usable when the ankle is calcified (ABI above 1.40).',
      numericFlags: [{ op: '<', value: 30, level: 'red', reason: 'Toe pressure below 30 mmHg: urgent vascular imaging and revascularisation should be considered (IWGDF 2023 PAD).' }],
    },
    {
      id: f('tcpo2'), label: 'TcPO2 (if available)', kind: 'number', unit: 'mmHg', min: 0, max: 100,
      numericFlags: [{ op: '<', value: 25, level: 'red', reason: 'TcPO2 below 25 mmHg: urgent vascular imaging and revascularisation should be considered (IWGDF 2023 PAD).' }],
    },
  ];
}

/** The PressureSet the vascular calculators read, from the namespaced answers. */
export function pressuresFrom(a: EncounterAnswers, f: Ns): PressureSet | null {
  const p: PressureSet = {
    rightBrachialMmHg: numOf(a, f('brachial_r')) ?? undefined,
    leftBrachialMmHg: numOf(a, f('brachial_l')) ?? undefined,
    ankleMmHg: numOf(a, f('ankle_pressure')) ?? undefined,
    toeMmHg: numOf(a, f('toe_pressure')) ?? undefined,
  };
  return Object.values(p).some(v => v != null) ? p : null;
}

/** Medial calcification is likelier in diabetes and advanced kidney disease. */
export const calcificationRisk = (a: EncounterAnswers) =>
  isOneOf(a, 'core.diabetes', 'diet', 'oral', 'insulin') || isOneOf(a, 'core.renal', 'ckd_4_5', 'dialysis');

const ABI_SOURCE = 'vascular/perfusion.calculateAbi (2024 AHA/ACC bands; higher brachial pressure as denominator; >1.40 non-compressible)';
const TBI_SOURCE = 'vascular/perfusion.calculateTbi (abnormal at or below 0.70)';

/** ABI, computed by the vascular domain, with its limitations and prompts. */
export const abiScore = (moduleId: string, f: Ns, cltiSuspected: (a: EncounterAnswers) => boolean): ScoreRule => ({ answers }) => {
  const p = pressuresFrom(answers, f);
  if (!p || p.ankleMmHg == null) return null;
  const r = calculateAbi(p, { calcificationRisk: calcificationRisk(answers), cltiSuspected: cltiSuspected(answers) });
  const incomplete = r.value == null ? ['Brachial pressure (both arms)'] : [];
  const level = r.category == null ? null
    : r.category === 'noncompressible' ? 'moderate'
      : r.category === 'abnormal' ? ((r.value ?? 1) < 0.5 ? 'very_high' : 'high')
        : r.category === 'borderline' ? 'low' : 'none';
  const out: ComputedScore = {
    id: `${moduleId}.abi`, name: 'Ankle-brachial index', abbreviation: 'ABI', total: r.value, max: 1.4,
    lowerIsWorse: true,
    band: level ? { label: r.category === 'noncompressible' ? 'Non-compressible — not interpretable' : r.category!, level, interpretation: r.interpretation } : null,
    incomplete, source: ABI_SOURCE,
    detail: [...r.limitations, ...r.prompts],
  };
  if (r.category === 'noncompressible') {
    out.flag = { level: 'amber', reason: 'ABI above 1.40 (non-compressible): medial calcification — the index cannot exclude PAD; use toe pressure / TBI (IWGDF 2023 PAD).' };
  } else if (r.value != null && r.value < 0.5) {
    out.flag = { level: 'red', reason: `ABI ${r.value} (below 0.5): severe ischaemia — urgent vascular imaging and revascularisation assessment (IWGDF 2023 PAD).` };
  } else if (r.category === 'abnormal') {
    out.flag = { level: 'amber', reason: `ABI ${r.value} (0.90 or below): PAD — vascular assessment before relying on healing (IWGDF 2023 PAD).` };
  }
  return out;
};

/** TBI, computed by the vascular domain. */
export const tbiScore = (moduleId: string, f: Ns): ScoreRule => ({ answers }) => {
  const p = pressuresFrom(answers, f);
  if (!p || p.toeMmHg == null) return null;
  const r = calculateTbi(p);
  return {
    id: `${moduleId}.tbi`, name: 'Toe-brachial index', abbreviation: 'TBI', total: r.value, max: 1.0, lowerIsWorse: true,
    band: r.category ? {
      label: r.category === 'abnormal' ? 'abnormal' : 'above the abnormal threshold',
      level: r.category === 'abnormal' ? 'high' : 'none',
      interpretation: `${r.interpretation} A TBI of 0.75 or more with triphasic pedal waveforms makes PAD less likely (IWGDF 2023 PAD).`,
    } : null,
    incomplete: r.value == null ? ['Brachial pressure (both arms)'] : [],
    source: TBI_SOURCE,
    detail: r.limitations,
    flag: r.category === 'abnormal' ? { level: 'amber', reason: `TBI ${r.value} (0.70 or below): PAD (2024 AHA/ACC; IWGDF 2023 PAD).` } : undefined,
  };
};

/**
 * Severe ischaemia by the IWGDF 2023 PAD guideline's thresholds (toe pressure
 * under 30 mmHg, TcPO2 under 25 mmHg, ankle pressure under 50 mmHg or ABI
 * under 0.5) or an absent pedal Doppler signal.
 */
export function severeIschaemia(a: EncounterAnswers, f: Ns, abi: number | null | undefined): string | null {
  const toe = numOf(a, f('toe_pressure')), tc = numOf(a, f('tcpo2')), ankle = numOf(a, f('ankle_pressure'));
  if (toe != null && toe < 30) return `Toe pressure ${toe} mmHg`;
  if (tc != null && tc < 25) return `TcPO2 ${tc} mmHg`;
  if (ankle != null && ankle < 50) return `Ankle pressure ${ankle} mmHg`;
  if (abi != null && abi < 0.5) return `ABI ${abi}`;
  if (isOneOf(a, f('waveform'), 'absent')) return 'Absent pedal Doppler signal';
  return null;
}
