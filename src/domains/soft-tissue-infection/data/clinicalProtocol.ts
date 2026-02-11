// ============================================
// Soft Tissue Infection / Necrotizing (STI/NEC)
// WHO-Adapted Clinical Protocol Data
// Comprehensive Evidence-Based Management Guide
// ============================================

import type { STIEducationContent} from '../types';

// ============================================
// LRINEC SCORE LOOKUP TABLE
// Laboratory Risk Indicator for Necrotizing Fasciitis
// Wong CH, et al. Crit Care Med. 2004;32(7):1535-1541
// ============================================
export const LRINEC_CRITERIA = {
  crp: [
    { range: '< 150 mg/L', points: 0 },
    { range: '≥ 150 mg/L', points: 4 },
  ],
  wbc: [
    { range: '< 15 × 10³/µL', points: 0 },
    { range: '15 – 25 × 10³/µL', points: 1 },
    { range: '> 25 × 10³/µL', points: 2 },
  ],
  hemoglobin: [
    { range: '> 13.5 g/dL', points: 0 },
    { range: '11 – 13.5 g/dL', points: 1 },
    { range: '< 11 g/dL', points: 2 },
  ],
  sodium: [
    { range: '≥ 135 mmol/L', points: 0 },
    { range: '< 135 mmol/L', points: 2 },
  ],
  creatinine: [
    { range: '≤ 141 µmol/L', points: 0 },
    { range: '> 141 µmol/L', points: 2 },
  ],
  glucose: [
    { range: '≤ 10 mmol/L', points: 0 },
    { range: '> 10 mmol/L', points: 1 },
  ],
};

export const LRINEC_INTERPRETATION = {
  low: { range: '≤ 5', risk: 'Low Risk', probability: '< 50% probability of NSTI', action: 'Monitor closely, consider non-necrotizing cause' },
  moderate: { range: '6 – 7', risk: 'Moderate Risk', probability: '50–75% probability of NSTI', action: 'Urgent surgical consultation; repeat labs in 6–12h' },
  high: { range: '≥ 8', risk: 'High Risk', probability: '> 75% probability of NSTI', action: 'Emergency surgical exploration; PPV 93.4%' },
};

// ============================================
// DISEASE STAGING - Modified from WHO Guidelines
// ============================================
export const STI_STAGES = [
  {
    stage: 'Stage 1',
    name: 'Early Cellulitis',
    code: 'early_cellulitis',
    description: 'Localized erythema, warmth, tenderness without systemic signs',
    clinicalFeatures: [
      'Well-demarcated erythema < 10cm',
      'Skin warmth and tenderness',
      'No systemic symptoms',
      'Intact skin or minor portal of entry',
      'No crepitus or bullae',
    ],
    management: 'Outpatient oral antibiotics',
    urgency: 'Routine – 24-48 hour follow-up',
    mortality: '< 1%',
  },
  {
    stage: 'Stage 2',
    name: 'Advancing Infection',
    code: 'advancing_infection',
    description: 'Spreading cellulitis with early systemic signs, lymphangitis',
    clinicalFeatures: [
      'Expanding erythema > 10cm or crossing joint',
      'Lymphangitis (red streaking)',
      'Regional lymphadenopathy',
      'Low-grade fever (37.5–38.5°C)',
      'Mild leukocytosis',
    ],
    management: 'IV antibiotics, close monitoring',
    urgency: 'Urgent – Hospital admission recommended',
    mortality: '1–5%',
  },
  {
    stage: 'Stage 3',
    name: 'Suppurative / Abscess',
    code: 'suppurative',
    description: 'Collection formation with purulent material, possible deep tissue involvement',
    clinicalFeatures: [
      'Fluctuant swelling',
      'Pointing abscess',
      'Fever > 38.5°C',
      'Moderate leukocytosis',
      'Localized tissue destruction',
    ],
    management: 'Incision and drainage + IV antibiotics',
    urgency: 'Urgent – same-day surgical intervention',
    mortality: '2–5%',
  },
  {
    stage: 'Stage 4',
    name: 'Necrotizing Infection',
    code: 'necrotizing',
    description: 'Fascial/muscle necrosis, rapid tissue destruction',
    clinicalFeatures: [
      'Pain out of proportion to clinical findings (hallmark)',
      'Dusky/violaceous skin changes',
      'Hemorrhagic bullae',
      'Crepitus (gas gangrene)',
      'Rapid progression (> 1cm/hour)',
      'Dishwater-grey wound discharge',
      'Skin anesthesia (nerve destruction)',
      'Positive "finger test" (easy dissection along fascial planes)',
    ],
    management: 'Emergency radical debridement + broad-spectrum IV antibiotics + ICU care',
    urgency: 'EMERGENCY – Take to OR within 1 hour',
    mortality: '25–35%',
  },
  {
    stage: 'Stage 5',
    name: 'Systemic Sepsis',
    code: 'systemic_sepsis',
    description: 'Sepsis syndrome with organ dysfunction',
    clinicalFeatures: [
      'qSOFA ≥ 2 (altered mentation, SBP ≤ 100, RR ≥ 22)',
      'Hypotension requiring vasopressors',
      'Tachycardia > 120 bpm',
      'Temperature > 39°C or < 36°C',
      'Metabolic acidosis (lactate > 2 mmol/L)',
      'Oliguria < 0.5 mL/kg/hr',
      'Coagulopathy (DIC)',
    ],
    management: 'Emergency debridement + ICU: vasopressors, mechanical ventilation, RRT',
    urgency: 'EMERGENCY – Activate sepsis protocol (Surviving Sepsis Campaign)',
    mortality: '40–60%',
  },
  {
    stage: 'Stage 6',
    name: 'Multi-Organ Failure',
    code: 'multi_organ_failure',
    description: 'Sequential organ failure despite aggressive treatment',
    clinicalFeatures: [
      'SOFA score ≥ 6',
      'Renal failure (Cr > 3× baseline, UO < 200mL/12h)',
      'Hepatic failure (bilirubin > 12 mg/dL)',
      'Respiratory failure (PaO₂/FiO₂ < 200)',
      'Cardiovascular collapse (refractory shock)',
      'Hematologic failure (platelets < 50,000)',
      'Neurological failure (GCS < 10)',
    ],
    management: 'Maximal ICU support, serial debridement, family counseling',
    urgency: 'CRITICAL – High mortality, consider palliative care discussion',
    mortality: '> 70%',
  },
];

