# Procedure review templates — consultant sign-off checklist

Every clinical number below is either a **local / unit choice** or an
**extrapolation** that the template authors and the independent safety review
could not tie to a single published threshold. Published, cited thresholds
(NEWS2, Caprini, MUST, WIfI, SINBAD, LRINEC, AJCC 8, Green Book tetanus, BOAST,
IWGDF/IDSA 2023, NICE NG89/NG12/NG14, ABLS fluids, …) are cited in the code and
are not repeated here.

Tick each line (agree / change to …) and return it; changes are one-line edits
in the file named.

## Core (`core/*.ts`, `coreRules.ts`, `services/preoperativeService.ts`)

- [ ] HbA1c > 8.5 % defers elective surgery; glucose < 4 red, > 12 amber, target 6–10 mmol/L (CPOC/JBDS — confirm locally)
- [ ] Herbal remedies stopped 2 weeks pre-op
- [ ] Platelets < 100 → "avoid neuraxial" (many units use 75–80)
- [ ] Anticoagulant hold/restart table (warfarin 5 d; DOAC 24/48 h; dabigatran not renally adjusted; aspirin 7 d major; clopidogrel 5–7 d) — **confirm against local protocol**
- [ ] VTE: enoxaparin 40 mg daily, first dose 6–12 h post-op, 7 days or until mobile; reduced < CrCl 30; weight-adjusted at BMI ≥ 40
- [ ] Albumin < 35 g/L flagged, < 30 "severe"; prealbumin < 150 mg/L
- [ ] Pain ≥ 7/10 triggers review; analgesia 30–60 min before dressings; pain rise ≥ 2 flagged at follow-up
- [ ] Wound: < 40 % area reduction at 4 weeks = non-healing (Sheehan's DFU figure is ~53 %); measure every 2 weeks; biopsy if > 3 months
- [ ] Pregnancy caution for females 12–50; "≥ 3 healing barriers" and "travel > 2 h" cautions
- [ ] Age gates: PHQ 13, GAD 12, MUST/4AT 18, VTE drug prophylaxis 16, CFS 65, NEWS2 16, pregnancy and substances 12, Apfel 3, safeguarding < 18
- [ ] NSAIDs barred < 3 months or < 5 kg; child hypoglycaemia 0.3 g/kg oral, IV 10 % glucose 2 mL/kg
- [ ] Tetanus: childhood vaccine named under 10 years
- [ ] Body-image screen uses original wording (BDDQ is copyrighted) — license BDDQ instead?

## Reconstruction

- [ ] **Skin graft:** take < 80 % "below expected", < 50 % poor; first inspection day 3–7; donor dressing 10–14 days; follow-up 3/6/12 months
- [ ] **Local / pedicled flap:** compromised flap obs every 30–60 min; routine hourly 24 h then 2–4-hourly; pedicle division ~3 weeks; revision ≥ 3 months; age ≥ 60 as reverse-sural risk
- [ ] **Free flap:** obs hourly to 24 h, 2-hourly to 72 h, then 4-hourly; Hct 30–35 %; flap failure 1–5 %, return to theatre 5–10 % (consent); debulking after 3–6 months; verify the ERAS (Dort 2017) vasopressor citation
- [ ] **Pressure-sore flap:** bed rest 2–6 weeks before sitting; "redness not faded in ~30 min" = step back; sutures weeks 2–3; recurrence 10–40 %
- [ ] **Scalp:** < 3 / 3–10 / > 10 cm bands (Leedy, as prompt); hair washing from 48 h; tissue expansion 6–12 weeks
- [ ] **Contracture release:** defer until scar maturity (often ≥ 12 months); therapy within 2 weeks; VSS worsening by 2 flagged; yearly review in children
- [ ] **Cleft:** palate repair 6–12 months (26–78 weeks); arm splints 2–3 weeks; speech at 3 and 5 years; alveolar bone-graft prompt from age 7; URTI window 2–4 weeks; first-night oximetry
- [ ] **Breast / body:** weight stable 3–6 months; 12–18 months after bariatric surgery; binder 6 weeks; revision 6–12 months; fat-embolism window 72 h

## Oncology

- [ ] **Skin tumour:** Marjolin margin ≥ 2 cm (no guideline); high-risk BCC "≥ 5 mm or margin control" — verify vs BAD 2021; low-risk BCC discharge after one review — verify; albinism/transplant skin checks every 3–6 months; sutures face 5–7 d, body 10–14 d
- [ ] **Melanoma:** nodal US every 3–4 months where SLNB unavailable (extrapolated from MSLT-II); SLNB consent: seroma 2–6 %, lymphoedema < 1 % (1.5–5 % groin), dye anaphylaxis 0.1–1 %
- [ ] **Scalp tumour:** CT/MRI trigger at ≥ 4 cm; adjuvant RT within 6 weeks (extrapolated); staged excision 2–7 days
- [ ] **Soft-tissue lesion:** inflamed cyst excised 4–6 weeks after settling; sarcoma red-flag count is unvalidated (labelled as such)
- [ ] **Keloid:** steroid at closure then every 4–6 weeks; triamcinolone ≤ 40 mg/session adult, ~1 mg/kg child; pressure ≥ 12 h/day 6–12 months; silicone 3–6 months; review 3-monthly 12–24 months; RT doses (JSW 2018) are clinical oncology's decision
- [ ] **Vascular anomaly:** propranolol 1 → 2 (max 3) mg/kg/day, holds < 2 kg or 2nd/3rd-degree block; LMWH ~10 days either side of VM procedure (Dompmartin 2008); AVM excision 24–72 h after embolisation; airway watch 24–72 h after head/neck sclerotherapy

## Limb, hand and burns

- [ ] **Diabetic foot:** amputation ~1 in 5 moderate/severe infections; recurrence ~40 % at 1 year; ketones if glucose > 14 (JBDS uses 12); antibiotic-free window "a few days"; **NSAIDs in grade 3–4 infection — bar them? (`avoidNsaids` hook ready)**
- [ ] **Amputation:** limb-disposal question; clostridial prophylaxis line; one education record (LIMB-002) used for all levels
- [ ] **Tendon:** rupture ~4–6 %; amber at 1–3 weeks, graft/staged > 3 weeks; light work ~6 weeks, heavy ~12; tenolysis ≥ 3 months; immobilise under ~10 years
- [ ] **Nerve / hand:** digit ischaemia 12 h warm / 24 h cold, muscle 6 h / 12 h; explore if Tinel not advancing by ~3 months; transfer if M0–M1 at 52 weeks; age ≥ 50 consent modifier
- [ ] **Burns:** child = under 16 (ABLS uses ≤ 14 / < 40 kg); major burn 20 % adult / 10 % child (UK uses 15 %); anabolic prompt ≥ 40 % TBSA; cross-match at 10 % excision; graft take < 80 %; CoHb > 10 % red flag
- [ ] **NSTI:** death "about 1 in 5" (uncited); protein ≥ 1.3 g/kg; **paediatric fluid regimen (adult 30 mL/kg + noradrenaline used) — decide**
- [ ] **NPWT:** caution above −150 mmHg; −75 to −80 for children/grafts/near vessels; lidocaine before removal max 3 mg/kg plain

## Known limitations (not hazards, tracked)

- Declined urgent lines are labelled "DECLINED" in the PDF rather than drawn struck through.
- Wound-care ABPI lines overlap the core perfusion line.
- Missing catalogue entries: fees for SLNB, Mohs, sclerotherapy, NPWT; education records for NMSC, scalp tumour, vascular anomaly, tendon, nerve, flaps.
