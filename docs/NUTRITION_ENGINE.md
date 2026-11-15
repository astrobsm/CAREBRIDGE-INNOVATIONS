# Adult Clinical Nutrition Engine (stage 1)

`src/domains/nutrition/engine/` is a pure calculation engine for adult clinical
nutrition: no UI, no database, no food data. Stages 2–5 (UI, persistence, food
composition, monitoring dashboards) are meant to build on its exported API.

**Status: `pending_clinical_validation`.** Nothing here has been clinically
signed off. Every coefficient and threshold is listed in the
[validation checklist](#validation-checklist) below.

## Principles

1. **Transparent outputs.** Every result is an `Estimate`:
   `{ value, unit, method, formula, inputsUsed, assumptions[], warnings[], missing[], status, configVersion, sources[] }`.
   `status` is `computed`, `not_computable`, `equation_not_configured` or `not_applicable`.
2. **Missing is missing.** When an input is absent, `value` is `null` and
   `missing` names it. A missing lab is never treated as normal. An unassessed
   score component makes the total a stated minimum, never a silent zero.
3. **Numbers live in config, not code.** Regression coefficients, cut-offs and
   ranges are in the versioned config, each with a source id.
4. **No invented coefficients.** If a published coefficient could not be
   confirmed, its slot holds `coefficients: null` and a TODO. The engine then
   reports "Equation not configured".
5. **Build on the canonical functions.** BMI, IBW, AdjBW, Mifflin–St Jeor and
   the revised Harris–Benedict come from
   `src/domains/calculators/engine/calculationEngine.ts`. MUST totals and
   interpretation come from `scoreMust`/`interpretMust` in
   `src/domains/clinician-assistant/services/riskCalculators.ts`. Units go
   through `clinician-assistant/services/engine/units.ts`, and weight change
   through `src/services/longitudinalMath.ts`.
6. **Population guard.** The engine covers adults 18 and over. Children,
   pregnancy, lactation, dialysis-dependent renal failure and parenteral
   nutrition return `{ status: 'refer', reason }`, with the message "Specialist
   dietitian/physician input required".

## Files

| File | Contents |
|---|---|
| `engine/index.ts` | Public API (re-exports everything below) |
| `engine/estimate.ts` | `Estimate` type, builders, numeric guards |
| `engine/types.ts` | `NutritionPatient`, `ClinicalContext`, `ClinicianOverride`, `WeightPoint` |
| `engine/guards.ts` | `checkPopulation`, `REFER_MESSAGE` |
| `engine/anthropometry.ts` | BMI, IBW, AdjBW, height/weight equations, MUAC band, amputation, MAMC, weight change, grip |
| `engine/screening.ts` | MUST, NRS-2002, SGA, GLIM, (m)NUTRIC, `storedSgaGrade` |
| `engine/energy.ts` | All energy methods; `estimateEnergy` returns every applicable one |
| `engine/protein.ts` | `estimateProtein` by context |
| `engine/fluidMicronutrients.ts` | Fluid; micronutrient priorities |
| `engine/labs.ts` | Nitrogen balance, prealbumin/CRP ratio, `normaliseAlbumin` |
| `engine/refeeding.ts` | NICE CG32 risk; stepped schedule; lab alerts text |
| `engine/weightGoals.ts` | `planWeightGoal` |
| `engine/monitoring.ts` | Alert functions over series; `monitoringSchedule` |
| `engine/assess.ts` | `assessNutrition`: one call that routes to all of the above |
| `engine/config/types.ts` | Config schema |
| `engine/config/sources.v1.ts` | Citations |
| `engine/config/equations.v1.ts` | Anthropometric regression slots and per-population default order |
| `engine/config/nutritionConfig.v1.ts` | Everything else (cut-offs, ranges, factors) |
| `engine/config/index.ts` | `ACTIVE_NUTRITION_CONFIG`, `equationById`, `auditConfig` |

Every engine function takes an optional final `config` argument, which
defaults to `ACTIVE_NUTRITION_CONFIG`.

## Config format

```ts
interface NutritionConfig {
  version: string;                 // semver, stamped into every Estimate
  effectiveDate: string;
  validationStatus: NutritionValidationStatus; // scar ValidationStatus | 'pending_clinical_validation'
  changelog: string[];
  sources: Record<string, Source>; // { citation, verifiedAgainstPrimary, note? }
  population: { adultMinAgeYears; defaultEquationPopulation };
  anthropometry: { heightEquations; weightEquations; kneeHeightDefaults; ulnaDefaults; weightDefaults;
                   muacBmi; amputationSegmentsPercent; devine; adjustedBodyWeight; weightChangeWindows;
                   weightPercentFloorKg; gripStrength; mamcNorms };
  screening: { must; nrs2002; glim; nutric };
  energy: { harrisBenedictOriginal; activityFactors; stressFactors; pennState2003b; pennState2010;
            toronto; curreri; icuEspen; obesityAspen };
  protein: { ward; icu; burnsAndLargeWounds; obeseIcu; ckdNonDialysis; wardObeseAdjustedFromBmi };
  weightGoals: { kcalPerKg; lossDeficitKcal; gainSurplusKcal; floorsKcal; maxProjectionWeeks };
  refeeding; fluid; micronutrients; monitoring; labs;
}
```

Most values are wrapped as `Sourced<T> = { value: T; sourceId: string; note? }`.

### Regression equations

```ts
interface RegressionEquation {
  id: string;                       // e.g. 'kh_chumlea1994_black_m'
  label: string;
  predicts: 'heightCm' | 'weightKg';
  inputs: string[];                 // engine input names: kneeHeightCm, ulnaLengthCm, ageYears, muacCm, calfCm, subscapularSkinfoldMm
  sex: 'male' | 'female';
  population: 'nigerian' | 'black_african' | 'non_hispanic_black' | 'non_hispanic_white' | 'mexican_american' | 'general';
  ageMinYears: number;              // inclusive
  ageBelowYears: number | null;     // exclusive upper bound; null = none published
  coefficients: { intercept: number; terms: Record<string, number> } | null;  // value = intercept + Σ term × input
  sourceId: string;
  todo?: string;                    // required when coefficients is null
}
```

**Default selection.** `kneeHeightDefaults`, `ulnaDefaults` and `weightDefaults`
give, for each population and sex, an ordered list of candidate equation ids.
The engine uses the first candidate whose age range fits **and** whose
coefficients are configured. It then reports, as assumptions:

- the equation used;
- any candidate it passed over because that candidate was not configured;
- any mismatch between the population requested and the equation's own
  population.

If the candidates that fit are all unconfigured, the result is
`equation_not_configured`. If no candidate covers the age, the result is
`not_applicable`. The engine never falls back to a population or age range the
defaults table doesn't list.

The population is selectable in two places:

- **Globally:** `population.defaultEquationPopulation`, which is
  `non_hispanic_black` in v1 because no Nigerian equation is configured.
- **Per call:** `patient.equationPopulation`, or `population` on the
  anthropometry functions. A specific equation can be forced with `equationId`.

## How to update a coefficient

1. **Never edit a released version in place.** Copy `nutritionConfig.v1.ts`, and
   `equations.v1.ts`/`sources.v1.ts` if they change, to `*.v2.ts`.
2. In the copy, change the value and add a `changelog` entry saying what
   changed, why, and the source. Bump `version`.
3. **New source:** add it to `sources` with `verifiedAgainstPrimary: false`.
   Set the flag to `true` only after someone has checked every number
   attributed to that source against the primary publication.
4. **Filling a `null` slot** (for example, a Nigerian knee-height equation):
   - enter `coefficients`;
   - make sure every term is listed in `inputs`;
   - remove the `todo`;
   - add or update the source.
   - If the equation should become the default, put its id first in the
     relevant `*Defaults` list for that population. To make Nigerian equations
     the default, set `defaultEquationPopulation: 'nigerian'`.
5. Point `ACTIVE_NUTRITION_CONFIG` in `config/index.ts` at the new version.
6. Run `npx vitest run src/domains/nutrition`:
   - `auditConfig` must return no problems (unknown source ids, dangling
     default ids, a null slot without a TODO, or a term not listed in
     `inputs`);
   - update the worked-example expectations deliberately, with the new
     hand calculation in the comment.
7. Leave `validationStatus` alone. Moving it off `pending_clinical_validation`
   is a clinical sign-off decision backed by evidence, not part of a
   coefficient edit.

## Equations and sources

| Area | Equation / rule | Source id → citation |
|---|---|---|
| BMI | weight ÷ height² (canonical `calculateBMI`) | `canonicalEngine` |
| IBW | Devine: 50 / 45.5 kg + 2.3 kg per inch over 60 in | `devine1974` |
| AdjBW | IBW + 0.4 × (ABW − IBW); ABW if ABW ≤ IBW; "indicated" above 120% IBW (local) | `canonicalEngine` |
| Height (knee), 18–59 | Chumlea 1994: white men 71.85 + 1.88 KH; black men 73.42 + 1.79 KH; white women 70.25 + 1.87 KH − 0.06 A; black women 68.10 + 1.86 KH − 0.06 A | `chumlea1994` |
| Height (knee), ≥ 60 | Chumlea 1998 NHANES III: NHW men 78.31 + 1.94 KH − 0.14 A; NHB men 79.69 + 1.85 KH − 0.14 A; MA men 82.77 + 1.83 KH − 0.16 A; NHW women 82.21 + 1.85 KH − 0.21 A; NHB women 89.58 + 1.61 KH − 0.17 A; MA women 84.25 + 1.82 KH − 0.26 A | `chumlea1998` |
| Height (knee), 60–90 | Chumlea 1985: men 64.19 − 0.04 A + 2.02 KH; women 84.88 − 0.24 A + 1.83 KH | `chumlea1985` |
| Height (ulna) | Linear fit reproducing the BAPEN MUST ulna table: men < 65 79.2 + 3.60 U; men ≥ 65 86.3 + 3.15 U; women < 65 95.6 + 2.77 U; women ≥ 65 80.4 + 3.25 U | `bapenMust2003` |
| Weight (anthropometry), ≥ 65 | Chumlea 1988: men 0.98 CC + 1.16 KH + 1.73 MAC + 0.37 SSF − 81.69; women 1.27 CC + 0.87 KH + 0.98 MAC + 0.40 SSF − 62.35 | `chumlea1988` |
| MUAC → BMI band | MUAC < 23.5 cm → BMI likely < 20; > 32 cm → likely > 30 | `bapenMust2003` |
| Amputation | Segment % of body weight: hand 0.7, forearm+hand 2.3, forearm 1.6, upper arm 2.7, whole arm 5.0, foot 1.5, lower leg+foot 5.9, lower leg 4.4, thigh 10.1, whole leg 16.0; est. weight = current ÷ (1 − Σ%) | `osterkamp1995` |
| MAMC | MUAC (cm) − π × TSF (mm) ÷ 10 | `blackburn1977` |
| Weight change | (latest − earliest-in-window) ÷ earliest × 100, windows 5–10 d, 21–40 d, 90–183 d; withheld below a 1 kg baseline | `localPolicy`; maths `longitudinalMath.safePercentChange` |
| Grip | Low if < 27 kg (men) / < 16 kg (women) | `ewgsop2` |
| MUST | BMI > 20 → 0, 18.5–20 → 1, < 18.5 → 2; loss < 5% → 0, 5–10% → 1, > 10% → 2; acute disease effect 2; total via `scoreMust`/`interpretMust`; a GAIN scores 0 | `bapenMust2003` |
| NRS-2002 | Nutritional status 0–3 + disease severity 0–3 + 1 if age ≥ 70; at risk ≥ 3 | `kondrup2003` |
| SGA | Structured Detsky form; the A/B/C rating is the clinician's own, never derived | `detsky1987` |
| GLIM | ≥ 1 phenotypic + ≥ 1 aetiologic criterion; stage 2 if loss > 10% (≤ 6 m) / > 20% (> 6 m), BMI < 18.5 (< 70 y) / < 20 (≥ 70 y), or severe muscle deficit | `glim2019` |
| NUTRIC | Age, APACHE II, SOFA, comorbidities, days to ICU (+ IL-6). High risk ≥ 6 with IL-6; modified (no IL-6) ≥ 5 | `heyland2011`, `rahman2016` |
| Indirect calorimetry | Preferred when measured. ICU: ≤ 70% early (days 1–3), 80–100% after | `espenIcu2019` |
| Mifflin–St Jeor | 10W + 6.25H − 5A + 5 / − 161 (canonical) | `mifflin1990` |
| Harris–Benedict | Revised (canonical) × activity (1.2 bed / 1.3 ambulatory) × stress (1.0 / 1.2 / 1.35 / 1.6 / 2.1) | `rozaShizgal1984`, `long1979` |
| Penn State 2003b | Mifflin × 0.96 + VE × 31 + Tmax × 167 − 6212 | `frankenfield2004` |
| Penn State 2010 | Mifflin × 0.71 + VE × 64 + Tmax × 85 − 3085 (age ≥ 60 and BMI ≥ 30) | `frankenfield2009` |
| Toronto | −4343 + 10.5 × TBSA + 0.23 × prior-24 h kcal + 0.84 × HB (original 1919) + 114 × T °C − 4.5 × post-burn day | `allard1990`, `harrisBenedict1919` |
| Curreri | 25 × W + 40 × TBSA, with TBSA capped at 50%; flagged as overestimating | `curreri1974` |
| ICU weight-based | 20–25 kcal/kg early (≤ day 3), 25–30 after; not for BMI ≥ 30 | `espenIcu2006`, `espenIcu2019` |
| Obese critically ill | BMI 30–50: 11–14 kcal/kg actual; BMI > 50: 22–25 kcal/kg IBW | `aspen2016` |
| Protein | Ward 1.0–1.5 g/kg (AdjBW if BMI ≥ 30); ICU ≥ 1.3; burns/large wounds 1.5–2.0; obese ICU 2.0 g/kg IBW (BMI 30–40) / 2.5 (≥ 40); CKD not on dialysis 0.55–0.6 (non-diabetic) / 0.6–0.8 (diabetic), "physician to confirm" | `localPolicy`, `espenIcu2019`, `espenBurns2013`, `aspen2016`, `kdoqi2020` |
| Weight goals | Deficit 500–1000 kcal/day (0.5–1.0 kg/wk); surplus 300–500 (0.25–0.5 kg/wk); floors 1200 F / 1500 M; trajectory at 7700 kcal/kg | `nhlbi1998`, `localPolicy`, `jensen2013`, `wishnofsky1958` |
| Refeeding | NICE CG32 high risk (1 major / 2 minor); extreme BMI < 14 or negligible intake > 15 d; start 10 (5 extreme) kcal/kg, advance over 4–7 d (default 7); > 5 d little intake → ≤ 50% for 2 days | `niceCg32` |
| Fluid | 30–35 mL/kg/day; burns, fever > 38 °C, abnormal losses and CKD flagged for review | `niceCg32` |
| Nitrogen balance | protein ÷ 6.25 − (UUN + 4) − optional wound loss; UUN from urinary urea × 0.028 g/mmol | `blackburn1977` |
| Prealbumin/CRP | prealbumin (mg/L) ÷ CRP (mg/L); no threshold configured | `localPolicy` |
| Micronutrients | Wound healing: zinc, vitamin C, vitamin A. Burns: Zn/Cu/Se, vitamin C. Refeeding: thiamine, B complex, multivitamin. Alcohol: thiamine. No doses | `espenMicronutrients2022` |

All sources have `verifiedAgainstPrimary: false` in v1.

## Coefficients left null

| Slot | Why |
|---|---|
| `kh_nigerian_m`, `kh_nigerian_f` | No Nigerian knee-height equation could be confirmed from a citable primary source |
| `ulna_nigerian_m`, `ulna_nigerian_f` | Same, for ulna length |
| `wt_nigerian_m`, `wt_nigerian_f` | Same, for weight estimation |
| `wt_ross_black_{m,f}_{19_59,60_80}`, `wt_ross_white_{m,f}_{19_59,60_80}` | Race- and age-specific knee-height + MUAC weight equations (Ross Laboratories / Chumlea). Values recalled but not confirmed, so not entered |
| `black_african` defaults (knee height, weight) | Empty candidate list: no equation configured |
| `gripStrength.ageSexNorms` | Age/sex grip centiles not entered (not certain) |
| `mamcNorms` | MAMC reference centiles not entered |
| `labs.prealbuminCrpRatioThreshold` | No validated cut-off; the ratio is reported for trend only |

Practical effect: a patient aged 18–64 who cannot be weighed gets an
**estimated height** but **no estimated weight**. Energy and protein then report
`missing: ['weightKg']` rather than guessing.

## Validation checklist

Each item needs sign-off by a named clinician (dietitian and/or physician)
before `validationStatus` moves.

### Sources
- [ ] Every entry in `sources.v1.ts` checked against the primary publication; set `verifiedAgainstPrimary: true` per source
- [ ] Ulna equations confirmed to reproduce the BAPEN table across its full range

### Anthropometry
- [ ] Default equation population (`non_hispanic_black`) acceptable as a proxy for Nigerian adults until Nigerian equations are entered
- [ ] Chumlea 1994 knee-height coefficients (4 equations) and age range 18–59
- [ ] Chumlea 1998 knee-height coefficients (6 equations) and age range ≥ 60
- [ ] Chumlea 1985 knee-height coefficients (2 equations) and age range 60–90
- [ ] BAPEN ulna equations (4) and age split at 65
- [ ] Chumlea 1988 weight equations (2) and age range 65–104
- [ ] Candidate order in `kneeHeightDefaults`, `ulnaDefaults`, `weightDefaults`
- [ ] Nigerian height/ulna/weight equations sourced and entered (currently null)
- [ ] Ross race-specific weight equations verified and entered, or slots removed
- [ ] MUAC bands 23.5 cm → BMI < 20 and 32 cm → BMI > 30
- [ ] MUST BMI score of 1 (the minimum) when MUAC < 23.5 suggests BMI < 20
- [ ] Amputation segment percentages (10 values)
- [ ] Devine constants 50 / 45.5 / 2.3
- [ ] AdjBW fraction 0.4 and the 120% IBW "indicated" threshold
- [ ] Weight-change windows (5–10 d, 21–40 d, 90–183 d), the earliest-in-window rule, and the 1 kg percent floor
- [ ] Grip cut-offs 27 / 16 kg; age/sex norms (null)
- [ ] MAMC norms (null)

### Screening
- [ ] MUST BMI thresholds 20 / 18.5, weight-loss 5 / 10%, acute disease effect 2 points / 5 days
- [ ] NRS-2002: BMI 20.5, age adjustment ≥ 70, at-risk ≥ 3, intake bands ≤ 25 / ≤ 60 / < 75%, weight loss > 5% in 1 / 2 / 3 months, > 15% in 3 months, BMI 18.5
- [ ] GLIM: weight loss 5 / 10 / 10 / 20%, BMI 20 / 22 / 18.5 / 20 with the age split at 70, reduced intake ≤ 50% for > 7 days or any reduction for > 14 days
- [ ] NUTRIC band boundaries (age 50 / 75; APACHE 15 / 20 / 28; SOFA 6 / 10; comorbidities ≥ 2; days ≥ 1; IL-6 ≥ 400) and high-risk 6 / 5

### Energy
- [ ] Original Harris–Benedict coefficients (Toronto only) and the choice of original over revised inside Toronto
- [ ] Activity factors 1.2 / 1.3; stress factors 1.0 / 1.2 / 1.35 / 1.6 / 2.1
- [ ] Penn State 2003b and 2010 coefficients; 2010 applicability (age ≥ 60, BMI ≥ 30)
- [ ] Toronto coefficients
- [ ] Curreri 25 / 40 and the TBSA cap at 50%
- [ ] ICU 20–25 kcal/kg (early, ≤ day 3) and 25–30 (later); calorimetry fractions 0.7 and 0.8–1.0
- [ ] ASPEN obesity 11–14 kcal/kg actual (BMI 30–50) and 22–25 kcal/kg IBW (BMI > 50)
- [ ] Preferred-method order: calorimetry > Toronto > Penn State 2010 > Penn State 2003b

### Protein
- [ ] Ward 1.0–1.5 g/kg (needs a supporting citation) and adjusted weight from BMI ≥ 30
- [ ] ICU ≥ 1.3 g/kg
- [ ] Burns / large wounds 1.5–2.0 g/kg, including its extension to large/heavily exuding wounds
- [ ] Obese ICU 2.0 / 2.5 g/kg IBW at BMI 30–40 / ≥ 40
- [ ] CKD not on dialysis 0.55–0.6 / 0.6–0.8 g/kg, and the rule that catabolic CKD is not reduced

### Weight goals
- [ ] 7700 kcal/kg
- [ ] Deficit band 500–1000 kcal/day and surplus 300–500 (surplus band needs a citation)
- [ ] Floors 1200 / 1500 kcal and the override requirement `{ by, reason }`
- [ ] Catabolic states that block weight loss (burns, sepsis, major wound)
- [ ] Protein > 35% of energy warning; 104-week projection cap

### Refeeding
- [ ] NICE criteria thresholds (BMI 16 / 18.5; loss 15 / 10%; intake 10 / 5 days; low K/PO4/Mg)
- [ ] Extreme criteria (BMI < 14, negligible intake > 15 days)
- [ ] Start 10 / 5 kcal/kg; advance 4–7 days with a default of 7; linear stepping
- [ ] ≤ 50% for 2 days after > 5 days of little intake
- [ ] Use of the shared reference-range low limits for K (3.5), PO4 (0.80) and Mg (0.70) mmol/L
- [ ] Treating 'indeterminate' (missing labs) as high risk until assessed

### Fluid, micronutrients, labs
- [ ] Fluid 30–35 mL/kg; fever flag at > 38 °C
- [ ] Micronutrient priority lists per condition
- [ ] Nitrogen 6.25, insensible loss 4 g, 0.028 g N per mmol urea
- [ ] Prealbumin/CRP threshold (null)

### Monitoring
- [ ] Intake < 60% for ≥ 3 consecutive days; a missing day breaks the run
- [ ] MUAC/calf decline ≥ 5% from baseline
- [ ] Negative nitrogen balance on 2 consecutive measurements
- [ ] Prealbumin/CRP noise floors 10% (assay repeatability, not an MCID)
- [ ] Weight faster than planned by > 25%
- [ ] Monitoring schedules for low / medium / high / refeeding_high

## Consolidation (stage 1)

**Re-pointed to the engine or the canonical functions:**

| Duplicate | Now uses | Behaviour change |
|---|---|---|
| `services/nutritionPlannerService.ts` BMI, IBW, AdjBW, MUST, Harris–Benedict, protein, fluid | `calculationEngine`, engine MUST steps + `scoreMust`, config | Protein: normal 0.8 → 1.0 g/kg (ward low bound), critical 1.5 → 1.3 g/kg (ICU minimum). BMI obesity labels now `Obese (Class I)` etc. IBW/AdjBW rounded to 0.1 kg. Invalid BMI → `NaN` / "Not calculable" |
| `clinician-assistant/services/calculators.ts` `basalMetabolicRate` | canonical revised Harris–Benedict; floors and deficit/surplus from config | Original-1919 (rounded) → revised: 70 kg / 175 cm / 40 y man 1628 → 1639 kcal |
| `services/burnCareService.ts` adult Curreri, burns protein | `curreriKcal`, config protein range | TBSA capped at 50% (70% TBSA, 70 kg: 4550 → 3750 kcal). Paediatric and infant branches untouched |
| `burns/services/burnScoringService.ts` `calculateBurnNutrition` | `curreriKcal`, config | TBSA cap at 50% |
| `clinician-assistant/services/burnCalculators.ts` `calculateNutritionTargets` | `curreriKcal`, config | TBSA cap at 50%; formula text notes the cap |
| `services/patientCategoryService.ts` `calculateIBW`, `calculateAdjustedWeight` | canonical `calculateIdealBodyWeight`, new canonical `adjustedBodyWeightFromIbw` | IBW rounded to 0.1 kg. AdjBW is now computed whenever ABW > IBW (it used to equal ABW up to 130% IBW). `getDosingWeight`'s rule of dosing on AdjBW only above 130% IBW is unchanged |

The canonical engine gains `adjustedBodyWeightFromIbw`, which
`calculateAdjustedBodyWeight` now uses.

**UI duplicates still to rewire (later stage):**

- **MUST:**
  - `nutrition/pages/NutritionPage.tsx`;
  - `admissions/components/NutritionalRiskAssessment.tsx`;
  - `calculators/pages/calculators/MUSTCalculator.tsx` (scoring steps now use the engine; BMI and kcal/protein tables are still local);
  - `clinician-assistant/components/CalculatorPanels.tsx` (MustPanel);
  - `clinical/procedureReview/engine.ts`.
- **BMI:** computed inline in
  - `NutritionPage`;
  - `NutritionalRiskAssessment`;
  - `MUSTCalculator`;
  - `WeightGainCalculator`;
  - `WeightLossCalculator`;
  - `clinical/clerking/engine.ts`;
  - `clinical/components/clerking/sections.tsx`;
  - `clinical/pages/VitalsPage.tsx`;
  - `clinical/scribe/clinicalFacts.ts`;
  - `CalculatorPanels`;
  - `components/common/OCRScanner.tsx`.
- **Harris–Benedict:** `NutritionPage.tsx` (~line 230) inlines the revised equation **with a fixed age of 40**, which is a bug in its own right.
- **Curreri:**
  - `burns/pages/BurnsAssessmentPage.tsx`;
  - `burns/pages/EnhancedBurnsAssessmentPage.tsx`;
  - `burns/components/AIBurnExpert.tsx`;
  - `calculators/pages/calculators/BurnsCalculator.tsx`.
- **kcal/kg and protein tables:**
  - `NutritionalRiskAssessment` (25/30 kcal/kg, 1.2/1.5 g/kg);
  - `MUSTCalculator` (30/35 kcal/kg);
  - `NutritionPage` (`weight * factor`);
  - `calculators/pages/calculators/NutritionCalculator.tsx`;
  - `SickleCellCalculator.tsx`;
  - `WeightGain`/`WeightLoss` calculators;
  - `clinician-assistant/components/BedsideCalculators.tsx`;
  - `NutritionPlannerPage.tsx` (IBW × 1.2 check inline).
- **Canonical `calculateNutrition`** (`calculationEngine.ts`): its burns stress factor (+2% per %TBSA) and fluid (Parkland 4 mL/kg/%TBSA + 30 mL/kg as *daily* fluid) should be reviewed against the engine before UI callers move onto it.

## Safety fixes in stage 1

- **`MUSTCalculator`:** `Math.abs()` made a weight gain score as loss. It now
  uses the engine's `mustWeightLossScore`, under which a gain scores 0.
- **`limbSalvageService`:** albumin was read in g/dL and defaulted to 4 when
  missing. It is now normalised to g/L through the shared unit converter. A
  missing albumin or MUST is listed in `LimbSalvageScore.missingInputs`
  instead of reading as normal. The form no longer pre-fills albumin with 4.0.
  - Stored assessments created before this fix may carry that 4.0 default.
- **`NutritionPage`:** SGA was derived from the MUST score. The mapping is
  removed, and only grades with `sgaSource === 'sga_form'` are displayed, so
  legacy MUST-derived grades show as "Not assessed".

**Found, not fixed (outside scope):**

- In the shared `referenceRanges`, potassium uses `unitRule: 'calcium'`. As a
  result `toCanonical` halves a potassium value given in mEq/L. The nutrition
  engine handles potassium units itself; the shared rule should be corrected.
- `LimbSalvageForm` still pre-fills `bmi: 25`, `mustScore: 0` and
  `prealbumin: 20`. An unentered MUST therefore reads as 0, not missing.

## Stage 2: food data

Status: **every recipe `pending_dietitian_verification`; every household
measure `to_be_verified_by_local_weighing`.**

### Source: WAFCT 2019

| | |
|---|---|
| Table | FAO/INFOODS Food Composition Table for Western Africa (2019) |
| URL | https://www.fao.org/fileadmin/user_upload/faoweb/2020/WAFCT_2019.xlsx |
| File | `WAFCT_2019.xlsx`, 3,060,230 bytes, retrieved 2026-11-07 |
| SHA-256 | `bca8e44f7a41fdd538998d9e31849ed26af4703ddb5a451803d73a2d9532cc85` |
| Sheets used | `05 NV_sum_57 (per 100g EP)`, `07 Yield factors, sing_ing`, `08 Retention factors` |
| Licence | FAO: non-commercial use with acknowledgement; commercial use needs an FAO licence (copyright@fao.org) |

#### Licence and acknowledgement (decision)

- **Decision (2026-11-13):** the project owner has confirmed that AstroHEALTH's
  use of WAFCT 2019 is **non-commercial**, so the FAO terms are met by
  acknowledgement and no FAO licence is needed. If the app is ever sold,
  licensed or bundled in a paid product, this must be revisited and an FAO
  licence sought (copyright@fao.org) first.
- **The acknowledgement** is one constant,
  `FOOD_COMPOSITION_ACKNOWLEDGEMENT` in
  `src/domains/nutrition/data/foodSourceAcknowledgement.ts`:
  "Food composition: FAO/INFOODS West African Food Composition Table (2019).
  Values pending local dietitian verification." Do not copy the wording;
  import the constant.
- **Where it appears** (everywhere WAFCT-derived values are shown or printed):
  - meal-plan PDF, `src/utils/mealPlanPdfGenerator.ts` (`addFoodSourceLine`,
    after the last section, used by the nutrition, weight-gain, weight-loss
    and wound meal-plan calculators);
  - 7-day meal plan generator, `src/domains/admissions/components/MealPlanGenerator.tsx`
    (under the generated plan, in the info box, and at the end of its own PDF);
  - nutrition page food database, `src/domains/nutrition/pages/NutritionPage.tsx`;
  - nutrition planner food database, `src/domains/nutrition/pages/NutritionPlannerPage.tsx`;
  - the seven-day meal plans of the bedside and clinician-assistant
    calculators (`MealPlanDays` in
    `src/domains/clinician-assistant/components/CalculatorPanels.tsx`).
- A test (`__tests__/restoredRecipes.test.ts`) checks the PDF prints it and that
  these files use the constant rather than their own copy. A new screen or
  PDF showing food values must add it too.

The workbook is not committed. Put it in `data/source/wafct2019/` (its own
folder; `.gitignore` excludes it) and run `node scripts/import-wafct.mjs`.
The importer checks the SHA-256 recorded in
`data/source/wafct2019.provenance.json` and writes:

- `src/domains/nutrition/data/foods/wafct2019.generated.json`: all foods,
  loaded lazily (its own chunk);
- `.../wafct2019.core.generated.json`: only the foods that recipes and
  adapters name (found by scanning `src/domains/nutrition/data/**/*.ts` for
  codes), bundled so recipe maths is synchronous.

Conventions: `[x]` means estimated, imputed or the alternative definition in
the header (fat by continuous extraction, crude fibre); it is kept and flagged
`bracketed`. `tr` is stored as 0 and flagged `trace`. A blank is `null`, never 0.
Folate is dietary folate equivalents (FOLDFE); vitamin A is RAE.

Secondary source: Nigerian Food Composition Table, slot only (no openly
licensed file found).

### Model

Types: `src/domains/nutrition/types.ts` (the one set; old names re-exported
from `src/types` and `services/nutritionPlannerService`).

| Dexie (v93) | Cloud | Class |
|---|---|---|
| `nutritionMeasurements` | `nutrition_measurements` | patient |
| `nutritionIntake` | `nutrition_intake` | patient |
| `nutritionApprovals` | `nutrition_approvals` | patient (append-only trigger) |
| `foods` | `nutrition_foods` | members read; dietitian/admin write |
| `recipes` | `nutrition_recipes` | members read; dietitian/admin write |
| `householdMeasures` | `nutrition_household_measures` | members read; dietitian/admin write |

Nutrients per 100 g are embedded in each food (`per100g`), so there is no
separate food-nutrients table. Reference rows that ship with the app are seeded
into Dexie on first use (`ensureReferenceDataSeeded`) without `updatedAt`,
so the sync never pushes them; only dietitian edits sync.

### Calculation

- Recipe = WAFCT codes + raw grams per portion. Nutrients = Σ grams ×
  per-100 g × WAFCT retention factor (vitamins and minerals only; energy and
  macronutrients unadjusted). Recipe yield factors are `null` until the kitchen
  weighs the recipes, so a recipe served by weight is not convertible;
  record portions instead.
- An ingredient missing from WAFCT is either a stated substitute
  (`substituteFor`) or `unresolved`; with one, totals are lower bounds and say so.
- Intake: food grams or household measures, recipe portions, ONS and enteral
  feeds from label values, × fraction eaten (0, ¼, ½, ¾, 1).

### What the dietitian must verify

1. Ingredient grams for every seed recipe (`data/recipes.ts`), against the
   hospital kitchen; then weigh each cooked recipe and enter its yield factor.
2. Substitutes: pumpkin leaves (Cucurbita) for ugu; "fish, whole, dried" for
   stockfish; fortified wheat flour for semovita; dried beef for kilishi.
3. Unresolved ingredients: oha leaves, ogiri, uziza/utazi, ugba (not in WAFCT).
4. Household measures (`data/householdMeasures.ts`), by local weighing.
5. The legacy list mappings (`data/legacyFoodSpecs.ts`), including the diet
   flags carried over from the old planner list.
6. The restored dishes below: their grams, the oil-absorption estimates, and
   the substitutes and unresolved ingredients they list.

### Restored dishes (stage 2 follow-up)

Eighteen commonly eaten foods were dropped from the retired lists because no
source covered them as dishes. They are back as standard recipes
(`RESTORED_RECIPES` in `data/recipes.ts`), built and calculated exactly like
the seed recipes, all `pending_dietitian_verification`, and offered again by
the legacy adapters (`RESTORED_FROM_RETIRED` in `data/legacyFoodSpecs.ts`
lists which list each came from). `RETIRED_WITHOUT_SOURCE` is now empty.

WAFCT 2019 was searched first for each as a composite food. None is in it:
there is no fried fish, chin chin, puff puff, zobo, kunu or tiger nut milk
entry. The nearest composites are Burkina Faso dishes (14_008 groundnut sauce
with fish, 14_020 dried baobab leaf sauce) with different ingredients and
proportions, so they were not used for groundnut soup or miyan kuka.

Values per portion (calculated; energy and protein as of this change):

| Recipe | Portion | kcal | Protein g | Substitutes / lower bound |
|---|---|---|---|---|
| fried-rice | 1 plate | 503 | 11.1 | lower bound: green peas, sweetcorn not in WAFCT |
| ofada-ayamase | 1 plate | 750 | 24.5 | ofada → red native hulled rice; bleached palm oil → refined decoloured palm oil; lower bound: ponmo |
| groundnut-soup | 1 serving | 445 | 27.2 | ugu → pumpkin leaves; stockfish → dried fish |
| efo-riro | 1 serving | 441 | 25.8 | stockfish → dried fish |
| gbegiri | 1 bowl | 251 | 12.4 | — |
| miyan-kuka | 1 bowl | 259 | 15.9 | — |
| fried-fish | 1 piece (120 g raw) | 200 | 23.7 | — |
| fried-chicken | 1 piece (120 g raw) | 343 | 20.6 | — |
| suya | 1 wrap | 235 | 28.1 | kuli-kuli → partially defatted groundnut flour |
| coleslaw | 100 g | 173 | 1.5 | mayonnaise → vegetable oil + egg + vinegar |
| puff-puff | 5 balls | 329 | 5.8 | — |
| chin-chin | 50 g | 223 | 3.9 | — |
| buns | 2 buns | 375 | 7.3 | baking powder → baking soda |
| meat-pie | 1 pie | 414 | 11.9 | — |
| sausage-roll | 1 roll | 245 | 7.9 | sausage meat → minced beef |
| zobo | 250 mL | 82 | 0.1 | lower bound: roselle calyx not in WAFCT |
| kunu | 250 mL | 155 | 2.4 | upper bound (strained) |
| tiger-nut-milk | 250 mL | 199 | 1.9 | upper bound (strained) |

Assumptions to verify:

- **Frying.** Oil is always an ingredient. Stir-fried fried rice counts all the
  oil used (15 g). Deep-fried foods count the oil absorbed: fish and chicken
  about 5 % of raw weight (6 g per 120 g); puff puff about 15 % of fried
  weight (12 g per 5 balls); chin chin about 12 % (6 g per 50 g); buns about
  10 % (10 g per 2 buns). Weigh the oil before and after frying a batch.
- **Retention.** WAFCT has no frying set for meat, poultry, fish or offal; the
  dry-heat (broiled/grilled) set is used. A deep-fried wheat dough uses
  `pasta|fried_in_oil`. Baked pastry gets none (no baking set for grains).
- **Strained drinks.** Kunu and tiger nut milk count the whole grain or nut
  blended, though the pulp is strained off, so energy and fibre are
  overstated (an upper bound, the opposite of the unresolved case). Zobo
  counts the sugar; the calyx itself is unresolved.
- **Diet flags.** Fried and sugar-sweetened items are not diabetic-friendly.
  Zobo is no longer labelled low-potassium or renal-friendly, since the
  calyx's potassium is unknown. Efo riro now has its own recipe (amaranth in
  a pepper base), and the three lists that mapped it to vegetable soup point
  at it.
