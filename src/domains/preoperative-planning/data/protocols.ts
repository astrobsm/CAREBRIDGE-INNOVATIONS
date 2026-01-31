// WHO-Aligned Preoperative Protocols and Investigation Guidelines
// Based on international perioperative safety standards

import type { 
  ComorbidityProtocol, 
  InvestigationRequirement, 
  InvestigationType,
  ProcedureCategory,
  AnaesthesiaType,
  RequirementLevel,
  ComorbidityCategory
} from '../types';

// ============================================================
// INVESTIGATION DEFINITIONS
// ============================================================

export const INVESTIGATION_INFO: Record<InvestigationType, { name: string; description: string; turnaround: string }> = {
  fbc: { name: 'Full Blood Count', description: 'Haemoglobin, WBC, Platelets, Differential', turnaround: '2-4 hours' },
  electrolytes: { name: 'Serum Electrolytes', description: 'Sodium, Potassium, Chloride, Bicarbonate', turnaround: '2-4 hours' },
  renal_function: { name: 'Renal Function Tests', description: 'Urea, Creatinine, eGFR', turnaround: '2-4 hours' },
  liver_function: { name: 'Liver Function Tests', description: 'ALT, AST, ALP, Bilirubin, Albumin', turnaround: '4-6 hours' },
  coagulation: { name: 'Coagulation Profile', description: 'PT, INR, aPTT, Fibrinogen', turnaround: '2-4 hours' },
  blood_glucose: { name: 'Blood Glucose', description: 'Fasting or Random Blood Glucose', turnaround: '1 hour' },
  hba1c: { name: 'Glycated Haemoglobin', description: 'HbA1c - 3-month glucose control', turnaround: '24 hours' },
  urinalysis: { name: 'Urinalysis', description: 'Dipstick + Microscopy', turnaround: '1-2 hours' },
  ecg: { name: '12-Lead ECG', description: 'Electrocardiogram', turnaround: '30 minutes' },
  chest_xray: { name: 'Chest X-Ray', description: 'PA and Lateral views', turnaround: '2-4 hours' },
  abg: { name: 'Arterial Blood Gas', description: 'pH, pO2, pCO2, HCO3, Lactate', turnaround: '30 minutes' },
  lactate: { name: 'Serum Lactate', description: 'Tissue perfusion marker', turnaround: '30 minutes' },
  blood_group: { name: 'Blood Group & Crossmatch', description: 'ABO, Rh, Antibody Screen', turnaround: '1-2 hours' },
  pregnancy_test: { name: 'Pregnancy Test', description: 'Urine or Serum βhCG', turnaround: '30 minutes' },
  sickling_test: { name: 'Sickling Test', description: 'Sickle cell screen / Hb Electrophoresis', turnaround: '24 hours' },
  thyroid_function: { name: 'Thyroid Function Tests', description: 'TSH, T3, T4', turnaround: '24 hours' },
  cardiac_enzymes: { name: 'Cardiac Enzymes', description: 'Troponin, CK-MB', turnaround: '2-4 hours' },
  bnp: { name: 'BNP/NT-proBNP', description: 'Heart failure marker', turnaround: '4-6 hours' },
  echo: { name: 'Echocardiogram', description: 'Cardiac structure and function', turnaround: '24-48 hours' },
  pulmonary_function: { name: 'Pulmonary Function Tests', description: 'Spirometry, PEFR', turnaround: '24-48 hours' },
};

// ============================================================
// BASELINE INVESTIGATIONS (ASA I - NO COMORBIDITIES)
// ============================================================

export const BASELINE_INVESTIGATIONS: InvestigationRequirement[] = [
  {
    type: 'fbc',
    name: 'Full Blood Count',
    requirement: 'mandatory',
    rationale: 'Assess haemoglobin and platelet count for surgical bleeding risk',
    expectedValue: 'Hb ≥12 g/dL (♀), ≥13 g/dL (♂); Platelets ≥150 ×10⁹/L',
    minSafeLevel: 'Hb ≥10 g/dL; Platelets ≥100 ×10⁹/L (regional), ≥50 ×10⁹/L (GA)',
  },
  {
    type: 'blood_glucose',
    name: 'Blood Glucose',
    requirement: 'mandatory',
    rationale: 'Screen for undiagnosed diabetes and ensure glycaemic stability',
    expectedValue: 'Fasting: 4-7 mmol/L; Random: <7.8 mmol/L',
    minSafeLevel: '≤11.1 mmol/L (random)',
    unit: 'mmol/L',
  },
  {
    type: 'urinalysis',
    name: 'Urinalysis',
    requirement: 'mandatory',
    rationale: 'Screen for UTI, proteinuria, glycosuria',
    expectedValue: 'Normal - no ketones, no protein, no blood',
    minSafeLevel: 'No ketones; trace protein acceptable',
  },
  {
    type: 'blood_group',
    name: 'Blood Group & Save',
    requirement: 'recommended',
    rationale: 'Available if transfusion needed',
    expectedValue: 'ABO & Rh determined',
    minSafeLevel: 'Group available',
  },
];

