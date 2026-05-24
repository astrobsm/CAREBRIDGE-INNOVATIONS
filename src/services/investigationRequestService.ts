// ============================================================
// Investigation Request Service
// - Full catalog (9 categories) for the dynamic checkbox form
// - CKD-EPI 2021 (race-free) eGFR autocalculation
// - Bundle persistence: spawns one Investigation row per ticked
//   item so existing approval / results / sync flow is reused
// - Soft-warning gate helper for scoring modules
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db';
import type {
  InvestigationRequestBundle,
  InvestigationRequestItem,
  InvestigationCategory,
  Investigation,
} from '../types';

// ------------------------------------------------------------
// CATALOG
// ------------------------------------------------------------

export interface CatalogItem {
  code: string;
  name: string;
  /** Optional structured modifier hint (e.g. side, units) */
  modifierKind?: 'side' | 'units' | 'site' | 'none';
  defaultModifiers?: Record<string, any>;
}

export interface CatalogGroup {
  group: string;
  items: CatalogItem[];
}

export interface CatalogCategory {
  category: InvestigationCategory;
  title: string;
  groups: CatalogGroup[];
}

export const INVESTIGATION_CATALOG: CatalogCategory[] = [
  {
    category: 'hematology',
    title: 'Laboratory Request — Hematology',
    groups: [
      {
        group: 'Complete Blood Count (CBC/FBC)',
        items: [
          { code: 'fbc', name: 'Full Blood Count (FBC) with Differential' },
          { code: 'hb', name: 'Hemoglobin (Hb)' },
          { code: 'pcv', name: 'Packed Cell Volume (PCV/HCT)' },
          { code: 'platelets', name: 'Platelet Count' },
          { code: 'wbc', name: 'White Cell Count (WBC)' },
          { code: 'rci', name: 'Red Cell Indices (MCV, MCH, MCHC)' },
          { code: 'pbf', name: 'Peripheral Blood Film' },
        ],
      },
      {
        group: 'Coagulation Studies',
        items: [
          { code: 'pt', name: 'Prothrombin Time (PT)' },
          { code: 'inr', name: 'INR' },
          { code: 'aptt', name: 'Activated Partial Thromboplastin Time (APTT)' },
          { code: 'bt', name: 'Bleeding Time' },
          { code: 'ct', name: 'Clotting Time' },
          { code: 'ddimer', name: 'D-Dimer' },
          { code: 'fibrinogen', name: 'Fibrinogen' },
        ],
      },
      {
        group: 'Blood Grouping & Compatibility',
        items: [
          { code: 'abo', name: 'Blood Group (ABO)' },
          { code: 'rh', name: 'Rhesus Factor' },
          { code: 'crossmatch', name: 'Cross-Match', modifierKind: 'units', defaultModifiers: { units: 2 } },
          { code: 'antibody_screen', name: 'Antibody Screen' },
          { code: 'coombs', name: 'Direct Coombs Test' },
        ],
      },
      {
        group: 'Inflammatory Markers',
        items: [
          { code: 'esr', name: 'Erythrocyte Sedimentation Rate (ESR)' },
          { code: 'crp', name: 'C-Reactive Protein (CRP)' },
          { code: 'procalcitonin', name: 'Procalcitonin' },
          { code: 'ferritin', name: 'Ferritin' },
        ],
      },
    ],
  },
  {
    category: 'biochemistry',
    title: 'Laboratory Request — Biochemistry',
    groups: [
      {
        group: 'Glucose & Diabetic Profile',
        items: [
          { code: 'fbg', name: 'Fasting Blood Glucose (FBG)' },
          { code: 'rbg', name: 'Random Blood Glucose (RBG)' },
          { code: 'pp2h', name: '2-Hour Post Prandial Glucose' },
          { code: 'hba1c', name: 'HbA1c (Glycated Hemoglobin)' },
          { code: 'ogtt', name: 'Oral Glucose Tolerance Test (OGTT)' },
          { code: 'fructosamine', name: 'Fructosamine' },
        ],
      },
      {
        group: 'Renal Function Tests',
        items: [
          { code: 'electrolytes', name: 'Electrolytes (Na+, K+, Cl-, HCO3-)' },
          { code: 'urea', name: 'Urea' },
          { code: 'creatinine', name: 'Serum Creatinine' },
          { code: 'egfr', name: 'eGFR (Estimated Glomerular Filtration Rate)' },
          { code: 'bun', name: 'BUN (Blood Urea Nitrogen)' },
          { code: 'uric_acid', name: 'Uric Acid' },
          { code: 'calcium', name: 'Calcium' },
          { code: 'phosphate', name: 'Phosphate' },
          { code: 'magnesium', name: 'Magnesium' },
        ],
      },
      {
        group: 'Liver Function Tests',
        items: [
          { code: 'tbil', name: 'Total Bilirubin' },
          { code: 'dbil', name: 'Direct Bilirubin' },
          { code: 'ibil', name: 'Indirect Bilirubin' },
          { code: 'alt', name: 'ALT (SGPT)' },
          { code: 'ast', name: 'AST (SGOT)' },
          { code: 'alp', name: 'ALP (Alkaline Phosphatase)' },
          { code: 'ggt', name: 'GGT (Gamma GT)' },
          { code: 'total_protein', name: 'Total Protein' },
          { code: 'albumin', name: 'Serum Albumin' },
        ],
      },
      {
        group: 'Lipid Profile',
        items: [
          { code: 'tc', name: 'Total Cholesterol' },
          { code: 'tg', name: 'Triglycerides' },
          { code: 'hdl', name: 'HDL Cholesterol' },
          { code: 'ldl', name: 'LDL Cholesterol' },
          { code: 'vldl', name: 'VLDL Cholesterol' },
        ],
      },
      {
        group: 'Other Biochemistry',
        items: [
          { code: 'lactate', name: 'Serum Lactate' },
          { code: 'amylase', name: 'Amylase' },
          { code: 'lipase', name: 'Lipase' },
          { code: 'b12', name: 'Vitamin B12' },
          { code: 'folate', name: 'Folate' },
          { code: 'vitd', name: 'Vitamin D (25-OH)' },
        ],
      },
    ],
  },
  {
    category: 'microbiology',
    title: 'Laboratory Request — Microbiology / Infection',
    groups: [
      {
        group: 'Blood Culture',
        items: [
          { code: 'bc_aerobic', name: 'Blood Culture — Aerobic' },
          { code: 'bc_anaerobic', name: 'Blood Culture — Anaerobic' },
          { code: 'bc_x2', name: 'Blood Culture x 2 Sets' },
          { code: 'bc_fungal', name: 'Fungal Blood Culture' },
        ],
      },
      {
        group: 'Wound & Tissue Samples',
        items: [
          { code: 'wound_mcs', name: 'Wound Swab — Microscopy, Culture & Sensitivity (MCS)', modifierKind: 'site' },
          { code: 'deep_tissue_culture', name: 'Deep Tissue Biopsy for Culture', modifierKind: 'site' },
          { code: 'bone_biopsy_culture', name: 'Bone Biopsy for Culture', modifierKind: 'site' },
          { code: 'pus_mcs', name: 'Pus for MCS', modifierKind: 'site' },
          { code: 'aspirate_mcs', name: 'Aspirate for MCS', modifierKind: 'site' },
          { code: 'gram_stain', name: 'Gram Stain', modifierKind: 'site' },
        ],
      },
      {
        group: 'Urine Analysis',
        items: [
          { code: 'urinalysis', name: 'Urinalysis (Dipstick)' },
          { code: 'urine_micro', name: 'Urine Microscopy' },
          { code: 'urine_mcs', name: 'Urine Culture & Sensitivity' },
          { code: 'urine_24h_protein', name: '24-Hour Urine Protein' },
          { code: 'acr', name: 'Urine Albumin/Creatinine Ratio (ACR)' },
        ],
      },
      {
        group: 'Special Microbiology Tests',
        items: [
          { code: 'afb', name: 'AFB Smear (TB)' },
          { code: 'tb_culture', name: 'TB Culture' },
          { code: 'genexpert', name: 'GeneXpert MTB/RIF' },
          { code: 'hiv', name: 'HIV Screening' },
          { code: 'hbsag', name: 'Hepatitis B (HBsAg)' },
          { code: 'hcv', name: 'Hepatitis C (Anti-HCV)' },
          { code: 'vdrl', name: 'VDRL/RPR (Syphilis)' },
        ],
      },
    ],
  },
  {
    category: 'plain_xray',
    title: 'Radiology Request — Plain Radiography',
    groups: [
      {
        group: 'Lower Limb Radiographs',
        items: [
          { code: 'xr_foot_ap', name: 'X-ray Foot — AP View', modifierKind: 'side' },
          { code: 'xr_foot_lat', name: 'X-ray Foot — Lateral View', modifierKind: 'side' },
          { code: 'xr_foot_obl', name: 'X-ray Foot — Oblique View', modifierKind: 'side' },
          { code: 'xr_ankle_ap', name: 'X-ray Ankle — AP View', modifierKind: 'side' },
          { code: 'xr_ankle_lat', name: 'X-ray Ankle — Lateral View', modifierKind: 'side' },
          { code: 'xr_ankle_mortise', name: 'X-ray Ankle — Mortise View', modifierKind: 'side' },
          { code: 'xr_tibfib', name: 'X-ray Tibia/Fibula — AP & Lateral', modifierKind: 'side' },
          { code: 'xr_knee', name: 'X-ray Knee — AP & Lateral', modifierKind: 'side' },
          { code: 'xr_femur', name: 'X-ray Femur', modifierKind: 'side' },
          { code: 'xr_pelvis', name: 'X-ray Pelvis/Hip' },
        ],
      },
      {
        group: 'Chest & Other Radiographs',
        items: [
          { code: 'cxr_pa', name: 'Chest X-ray — PA View' },
          { code: 'cxr_lat', name: 'Chest X-ray — Lateral View' },
          { code: 'cxr_ap', name: 'Chest X-ray — AP (Portable)' },
          { code: 'axr', name: 'Abdominal X-ray' },
          { code: 'spine_xr', name: 'Spine X-ray' },
        ],
      },
    ],
  },
  {
    category: 'advanced_imaging',
    title: 'Radiology Request — Advanced Imaging',
    groups: [
      {
        group: 'Computed Tomography (CT)',
        items: [
          { code: 'ct_foot', name: 'CT Foot', modifierKind: 'side' },
          { code: 'ct_ankle', name: 'CT Ankle', modifierKind: 'side' },
          { code: 'ct_lower_limb', name: 'CT Lower Limb', modifierKind: 'side' },
          { code: 'ct_iv_contrast', name: 'CT with IV Contrast' },
          { code: 'ct_no_contrast', name: 'CT without Contrast' },
          { code: 'ct_3d', name: 'CT 3D Reconstruction' },
        ],
      },
      {
        group: 'Magnetic Resonance Imaging (MRI)',
        items: [
          { code: 'mri_foot', name: 'MRI Foot', modifierKind: 'side' },
          { code: 'mri_ankle', name: 'MRI Ankle', modifierKind: 'side' },
          { code: 'mri_lower_limb', name: 'MRI Lower Limb', modifierKind: 'side' },
          { code: 'mri_gad', name: 'MRI with Gadolinium' },
          { code: 'mri_no_gad', name: 'MRI without Contrast' },
          { code: 'mri_osteo', name: 'MRI — Osteomyelitis Protocol' },
          { code: 'mri_soft_tissue', name: 'MRI — Soft Tissue Infection' },
        ],
      },
      {
        group: 'Nuclear Medicine / Bone Scan',
        items: [
          { code: 'tc99m_bone_scan', name: 'Tc-99m Bone Scan (3-Phase)' },
          { code: 'wbc_in111', name: 'WBC-Labeled Scan (Indium-111)' },
          { code: 'pet_ct', name: 'PET-CT Scan' },
          { code: 'gallium67', name: 'Gallium-67 Scan' },
        ],
      },
      {
        group: 'Ultrasound',
        items: [
          { code: 'us_soft_tissue', name: 'Ultrasound Soft Tissue (Foot/Ankle)', modifierKind: 'side' },
          { code: 'us_guided_asp', name: 'Ultrasound-Guided Aspiration' },
          { code: 'us_doppler', name: 'Doppler Ultrasound', modifierKind: 'side' },
        ],
      },
    ],
  },
  {
    category: 'vascular',
    title: 'Vascular Studies Request',
    groups: [
      {
        group: 'Non-Invasive Vascular Studies',
        items: [
          { code: 'abi', name: 'Ankle-Brachial Index (ABI)', modifierKind: 'side' },
          { code: 'tbi', name: 'Toe-Brachial Index (TBI)', modifierKind: 'side' },
          { code: 'art_doppler', name: 'Arterial Doppler — Lower Limbs', modifierKind: 'side' },
          { code: 'ven_doppler', name: 'Venous Doppler — Lower Limbs', modifierKind: 'side' },
          { code: 'duplex_art', name: 'Duplex Ultrasound — Lower Limb Arteries', modifierKind: 'side' },
          { code: 'duplex_ven', name: 'Duplex Ultrasound — Lower Limb Veins', modifierKind: 'side' },
          { code: 'tcpo2', name: 'Transcutaneous Oxygen (TcPO2)' },
          { code: 'pvr', name: 'Pulse Volume Recording (PVR)' },
          { code: 'seg_press', name: 'Segmental Pressures' },
        ],
      },
      {
        group: 'Angiography Studies',
        items: [
          { code: 'cta_lower', name: 'CT Angiography (CTA) — Lower Limbs', modifierKind: 'side' },
          { code: 'cta_aortoiliac', name: 'CT Angiography — Aorto-iliac' },
          { code: 'mra_lower', name: 'MR Angiography (MRA) — Lower Limbs', modifierKind: 'side' },
          { code: 'dsa', name: 'Digital Subtraction Angiography (DSA)', modifierKind: 'side' },
        ],
      },
    ],
  },
  {
    category: 'cardiac_preop',
    title: 'Cardiac & Pre-Operative Workup',
    groups: [
      {
        group: 'Electrocardiography',
        items: [
          { code: 'ecg_12', name: 'ECG (12-Lead)' },
          { code: 'ecg_rhythm', name: 'ECG (Rhythm Strip)' },
          { code: 'holter', name: 'Holter Monitor (24hr)' },
          { code: 'stress_ecg', name: 'Exercise ECG / Stress Test' },
        ],
      },
      {
        group: 'Echocardiography',
        items: [
          { code: 'tte', name: 'Transthoracic Echocardiogram (TTE)' },
          { code: 'tee', name: 'Transesophageal Echocardiogram (TEE)' },
          { code: 'stress_echo', name: 'Stress Echocardiogram' },
          { code: 'dobutamine_echo', name: 'Dobutamine Stress Echo' },
        ],
      },
      {
        group: 'Cardiac Biomarkers',
        items: [
          { code: 'troponin', name: 'Troponin I / T' },
          { code: 'probnp', name: 'Pro-BNP / NT-proBNP' },
          { code: 'ckmb', name: 'CK-MB' },
        ],
      },
      {
        group: 'Pre-Operative Tests',
        items: [
          { code: 'preop_cxr', name: 'Chest X-ray (PA)' },
          { code: 'preop_ecg', name: 'ECG (12-Lead)' },
          { code: 'preop_fbc', name: 'FBC' },
          { code: 'preop_eucr', name: 'E/U/Cr' },
          { code: 'preop_lft', name: 'LFT' },
          { code: 'preop_glucose', name: 'Blood Glucose' },
          { code: 'preop_coag', name: 'Coagulation Profile' },
          { code: 'group_save', name: 'Group & Save' },
          { code: 'preop_crossmatch', name: 'Cross-Match', modifierKind: 'units', defaultModifiers: { units: 2 } },
          { code: 'preop_urinalysis', name: 'Urinalysis' },
        ],
      },
    ],
  },
  {
    category: 'consultation',
    title: 'Specialty Consultation Request',
    groups: [
      {
        group: 'Surgical Specialties',
        items: [
          { code: 'consult_vascular', name: 'Vascular Surgery' },
          { code: 'consult_plastics', name: 'Plastic Surgery' },
          { code: 'consult_ortho', name: 'Orthopaedic Surgery' },
          { code: 'consult_general', name: 'General Surgery' },
          { code: 'consult_podiatric', name: 'Podiatric Surgery' },
        ],
      },
      {
        group: 'Medical Specialties',
        items: [
          { code: 'consult_endo', name: 'Endocrinology / Diabetology' },
          { code: 'consult_neph', name: 'Nephrology' },
          { code: 'consult_cardio', name: 'Cardiology' },
          { code: 'consult_id', name: 'Infectious Disease' },
          { code: 'consult_im', name: 'Internal Medicine' },
          { code: 'consult_haem', name: 'Hematology' },
          { code: 'consult_rheum', name: 'Rheumatology' },
          { code: 'consult_neuro', name: 'Neurology' },
        ],
      },
      {
        group: 'Allied Health & Support Services',
        items: [
          { code: 'consult_wound_nurse', name: 'Wound Care Nurse' },
          { code: 'consult_diabetes_ed', name: 'Diabetes Educator' },
          { code: 'consult_dietitian', name: 'Dietitian / Nutritionist' },
          { code: 'consult_physio', name: 'Physiotherapy' },
          { code: 'consult_ot', name: 'Occupational Therapy' },
          { code: 'consult_prosthetics', name: 'Prosthetics/Orthotics' },
          { code: 'consult_social', name: 'Social Work' },
          { code: 'consult_pain', name: 'Pain Management' },
          { code: 'consult_psych', name: 'Psychiatry/Psychology' },
        ],
      },
    ],
  },
  {
    category: 'wound_classification',
    title: 'Wound Classification & Staging',
    groups: [
      {
        group: 'Diabetic Foot Wound Classification',
        items: [
          { code: 'wagner', name: 'Wagner Classification (Grade 0–5)' },
          { code: 'ut', name: 'University of Texas Classification (Grade + Stage)' },
          { code: 'wifi', name: 'WIfI Classification (Wound, Ischemia, foot Infection)' },
          { code: 'sinbad', name: 'SINBAD Score' },
          { code: 'pedis', name: 'PEDIS Classification' },
        ],
      },
      {
        group: 'Wound Measurements',
        items: [
          { code: 'wound_measure', name: 'Wound Length / Width / Depth / Area', modifierKind: 'site' },
          { code: 'undermining', name: 'Undermining Assessment' },
          { code: 'tunneling', name: 'Tunneling Assessment' },
        ],
      },
    ],
  },
];