// ============================================
// CLASSIFICATION SYSTEM
// ============================================
export const STI_CLASSIFICATIONS = [
  {
    type: 'simple_cellulitis',
    name: 'Simple Cellulitis',
    description: 'Non-purulent bacterial skin infection affecting dermis and subcutaneous tissue',
    commonOrganisms: ['Streptococcus pyogenes (GAS)', 'Staphylococcus aureus'],
    keyFeatures: ['Well-defined erythema', 'Warmth', 'Tenderness', 'No fluctuance'],
    differentials: ['DVT', 'Contact dermatitis', 'Erysipelas', 'Gout'],
  },
  {
    type: 'complicated_cellulitis',
    name: 'Complicated Cellulitis',
    description: 'Cellulitis with systemic signs or in immunocompromised host',
    commonOrganisms: ['S. aureus (including MRSA)', 'Streptococcus spp.', 'Gram-negatives in diabetics'],
    keyFeatures: ['Spreading > 10cm', 'Systemic signs', 'Failed oral therapy', 'Immunocompromised host'],
    differentials: ['Necrotizing fasciitis', 'Osteomyelitis', 'Pyomyositis'],
  },
  {
    type: 'abscess',
    name: 'Subcutaneous Abscess',
    description: 'Walled-off collection of purulent material',
    commonOrganisms: ['S. aureus (60%)', 'MRSA (community)', 'Mixed anaerobes'],
    keyFeatures: ['Fluctuance', 'Pointing', 'Surrounding cellulitis', 'Fever'],
    differentials: ['Infected sebaceous cyst', 'Hematoma', 'Lymphadenitis'],
  },
  {
    type: 'necrotizing_fasciitis_type1',
    name: 'Necrotizing Fasciitis Type I (Polymicrobial)',
    description: 'Synergistic mixed aerobic-anaerobic deep tissue infection, most common type',
    commonOrganisms: ['Mixed: Bacteroides, Clostridium, E. coli, Klebsiella, Peptostreptococcus, Enterococci'],
    keyFeatures: ['Diabetics/immunocompromised', 'Post-operative', 'Perineal (Fournier\'s)', 'Mixed flora on culture'],
    differentials: ['Deep abscess', 'Myonecrosis', 'Pyomyositis'],
  },
  {
    type: 'necrotizing_fasciitis_type2',
    name: 'Necrotizing Fasciitis Type II (Monomicrobial)',
    description: 'Single-organism rapidly progressive infection, typically Streptococcal',
    commonOrganisms: ['Group A Streptococcus (GAS)', 'Occasionally S. aureus'],
    keyFeatures: ['Young healthy patients', 'Minor trauma/portal of entry', 'Streptococcal toxic shock', 'Rapid progression'],
    differentials: ['Type I NF', 'Gas gangrene', 'Streptococcal cellulitis'],
  },
  {
    type: 'necrotizing_fasciitis_type3',
    name: 'Necrotizing Fasciitis Type III (Gas Gangrene)',
    description: 'Clostridial myonecrosis with gas formation',
    commonOrganisms: ['Clostridium perfringens (80%)', 'C. novyi', 'C. septicum'],
    keyFeatures: ['Rapid onset (< 24h)', 'Crepitus', 'Bronze/dark skin discoloration', 'Sweet/foul smell', 'Severe toxemia'],
    differentials: ['Type I NF with gas', 'Necrotizing myositis'],
  },
  {
    type: 'fournier_gangrene',
    name: 'Fournier\'s Gangrene',
    description: 'Necrotizing fasciitis of the perineal, perianal, and genital regions',
    commonOrganisms: ['Polymicrobial (E. coli, Bacteroides, Streptococcus, Staphylococcus, Clostridium)'],
    keyFeatures: ['Perineal pain out of proportion', 'Scrotal/vulvar edema', 'Crepitus', 'Rapid progression to necrosis', '4:1 male predominance'],
    differentials: ['Perianal abscess', 'Bartholin abscess', 'Epididymoorchitis', 'Inguinal hernia'],
  },
  {
    type: 'gas_gangrene',
    name: 'Gas Gangrene (Clostridial Myonecrosis)',
    description: 'Rapidly progressive myonecrosis caused by Clostridium species',
    commonOrganisms: ['Clostridium perfringens', 'C. novyi', 'C. septicum (spontaneous)'],
    keyFeatures: ['Incubation 6-48 hours', 'Intense pain', 'Tachycardia disproportionate to fever', 'Bronze then black skin', 'Crepitus on palpation', 'Sweet/sickly odor'],
    differentials: ['Necrotizing fasciitis', 'Necrotizing myositis', 'Anaerobic cellulitis'],
  },
  {
    type: 'pyomyositis',
    name: 'Pyomyositis',
    description: 'Primary bacterial infection of skeletal muscle, usually forming abscess',
    commonOrganisms: ['S. aureus (90% in tropics)', 'Streptococcus', 'Gram-negatives'],
    keyFeatures: ['Tropical pyomyositis common in Africa', 'Deep woody induration', 'Muscle abscess on imaging', 'Often quadriceps/iliopsoas'],
    differentials: ['Necrotizing fasciitis', 'Deep cellulitis', 'Rhabdomyolysis', 'Muscle hematoma'],
  },
];

