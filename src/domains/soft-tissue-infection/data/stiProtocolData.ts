// ============================================================
// SOFT TISSUE INFECTION / NEC PROTOCOL
// Comprehensive Protocol for Plastic & Reconstructive Surgery
// ============================================================

// TypeScript Interfaces
export interface STIClassificationDetail {
  id: string;
  name: string;
  category: 'superficial' | 'deep' | 'necrotizing';
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  eronClass: 'I' | 'II' | 'III' | 'IV';
  clinicalFeatures: string[];
  riskFactors: string[];
  typicalOrganisms: string[];
  imaging: {
    modality: string;
    findings: string[];
    limitations: string;
  }[];
  differentialDiagnosis: string[];
  managementPrinciples: string[];
}

export interface LRINECScoreParam {
  parameter: string;
  lowValue: { range: string; score: number };
  mediumValue?: { range: string; score: number };
  highValue: { range: string; score: number };
  rationale: string;
}

export interface SepsisScreeningCriteria {
  criteria: string;
  parameter: string;
  threshold: string;
  interpretation: string;
}

export interface LabPanel {
  id: string;
  name: string;
  applicableStages: string[];
  frequency: string;
  tests: {
    testName: string;
    rationale: string;
    expectedAbnormality?: string;
    urgency: 'stat' | 'urgent' | 'routine';
  }[];
}

export interface TreatmentProtocol {
  id: string;
  stage: string;
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  antibiotics: AntibioticRegimen[];
  surgicalInterventions: SurgicalIntervention[];
  supportiveCare: string[];
  monitoring: string[];
  escalationCriteria: string[];
  comorbidityModifications: {
    comorbidity: string;
    modifications: string[];
    additionalMonitoring: string[];
    specialConsiderations: string[];
  }[];
}

export interface AntibioticRegimen {
  drug: string;
  dose: string;
  route: 'Oral' | 'IV' | 'IM';
  frequency: string;
  duration: string;
  indication: string;
  alternatives: string[];
  renalAdjustment?: string;
  hepaticAdjustment?: string;
  contraindications: string[];
}

export interface SurgicalIntervention {
  procedure: string;
  indication: string;
  timing: string;
  technique: string[];
  postoperativeCare: string[];
  expectedOutcome: string;
}

export interface NursingProtocol {
  id: string;
  topic: string;
  objectives: string[];
  keyPoints: string[];
  procedures: {
    name: string;
    steps: string[];
    equipment: string[];
    frequency: string;
    precautions: string[];
  }[];
  documentation: string[];
  escalationTriggers: string[];
}

export interface PatientEducationModule {
  id: string;
  title: string;
  targetAudience: string;
  language: 'simple' | 'detailed';
  content: {
    heading: string;
    body: string;
  }[];
  warningSignsToReport: string[];
  selfCareInstructions: string[];
  followUpGuidance: string[];
}

export interface CMEArticle {
  id: string;
  title: string;
  authors: string;
  abstract: string;
  learningObjectives: string[];
  sections: {
    heading: string;
    content: string;
    references: string[];
  }[];
  mcqQuestions: MCQQuestion[];
  references: string[];
  cmeCredits: number;
  targetAudience: string[];
  lastUpdated: string;
}

export interface MCQQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  reference: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
}

