/**
 * Recommendations for good wound healing, derived from what was measured.
 *
 * Every recommendation carries the finding that produced it. That is the whole
 * point: generic wound-care advice is worth little at the bedside, and advice
 * whose basis is invisible cannot be argued with. A surgeon who disagrees with
 * "consider debridement" should be able to see that it was raised because 14%
 * of the traced surface was marked necrotic on POD 9, and overrule it on that
 * footing.
 *
 * These are prompts for a clinician, not orders. Nothing here prescribes a
 * drug, a dose or a dressing brand — the module cannot see the wound, the
 * patient's physiology or the ward's formulary, and pretending otherwise would
 * be the dangerous kind of helpful.
 *
 * Pure functions: no DOM, no database, so the clinical logic is directly
 * testable.
 */

import type {
  GraftPhotoAssessment,
  GraftSite,
  HealingPrediction,
  SkinGraftEpisode,
  Trajectory,
} from '../types';

export const GUIDANCE_VERSION = 'healing-guidance-1.0.0';

export type GuidancePriority = 'urgent' | 'important' | 'routine';

export type GuidanceCategory =
  | 'wound_bed'
  | 'infection'
  | 'mechanical'
  | 'dressing'
  | 'systemic'
  | 'monitoring';

export interface HealingRecommendation {
  id: string;
  priority: GuidancePriority;
  category: GuidanceCategory;
  /** The action, in the imperative, short enough to scan. */
  title: string;
  /** What to do and why, in a sentence or two. */
  detail: string;
  /** The measurement or record that raised it. Never empty. */
  basis: string;
}

export interface GuidanceContext {
  episode: SkinGraftEpisode;
  site: GraftSite;
  latest?: GraftPhotoAssessment;
  assessments: GraftPhotoAssessment[];
  trajectory: Trajectory;
  prediction?: HealingPrediction;
  /** Free-text conditions from the patient record, matched case-insensitively. */
  chronicConditions?: string[];
}

const PRIORITY_ORDER: Record<GuidancePriority, number> = {
  urgent: 0,
  important: 1,
  routine: 2,
};

/** Matches a condition list loosely — records are typed by hand and vary. */
const hasCondition = (conditions: string[] | undefined, ...needles: string[]): boolean =>
  (conditions ?? []).some(c => {
    const lower = String(c).toLowerCase();
    return needles.some(n => lower.includes(n));
  });

const pct = (v: number | null | undefined): string =>
  v == null ? 'unknown' : `${Math.round(v * 10) / 10}%`;

/**
 * Recommendations for one site at its current state.
 *
 * Ordered by priority, then by the order the rules fire, which runs roughly
 * from the wound bed outwards — what is on the surface, then what is reaching
 * it, then the patient as a whole.
 */