// ============================================
// EMPIRIC ANTIBIOTIC PROTOCOLS
// WHO-Adapted for African (Nigerian) Context
// ============================================
export const ANTIBIOTIC_PROTOCOLS = {
  simple_cellulitis: {
    firstLine: [
      { name: 'Flucloxacillin', dose: '500mg', route: 'PO' as const, frequency: '6-hourly', duration: '7–10 days', category: 'empiric' as const, indication: 'Anti-staphylococcal penicillin - first line for cellulitis' },
    ],
    alternative: [
      { name: 'Cephalexin', dose: '500mg', route: 'PO' as const, frequency: '6-hourly', duration: '7–10 days', category: 'empiric' as const, indication: 'Alternative if flucloxacillin unavailable' },
      { name: 'Clindamycin', dose: '300-450mg', route: 'PO' as const, frequency: '8-hourly', duration: '7–10 days', category: 'empiric' as const, indication: 'If penicillin allergy / suspected MRSA' },
    ],
    penicillinAllergy: [
      { name: 'Clarithromycin', dose: '500mg', route: 'PO' as const, frequency: '12-hourly', duration: '7 days', category: 'empiric' as const, indication: 'NICE-recommended alternative for penicillin allergy' },
    ],
  },
  complicated_cellulitis: {
    firstLine: [
      { name: 'Flucloxacillin', dose: '1–2g', route: 'IV' as const, frequency: '6-hourly', duration: '5–7 days IV then step-down', category: 'empiric' as const, indication: 'High-dose IV for spreading cellulitis' },
      { name: 'Benzylpenicillin', dose: '1.2g (2MU)', route: 'IV' as const, frequency: '6-hourly', duration: '5–7 days', category: 'empiric' as const, indication: 'Added for streptococcal coverage' },
    ],
    alternative: [
      { name: 'Ceftriaxone', dose: '2g', route: 'IV' as const, frequency: '24-hourly', duration: '7–14 days', category: 'empiric' as const, indication: 'Broad-spectrum alternative, once-daily dosing' },
    ],
  },
  necrotizing_fasciitis: {
    firstLine: [
      { name: 'Meropenem', dose: '1g', route: 'IV' as const, frequency: '8-hourly', duration: '14–21 days', category: 'empiric' as const, indication: 'Broad-spectrum carbapenem for polymicrobial NSTI' },
      { name: 'Clindamycin', dose: '600–900mg', route: 'IV' as const, frequency: '8-hourly', duration: '14–21 days', category: 'adjunct' as const, indication: 'Inhibits toxin production (Eagle effect); essential in GAS NSTI' },
      { name: 'Vancomycin', dose: '15–20mg/kg', route: 'IV' as const, frequency: '12-hourly', duration: '14–21 days', category: 'empiric' as const, indication: 'MRSA coverage; trough target 15–20 µg/mL' },
    ],
    alternative: [
      { name: 'Piperacillin-Tazobactam', dose: '4.5g', route: 'IV' as const, frequency: '6-hourly', duration: '14–21 days', category: 'empiric' as const, indication: 'Alternative broad-spectrum if meropenem unavailable' },
      { name: 'Linezolid', dose: '600mg', route: 'IV' as const, frequency: '12-hourly', duration: '14 days max', category: 'empiric' as const, indication: 'Alternative MRSA coverage if vancomycin contraindicated' },
    ],
  },
  gas_gangrene: {
    firstLine: [
      { name: 'Benzylpenicillin', dose: '2.4g (4MU)', route: 'IV' as const, frequency: '4-hourly', duration: '14–21 days', category: 'empiric' as const, indication: 'High-dose penicillin for Clostridial species' },
      { name: 'Clindamycin', dose: '900mg', route: 'IV' as const, frequency: '8-hourly', duration: '14–21 days', category: 'adjunct' as const, indication: 'Inhibits toxin production; synergistic with penicillin' },
      { name: 'Metronidazole', dose: '500mg', route: 'IV' as const, frequency: '8-hourly', duration: '14–21 days', category: 'adjunct' as const, indication: 'Anaerobic coverage' },
    ],
  },
  fournier_gangrene: {
    firstLine: [
      { name: 'Meropenem', dose: '1g', route: 'IV' as const, frequency: '8-hourly', duration: '14–21 days', category: 'empiric' as const, indication: 'Broad polymicrobial coverage for FG' },
      { name: 'Clindamycin', dose: '600–900mg', route: 'IV' as const, frequency: '8-hourly', duration: '14–21 days', category: 'adjunct' as const, indication: 'Anti-toxin + anaerobic coverage' },
      { name: 'Vancomycin', dose: '15–20mg/kg', route: 'IV' as const, frequency: '12-hourly', duration: '14–21 days', category: 'empiric' as const, indication: 'MRSA coverage' },
    ],
  },
  diabetic_patient: {
    modifier: [
      { name: 'Add Metronidazole', dose: '500mg', route: 'IV' as const, frequency: '8-hourly', duration: 'Course dependent', category: 'adjunct' as const, indication: 'Enhanced anaerobic coverage for diabetic foot/soft tissue infections' },
    ],
    notes: 'Ensure tight glycemic control (target 6–10 mmol/L). Check HbA1c. Adjust insulin regimen. Use variable-rate insulin infusion if septic.',
  },
  renal_impairment_adjustments: {
    meropenem: 'GFR 26-50: 1g q12h; GFR 10-25: 500mg q12h; GFR <10: 500mg q24h',
    vancomycin: 'Dose by trough levels (target 15-20 µg/mL); extend interval to q24-48h based on GFR',
    flucloxacillin: 'No adjustment needed (hepatically metabolized)',
    clindamycin: 'No adjustment needed',
    metronidazole: 'Reduce dose by 50% if GFR < 10',
  },
};

