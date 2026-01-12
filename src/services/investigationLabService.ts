/**
 * Unified Investigation & Laboratory Service
 * AstroHEALTH Innovations in Healthcare
 * 
 * This service merges the Laboratory and Investigation modules into a single,
 * cohesive system with professional workflow management:
 * 
 * Workflow: Request → Sample Collection → Processing → Results → Reporting → Trend Analysis
 */

import { db } from '../database';
import { syncRecord } from './cloudSyncService';
import type { 
  Investigation, 
  InvestigationResult, 
  InvestigationAttachment,
  LabRequest,
  Patient 
} from '../types';

// ==================== UNIFIED TYPES ====================

export type UnifiedCategory = 
  | 'hematology'
  | 'biochemistry'
  | 'microbiology'
  | 'serology'
  | 'urinalysis'
  | 'histopathology'
  | 'imaging'
  | 'cardiology'
  | 'pathology';

export type InvestigationPriority = 'routine' | 'urgent' | 'stat';

export type InvestigationStatus = 
  | 'requested' 
  | 'sample_collected' 
  | 'processing' 
  | 'completed'
  | 'cancelled';

export interface TestDefinition {
  id: string;
  name: string;
  category: UnifiedCategory;
  specimen: string;
  unit?: string;
  referenceRange?: string;
  parameters?: string[];
  requiresFasting?: boolean;
  turnaroundTime?: string; // e.g., "2 hours", "24 hours"
  cost?: number;
}

export interface InvestigationRequest {
  patientId: string;
  hospitalId: string;
  encounterId?: string;
  admissionId?: string;
  tests: string[]; // Test names or IDs
  priority: InvestigationPriority;
  clinicalDetails?: string;
  fasting?: boolean;
  requestedBy: string;
  requestedByName?: string;
}

export interface ResultEntry {
  parameter: string;
  value: string | number;
  unit?: string;
  referenceRange?: string;
  interpretation?: string;
}

export interface TrendAnalysis {
  parameter: string;
  patientId: string;
  dataPoints: Array<{
    date: Date;
    value: number;
    flag?: 'normal' | 'low' | 'high' | 'critical';
    investigationId: string;
  }>;
  trend: 'improving' | 'worsening' | 'stable' | 'fluctuating';
  percentChange: number;
  recommendations: string[];
}

// ==================== TEST DEFINITIONS DATABASE ====================