// ============================================================
// COMORBIDITY-SPECIFIC PROTOCOLS
// ============================================================

export const COMORBIDITY_PROTOCOLS: ComorbidityProtocol[] = [
  // ============================================================
  // NO COMORBIDITIES (ASA I)
  // ============================================================
  {
    category: 'none',
    name: 'No Known Comorbidities (ASA I)',
    description: 'Patient with no known systemic disease, normal functional capacity, normal vital signs',
    investigations: [
      ...BASELINE_INVESTIGATIONS,
      {
        type: 'ecg',
        name: '12-Lead ECG',
        requirement: 'if_indicated',
        rationale: 'Required if age ≥40 years or undergoing major surgery',
        expectedValue: 'Normal sinus rhythm, no ischaemic changes',
        minSafeLevel: 'No acute changes',
      },
      {
        type: 'pregnancy_test',
        name: 'Pregnancy Test',
        requirement: 'if_indicated',
        rationale: 'All women of reproductive age (15-50 years)',
        expectedValue: 'Negative (unless known pregnancy)',
        minSafeLevel: 'Result documented',
      },
      {
        type: 'coagulation',
        name: 'Coagulation Profile',
        requirement: 'if_indicated',
        rationale: 'Required for neuraxial anaesthesia or major surgery',
        expectedValue: 'INR <1.2; aPTT normal',
        minSafeLevel: 'INR ≤1.5; aPTT ≤1.5× control',
      },
    ],
    optimizations: [
      {
        category: 'Fasting',
        recommendation: 'Clear fluids until 2 hours before surgery; light meal 6 hours before',
        priority: 'critical',
        timing: 'before_surgery',
      },
      {
        category: 'Hydration',
        recommendation: 'Ensure adequate hydration before spinal/general anaesthesia',
        priority: 'important',
        timing: 'before_surgery',
      },
    ],
    surgicalTiming: [
      {
        urgency: 'elective',
        guidance: 'All investigations should be within acceptable limits. Postpone for unexplained abnormalities.',
        canProceed: true,
      },
      {
        urgency: 'urgent',
        guidance: 'Perform minimum safe investigations. Correct reversible abnormalities.',
        canProceed: true,
      },
      {
        urgency: 'emergency',
        guidance: 'Do not delay life-saving surgery for routine tests. Perform point-of-care tests where available.',
        canProceed: true,
      },
    ],
    anaesthesiaConsiderations: [
      'Local anaesthesia: Clinical assessment often sufficient',
      'Spinal/epidural: Mandatory platelet count and coagulation profile',
      'General anaesthesia: FBC, electrolytes (major surgery), ECG (≥40 years)',
    ],
    redFlags: [
      'Unexplained anaemia (Hb <10 g/dL)',
      'Undiagnosed diabetes (glucose >11 mmol/L)',
      'Positive pregnancy test',
      'Abnormal ECG findings',
    ],
  },

  // ============================================================
  // HYPERTENSION
  // ============================================================
  {
    category: 'hypertension',
    name: 'Hypertensive Patients',
    description: 'Patients with diagnosed or newly detected hypertension requiring perioperative management',
    investigations: [
      ...BASELINE_INVESTIGATIONS,
      {
        type: 'electrolytes',
        name: 'Serum Electrolytes',
        requirement: 'mandatory',
        rationale: 'Assess potassium (diuretic-induced hypokalaemia) and sodium levels',
        expectedValue: 'K⁺: 3.5-5.0 mmol/L; Na⁺: 135-145 mmol/L',
        minSafeLevel: 'K⁺ ≥3.0 mmol/L',
        unit: 'mmol/L',
      },
      {
        type: 'renal_function',
        name: 'Renal Function Tests',
        requirement: 'mandatory',
        rationale: 'Assess for hypertensive nephropathy and baseline renal function',
        expectedValue: 'Creatinine normal or stable baseline',
        minSafeLevel: 'No acute kidney injury',
      },
      {
        type: 'ecg',
        name: '12-Lead ECG',
        requirement: 'mandatory',
        rationale: 'Assess for LVH, ischaemia, arrhythmias',
        expectedValue: 'No acute ischaemia, no significant LVH',
        minSafeLevel: 'No acute ischaemic changes',
      },
    ],
    optimizations: [
      {
        category: 'Blood Pressure Control',
        recommendation: 'Target BP <140/90 mmHg before elective surgery',
        priority: 'critical',
        timing: 'before_surgery',
      },
      {
        category: 'Antihypertensives',
        recommendation: 'Continue antihypertensives (except ACE-I/ARB on morning of GA per institutional policy)',
        priority: 'important',
        timing: 'peri_operative',
      },
      {
        category: 'Electrolyte Correction',
        recommendation: 'Correct hypokalaemia (K⁺ <3.5 mmol/L) before surgery',
        priority: 'critical',
        timing: 'before_surgery',
      },
      {
        category: 'Volume Status',
        recommendation: 'Ensure euvolemia before spinal/general anaesthesia',
        priority: 'important',
        timing: 'before_surgery',
      },
    ],
    surgicalTiming: [
      {
        urgency: 'elective',
        guidance: 'Defer if BP ≥160/100 mmHg. Optimize for 2-4 weeks if possible.',
        canProceed: false,
        conditions: ['BP <160/100 mmHg', 'K⁺ ≥3.0 mmol/L', 'Stable renal function'],
      },
      {
        urgency: 'urgent',
        guidance: 'Control BP to <160/100 mmHg. Proceed once stabilized.',
        canProceed: true,
        conditions: ['BP controlled to <160/100 mmHg', 'Electrolytes corrected'],
      },
      {
        urgency: 'emergency',
        guidance: 'Proceed. Avoid rapid BP swings. Treat hypertensive crisis concurrently.',
        canProceed: true,
      },
    ],
    anaesthesiaConsiderations: [
      'Higher risk of perioperative hypotension with spinal/epidural',
      'Exaggerated response to induction agents',
      'Higher risk of myocardial ischaemia',
      'Beta-blockers should be continued perioperatively',
    ],
    redFlags: [
      'BP ≥180/110 mmHg (hypertensive urgency)',
      'Signs of end-organ damage (chest pain, visual disturbance, neurological deficit)',
      'Severe hypokalaemia (K⁺ <3.0 mmol/L)',
      'Acute kidney injury',
    ],
  },

  // ============================================================
  // DIABETES MELLITUS
  // ============================================================
  {
    category: 'diabetes',
    name: 'Diabetic Patients',
    description: 'Patients with Type 1 or Type 2 diabetes requiring glycaemic optimization',
    investigations: [
      ...BASELINE_INVESTIGATIONS,
      {
        type: 'hba1c',
        name: 'Glycated Haemoglobin (HbA1c)',
        requirement: 'mandatory',
        rationale: 'Assess long-term glycaemic control',
        expectedValue: '<7-8%',
        minSafeLevel: '≤9% (elective surgery)',
        unit: '%',
      },
      {
        type: 'electrolytes',
        name: 'Serum Electrolytes',
        requirement: 'mandatory',
        rationale: 'Assess for electrolyte derangements',
        expectedValue: 'Normal ranges',
        minSafeLevel: 'No severe abnormalities',
      },
      {
        type: 'renal_function',
        name: 'Renal Function Tests',
        requirement: 'mandatory',
        rationale: 'Assess for diabetic nephropathy',
        expectedValue: 'Stable creatinine',
        minSafeLevel: 'No acute rise',
      },
      {
        type: 'ecg',
        name: '12-Lead ECG',
        requirement: 'mandatory',
        rationale: 'Assess for silent ischaemia (common in diabetics)',
        expectedValue: 'No acute ischaemia',
        minSafeLevel: 'No acute changes',
      },
    ],
    optimizations: [
      {
        category: 'Glycaemic Control',
        recommendation: 'Target fasting glucose 4-7 mmol/L; Random <10 mmol/L',
        priority: 'critical',
        timing: 'before_surgery',
      },
      {
        category: 'Medication Adjustment',
        recommendation: 'Convert oral agents to insulin perioperatively for major surgery',
        priority: 'important',
        timing: 'before_surgery',
      },
      {
        category: 'Hypoglycaemia Prevention',
        recommendation: 'Schedule as first case. Regular glucose monitoring.',
        priority: 'critical',
        timing: 'peri_operative',
      },
      {
        category: 'Ketone Check',
        recommendation: 'Check for ketones if glucose >15 mmol/L',
        priority: 'critical',
        timing: 'before_surgery',
      },
    ],
    surgicalTiming: [
      {
        urgency: 'elective',
        guidance: 'Postpone if HbA1c >9% or glucose persistently >15 mmol/L. Optimize for 4-6 weeks.',
        canProceed: false,
        conditions: ['HbA1c ≤9%', 'Glucose <15 mmol/L', 'No ketones'],
      },
      {
        urgency: 'urgent',
        guidance: 'Correct hyperglycaemia. Exclude ketoacidosis. Proceed once stabilized.',
        canProceed: true,
        conditions: ['No DKA/HHS', 'Glucose <15 mmol/L with treatment'],
      },
      {
        urgency: 'emergency',
        guidance: 'Proceed after excluding DKA/HHS. IV insulin infusion. Close monitoring.',
        canProceed: true,
      },
    ],
    anaesthesiaConsiderations: [
      'Schedule as first on morning list',
      'Continue basal insulin at reduced dose',
      'Hold morning oral hypoglycaemics',
      'Variable rate insulin infusion for major surgery',
      'Target glucose 6-12 mmol/L perioperatively',
    ],
    redFlags: [
      'Diabetic ketoacidosis (DKA)',
      'Hyperosmolar hyperglycaemic state (HHS)',
      'Severe hypoglycaemia',
      'Glucose persistently >20 mmol/L',
    ],
  },

  // ============================================================
  // SEVERE SEPSIS
  // ============================================================
  {
    category: 'severe_sepsis',
    name: 'Patients with Severe Sepsis',
    description: 'Critically ill patients with sepsis requiring source control surgery',
    investigations: [
      ...BASELINE_INVESTIGATIONS,
      {
        type: 'abg',
        name: 'Arterial Blood Gas',
        requirement: 'mandatory',
        rationale: 'Assess acid-base status and oxygenation',
        expectedValue: 'pH 7.35-7.45; No severe acidosis',
        minSafeLevel: 'pH ≥7.2',
      },
      {
        type: 'lactate',
        name: 'Serum Lactate',
        requirement: 'mandatory',
        rationale: 'Assess tissue perfusion and sepsis severity',
        expectedValue: '<2 mmol/L',
        minSafeLevel: 'Trending down',
        unit: 'mmol/L',
      },
      {
        type: 'coagulation',
        name: 'Coagulation Profile',
        requirement: 'mandatory',
        rationale: 'Assess for DIC and coagulopathy',
        expectedValue: 'INR <1.5; Platelets >150 ×10⁹/L',
        minSafeLevel: 'INR ≤1.8; Platelets ≥75 ×10⁹/L',
      },
      {
        type: 'renal_function',
        name: 'Renal Function Tests',
        requirement: 'mandatory',
        rationale: 'Assess for acute kidney injury',
        expectedValue: 'Stable creatinine',
        minSafeLevel: 'Not rising rapidly',
      },
    ],
    optimizations: [
      {
        category: 'Early Antibiotics',
        recommendation: 'Administer broad-spectrum antibiotics within 1 hour of recognition',
        priority: 'critical',
        timing: 'immediate',
      },
      {
        category: 'Fluid Resuscitation',
        recommendation: 'Crystalloid 30 mL/kg for hypotension or lactate >4 mmol/L',
        priority: 'critical',
        timing: 'immediate',
      },
      {
        category: 'Vasopressors',
        recommendation: 'Noradrenaline if MAP <65 mmHg despite fluids',
        priority: 'critical',
        timing: 'immediate',
      },
      {
        category: 'Source Control',
        recommendation: 'Surgical source control within 6-12 hours if possible',
        priority: 'critical',
        timing: 'before_surgery',
      },
    ],
    surgicalTiming: [
      {
        urgency: 'elective',
        guidance: 'CONTRAINDICATED. No elective surgery in active sepsis.',
        canProceed: false,
      },
      {
        urgency: 'urgent',
        guidance: 'Delay for resuscitation. Proceed once MAP ≥65 mmHg and lactate trending down.',
        canProceed: true,
        conditions: ['MAP ≥60 mmHg', 'Lactate trending down', 'Initial resuscitation complete'],
      },
      {
        urgency: 'emergency',
        guidance: 'Proceed with full monitoring. ICU-level perioperative care mandatory.',
        canProceed: true,
      },
    ],
    anaesthesiaConsiderations: [
      'High risk of cardiovascular collapse on induction',
      'ICU-level monitoring essential',
      'Avoid spinal/epidural (coagulopathy risk)',
      'Reduced anaesthetic requirements',
      'Invasive monitoring recommended',
    ],
    redFlags: [
      'MAP <60 mmHg despite vasopressors',
      'Lactate >4 mmol/L and rising',
      'pH <7.2',
      'Platelets <50 ×10⁹/L',
      'Anuric renal failure',
    ],
  },

  // ============================================================
  // ASTHMA
  // ============================================================
  {
    category: 'asthma',
    name: 'Asthmatic Patients',
    description: 'Patients with bronchial asthma requiring airway optimization',
    investigations: [
      ...BASELINE_INVESTIGATIONS,
      {
        type: 'pulmonary_function',
        name: 'Peak Flow / Spirometry',
        requirement: 'recommended',
        rationale: 'Assess current control and baseline function',
        expectedValue: 'PEFR >80% predicted',
        minSafeLevel: 'PEFR ≥60% predicted',
      },
      {
        type: 'chest_xray',
        name: 'Chest X-Ray',
        requirement: 'if_indicated',
        rationale: 'Only if suspected infection or acute exacerbation',
        expectedValue: 'No infection',
        minSafeLevel: 'No active pneumonia',
      },
    ],
    optimizations: [
      {
        category: 'Bronchodilators',
        recommendation: 'Intensify bronchodilator therapy before surgery',
        priority: 'critical',
        timing: 'before_surgery',
      },
      {
        category: 'Steroids',
        recommendation: 'Short course oral steroids (40mg prednisolone) if poorly controlled',
        priority: 'important',
        timing: 'before_surgery',
      },
      {
        category: 'Infection Treatment',
        recommendation: 'Treat any chest infection before elective surgery',
        priority: 'critical',
        timing: 'before_surgery',
      },
      {
        category: 'Nebulization',
        recommendation: 'Nebulize salbutamol pre-operatively',
        priority: 'important',
        timing: 'peri_operative',
      },
    ],
    surgicalTiming: [
      {
        urgency: 'elective',
        guidance: 'Delay if active wheeze or recent exacerbation. Optimize for 2-4 weeks.',
        canProceed: false,
        conditions: ['No active wheeze', 'PEFR >60% predicted', 'No infection'],
      },
      {
        urgency: 'urgent',
        guidance: 'Optimize bronchodilation. Proceed once wheeze controlled.',
        canProceed: true,
        conditions: ['Responsive to bronchodilators', 'SpO₂ ≥92%'],
      },
      {
        urgency: 'emergency',
        guidance: 'Nebulize pre-induction. Have bronchodilators available.',
        canProceed: true,
      },
    ],
    anaesthesiaConsiderations: [
      'Prefer regional anaesthesia when possible',
      'Avoid histamine-releasing drugs',
      'Have bronchodilators available in theatre',
      'Deep extubation may reduce bronchospasm',
      'Avoid desflurane (airway irritant)',
    ],
    redFlags: [
      'Active wheeze unresponsive to treatment',
      'SpO₂ <92% on room air',
      'Recent hospitalization for asthma',
      'Current chest infection',
    ],
  },

  // ============================================================
  // SICKLE CELL DISEASE
  // ============================================================
  {
    category: 'sickle_cell',
    name: 'Sickle Cell Disease Patients',
    description: 'Patients with sickle cell disease requiring prevention of vaso-occlusive crisis',
    investigations: [
      ...BASELINE_INVESTIGATIONS,
      {
        type: 'sickling_test',
        name: 'Haemoglobin Electrophoresis',
        requirement: 'mandatory',
        rationale: 'Confirm diagnosis and HbS percentage',
        expectedValue: 'Document HbS level',
        minSafeLevel: 'Known sickle status',
      },
      {
        type: 'chest_xray',
        name: 'Chest X-Ray',
        requirement: 'mandatory',
        rationale: 'Rule out acute chest syndrome',
        expectedValue: 'Clear lung fields',
        minSafeLevel: 'No acute chest syndrome',
      },
      {
        type: 'renal_function',
        name: 'Renal Function Tests',
        requirement: 'mandatory',
        rationale: 'Assess for sickle nephropathy',
        expectedValue: 'Stable baseline',
        minSafeLevel: 'No acute deterioration',
      },
    ],
    optimizations: [
      {
        category: 'Hydration',
        recommendation: 'Ensure adequate hydration (IV fluids from admission)',
        priority: 'critical',
        timing: 'before_surgery',
      },
      {
        category: 'Oxygenation',
        recommendation: 'Maintain SpO₂ ≥95% at all times',
        priority: 'critical',
        timing: 'peri_operative',
      },
      {
        category: 'Transfusion',
        recommendation: 'Simple transfusion if Hb <7 g/dL or major surgery',
        priority: 'important',
        timing: 'before_surgery',
      },
      {
        category: 'Temperature',
        recommendation: 'Avoid hypothermia - active warming',
        priority: 'critical',
        timing: 'peri_operative',
      },
    ],
    surgicalTiming: [
      {
        urgency: 'elective',
        guidance: 'Optimize Hb and oxygenation. Haematology input recommended.',
        canProceed: true,
        conditions: ['Hb ≥7 g/dL', 'SpO₂ ≥95%', 'No acute crisis', 'Adequate hydration'],
      },
      {
        urgency: 'urgent',
        guidance: 'Correct dehydration and hypoxia. Transfuse if indicated.',
        canProceed: true,
        conditions: ['Hydration corrected', 'No acute chest syndrome'],
      },
      {
        urgency: 'emergency',
        guidance: 'Proceed with aggressive support. Avoid hypothermia, acidosis, hypoxia.',
        canProceed: true,
      },
    ],
    anaesthesiaConsiderations: [
      'Avoid hypoxia, hypothermia, acidosis, dehydration',
      'Tourniquets controversial - minimize use',
      'High-flow oxygen perioperatively',
      'Regional anaesthesia not contraindicated if hydrated',
      'Warm IV fluids and warming blankets',
    ],
    redFlags: [
      'Acute chest syndrome',
      'Vaso-occlusive crisis in progress',
      'Hb <7 g/dL',
      'SpO₂ <92%',
      'Severe pain crisis',
    ],
  },

  // ============================================================
  // BLEEDING DISORDERS / COAGULOPATHY
  // ============================================================
  {
    category: 'bleeding_disorder',
    name: 'Bleeding Disorders / Coagulopathy',
    description: 'Patients with inherited or acquired bleeding disorders',
    investigations: [
      ...BASELINE_INVESTIGATIONS,
      {
        type: 'coagulation',
        name: 'Full Coagulation Profile',
        requirement: 'mandatory',
        rationale: 'Assess clotting function comprehensively',
        expectedValue: 'INR <1.2; aPTT normal; Fibrinogen >2 g/L',
        minSafeLevel: 'INR ≤1.5; aPTT ≤1.5× control; Fibrinogen ≥1.5 g/L',
      },
      {
        type: 'fbc',
        name: 'Full Blood Count with Platelet Count',
        requirement: 'mandatory',
        rationale: 'Assess platelet count and morphology',
        expectedValue: 'Platelets >150 ×10⁹/L',
        minSafeLevel: 'Platelets ≥100 (regional); ≥50 (GA)',
      },
    ],
    optimizations: [
      {
        category: 'Vitamin K',
        recommendation: 'Vitamin K 10mg IV for elevated INR (warfarin reversal)',
        priority: 'critical',
        timing: 'before_surgery',
      },
      {
        category: 'FFP/Platelets',
        recommendation: 'Transfuse FFP, platelets as indicated',
        priority: 'critical',
        timing: 'before_surgery',
      },
      {
        category: 'Factor Replacement',
        recommendation: 'Factor concentrate (VIII, IX) for haemophilia',
        priority: 'critical',
        timing: 'before_surgery',
      },
      {
        category: 'Haematology Input',
        recommendation: 'Haematology clearance mandatory before neuraxial blocks',
        priority: 'critical',
        timing: 'before_surgery',
      },
    ],
    surgicalTiming: [
      {
        urgency: 'elective',
        guidance: 'NEVER proceed uncorrected. Full optimization required.',
        canProceed: false,
        conditions: ['INR ≤1.5', 'Platelets ≥100 ×10⁹/L', 'Factor levels adequate'],
      },
      {
        urgency: 'urgent',
        guidance: 'Correct rapidly before incision. Have blood products ready.',
        canProceed: true,
        conditions: ['Correction in progress', 'Blood products available'],
      },
      {
        urgency: 'emergency',
        guidance: 'Correct concurrently with surgery. Massive transfusion protocol ready.',
        canProceed: true,
      },
    ],
    anaesthesiaConsiderations: [
      'Spinal/epidural: Platelets ≥100 ×10⁹/L; INR ≤1.5',
      'General anaesthesia: Platelets ≥50 ×10⁹/L acceptable',
      'Avoid NSAIDs',
      'Have blood products immediately available',
      'Consider tranexamic acid',
    ],
    redFlags: [
      'Active bleeding',
      'INR >2.0 and surgery needed',
      'Platelets <50 ×10⁹/L',
      'Fibrinogen <1.0 g/L',
      'Unknown bleeding history with abnormal tests',
    ],
  },
];