export function recommendHealingActions(ctx: GuidanceContext): HealingRecommendation[] {
  const { episode, site, latest, assessments, trajectory, prediction } = ctx;
  const out: HealingRecommendation[] = [];
  const push = (r: HealingRecommendation) => out.push(r);

  const isRecipient = site.kind === 'recipient';
  const pod = latest?.postOpDay ?? null;
  const tissue = latest?.tissue;
  const necrotic = tissue?.necroticPct ?? null;
  const slough = tissue?.sloughPct ?? null;
  const measured = assessments.filter(a => a.measurement?.areaCm2 != null);

  // ── Nothing to reason from ────────────────────────────────────────────────
  if (!latest) {
    return [{
      id: 'no-assessment',
      priority: 'important',
      category: 'monitoring',
      title: 'Photograph the site to begin monitoring',
      detail:
        'No assessment has been recorded, so there is nothing to advise on. Photograph the '
        + 'site with the green marker in frame and trace the margin; the first traced '
        + 'photograph sets the baseline everything afterwards is measured against.',
      basis: 'No assessments recorded for this site.',
    }];
  }

  // ── The graft's first week: the mechanical phase ──────────────────────────
  //
  // Before revascularisation the graft is held by fibrin alone. Almost every
  // avoidable early loss is shear, haematoma or seroma — mechanical, not
  // biological — so in this window the advice is about leaving it alone.
  if (isRecipient && pod !== null && pod <= 5) {
    push({
      id: 'early-immobilisation',
      priority: 'important',
      category: 'mechanical',
      title: 'Protect the graft from shear until it has taken',
      detail:
        'The graft is held by fibrin and is revascularising. Keep the part immobilised and '
        + 'elevated, avoid dressing changes that drag across the surface, and handle the '
        + 'limb as a whole rather than the dressing.',
      basis: `Recipient site on POD ${pod} — within the window where loss is usually mechanical.`,
    });
  }

  if (isRecipient && pod !== null && pod <= 7 && (episode.meshRatio ?? 1) > 1) {
    push({
      id: 'mesh-interstices',
      priority: 'routine',
      category: 'dressing',
      title: 'Keep the interstices moist',
      detail:
        'Meshed graft closes by epithelium creeping across the interstices. They must not dry '
        + 'out or crust, or the interstices will granulate and scar instead of epithelialising.',
      basis: `Graft meshed 1:${episode.meshRatio} on an episode now at POD ${pod}.`,
    });
  }

  // ── What is on the surface ────────────────────────────────────────────────
  if (necrotic !== null && necrotic >= 10) {
    push({
      id: 'necrosis-debride',
      priority: necrotic >= 25 ? 'urgent' : 'important',
      category: 'wound_bed',
      title: 'Assess the non-viable area for debridement',
      detail:
        'Necrotic tissue will not revascularise and holds the wound in an inflammatory state. '
        + 'Inspect the marked areas directly and decide between sharp debridement and a '
        + 'debriding dressing. Adherent eschar over a stable graft may be better left until it '
        + 'separates — the photograph cannot tell you which this is.',
      basis: `${pct(necrotic)} of the traced surface marked necrotic${pod !== null ? ` on POD ${pod}` : ''}.`,
    });
  }

  if (slough !== null && slough >= 20) {
    push({
      id: 'slough-bed-prep',
      priority: slough >= 40 ? 'important' : 'routine',
      category: 'wound_bed',
      title: 'Prepare the wound bed',
      detail:
        'Slough sustains bacterial burden and blocks epithelial migration. Cleanse the bed and '
        + 'consider a desloughing dressing at the next change; re-photograph afterwards so the '
        + 'effect is measured rather than assumed.',
      basis: `${pct(slough)} of the traced surface marked slough${pod !== null ? ` on POD ${pod}` : ''}.`,
    });
  }

  // ── Infection ─────────────────────────────────────────────────────────────
  //
  // Raised on the trajectory rather than on any single photograph: a graft that
  // is losing measured area is the finding that should send someone to look at
  // the patient. The module cannot see erythema, smell or systemic upset, and
  // must not imply that it has excluded them.
  if (trajectory === 'deteriorating') {
    push({
      id: 'deteriorating-review',
      priority: 'urgent',
      category: 'infection',
      title: 'Review the patient at the bedside',
      detail:
        isRecipient
          ? 'Measured take is falling across serial photographs. Examine for infection, '
            + 'collection under the graft and shear, and consider a wound swab. Progressive '
            + 'loss after the first week is more often infection or pressure than failed '
            + 'revascularisation.'
          : 'The measured open area is enlarging rather than closing. Examine the donor site '
            + 'for infection or dressing-related injury; a donor site that is getting bigger '
            + 'has usually been converted to a deeper wound.',
      basis: `Serial measurements are deteriorating across ${measured.length} traced assessments.`,
    });
  }

  if (isRecipient && pod !== null && pod >= 7) {
    const take = latest.graft?.takePercent ?? null;
    if (take !== null && take < 70) {
      push({
        id: 'low-take',
        priority: take < 50 ? 'urgent' : 'important',
        category: 'wound_bed',
        title: 'Plan for the area that has not taken',
        detail:
          'By the end of the first week take is largely declared. Decide now between allowing '
          + 'secondary closure, further bed preparation, or regrafting, and record the '
          + 'decision — the residual defect is easier to plan for while the patient is still '
          + 'under active review.',
        basis: `Take measured at ${pct(take)} of the baseline ${site.baselineAreaCm2 ?? '—'} cm² on POD ${pod}.`,
      });
    }
  }

  // ── Trajectory ────────────────────────────────────────────────────────────
  if (trajectory === 'delayed' && measured.length >= 2) {
    push({
      id: 'delayed-healing',
      priority: 'important',
      category: 'systemic',
      title: 'Look for a reason the wound is closing slowly',
      detail:
        'The measured rate is below what this kind of wound should manage. Work through the '
        + 'reversible causes — perfusion, pressure, infection, nutrition, glycaemic control, '
        + 'and whether the dressing regime is drying or macerating the bed.',
      basis: prediction?.ratePerDay != null
        ? `Closing at ${prediction.ratePerDay} percentage points per day across ${measured.length} assessments.`
        : `Slow closure across ${measured.length} traced assessments.`,
    });
  }

  if (prediction?.trajectory === 'delayed' && prediction.predictedClosurePodFrom === null
      && measured.length >= 3) {
    push({
      id: 'stalled',
      priority: 'important',
      category: 'wound_bed',
      title: 'Treat this as a stalled wound',
      detail:
        'No closure date can be projected because the measured rate is effectively flat. A '
        + 'wound that has stopped progressing usually needs the bed changed rather than the '
        + 'same regime continued — reassess the diagnosis before continuing.',
      basis: `No closure projected from ${prediction.basedOnAssessments} assessments; the fitted rate is near zero.`,
    });
  }

  // ── The patient ───────────────────────────────────────────────────────────
  const conditions = ctx.chronicConditions;
  if (hasCondition(conditions, 'diabet')) {
    push({
      id: 'glycaemic-control',
      priority: 'important',
      category: 'systemic',
      title: 'Tighten glycaemic control while the wound is open',
      detail:
        'Hyperglycaemia impairs neutrophil function and collagen synthesis and measurably slows '
        + 'closure. Review the regime with the medical team for as long as the wound is open.',
      basis: 'Diabetes recorded in the patient’s chronic conditions.',
    });
  }

  if (hasCondition(conditions, 'sickle')) {
    push({
      id: 'sickle-care',
      priority: 'important',
      category: 'systemic',
      title: 'Keep the patient warm, hydrated and well oxygenated',
      detail:
        'Sickling is provoked by cold, dehydration, hypoxia and pain, and the microvascular '
        + 'occlusion that follows is exactly what a healing graft cannot tolerate. Attend to '
        + 'analgesia and hydration alongside the dressing.',
      basis: 'Sickle cell disease recorded in the patient’s chronic conditions.',
    });
  }

  if (hasCondition(conditions, 'smok', 'tobacco')) {
    push({
      id: 'smoking',
      priority: 'important',
      category: 'systemic',
      title: 'Address smoking directly',
      detail:
        'Nicotine causes cutaneous vasoconstriction and carbon monoxide displaces oxygen; both '
        + 'act precisely at the level a graft depends on. Abstinence while the wound is open is '
        + 'worth raising explicitly rather than assuming it has been covered.',
      basis: 'Smoking recorded in the patient’s chronic conditions.',
    });
  }

  if (hasCondition(conditions, 'anaem', 'anemia')) {
    push({
      id: 'anaemia',
      priority: 'routine',
      category: 'systemic',
      title: 'Review haemoglobin and oxygen delivery',
      detail:
        'Wound healing is oxygen-dependent at every stage. Correct a treatable anaemia rather '
        + 'than accepting it as background while a large surface is trying to close.',
      basis: 'Anaemia recorded in the patient’s chronic conditions.',
    });
  }

  if (hasCondition(conditions, 'hiv', 'immunosupp', 'steroid', 'chemotherap')) {
    push({
      id: 'immunosuppression',
      priority: 'routine',
      category: 'infection',
      title: 'Hold a lower threshold for infection',
      detail:
        'Immunosuppression blunts the signs this module and a bedside examination both rely on. '
        + 'A wound that merely fails to progress may be the only presentation of infection.',
      basis: 'Immunosuppression recorded in the patient’s chronic conditions.',
    });
  }

  // Nutrition applies to everyone with an open wound; a large surface makes it
  // pressing rather than merely advisable.
  const openArea = isRecipient
    ? latest.graft?.openAreaCm2 ?? null
    : latest.donor?.openAreaCm2 ?? null;
  const bigSurface = openArea != null && openArea >= 100;
  push({
    id: 'nutrition',
    priority: bigSurface ? 'important' : 'routine',
    category: 'systemic',
    title: 'Support healing nutritionally',
    detail:
      'An open wound raises protein and energy requirements substantially. Ensure adequate '
      + 'protein intake and treat deficiency where it is found; vitamin C and zinc are worth '
      + 'correcting when deficient, though supplementing a replete patient adds nothing.',
    basis: bigSurface
      ? `${openArea} cm² still open — a surface large enough to impose a real metabolic demand.`
      : 'An open wound raises metabolic demand for as long as it stays open.',
  });

  // ── Monitoring hygiene ────────────────────────────────────────────────────
  //
  // Poor measurement is a clinical problem, not just a data one: every number
  // above rests on these, and a prediction fitted to badly calibrated
  // photographs is worse than no prediction.
  if (latest.imageQuality && latest.imageQuality.score != null && latest.imageQuality.score < 60) {
    push({
      id: 'image-quality',
      priority: 'routine',
      category: 'monitoring',
      title: 'Improve capture conditions at the next assessment',
      detail:
        'Measurement quality limits everything derived from it. Photograph square to the '
        + 'surface in even light, with the whole marker flat in the plane of the wound.',
      basis: `Last frame scored ${latest.imageQuality.score}% on the quality gate.`,
    });
  }

  if (measured.length === 1) {
    push({
      id: 'need-series',
      priority: 'routine',
      category: 'monitoring',
      title: 'Photograph again to establish a trajectory',
      detail:
        'One measurement is a position, not a direction. A second traced photograph is what '
        + 'makes a rate — and therefore a healing prediction — possible at all.',
      basis: 'Only one traced assessment recorded so far.',
    });
  }

  if (site.baselineAreaCm2 == null) {
    push({
      id: 'no-baseline',
      priority: 'important',
      category: 'monitoring',
      title: 'Set the baseline area',
      detail:
        'No baseline is recorded, so take and healing percentages cannot be computed. The next '
        + 'successfully traced photograph will set it.',
      basis: 'This site has no baseline area.',
    });
  }

  return out.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}
