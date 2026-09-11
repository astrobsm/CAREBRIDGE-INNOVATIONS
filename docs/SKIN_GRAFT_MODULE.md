# Photographic Skin Graft Monitoring — architecture and integration

## What this module is

Standardised photographs are the measurement instrument. The clinician's loop is
**capture → review → confirm → act**, not measure → calculate → enter → interpret.
Manual measurement exists only as adjudication when automated analysis is
unreliable, and the data model records it as such.

## What already exists, and is reused rather than rebuilt

This application already performs most of the imaging pipeline for the
WoundProgress Monitor. The graft module is a consumer of that work, not a second
implementation of it.

| Capability | Existing implementation |
|---|---|
| Calibration from a printed green marker, px/cm + confidence | `services/woundMeasurementEngine` — `detectCalibrationMarker`, `inferGreenReferenceCm`, `CALIBRATION_MARKER` |
| Wound segmentation (TF.js) | `segmentWoundAI` |
| Contour, area, perimeter, major/minor axis in cm | `computeCalibratedMeasurement` |
| Tissue composition: granulation / slough / necrotic / **epithelial** | `analyzeTissueComposition` |
| Full capture-to-measurement pipeline | `domains/wounds/services/aiWoundMeasurement` — `measureWound` |
| Serial identity, timeline, healing velocity, projected closure | `domains/wounds/services/woundAnalytics`, `woundMonitorService` |
| Overlay rendering, stored frame with traced margin + provenance | `WoundProgressMonitorPage` — `renderReferencePhoto` |
| Optional qualitative vision layer (server-side key) | `services/aiProxy` — `proxyVisionJson` |
| Patients, auth, roles, offline Dexie + Supabase sync, audit, PDF | existing app |

`analyzeTissueComposition` already returns an **epithelial percentage**. Donor-site
re-epithelialization is therefore derived from an existing measurement channel
rather than a new model.

## What is new

- **Episode model** binding one operation's recipient site(s) and donor site(s).
- **Preserved baseline graft area** as the denominator for graft take, so a later
  photograph cannot silently redefine what 100% meant.
- **Image quality gate** — focus, exposure, obstruction, calibration, framing —
  deciding `ACCEPT | REVIEW | RECAPTURE` before any quantitative analysis runs.
- **Graft planning calculator** — defect area, coverage margin, mesh expansion.
- **Healing prediction service** over the photographic trajectory.
- **Analysis provenance** — model/algorithm version on every result.
- **Clinician review** — accept / correct / reject, preserving the original.

## Superseded

`SkinGraftRecord` and `GraftAssessment` (`types/index.ts`) exist, sync, and are
referenced by no UI. They are built around a manually entered `takePercentage`,
which is what this module exists to replace. They remain readable for migration;
new work uses the episode model.

## Pipeline

```
photograph
  → ImageQualityService      gate: ACCEPT | REVIEW | RECAPTURE
  → CalibrationService       existing green-marker detection
  → SegmentationService      existing TF.js segmentation
  → MeasurementService       existing area/perimeter in cm
  → Recipient: GraftViability      colour/tissue derived, labelled estimate
    Donor:     Epithelialization   epithelial channel of tissue composition
  → LongitudinalService      compare against preserved baseline
  → PredictionService        transparent trajectory model
  → AlertService
  → ClinicalReview
```

Each stage is a separate module behind an interface so it can be replaced —
in particular, the viability and epithelialization estimators are expected to be
replaced by trained models.

## Honest statement of AI capability

There is **no trained, validated model** for graft viability or epithelialization
in this repository, and none is fabricated here.

- Segmentation uses the existing TF.js pipeline.
- Viability and epithelialization are derived from **colour and tissue analysis** —
  a transparent, inspectable heuristic.
- These are labelled *AI-estimated* in the UI and stored with
  `modelVersion: 'heuristic-*'` so any result produced by the prototype estimator
  is identifiable later and can be excluded from analysis.
- No accuracy figure is displayed, because none has been established.
- Confidence is reported as a **qualitative band** (high / moderate / low /
  uncertain), not a fabricated percentage, since the underlying estimator is not
  probability-calibrated (spec §35).

The module is clinical decision support. It does not diagnose, and every
quantitative result is presented for clinician review.

## Storage

Rides the existing offline-first Dexie + Supabase sync. Photographs are stored
downscaled with their calibration and segmentation provenance, as the wound
monitor already does. Original captures are never overwritten; a corrected
assessment is a new record referencing the original.

---

## Model search — findings (September 2026)

The question asked was whether a trained viability or epithelialization model
could be installed here rather than relying on a heuristic. It was searched
properly. The answer is no, and the reasoning is recorded so it is not
re-litigated from memory.

### There is no trained model for what this module measures

No publicly available, licensed, trained model exists for **skin-graft take** or
**donor-site re-epithelialization from clinical photographs**. The published
deep-learning work on epithelialization measures it on optical coherence
tomography B-scans — a different imaging modality that says nothing about a ward
photograph.

### Trained wound *segmentation* models do exist

| Model | Licence | Verdict |
|---|---|---|
| [FUSegNet](https://github.com/mrinal054/FUSegNet) | MIT | Strongest available: Dice 0.927 on chronic wounds, weights published. Segments wound from background — it does **not** classify tissue, so it cannot supply viability. Trained on diabetic foot ulcers, not grafts. EfficientNet-B7 encoder is far too heavy for this PWA. |
| [uwm-bigdata/wound-segmentation](https://github.com/uwm-bigdata/wound-segmentation) | **None stated** | Keras, so TensorFlow.js conversion would be easy. Unusable: a repository with no licence reserves all rights. |
| Hugging Face `wound-*` models | Mixed / mostly unstated | Whole-image classifiers, not segmentation. Undocumented training data, no published validation. |
| [Wound tissue segmentation benchmark](https://arxiv.org/abs/2502.10652) | Research | 147 images; necrosis Dice ≈ 0.50. Not adequate to derive a viability percentage from. |

### What was done instead

Installing a foot-ulcer segmentation model and presenting its output as graft
viability would be off-label use dressed in clinical language — the failure mode
the specification explicitly prohibits. So:

1. **`TissueProvider` abstraction** — the seam a real model drops into. Register
   one with a higher priority and it takes precedence; if its weights fail to
   load, analysis falls back to the heuristic rather than failing.
2. **`describeOnnxIntegration()`** — the requirements a candidate must meet, and
   why each model above was or was not used, kept in code and under test.
3. **The heuristic was hardened**, since it is what actually runs:
   - classification moved from raw RGB thresholds to HSV, because hue is stable
     across daylight, fluorescent light and flash where the red channel is not;
   - the calibration marker is excluded from tissue classification;
   - deep shadow is no longer read as necrosis;
   - **ambiguous pixels are reported as unclassified rather than defaulted to
     granulation.** The previous implementation counted them as granulation,
     which counts as viable, inflating graft take — a failing graft reading
     healthier than it is. Unclassified area now lowers confidence instead of
     biasing the number.

### What installing a real model would take

Institutional data: grafted and donor sites, photographed to the standardised
protocol, labelled per-pixel by clinicians, across the skin tones of the
patients it will be used on. The learning loop in §56 and the paired
AI-result/clinician-review records exist to accumulate exactly that dataset.