// ============================================
// REQUIRED LABORATORY PANEL BY SEVERITY
// ============================================
export const REQUIRED_LABS = {
  mild: {
    tests: ['FBC', 'CRP', 'Blood Glucose', 'Wound Swab MCS'],
    imaging: [],
    frequency: 'At presentation and 48h review',
  },
  moderate: {
    tests: ['FBC', 'CRP/ESR', 'U&E/Creatinine', 'LFT', 'Blood Glucose', 'Blood Culture (×2)', 'Wound Swab MCS', 'Urinalysis'],
    imaging: ['X-ray (soft tissue gas)'],
    frequency: 'Daily for first 3 days, then alternate days',
  },
  severe: {
    tests: ['FBC', 'CRP', 'Procalcitonin', 'U&E/Creatinine', 'LFT', 'Blood Glucose', 'Lactate', 'ABG', 'Blood Culture (×2)', 'Wound Swab MCS', 'Tissue for MCS', 'Coagulation Profile', 'D-Dimer', 'LDH', 'Urinalysis', 'HbA1c (if DM)'],
    imaging: ['X-ray (soft tissue gas)', 'CT with contrast (fascial tracking)', 'Ultrasound (fluid collections)'],
    frequency: 'Every 6–12 hours for first 48h, then 12-hourly',
  },
  critical: {
    tests: ['All severe panel', 'Serial Lactate (q4h)', 'Serial CRP', 'Serial Procalcitonin', 'TEG/ROTEM (if coagulopathic)', 'Troponin', 'Pro-BNP', 'Cortisol'],
    imaging: ['CT with contrast', 'MRI (if diagnostic uncertainty)', 'Echocardiography (if septic shock)'],
    frequency: 'Every 4–6 hours until stable',
  },
};

// ============================================
// SURGICAL DECISION ALGORITHM
// ============================================
export const SURGICAL_ALGORITHM = [
  {
    indication: 'Suspected NSTI (LRINEC ≥ 6 OR clinical suspicion)',
    action: 'Emergency surgical exploration within 1 hour',
    procedure: 'Wide incision, fascial assessment, radical debridement of all necrotic tissue',
    endpoints: 'Debride until viable bleeding tissue reached in all directions',
    note: 'Do NOT delay surgery for imaging – clinical suspicion is sufficient',
  },
  {
    indication: 'Confirmed abscess > 3cm',
    action: 'Urgent incision and drainage',
    procedure: 'Incision over point of maximal fluctuance, break all loculations, thorough washout',
    endpoints: 'Complete drainage, washout, packing or drain placement',
    note: 'Send pus for MC&S. Consider Penrose drain for large cavities',
  },
  {
    indication: 'Gas gangrene confirmed',
    action: 'Emergency debridement ± amputation',
    procedure: 'Wide radical excision of all affected muscle; amputation if limb non-viable',
    endpoints: 'All non-contracting, discolored muscle excised; muscle must twitch, bleed, and be viable color',
    note: 'Mortality increases 25% for each hour delay. Consider HBOT post-operatively',
  },
  {
    indication: 'Fournier\'s gangrene',
    action: 'Emergency perineal debridement',
    procedure: 'Aggressive debridement of perineum/scrotum/vulva, diverting colostomy if extensive perianal involvement',
    endpoints: 'All necrotic tissue removed, viable wound bed established',
    note: 'Consider suprapubic catheter. Scrotal skin often regenerates if testes viable. Serial debridement Q24–48h.',
  },
  {
    indication: 'Re-look / Second look surgery',
    action: 'Planned return to theatre at 24–48 hours',
    procedure: 'Re-assessment of wound bed, further debridement of any new necrosis',
    endpoints: 'Clean wound bed with granulation tissue forming',
    note: 'Average 3–4 debridements needed for NSTI. Poor prognostic sign if necrosis still advancing',
  },
];