// Flatten lookup for code->item
const CATALOG_LOOKUP: Record<string, { category: InvestigationCategory; group: string; item: CatalogItem }> = {};
for (const cat of INVESTIGATION_CATALOG) {
  for (const grp of cat.groups) {
    for (const it of grp.items) {
      CATALOG_LOOKUP[it.code] = { category: cat.category, group: grp.group, item: it };
    }
  }
}

export function getCatalogEntry(code: string) {
  return CATALOG_LOOKUP[code];
}

// ------------------------------------------------------------
// CKD-EPI 2021 (race-free) eGFR
// Inputs: serum creatinine in mg/dL, age years, sex 'male'|'female'
// Output: mL/min/1.73m² (rounded to whole number)
// ------------------------------------------------------------

export function calculateEGFR(
  creatinineMgDL: number,
  age: number,
  sex: 'male' | 'female'
): number | null {
  if (!creatinineMgDL || creatinineMgDL <= 0 || !age || age <= 0) return null;
  const isFemale = sex === 'female';
  const k = isFemale ? 0.7 : 0.9;
  const alpha = isFemale ? -0.241 : -0.302;
  const factor = isFemale ? 1.012 : 1.0;
  const scrK = creatinineMgDL / k;
  const minTerm = Math.pow(Math.min(scrK, 1), alpha);
  const maxTerm = Math.pow(Math.max(scrK, 1), -1.200);
  const egfr = 142 * minTerm * maxTerm * Math.pow(0.9938, age) * factor;
  return Math.round(egfr);
}