// ============================================================
// STI CLASSIFICATIONS
// ============================================================
export const STI_CLASSIFICATIONS_DETAIL: STIClassificationDetail[] = [
  {
    id: 'simple-cellulitis',
    name: 'Simple Cellulitis',
    category: 'superficial',
    severity: 'mild',
    eronClass: 'I',
    clinicalFeatures: [
      'Erythema with poorly demarcated borders',
      'Warmth and tenderness',
      'Mild swelling/edema',
      'No systemic symptoms',
      'No significant comorbidities',
    ],
    riskFactors: [
      'Minor skin breaks (cuts, abrasions)',
      'Insect bites',
      'Tinea pedis (athlete\'s foot)',
      'Minor trauma',
    ],
    typicalOrganisms: [
      'Streptococcus pyogenes (Group A Strep)',
      'Staphylococcus aureus (MSSA)',
    ],
    imaging: [
      {
        modality: 'Usually not required',
        findings: ['Soft tissue swelling', 'Skin thickening'],
        limitations: 'Not indicated for uncomplicated cellulitis',
      },
    ],
    differentialDiagnosis: [
      'Contact dermatitis',
      'Venous stasis dermatitis',
      'Deep vein thrombosis',
      'Gout/crystal arthropathy',
      'Insect bite reaction',
    ],
    managementPrinciples: [
      'Outpatient oral antibiotics',
      'Limb elevation',
      'Analgesia',
      'Review at 48-72 hours',
      'Address predisposing factors',
    ],
  },
  {
    id: 'complicated-cellulitis',
    name: 'Complicated Cellulitis',
    category: 'superficial',
    severity: 'moderate',
    eronClass: 'II',
    clinicalFeatures: [
      'Rapidly spreading erythema',
      'Systemic symptoms (fever, malaise)',
      'Regional lymphadenopathy',
      'Failure to improve with oral antibiotics',
      'Associated with significant comorbidities',
    ],
    riskFactors: [
      'Diabetes mellitus',
      'Peripheral vascular disease',
      'Immunosuppression',
      'Lymphedema',
      'Chronic venous insufficiency',
      'Obesity',
      'Previous episodes of cellulitis',
    ],
    typicalOrganisms: [
      'Streptococcus pyogenes',
      'Staphylococcus aureus (including MRSA)',
      'Gram-negatives in diabetics/immunocompromised',
    ],
    imaging: [
      {
        modality: 'Ultrasound',
        findings: ['Subcutaneous edema', 'Cobblestoning', 'Fluid collection if abscess present'],
        limitations: 'Operator dependent, limited deep tissue assessment',
      },
      {
        modality: 'CT with contrast',
        findings: ['Fascial thickening', 'Fat stranding', 'Gas (if progressing to NF)'],
        limitations: 'Radiation exposure, may delay treatment if over-relied upon',
      },
    ],
    differentialDiagnosis: [
      'Necrotizing fasciitis (early)',
      'Abscess',
      'DVT with superficial thrombophlebitis',
      'Erysipelas',
      'Pyomyositis',
    ],
    managementPrinciples: [
      'Hospital admission',
      'IV antibiotics',
      'Blood work (FBC, CRP, U&E)',
      'Surgical review if fluctuance or not improving',
      'Optimize comorbidities',
      'DVT prophylaxis',
    ],
  },
  {
    id: 'soft-tissue-abscess',
    name: 'Soft Tissue Abscess',
    category: 'deep',
    severity: 'moderate',
    eronClass: 'II',
    clinicalFeatures: [
      'Fluctuant, tender swelling',
      'Overlying erythema and warmth',
      'May have pointing or spontaneous drainage',
      'Fever may or may not be present',
      'Pain disproportionate to size (if deep)',
    ],
    riskFactors: [
      'IV drug use',
      'Diabetes mellitus',
      'Immunocompromise',
      'Skin trauma',
      'Folliculitis progression',
      'Poor hygiene',
    ],
    typicalOrganisms: [
      'Staphylococcus aureus (MRSA common)',
      'Streptococcus species',
      'Mixed flora (if perianal/perineal)',
      'Anaerobes in immunocompromised',
    ],
    imaging: [
      {
        modality: 'Ultrasound (bedside)',
        findings: ['Hypoechoic collection', 'Internal debris/echoes', 'Posterior acoustic enhancement'],
        limitations: 'May miss deep collections',
      },
      {
        modality: 'CT with contrast',
        findings: ['Rim-enhancing collection', 'Surrounding tissue inflammation'],
        limitations: 'Reserved for deep or complex collections',
      },
    ],
    differentialDiagnosis: [
      'Inflamed sebaceous cyst',
      'Hematoma',
      'Infected lymph node',
      'Cellulitis without collection',
      'Soft tissue tumor (rare)',
    ],
    managementPrinciples: [
      'Incision and drainage (primary treatment)',
      'Wound packing',
      'Antibiotics if surrounding cellulitis or systemic symptoms',
      'Culture of pus for directed therapy',
      'Address recurrent abscess causes (hidradenitis, pilonidal disease)',
    ],
  },
  {
    id: 'nec-fasciitis-type1',
    name: 'Necrotizing Fasciitis Type I (Polymicrobial)',
    category: 'necrotizing',
    severity: 'severe',
    eronClass: 'IV',
    clinicalFeatures: [
      'Pain out of proportion to physical findings (KEY FEATURE)',
      'Rapidly progressive erythema/edema',
      'Skin changes: dusky, ecchymoses, bullae, crepitus',
      'Systemic toxicity (fever, tachycardia, hypotension)',
      'Failure to respond to IV antibiotics',
      '"Dishwater" gray pus on exploration',
      'Skin necrosis (late sign)',
    ],
    riskFactors: [
      'Diabetes mellitus',
      'Peripheral vascular disease',
      'Chronic kidney disease',
      'Immunosuppression (HIV, steroids, chemotherapy)',
      'Alcoholism / liver disease',
      'IV drug use',
      'Recent surgery / trauma (including minor)',
      'Obesity',
    ],
    typicalOrganisms: [
      'Mixed aerobes and anaerobes (polymicrobial):',
      '- Streptococcus species',
      '- Enterobacteriaceae (E. coli, Klebsiella)',
      '- Bacteroides fragilis',
      '- Clostridium species',
      '- Enterococcus',
    ],
    imaging: [
      {
        modality: 'CT with contrast (preferred)',
        findings: [
          'Fascial thickening and enhancement',
          'Fascial gas (highly specific if present)',
          'Non-enhancing fascia (necrosis)',
          'Fluid tracking along fascial planes',
          'Fat stranding',
        ],
        limitations: 'Absence of gas does NOT rule out NF. Do NOT delay surgery for imaging.',
      },
      {
        modality: 'MRI',
        findings: ['T2 hyperintensity along fascial planes', 'Fascial thickening', 'Deep fluid'],
        limitations: 'Time-consuming, rarely appropriate in emergency setting',
      },
      {
        modality: 'Plain X-ray',
        findings: ['Subcutaneous gas (if present)'],
        limitations: 'Low sensitivity, absence of gas does not exclude NF',
      },
    ],
    differentialDiagnosis: [
      'Severe cellulitis',
      'Deep vein thrombosis',
      'Gas gangrene',
      'Pyomyositis',
      'Compartment syndrome',
    ],
    managementPrinciples: [
      'SURGICAL EMERGENCY - do NOT delay for investigations',
      'Emergent radical surgical debridement',
      'Broad-spectrum IV antibiotics',
      'ICU admission',
      'Serial debridements (24-48hr intervals)',
      'Wound VAC therapy',
      'Supportive care (fluids, vasopressors, nutrition)',
      'Reconstruction after infection controlled',
    ],
  },
  {
    id: 'nec-fasciitis-type2',
    name: 'Necrotizing Fasciitis Type II (Monomicrobial - GAS)',
    category: 'necrotizing',
    severity: 'critical',
    eronClass: 'IV',
    clinicalFeatures: [
      'All features of Type I PLUS:',
      'Rapid, fulminant progression (hours)',
      'Streptococcal toxic shock syndrome (STSS)',
      'Multiorgan failure',
      'Often in young, healthy individuals',
      'May follow minor trauma (muscle strain, NSAIDs use)',
      'High mortality (30-70%)',
    ],
    riskFactors: [
      'Blunt trauma / muscle strain',
      'NSAID use (may mask early symptoms)',
      'Varicella infection (in children)',
      'Recent childbirth (puerperal)',
      'IV drug use',
      'May occur in previously healthy individuals',
    ],
    typicalOrganisms: [
      'Group A Streptococcus (Streptococcus pyogenes) - SOLE organism',
      'Produces exotoxins (pyrogenic exotoxins A, B, C)',
      'Superantigen-mediated toxic shock',
    ],
    imaging: [
      {
        modality: 'CT with contrast',
        findings: ['Fascial edema and thickening', 'Fat stranding', 'May lack gas (GAS infections often without gas)'],
        limitations: 'Clinical diagnosis is paramount. Imaging may appear deceptively mild.',
      },
    ],
    differentialDiagnosis: [
      'Type I NF (polymicrobial)',
      'Compartment syndrome',
      'DVT',
      'Severe septic arthritis',
      'Cellulitis with sepsis',
    ],
    managementPrinciples: [
      'EXTREME SURGICAL EMERGENCY',
      'Immediate OR for radical debridement',
      'High-dose Penicillin + Clindamycin (essential for toxin inhibition)',
      'ICU admission',
      'Consider IVIG for streptococcal toxic shock syndrome',
      'Close household contacts may need prophylaxis',
      'Very aggressive serial debridement (12-24hr intervals)',
    ],
  },
  {
    id: 'gas-gangrene',
    name: 'Gas Gangrene (Clostridial Myonecrosis)',
    category: 'necrotizing',
    severity: 'critical',
    eronClass: 'IV',
    clinicalFeatures: [
      'Excruciating pain at wound/trauma site',
      'Rapid (hours) progression',
      'Tense edema with bronze/dusky skin',
      'Thin, watery, "dishwasher" brown discharge',
      'Crepitus (gas in tissues)',
      'Sweet, "mousy" or foul odor',
      'Profound systemic toxicity (tachycardia, hypotension)',
      'Hemolytic anemia (intravascular hemolysis)',
      'Renal failure (hemoglobinuria)',
      'Mental status changes',
      'Near 100% mortality if untreated',
    ],
    riskFactors: [
      'Penetrating trauma (especially soil contamination)',
      'Open fractures',
      'Intramuscular injections (rare)',
      'Bowel surgery / GI perforation',
      'Vascular insufficiency',
      'Malignancy (C. septicum in occult GI cancer)',
    ],
    typicalOrganisms: [
      'Clostridium perfringens (80-90%)',
      'Clostridium septicum',
      'Clostridium novyi',
      'Clostridium histolyticum',
      'All produce alpha-toxin (lecithinase) causing tissue destruction',
    ],
    imaging: [
      {
        modality: 'Plain X-ray',
        findings: ['Extensive soft tissue gas in feathery pattern', 'Gas tracking along muscle planes'],
        limitations: 'Should not delay treatment',
      },
      {
        modality: 'CT',
        findings: ['Gas within muscle compartments', 'Muscle necrosis'],
        limitations: 'Clinical diagnosis + surgery takes priority',
      },
    ],
    differentialDiagnosis: [
      'Type I necrotizing fasciitis with gas',
      'Non-clostridial myonecrosis',
      'Traumatic subcutaneous emphysema',
      'Gas from penetrating wound',
    ],
    managementPrinciples: [
      'LIFE-THREATENING EMERGENCY - minutes matter',
      'Immediate radical debridement / amputation',
      'High-dose Penicillin G + Clindamycin',
      'ICU admission',
      'Massive transfusion protocol (hemolysis)',
      'Renal protection (aggressive fluids)',
      'Hyperbaric oxygen (adjunct if available and patient stable)',
      'Anti-gas gangrene serum (where available)',
      'Tetanus prophylaxis',
    ],
  },
  {
    id: 'fourniers-gangrene',
    name: "Fournier's Gangrene",
    category: 'necrotizing',
    severity: 'critical',
    eronClass: 'IV',
    clinicalFeatures: [
      'Starts as perineal pain, swelling, erythema',
      'Rapidly progressive cellulitis of scrotum/perineum/vulva',
      'Crepitus in affected tissues',
      'Scrotal/labial edema and necrosis',
      'Purulent or foul-smelling discharge',
      'Systemic sepsis (fever, tachycardia, hypotension)',
      'Spreads along fascial planes to abdomen, thighs',
      'Testicular involvement rare (separate blood supply)',
    ],
    riskFactors: [
      'Diabetes mellitus (most common)',
      'Perianal abscess / fistula',
      'Urethral stricture / instrumentation',
      'Chronic alcoholism',
      'Immunosuppression',
      'HIV/AIDS',
      'Malignancy',
      'Trauma (including minor)',
    ],
    typicalOrganisms: [
      'Polymicrobial (Type I NF):',
      '- E. coli, Klebsiella, Proteus',
      '- Bacteroides, Prevotella',
      '- Streptococcus, Enterococcus',
      '- Clostridium species',
      '- Average 3-5 organisms per case',
    ],
    imaging: [
      {
        modality: 'CT pelvis',
        findings: [
          'Scrotal/perineal gas',
          'Fat stranding',
          'Fascial thickening',
          'Spread to abdominal wall or thighs',
        ],
        limitations: 'Should not delay surgery - diagnosis is clinical',
      },
    ],
    differentialDiagnosis: [
      'Scrotal abscess',
      'Epididymo-orchitis',
      'Strangulated inguinal hernia',
      'Testicular torsion',
      'Perineal cellulitis',
    ],
    managementPrinciples: [
      'SURGICAL EMERGENCY',
      'Radical debridement of all necrotic tissue',
      'Testes usually salvageable (implant in thigh if exposed)',
      'Suprapubic catheter (avoid urethral catheter)',
      'Fecal diversion (colostomy) if perianal involvement',
      'Broad-spectrum antibiotics (carbapenem + clindamycin + vancomycin)',
      'ICU admission',
      'Serial debridements',
      'Scrotal reconstruction after infection controlled',
    ],
  },
];