// ============================================
// COMORBIDITY-SPECIFIC MODIFICATIONS
// ============================================
export const COMORBIDITY_MODIFICATIONS = {
  diabetes: {
    risks: ['3–4× higher risk of NSTI', 'Impaired wound healing', 'Silent ischemia', 'Impaired immune response', 'Neuropathy masking pain'],
    management: [
      'Variable-rate insulin infusion (VRII) if septic – target glucose 6–10 mmol/L',
      'Convert to subcutaneous insulin when eating reliably',
      'Check HbA1c on admission',
      'Daily capillary blood glucose monitoring (QDS minimum)',
      'Diabetic foot assessment if lower limb involved',
      'Nephrology referral if renal impairment present',
      'Close monitoring for DKA/HHS, especially in Type 1 DM',
    ],
  },
  jaundice: {
    risks: ['Impaired coagulation', 'Increased infection risk', 'Delayed wound healing', 'Hepatorenal syndrome risk'],
    management: [
      'Correct coagulopathy: Vitamin K 10mg IV × 3 days',
      'FFP if INR > 1.5 and surgery needed',
      'Avoid hepatotoxic drugs (paracetamol dose max 2g/day)',
      'Monitor bilirubin trend',
      'Hepatology consultation if decompensated',
      'N-acetylcysteine infusion if paracetamol-induced',
    ],
  },
  renal_impairment: {
    risks: ['Impaired drug clearance', 'Fluid overload', 'Electrolyte imbalance', 'Impaired immune function', 'Uremia delays healing'],
    management: [
      'Dose-adjust all renally excreted antibiotics (see protocol)',
      'Avoid nephrotoxic agents (aminoglycosides, NSAIDs)',
      'Monitor fluid balance strictly (input/output chart)',
      'Daily U&E, creatinine, GFR calculation',
      'Early nephrology referral if AKI developing',
      'Consider RRT if severe AKI (K+ > 6.5, pH < 7.1, fluid overload)',
    ],
  },
  sepsis: {
    risks: ['30-day mortality 25–50% for NSTI + sepsis', 'Multi-organ failure', 'DIC', 'ARDS'],
    management: [
      'Hour-1 bundle (Surviving Sepsis Campaign 2021):',
      '  - Measure lactate (remeasure if > 2 mmol/L)',
      '  - Blood cultures before antibiotics',
      '  - Broad-spectrum antibiotics within 1 hour',
      '  - 30 mL/kg crystalloid for hypotension or lactate ≥ 4',
      '  - Vasopressors for MAP < 65 mmHg after fluid resuscitation',
      'ICU admission mandatory',
      'Central venous access and arterial line',
      'Consider hydrocortisone 200mg/day if refractory shock',
      'Lung-protective ventilation if intubated',
      'DVT prophylaxis: enoxaparin 40mg SC daily (adjust for renal)',
      'Stress ulcer prophylaxis: PPI (omeprazole 40mg IV)',
      'Blood glucose control: target 6–10 mmol/L',
      'Early enteral nutrition within 24–48h',
    ],
  },
};