export function ckdStageFromEGFR(egfr: number): 1 | 2 | 3 | 4 | 5 {
  if (egfr >= 90) return 1;
  if (egfr >= 60) return 2;
  if (egfr >= 30) return 3;
  if (egfr >= 15) return 4;
  return 5;
}

// ------------------------------------------------------------
// Mapping: bundle category -> Investigation type/category fields
// ------------------------------------------------------------

function categoryToInvestigationFields(cat: InvestigationCategory): {
  type: Investigation['type'];
  category: Investigation['category'];
} {
  switch (cat) {
    case 'hematology':
      return { type: 'haematology', category: 'haematology' };
    case 'biochemistry':
      return { type: 'biochemistry', category: 'biochemistry' };
    case 'microbiology':
      return { type: 'microbiology', category: 'microbiology' };
    case 'plain_xray':
    case 'advanced_imaging':
      return { type: 'imaging', category: 'imaging' };
    case 'vascular':
      return { type: 'imaging', category: 'imaging' };
    case 'cardiac_preop':
      return { type: 'cardiac', category: 'cardiology' };
    case 'consultation':
      return { type: 'consultation', category: 'other' };
    case 'wound_classification':
      return { type: 'wound_assessment', category: 'other' };
    default:
      return { type: 'other', category: 'other' };
  }
}