// ============================================================
// LRINEC SCORE (Laboratory Risk Indicator for Necrotizing Fasciitis)
// ============================================================
export const LRINEC_SCORE_PARAMS: LRINECScoreParam[] = [
  {
    parameter: 'C-Reactive Protein (mg/L)',
    lowValue: { range: '< 150', score: 0 },
    highValue: { range: '>= 150', score: 4 },
    rationale: 'Elevated CRP indicates significant inflammatory response; strongly associated with NF',
  },
  {
    parameter: 'White Blood Cell Count (x 10^3/uL)',
    lowValue: { range: '< 15', score: 0 },
    mediumValue: { range: '15 - 25', score: 1 },
    highValue: { range: '> 25', score: 2 },
    rationale: 'Leukocytosis reflects systemic inflammatory/infectious response',
  },
  {
    parameter: 'Hemoglobin (g/dL)',
    lowValue: { range: '> 13.5', score: 0 },
    mediumValue: { range: '11 - 13.5', score: 1 },
    highValue: { range: '< 11', score: 2 },
    rationale: 'Anemia may indicate hemolysis, chronic disease, or severe sepsis',
  },
  {
    parameter: 'Sodium (mmol/L)',
    lowValue: { range: '>= 135', score: 0 },
    highValue: { range: '< 135', score: 2 },
    rationale: 'Hyponatremia common in severe infections due to SIADH and third-spacing',
  },
  {
    parameter: 'Creatinine (mg/dL)',
    lowValue: { range: '<= 1.6', score: 0 },
    highValue: { range: '> 1.6', score: 2 },
    rationale: 'Elevated creatinine indicates renal impairment from sepsis or dehydration',
  },
  {
    parameter: 'Glucose (mg/dL)',
    lowValue: { range: '<= 180', score: 0 },
    highValue: { range: '> 180', score: 1 },
    rationale: 'Hyperglycemia indicates stress response and is common in diabetics at risk for NF',
  },
];

export const LRINEC_INTERPRETATION_TABLE = [
  { scoreRange: '0 - 5', risk: 'Low', probability: '< 50%', action: 'Manage as cellulitis; close follow-up', color: '#22C55E' },
  { scoreRange: '6 - 7', risk: 'Moderate', probability: '50 - 75%', action: 'Surgical consultation; consider imaging; admit for observation', color: '#F59E0B' },
  { scoreRange: '>= 8', risk: 'High', probability: '> 75%', action: 'EMERGENT SURGICAL EXPLORATION warranted', color: '#EF4444' },
];

// ============================================================
// qSOFA CRITERIA (Quick Sepsis-Related Organ Failure Assessment)
// ============================================================
export const QSOFA_CRITERIA_LIST: SepsisScreeningCriteria[] = [
  {
    criteria: 'Respiratory Rate',
    parameter: 'Respiratory rate',
    threshold: '>= 22 breaths/min',
    interpretation: '1 point if present',
  },
  {
    criteria: 'Altered Mental Status',
    parameter: 'Glasgow Coma Scale',
    threshold: 'GCS < 15 (any alteration)',
    interpretation: '1 point if present',
  },
  {
    criteria: 'Systolic Blood Pressure',
    parameter: 'Systolic BP',
    threshold: '<= 100 mmHg',
    interpretation: '1 point if present',
  },
];

export const QSOFA_INTERPRETATION_TABLE = {
  lowRisk: {
    score: '0 - 1',
    mortality: '< 3%',
    action: 'Continue monitoring; does not rule out sepsis in high-risk patient',
  },
  highRisk: {
    score: '>= 2',
    mortality: '10 - 24%',
    action: 'High risk of poor outcome; initiate sepsis workup and treatment; consider ICU',
  },
};

// ============================================================
// LAB PANELS
// ============================================================
export const LAB_PANELS: LabPanel[] = [
  {
    id: 'initial-sti-workup',
    name: 'Initial Soft Tissue Infection Workup',
    applicableStages: ['all'],
    frequency: 'On presentation',
    tests: [
      { testName: 'Complete Blood Count (CBC)', rationale: 'WBC, hemoglobin for LRINEC score', expectedAbnormality: 'Leukocytosis or leukopenia, anemia', urgency: 'stat' },
      { testName: 'Basic Metabolic Panel (BMP)', rationale: 'Sodium, glucose, creatinine for LRINEC', expectedAbnormality: 'Hyponatremia, hyperglycemia, elevated creatinine', urgency: 'stat' },
      { testName: 'C-Reactive Protein (CRP)', rationale: 'LRINEC score component', expectedAbnormality: '> 150 mg/L concerning for NSTI', urgency: 'stat' },
      { testName: 'Blood Lactate', rationale: 'Tissue hypoperfusion marker, sepsis indicator', expectedAbnormality: '> 2 mmol/L indicates tissue hypoperfusion', urgency: 'stat' },
      { testName: 'Blood Culture (x2 sets)', rationale: 'Identify causative organism before antibiotics', urgency: 'stat' },
      { testName: 'Coagulation Studies (PT, aPTT, INR)', rationale: 'Screen for DIC', expectedAbnormality: 'Prolonged PT/aPTT, elevated D-dimer', urgency: 'stat' },
      { testName: 'Liver Function Tests', rationale: 'Hepatic function, bilirubin for jaundice assessment', expectedAbnormality: 'Elevated bilirubin, transaminases', urgency: 'urgent' },
      { testName: 'Blood Group & Crossmatch', rationale: 'Prepare for transfusion (hemolysis, surgical blood loss)', urgency: 'stat' },
    ],
  },
  {
    id: 'nsti-specific',
    name: 'NSTI-Specific Panel',
    applicableStages: ['necrotizing-fasciitis', 'gas-gangrene', 'fourniers'],
    frequency: 'On presentation and every 6-12hrs during acute management',
    tests: [
      { testName: 'Arterial Blood Gas (ABG)', rationale: 'Acid-base status, lactate', expectedAbnormality: 'Metabolic acidosis, elevated lactate', urgency: 'stat' },
      { testName: 'Creatine Kinase (CK)', rationale: 'Muscle necrosis marker (especially gas gangrene)', expectedAbnormality: 'Markedly elevated in myonecrosis', urgency: 'stat' },
      { testName: 'Myoglobin (serum and urine)', rationale: 'Muscle breakdown, rhabdomyolysis risk', expectedAbnormality: 'Elevated; positive urine myoglobin', urgency: 'stat' },
      { testName: 'D-dimer / Fibrinogen', rationale: 'DIC screening', expectedAbnormality: 'Elevated D-dimer, low fibrinogen', urgency: 'stat' },
      { testName: 'Procalcitonin', rationale: 'Bacterial infection biomarker, guide antibiotic duration', expectedAbnormality: '> 2 ng/mL highly suggestive of bacterial sepsis', urgency: 'urgent' },
      { testName: 'HbA1c', rationale: 'Assess chronic glycemic control (diabetic patients)', urgency: 'routine' },
      { testName: 'HIV / Hepatitis B&C Screening', rationale: 'Immunosuppression assessment, surgical risk', urgency: 'urgent' },
      { testName: 'Wound Swab / Tissue Culture & Sensitivity', rationale: 'Identify organisms and guide targeted antibiotic therapy', urgency: 'stat' },
    ],
  },
  {
    id: 'monitoring-panel',
    name: 'Daily Monitoring Panel',
    applicableStages: ['all-inpatient'],
    frequency: 'Daily or as clinically indicated',
    tests: [
      { testName: 'CBC', rationale: 'Monitor WBC trend and hemoglobin', urgency: 'routine' },
      { testName: 'Electrolytes (Na, K, Cl, HCO3)', rationale: 'Fluid and electrolyte management', urgency: 'routine' },
      { testName: 'Urea & Creatinine', rationale: 'Renal function monitoring', urgency: 'routine' },
      { testName: 'CRP', rationale: 'Treatment response monitoring', urgency: 'routine' },
      { testName: 'Blood Sugar (4-hourly in DM)', rationale: 'Glycemic control in diabetics', urgency: 'urgent' },
      { testName: 'Wound Swab (repeat)', rationale: 'Monitor for change in flora or resistance', urgency: 'routine' },
    ],
  },
];