// ============================================
// EDUCATION CONTENT
// ============================================
export const STI_EDUCATION_CONTENT: STIEducationContent = {
  patientEducation: {
    overview: 'Soft tissue infections are bacterial infections of the skin and underlying tissues. They range from simple cellulitis (skin infection) to life-threatening necrotizing infections. Early recognition and treatment are essential for good outcomes.',
    warningSigns: [
      'Rapidly spreading redness or swelling beyond the initial area',
      'Severe pain that seems worse than the visible infection',
      'Skin turning dark purple, black, or developing blisters',
      'Crackling sensation when pressing on the skin (crepitus)',
      'High fever (> 38.5°C) with chills and rigors',
      'Feeling confused, very drowsy, or difficulty breathing',
      'Foul-smelling wound discharge',
      'Numbness or loss of sensation around the wound',
      'Reduced urine output or dark-colored urine',
    ],
    woundCareInstructions: [
      'Keep the wound clean and dry',
      'Change dressings as instructed by your healthcare team',
      'Wash hands thoroughly before and after touching the wound',
      'Do not remove packing material unless instructed',
      'Take all prescribed antibiotics – complete the full course even if feeling better',
      'Elevate the affected limb when possible',
      'Avoid tight clothing or bandages that restrict blood flow',
      'Do not apply herbal remedies or traditional medicine to the wound without discussing with your doctor',
    ],
    medicationAdherence: [
      'Take antibiotics exactly as prescribed (same time each day)',
      'Complete the full course – do not stop when you feel better',
      'Do not share antibiotics with others',
      'If you miss a dose, take it as soon as you remember (unless close to next dose)',
      'Report any side effects (rash, diarrhea, nausea) to your healthcare team',
      'Take pain medication as prescribed – do not exceed recommended dose',
      'If diabetic, monitor blood sugar more frequently during infection',
    ],
    nutritionAdvice: [
      'Eat a high-protein diet to promote wound healing (eggs, beans, fish, meat)',
      'Drink plenty of water (at least 2 liters per day)',
      'Include fruits and vegetables rich in Vitamin C (oranges, guava, tomatoes)',
      'Foods rich in zinc (nuts, seeds, whole grains) aid wound healing',
      'If diabetic, maintain consistent carbohydrate intake',
      'Avoid alcohol during antibiotic treatment',
      'If you have poor appetite, eat small frequent meals',
    ],
    whenToSeekHelp: [
      'Redness spreading despite treatment (mark the boundary with pen to track)',
      'New blisters or skin discoloration',
      'Increasing pain or pain not controlled by medication',
      'Fever returning or getting worse',
      'Wound discharge increasing or changing color/smell',
      'Feeling generally unwell, confused, or extremely tired',
      'Reduced urination',
      'New symptoms: chest pain, difficulty breathing',
    ],
    preventionStrategies: [
      'Keep skin clean and moisturized to prevent cracks',
      'Treat any cuts, scrapes, or insect bites promptly with antiseptic',
      'Manage diabetes well – keep blood sugar controlled',
      'Wear protective footwear, especially if diabetic',
      'Do not ignore minor skin infections – seek early treatment',
      'Maintain good nutrition and hygiene',
      'Avoid sharing personal items (towels, razors)',
      'If you have recurrent infections, discuss with your doctor about preventive antibiotics',
    ],
    diabeticFootCare: [
      'Inspect feet daily for cuts, blisters, redness, or swelling',
      'Wash feet daily with warm (not hot) water',
      'Dry feet thoroughly, especially between toes',
      'Apply moisturizer but not between toes',
      'Cut toenails straight across – do not cut into corners',
      'Wear well-fitting shoes and clean socks daily',
      'Never walk barefoot, even indoors',
      'Report any foot problems immediately',
    ],
    followUpSchedule: [
      'Simple cellulitis: Review in 48-72 hours',
      'Complicated cellulitis: Daily review until improving, then every 2-3 days',
      'Post-surgical: As directed, usually every 1-2 days for dressing changes',
      'After discharge: First follow-up within 1 week',
      'Wound check: Until fully healed',
      'If diabetic: Ongoing monitoring at diabetic clinic',
    ],
  },
  nursingEducation: {
    assessmentProtocol: [
      'Perform systematic skin assessment on admission and every shift',
      'Use LRINEC calculator for any suspected necrotizing infection',
      'Mark erythema boundaries with skin marker and note time – track progression',
      'Measure wound dimensions (length × width × depth) in centimeters',
      'Assess and document: color, warmth, tenderness, crepitus, fluctuance',
      'Calculate NEWS2 score every 4-6 hours (or more frequently as indicated)',
      'Apply qSOFA criteria: altered mentation, systolic BP ≤ 100, respiratory rate ≥ 22',
      'Document pain score using validated tool (NRS 0-10)',
      'Photo-document wound at each assessment (with ruler for scale)',
      'Check peripheral pulses if extremity involvement',
    ],
    woundCareProtocol: [
      'Strict aseptic technique for all wound care',
      'Use isotonic saline or prescribed wound cleanser for irrigation',
      'Leave surgical packing in place unless ordered otherwise',
      'Document wound bed appearance: granulation %, slough %, necrosis %',
      'Monitor drainage output if drains present (color, volume, consistency)',
      'Change dressings per wound care plan or when soiled/loosened',
      'For NPWT: ensure seal is maintained; report leaks immediately',
      'Protect peri-wound skin with barrier cream or film',
    ],
    infectionControlMeasures: [
      'Contact precautions for MRSA or suspected resistant organisms',
      'Hand hygiene (WHO 5 moments) before and after patient contact',
      'Dedicated wound care equipment for each patient',
      'Proper disposal of contaminated dressings (clinical waste)',
      'Specimen collection: tissue biopsy > wound swab (higher yield)',
      'Environmental cleaning of patient area daily',
      'Isolate patient if multi-drug resistant organism suspected',
    ],
    antibioticAdministration: [
      'Verify allergy status before first dose of any antibiotic',
      'Administer IV antibiotics at prescribed times – do not delay',
      'Monitor IV cannula site for phlebitis (rotate every 72h or PRN)',
      'For vancomycin: administer over at least 1 hour to prevent red-man syndrome',
      'Monitor vancomycin trough levels as prescribed',
      'If PICC line in situ, flush with heparinized saline per protocol',
      'Document time of administration accurately',
      'Report any signs of antibiotic side effects (C. diff diarrhea, rash, anaphylaxis)',
    ],
    monitoringFrequency: [
      'Hourly: Vital signs if septic (NEWS2 ≥ 7)',
      'Every 4 hours: Stable patients (NEWS2 < 5)',
      'Every shift: Wound assessment, pain assessment, fluid balance',
      'Daily: Blood glucose (QDS if diabetic), wound measurements',
      'As ordered: Blood tests, imaging reviews',
      'Continuous: Cardiac monitoring if ICU/HDU',
    ],
    escalationCriteria: [
      'NEWS2 score ≥ 5 or ≥ 3 in any single parameter → Call doctor immediately',
      'NEWS2 score ≥ 7 → Emergency team / ICU outreach',
      'Rapid spread of erythema (> 1cm/hour) despite IV antibiotics',
      'New onset crepitus, bullae, or skin necrosis',
      'Hemodynamic instability: SBP < 90, HR > 120',
      'Acute kidney injury: UO < 0.5 mL/kg/hr for 6 hours',
      'Altered consciousness: GCS drop of ≥ 2 points',
      'Lactate > 2 mmol/L or rising trend',
    ],
    documentationRequirements: [
      'Wound assessment chart with standardized measurements',
      'Body map indicating wound location, erythema extent',
      'Serial photography with date/time stamp',
      'Fluid balance chart (intake and output)',
      'Blood glucose monitoring record',
      'Antibiotic administration record',
      'Pain assessment and management record',
      'NEWS2 observation chart',
      'Nutrition intake record',
      'Patient/family education documentation',
    ],
    painAssessment: [
      'Use Numerical Rating Scale (NRS 0-10) for conscious patients',
      'Use FLACC for patients unable to self-report',
      'Pain out of proportion to clinical findings → ALERT: may indicate NSTI',
      'Pre-medication before painful procedures (wound care, dressing changes)',
      'Multimodal analgesia: combination of paracetamol + opioid + adjuvant',
      'Assess effectiveness 30-60 minutes after administration',
      'Document pain trajectory with each assessment',
    ],
    nutritionMonitoring: [
      'MUST screening on admission',
      'High protein high calorie diet for wound healing',
      'Target: 25-35 kcal/kg/day; Protein: 1.2-1.5 g/kg/day',
      'Document dietary intake (percentage of meals consumed)',
      'Weigh patient weekly (or more if fluid shifts present)',
      'Request dietitian referral if MUST score ≥ 2',
      'Ensure oral nutritional supplements taken if prescribed',
      'Check pre-albumin or albumin trends as nutritional markers',
    ],
    dischargeTeaching: [
      'Wound care demonstration – patient/carer return demonstration before discharge',
      'Written instructions for antibiotic regimen',
      'Signs to watch for and when to seek emergency care',
      'Follow-up appointment documented and explained',
      'Contact numbers for emergency advice',
      'Medication supply verified (minimum 7-day supply)',
      'PICC line care if discharging with IV antibiotics (OPAT)',
      'Community nursing referral if ongoing wound care needed',
    ],
  },
  cmeContent: {
    title: 'Comprehensive Management of Soft Tissue Infections: From Cellulitis to Necrotizing Fasciitis – A WHO-Adapted Clinical Update',
    objectives: [
      'Differentiate between simple cellulitis, complicated cellulitis, and necrotizing soft tissue infections (NSTI)',
      'Apply the LRINEC scoring system for early identification of NSTI',
      'Implement evidence-based antibiotic protocols adjusted for comorbidities and local resistance patterns',
      'Recognize the surgical emergencies within the spectrum of soft tissue infections',
      'Apply the principles of the Surviving Sepsis Campaign in managing septic patients with NSTI',
      'Manage comorbidity-specific challenges: diabetes, jaundice, renal impairment, immunosuppression',
      'Implement structured monitoring and clinical escalation pathways',
    ],
    clinicalPearls: [
      'Pain out of proportion to clinical findings is the most reliable early sign of necrotizing fasciitis (sensitivity 72-100%)',
      'NSTI can occur without fever – do not rely on systemic signs alone for diagnosis',
      'The "finger test" (bedside): if a finger can be inserted easily through a small incision along the fascial plane without resistance, NSTI is present',
      'CT scan has 80% sensitivity for NSTI, but a NEGATIVE CT does NOT exclude NSTI – do not delay surgery for imaging',
      'MRI is the most sensitive imaging (93%) but rarely available in emergency settings',
      'Clindamycin inhibits toxin production (the Eagle effect) – always include in NSTI regimens with streptococcal involvement',
      'In Fournier\'s gangrene, the necrosis is always deeper and more extensive than the skin surface suggests',
      'C. septicum gas gangrene without trauma → always rule out underlying colorectal malignancy',
      'Soft tissue gas on X-ray is seen in only 25-42% of NSTI cases – absence does not exclude gas gangrene',
      'The single most important prognostic factor in NSTI is time to first surgical debridement from diagnosis',
      'Serial debridement (second-look surgery at 24-48h) reduces mortality by up to 30%',
      'A normal CRP virtually excludes NSTI (negative predictive value > 95%)',
    ],
    evidenceBasedGuidelines: [
      'WHO Model List of Essential Medicines (2023) for antibiotic selection',
      'Surviving Sepsis Campaign Guidelines (2021) for sepsis management',
      'IDSA Guidelines for Skin and Soft Tissue Infections (2014, updated 2024)',
      'WSES Guidelines for NSTIs (World Society of Emergency Surgery, 2018)',
      'NICE Guidelines CG74: Surgical Site Infections (updated 2019)',
      'BNF (British National Formulary) for dosing and drug interactions',
      'Fournier Gangrene Severity Index (FGSI) – Laor et al., 1995',
      'Wong LRINEC Score – Wong et al., Critical Care Medicine, 2004',
    ],
    diagnosticAlgorithm: [
      'Step 1: Clinical assessment – identify red flags (pain out of proportion, crepitus, bullae, rapid spread, systemic toxicity)',
      'Step 2: Calculate LRINEC score – if ≥ 6, HIGH suspicion for NSTI',
      'Step 3: Assess severity – apply qSOFA and NEWS2 scores',
      'Step 4: Blood tests – FBC, CRP, U&E, LFT, Lactate, Blood cultures',
      'Step 5: Imaging ONLY if diagnosis uncertain AND it will not delay surgery',
      'Step 6: If clinical suspicion of NSTI → proceed directly to surgical exploration (do NOT wait for lab results)',
      'Step 7: Intraoperative findings confirm diagnosis: dishwater-grey necrotic fascia, lack of tissue plane resistance, thrombosed vessels',
    ],
    treatmentAlgorithm: [
      'MILD (Stage 1): Oral antibiotics, outpatient management, 48h review',
      'MODERATE (Stage 2-3): IV antibiotics, hospital admission, surgical drainage if abscess, daily review',
      'SEVERE (Stage 4): EMERGENCY – OR within 1 hour for radical debridement, triple IV antibiotics, ICU admission',
      'CRITICAL (Stage 5-6): Sepsis bundle activation, emergency debridement, ICU: vasopressors/ventilation/RRT, serial re-look surgery Q24-48h',
      'ALL STAGES: Mark erythema boundaries, serial photos, strict I/O charting, nutritional support, DVT prophylaxis',
    ],
    controversies: [
      'Role of Hyperbaric Oxygen Therapy (HBOT): Some evidence for reduced mortality in gas gangrene, but limited availability in African settings',
      'IVIG in Streptococcal toxic shock: RCTs inconclusive but some observational benefit; consider if available',
      'Timing of wound closure: Delayed primary closure vs. secondary intention vs. NPWT – individualized decision',
      'Antibiotic duration: Fixed course vs. biomarker-guided (procalcitonin) de-escalation',
      'Prophylactic antibiotics for household contacts of GAS NSTI: Not routinely recommended but considered in outbreak settings',
    ],
    recentAdvances: [
      'Point-of-care lactate testing for early sepsis recognition in resource-limited settings',
      'AI-assisted wound assessment tools for standardized monitoring',
      'Portable NPWT devices for post-debridement wound management',
      'Biomarker panels (procalcitonin + presepsin + IL-6) for NSTI prediction',
      'NSTI prediction models incorporating machine learning on LRINEC + clinical variables',
      'Telemedicine consultation for surgical decision-making in rural centers',
    ],
    references: [
      'Stevens DL, et al. Practice Guidelines for the Diagnosis and Management of Skin and Soft Tissue Infections: 2014 Update by the IDSA. Clin Infect Dis. 2014;59(2):e10-52.',
      'Wong CH, et al. The LRINEC (Laboratory Risk Indicator for Necrotizing Fasciitis) score: a tool for distinguishing necrotizing fasciitis from other soft tissue infections. Crit Care Med. 2004;32(7):1535-41.',
      'Sartelli M, et al. 2018 WSES/SIS-E consensus conference: recommendations for management of skin and soft-tissue infections. World J Emerg Surg. 2018;13:58.',
      'Evans L, et al. Surviving Sepsis Campaign: International Guidelines for Management of Sepsis and Septic Shock 2021. Intensive Care Med. 2021;47:1181–1247.',
      'WHO Model List of Essential Medicines – 23rd List, 2023.',
      'Laor E, et al. Outcome prediction in patients with Fournier\'s gangrene. J Urol. 1995;154(1):89-92.',
      'Nawijn F, et al. Time is of the essence when treating necrotizing soft tissue infections: a systematic review and meta-analysis. World J Emerg Surg. 2020;15:4.',
      'May AK, et al. Treatment of complicated skin and soft tissue infections. Surg Infect (Larchmt). 2009;10(5):467-99.',
    ],
    caseStudies: [
      {
        title: 'Case 1: Diabetic Foot Cellulitis Progressing to Necrotizing Fasciitis',
        presentation: '62-year-old man with poorly controlled Type 2 DM (HbA1c 11.2%) presents with 3-day history of swelling and pain in the right leg after a minor cut from a rusty nail. Initially treated with oral amoxicillin by GP. Now has spreading erythema from ankle to mid-thigh, temperature 39.2°C, HR 118, BP 95/60.',
        investigations: 'WBC 28.4, CRP 312, Na+ 131, Cr 189, Glucose 24.3, Lactate 4.1. LRINEC Score: 11 (HIGH RISK). X-ray: soft tissue gas in calf compartment.',
        diagnosis: 'Type I Necrotizing Fasciitis (Polymicrobial) with Sepsis, complicated by Diabetic Ketoacidosis',
        management: 'Emergency debridement within 45 minutes of assessment. Meropenem + Clindamycin + Vancomycin IV. VRII for DKA. ICU admission. 4 serial debridements over 10 days. NPWT applied. Split-thickness skin graft at 3 weeks.',
        outcome: 'Survived. Limb salvaged. Total hospital stay 28 days. HbA1c improved to 8.1% at 3-month follow-up.',
        learningPoints: [
          'Always suspect NSTI in diabetic patients with rapidly spreading cellulitis',
          'LRINEC ≥ 8 has PPV of 93.4% for NSTI',
          'Do not delay surgery for imaging when clinical suspicion is high',
          'Tight glycemic control is critical during acute infection',
          'Serial debridement is the standard of care',
        ],
      },
      {
        title: 'Case 2: Fournier\'s Gangrene in Immunocompromised Patient',
        presentation: '48-year-old man with known HIV (CD4 count 87) presents with 24-hour history of perineal pain and scrotal swelling. Initially presented to herbalist who applied local concoction. Now has extensive scrotal necrosis, foul-smelling discharge, crepitus palpable over perineum, temperature 40.1°C, GCS 13/15.',
        investigations: 'WBC 34.2, CRP 425, Lactate 5.8, Cr 267, Glucose 8.3. FGSI score: 12 (predicted mortality > 75%). Blood cultures: E. coli + Bacteroides fragilis.',
        diagnosis: 'Fournier\'s Gangrene (extensive) with Severe Sepsis in HIV-positive patient',
        management: 'Emergency radical debridement under GA – excision of entire scrotal skin, part of perineal skin. Loop colostomy. Meropenem + Clindamycin + Vancomycin. ICU stay 8 days. 3 serial debridements. Wound NPWT. ART continuation with ID input. Reconstruction with bilateral medial thigh advancement flaps at 4 weeks.',
        outcome: 'Survived (against predicted mortality). 42-day hospitalization. Colostomy reversed at 3 months. Good functional outcome.',
        learningPoints: [
          'Fournier\'s gangrene is an absolute surgical emergency',
          'The true extent of necrosis is always worse than the surface appearance',
          'Diverting colostomy is essential when perianal tissues are involved',
          'HIV does not preclude aggressive surgical management',
          'Fecal contamination dramatically increases infection severity',
        ],
      },
    ],
  },
};