// ------------------------------------------------------------
// Operations
// ------------------------------------------------------------

export const InvestigationRequestOps = {
  /**
   * Create a new bundle in draft state (no Investigation rows yet).
   */
  newDraftBundle(params: {
    patientId: string;
    hospitalId?: string;
    requestedBy: string;
    requestedByName?: string;
    clinicianDesignation?: string;
    encounterId?: string;
    admissionId?: string;
    sourceModule?: InvestigationRequestBundle['sourceModule'];
    sourceAssessmentId?: string;
    diagnosis?: string;
    affectedSide?: InvestigationRequestBundle['affectedSide'];
  }): InvestigationRequestBundle {
    return {
      id: uuidv4(),
      patientId: params.patientId,
      hospitalId: params.hospitalId || 'global',
      encounterId: params.encounterId,
      admissionId: params.admissionId,
      sourceModule: params.sourceModule,
      sourceAssessmentId: params.sourceAssessmentId,
      requestDate: new Date(),
      requestedBy: params.requestedBy,
      requestedByName: params.requestedByName,
      clinicianDesignation: params.clinicianDesignation,
      diagnosis: params.diagnosis,
      affectedSide: params.affectedSide || 'na',
      priority: 'routine',
      items: [],
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  },

  /**
   * Persist a bundle AND spawn one Investigation row per ticked item.
   * Returns the saved bundle with item.investigationId populated.
   */
  async submitBundle(bundle: InvestigationRequestBundle): Promise<InvestigationRequestBundle> {
    const now = new Date();
    const updatedItems: InvestigationRequestItem[] = [];
    let tickedCount = 0;

    for (const item of bundle.items) {
      if (!item.ticked) {
        updatedItems.push(item);
        continue;
      }
      tickedCount++;
      const invId = item.investigationId || uuidv4();
      const fields = categoryToInvestigationFields(item.category);
      const labelParts: string[] = [item.name];
      if (item.modifiers?.units) labelParts.push(`(${item.modifiers.units} units)`);
      if (item.modifiers?.side) labelParts.push(`(${item.modifiers.side})`);
      if (item.modifiers?.site) labelParts.push(`[${item.modifiers.site}]`);

      const investigation: Investigation = {
        id: invId,
        patientId: bundle.patientId,
        hospitalId: bundle.hospitalId,
        encounterId: bundle.encounterId,
        type: fields.type,
        category: fields.category,
        name: labelParts.join(' '),
        description: bundle.clinicalNotes,
        clinicalDetails: bundle.diagnosis,
        clinicalInfo: bundle.clinicalNotes,
        priority: bundle.priority,
        status: 'requested',
        approvalStatus: 'pending',
        requestedBy: bundle.requestedBy,
        requestedAt: now,
        autoRequested: false,
        results: [],
        createdAt: now,
        updatedAt: now,
      } as Investigation;

      try {
        await db.investigations.put(investigation);
      } catch (err) {
        console.error('[InvestigationRequestOps] Failed to create investigation', err);
      }

      updatedItems.push({
        ...item,
        investigationId: invId,
        resultStatus: 'pending',
      });
    }

    const saved: InvestigationRequestBundle = {
      ...bundle,
      items: updatedItems,
      status: tickedCount ? 'requested' : 'draft',
      updatedAt: now,
    };

    await db.table('investigationRequestBundles').put(saved);
    return saved;
  },

  async getById(id: string): Promise<InvestigationRequestBundle | undefined> {
    return db.table('investigationRequestBundles').get(id);
  },

  async getByPatient(patientId: string): Promise<InvestigationRequestBundle[]> {
    const rows: InvestigationRequestBundle[] = await db
      .table('investigationRequestBundles')
      .where('patientId')
      .equals(patientId)
      .toArray();
    return rows.sort((a, b) => +new Date(b.requestDate) - +new Date(a.requestDate));
  },

  /**
   * Refresh cached resultStatus on bundle items from the underlying
   * Investigation rows. Updates bundle.status accordingly.
   */
  async syncBundleStatus(bundleId: string): Promise<InvestigationRequestBundle | undefined> {
    const bundle: InvestigationRequestBundle | undefined = await db
      .table('investigationRequestBundles')
      .get(bundleId);
    if (!bundle) return undefined;
    let completed = 0;
    let total = 0;
    const updatedItems: InvestigationRequestItem[] = [];
    for (const item of bundle.items) {
      if (!item.ticked || !item.investigationId) {
        updatedItems.push(item);
        continue;
      }
      total++;
      const inv = await db.investigations.get(item.investigationId);
      const status = (inv?.status as InvestigationRequestItem['resultStatus']) || 'pending';
      if (status === 'completed') completed++;
      updatedItems.push({
        ...item,
        resultStatus: status,
        completedAt: inv?.status === 'completed' ? (inv as any).completedAt || new Date() : item.completedAt,
      });
    }
    let bundleStatus: InvestigationRequestBundle['status'] = bundle.status;
    if (total > 0) {
      if (completed === total) bundleStatus = 'completed';
      else if (completed > 0) bundleStatus = 'partially_completed';
      else bundleStatus = 'requested';
    }
    const updated: InvestigationRequestBundle = {
      ...bundle,
      items: updatedItems,
      status: bundleStatus,
      updatedAt: new Date(),
    };
    await db.table('investigationRequestBundles').put(updated);
    return updated;
  },

  async delete(id: string): Promise<void> {
    await db.table('investigationRequestBundles').delete(id);
  },
};

// ------------------------------------------------------------
// Soft-warning gate for scoring modules
// ------------------------------------------------------------

export interface InvestigationGateResult {
  clear: boolean;
  totalRequested: number;
  outstanding: Array<{
    bundleId: string;
    itemId: string;
    name: string;
    category: InvestigationCategory;
    status: InvestigationRequestItem['resultStatus'];
  }>;
  /** Most-recent bundle id (so UI can deep-link) */
  latestBundleId?: string;
}

/**
 * Returns clear=true if patient has zero outstanding ticked items
 * across all their bundles. Used by Limb Salvage (and other scores)
 * to display a soft warning + allow override with reason.
 */
export async function checkInvestigationGate(patientId: string): Promise<InvestigationGateResult> {
  const bundles = await InvestigationRequestOps.getByPatient(patientId);
  const outstanding: InvestigationGateResult['outstanding'] = [];
  let totalRequested = 0;
  for (const b of bundles) {
    for (const item of b.items) {
      if (!item.ticked) continue;
      totalRequested++;
      if (item.resultStatus !== 'completed' && item.resultStatus !== 'cancelled') {
        outstanding.push({
          bundleId: b.id,
          itemId: item.id,
          name: item.name,
          category: item.category,
          status: item.resultStatus,
        });
      }
    }
  }
  return {
    clear: outstanding.length === 0,
    totalRequested,
    outstanding,
    latestBundleId: bundles[0]?.id,
  };
}