- **Household measures** for meat pie, sausage roll, suya, fried chicken and
  fish, puff puff, buns, chin chin, and cups of zobo, kunu and tiger nut milk
  are marked to be verified by local weighing.

## Stage 3: weekly meal-plan optimiser

Status: **`pending_clinical_validation`** (planner config `planner-1.0.0`).
Every plan is a **draft** carrying "Generated by decision-support software.
Review before clinical use." (`DRAFT_NOTICE`).

Code: `src/domains/nutrition/planner/`. Planning attributes of the foods and
dishes: `src/domains/nutrition/data/plannerCatalogue.ts`.

### API

| Function | Does |
|---|---|
| `buildPlanTargets(input)` | Targets from the stage 1 engine. Energy: `estimateEnergy` (the clinician's kcal or named method, else the preferred estimate, else Curreri in burns, else Harris–Benedict × activity × stress; a range at its midpoint). Protein: `estimateProtein` (low end of a range; high end for weight loss and catabolic states; CKD keeps the high end as a ceiling). Fluid: `estimateFluid`. Weight goal: `planWeightGoal`. Refeeding: `assessRefeedingRisk` → `refeedingSchedule`. Returns `refer`, `blocked`, `not_computable` or `ok`; every choice is written into `targets.derivation`. |
| `planWeeklyMeals(request)` | The plan: `{ status: 'draft', plan }`, `{ status: 'refer' }` (children, pregnancy, lactation, dialysis, PN), `{ status: 'blocked' }` (weight loss while catabolic without a `ClinicianOverride`; invalid targets or split) or `{ status: 'infeasible', conflicts, summary }`. |
| `checkVariety(plan)` | The variety rules, checked on a finished plan. |
| `toPatientPlan(plan, { igboLabels })` | Plain-English plan model: household measures, optional Igbo names, tips, source line. The PDF is stage 6. |
| `toNutritionPlanRecord` / `saveDraftMealPlan` | A `NutritionPlan` row: `status: 'draft'`, `approvalStatus: 'draft'`, `version` (revision + 1), the week in `mealPlans`/`weeklyMenu`, and the whole run in `optimiser` (request = inputs, plan, trace, planner/engine/dataset versions). Cloud column `nutrition_plans.optimiser JSONB` (migration `20261113120000_nutrition_meal_plan_optimiser.sql`). `NutritionPlan.status` gains `'draft'`, which `getActivePlan` never returns. |

`MealPlanRequest` = `{ patient, context?, targets, goal?, restrictions?, structure?, supplements?, seed?, bestEffort? }`.

- **restrictions**: `diabetes`; `sodiumMgMax`; `ckd { potassiumMgMax, phosphorusMgMax }` (when not given: 2346 mg = 60 mmol and 1000 mg, stated in the warnings); `texture` (`regular` < `soft` < `minced` < `pureed` < `liquid`); `fatGMax`; `allergies` (fish, shellfish, egg, milk, groundnut, tree nut, gluten); `religious` (`no_pork`, `no_alcohol`, `halal` = no pork or alcohol, `no_beef`, `vegetarian`); `avoid`/`prefer` (component ids or diet tags); `budget` (`low`/`medium`/`high`); `preparer` (`hospital_kitchen`: foods the kitchen makes; `family`: home/market); `fluidMlMax`; `heartFailure`.
- **structure**: `days` (1–7, default 7); `snacksPerDay` (2 or 3; 3 by default for weight gain and refeeding); `energySplit` (default breakfast 25%, lunch 30%, dinner 30%, snacks 15% shared equally); `dayLabels`.
- **supplements**: `mode` (`never` by default, `if_needed`, `always`); an `ons` and/or `enteral` product **with label values supplied by the caller** (no product values are built in); `oralIntakeFraction` (food capped at that share of the energy target, the rest from ONS/feed).

### Restrictions and foods

Recipes carry the diet tags of their ingredients (`INGREDIENT_TAGS`, by WAFCT
code): a fish allergy removes every soup with stockfish or crayfish; the beef
stock cube is tagged beef; refined groundnut oil groundnut; oats gluten;
coconut a tree nut. A recipe with at least 5 g sugar per portion is
`added_sugar`; zobo, kunu and tiger nut milk are `sugary_drink`; both are
excluded for diabetes. A food whose value for a **limited** nutrient is only a
lower bound (an unresolved ingredient or a missing table value) is excluded
under that limit, because the limit could not be shown to hold. Every
exclusion is in `trace.excluded` with its reason.

The catalogue adds lean pork (WAFCT 07_121, regenerated into the core subset)
so that "no pork" is a real restriction, and new household measures (egg,
bread slice, chicken piece, fruit, cooked vegetables, salad, teaspoon of oil),
all to be verified by local weighing. The planning attributes (role, meal
slots, portion unit and min/max, texture, cost tier, availability) are working
estimates pending dietitian review.

### Menu (variety by construction)

`menu.ts` picks the dishes; the solver sets the amounts.

Lunch and dinner patterns:

- swallow + soup (+ optional protein);
- one-pot dish (+ protein when it has none);
- staple + legume;
- pepper soup + staple;
- staple + protein;
- moi moi + staple;
- staple + vegetables (CKD only).

Breakfast is a breakfast dish (+ side) or a staple + protein. A meal under
250 kcal (refeeding days) tries a light one-item pattern first.

Rules:

- the same main dish at most **twice a week** (`MAX_MAIN_DISH_PER_WEEK`);
- lunch and dinner built on **different protein sources**, and if possible
  not the same as that meal the day before. A menu that has to repeat is used
  only when no other attempt works, and it is recorded in
  `trace.relaxations`;
- a **vegetable every day** (lunch, and dinner too for weight loss);
- **fruit every day** unless the restrictions allow none (then noted).

Candidates are ranked for the patient (cost tier; fried and sugary items
last; weight loss: lean, high protein per kcal; gain and refeeding:
energy-dense; CKD: low protein, K and P per kcal; sodium, carbohydrate and fat
per kcal under those limits; preferences) and rotated by how often they were
used that week. A pattern is skipped while another fits if its smallest
portions overshoot the meal, its largest cannot reach it, or its compulsory
items exceed the meal's share of a CKD protein ceiling.

### Solver formulation (per day)

javascript-lp-solver, one model per day. This decomposition keeps each solve
to about 20–35 variables and 50 constraints. (Meals are not solved
separately: the daily caps, protein and the diabetic spread couple them; the
per-meal energy split is a soft term instead.)

**Variables** (all ≥ 0), one per menu item, in "variable units":

- grams of a gram-weighed food (continuous);
- whole pieces: eggs, pieces of meat or fish, slices of bread, oranges (integer);
- recipe portion steps (integer): half portions only for dishes served by the
  ladle; whole portions for any dish whose portion includes a piece of meat or
  fish;
- ONS units (integer) and enteral mL (continuous);
- for optional items (snacks on very small days, extra protein, additions), a
  binary y with `min·y ≤ x ≤ max·y`.

**Hard constraint groups**: `energy_band` (±3% in the first solve, ±5% in
repair and in every re-check), `protein_min`, `protein_max` (CKD),
`carb_pct_max` or `diabetic_carb_pct` (45% of energy), `diabetic_meal_carb`
(no meal above 35% of the day's carbohydrate), `fat_pct_max` (35%),
`fat_g_max`, `sodium_max`, `potassium_max`, `phosphorus_max`, `fluid_max`,
`oral_fraction`, `portion_min`, `portion_max`.

**Soft terms** (penalised):

- distance from the energy target, 1 per kcal;
- each meal's distance from its share, 0.25 per kcal;
- shortfall below the lower carbohydrate (45%) and fat (20%) limits (IOM
  AMDR). The lower limits are soft so a high-protein plan stays feasible.

Each item also costs 0.01 × kcal × (2 + its ranking score); weight gain and
refeeding add a small cost per gram so energy-dense foods carry the surplus.

**Guards**:

- coefficients are rounded to 6 decimals;
- branch-and-bound has a 1.5 s limit and a 0.5% gap;
- the library's simplex phases have no limit of their own and were seen to
  cycle for ever on degenerate models, so each phase is capped at 5,000
  pivots. On the cap the model is solved again once with every inequality
  tightened by a distinct 1e-7 × i (lexicographic perturbation; tightening
  keeps the answer valid for the exact re-check).

**Bundle and timings.** The solver is imported statically: the legacy
`generateMealPlan` API is synchronous (it runs inside `useMemo` in the
calculators), and the solver is small (52 KB minified, 16 KB gzip) next to the
app's single 9.3 MB entry chunk. The whole stage (solver + planner + catalogue)
adds 117 KB (36 KB gzip) to the entry chunk (9,297 → 9,414 KB; gzip 2,347 →
2,382 KB). If stage 5 moves the planner to a lazy route or a worker, the solver
goes with it: only `planner/solve.ts` imports it. Timings on the development PC (Node, single
thread): a feasible 7-day plan takes 25–300 ms (the first day of a run
includes JIT warm-up, 5–130 ms; later days 3–40 ms); over 220 random property
cases the slowest single day, including retries and an infeasibility
explanation, was 1.3 s (the per-day attempt budget is 1.5 s). Expect a
mid-range phone to be several times slower.

### Rounding and repair

1. Solve (MILP, ±3%).
2. Round: gram foods to the nearest 5 g inside their limits; pieces, portions
   and ONS to whole units; feeds to 10 mL.
3. Re-check exactly from the rounded amounts: every hard group at ±5%, every
   portion limit.
4. If a check fails, re-solve with every whole-unit item and on/off decision
   **fixed** and the gram foods as integer counts of 5 g (`repaired_fixed`).
   Failing that, solve with everything on the grid (`repaired_grid`). The
   repaired answer is re-checked again. `plan.days[].solve.outcome` and
   `trace.relaxations` record what happened.

A day whose menu cannot be fitted gets up to 10 other menus (a deterministic
perturbation of the ranking, within a 1.5 s budget per day). With supplements
`if_needed` the same is then tried with the ONS/feed offered. Only then is the
day explained.

### Infeasibility explanation

- **Menu level** (nothing left to serve at a meal): a deletion filter over the
  restriction categories finds a minimal set that empties it (for example
  "texture modification"), or reports that the twice-a-week rule has used up
  the dishes the restrictions allow.
- **Solver level**: a deletion filter (Chinneck and Dravnieks) over the hard
  groups finds an irreducible conflicting set. It runs on the LP relaxation
  when that is itself infeasible, otherwise on the MILP with a 0.4 s limit per
  test. Portion limits are tested first, so a clinical limit is named when one
  is involved.
- For each member of the set, an elastic solve (only that group given slack,
  slack minimised) gives the relaxation that would fix the day on its own, for
  example "potassium would need about 537 mg more than the limit allows".
- An energy or protein conflict with no ONS configured adds "consider an oral
  nutritional supplement".

### Goal logic

- **Weight loss**: target = the stage 1 deficit (floors and the catabolic
  block come from `planWeightGoal`); protein at the high end of the engine
  range; lean, vegetable-rich and legume dishes first, fried last; at most one
  wrap of swallow per meal; no oil added; vegetables at lunch and dinner; the
  stage 1 trajectory.
- **Weight gain**: the stage 1 surplus; 3 snacks; energy-dense additions (palm
  oil, groundnut paste, milk powder), with eggs, milk and fortified akamu
  ranked first; ONS if allowed and needed; the trajectory.
- **Refeeding** (high or extreme risk): day N uses schedule day N; protein is
  advanced with energy (`refeedingProteinFollowsEnergy`, physician or
  dietitian to confirm); the stage 1 refeeding alerts are added to the plan's
  warnings; K, P and Mg are reported per item.
- **Burns / catabolic**: maintenance energy and the high end of the protein
  range. A weight-loss request is `blocked` without a `ClinicianOverride`
  (the stage 1 type), and allowed (and stated) with one.

### Output

Per item:

- name and `igboName` (only where certain, otherwise `''`);
- amount in its unit;
- raw and cooked grams, with `weightNote` saying which is given and why
  (WAFCT cooked entry ÷ yield; eaten as described; or, for recipes, the raw
  ingredient weight, the cooked weight being unknown until the yield is
  measured);
- household measure;
- kcal, protein, carbohydrate, fat;
- the relevant micronutrients: CKD → K, P, Na; heart failure or a sodium
  limit → Na; diabetes → fibre; refeeding → K, P, Mg; burns or a major wound →
  Zn, vitamin C, vitamin A; fluid restriction → water;
- lower-bound and pending-verification flags.

Also: meal totals; day totals and checks; drinking water to reach the fluid
target; weekly averages vs targets; the goal summary and trajectory;
warnings; assumptions; and the trace (constraints, each day's solver input,
relaxations, exclusions, timings, versions, seed).

`igboName` is a new optional field on `Food` and `Recipe` (cloud
`igbo_name`), set on 18 Enugu recipes. Igbo names of foods are in the
planner catalogue, since the WAFCT rows are generated.

### Consolidation

| Generator | Now | Behaviour change |
|---|---|---|
| `src/data/nigerianFoods.ts` `generateMealPlan(kcal, protein)` | Adapter over `planWeeklyMeals`; same `DayPlan[]` API; `optimisedMealPlan` exposes the full plan | The 7 fixed pools and the greedy protein top-up loop are gone. Energy is within ±5% and protein at least the target every day (before: pools plus up to 6 top-ups, no tolerance). Dishes vary by the rules above; quantities are optimised and rounded. Targets the optimiser cannot meet get its best-effort plan. Energy ≤ 0 returns `[]`. Igbo names are appended to item names where known. |
| clinician-assistant `woundHealingMealPlan` | Passes `diabetes` and `ckd` to the optimiser | The plan now honours the modifications the panel lists (no sugar-sweetened items, carbohydrate cap; CKD K/P limits), not only the text. |
| clinician-assistant `weightLossMealPlan` | `goal: 'loss'` | Weight-loss ranking (lean, vegetables, swallow capped, no added oil). |
| `CalculatorPanels` `NutritionPanel` / `MealPlanDays`; `BedsideCalculators` | Through `generateMealPlan` | As above. |
| `nutritionPlannerService.createMealPlan` | Slot energy split from `ACTIVE_PLANNER_CONFIG.defaultEnergySplit` | 25/10/30/10/25 → 25/7.5/30/7.5/30. |

**UI-level generators still to rewire (stage 5):**

- `admissions/components/MealPlanGenerator.tsx` (`generateDayMeals`: random picks from `mealGeneratorFoods`);
- `nutrition/pages/NutritionPlannerPage.tsx` (calls `createMealPlan`, which returns empty meal slots);
- `calculators/pages/calculators/NutritionCalculator.tsx` (`generateAfricanMealPlan`, a fixed day);
- `calculators/pages/calculators/WoundMealPlanCalculator.tsx` (a hard-coded `weeklyMealPlan`);
- `calculators/pages/calculators/WeightGainCalculator.tsx` and `WeightLossCalculator.tsx` (meal plans written inline for the PDF);
- `nutrition/pages/NutritionPage.tsx` (manual meal builder; should start from the optimiser plan).

### What the dietitian must verify (stage 3)

1. The planning attributes in `plannerCatalogue.ts`: portion min/max and units, texture levels, cost tiers, availability, protein-source labels.
2. The new household measures.
3. Planner config: the diabetic 45% cap and 35% per meal, the CKD defaults, fat ≤ 35%, the weight-loss swallow cap, protein following energy during refeeding.
4. The Igbo names.