// ============================================================
// TREATMENT PROTOCOLS
// ============================================================
export const TREATMENT_PROTOCOLS: TreatmentProtocol[] = [
  {
    id: 'cellulitis-outpatient',
    stage: 'Stage I - Simple Cellulitis',
    severity: 'mild',
    antibiotics: [
      {
        drug: 'Flucloxacillin',
        dose: '500mg',
        route: 'Oral',
        frequency: '6 hourly',
        duration: '7-10 days',
        indication: 'First-line for non-purulent cellulitis (anti-staphylococcal)',
        alternatives: ['Cephalexin 500mg QDS', 'Clindamycin 300mg TDS (if penicillin allergy)'],
        contraindications: ['Penicillin allergy', 'Hepatic impairment'],
      },
      {
        drug: 'Amoxicillin-Clavulanate',
        dose: '625mg',
        route: 'Oral',
        frequency: '8 hourly',
        duration: '7-10 days',
        indication: 'If mixed infection suspected (bite wounds, diabetic foot)',
        alternatives: ['Ciprofloxacin 500mg BD + Metronidazole 400mg TDS'],
        contraindications: ['Penicillin allergy', 'Hepatic cholestasis history'],
      },
    ],
    surgicalInterventions: [],
    supportiveCare: [
      'Limb elevation above heart level',
      'Analgesia: Paracetamol 1g QDS +/- Ibuprofen 400mg TDS',
      'Mark erythema borders with skin marker',
      'Adequate hydration (>=2L/day)',
      'Treat underlying cause (tinea pedis, skin breaks)',
      'Compression stockings after resolution (if lower limb)',
    ],
    monitoring: [
      'Re-evaluate at 48-72 hours',
      'Photograph for progression documentation',
      'Temperature monitoring BD',
      'Watch for signs of deep infection',
    ],
    escalationCriteria: [
      'Failure to improve in 48-72 hours',
      'Spreading erythema despite antibiotics',
      'Development of systemic signs',
      'New fluctuance suggesting abscess',
      'Increasing pain out of proportion',
    ],
    comorbidityModifications: [
      {
        comorbidity: 'Diabetes Mellitus',
        modifications: [
          'Lower threshold for admission',
          'Add Gram-negative coverage (e.g., Ciprofloxacin)',
          'Optimize glycemic control (target BSL 6-10 mmol/L)',
          'Check HbA1c',
        ],
        additionalMonitoring: ['4-hourly blood sugar', 'Daily renal function', 'Foot examination'],
        specialConsiderations: ['Higher risk of NSTI progression', 'Consider early imaging', 'Vascular assessment if lower limb'],
      },
      {
        comorbidity: 'Chronic Kidney Disease',
        modifications: [
          'Dose adjust antibiotics to eGFR',
          'Avoid nephrotoxic agents',
          'Monitor renal function daily',
        ],
        additionalMonitoring: ['Daily U&E', 'Drug levels if applicable', 'Fluid balance'],
        specialConsiderations: ['Impaired immune response', 'Fluid overload risk', 'Consider nephrology review'],
      },
      {
        comorbidity: 'Hepatic Impairment / Jaundice',
        modifications: [
          'Avoid hepatotoxic antibiotics (Flucloxacillin with caution)',
          'Use Cephalexin or Clindamycin alternatives',
          'Coagulation assessment before any procedure',
        ],
        additionalMonitoring: ['LFTs every 48hrs', 'Coagulation studies', 'Albumin levels'],
        specialConsiderations: ['Poor wound healing', 'Increased infection risk', 'Nutritional supplementation'],
      },
    ],
  },
  {
    id: 'cellulitis-inpatient',
    stage: 'Stage II - Complicated Cellulitis',
    severity: 'moderate',
    antibiotics: [
      {
        drug: 'Ceftriaxone',
        dose: '1-2g',
        route: 'IV',
        frequency: 'Daily',
        duration: '5-7 days IV then step-down to oral',
        indication: 'Broad-spectrum empiric therapy',
        alternatives: ['Cefuroxime 1.5g IV TDS'],
        renalAdjustment: 'No adjustment unless severe renal impairment',
        contraindications: ['Cephalosporin allergy', 'History of severe penicillin allergy'],
      },
      {
        drug: 'Flucloxacillin',
        dose: '1-2g',
        route: 'IV',
        frequency: '6 hourly',
        duration: '5-7 days then oral step-down',
        indication: 'Anti-staphylococcal coverage',
        alternatives: ['Vancomycin 15-20mg/kg IV BD (if MRSA suspected)'],
        hepaticAdjustment: 'Use with caution; consider alternatives',
        contraindications: ['Penicillin allergy'],
      },
    ],
    surgicalInterventions: [
      {
        procedure: 'Incision and Drainage',
        indication: 'Fluctuant collection / abscess identified',
        timing: 'Within 24 hours of identification',
        technique: [
          'Mark incision site over point of maximal fluctuance',
          'Elliptical or cruciate incision for adequate drainage',
          'Break up loculations with finger/forceps',
          'Irrigate with normal saline',
          'Pack cavity loosely with saline-soaked gauze',
          'Send pus for culture and sensitivity',
        ],
        postoperativeCare: [
          'Daily wound review and repacking',
          'Progressive reduction of packing depth',
          'Convert to secondary intention healing',
        ],
        expectedOutcome: 'Resolution within 1-2 weeks with adequate drainage',
      },
    ],
    supportiveCare: [
      'IV fluid resuscitation (target UO > 0.5 mL/kg/hr)',
      'IV Paracetamol 1g QDS',
      'DVT prophylaxis (Enoxaparin 40mg SC daily)',
      'Limb elevation',
      'Nutritional assessment and support',
      'Diabetic team review if applicable',
    ],
    monitoring: [
      'Vital signs 4-6 hourly',
      'Daily bloods (FBC, CRP, U&E)',
      'Wound marking and daily photography',
      'Fluid balance chart',
      'Pain score assessment',
    ],
    escalationCriteria: [
      'Hemodynamic instability',
      'LRINEC score >= 6',
      'Pain disproportionate to findings',
      'Skin necrosis or crepitus',
      'Failure of IV therapy at 48hrs',
      'qSOFA >= 2',
    ],
    comorbidityModifications: [
      {
        comorbidity: 'Sepsis / Acute Renal Impairment',
        modifications: [
          'Sepsis bundle: cultures, antibiotics within 1hr, 30mL/kg crystalloid',
          'Vasopressors if MAP < 65 despite fluids',
          'Consider ICU admission',
          'Renal dose adjustment for all medications',
          'Avoid NSAIDs',
        ],
        additionalMonitoring: ['Hourly urine output', 'CVP monitoring', 'Serial lactate levels', 'Vasopressor requirements'],
        specialConsiderations: ['May need renal replacement therapy', 'Higher antibiotic doses may be needed initially', 'Early surgical consultation'],
      },
    ],
  },
  {
    id: 'nsti-protocol',
    stage: 'Stage III-IV - Necrotizing Soft Tissue Infection',
    severity: 'severe',
    antibiotics: [
      {
        drug: 'Meropenem',
        dose: '1g',
        route: 'IV',
        frequency: '8 hourly',
        duration: 'Until culture-guided therapy possible (minimum 7-14 days)',
        indication: 'Broad-spectrum coverage of Gram-positives, Gram-negatives, and anaerobes',
        alternatives: ['Piperacillin-Tazobactam 4.5g IV Q6H'],
        renalAdjustment: 'CrCl 25-50: 1g Q12H; CrCl 10-25: 500mg Q12H',
        contraindications: ['Carbapenem allergy'],
      },
      {
        drug: 'Clindamycin',
        dose: '600-900mg',
        route: 'IV',
        frequency: '8 hourly',
        duration: '7-14 days',
        indication: 'Protein synthesis inhibitor - reduces toxin production (critical for GAS & Clostridial infections)',
        alternatives: ['Linezolid 600mg IV/PO BD'],
        contraindications: ['History of C. difficile colitis'],
      },
      {
        drug: 'Vancomycin',
        dose: '15-20mg/kg',
        route: 'IV',
        frequency: '12 hourly',
        duration: 'Until MRSA ruled out',
        indication: 'MRSA coverage (empiric in high-prevalence settings)',
        alternatives: ['Linezolid 600mg IV/PO BD', 'Daptomycin 6mg/kg IV daily'],
        renalAdjustment: 'Dose per trough levels (target 15-20 ug/mL)',
        contraindications: [],
      },
    ],
    surgicalInterventions: [
      {
        procedure: 'Emergency Radical Surgical Debridement',
        indication: 'Clinical diagnosis of NSTI (do NOT delay for confirmatory investigations)',
        timing: 'Within 6-12 hours of diagnosis (SURGICAL EMERGENCY)',
        technique: [
          'Generous incision through skin and subcutaneous tissue to fascia',
          'Assess fascia: gray, non-bleeding fascia = necrotic (positive "finger test")',
          'Excise all non-viable tissue until bleeding, viable margins reached',
          'Extend incision beyond apparent margins of infection',
          'Leave wound open - NO primary closure',
          'Copious irrigation with warm normal saline',
          'Send tissue for histopathology and culture',
          'Apply negative pressure wound therapy (VAC) if available',
          'Plan re-look surgery at 24-48 hours',
        ],
        postoperativeCare: [
          'ICU admission post-operatively',
          'Daily wound assessment for further necrosis',
          'Serial debridements until no further necrosis',
          'Wound VAC therapy between debridements',
          'Nutritional optimization (high protein diet, 25-35 kcal/kg/day)',
          'Consider skin grafting / flap coverage after clean wound bed achieved',
        ],
        expectedOutcome: 'Average 3-4 debridements needed. Reconstruction after infection control.',
      },
      {
        procedure: 'Amputation',
        indication: 'Non-salvageable limb, uncontrollable sepsis despite debridement',
        timing: 'When continued debridement fails or limb non-viable',
        technique: [
          'Level of amputation: viable tissue proximal to infection',
          'Leave stump open for delayed closure',
          'Send margin tissue for frozen section if available',
        ],
        postoperativeCare: [
          'Stump care and monitoring',
          'Rehabilitation planning',
          'Prosthetic assessment when healed',
          'Psychological support',
        ],
        expectedOutcome: 'Life-saving procedure. 10-30% of NSTI cases require amputation.',
      },
    ],
    supportiveCare: [
      'ICU admission with invasive monitoring (arterial line, CVP)',
      'Aggressive IV fluid resuscitation (Sepsis-3 guidelines)',
      'Vasopressor support (Noradrenaline first-line) if MAP < 65',
      'Mechanical ventilation if ARDS/respiratory failure',
      'Blood product transfusion as needed (target Hb > 7, PLT > 50)',
      'DVT prophylaxis when not coagulopathic',
      'Stress ulcer prophylaxis (PPI)',
      'Glycemic control (insulin infusion, target 6-10 mmol/L)',
      'Nutritional support: NG/NJ feeding if unable to eat, 25-35kcal/kg/day, 1.5-2g protein/kg/day',
      'Pain management: multimodal (opioids, regional blocks, ketamine)',
      'Renal replacement therapy if AKI stage 3',
      'Wound VAC therapy for open wounds',
      'Psychological support / counseling',
    ],
    monitoring: [
      'Continuous ECG and SpO2 monitoring',
      'Hourly vital signs and urine output',
      'ABG every 6-12 hours',
      'Daily bloods: FBC, U&E, CRP, LFTs, coagulation',
      'Serial lactate levels',
      'Wound assessment and photography with each dressing change',
      'SOFA score calculation daily',
      'Nutritional adequacy review',
    ],
    escalationCriteria: [
      'Worsening organ dysfunction despite maximal therapy',
      'Ongoing tissue necrosis despite serial debridement',
      'Rising lactate despite resuscitation',
      'Requirement for increasing vasopressor doses',
      'Consider transfer to specialized center',
    ],
    comorbidityModifications: [
      {
        comorbidity: 'Diabetes Mellitus',
        modifications: [
          'Insulin infusion protocol (sliding scale IV insulin)',
          'Target blood glucose 6-10 mmol/L',
          'Check and manage diabetic ketoacidosis',
          'Vascular assessment of affected limb',
          'Lower threshold for amputation in diabetic foot NF',
        ],
        additionalMonitoring: ['Hourly BSL during insulin infusion', 'HbA1c', 'Capillary blood sugar chart'],
        specialConsiderations: ['Higher mortality in diabetic NSTI', 'Impaired wound healing', 'Increased risk of fungal superinfection'],
      },
      {
        comorbidity: 'Jaundice / Hepatic Impairment',
        modifications: [
          'Correct coagulopathy with FFP/Vitamin K before surgery',
          'Avoid hepatotoxic drugs',
          'Adjust drug doses for hepatic clearance',
          'Albumin supplementation',
        ],
        additionalMonitoring: ['INR before each surgery', 'Daily LFTs and albumin', 'Ammonia levels if encephalopathy'],
        specialConsiderations: ['Very high surgical risk', 'Poor wound healing', 'Increased bleeding risk', 'Higher mortality'],
      },
      {
        comorbidity: 'Acute Renal Impairment',
        modifications: [
          'Dose-adjust all renally cleared drugs',
          'Avoid nephrotoxic agents (aminoglycosides, NSAIDs)',
          'Early nephrology consultation',
          'Consider CRRT/HD if indicated',
        ],
        additionalMonitoring: ['Hourly urine output', 'Daily U&E + creatinine', 'Drug levels (vancomycin)', 'Fluid balance'],
        specialConsiderations: ['Myoglobinuria may cause AKI', 'Aggressive hydration to prevent renal failure', 'Alkalization of urine for myoglobinuria'],
      },
    ],
  },
  {
    id: 'gas-gangrene-protocol',
    stage: 'Stage IV - Gas Gangrene (Clostridial Myonecrosis)',
    severity: 'critical',
    antibiotics: [
      {
        drug: 'Benzylpenicillin (Penicillin G)',
        dose: '4 million units (2.4g)',
        route: 'IV',
        frequency: '4 hourly',
        duration: 'Minimum 10-14 days',
        indication: 'First-line anti-clostridial therapy',
        alternatives: ['Meropenem 1g IV Q8H if penicillin allergy'],
        contraindications: ['Severe penicillin allergy (anaphylaxis)'],
      },
      {
        drug: 'Clindamycin',
        dose: '900mg',
        route: 'IV',
        frequency: '8 hourly',
        duration: '10-14 days',
        indication: 'Essential adjunct - inhibits toxin production (alpha-toxin)',
        alternatives: ['Chloramphenicol (if clindamycin unavailable)'],
        contraindications: [],
      },
      {
        drug: 'Metronidazole',
        dose: '500mg',
        route: 'IV',
        frequency: '8 hourly',
        duration: '10-14 days',
        indication: 'Additional anaerobic coverage',
        alternatives: [],
        contraindications: ['Disulfiram-like reaction with alcohol'],
      },
    ],
    surgicalInterventions: [
      {
        procedure: 'Radical Debridement / Amputation',
        indication: 'All cases of confirmed gas gangrene',
        timing: 'IMMEDIATE - within hours of diagnosis (life-saving emergency)',
        technique: [
          'Wide excision of ALL affected muscle (non-contractile, discolored)',
          'Muscle that does not bleed or contract = non-viable, must be excised',
          'Fasciotomy of all compartments',
          'Consider guillotine amputation if extensive limb involvement',
          'Leave all wounds open',
          'Aggressive saline irrigation',
        ],
        postoperativeCare: [
          'Return to OR every 12-24 hours for re-assessment',
          'Continue debridement until clean margins',
          'Wound VAC when appropriate',
          'Stump management if amputated',
        ],
        expectedOutcome: 'Mortality 20-30% with treatment, near 100% without. Amputation rate 20-50%.',
      },
    ],
    supportiveCare: [
      'ICU admission mandatory',
      'Aggressive resuscitation for shock',
      'Blood transfusion for hemolytic anemia (may need massive transfusion)',
      'Renal protection (aggressive hydration, monitor for myoglobinuria)',
      'Hyperbaric oxygen therapy if available (3 atm, 90 min, 2-3x/day)',
      'Correction of metabolic acidosis',
      'Tetanus prophylaxis',
      'Anti-gas gangrene serum (polyvalent antitoxin) where available',
    ],
    monitoring: [
      'Continuous monitoring in ICU',
      'Serial CK levels (muscle breakdown marker)',
      'Urine color and myoglobin levels',
      'Hemolysis markers (LDH, haptoglobin, bilirubin)',
      'Coagulation profile for DIC',
      'ABG for metabolic acidosis',
    ],
    escalationCriteria: [
      'Persistent hemodynamic instability',
      'Ongoing hemolysis',
      'Spreading gas on imaging',
      'Worsening acidosis',
      'Multi-organ failure',
    ],
    comorbidityModifications: [],
  },
];

