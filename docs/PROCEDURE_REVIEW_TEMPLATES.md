# Procedure review templates

Structured plastic-surgery reviews — **wound review, pre-operative, post-operative and follow-up** — for each procedure, with a drafted plan that goes through consultant approval, a counselling record and a consent form, all exportable as one PDF.

Code: `src/domains/clinical/procedureReview/`. UI: `src/domains/clinical/components/procedureReview/ProcedureReviewForm.tsx`, page `/patients/:patientId/procedure-review`.

Decision support only. Every plan is a draft for clinician editing and consultant approval.

---

## 1. How it fits together

```
ProcedureModule (data)            core/ (written once)
      │ sections, rules, consent        │ sections per phase
      └──────────────┬──────────────────┘
                     ▼
engine.ts   composeTemplate → computeScores (existing calculators) → reviewFlags
            → completeness (templateEngine) → healingBarriers → compareWithPrior → narrative
                     ▼
planBuilder.ts  CORE_RULES + module.planRules → merged, ordered, de-duplicated ScribePlan
                     ▼
consent.ts  buildSurgicalDocument (extended) + education record + ConsentSpec + RiskModifiers
                     ▼
compute.ts  the whole pipeline, pure — used by the form (live) and the service (on save)
                     ▼
procedureReviewService.ts  ClinicalEncounter.procedureReview (Dexie → Supabase procedure_review)
            clerking lifecycle rules · scribeService.submitPlan → consultant approval
                     ▼
pdf.ts      section model (pure) → branded PDF (pdfUtils, createSafePDF) / WhatsApp
```

What is reused, never re-implemented:

| Need | Where it lives |
|---|---|
| Field model, visibility, flags, completeness, prose | `data/encounterModel.ts`, `services/templateEngine.ts` |
| Field renderer, flag banner | `components/EncounterFieldInput.tsx`, `components/FlagBanner.tsx` |
| Caprini, Braden, MUST | `clinician-assistant/services/riskCalculators.ts` |
| ASA, airway, RCRI, METs, STOP-BANG, bleeding risk, anticoagulant timings, fasting | `services/preoperativeService.ts` |
| BMI | `calculators/engine/calculationEngine.ts` |
| NEWS2, LRINEC | `soft-tissue-infection/services/scoringService.ts` |
| WIfI / SINBAD / Wagner | `vascular/services/wifiEngine.ts`, `services/limbSalvageService.ts` |
| Graft take | `skin-graft/services/graftAnalysis.estimateGraftTake` |
| Scored-instrument model | `scar/data/scales.ts` (`ScaleItem`, `scoreScale`) |
| TIME, SSKIN, dressing guide, PI stages, Braden descriptors | `pressure-sore/data/clinicalProtocol.ts` |
| Consent document, declaration, signature blocks | `surgery/utils/surgicalDocumentGenerator.ts` |
| Procedure education (complications with %) | `data/patientEducation.ts` |
| Procedure catalogue | `data/surgicalFees.ts` (`surgicalProcedures`) |
| Plan view, approval, TreatmentPlan, implementation log | `clinical/scribe/*` |
| Sign / submit / entered-in-error rules | `clinical/clerking/lifecycle.ts` (`assertCan*Record`) |
| Encounter types (labels, colours) | `clinical/data/encounterTypes.ts` (`ENCOUNTER_TYPES`) |

---

## 2. The contract (`types.ts`)

Read the JSDoc in `types.ts`; this is the summary.

- **`ReviewPhase`** = `'wound_review' | 'pre_op' | 'post_op' | 'follow_up'` → encounter types `wound_review`, `pre_operative`, `post_operative`, `follow_up` (`phases.ts`).
- **`ProcedureModule`**
  - `id` (snake_case, unique) — prefix of every field id: `${id}.<field>`.
  - `name`, `summary`, `group` (`wound | reconstruction | oncology | hand | diabetic_foot | pressure | burns | aesthetic | other`), `phases`, `basis` (guideline citations), `problemLabel`.
  - `catalog`: `feeIds` (must exist in `surgicalProcedures`), `educationId` (`procedureId` in `procedureEducationDatabase`, or `null` **with** `educationNote`), `patientEducationIds` (EducationCondition ids).
  - `sections: Partial<Record<ReviewPhase, EncounterSection[]>>` — **procedure-specific questions only**; the engine adds the core.
  - `coreOnlyPhases` — phases with no module sections on purpose.
  - `includeCore` / `excludeCore` — adjust the core sections per phase. The `tetanus` core section (immunisation status + wound risk, Green Book ch. 30 plan) is opt-in only: trauma, burn and open-wound modules add it here instead of asking their own tetanus question.
  - `coreShowWhen` — condition a core field on one of the module's answers, e.g. `{ 'core.tetanus': { field: '<id>.indication', equals: ['trauma'] } }`.
  - `paediatric` — the patients are children (cleft): an unknown age is treated as a child, not an adult.
  - `carryForward` — field ids pre-filled from the newest earlier review of this module.
  - `scores: ScoreRule[]` — module scores; call existing calculators.
  - `planRules: PlanRule[]`, `consent?: ConsentSpec`, `followUp` (per-phase visits), `handoffs` (routes to owning modules).