// ============================================================
// PROCEDURE-BASED INVESTIGATION REQUIREMENTS
// ============================================================

export interface ProcedureInvestigationMatrix {
  procedureCategory: ProcedureCategory;
  investigations: {
    type: InvestigationType;
    requirement: RequirementLevel;
  }[];
}

export const PROCEDURE_INVESTIGATION_MATRIX: ProcedureInvestigationMatrix[] = [
  {
    procedureCategory: 'minor',
    investigations: [
      { type: 'fbc', requirement: 'recommended' },
      { type: 'blood_glucose', requirement: 'recommended' },
      { type: 'urinalysis', requirement: 'if_indicated' },
    ],
  },
  {
    procedureCategory: 'intermediate',
    investigations: [
      { type: 'fbc', requirement: 'mandatory' },
      { type: 'blood_glucose', requirement: 'mandatory' },
      { type: 'urinalysis', requirement: 'mandatory' },
      { type: 'electrolytes', requirement: 'recommended' },
      { type: 'renal_function', requirement: 'recommended' },
      { type: 'ecg', requirement: 'if_indicated' },
      { type: 'blood_group', requirement: 'recommended' },
    ],
  },
  {
    procedureCategory: 'major',
    investigations: [
      { type: 'fbc', requirement: 'mandatory' },
      { type: 'blood_glucose', requirement: 'mandatory' },
      { type: 'urinalysis', requirement: 'mandatory' },
      { type: 'electrolytes', requirement: 'mandatory' },
      { type: 'renal_function', requirement: 'mandatory' },
      { type: 'coagulation', requirement: 'mandatory' },
      { type: 'ecg', requirement: 'mandatory' },
      { type: 'blood_group', requirement: 'mandatory' },
      { type: 'chest_xray', requirement: 'recommended' },
    ],
  },
  {
    procedureCategory: 'super_major',
    investigations: [
      { type: 'fbc', requirement: 'mandatory' },
      { type: 'blood_glucose', requirement: 'mandatory' },
      { type: 'urinalysis', requirement: 'mandatory' },
      { type: 'electrolytes', requirement: 'mandatory' },
      { type: 'renal_function', requirement: 'mandatory' },
      { type: 'liver_function', requirement: 'mandatory' },
      { type: 'coagulation', requirement: 'mandatory' },
      { type: 'ecg', requirement: 'mandatory' },
      { type: 'blood_group', requirement: 'mandatory' },
      { type: 'chest_xray', requirement: 'mandatory' },
      { type: 'echo', requirement: 'recommended' },
    ],
  },
];