// ============================================================
// ANATOMICAL LOCATION CONSIDERATIONS
// ============================================================
export const LOCATION_CONSIDERATIONS = [
  {
    location: 'Lower Extremity',
    prevalence: 'Most common site for cellulitis',
    riskFactors: ['Lymphedema', 'Venous insufficiency', 'Tinea pedis', 'Peripheral vascular disease', 'Diabetes'],
    specialConsiderations: [
      'Assess arterial supply (ABI) before compression',
      'Rule out DVT (Wells Score)',
      'Vascular surgery consultation for ischemia',
      'Higher risk of recurrence - address lymphedema',
    ],
  },
  {
    location: 'Upper Extremity',
    prevalence: 'Common in IV drug users, lymphedema post-mastectomy',
    riskFactors: ['IV drug use', 'Lymphedema (post-axillary clearance)', 'AV fistula', 'Trauma'],
    specialConsiderations: [
      'Assess hand function and compartments',
      'Low threshold for fasciotomy in forearm',
      'Preserve critical structures (nerves, tendons)',
    ],
  },
  {
    location: 'Perineum / Genitalia',
    prevalence: "Fournier's gangrene territory",
    riskFactors: ['Diabetes', 'Perianal abscess', 'Urethral stricture', 'Chronic alcohol use'],
    specialConsiderations: [
      'Diversion colostomy if perianal involvement',
      'Suprapubic catheter if urethral involvement',
      'Urology and colorectal surgery input',
      'Testicular salvage usually possible',
      'Scroral reconstruction with thigh flaps',
    ],
  },
  {
    location: 'Head and Neck',
    prevalence: 'Less common but high risk for airway compromise',
    riskFactors: ['Dental infections', 'Post-surgical', 'Immunocompromised'],
    specialConsiderations: [
      'Immediate airway assessment and protection',
      'CT neck with contrast urgently',
      'Risk of descending mediastinitis',
      'ENT / Maxillofacial surgery involvement',
    ],
  },
  {
    location: 'Abdominal Wall',
    prevalence: 'Post-surgical, trauma, extension from intra-abdominal source',
    riskFactors: ['Recent surgery', 'Stoma sites', 'Obesity', 'Immunosuppression'],
    specialConsiderations: [
      'CT abdomen to rule out intra-abdominal source',
      'May require laparotomy if intra-abdominal extension',
      'Complex reconstruction with mesh or flaps',
      'Stoma re-siting may be needed',
    ],
  },
];

