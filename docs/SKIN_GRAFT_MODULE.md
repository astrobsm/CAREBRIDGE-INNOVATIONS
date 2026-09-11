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