// ============================================
// qSOFA SCORING
// ============================================
export const QSOFA_CRITERIA = {
  criteria: [
    { name: 'Altered Mental Status', description: 'GCS < 15', points: 1 },
    { name: 'Systolic Blood Pressure', description: 'SBP ≤ 100 mmHg', points: 1 },
    { name: 'Respiratory Rate', description: 'RR ≥ 22/min', points: 1 },
  ],
  interpretation: [
    { score: '0-1', risk: 'Low risk', action: 'Standard monitoring' },
    { score: '≥ 2', risk: 'High risk of sepsis', action: 'Urgent assessment, consider ICU admission, activate sepsis pathway' },
  ],
};

// ============================================
// EXPORT ALL PROTOCOL DATA
// ============================================
export const STI_PROTOCOL = {
  lrinecCriteria: LRINEC_CRITERIA,
  lrinecInterpretation: LRINEC_INTERPRETATION,
  stages: STI_STAGES,
  classifications: STI_CLASSIFICATIONS,
  antibioticProtocols: ANTIBIOTIC_PROTOCOLS,
  requiredLabs: REQUIRED_LABS,
  surgicalAlgorithm: SURGICAL_ALGORITHM,
  comorbidityModifications: COMORBIDITY_MODIFICATIONS,
  education: STI_EDUCATION_CONTENT,
  qsofa: QSOFA_CRITERIA,
};