// ============================================================
// NURSING EDUCATION PROTOCOLS
// ============================================================
export const NURSING_PROTOCOLS: NursingProtocol[] = [
  {
    id: 'wound-assessment-nsti',
    topic: 'Wound Assessment in Soft Tissue Infections',
    objectives: [
      'Accurately assess and document wound characteristics',
      'Recognize early signs of NSTI requiring urgent escalation',
      'Perform standardized wound measurements and photography',
    ],
    keyPoints: [
      'Pain out of proportion is the most important early sign of NSTI',
      'Mark wound borders with skin marker at each assessment',
      'Document: size, color, exudate, odor, wound bed, periwound skin',
      'Crepitus finding = EMERGENCY - notify surgeon immediately',
      'Use TIME framework: Tissue, Infection, Moisture, Edge',
    ],
    procedures: [
      {
        name: 'Wound Border Marking Protocol',
        steps: [
          'Clean periwound skin with normal saline',
          'Use indelible skin marker to outline erythema border',
          'Date and time each marking',
          'Measure and document distance from previous border',
          'Photograph with ruler for scale',
        ],
        equipment: ['Skin marker (indelible)', 'Paper measuring tape', 'Camera/smartphone', 'Wound assessment chart'],
        frequency: 'Every 4-6 hours during acute phase, then 8-12 hourly',
        precautions: ['Wear gloves', 'Do not press firmly on tender tissues', 'Report any expansion > 2cm to doctor'],
      },
      {
        name: 'Wound Dressing for Open NSTI Wounds',
        steps: [
          'Don PPE (gown, gloves, eye protection)',
          'Remove old dressing carefully, note exudate amount and character',
          'Irrigate wound with warm normal saline using syringe irrigation',
          'Assess wound bed for residual necrosis',
          'Apply appropriate dressing (moist wound healing principles)',
          'If VAC in situ: check seal, pressure settings, canister volume',
          'Document wound size, appearance, and dressing used',
        ],
        equipment: ['PPE kit', 'Normal saline (warmed)', '50mL syringe', 'Wound dressing pack', 'VAC machine if applicable'],
        frequency: 'Daily or as surgeon directs (may be BD in acute phase)',
        precautions: [
          'Use aseptic non-touch technique',
          'Report malodorous or increasing exudate',
          'Never pack wound tightly',
          'Monitor for bleeding',
        ],
      },
    ],
    documentation: [
      'Wound assessment chart (size, depth, undermining)',
      'Wound photography (with consent, with ruler for scale)',
      'Pain assessment score',
      'Vital signs at time of assessment',
      'Exudate type and amount',
      'Treatment applied and patient response',
    ],
    escalationTriggers: [
      'Spreading erythema beyond marked borders',
      'New crepitus or gas on palpation',
      'Hemodynamic instability (HR > 110, SBP < 100)',
      'Altered mental status',
      'New onset disproportionate pain',
      'Rapidly increasing swelling',
      'Purplish discoloration or bullae formation',
    ],
  },
  {
    id: 'sepsis-recognition',
    topic: 'Early Sepsis Recognition in Soft Tissue Infections',
    objectives: [
      'Perform systematic sepsis screening using qSOFA',
      'Initiate sepsis pathway when criteria met',
      'Complete Sepsis Six bundle within 1 hour',
    ],
    keyPoints: [
      'qSOFA >= 2 = high risk for sepsis',
      'Sepsis Six: Oxygen, Blood cultures, IV antibiotics, IV fluids, Lactate, Urine output',
      'Golden hour - complete bundle within 1 hour of recognition',
      'Time zero = when sepsis first identified',
    ],
    procedures: [
      {
        name: 'Sepsis Screening Protocol',
        steps: [
          'Assess respiratory rate (count for full 60 seconds)',
          'Assess mental status (GCS)',
          'Record systolic blood pressure',
          'Calculate qSOFA score',
          'If score >= 2: ACTIVATE SEPSIS PATHWAY',
          'Notify senior nurse and doctor immediately',
          'Begin Sepsis Six bundle',
        ],
        equipment: ['Observation chart', 'qSOFA calculator/chart', 'Sepsis pathway proforma'],
        frequency: 'With every set of vital signs (minimum 4-hourly)',
        precautions: ['Any single abnormal parameter warrants closer monitoring', 'Immunocompromised patients may not mount fever'],
      },
    ],
    documentation: [
      'Sepsis screening timestamp',
      'qSOFA score at recognition',
      'Time Sepsis Six bundle initiated',
      'Time each element completed',
      'Doctor notification time',
    ],
    escalationTriggers: [
      'qSOFA >= 2',
      'NEWS2 score >= 7',
      'Lactate > 2 mmol/L',
      'New onset confusion',
      'Urine output < 0.5 mL/kg/hr for 2 hours',
    ],
  },
];

// ============================================================
// PATIENT EDUCATION MODULES
// ============================================================
export const PATIENT_EDUCATION_MODULES: PatientEducationModule[] = [
  {
    id: 'cellulitis-patient-ed',
    title: 'Understanding Your Skin Infection (Cellulitis)',
    targetAudience: 'Patients with cellulitis',
    language: 'simple',
    content: [
      {
        heading: 'What is Cellulitis?',
        body: 'Cellulitis is an infection of the skin caused by bacteria. It makes your skin red, hot, swollen, and painful. It usually happens when bacteria enter through a break in the skin, such as a cut, insect bite, or cracked skin between your toes.',
      },
      {
        heading: 'How is it Treated?',
        body: 'Your doctor will prescribe antibiotics to fight the infection. Take ALL your antibiotics even if you start feeling better. Do not stop taking them early. Rest the affected area and keep it raised (elevated) above the level of your heart when possible.',
      },
      {
        heading: 'What You Can Do at Home',
        body: 'Keep the area clean and dry. Take your medications as prescribed. Drink plenty of water. Rest and elevate the affected area. Take pain relievers as directed by your doctor.',
      },
    ],
    warningSignsToReport: [
      'The redness is spreading (getting bigger)',
      'You develop a fever (feeling very hot or having chills)',
      'The pain is getting worse despite taking pain medications',
      'You notice blisters or dark/purple patches on the skin',
      'You feel crunching or crackling under the skin (like bubble wrap)',
      'You feel confused or very unwell',
      'You cannot keep food or your medications down (vomiting)',
    ],
    selfCareInstructions: [
      'Take all your antibiotics at the correct times',
      'Keep the affected area elevated above heart level',
      'Drink at least 8 glasses of water daily',
      'Keep the skin clean and moisturized',
      "Treat any athlete's foot (fungal infection between toes)",
      'Do not scratch or break the skin',
      'Wear comfortable, loose clothing over the area',
    ],
    followUpGuidance: [
      'Return to clinic in 2-3 days or sooner if worsening',
      'The redness should start to improve within 48-72 hours',
      'Complete the full course of antibiotics',
      'If you have diabetes, check your blood sugar regularly',
    ],
  },
  {
    id: 'nsti-patient-ed',
    title: 'Understanding Your Serious Skin Infection (Necrotizing Fasciitis)',
    targetAudience: 'Patients/families of NSTI patients',
    language: 'simple',
    content: [
      {
        heading: 'What is Happening?',
        body: 'You/your family member has a very serious skin infection called necrotizing fasciitis (sometimes called "flesh-eating disease"). This infection spreads very fast and destroys the tissue under the skin. It is a life-threatening emergency that needs immediate surgery.',
      },
      {
        heading: 'Why is Surgery Needed?',
        body: 'The infection destroys tissue faster than antibiotics alone can stop it. Surgery removes the dead and infected tissue to save your life. You may need several operations over several days until all the infected tissue is removed.',
      },
      {
        heading: 'What to Expect',
        body: 'You will be in the Intensive Care Unit (ICU) after surgery. You will receive strong antibiotics through a drip (IV). You may need help breathing with a machine (ventilator). The surgical wound will be left open to heal and may need special wound care devices. Recovery takes weeks to months, and you may need further surgery to close the wound.',
      },
      {
        heading: 'After Recovery',
        body: 'Physical rehabilitation may be needed. Plastic surgery may be required to cover large wounds. Emotional support and counseling are available. Follow-up appointments are very important.',
      },
    ],
    warningSignsToReport: [
      'New areas of skin turning dark or purple',
      'Increasing pain that is not controlled by medications',
      'New fever or chills',
      'Feeling confused or very drowsy',
      'Swelling or redness spreading to new areas',
      'Foul-smelling discharge from the wound',
    ],
    selfCareInstructions: [
      'Keep all follow-up appointments',
      'Take medications exactly as prescribed',
      'Report any new symptoms immediately',
      'Maintain good nutrition (high protein diet)',
      'Do wound care as instructed by nurses',
      'Attend physiotherapy sessions',
    ],
    followUpGuidance: [
      'Regular follow-up with your surgical team',
      'Wound care clinic appointments',
      'Rehabilitation and physiotherapy',
      'Psychological support services if needed',
      'Diabetes/comorbidity management follow-up',
    ],
  },
];