// Comprehensive laboratory tests organized by category with Nigerian standards
export const testDefinitions: Record<UnifiedCategory, TestDefinition[]> = {
  hematology: [
    { id: 'fbc', name: 'Full Blood Count (FBC)', category: 'hematology', specimen: 'EDTA Blood', turnaroundTime: '2 hours', parameters: ['WBC', 'RBC', 'Hemoglobin', 'Hematocrit', 'MCV', 'MCH', 'MCHC', 'Platelets', 'Neutrophils', 'Lymphocytes', 'Monocytes', 'Eosinophils', 'Basophils'] },
    { id: 'hb', name: 'Haemoglobin', category: 'hematology', specimen: 'EDTA Blood', unit: 'g/dL', referenceRange: 'M: 13-17, F: 12-16', turnaroundTime: '1 hour' },
    { id: 'pcv', name: 'PCV/Haematocrit', category: 'hematology', specimen: 'EDTA Blood', unit: '%', referenceRange: 'M: 40-54, F: 36-48' },
    { id: 'wbc', name: 'White Blood Cell Count', category: 'hematology', specimen: 'EDTA Blood', unit: 'x10⁹/L', referenceRange: '4.0-11.0' },
    { id: 'platelets', name: 'Platelet Count', category: 'hematology', specimen: 'EDTA Blood', unit: 'x10⁹/L', referenceRange: '150-400' },
    { id: 'esr', name: 'Erythrocyte Sedimentation Rate (ESR)', category: 'hematology', specimen: 'EDTA Blood', unit: 'mm/hr', referenceRange: 'M: 0-15, F: 0-20' },
    { id: 'blood_group', name: 'Blood Group & Rhesus', category: 'hematology', specimen: 'EDTA Blood', turnaroundTime: '30 minutes' },
    { id: 'coag', name: 'Coagulation Profile (PT/INR/APTT)', category: 'hematology', specimen: 'Citrated Blood', parameters: ['PT', 'INR', 'APTT', 'Fibrinogen'], turnaroundTime: '2 hours' },
    { id: 'sickling', name: 'Sickling Test', category: 'hematology', specimen: 'EDTA Blood', referenceRange: 'Negative' },
    { id: 'hb_electro', name: 'Haemoglobin Electrophoresis', category: 'hematology', specimen: 'EDTA Blood', referenceRange: 'AA' },
    { id: 'g6pd', name: 'G6PD Assay', category: 'hematology', specimen: 'EDTA Blood', unit: 'U/g Hb', referenceRange: '4.6-13.5' },
    { id: 'blood_film', name: 'Peripheral Blood Film', category: 'hematology', specimen: 'EDTA Blood', parameters: ['RBC Morphology', 'WBC Differential', 'Platelet Estimate'] },
    { id: 'd_dimer', name: 'D-Dimer', category: 'hematology', specimen: 'Citrated Blood', unit: 'ng/mL', referenceRange: '<500' },
    { id: 'reticulocyte', name: 'Reticulocyte Count', category: 'hematology', specimen: 'EDTA Blood', unit: '%', referenceRange: '0.5-2.5' },
  ],
  biochemistry: [
    { id: 'fbg', name: 'Fasting Blood Glucose', category: 'biochemistry', specimen: 'Fluoride Blood', unit: 'mmol/L', referenceRange: '3.9-5.6', requiresFasting: true },
    { id: 'rbg', name: 'Random Blood Glucose', category: 'biochemistry', specimen: 'Fluoride Blood', unit: 'mmol/L', referenceRange: '<7.8' },
    { id: 'hba1c', name: 'HbA1c (Glycated Haemoglobin)', category: 'biochemistry', specimen: 'EDTA Blood', unit: '%', referenceRange: '<5.7' },
    { id: 'rft', name: 'Renal Function Tests', category: 'biochemistry', specimen: 'Serum', parameters: ['Urea', 'Creatinine', 'eGFR', 'Sodium', 'Potassium', 'Chloride', 'Bicarbonate'], turnaroundTime: '2 hours' },
    { id: 'urea', name: 'Urea', category: 'biochemistry', specimen: 'Serum', unit: 'mmol/L', referenceRange: '2.5-6.7' },
    { id: 'creatinine', name: 'Creatinine', category: 'biochemistry', specimen: 'Serum', unit: 'µmol/L', referenceRange: 'M: 62-106, F: 44-80' },
    { id: 'electrolytes', name: 'Electrolytes (Na, K, Cl, HCO3)', category: 'biochemistry', specimen: 'Serum', parameters: ['Sodium', 'Potassium', 'Chloride', 'Bicarbonate'] },
    { id: 'lft', name: 'Liver Function Tests', category: 'biochemistry', specimen: 'Serum', parameters: ['Total Protein', 'Albumin', 'Globulin', 'Total Bilirubin', 'Direct Bilirubin', 'ALT', 'AST', 'ALP', 'GGT'], turnaroundTime: '2 hours' },
    { id: 'lipid', name: 'Lipid Profile', category: 'biochemistry', specimen: 'Fasting Serum', parameters: ['Total Cholesterol', 'Triglycerides', 'HDL', 'LDL', 'VLDL'], requiresFasting: true },
    { id: 'calcium', name: 'Calcium', category: 'biochemistry', specimen: 'Serum', unit: 'mmol/L', referenceRange: '2.2-2.6' },
    { id: 'phosphate', name: 'Phosphate', category: 'biochemistry', specimen: 'Serum', unit: 'mmol/L', referenceRange: '0.8-1.5' },
    { id: 'magnesium', name: 'Magnesium', category: 'biochemistry', specimen: 'Serum', unit: 'mmol/L', referenceRange: '0.7-1.0' },
    { id: 'uric_acid', name: 'Uric Acid', category: 'biochemistry', specimen: 'Serum', unit: 'µmol/L', referenceRange: 'M: 200-430, F: 140-360' },
    { id: 'amylase', name: 'Amylase', category: 'biochemistry', specimen: 'Serum', unit: 'U/L', referenceRange: '28-100' },
    { id: 'lipase', name: 'Lipase', category: 'biochemistry', specimen: 'Serum', unit: 'U/L', referenceRange: '0-160' },
    { id: 'crp', name: 'C-Reactive Protein (CRP)', category: 'biochemistry', specimen: 'Serum', unit: 'mg/L', referenceRange: '<5' },
    { id: 'procalcitonin', name: 'Procalcitonin', category: 'biochemistry', specimen: 'Serum', unit: 'ng/mL', referenceRange: '<0.5' },
    { id: 'lactate', name: 'Lactate', category: 'biochemistry', specimen: 'Arterial Blood', unit: 'mmol/L', referenceRange: '0.5-2.0' },
    { id: 'abg', name: 'Arterial Blood Gases', category: 'biochemistry', specimen: 'Arterial Blood', parameters: ['pH', 'PaO2', 'PaCO2', 'HCO3', 'Base Excess', 'SaO2'], turnaroundTime: '30 minutes' },
  ],
  microbiology: [
    { id: 'wound_mcs', name: 'Wound Swab M/C/S', category: 'microbiology', specimen: 'Wound Swab', turnaroundTime: '48-72 hours', parameters: ['Organisms', 'Gram Stain', 'Sensitivity'] },
    { id: 'blood_culture', name: 'Blood Culture', category: 'microbiology', specimen: 'Blood', turnaroundTime: '24-72 hours', parameters: ['Organisms', 'Sensitivity'] },
    { id: 'urine_mcs', name: 'Urine M/C/S', category: 'microbiology', specimen: 'Mid-stream Urine', turnaroundTime: '24-48 hours', parameters: ['WBC', 'RBC', 'Epithelial Cells', 'Organisms', 'Sensitivity'] },
    { id: 'stool_mcs', name: 'Stool M/C/S', category: 'microbiology', specimen: 'Stool', turnaroundTime: '48-72 hours', parameters: ['Organisms', 'Ova', 'Cyst', 'Occult Blood'] },
    { id: 'sputum_mcs', name: 'Sputum M/C/S', category: 'microbiology', specimen: 'Sputum', turnaroundTime: '24-48 hours', parameters: ['Organisms', 'AFB', 'Sensitivity'] },
    { id: 'csf_mcs', name: 'CSF M/C/S', category: 'microbiology', specimen: 'CSF', turnaroundTime: '24-48 hours', parameters: ['WBC', 'RBC', 'Glucose', 'Protein', 'Organisms', 'Gram Stain'] },
    { id: 'hvs', name: 'High Vaginal Swab M/C/S', category: 'microbiology', specimen: 'HVS', turnaroundTime: '24-48 hours' },
    { id: 'throat_swab', name: 'Throat Swab M/C/S', category: 'microbiology', specimen: 'Throat Swab', turnaroundTime: '24-48 hours' },
    { id: 'afb', name: 'AFB (ZN Stain)', category: 'microbiology', specimen: 'Sputum', referenceRange: 'Negative' },
    { id: 'genexpert', name: 'GeneXpert MTB/RIF', category: 'microbiology', specimen: 'Sputum', referenceRange: 'Not Detected', turnaroundTime: '2 hours' },
  ],
  serology: [
    { id: 'hiv', name: 'HIV 1&2 Antibodies', category: 'serology', specimen: 'Serum', referenceRange: 'Non-reactive' },
    { id: 'hbsag', name: 'Hepatitis B Surface Antigen (HBsAg)', category: 'serology', specimen: 'Serum', referenceRange: 'Negative' },
    { id: 'anti_hcv', name: 'Anti-HCV Antibodies', category: 'serology', specimen: 'Serum', referenceRange: 'Negative' },
    { id: 'vdrl', name: 'VDRL/RPR', category: 'serology', specimen: 'Serum', referenceRange: 'Non-reactive' },
    { id: 'widal', name: 'Widal Test', category: 'serology', specimen: 'Serum', referenceRange: '<1:80' },
    { id: 'malaria', name: 'Malaria Parasite (RDT/Film)', category: 'serology', specimen: 'EDTA Blood', referenceRange: 'Not Seen' },
    { id: 'rf', name: 'Rheumatoid Factor', category: 'serology', specimen: 'Serum', unit: 'IU/mL', referenceRange: '<14' },
    { id: 'ana', name: 'Antinuclear Antibodies (ANA)', category: 'serology', specimen: 'Serum', referenceRange: 'Negative' },
    { id: 'psa', name: 'Prostate Specific Antigen (PSA)', category: 'serology', specimen: 'Serum', unit: 'ng/mL', referenceRange: '<4.0' },
    { id: 'cea', name: 'Carcinoembryonic Antigen (CEA)', category: 'serology', specimen: 'Serum', unit: 'ng/mL', referenceRange: '<3.0' },
    { id: 'afp', name: 'Alpha-Fetoprotein (AFP)', category: 'serology', specimen: 'Serum', unit: 'ng/mL', referenceRange: '<10' },
    { id: 'ca125', name: 'CA 125', category: 'serology', specimen: 'Serum', unit: 'U/mL', referenceRange: '<35' },
    { id: 'ca199', name: 'CA 19-9', category: 'serology', specimen: 'Serum', unit: 'U/mL', referenceRange: '<37' },
    { id: 'tft', name: 'Thyroid Function Tests', category: 'serology', specimen: 'Serum', parameters: ['TSH', 'Free T4', 'Free T3', 'Total T4'] },
    { id: 'cortisol', name: 'Cortisol', category: 'serology', specimen: 'Serum', unit: 'µg/dL', referenceRange: '6-23 (AM)' },
  ],
  urinalysis: [
    { id: 'urinalysis', name: 'Urinalysis (Dipstick)', category: 'urinalysis', specimen: 'Urine', parameters: ['pH', 'Specific Gravity', 'Protein', 'Glucose', 'Ketones', 'Blood', 'Bilirubin', 'Urobilinogen', 'Nitrites', 'Leukocytes'] },
    { id: 'urine_protein_24h', name: '24-hour Urine Protein', category: 'urinalysis', specimen: '24hr Urine', unit: 'g/24hr', referenceRange: '<0.15' },
    { id: 'urine_creatinine', name: 'Urine Creatinine', category: 'urinalysis', specimen: 'Urine', unit: 'mmol/L' },
    { id: 'urine_electrolytes', name: 'Urine Electrolytes', category: 'urinalysis', specimen: 'Urine', parameters: ['Sodium', 'Potassium', 'Chloride'] },
    { id: 'pregnancy_test', name: 'Pregnancy Test (Urine)', category: 'urinalysis', specimen: 'Urine', referenceRange: 'Negative' },
    { id: 'urine_microscopy', name: 'Urine Microscopy', category: 'urinalysis', specimen: 'Urine', parameters: ['WBC', 'RBC', 'Casts', 'Crystals', 'Epithelial Cells'] },
  ],
  histopathology: [
    { id: 'tissue_biopsy', name: 'Tissue Biopsy', category: 'histopathology', specimen: 'Tissue in Formalin', turnaroundTime: '5-7 days', parameters: ['Macroscopic', 'Microscopic', 'Diagnosis', 'Staging'] },
    { id: 'fnac', name: 'Fine Needle Aspiration Cytology (FNAC)', category: 'histopathology', specimen: 'Aspirate', turnaroundTime: '24-48 hours' },
    { id: 'frozen_section', name: 'Frozen Section', category: 'histopathology', specimen: 'Fresh Tissue', turnaroundTime: '30 minutes' },
    { id: 'pap_smear', name: 'Pap Smear', category: 'histopathology', specimen: 'Cervical Smear', turnaroundTime: '3-5 days' },
    { id: 'fluid_cytology', name: 'Fluid Cytology', category: 'histopathology', specimen: 'Fluid', turnaroundTime: '24-48 hours', parameters: ['Cell Count', 'Cell Type', 'Malignancy'] },
    { id: 'immunohistochemistry', name: 'Immunohistochemistry', category: 'histopathology', specimen: 'Tissue in Formalin', turnaroundTime: '5-7 days' },
  ],
  imaging: [
    { id: 'xray_chest', name: 'Chest X-Ray', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour', parameters: ['Findings', 'Impression'] },
    { id: 'xray_abdomen', name: 'Abdominal X-Ray', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour' },
    { id: 'xray_limb', name: 'Limb X-Ray', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour' },
    { id: 'ultrasound_abdomen', name: 'Abdominal Ultrasound', category: 'imaging', specimen: 'N/A', turnaroundTime: '30 minutes', parameters: ['Liver', 'Gallbladder', 'Spleen', 'Kidneys', 'Pancreas'] },
    { id: 'ultrasound_pelvis', name: 'Pelvic Ultrasound', category: 'imaging', specimen: 'N/A', turnaroundTime: '30 minutes' },
    { id: 'ultrasound_obstetric', name: 'Obstetric Ultrasound', category: 'imaging', specimen: 'N/A', turnaroundTime: '30 minutes' },
    { id: 'ct_head', name: 'CT Head', category: 'imaging', specimen: 'N/A', turnaroundTime: '1-2 hours' },
    { id: 'ct_abdomen', name: 'CT Abdomen/Pelvis', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours' },
    { id: 'ct_chest', name: 'CT Chest', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours' },
    { id: 'mri_head', name: 'MRI Brain', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours' },
    { id: 'mri_spine', name: 'MRI Spine', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours' },
  ],
  cardiology: [
    { id: 'ecg', name: 'Electrocardiogram (ECG)', category: 'cardiology', specimen: 'N/A', turnaroundTime: '15 minutes', parameters: ['Rate', 'Rhythm', 'Axis', 'PR Interval', 'QRS Duration', 'QTc', 'Findings'] },
    { id: 'echo', name: 'Echocardiogram', category: 'cardiology', specimen: 'N/A', turnaroundTime: '1 hour', parameters: ['EF', 'LV Function', 'Valves', 'Wall Motion', 'Pericardium', 'Findings'] },
    { id: 'holter', name: 'Holter Monitor (24hr)', category: 'cardiology', specimen: 'N/A', turnaroundTime: '24-48 hours' },
    { id: 'troponin', name: 'Troponin I/T', category: 'cardiology', specimen: 'Serum', unit: 'ng/mL', referenceRange: '<0.04' },
    { id: 'bnp', name: 'BNP / NT-proBNP', category: 'cardiology', specimen: 'Serum', unit: 'pg/mL', referenceRange: '<100' },
    { id: 'ckmb', name: 'CK-MB', category: 'cardiology', specimen: 'Serum', unit: 'ng/mL', referenceRange: '<5' },
  ],
  pathology: [
    { id: 'histology', name: 'Histology', category: 'pathology', specimen: 'Tissue', turnaroundTime: '5-7 days' },
    { id: 'cytology', name: 'Cytology', category: 'pathology', specimen: 'Fluid/Smear', turnaroundTime: '24-48 hours' },
    { id: 'autopsy', name: 'Autopsy', category: 'pathology', specimen: 'Body', turnaroundTime: '2-4 weeks' },
  ],
};

// Reference ranges for trend analysis
export const referenceRanges: Record<string, { min: number; max: number; unit: string; criticalLow?: number; criticalHigh?: number }> = {
  'Hemoglobin': { min: 12.0, max: 17.0, unit: 'g/dL', criticalLow: 7.0, criticalHigh: 20.0 },
  'WBC': { min: 4.0, max: 11.0, unit: 'x10^9/L', criticalLow: 2.0, criticalHigh: 30.0 },
  'Platelets': { min: 150, max: 450, unit: 'x10^9/L', criticalLow: 50, criticalHigh: 1000 },
  'Sodium': { min: 135, max: 145, unit: 'mmol/L', criticalLow: 120, criticalHigh: 160 },
  'Potassium': { min: 3.5, max: 5.0, unit: 'mmol/L', criticalLow: 2.5, criticalHigh: 6.5 },
  'Creatinine': { min: 44, max: 106, unit: 'µmol/L', criticalLow: 0, criticalHigh: 800 },
  'Urea': { min: 2.5, max: 6.7, unit: 'mmol/L', criticalLow: 0, criticalHigh: 50 },
  'Glucose': { min: 3.9, max: 5.6, unit: 'mmol/L', criticalLow: 2.5, criticalHigh: 25 },
  'AST': { min: 10, max: 40, unit: 'U/L' },
  'ALT': { min: 7, max: 56, unit: 'U/L' },
  'Albumin': { min: 35, max: 50, unit: 'g/L', criticalLow: 20, criticalHigh: 0 },
  'Bilirubin': { min: 5, max: 21, unit: 'µmol/L', criticalLow: 0, criticalHigh: 300 },
  'CRP': { min: 0, max: 5, unit: 'mg/L' },
  'INR': { min: 0.9, max: 1.1, unit: '', criticalLow: 0, criticalHigh: 5.0 },
  'PT': { min: 11, max: 13, unit: 'seconds' },
  'APTT': { min: 25, max: 35, unit: 'seconds' },
};

// ==================== SERVICE CLASS ====================

class InvestigationLabService {
  // ==================== REQUEST MANAGEMENT ====================

  /**
   * Create a new investigation request
   */
  async createRequest(request: InvestigationRequest, patient: Patient): Promise<Investigation> {
    const testDetails = request.tests.map(testName => {
      const allTests = Object.values(testDefinitions).flat();
      return allTests.find(t => t.name === testName || t.id === testName);
    }).filter(Boolean);

    // Determine primary category
    const category = testDetails[0]?.category || 'biochemistry';

    const investigation: Investigation = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      patientId: request.patientId,
      patientName: `${patient.firstName} ${patient.lastName}`,
      hospitalNumber: patient.hospitalNumber,
      hospitalId: request.hospitalId,
      encounterId: request.encounterId,
      admissionId: request.admissionId,
      type: testDetails.map(t => t?.id).join(','),
      typeName: testDetails.map(t => t?.name).join(', '),
      category: category as Investigation['category'],
      priority: request.priority,
      status: 'requested',
      fasting: request.fasting,
      clinicalDetails: request.clinicalDetails,
      requestedBy: request.requestedBy,
      requestedByName: request.requestedByName,
      requestedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.investigations.add(investigation);
    syncRecord('investigations', investigation as unknown as Record<string, unknown>);
    return investigation;
  }

  /**
   * Update investigation status with workflow validation
   */
  async updateStatus(
    investigationId: string, 
    newStatus: InvestigationStatus,
    userId: string,
    userName?: string
  ): Promise<void> {
    const investigation = await db.investigations.get(investigationId);
    if (!investigation) throw new Error('Investigation not found');

    // Workflow validation
    const validTransitions: Record<InvestigationStatus, InvestigationStatus[]> = {
      'requested': ['sample_collected', 'cancelled'],
      'sample_collected': ['processing', 'cancelled'],
      'processing': ['completed', 'cancelled'],
      'completed': [],
      'cancelled': [],
    };

    const currentStatus = investigation.status as InvestigationStatus;
    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }

    const updateData: Partial<Investigation> = {
      status: newStatus as Investigation['status'],
      updatedAt: new Date(),
    };

    switch (newStatus) {
      case 'sample_collected':
        updateData.collectedAt = new Date();
        updateData.collectedBy = userId;
        break;
      case 'processing':
        updateData.processingStartedAt = new Date();
        break;
      case 'completed':
        updateData.completedAt = new Date();
        updateData.completedBy = userId;
        updateData.completedByName = userName;
        break;
    }

    await db.investigations.update(investigationId, updateData);
    const updated = await db.investigations.get(investigationId);
    if (updated) syncRecord('investigations', updated as unknown as Record<string, unknown>);
  }

  /**
   * Add results to an investigation
   */
  async addResults(
    investigationId: string,
    results: ResultEntry[],
    interpretation?: string,
    attachments?: File[],
    userId?: string,
    userName?: string
  ): Promise<void> {
    const investigation = await db.investigations.get(investigationId);
    if (!investigation) throw new Error('Investigation not found');

    // Process results with flags
    const processedResults: InvestigationResult[] = results.map(result => {
      const refRange = referenceRanges[result.parameter];
      let flag: InvestigationResult['flag'];
      
      if (refRange && typeof result.value === 'number') {
        if (refRange.criticalLow && result.value < refRange.criticalLow) {
          flag = 'LL'; // Critical low
        } else if (refRange.criticalHigh && result.value > refRange.criticalHigh) {
          flag = 'HH'; // Critical high
        } else if (result.value < refRange.min) {
          flag = 'L';
        } else if (result.value > refRange.max) {
          flag = 'H';
        } else {
          flag = 'normal';
        }
      }

      return {
        id: `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        investigationId,
        parameter: result.parameter,
        value: result.value,
        unit: result.unit || refRange?.unit,
        referenceRange: result.referenceRange || (refRange ? `${refRange.min} - ${refRange.max}` : undefined),
        flag,
        interpretation: result.interpretation,
        resultDate: new Date(),
      };
    });

    // Process attachments
    let processedAttachments: InvestigationAttachment[] = [];
    if (attachments && attachments.length > 0) {
      processedAttachments = await Promise.all(
        attachments.map(async (file) => {
          const base64 = await this.fileToBase64(file);
          return {
            id: `attach_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            url: base64,
            uploadedBy: userId || '',
            uploadedAt: new Date(),
          };
        })
      );
    }

    await db.investigations.update(investigationId, {
      results: processedResults,
      attachments: [...(investigation.attachments || []), ...processedAttachments],
      interpretation,
      status: 'completed',
      completedAt: new Date(),
      completedBy: userId,
      completedByName: userName,
      updatedAt: new Date(),
    });
    const updatedInvestigation = await db.investigations.get(investigationId);
    if (updatedInvestigation) syncRecord('investigations', updatedInvestigation as unknown as Record<string, unknown>);
  }

  /**
   * Convert file to base64
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  }

  // ==================== QUERY METHODS ====================

  /**
   * Get investigations by patient
   */
  async getPatientInvestigations(patientId: string): Promise<Investigation[]> {
    return db.investigations
      .where('patientId')
      .equals(patientId)
      .reverse()
      .sortBy('createdAt');
  }

  /**
   * Get investigations by status
   */
  async getInvestigationsByStatus(status: InvestigationStatus): Promise<Investigation[]> {
    return db.investigations
      .where('status')
      .equals(status)
      .reverse()
      .sortBy('createdAt');
  }

  /**
   * Get pending investigations (for lab workflow)
   */
  async getPendingInvestigations(): Promise<Investigation[]> {
    const statuses = ['requested', 'sample_collected', 'processing'];
    const investigations = await db.investigations.toArray();
    return investigations
      .filter(inv => statuses.includes(inv.status))
      .sort((a, b) => {
        // Sort by priority first, then by date
        const priorityOrder = { stat: 0, urgent: 1, routine: 2 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
      });
  }

  /**
   * Get statistics for dashboard
   */
  async getStatistics(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    todayRequests: number;
    statPriority: number;
    urgentPriority: number;
  }> {
    const investigations = await db.investigations.toArray();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return {
      pending: investigations.filter(i => i.status === 'requested').length,
      processing: investigations.filter(i => ['sample_collected', 'processing'].includes(i.status)).length,
      completed: investigations.filter(i => i.status === 'completed').length,
      todayRequests: investigations.filter(i => new Date(i.requestedAt) >= today).length,
      statPriority: investigations.filter(i => i.priority === 'stat' && i.status !== 'completed').length,
      urgentPriority: investigations.filter(i => i.priority === 'urgent' && i.status !== 'completed').length,
    };
  }

  // ==================== TREND ANALYSIS ====================

  /**
   * Calculate parameter trend for a patient
   */
  async calculateTrend(patientId: string, parameter: string): Promise<TrendAnalysis> {
    const investigations = await db.investigations
      .where('patientId')
      .equals(patientId)
      .toArray();

    const completedWithResults = investigations.filter(
      inv => inv.status === 'completed' && inv.results
    );

    const dataPoints: TrendAnalysis['dataPoints'] = [];

    completedWithResults.forEach(inv => {
      inv.results?.forEach(result => {
        if (result.parameter === parameter && result.value !== undefined) {
          const numValue = typeof result.value === 'string' 
            ? parseFloat(result.value) 
            : result.value;
          
          if (!isNaN(numValue)) {
            const refRange = referenceRanges[parameter];
            let flag: 'normal' | 'low' | 'high' | 'critical' = 'normal';
            
            if (refRange) {
              if (numValue < refRange.min) flag = 'low';
              else if (numValue > refRange.max) flag = 'high';
              if (refRange.criticalLow && numValue < refRange.criticalLow) flag = 'critical';
              if (refRange.criticalHigh && numValue > refRange.criticalHigh) flag = 'critical';
            }

            dataPoints.push({
              date: new Date(result.resultDate || inv.completedAt || inv.createdAt),
              value: numValue,
              flag,
              investigationId: inv.id,
            });
          }
        }
      });
    });

    // Sort by date
    dataPoints.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Calculate trend
    let trend: TrendAnalysis['trend'] = 'stable';
    let percentChange = 0;

    if (dataPoints.length >= 2) {
      const firstValue = dataPoints[0].value;
      const lastValue = dataPoints[dataPoints.length - 1].value;
      percentChange = ((lastValue - firstValue) / firstValue) * 100;

      // Analyze direction consistency
      const isParameterWhereHigherIsWorse = ['WBC', 'Creatinine', 'Glucose', 'CRP', 'Bilirubin'].includes(parameter);
      const isParameterWhereHigherIsBetter = ['Hemoglobin', 'Albumin', 'Platelets'].includes(parameter);

      if (Math.abs(percentChange) < 5) {
        trend = 'stable';
      } else if (isParameterWhereHigherIsBetter) {
        trend = percentChange > 0 ? 'improving' : 'worsening';
      } else if (isParameterWhereHigherIsWorse) {
        trend = percentChange < 0 ? 'improving' : 'worsening';
      } else {
        // For neutral parameters, check if moving toward normal range
        const refRange = referenceRanges[parameter];
        if (refRange) {
          const midpoint = (refRange.min + refRange.max) / 2;
          const distanceFirstFromMid = Math.abs(firstValue - midpoint);
          const distanceLastFromMid = Math.abs(lastValue - midpoint);
          trend = distanceLastFromMid < distanceFirstFromMid ? 'improving' : 'worsening';
        } else {
          trend = 'fluctuating';
        }
      }
    }

    // Generate recommendations
    const recommendations = this.generateTrendRecommendations(parameter, trend, dataPoints);

    return {
      parameter,
      patientId,
      dataPoints,
      trend,
      percentChange,
      recommendations,
    };
  }

  /**
   * Generate recommendations based on trend
   */
  private generateTrendRecommendations(
    parameter: string, 
    trend: TrendAnalysis['trend'],
    dataPoints: TrendAnalysis['dataPoints']
  ): string[] {
    const recommendations: string[] = [];
    const latestFlag = dataPoints[dataPoints.length - 1]?.flag;

    if (latestFlag === 'critical') {
      recommendations.push(`CRITICAL: ${parameter} is at a critical level. Immediate clinical attention required.`);
    }

    if (trend === 'worsening') {
      recommendations.push(`${parameter} shows a worsening trend. Consider clinical review.`);
      
      // Parameter-specific recommendations
      switch (parameter) {
        case 'Hemoglobin':
          recommendations.push('Consider iron studies, reticulocyte count, and evaluate for bleeding.');
          break;
        case 'Creatinine':
          recommendations.push('Monitor renal function closely. Ensure adequate hydration.');
          break;
        case 'WBC':
          recommendations.push('Investigate for infection or inflammatory process.');
          break;
        case 'Potassium':
          recommendations.push('Review medications affecting potassium. Consider ECG if significantly abnormal.');
          break;
      }
    } else if (trend === 'improving') {
      recommendations.push(`${parameter} is showing improvement. Continue current management.`);
    } else if (trend === 'stable') {
      recommendations.push(`${parameter} is stable. Continue routine monitoring.`);
    }

    return recommendations;
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Get test definition by ID or name
   */
  getTestDefinition(idOrName: string): TestDefinition | undefined {
    const allTests = Object.values(testDefinitions).flat();
    return allTests.find(t => 
      t.id === idOrName || 
      t.name.toLowerCase() === idOrName.toLowerCase()
    );
  }

  /**
   * Get all tests in a category
   */
  getTestsByCategory(category: UnifiedCategory): TestDefinition[] {
    return testDefinitions[category] || [];
  }

  /**
   * Get all categories
   */
  getCategories(): Array<{ category: UnifiedCategory; label: string; icon: string }> {
    return [
      { category: 'hematology', label: 'Hematology', icon: '🩸' },
      { category: 'biochemistry', label: 'Biochemistry', icon: '⚗️' },
      { category: 'microbiology', label: 'Microbiology', icon: '🦠' },
      { category: 'serology', label: 'Serology/Immunology', icon: '🧬' },
      { category: 'urinalysis', label: 'Urinalysis', icon: '🧪' },
      { category: 'histopathology', label: 'Histopathology', icon: '🔬' },
      { category: 'imaging', label: 'Imaging', icon: '📷' },
      { category: 'cardiology', label: 'Cardiology', icon: '❤️' },
      { category: 'pathology', label: 'Pathology', icon: '🏥' },
    ];
  }

  /**
   * Calculate eGFR using CKD-EPI equation (Nigerian context)
   */
  calculateEGFR(
    creatinine: number, // in µmol/L
    age: number,
    gender: 'male' | 'female',
    isAfrican: boolean = true
  ): number {
    const kappa = gender === 'female' ? 0.7 : 0.9;
    const alpha = gender === 'female' ? -0.329 : -0.411;
    const creatMgDl = creatinine / 88.4; // Convert µmol/L to mg/dL

    const minCr = Math.min(creatMgDl / kappa, 1);
    const maxCr = Math.max(creatMgDl / kappa, 1);

    let gfr = 141 * Math.pow(minCr, alpha) * Math.pow(maxCr, -1.209) * Math.pow(0.993, age);
    if (gender === 'female') gfr *= 1.018;
    if (isAfrican) gfr *= 1.159;

    return Math.round(gfr);
  }

  /**
   * Interpret eGFR stage
   */
  interpretEGFRStage(egfr: number): { stage: string; description: string; action: string } {
    if (egfr >= 90) {
      return { stage: 'G1', description: 'Normal or high', action: 'Monitor if CKD risk factors present' };
    } else if (egfr >= 60) {
      return { stage: 'G2', description: 'Mildly decreased', action: 'Monitor yearly' };
    } else if (egfr >= 45) {
      return { stage: 'G3a', description: 'Mildly to moderately decreased', action: 'Monitor every 6 months' };
    } else if (egfr >= 30) {
      return { stage: 'G3b', description: 'Moderately to severely decreased', action: 'Consider nephrology referral' };
    } else if (egfr >= 15) {
      return { stage: 'G4', description: 'Severely decreased', action: 'Nephrology referral essential' };
    } else {
      return { stage: 'G5', description: 'Kidney failure', action: 'Prepare for RRT (dialysis/transplant)' };
    }
  }

  // ==================== LEGACY COMPATIBILITY ====================

  /**
   * Convert LabRequest to Investigation format (for backward compatibility)
   */
  async migrateLabRequest(labRequest: LabRequest): Promise<Investigation> {
    const investigation: Investigation = {
      id: labRequest.id,
      patientId: labRequest.patientId,
      hospitalId: labRequest.hospitalId,
      encounterId: labRequest.encounterId,
      type: labRequest.tests.map(t => t.name).join(','),
      typeName: labRequest.tests.map(t => t.name).join(', '),
      category: labRequest.tests[0]?.category as Investigation['category'] || 'biochemistry',
      priority: labRequest.priority,
      status: labRequest.status === 'collected' ? 'sample_collected' : labRequest.status as Investigation['status'],
      clinicalDetails: labRequest.clinicalInfo,
      requestedBy: labRequest.requestedBy,
      requestedAt: labRequest.requestedAt,
      collectedAt: labRequest.collectedAt,
      completedAt: labRequest.completedAt,
      results: labRequest.tests
        .filter(t => t.result)
        .map(t => ({
          id: t.id,
          parameter: t.name,
          value: t.result || '',
          unit: t.unit,
          referenceRange: t.referenceRange,
          flag: t.isAbnormal ? 'A' as const : 'normal' as const,
        })),
      createdAt: labRequest.requestedAt,
      updatedAt: labRequest.completedAt || labRequest.requestedAt,
    };

    return investigation;
  }
}

export const investigationLabService = new InvestigationLabService();