// ============================================================
// ANAESTHESIA-BASED INVESTIGATION REQUIREMENTS
// ============================================================

export interface AnaesthesiaInvestigationMatrix {
  anaesthesiaType: AnaesthesiaType;
  additionalInvestigations: {
    type: InvestigationType;
    requirement: RequirementLevel;
  }[];
}

export const ANAESTHESIA_INVESTIGATION_MATRIX: AnaesthesiaInvestigationMatrix[] = [
  {
    anaesthesiaType: 'local',
    additionalInvestigations: [],
  },
  {
    anaesthesiaType: 'sedation',
    additionalInvestigations: [
      { type: 'fbc', requirement: 'recommended' },
    ],
  },
  {
    anaesthesiaType: 'spinal',
    additionalInvestigations: [
      { type: 'fbc', requirement: 'mandatory' },
      { type: 'coagulation', requirement: 'mandatory' },
    ],
  },
  {
    anaesthesiaType: 'epidural',
    additionalInvestigations: [
      { type: 'fbc', requirement: 'mandatory' },
      { type: 'coagulation', requirement: 'mandatory' },
    ],
  },
  {
    anaesthesiaType: 'general',
    additionalInvestigations: [
      { type: 'fbc', requirement: 'mandatory' },
      { type: 'electrolytes', requirement: 'recommended' },
      { type: 'renal_function', requirement: 'recommended' },
      { type: 'ecg', requirement: 'if_indicated' },
    ],
  },
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export function getProtocolForComorbidity(category: ComorbidityCategory): ComorbidityProtocol | undefined {
  return COMORBIDITY_PROTOCOLS.find(p => p.category === category);
}

export function getInvestigationsForProcedure(category: ProcedureCategory): ProcedureInvestigationMatrix | undefined {
  return PROCEDURE_INVESTIGATION_MATRIX.find(p => p.procedureCategory === category);
}

export function getInvestigationsForAnaesthesia(type: AnaesthesiaType): AnaesthesiaInvestigationMatrix | undefined {
  return ANAESTHESIA_INVESTIGATION_MATRIX.find(a => a.anaesthesiaType === type);
}

// Combine investigations from multiple sources and return unique list
export function generateInvestigationList(
  comorbidities: ComorbidityCategory[],
  procedureCategory: ProcedureCategory,
  anaesthesiaType: AnaesthesiaType,
  patientAge: number,
  isFemaleReproductiveAge: boolean
): InvestigationRequirement[] {
  const investigationsMap = new Map<InvestigationType, InvestigationRequirement>();

  // Start with baseline
  BASELINE_INVESTIGATIONS.forEach(inv => {
    investigationsMap.set(inv.type, { ...inv });
  });

  // Add comorbidity-specific investigations
  comorbidities.forEach(comorbidity => {
    const protocol = getProtocolForComorbidity(comorbidity);
    if (protocol) {
      protocol.investigations.forEach(inv => {
        const existing = investigationsMap.get(inv.type);
        if (!existing || getRequirementPriority(inv.requirement) > getRequirementPriority(existing.requirement)) {
          investigationsMap.set(inv.type, { ...inv });
        }
      });
    }
  });

  // Add procedure-specific investigations
  const procedureInv = getInvestigationsForProcedure(procedureCategory);
  if (procedureInv) {
    procedureInv.investigations.forEach(inv => {
      const existing = investigationsMap.get(inv.type);
      const info = INVESTIGATION_INFO[inv.type];
      if (!existing || getRequirementPriority(inv.requirement) > getRequirementPriority(existing.requirement)) {
        investigationsMap.set(inv.type, {
          type: inv.type,
          name: info.name,
          requirement: inv.requirement,
          rationale: `Required for ${procedureCategory} surgery`,
          expectedValue: 'As per standard ranges',
          minSafeLevel: 'As per protocol',
        });
      }
    });
  }

  // Add anaesthesia-specific investigations
  const anaesthesiaInv = getInvestigationsForAnaesthesia(anaesthesiaType);
  if (anaesthesiaInv) {
    anaesthesiaInv.additionalInvestigations.forEach(inv => {
      const existing = investigationsMap.get(inv.type);
      const info = INVESTIGATION_INFO[inv.type];
      if (!existing || getRequirementPriority(inv.requirement) > getRequirementPriority(existing.requirement)) {
        investigationsMap.set(inv.type, {
          type: inv.type,
          name: info.name,
          requirement: inv.requirement,
          rationale: `Required for ${anaesthesiaType} anaesthesia`,
          expectedValue: 'As per standard ranges',
          minSafeLevel: 'As per protocol',
        });
      }
    });
  }

  // Add age-based investigations
  if (patientAge >= 40) {
    const existing = investigationsMap.get('ecg');
    if (!existing || existing.requirement === 'if_indicated') {
      investigationsMap.set('ecg', {
        type: 'ecg',
        name: '12-Lead ECG',
        requirement: 'mandatory',
        rationale: 'Required for patients ≥40 years of age',
        expectedValue: 'No acute ischaemia',
        minSafeLevel: 'No acute changes',
      });
    }
  }

  // Add pregnancy test for women of reproductive age
  if (isFemaleReproductiveAge) {
    investigationsMap.set('pregnancy_test', {
      type: 'pregnancy_test',
      name: 'Pregnancy Test',
      requirement: 'mandatory',
      rationale: 'Required for all women of reproductive age (15-50 years)',
      expectedValue: 'Negative (unless known pregnancy)',
      minSafeLevel: 'Result documented',
    });
  }

  return Array.from(investigationsMap.values());
}

function getRequirementPriority(requirement: RequirementLevel): number {
  const priorities: Record<RequirementLevel, number> = {
    'mandatory': 4,
    'recommended': 3,
    'if_indicated': 2,
    'not_required': 1,
  };
  return priorities[requirement];
}

// ASA Classification helper
export function suggestASAClass(comorbidities: ComorbidityCategory[]): string {
  if (comorbidities.length === 0 || (comorbidities.length === 1 && comorbidities[0] === 'none')) {
    return 'I';
  }
  if (comorbidities.includes('severe_sepsis')) {
    return 'IV';
  }
  if (comorbidities.length >= 3) {
    return 'III';
  }
  if (comorbidities.length >= 1) {
    return 'II';
  }
  return 'I';
}