// ============================================================
// CME ARTICLE
// ============================================================
export const STI_CME_ARTICLE: CMEArticle = {
  id: 'sti-nec-cme-2025',
  title: 'Soft Tissue Infections: From Cellulitis to Necrotizing Fasciitis - A Comprehensive Review for the Plastic and Reconstructive Surgeon',
  authors: 'Department of Plastic & Reconstructive Surgery - Continuing Medical Education Series',
  abstract: 'Soft tissue infections represent a spectrum from simple cellulitis to life-threatening necrotizing soft tissue infections (NSTIs). This CME article provides a comprehensive evidence-based review of diagnosis, risk stratification using the LRINEC score, surgical decision-making, antibiotic protocols, and management of complications including sepsis and organ failure. Special emphasis is placed on early recognition, the role of comorbidities in outcomes, and reconstructive strategies after debridement.',
  learningObjectives: [
    'Classify soft tissue infections according to depth, microbiology, and severity',
    'Calculate and interpret the LRINEC score for risk stratification',
    'Apply evidence-based antibiotic protocols for each stage of STI',
    'Describe the indications, timing, and technique of surgical debridement in NSTI',
    'Identify and manage comorbidity-specific complications (DM, renal failure, jaundice)',
    'Implement post-debridement wound management and reconstructive algorithms',
    'Recognize and initiate treatment for sepsis using Sepsis-3 criteria',
  ],
  sections: [
    {
      heading: 'Introduction and Epidemiology',
      content: 'Soft tissue infections (STIs) encompass a broad clinical spectrum from superficial cellulitis to deep necrotizing soft tissue infections (NSTIs). NSTIs carry a mortality rate of 20-40% even with optimal management, and delayed diagnosis or treatment significantly worsens outcomes.\n\nThe incidence of NSTI is estimated at 0.4-1.0 per 100,000 population, though this is likely underreported in low- and middle-income settings. Risk factors include diabetes mellitus (present in 40-60% of cases), immunosuppression, chronic alcohol use, peripheral vascular disease, obesity, chronic kidney disease, and liver cirrhosis.\n\nEarly recognition and differentiation of NSTI from simple cellulitis remains the greatest clinical challenge. The plastic surgeon plays a critical role in both the acute surgical management and the subsequent reconstruction of tissue defects.',
      references: [
        'Stevens DL, et al. Practice Guidelines for the Diagnosis and Management of Skin and Soft Tissue Infections. Clin Infect Dis. 2014;59(2):e10-52.',
        'Sartelli M, et al. WSES/GAIS/SIS-E/WSIS/AAST guidelines on soft tissue infections. World J Emerg Surg. 2022;17(1):58.',
      ],
    },
    {
      heading: 'Classification of Soft Tissue Infections',
      content: 'The classification of STIs considers depth of involvement, microbiology, and clinical severity:\n\nBy Depth:\n- Impetigo/Ecthyma: Epidermal involvement only\n- Erysipelas: Upper dermis and superficial lymphatics\n- Cellulitis: Dermis and subcutaneous tissue\n- Necrotizing Fasciitis: Fascial planes (Type I: polymicrobial; Type II: monomicrobial GAS)\n- Myonecrosis/Gas Gangrene: Muscle tissue (Clostridial or non-clostridial)\n\nBy Microbiology:\n- Type I (Polymicrobial): Mixed aerobes and anaerobes (70-80% of NSTIs)\n- Type II (Monomicrobial): Group A Streptococcus, S. aureus (including MRSA)\n- Type III: Marine organisms (Vibrio vulnificus, Aeromonas)\n- Type IV: Fungal (immunocompromised)\n\nClinical Severity (Eron Classification):\n- Class I: No systemic toxicity, no comorbidities\n- Class II: Systemic illness OR comorbidities complicating treatment\n- Class III: Significant systemic toxicity OR unstable comorbidities\n- Class IV: Sepsis/life-threatening infection requiring ICU',
      references: [
        'Eron LJ, et al. Managing skin and soft tissue infections. J Antimicrob Chemother. 2003;52 Suppl 1:i3-17.',
      ],
    },
    {
      heading: 'Clinical Assessment and the LRINEC Score',
      content: 'The Laboratory Risk Indicator for Necrotizing Fasciitis (LRINEC) score was developed by Wong et al. (2004) as a clinical tool to distinguish NSTI from other soft tissue infections. It uses six commonly available laboratory parameters:\n\n| Parameter | Criteria | Score |\n|-----------|----------|-------|\n| CRP (mg/L) | <150 / >=150 | 0 / 4 |\n| WBC (x10^3/uL) | <15 / 15-25 / >25 | 0 / 1 / 2 |\n| Hemoglobin (g/dL) | >13.5 / 11-13.5 / <11 | 0 / 1 / 2 |\n| Sodium (mmol/L) | >=135 / <135 | 0 / 2 |\n| Creatinine (mg/dL) | <=1.6 / >1.6 | 0 / 2 |\n| Glucose (mg/dL) | <=180 / >180 | 0 / 1 |\n\nInterpretation:\n- Score <= 5: Low risk (<50% probability of NSTI) - manage as cellulitis\n- Score 6-7: Moderate risk (50-75%) - surgical consultation, close monitoring\n- Score >= 8: High risk (>75%) - emergent surgical exploration warranted\n\nLimitations: Sensitivity 68-90%, Specificity 72-95%. Clinical judgment remains paramount. A low LRINEC score does NOT rule out NSTI - if clinical suspicion is high, proceed to surgical exploration.\n\nThe "Hard Signs" of NSTI that mandate surgical exploration regardless of LRINEC:\n1. Crepitus on palpation\n2. Skin necrosis/ecchymosis\n3. Gas on imaging\n4. Hemorrhagic bullae\n5. Dishwater-gray wound drainage\n6. Rapidly progressive despite IV antibiotics',
      references: [
        'Wong CH, et al. The LRINEC score: a tool for distinguishing necrotizing fasciitis from other soft tissue infections. Crit Care Med. 2004;32(7):1535-41.',
      ],
    },
    {
      heading: 'Surgical Management',
      content: 'Timing: NSTI is a surgical emergency. Multiple studies demonstrate that delay in surgical debridement beyond 12 hours from diagnosis significantly increases mortality (from 19% to 32-76%).\n\nPrinciples of Debridement:\n1. Generous skin incisions to widely expose fascia\n2. "Finger test": Probe along fascial planes - lack of resistance = fascial necrosis\n3. Excise ALL non-viable tissue until bleeding, adherent fascia reached\n4. Gray, non-contractile muscle = non-viable (gas gangrene)\n5. Multiple incisions may be needed to define extent\n6. Leave ALL wounds open\n7. Copious irrigation (>=6L warm normal saline)\n8. Plan re-exploration at 24-48 hours (mandatory)\n\nSerial Debridements: Average of 3.4 debridements per patient. Continue until:\n- No further necrotic tissue found\n- Clean, healthy granulation tissue\n- CRP trending downward\n- Clinical improvement\n\nReconstruction (after infection control):\n- Negative pressure wound therapy (VAC) as bridge to reconstruction\n- Split-thickness skin grafts for large surface area coverage\n- Local/regional flaps for complex defects\n- Free tissue transfer for extensive reconstruction\n- Tissue expansion for secondary reconstruction',
      references: [
        'Nawijn F, et al. Time is of the essence when treating necrotizing soft tissue infections. World J Emerg Surg. 2020;15(1):4.',
        'Sarani B, et al. Necrotizing fasciitis: current concepts and review of the literature. J Am Coll Surg. 2009;208(2):279-88.',
      ],
    },
    {
      heading: 'Antibiotic Therapy',
      content: 'Empiric Therapy for NSTI (commence IMMEDIATELY, do not delay for culture results):\n\nTriple therapy recommended:\n1. Carbapenem (Meropenem 1g IV Q8H) OR Piperacillin-Tazobactam 4.5g IV Q6H\n   - Broad-spectrum Gram-positive, Gram-negative, and anaerobic coverage\n2. Clindamycin 600-900mg IV Q8H\n   - ESSENTIAL: Protein synthesis inhibitor reduces toxin production\n   - Particularly important for GAS (Type II) and Clostridial infections\n3. Vancomycin 15-20mg/kg IV Q12H (target trough 15-20 ug/mL)\n   - MRSA coverage (empiric in high-prevalence settings)\n\nCulture-Guided Therapy: De-escalate based on wound and blood culture results.\n\nDuration: Minimum 2-4 weeks (tailored to clinical response, CRP trend, wound status)\n\nAdjunctive Therapies:\n- IVIG (1-2g/kg) for streptococcal toxic shock syndrome\n- Hyperbaric oxygen for gas gangrene (adjunct, do not delay surgery)',
      references: [
        'Stevens DL, et al. IDSA Guidelines 2014.',
        'WHO Model List of Essential Medicines 2023.',
      ],
    },
    {
      heading: 'Management of Comorbidities',
      content: 'Diabetes Mellitus (present in 40-60% of NSTI cases):\n- Insulin infusion for tight glycemic control (target 6-10 mmol/L)\n- HbA1c assessment for long-term control\n- Diabetic foot assessment including vascular status\n- Higher amputation rates and mortality in diabetic NSTI patients\n- Screen for diabetic ketoacidosis\n\nAcute Kidney Injury:\n- Occurs in up to 50% of NSTI patients (sepsis, myoglobinuria, nephrotoxic drugs)\n- Early aggressive hydration to prevent/treat AKI\n- Alkalinize urine (sodium bicarbonate) for myoglobinuria\n- Dose-adjust all renally cleared drugs\n- Early nephrology consultation for KDIGO Stage 2-3\n\nHepatic Dysfunction / Jaundice:\n- Increased surgical bleeding risk (coagulopathy)\n- Correct INR with FFP/Vitamin K before surgery\n- Higher mortality in NSTI patients with liver disease\n- Monitor for hepatorenal syndrome\n- Avoid hepatotoxic drugs\n- Nutrition optimization crucial\n\nSepsis Management (Surviving Sepsis Campaign 2021):\n- Hour-1 Bundle: Measure lactate, blood cultures, broad-spectrum antibiotics, 30mL/kg crystalloid if hypotensive/lactate >4\n- MAP target >= 65 mmHg\n- Vasopressors: Noradrenaline first-line; add Vasopressin if refractory\n- Consider stress-dose hydrocortisone if vasopressor-refractory shock',
      references: [
        'Evans L, et al. Surviving Sepsis Campaign: International Guidelines 2021. Intensive Care Med. 2021;47(11):1181-1247.',
      ],
    },
  ],
  mcqQuestions: [
    {
      id: 'sti-mcq-1',
      question: 'What is the MOST reliable early clinical sign that distinguishes necrotizing fasciitis from simple cellulitis?',
      options: [
        'High fever (>39C)',
        'Pain out of proportion to physical findings',
        'Presence of an abscess',
        'Lymphadenopathy',
      ],
      correctAnswer: 1,
      explanation: 'Pain out of proportion to apparent physical findings is the hallmark early sign of NSTI. In early NF, the skin may appear relatively normal while extensive destruction occurs in deeper tissues, producing severe pain that seems disproportionate to the visible findings.',
      reference: 'Stevens DL, et al. Clin Infect Dis. 2014;59(2):e10-52.',
      difficulty: 'basic',
    },
    {
      id: 'sti-mcq-2',
      question: 'A patient presents with a LRINEC score of 9. What is the most appropriate next step?',
      options: [
        'Start oral antibiotics and review in 48 hours',
        'Obtain MRI to confirm the diagnosis before proceeding',
        'Arrange emergent surgical exploration and debridement',
        'Admit for IV antibiotics and daily reassessment',
      ],
      correctAnswer: 2,
      explanation: 'A LRINEC score >=8 indicates >75% probability of NSTI and warrants emergent surgical exploration. Imaging should NOT delay surgical management when clinical suspicion is high.',
      reference: 'Wong CH, et al. Crit Care Med. 2004;32(7):1535-41.',
      difficulty: 'intermediate',
    },
    {
      id: 'sti-mcq-3',
      question: 'In the empiric antibiotic regimen for NSTI, why is Clindamycin added to the carbapenem?',
      options: [
        'To provide additional Gram-negative coverage',
        'To inhibit bacterial protein synthesis and reduce toxin production',
        'To prevent Clostridium difficile infection',
        'To treat potential fungal co-infection',
      ],
      correctAnswer: 1,
      explanation: 'Clindamycin is a protein synthesis inhibitor that reduces production of exotoxins by both Group A Streptococcus and Clostridium species. Toxin production drives much of the tissue destruction and systemic toxicity in NSTI.',
      reference: 'Stevens DL, et al. IDSA Guidelines. Clin Infect Dis. 2014.',
      difficulty: 'intermediate',
    },
    {
      id: 'sti-mcq-4',
      question: 'Which of the following is the MOST critical factor affecting mortality in necrotizing fasciitis?',
      options: [
        'Choice of antibiotic agent',
        'Time from diagnosis to first surgical debridement',
        'Patient age',
        'Type of organism cultured',
      ],
      correctAnswer: 1,
      explanation: 'Multiple studies have demonstrated that time to first surgical debridement is the single most important modifiable factor affecting NSTI mortality. Delay beyond 12 hours increases mortality from approximately 19% to 32-76%.',
      reference: 'Nawijn F, et al. World J Emerg Surg. 2020;15(1):4.',
      difficulty: 'basic',
    },
    {
      id: 'sti-mcq-5',
      question: 'A 55-year-old diabetic male presents with scrotal pain, swelling, and crepitus. His blood glucose is 25 mmol/L and he is tachycardic. What is the MOST likely diagnosis and initial management?',
      options: [
        'Epididymo-orchitis; IV antibiotics and observation',
        "Fournier's gangrene; emergency radical debridement",
        'Testicular torsion; emergency exploration and orchidopexy',
        'Strangulated inguinal hernia; urgent hernia repair',
      ],
      correctAnswer: 1,
      explanation: "The combination of scrotal pain, swelling, crepitus in a diabetic patient with metabolic derangement is classic Fournier's gangrene. This is a surgical emergency requiring immediate radical debridement.",
      reference: 'Sartelli M, et al. World J Emerg Surg. 2022;17(1):58.',
      difficulty: 'advanced',
    },
    {
      id: 'sti-mcq-6',
      question: 'In gas gangrene (Clostridial myonecrosis), what is the characteristic finding on surgical exploration?',
      options: [
        'Purulent collection with intact surrounding muscle',
        'Red, swollen but contractile muscle with fascial edema',
        'Non-contractile, "cooked-appearing" muscle that does not bleed',
        'Normal appearing muscle with subcutaneous fluid collection',
      ],
      correctAnswer: 2,
      explanation: 'In gas gangrene, the affected muscle appears pale, non-contractile (does not twitch with diathermy), and has a "cooked" appearance. Healthy muscle is red, bleeds when cut, and contracts with stimulation.',
      reference: 'Stevens DL, et al. IDSA Guidelines 2014.',
      difficulty: 'advanced',
    },
    {
      id: 'sti-mcq-7',
      question: 'Which scoring system is specifically designed to differentiate necrotizing fasciitis from other soft tissue infections?',
      options: [
        'APACHE II score',
        'SOFA score',
        'LRINEC score',
        'Braden score',
      ],
      correctAnswer: 2,
      explanation: 'The Laboratory Risk Indicator for Necrotizing Fasciitis (LRINEC) score was specifically developed to differentiate NSTI from other soft tissue infections using six laboratory parameters.',
      reference: 'Wong CH, et al. Crit Care Med. 2004.',
      difficulty: 'basic',
    },
    {
      id: 'sti-mcq-8',
      question: 'According to the Surviving Sepsis Campaign 2021, what is the target time to complete the 1-hour sepsis bundle?',
      options: [
        '30 minutes from presentation',
        '1 hour from recognition of sepsis',
        '3 hours from triage',
        '6 hours from admission',
      ],
      correctAnswer: 1,
      explanation: 'The Surviving Sepsis Campaign 2021 Hour-1 Bundle should be initiated within 1 hour of sepsis recognition (Time Zero).',
      reference: 'Evans L, et al. Surviving Sepsis Campaign 2021.',
      difficulty: 'intermediate',
    },
    {
      id: 'sti-mcq-9',
      question: 'What is the recommended frequency of re-exploration after initial debridement in NSTI?',
      options: [
        'Weekly until wound is clean',
        'Only if clinical deterioration occurs',
        'Every 24-48 hours until no further necrosis found',
        'Once at 72 hours post-initial debridement',
      ],
      correctAnswer: 2,
      explanation: 'Planned re-exploration every 24-48 hours is a fundamental principle of NSTI surgical management. The average patient requires 3-4 debridements.',
      reference: 'Nawijn F, et al. World J Emerg Surg. 2020.',
      difficulty: 'intermediate',
    },
    {
      id: 'sti-mcq-10',
      question: 'A patient with NSTI has a serum creatinine of 3.2 mg/dL and dark-colored urine. Which investigation would BEST identify the cause of the renal impairment?',
      options: [
        'Renal ultrasound',
        'Urine myoglobin and serum creatine kinase',
        'CT abdomen with contrast',
        'Renal biopsy',
      ],
      correctAnswer: 1,
      explanation: 'Myoglobinuria from muscle necrosis (rhabdomyolysis) is a common cause of AKI in NSTI, especially gas gangrene. Dark urine + elevated CK + elevated serum myoglobin confirms the diagnosis.',
      reference: 'Bosch X, et al. Rhabdomyolysis and acute kidney injury. N Engl J Med. 2009;361:62-72.',
      difficulty: 'advanced',
    },
  ],
  references: [
    'Stevens DL, et al. Practice Guidelines for the Diagnosis and Management of Skin and Soft Tissue Infections: 2014 Update by the IDSA. Clin Infect Dis. 2014;59(2):e10-52.',
    'Sartelli M, et al. 2018 WSES/SIS-E consensus conference: recommendations for the management of skin and soft tissue infections. World J Emerg Surg. 2018;13:58.',
    'Wong CH, et al. The LRINEC (Laboratory Risk Indicator for Necrotizing Fasciitis) score. Crit Care Med. 2004;32(7):1535-41.',
    'Evans L, et al. Surviving Sepsis Campaign: International Guidelines 2021. Intensive Care Med. 2021;47(11):1181-1247.',
    'Nawijn F, et al. Time is of the essence when treating necrotizing soft tissue infections. World J Emerg Surg. 2020;15(1):4.',
    'WHO Model List of Essential Medicines. 23rd List, 2023.',
    'Bosch X, et al. Rhabdomyolysis and Acute Kidney Injury. N Engl J Med. 2009;361:62-72.',
    'Sarani B, et al. Necrotizing fasciitis: current concepts. J Am Coll Surg. 2009;208(2):279-88.',
  ],
  cmeCredits: 5,
  targetAudience: ['Plastic Surgeons', 'General Surgeons', 'Emergency Medicine Physicians', 'Surgical Residents', 'Intensivists'],
  lastUpdated: '2025-12-01',
};