- **`PlanRule`** = `(ctx: PlanContext) => PlanContribution | null`, pure. `PlanContext` = module, phase, answers, scores (by id), flags, patient (age in years and, from the date of birth, `ageMonths`; sex, comorbidities, meds, allergies, BMI), prior reviews (newest first).
- **Age gating (`core/age.ts`)**: core fields outside their validated age are left out of the composed review (not shown, scored or counted for completeness) — PHQ-2/9 under 13, GAD-2/7 under 12, MUST steps under 18 (replaced by `core.paed_growth`), Caprini under 16, CFS under 65; under 13, `core.child_wellbeing`, `core.caregiver_coping` and `core.child_safeguarding` are asked instead. Core rules switch to paediatric wording for VTE, fasting, chest care, delirium, mobilisation and discharge. In a module rule use `isChild` / `isUnder(ctx.patient, years, ctx.module)` rather than `ageYears` alone.
- **`PlanContribution`**: `problem` (lines on the module's primary problem: goals / investigations / treatment / monitoring / referrals), `problems` (extra named problems), `comorbidities`, `general` (under the fixed `PLAN_HEADINGS`), `cautions`, `counselling`, `followUp`, `dischargeCriteria`.
- **`RuleLine`** = `{ text, why, priority? }` — `why` is required and must name the answer or score and, where one exists, the guideline.
- **`ConsentSpec`**: `intendedBenefits`, `risks` (only what the education record lacks; frequency only if published), `alternatives` (include non-operative), `riskOfNotTreating`, `anaesthesiaOptions`, `additionalProcedures`, `photography`, `bloodProducts`, `specimen`, `counsellingTopics`, `modifiers` (`RiskModifier`: patient-specific risks for THIS procedure), `phases` (default `['pre_op']`).
- Stored as **`StoredProcedureReview`** on `ClinicalEncounter.procedureReview`.

### Core field ids you may read in rules

All core ids are `core.*` (see `core/holistic.ts`, `core/perioperative.ts`, `core/wound.ts`, `core/followUp.ts`). The most used:

`core.diabetes, core.hba1c, core.glucose, core.pvd, core.renal, core.cardiac, core.respiratory, core.haemoglobinopathy, core.immune, core.radiotherapy_site, core.anticoagulant, core.smoking, core.alcohol, core.substance, core.weight_kg, core.height_cm, core.hb, core.albumin, core.perfusion, core.oedema, core.tension, core.pressure_shear, core.adherence, core.capacity, core.expectations, core.cost_barrier, core.distance, core.traditional_remedies, core.carer, core.anaesthesia_planned, core.asa, core.surgery_extent, core.caprini, core.pod, core.complications, core.op_wound, core.drain, core.wound_aetiology, core.wound_tissue, core.wound_exudate, core.wound_edge, core.wound_repair, core.iwii_*, core.goal_of_care, core.who_dresses, core.adherence_fu, core.function`.

Core score ids in `ctx.scores`: `bmi, must, braden, caprini, asa, airway, rcri, mets, stopbang, bleeding, cfs, apfel, phq2, phq9, gad2, gad7, appearance, news2, iwii`. Module scores use `${moduleId}.<name>` (e.g. `skin_graft.take`).

### Core sections per phase (`core/index.ts`)

| Phase | Lead (first) | Holistic (after the module) | Close |
|---|---|---|---|
| wound_review | wound_assessment (TIMERS), wound_infection (IWII) | patient_factors, healing_barriers, nutrition, pressure, pain, psychology, social | wound_dressing |
| pre_op | — | patient_factors, healing_barriers, nutrition, anaesthetic, vte, pressure, pain, psychology, social | — |
| post_op | post_op_status | nutrition, pressure, pain | — |
| follow_up | follow_up_interval | nutrition, pain, psychology | — |

Module sections sit between lead and holistic.

---

## 3. How to add a procedure — step by step

1. **Pick the group folder** and create one file:
   - `procedures/reconstruction/` — flaps (local / regional / free), pressure-sore flap, scalp flap, contracture release
   - `procedures/oncology/` — tumour excision, melanoma WLE, BCC/SCC, scalp tumour, lipoma, biopsy
   - `procedures/limb_hand_burns/` — diabetic foot debridement, ray / BKA amputation, tendon and nerve repair, burn excision and grafting, NPWT, fasciotomy
   - `procedures/aesthetic_other/` — breast reduction, abdominoplasty, liposuction, keloid excision, cleft, scar revision
   - `procedures/wound/` — wound-only reviews
2. **Export the module** from that file and **add it to the folder's `index.ts` array**. Do not edit `registry.ts`.
3. **Find the catalogue links**: fee ids in `src/data/surgicalFees.ts`; education `procedureId` in `src/data/patientEducation.ts`; leaflet ids in `src/domains/patient-education/data/*` (`id: '...'`).
4. **Write only the procedure-specific questions.** Before adding a field, check the core does not already ask it (smoking, diabetes, nutrition, pain, psychology, social, wound bed, post-op complications, VTE…). If the core lacks something every procedure needs, raise it — do not add it to one module.
   - Field ids: `${moduleId}.<field>`. Use `select` / `multiselect` with `flag` + `flagReason` on the concerning option; `boolean` with `flagWhenTrue`; `number` with `numericFlags` (published thresholds only, cite the source in the reason); `showWhen` / `visibleWhen` for conditional fields.
   - A field asked at several phases: define it once as a constant and put the same object in each phase's section; list it in `carryForward`.
   - Validated scores: call the existing calculator in a `ScoreRule`. A *new* instrument goes in `scores/` as a `ScreeningInstrument` (ScaleItem model) with its citation, licence and a test against known totals.
5. **Write the plan rules** with `ruleKit` (`L`, `G`, `P`, `merge`). One rule per concern; return `null` when it does not apply; every line has a `why`; put lines under the right `PLAN_HEADINGS`; use `problem` for the procedure's own goals / investigations / treatment / monitoring / referrals. Always give the primary problem **goals**. Do not restate core lines (VTE, analgesia, nutrition, smoking…) — the builder de-duplicates identical text, but near-duplicates in different words are your responsibility.
6. **Consent**: fill `ConsentSpec`. Do not repeat risks the education record already lists (same name). Add `modifiers` only for risks that are specific to this procedure (core modifiers already cover smoking, diabetes, radiotherapy, obesity, steroids, malnutrition, anaemia, anticoagulants, sickle cell, perfusion, keloid history, frailty, OSA, ASA ≥ 3, alcohol).
7. **Follow-up and handoffs**: per-phase visits with purpose; handoff routes must exist in `src/App.tsx`.
8. **Cite** the guidelines in `basis` (e.g. BAPRAS, BSSH, NICE NG14 melanoma, AJCC 8, IWGDF 2023, ISBI 2016/2018, EPUAP/NPIAP 2019, NICE NG89, WHO SSC). Write content as an experienced plastic surgeon would, with Nigerian / LMIC practice in mind (cost, availability, NHIA vs out of pocket, delayed presentation, traditional remedies).
9. **Run** `npx vitest run src/domains/clinical/procedureReview` — the registry test checks your module automatically (ids, namespaces, catalogue links, phases, every plan line has a why, no duplicate lines under both empty and "worst-case" answers). Add a module test file for your rules' key behaviours.

### Checklist

- [ ] One file in the right group folder; listed in that folder's `index.ts`.
- [ ] `id` snake_case and unique; every own field id starts with `${id}.`.
- [ ] Every phase in `phases` has sections or is in `coreOnlyPhases`.
- [ ] No question duplicates a core question.
- [ ] `feeIds` exist; `educationId` exists (or `null` + `educationNote`); leaflet ids exist.
- [ ] Flags carry reasons; numeric thresholds are published and cited.
- [ ] Existing calculators reused; any new instrument in `scores/` with a test.
- [ ] Primary problem has goals; every rule line has a specific `why`; rules are pure.
- [ ] ConsentSpec: benefits, procedure risks not already in the education record, alternatives incl. non-operative, risk of not treating, anaesthesia, additional procedures, photography / blood / specimen, counselling topics, procedure-specific modifiers.
- [ ] Follow-up schedule per phase; handoff routes exist.
- [ ] `basis` cites guidelines.
- [ ] `npx vitest run`, `npx tsc --noEmit -p tsconfig.json` clean.

---

## 4. Storage, sync, approval

- Stored on the encounter: `ClinicalEncounter.procedureReview` (`StoredProcedureReview`); `encounter.type` is the phase's encounter type; the narrative is written into the ordinary prose fields (`records.proseFromReview`).
- Supabase: `clinical_encounters.procedure_review JSONB` (`supabase/migrations/20261106120000_procedure_review.sql`), mapped by the sync layer's generic camelCase ↔ snake_case conversion, like `clerking`. No new Dexie table or index.
- Lifecycle: `draft → pending_review → signed`, `entered_in_error` — the clerking's rules (`SIGN_ROLES`, author edits, version check) via `assertCanEditRecord / assertCanSubmitRecord / assertCanMarkErrorRecord`.
- Plan: `submitReviewPlan` → `scribeService.submitPlan` → consultant approval (`approval.canApprove`) → `TreatmentPlan` → implementation log. The review keeps `scribePlanId`.
