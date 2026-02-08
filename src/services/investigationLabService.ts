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

// Comprehensive laboratory tests organized by category with WHO standards for medical, surgical, and critically ill patients
export const testDefinitions: Record<UnifiedCategory, TestDefinition[]> = {
  hematology: [
    // Complete Blood Count
    { id: 'fbc', name: 'Full Blood Count (FBC)', category: 'hematology', specimen: 'EDTA Blood', turnaroundTime: '2 hours', parameters: ['WBC', 'RBC', 'Hemoglobin', 'Hematocrit', 'MCV', 'MCH', 'MCHC', 'RDW', 'Platelets', 'MPV', 'Neutrophils', 'Lymphocytes', 'Monocytes', 'Eosinophils', 'Basophils'] },
    { id: 'hb', name: 'Haemoglobin', category: 'hematology', specimen: 'EDTA Blood', unit: 'g/dL', referenceRange: 'M: 13-17, F: 12-16', turnaroundTime: '1 hour' },
    { id: 'pcv', name: 'PCV/Haematocrit', category: 'hematology', specimen: 'EDTA Blood', unit: '%', referenceRange: 'M: 40-54, F: 36-48' },
    { id: 'wbc', name: 'White Blood Cell Count', category: 'hematology', specimen: 'EDTA Blood', unit: 'x10⁹/L', referenceRange: '4.0-11.0' },
    { id: 'wbc_diff', name: 'WBC Differential Count', category: 'hematology', specimen: 'EDTA Blood', parameters: ['Neutrophils', 'Lymphocytes', 'Monocytes', 'Eosinophils', 'Basophils', 'Bands'] },
    { id: 'platelets', name: 'Platelet Count', category: 'hematology', specimen: 'EDTA Blood', unit: 'x10⁹/L', referenceRange: '150-400' },
    { id: 'esr', name: 'Erythrocyte Sedimentation Rate (ESR)', category: 'hematology', specimen: 'EDTA Blood', unit: 'mm/hr', referenceRange: 'M: 0-15, F: 0-20' },
    { id: 'blood_film', name: 'Peripheral Blood Film', category: 'hematology', specimen: 'EDTA Blood', parameters: ['RBC Morphology', 'WBC Differential', 'Platelet Estimate', 'Parasites', 'Inclusions'] },
    { id: 'reticulocyte', name: 'Reticulocyte Count', category: 'hematology', specimen: 'EDTA Blood', unit: '%', referenceRange: '0.5-2.5' },
    { id: 'retic_index', name: 'Reticulocyte Production Index', category: 'hematology', specimen: 'EDTA Blood', unit: '', referenceRange: '>2 (adequate response)' },
    
    // Blood Grouping & Transfusion Medicine
    { id: 'blood_group', name: 'Blood Group & Rhesus', category: 'hematology', specimen: 'EDTA Blood', turnaroundTime: '30 minutes', parameters: ['ABO Group', 'Rh(D) Type', 'Du Test'] },
    { id: 'blood_crossmatch', name: 'Blood Grouping & Crossmatching', category: 'hematology', specimen: 'EDTA Blood', turnaroundTime: '45 minutes', parameters: ['ABO Group', 'Rh(D) Type', 'Antibody Screen', 'Crossmatch Compatibility'] },
    { id: 'crossmatch_only', name: 'Crossmatch (Compatibility Testing)', category: 'hematology', specimen: 'EDTA Blood', turnaroundTime: '30 minutes', parameters: ['Major Crossmatch', 'Minor Crossmatch', 'Immediate Spin', 'IAT Phase'] },
    { id: 'antibody_screen', name: 'Antibody Screening (Indirect Coombs)', category: 'hematology', specimen: 'EDTA Blood', referenceRange: 'Negative' },
    { id: 'direct_coombs', name: 'Direct Coombs Test (DAT)', category: 'hematology', specimen: 'EDTA Blood', referenceRange: 'Negative' },
    { id: 'indirect_coombs', name: 'Indirect Coombs Test (IAT)', category: 'hematology', specimen: 'Serum', referenceRange: 'Negative' },
    { id: 'antibody_id', name: 'Antibody Identification Panel', category: 'hematology', specimen: 'Serum', turnaroundTime: '2-4 hours' },
    { id: 'kleihauer', name: 'Kleihauer-Betke Test', category: 'hematology', specimen: 'EDTA Blood', referenceRange: '<0.1%' },
    
    // Coagulation Studies
    { id: 'coag', name: 'Coagulation Profile (PT/INR/APTT)', category: 'hematology', specimen: 'Citrated Blood', parameters: ['PT', 'INR', 'APTT', 'Control'], turnaroundTime: '2 hours' },
    { id: 'pt_inr', name: 'Prothrombin Time (PT) & INR', category: 'hematology', specimen: 'Citrated Blood', parameters: ['PT seconds', 'INR', 'Control'], referenceRange: 'PT: 11-13.5s, INR: 0.9-1.1' },
    { id: 'aptt', name: 'Activated Partial Thromboplastin Time (APTT)', category: 'hematology', specimen: 'Citrated Blood', unit: 'seconds', referenceRange: '25-35' },
    { id: 'fibrinogen', name: 'Fibrinogen', category: 'hematology', specimen: 'Citrated Blood', unit: 'g/L', referenceRange: '2.0-4.0' },
    { id: 'd_dimer', name: 'D-Dimer', category: 'hematology', specimen: 'Citrated Blood', unit: 'ng/mL FEU', referenceRange: '<500' },
    { id: 'd_dimer_quant', name: 'D-Dimer Quantitative', category: 'hematology', specimen: 'Citrated Blood', unit: 'µg/mL FEU', referenceRange: '<0.5' },
    { id: 'thrombin_time', name: 'Thrombin Time (TT)', category: 'hematology', specimen: 'Citrated Blood', unit: 'seconds', referenceRange: '14-19' },
    { id: 'bleeding_time', name: 'Bleeding Time (Ivy Method)', category: 'hematology', specimen: 'Capillary Blood', unit: 'minutes', referenceRange: '2-9' },
    { id: 'clotting_time', name: 'Clotting Time', category: 'hematology', specimen: 'Whole Blood', unit: 'minutes', referenceRange: '5-15' },
    { id: 'fdp', name: 'Fibrin Degradation Products (FDP)', category: 'hematology', specimen: 'Serum', unit: 'µg/mL', referenceRange: '<10' },
    { id: 'antithrombin', name: 'Antithrombin III', category: 'hematology', specimen: 'Citrated Blood', unit: '%', referenceRange: '80-120' },
    { id: 'protein_c', name: 'Protein C Activity', category: 'hematology', specimen: 'Citrated Blood', unit: '%', referenceRange: '70-140' },
    { id: 'protein_s', name: 'Protein S Activity', category: 'hematology', specimen: 'Citrated Blood', unit: '%', referenceRange: '65-140' },
    { id: 'factor_v_leiden', name: 'Factor V Leiden Mutation', category: 'hematology', specimen: 'EDTA Blood', referenceRange: 'Negative' },
    { id: 'lupus_anticoag', name: 'Lupus Anticoagulant', category: 'hematology', specimen: 'Citrated Blood', referenceRange: 'Negative' },
    { id: 'mixing_studies', name: 'Mixing Studies (PT/APTT)', category: 'hematology', specimen: 'Citrated Blood', parameters: ['Immediate Mix', '2-hour Incubation'] },
    { id: 'factor_assays', name: 'Clotting Factor Assays', category: 'hematology', specimen: 'Citrated Blood', parameters: ['Factor VIII', 'Factor IX', 'Factor XI', 'Factor XII'] },
    { id: 'vwf', name: 'Von Willebrand Factor Antigen', category: 'hematology', specimen: 'Citrated Blood', unit: '%', referenceRange: '50-150' },
    { id: 'platelet_function', name: 'Platelet Function Tests', category: 'hematology', specimen: 'Citrated Blood', parameters: ['Aggregation', 'PFA-100'] },
    { id: 'teg_rotem', name: 'Thromboelastography (TEG/ROTEM)', category: 'hematology', specimen: 'Citrated Blood', parameters: ['R/CT', 'K/CFT', 'Alpha Angle', 'MA/MCF', 'LY30/ML'] },
    
    // Hemoglobinopathies
    { id: 'sickling', name: 'Sickling Test', category: 'hematology', specimen: 'EDTA Blood', referenceRange: 'Negative' },
    { id: 'hb_electro', name: 'Haemoglobin Electrophoresis', category: 'hematology', specimen: 'EDTA Blood', referenceRange: 'AA', parameters: ['HbA', 'HbA2', 'HbF', 'HbS', 'HbC'] },
    { id: 'hplc_hb', name: 'HPLC Hemoglobin Analysis', category: 'hematology', specimen: 'EDTA Blood', parameters: ['HbA', 'HbA2', 'HbF', 'HbS', 'HbC', 'Variants'] },
    { id: 'g6pd', name: 'G6PD Assay', category: 'hematology', specimen: 'EDTA Blood', unit: 'U/g Hb', referenceRange: '4.6-13.5' },
    { id: 'g6pd_qual', name: 'G6PD Qualitative Screen', category: 'hematology', specimen: 'EDTA Blood', referenceRange: 'Normal' },
    { id: 'osmotic_fragility', name: 'Osmotic Fragility Test', category: 'hematology', specimen: 'Heparinized Blood', parameters: ['MCF', 'MFC', 'Curve Pattern'] },
    { id: 'hb_f', name: 'Fetal Hemoglobin (HbF)', category: 'hematology', specimen: 'EDTA Blood', unit: '%', referenceRange: '<1' },
    { id: 'hb_a2', name: 'Hemoglobin A2', category: 'hematology', specimen: 'EDTA Blood', unit: '%', referenceRange: '2.0-3.5' },
    
    // Iron Studies & Anemia Workup
    { id: 'iron_studies', name: 'Iron Studies', category: 'hematology', specimen: 'Serum', parameters: ['Serum Iron', 'TIBC', 'Transferrin Saturation', 'Ferritin'] },
    { id: 'serum_iron', name: 'Serum Iron', category: 'hematology', specimen: 'Serum', unit: 'µmol/L', referenceRange: 'M: 11-28, F: 7-26' },
    { id: 'tibc', name: 'Total Iron Binding Capacity (TIBC)', category: 'hematology', specimen: 'Serum', unit: 'µmol/L', referenceRange: '45-72' },
    { id: 'ferritin', name: 'Ferritin', category: 'hematology', specimen: 'Serum', unit: 'ng/mL', referenceRange: 'M: 20-300, F: 10-150' },
    { id: 'transferrin', name: 'Transferrin', category: 'hematology', specimen: 'Serum', unit: 'g/L', referenceRange: '2.0-3.6' },
    { id: 'transferrin_sat', name: 'Transferrin Saturation', category: 'hematology', specimen: 'Serum', unit: '%', referenceRange: '20-50' },
    { id: 'vitamin_b12', name: 'Vitamin B12', category: 'hematology', specimen: 'Serum', unit: 'pg/mL', referenceRange: '200-900' },
    { id: 'folate', name: 'Folate (Folic Acid)', category: 'hematology', specimen: 'Serum', unit: 'ng/mL', referenceRange: '>3.0' },
    { id: 'rbc_folate', name: 'Red Cell Folate', category: 'hematology', specimen: 'EDTA Blood', unit: 'ng/mL', referenceRange: '140-628' },
    { id: 'haptoglobin', name: 'Haptoglobin', category: 'hematology', specimen: 'Serum', unit: 'g/L', referenceRange: '0.3-2.0' },
    { id: 'ldh', name: 'Lactate Dehydrogenase (LDH)', category: 'hematology', specimen: 'Serum', unit: 'U/L', referenceRange: '140-280' },
    
    // Bone Marrow
    { id: 'bma', name: 'Bone Marrow Aspirate', category: 'hematology', specimen: 'Bone Marrow', turnaroundTime: '24-48 hours', parameters: ['Cellularity', 'M:E Ratio', 'Iron Stores', 'Morphology'] },
    { id: 'bmt', name: 'Bone Marrow Trephine Biopsy', category: 'hematology', specimen: 'Bone Marrow', turnaroundTime: '5-7 days' },
    { id: 'flow_cytometry', name: 'Flow Cytometry (Immunophenotyping)', category: 'hematology', specimen: 'EDTA Blood/Bone Marrow', turnaroundTime: '24-48 hours' },
  ],
  biochemistry: [
    // Glucose Metabolism
    { id: 'fbg', name: 'Fasting Blood Glucose', category: 'biochemistry', specimen: 'Fluoride Blood', unit: 'mmol/L', referenceRange: '3.9-5.6', requiresFasting: true },
    { id: 'rbg', name: 'Random Blood Glucose', category: 'biochemistry', specimen: 'Fluoride Blood', unit: 'mmol/L', referenceRange: '<7.8' },
    { id: 'hba1c', name: 'HbA1c (Glycated Haemoglobin)', category: 'biochemistry', specimen: 'EDTA Blood', unit: '%', referenceRange: '<5.7' },
    { id: 'ogtt', name: 'Oral Glucose Tolerance Test (OGTT)', category: 'biochemistry', specimen: 'Fluoride Blood', parameters: ['Fasting', '1 hour', '2 hour'], requiresFasting: true, turnaroundTime: '2.5 hours' },
    { id: 'fructosamine', name: 'Fructosamine', category: 'biochemistry', specimen: 'Serum', unit: 'µmol/L', referenceRange: '200-285' },
    { id: 'c_peptide', name: 'C-Peptide', category: 'biochemistry', specimen: 'Serum', unit: 'ng/mL', referenceRange: '0.5-2.0' },
    { id: 'insulin', name: 'Fasting Insulin', category: 'biochemistry', specimen: 'Serum', unit: 'µU/mL', referenceRange: '2-25', requiresFasting: true },
    
    // Renal Function
    { id: 'rft', name: 'Renal Function Tests', category: 'biochemistry', specimen: 'Serum', parameters: ['Urea', 'Creatinine', 'eGFR', 'Sodium', 'Potassium', 'Chloride', 'Bicarbonate'], turnaroundTime: '2 hours' },
    { id: 'urea', name: 'Urea (BUN)', category: 'biochemistry', specimen: 'Serum', unit: 'mmol/L', referenceRange: '2.5-6.7' },
    { id: 'creatinine', name: 'Creatinine', category: 'biochemistry', specimen: 'Serum', unit: 'µmol/L', referenceRange: 'M: 62-106, F: 44-80' },
    { id: 'egfr', name: 'Estimated GFR', category: 'biochemistry', specimen: 'Serum', unit: 'mL/min/1.73m²', referenceRange: '>90' },
    { id: 'cystatin_c', name: 'Cystatin C', category: 'biochemistry', specimen: 'Serum', unit: 'mg/L', referenceRange: '0.5-1.0' },
    { id: 'bun_creat_ratio', name: 'BUN/Creatinine Ratio', category: 'biochemistry', specimen: 'Serum', referenceRange: '10:1-20:1' },
    { id: 'creatinine_clearance', name: 'Creatinine Clearance', category: 'biochemistry', specimen: '24hr Urine + Serum', unit: 'mL/min', referenceRange: 'M: 97-137, F: 88-128' },
    
    // Electrolytes
    { id: 'electrolytes', name: 'Electrolytes (Na, K, Cl, HCO3)', category: 'biochemistry', specimen: 'Serum', parameters: ['Sodium', 'Potassium', 'Chloride', 'Bicarbonate'] },
    { id: 'sodium', name: 'Sodium', category: 'biochemistry', specimen: 'Serum', unit: 'mmol/L', referenceRange: '135-145' },
    { id: 'potassium', name: 'Potassium', category: 'biochemistry', specimen: 'Serum', unit: 'mmol/L', referenceRange: '3.5-5.0' },
    { id: 'chloride', name: 'Chloride', category: 'biochemistry', specimen: 'Serum', unit: 'mmol/L', referenceRange: '96-106' },
    { id: 'bicarbonate', name: 'Bicarbonate', category: 'biochemistry', specimen: 'Serum', unit: 'mmol/L', referenceRange: '22-28' },
    { id: 'anion_gap', name: 'Anion Gap', category: 'biochemistry', specimen: 'Serum', unit: 'mmol/L', referenceRange: '8-16' },
    { id: 'osmolality', name: 'Serum Osmolality', category: 'biochemistry', specimen: 'Serum', unit: 'mOsm/kg', referenceRange: '280-295' },
    
    // Minerals & Bone
    { id: 'calcium', name: 'Calcium (Total)', category: 'biochemistry', specimen: 'Serum', unit: 'mmol/L', referenceRange: '2.15-2.55' },
    { id: 'calcium_ionized', name: 'Calcium (Ionized)', category: 'biochemistry', specimen: 'Serum', unit: 'mmol/L', referenceRange: '1.12-1.32' },
    { id: 'phosphate', name: 'Phosphate (Phosphorus)', category: 'biochemistry', specimen: 'Serum', unit: 'mmol/L', referenceRange: '0.8-1.5' },
    { id: 'magnesium', name: 'Magnesium', category: 'biochemistry', specimen: 'Serum', unit: 'mmol/L', referenceRange: '0.7-1.0' },
    { id: 'pth', name: 'Parathyroid Hormone (PTH)', category: 'biochemistry', specimen: 'Serum', unit: 'pg/mL', referenceRange: '15-65' },
    { id: 'vitamin_d', name: 'Vitamin D (25-OH)', category: 'biochemistry', specimen: 'Serum', unit: 'ng/mL', referenceRange: '30-100' },
    { id: 'vitamin_d_125', name: 'Vitamin D (1,25-diOH)', category: 'biochemistry', specimen: 'Serum', unit: 'pg/mL', referenceRange: '20-76' },
    { id: 'alp_bone', name: 'Bone-Specific Alkaline Phosphatase', category: 'biochemistry', specimen: 'Serum', unit: 'µg/L', referenceRange: 'M: 5.5-22.9, F: 4.5-16.9' },
    { id: 'osteocalcin', name: 'Osteocalcin', category: 'biochemistry', specimen: 'Serum', unit: 'ng/mL', referenceRange: '3.7-10' },
    { id: 'ctx', name: 'C-Telopeptide (CTx)', category: 'biochemistry', specimen: 'Serum', unit: 'ng/mL', referenceRange: '<0.584' },
    
    // Liver Function & Proteins
    { id: 'lft', name: 'Liver Function Tests', category: 'biochemistry', specimen: 'Serum', parameters: ['Total Protein', 'Albumin', 'Globulin', 'A/G Ratio', 'Total Bilirubin', 'Direct Bilirubin', 'Indirect Bilirubin', 'ALT', 'AST', 'ALP', 'GGT'], turnaroundTime: '2 hours' },
    { id: 'total_protein', name: 'Total Serum Protein', category: 'biochemistry', specimen: 'Serum', unit: 'g/L', referenceRange: '60-83' },
    { id: 'albumin', name: 'Albumin', category: 'biochemistry', specimen: 'Serum', unit: 'g/L', referenceRange: '35-50' },
    { id: 'globulin', name: 'Globulin', category: 'biochemistry', specimen: 'Serum', unit: 'g/L', referenceRange: '23-35' },
    { id: 'ag_ratio', name: 'Albumin/Globulin Ratio', category: 'biochemistry', specimen: 'Serum', referenceRange: '1.0-2.5' },
    { id: 'prealbumin', name: 'Prealbumin (Transthyretin)', category: 'biochemistry', specimen: 'Serum', unit: 'mg/dL', referenceRange: '20-40' },
    { id: 'protein_electro', name: 'Serum Protein Electrophoresis (SPEP)', category: 'biochemistry', specimen: 'Serum', parameters: ['Albumin', 'Alpha-1', 'Alpha-2', 'Beta', 'Gamma'] },
    { id: 'immunofixation', name: 'Immunofixation Electrophoresis', category: 'biochemistry', specimen: 'Serum/Urine', parameters: ['IgG', 'IgA', 'IgM', 'Kappa', 'Lambda'] },
    { id: 'free_light_chains', name: 'Serum Free Light Chains', category: 'biochemistry', specimen: 'Serum', parameters: ['Kappa', 'Lambda', 'Kappa/Lambda Ratio'] },
    { id: 'total_bilirubin', name: 'Total Bilirubin', category: 'biochemistry', specimen: 'Serum', unit: 'µmol/L', referenceRange: '5-21' },
    { id: 'direct_bilirubin', name: 'Direct (Conjugated) Bilirubin', category: 'biochemistry', specimen: 'Serum', unit: 'µmol/L', referenceRange: '<5' },
    { id: 'indirect_bilirubin', name: 'Indirect (Unconjugated) Bilirubin', category: 'biochemistry', specimen: 'Serum', unit: 'µmol/L', referenceRange: '3-17' },
    { id: 'alt', name: 'ALT (SGPT)', category: 'biochemistry', specimen: 'Serum', unit: 'U/L', referenceRange: 'M: 10-40, F: 7-35' },
    { id: 'ast', name: 'AST (SGOT)', category: 'biochemistry', specimen: 'Serum', unit: 'U/L', referenceRange: 'M: 10-40, F: 9-32' },
    { id: 'alp', name: 'Alkaline Phosphatase (ALP)', category: 'biochemistry', specimen: 'Serum', unit: 'U/L', referenceRange: '44-147' },
    { id: 'ggt', name: 'Gamma-Glutamyl Transferase (GGT)', category: 'biochemistry', specimen: 'Serum', unit: 'U/L', referenceRange: 'M: 10-71, F: 6-42' },
    { id: 'ammonia', name: 'Ammonia', category: 'biochemistry', specimen: 'EDTA Blood (on ice)', unit: 'µmol/L', referenceRange: '11-35' },
    
    // Lipid Profile
    { id: 'lipid', name: 'Lipid Profile', category: 'biochemistry', specimen: 'Fasting Serum', parameters: ['Total Cholesterol', 'Triglycerides', 'HDL', 'LDL', 'VLDL', 'Non-HDL Cholesterol'], requiresFasting: true },
    { id: 'total_cholesterol', name: 'Total Cholesterol', category: 'biochemistry', specimen: 'Serum', unit: 'mmol/L', referenceRange: '<5.2' },
    { id: 'triglycerides', name: 'Triglycerides', category: 'biochemistry', specimen: 'Fasting Serum', unit: 'mmol/L', referenceRange: '<1.7', requiresFasting: true },
    { id: 'hdl', name: 'HDL Cholesterol', category: 'biochemistry', specimen: 'Serum', unit: 'mmol/L', referenceRange: '>1.0' },
    { id: 'ldl', name: 'LDL Cholesterol', category: 'biochemistry', specimen: 'Serum', unit: 'mmol/L', referenceRange: '<3.0' },
    { id: 'vldl', name: 'VLDL Cholesterol', category: 'biochemistry', specimen: 'Serum', unit: 'mmol/L', referenceRange: '0.1-0.7' },
    { id: 'apolipoprotein_a1', name: 'Apolipoprotein A1', category: 'biochemistry', specimen: 'Serum', unit: 'g/L', referenceRange: '1.1-2.0' },
    { id: 'apolipoprotein_b', name: 'Apolipoprotein B', category: 'biochemistry', specimen: 'Serum', unit: 'g/L', referenceRange: '0.6-1.3' },
    { id: 'lipoprotein_a', name: 'Lipoprotein(a)', category: 'biochemistry', specimen: 'Serum', unit: 'mg/dL', referenceRange: '<30' },
    
    // Pancreatic Enzymes
    { id: 'amylase', name: 'Amylase', category: 'biochemistry', specimen: 'Serum', unit: 'U/L', referenceRange: '28-100' },
    { id: 'lipase', name: 'Lipase', category: 'biochemistry', specimen: 'Serum', unit: 'U/L', referenceRange: '0-160' },
    { id: 'trypsin', name: 'Trypsin', category: 'biochemistry', specimen: 'Serum', unit: 'ng/mL', referenceRange: '140-400' },
    { id: 'elastase', name: 'Fecal Elastase', category: 'biochemistry', specimen: 'Stool', unit: 'µg/g', referenceRange: '>200' },
    
    // Inflammatory Markers
    { id: 'crp', name: 'C-Reactive Protein (CRP)', category: 'biochemistry', specimen: 'Serum', unit: 'mg/L', referenceRange: '<5' },
    { id: 'hs_crp', name: 'High-Sensitivity CRP', category: 'biochemistry', specimen: 'Serum', unit: 'mg/L', referenceRange: '<1 (low risk), 1-3 (moderate), >3 (high)' },
    { id: 'procalcitonin', name: 'Procalcitonin', category: 'biochemistry', specimen: 'Serum', unit: 'ng/mL', referenceRange: '<0.1' },
    { id: 'il6', name: 'Interleukin-6 (IL-6)', category: 'biochemistry', specimen: 'Serum', unit: 'pg/mL', referenceRange: '<7' },
    { id: 'presepsin', name: 'Presepsin (sCD14-ST)', category: 'biochemistry', specimen: 'EDTA Blood', unit: 'pg/mL', referenceRange: '<314' },
    
    // Critical Care / ICU
    { id: 'lactate', name: 'Lactate', category: 'biochemistry', specimen: 'Arterial/Venous Blood', unit: 'mmol/L', referenceRange: '0.5-2.0' },
    { id: 'abg', name: 'Arterial Blood Gases', category: 'biochemistry', specimen: 'Arterial Blood', parameters: ['pH', 'PaO2', 'PaCO2', 'HCO3', 'Base Excess', 'SaO2', 'Lactate'], turnaroundTime: '15 minutes' },
    { id: 'vbg', name: 'Venous Blood Gases', category: 'biochemistry', specimen: 'Venous Blood', parameters: ['pH', 'pCO2', 'HCO3', 'Base Excess'] },
    { id: 'capillary_bg', name: 'Capillary Blood Gases', category: 'biochemistry', specimen: 'Capillary Blood', parameters: ['pH', 'pCO2', 'pO2', 'HCO3'] },
    { id: 'carboxyhb', name: 'Carboxyhemoglobin', category: 'biochemistry', specimen: 'Arterial Blood', unit: '%', referenceRange: '<2 (non-smoker), <10 (smoker)' },
    { id: 'methemoglobin', name: 'Methemoglobin', category: 'biochemistry', specimen: 'Arterial Blood', unit: '%', referenceRange: '<1.5' },
    
    // Muscle/Cardiac Enzymes
    { id: 'ck', name: 'Creatine Kinase (CK)', category: 'biochemistry', specimen: 'Serum', unit: 'U/L', referenceRange: 'M: 39-308, F: 26-192' },
    { id: 'ck_mb', name: 'CK-MB', category: 'biochemistry', specimen: 'Serum', unit: 'ng/mL', referenceRange: '<5' },
    { id: 'myoglobin', name: 'Myoglobin', category: 'biochemistry', specimen: 'Serum', unit: 'ng/mL', referenceRange: 'M: 28-72, F: 25-58' },
    { id: 'aldolase', name: 'Aldolase', category: 'biochemistry', specimen: 'Serum', unit: 'U/L', referenceRange: '<8.1' },
    
    // Other Biochemistry
    { id: 'uric_acid', name: 'Uric Acid', category: 'biochemistry', specimen: 'Serum', unit: 'µmol/L', referenceRange: 'M: 200-430, F: 140-360' },
    { id: 'cholinesterase', name: 'Cholinesterase (Pseudocholinesterase)', category: 'biochemistry', specimen: 'Serum', unit: 'U/L', referenceRange: '5320-12920' },
    { id: 'copper', name: 'Copper', category: 'biochemistry', specimen: 'Serum', unit: 'µmol/L', referenceRange: '11-22' },
    { id: 'ceruloplasmin', name: 'Ceruloplasmin', category: 'biochemistry', specimen: 'Serum', unit: 'g/L', referenceRange: '0.2-0.6' },
    { id: 'zinc', name: 'Zinc', category: 'biochemistry', specimen: 'Serum', unit: 'µmol/L', referenceRange: '10-18' },
    { id: 'selenium', name: 'Selenium', category: 'biochemistry', specimen: 'Serum', unit: 'µg/L', referenceRange: '46-143' },
    { id: 'lead', name: 'Lead Level', category: 'biochemistry', specimen: 'EDTA Blood', unit: 'µg/dL', referenceRange: '<10' },
    { id: 'ethanol', name: 'Ethanol (Blood Alcohol)', category: 'biochemistry', specimen: 'Serum', unit: 'mg/dL', referenceRange: '<10' },
    { id: 'salicylate', name: 'Salicylate Level', category: 'biochemistry', specimen: 'Serum', unit: 'mg/dL', referenceRange: 'Therapeutic: 15-30' },
    { id: 'paracetamol', name: 'Paracetamol Level', category: 'biochemistry', specimen: 'Serum', unit: 'mg/L', referenceRange: '<120 at 4 hours' },
    { id: 'digoxin', name: 'Digoxin Level', category: 'biochemistry', specimen: 'Serum', unit: 'ng/mL', referenceRange: '0.8-2.0' },
    { id: 'lithium', name: 'Lithium Level', category: 'biochemistry', specimen: 'Serum', unit: 'mmol/L', referenceRange: '0.6-1.2' },
    { id: 'vancomycin', name: 'Vancomycin Level', category: 'biochemistry', specimen: 'Serum', unit: 'mg/L', referenceRange: 'Trough: 10-20' },
    { id: 'gentamicin', name: 'Gentamicin Level', category: 'biochemistry', specimen: 'Serum', unit: 'mg/L', referenceRange: 'Trough: <2' },
    { id: 'phenytoin', name: 'Phenytoin Level', category: 'biochemistry', specimen: 'Serum', unit: 'µg/mL', referenceRange: '10-20' },
    { id: 'valproic_acid', name: 'Valproic Acid Level', category: 'biochemistry', specimen: 'Serum', unit: 'µg/mL', referenceRange: '50-100' },
    { id: 'carbamazepine', name: 'Carbamazepine Level', category: 'biochemistry', specimen: 'Serum', unit: 'µg/mL', referenceRange: '4-12' },
    { id: 'theophylline', name: 'Theophylline Level', category: 'biochemistry', specimen: 'Serum', unit: 'µg/mL', referenceRange: '10-20' },
    { id: 'tacrolimus', name: 'Tacrolimus Level', category: 'biochemistry', specimen: 'EDTA Blood', unit: 'ng/mL', referenceRange: '5-20 (varies)' },
    { id: 'cyclosporine', name: 'Cyclosporine Level', category: 'biochemistry', specimen: 'EDTA Blood', unit: 'ng/mL', referenceRange: '100-400 (varies)' },
  ],
  microbiology: [
    // Bacterial Cultures
    { id: 'wound_mcs', name: 'Wound Swab M/C/S', category: 'microbiology', specimen: 'Wound Swab', turnaroundTime: '48-72 hours', parameters: ['Organisms', 'Gram Stain', 'Sensitivity'] },
    { id: 'blood_culture', name: 'Blood Culture (Aerobic + Anaerobic)', category: 'microbiology', specimen: 'Blood (2 sets)', turnaroundTime: '24-72 hours', parameters: ['Organisms', 'Gram Stain', 'Sensitivity'] },
    { id: 'blood_culture_aerobic', name: 'Blood Culture (Aerobic)', category: 'microbiology', specimen: 'Blood', turnaroundTime: '24-72 hours', parameters: ['Organisms', 'Sensitivity'] },
    { id: 'blood_culture_anaerobic', name: 'Blood Culture (Anaerobic)', category: 'microbiology', specimen: 'Blood', turnaroundTime: '48-72 hours', parameters: ['Organisms', 'Sensitivity'] },
    { id: 'urine_mcs', name: 'Urine M/C/S', category: 'microbiology', specimen: 'Mid-stream Urine', turnaroundTime: '24-48 hours', parameters: ['WBC', 'RBC', 'Epithelial Cells', 'Organisms', 'Colony Count', 'Sensitivity'] },
    { id: 'catheter_urine', name: 'Catheter Specimen Urine M/C/S', category: 'microbiology', specimen: 'Catheter Urine', turnaroundTime: '24-48 hours', parameters: ['WBC', 'RBC', 'Organisms', 'Sensitivity'] },
    { id: 'stool_mcs', name: 'Stool M/C/S', category: 'microbiology', specimen: 'Stool', turnaroundTime: '48-72 hours', parameters: ['Organisms', 'Ova', 'Cyst', 'Occult Blood', 'Sensitivity'] },
    { id: 'stool_ova_parasites', name: 'Stool for Ova & Parasites', category: 'microbiology', specimen: 'Stool', turnaroundTime: '24 hours', parameters: ['Ova', 'Cysts', 'Trophozoites', 'Parasites'] },
    { id: 'stool_occult', name: 'Fecal Occult Blood Test (FOBT)', category: 'microbiology', specimen: 'Stool', referenceRange: 'Negative' },
    { id: 'sputum_mcs', name: 'Sputum M/C/S', category: 'microbiology', specimen: 'Sputum', turnaroundTime: '24-48 hours', parameters: ['Organisms', 'Gram Stain', 'Sensitivity'] },
    { id: 'csf_mcs', name: 'CSF M/C/S', category: 'microbiology', specimen: 'CSF', turnaroundTime: '24-48 hours', parameters: ['Appearance', 'WBC', 'RBC', 'Glucose', 'Protein', 'Organisms', 'Gram Stain', 'Sensitivity'] },
    { id: 'csf_analysis', name: 'CSF Analysis (Complete)', category: 'microbiology', specimen: 'CSF', parameters: ['Appearance', 'WBC with Differential', 'RBC', 'Glucose', 'Protein', 'Lactate', 'Chloride', 'Gram Stain', 'Culture', 'India Ink', 'Cryptococcal Antigen'] },
    { id: 'hvs', name: 'High Vaginal Swab M/C/S', category: 'microbiology', specimen: 'HVS', turnaroundTime: '24-48 hours', parameters: ['Organisms', 'Wet Mount', 'Gram Stain', 'Sensitivity'] },
    { id: 'endocervical_swab', name: 'Endocervical Swab M/C/S', category: 'microbiology', specimen: 'Endocervical Swab', turnaroundTime: '24-48 hours', parameters: ['Organisms', 'Sensitivity'] },
    { id: 'urethral_swab', name: 'Urethral Swab M/C/S', category: 'microbiology', specimen: 'Urethral Swab', turnaroundTime: '24-48 hours', parameters: ['Organisms', 'Gram Stain', 'Sensitivity'] },
    { id: 'throat_swab', name: 'Throat Swab M/C/S', category: 'microbiology', specimen: 'Throat Swab', turnaroundTime: '24-48 hours', parameters: ['Organisms', 'Sensitivity'] },
    { id: 'nasal_swab', name: 'Nasal Swab M/C/S', category: 'microbiology', specimen: 'Nasal Swab', turnaroundTime: '24-48 hours', parameters: ['Organisms', 'MRSA Screen', 'Sensitivity'] },
    { id: 'ear_swab', name: 'Ear Swab M/C/S', category: 'microbiology', specimen: 'Ear Swab', turnaroundTime: '24-48 hours', parameters: ['Organisms', 'Fungal', 'Sensitivity'] },
    { id: 'eye_swab', name: 'Eye Swab M/C/S', category: 'microbiology', specimen: 'Conjunctival Swab', turnaroundTime: '24-48 hours', parameters: ['Organisms', 'Sensitivity'] },
    { id: 'pus_mcs', name: 'Pus/Abscess M/C/S', category: 'microbiology', specimen: 'Pus/Aspirate', turnaroundTime: '48-72 hours', parameters: ['Organisms', 'Gram Stain', 'Sensitivity'] },
    { id: 'tissue_mcs', name: 'Tissue Culture M/C/S', category: 'microbiology', specimen: 'Tissue', turnaroundTime: '48-72 hours', parameters: ['Organisms', 'Sensitivity'] },
    { id: 'catheter_tip', name: 'Catheter Tip Culture', category: 'microbiology', specimen: 'Catheter Tip', turnaroundTime: '48-72 hours', parameters: ['Colony Count', 'Organisms', 'Sensitivity'] },
    { id: 'drain_fluid', name: 'Drain Fluid M/C/S', category: 'microbiology', specimen: 'Drain Fluid', turnaroundTime: '24-48 hours', parameters: ['Organisms', 'Gram Stain', 'Sensitivity'] },
    { id: 'peritoneal_fluid', name: 'Peritoneal/Ascitic Fluid M/C/S', category: 'microbiology', specimen: 'Peritoneal Fluid', turnaroundTime: '24-48 hours', parameters: ['WBC', 'RBC', 'Organisms', 'Gram Stain', 'Sensitivity', 'Albumin', 'Protein'] },
    { id: 'pleural_fluid', name: 'Pleural Fluid M/C/S', category: 'microbiology', specimen: 'Pleural Fluid', turnaroundTime: '24-48 hours', parameters: ['Appearance', 'WBC', 'RBC', 'Organisms', 'Gram Stain', 'Sensitivity', 'LDH', 'Protein', 'Glucose', 'pH'] },
    { id: 'synovial_fluid', name: 'Synovial Fluid M/C/S', category: 'microbiology', specimen: 'Synovial Fluid', turnaroundTime: '24-48 hours', parameters: ['Appearance', 'WBC', 'RBC', 'Crystals', 'Organisms', 'Gram Stain', 'Sensitivity'] },
    { id: 'semen_mcs', name: 'Semen M/C/S', category: 'microbiology', specimen: 'Semen', turnaroundTime: '24-48 hours', parameters: ['Organisms', 'WBC', 'Sensitivity'] },
    { id: 'semen_analysis', name: 'Semen Analysis', category: 'microbiology', specimen: 'Semen', parameters: ['Volume', 'pH', 'Count', 'Motility', 'Morphology', 'WBC'] },
    
    // TB & Mycobacteria
    { id: 'afb', name: 'AFB (ZN Stain)', category: 'microbiology', specimen: 'Sputum/Other', referenceRange: 'Negative' },
    { id: 'afb_concentration', name: 'AFB Concentration', category: 'microbiology', specimen: 'Sputum', referenceRange: 'Negative' },
    { id: 'afb_culture', name: 'AFB Culture', category: 'microbiology', specimen: 'Sputum', turnaroundTime: '6-8 weeks' },
    { id: 'genexpert', name: 'GeneXpert MTB/RIF', category: 'microbiology', specimen: 'Sputum/Other', referenceRange: 'Not Detected', turnaroundTime: '2 hours', parameters: ['MTB Detection', 'Rifampicin Resistance'] },
    { id: 'tb_pcr', name: 'TB PCR', category: 'microbiology', specimen: 'Sputum/Tissue', referenceRange: 'Negative', turnaroundTime: '24-48 hours' },
    { id: 'mantoux', name: 'Mantoux Test (TST)', category: 'microbiology', specimen: 'Intradermal', referenceRange: '<5mm (negative)', turnaroundTime: '48-72 hours' },
    { id: 'igra', name: 'IGRA (QuantiFERON/T-SPOT)', category: 'microbiology', specimen: 'Blood', referenceRange: 'Negative' },
    
    // Fungal Studies
    { id: 'fungal_culture', name: 'Fungal Culture', category: 'microbiology', specimen: 'Various', turnaroundTime: '1-4 weeks' },
    { id: 'koh_prep', name: 'KOH Preparation', category: 'microbiology', specimen: 'Skin/Nail/Hair', referenceRange: 'Negative' },
    { id: 'india_ink', name: 'India Ink (Cryptococcus)', category: 'microbiology', specimen: 'CSF', referenceRange: 'Negative' },
    { id: 'crypto_ag', name: 'Cryptococcal Antigen (CrAg)', category: 'microbiology', specimen: 'Serum/CSF', referenceRange: 'Negative' },
    { id: 'galactomannan', name: 'Galactomannan (Aspergillus)', category: 'microbiology', specimen: 'Serum/BAL', referenceRange: '<0.5 Index' },
    { id: 'beta_d_glucan', name: 'Beta-D-Glucan', category: 'microbiology', specimen: 'Serum', unit: 'pg/mL', referenceRange: '<60' },
    
    // Parasitology
    { id: 'malaria_rdt', name: 'Malaria RDT', category: 'microbiology', specimen: 'Capillary Blood', referenceRange: 'Negative' },
    { id: 'malaria_film', name: 'Malaria Parasite (Thick & Thin Film)', category: 'microbiology', specimen: 'EDTA Blood', referenceRange: 'No Parasites Seen', parameters: ['Species', 'Parasite Density'] },
    { id: 'malaria_pcr', name: 'Malaria PCR', category: 'microbiology', specimen: 'EDTA Blood', referenceRange: 'Negative', parameters: ['Species Identification'] },
    { id: 'filaria', name: 'Filaria (Microfilaria)', category: 'microbiology', specimen: 'Night Blood', referenceRange: 'Not Seen' },
    { id: 'trypanosoma', name: 'Trypanosoma', category: 'microbiology', specimen: 'Blood/CSF', referenceRange: 'Not Seen' },
    
    // Viral Studies (PCR-based)
    { id: 'covid_pcr', name: 'COVID-19 PCR', category: 'microbiology', specimen: 'Nasopharyngeal Swab', referenceRange: 'Not Detected' },
    { id: 'covid_rapid', name: 'COVID-19 Rapid Antigen Test', category: 'microbiology', specimen: 'Nasopharyngeal Swab', referenceRange: 'Negative' },
    { id: 'influenza_pcr', name: 'Influenza A/B PCR', category: 'microbiology', specimen: 'Nasopharyngeal Swab', referenceRange: 'Not Detected' },
    { id: 'rsv_pcr', name: 'RSV PCR', category: 'microbiology', specimen: 'Nasopharyngeal Swab', referenceRange: 'Not Detected' },
    { id: 'respiratory_panel', name: 'Respiratory Viral Panel', category: 'microbiology', specimen: 'Nasopharyngeal Swab', turnaroundTime: '2-4 hours', parameters: ['Influenza A/B', 'RSV', 'Parainfluenza', 'Adenovirus', 'Rhinovirus', 'hMPV'] },
    { id: 'hiv_viral_load', name: 'HIV Viral Load', category: 'microbiology', specimen: 'EDTA Blood', unit: 'copies/mL', referenceRange: '<20 (undetectable)' },
    { id: 'hbv_dna', name: 'HBV DNA (Viral Load)', category: 'microbiology', specimen: 'Serum', unit: 'IU/mL', referenceRange: '<10' },
    { id: 'hcv_rna', name: 'HCV RNA (Viral Load)', category: 'microbiology', specimen: 'Serum', unit: 'IU/mL', referenceRange: '<15 (undetected)' },
    { id: 'cmv_pcr', name: 'CMV PCR', category: 'microbiology', specimen: 'EDTA Blood', referenceRange: 'Not Detected' },
    { id: 'ebv_pcr', name: 'EBV PCR', category: 'microbiology', specimen: 'EDTA Blood', referenceRange: 'Not Detected' },
    { id: 'hsv_pcr', name: 'HSV 1&2 PCR', category: 'microbiology', specimen: 'Swab/CSF', referenceRange: 'Not Detected' },
    { id: 'vzv_pcr', name: 'VZV PCR', category: 'microbiology', specimen: 'Swab/CSF', referenceRange: 'Not Detected' },
    { id: 'meningitis_panel', name: 'Meningitis/Encephalitis Panel', category: 'microbiology', specimen: 'CSF', turnaroundTime: '2-4 hours', parameters: ['Bacteria', 'Viruses', 'Fungi'] },
    
    // Antibiotic Sensitivity
    { id: 'mrsa_screen', name: 'MRSA Screen', category: 'microbiology', specimen: 'Nasal/Groin Swab', referenceRange: 'Negative' },
    { id: 'vre_screen', name: 'VRE Screen', category: 'microbiology', specimen: 'Rectal Swab', referenceRange: 'Negative' },
    { id: 'esbl_screen', name: 'ESBL Screen', category: 'microbiology', specimen: 'Rectal Swab', referenceRange: 'Negative' },
    { id: 'cre_screen', name: 'CRE/CPE Screen', category: 'microbiology', specimen: 'Rectal Swab', referenceRange: 'Negative' },
    { id: 'c_diff', name: 'C. difficile Toxin (GDH + Toxin)', category: 'microbiology', specimen: 'Stool', referenceRange: 'Negative' },
    { id: 'h_pylori_stool', name: 'H. pylori Stool Antigen', category: 'microbiology', specimen: 'Stool', referenceRange: 'Negative' },
    { id: 'h_pylori_breath', name: 'H. pylori Breath Test (Urea)', category: 'microbiology', specimen: 'Breath', referenceRange: 'Negative' },
  ],
  serology: [
    // Viral Serology
    { id: 'hiv', name: 'HIV 1&2 Antibodies', category: 'serology', specimen: 'Serum', referenceRange: 'Non-reactive' },
    { id: 'hiv_combo', name: 'HIV 1/2 Ag/Ab Combo', category: 'serology', specimen: 'Serum', referenceRange: 'Non-reactive' },
    { id: 'hiv_confirmatory', name: 'HIV Confirmatory (Western Blot)', category: 'serology', specimen: 'Serum', referenceRange: 'Negative' },
    { id: 'hbsag', name: 'Hepatitis B Surface Antigen (HBsAg)', category: 'serology', specimen: 'Serum', referenceRange: 'Negative' },
    { id: 'hbsab', name: 'Hepatitis B Surface Antibody (Anti-HBs)', category: 'serology', specimen: 'Serum', unit: 'mIU/mL', referenceRange: '>10 (immune)' },
    { id: 'hbcab_total', name: 'Hepatitis B Core Antibody (Anti-HBc Total)', category: 'serology', specimen: 'Serum', referenceRange: 'Negative' },
    { id: 'hbcab_igm', name: 'Hepatitis B Core Antibody IgM', category: 'serology', specimen: 'Serum', referenceRange: 'Negative' },
    { id: 'hbeag', name: 'Hepatitis B e-Antigen (HBeAg)', category: 'serology', specimen: 'Serum', referenceRange: 'Negative' },
    { id: 'hbeab', name: 'Hepatitis B e-Antibody (Anti-HBe)', category: 'serology', specimen: 'Serum', referenceRange: 'Negative' },
    { id: 'hbv_panel', name: 'Hepatitis B Panel', category: 'serology', specimen: 'Serum', parameters: ['HBsAg', 'Anti-HBs', 'Anti-HBc Total', 'Anti-HBc IgM', 'HBeAg', 'Anti-HBe'] },
    { id: 'anti_hcv', name: 'Anti-HCV Antibodies', category: 'serology', specimen: 'Serum', referenceRange: 'Negative' },
    { id: 'hav_igm', name: 'Hepatitis A IgM', category: 'serology', specimen: 'Serum', referenceRange: 'Negative' },
    { id: 'hav_total', name: 'Hepatitis A Total Antibodies', category: 'serology', specimen: 'Serum', referenceRange: 'Negative (susceptible)' },
    { id: 'hev_igm', name: 'Hepatitis E IgM', category: 'serology', specimen: 'Serum', referenceRange: 'Negative' },
    { id: 'cmv_igg_igm', name: 'CMV IgG/IgM', category: 'serology', specimen: 'Serum', parameters: ['IgG', 'IgM'] },
    { id: 'ebv_panel', name: 'EBV Panel (VCA IgG, IgM, EBNA)', category: 'serology', specimen: 'Serum', parameters: ['VCA IgG', 'VCA IgM', 'EBNA IgG'] },
    { id: 'rubella_igg_igm', name: 'Rubella IgG/IgM', category: 'serology', specimen: 'Serum', parameters: ['IgG', 'IgM'] },
    { id: 'toxoplasma_igg_igm', name: 'Toxoplasma IgG/IgM', category: 'serology', specimen: 'Serum', parameters: ['IgG', 'IgM'] },
    { id: 'torch_screen', name: 'TORCH Screen', category: 'serology', specimen: 'Serum', parameters: ['Toxoplasma', 'Rubella', 'CMV', 'HSV'] },
    { id: 'hsv_1_igg', name: 'HSV-1 IgG', category: 'serology', specimen: 'Serum', referenceRange: 'Negative' },
    { id: 'hsv_2_igg', name: 'HSV-2 IgG', category: 'serology', specimen: 'Serum', referenceRange: 'Negative' },
    { id: 'vzv_igg', name: 'Varicella Zoster IgG', category: 'serology', specimen: 'Serum', referenceRange: 'Positive (immune)' },
    { id: 'measles_igg', name: 'Measles IgG', category: 'serology', specimen: 'Serum', referenceRange: 'Positive (immune)' },
    { id: 'mumps_igg', name: 'Mumps IgG', category: 'serology', specimen: 'Serum', referenceRange: 'Positive (immune)' },
    { id: 'dengue_ns1', name: 'Dengue NS1 Antigen', category: 'serology', specimen: 'Serum', referenceRange: 'Negative' },
    { id: 'dengue_igg_igm', name: 'Dengue IgG/IgM', category: 'serology', specimen: 'Serum', parameters: ['IgG', 'IgM'] },
    { id: 'chikungunya', name: 'Chikungunya IgM/IgG', category: 'serology', specimen: 'Serum', referenceRange: 'Negative' },
    { id: 'yellow_fever', name: 'Yellow Fever IgM', category: 'serology', specimen: 'Serum', referenceRange: 'Negative' },
    { id: 'lassa_fever', name: 'Lassa Fever IgM', category: 'serology', specimen: 'Serum', referenceRange: 'Negative' },
    
    // Bacterial Serology
    { id: 'vdrl', name: 'VDRL/RPR', category: 'serology', specimen: 'Serum', referenceRange: 'Non-reactive' },
    { id: 'tpha', name: 'TPHA (Treponema pallidum)', category: 'serology', specimen: 'Serum', referenceRange: 'Negative' },
    { id: 'fta_abs', name: 'FTA-ABS (Syphilis Confirmatory)', category: 'serology', specimen: 'Serum', referenceRange: 'Negative' },
    { id: 'widal', name: 'Widal Test (Typhoid)', category: 'serology', specimen: 'Serum', referenceRange: '<1:80' },
    { id: 'typhidot', name: 'Typhidot (Typhoid IgG/IgM)', category: 'serology', specimen: 'Serum', referenceRange: 'Negative' },
    { id: 'brucella', name: 'Brucella Antibodies', category: 'serology', specimen: 'Serum', referenceRange: '<1:80' },
    { id: 'leptospira', name: 'Leptospira IgM', category: 'serology', specimen: 'Serum', referenceRange: 'Negative' },
    { id: 'legionella_urine', name: 'Legionella Urine Antigen', category: 'serology', specimen: 'Urine', referenceRange: 'Negative' },
    { id: 'pneumococcal_urine', name: 'Pneumococcal Urine Antigen', category: 'serology', specimen: 'Urine', referenceRange: 'Negative' },
    { id: 'aso_titre', name: 'ASO Titre', category: 'serology', specimen: 'Serum', unit: 'IU/mL', referenceRange: '<200' },
    { id: 'anti_dnase_b', name: 'Anti-DNase B', category: 'serology', specimen: 'Serum', unit: 'U/mL', referenceRange: '<200' },
    
    // Parasitology Serology
    { id: 'malaria', name: 'Malaria Parasite (RDT/Film)', category: 'serology', specimen: 'EDTA Blood', referenceRange: 'Not Seen' },
    { id: 'schistosoma', name: 'Schistosoma Antibodies', category: 'serology', specimen: 'Serum', referenceRange: 'Negative' },
    { id: 'amoeba', name: 'Amoeba Antibodies', category: 'serology', specimen: 'Serum', referenceRange: 'Negative' },
    { id: 'hydatid', name: 'Hydatid (Echinococcus) Antibodies', category: 'serology', specimen: 'Serum', referenceRange: 'Negative' },
    { id: 'strongyloides', name: 'Strongyloides Antibodies', category: 'serology', specimen: 'Serum', referenceRange: 'Negative' },
    
    // Autoimmune Markers
    { id: 'rf', name: 'Rheumatoid Factor', category: 'serology', specimen: 'Serum', unit: 'IU/mL', referenceRange: '<14' },
    { id: 'anti_ccp', name: 'Anti-CCP (Cyclic Citrullinated Peptide)', category: 'serology', specimen: 'Serum', unit: 'U/mL', referenceRange: '<20' },
    { id: 'ana', name: 'Antinuclear Antibodies (ANA)', category: 'serology', specimen: 'Serum', referenceRange: 'Negative (<1:40)' },
    { id: 'ana_pattern', name: 'ANA Pattern (IF)', category: 'serology', specimen: 'Serum', parameters: ['Titre', 'Pattern'] },
    { id: 'ena_panel', name: 'ENA Panel', category: 'serology', specimen: 'Serum', parameters: ['Anti-Sm', 'Anti-RNP', 'Anti-SSA/Ro', 'Anti-SSB/La', 'Anti-Scl-70', 'Anti-Jo1'] },
    { id: 'anti_dsdna', name: 'Anti-dsDNA', category: 'serology', specimen: 'Serum', unit: 'IU/mL', referenceRange: '<30' },
    { id: 'anti_sm', name: 'Anti-Sm Antibody', category: 'serology', specimen: 'Serum', referenceRange: 'Negative' },
    { id: 'anti_ssa_ro', name: 'Anti-SSA/Ro Antibody', category: 'serology', specimen: 'Serum', referenceRange: 'Negative' },
    { id: 'anti_ssb_la', name: 'Anti-SSB/La Antibody', category: 'serology', specimen: 'Serum', referenceRange: 'Negative' },
    { id: 'anti_centromere', name: 'Anti-Centromere Antibody', category: 'serology', specimen: 'Serum', referenceRange: 'Negative' },
    { id: 'anti_scl70', name: 'Anti-Scl-70 (Topoisomerase I)', category: 'serology', specimen: 'Serum', referenceRange: 'Negative' },
    { id: 'anti_jo1', name: 'Anti-Jo-1 Antibody', category: 'serology', specimen: 'Serum', referenceRange: 'Negative' },
    { id: 'anca', name: 'ANCA (c-ANCA, p-ANCA)', category: 'serology', specimen: 'Serum', parameters: ['c-ANCA (PR3)', 'p-ANCA (MPO)'] },
    { id: 'anti_gliadin', name: 'Anti-Gliadin Antibodies', category: 'serology', specimen: 'Serum', referenceRange: 'Negative' },
    { id: 'anti_ttg', name: 'Anti-TTG (Tissue Transglutaminase)', category: 'serology', specimen: 'Serum', unit: 'U/mL', referenceRange: '<20' },
    { id: 'anti_endomysial', name: 'Anti-Endomysial Antibodies', category: 'serology', specimen: 'Serum', referenceRange: 'Negative' },
    { id: 'anti_tpo', name: 'Anti-TPO (Thyroid Peroxidase)', category: 'serology', specimen: 'Serum', unit: 'IU/mL', referenceRange: '<35' },
    { id: 'anti_thyroglobulin', name: 'Anti-Thyroglobulin Antibodies', category: 'serology', specimen: 'Serum', unit: 'IU/mL', referenceRange: '<115' },
    { id: 'tsh_receptor_ab', name: 'TSH Receptor Antibodies', category: 'serology', specimen: 'Serum', unit: 'IU/L', referenceRange: '<1.75' },
    { id: 'apla', name: 'Antiphospholipid Antibodies', category: 'serology', specimen: 'Serum', parameters: ['Anti-Cardiolipin IgG/IgM', 'Anti-β2GP1 IgG/IgM', 'Lupus Anticoagulant'] },
    { id: 'anti_gbm', name: 'Anti-GBM Antibodies', category: 'serology', specimen: 'Serum', referenceRange: 'Negative' },
    { id: 'complement_c3_c4', name: 'Complement C3 & C4', category: 'serology', specimen: 'Serum', parameters: ['C3', 'C4'] },
    { id: 'ch50', name: 'CH50 (Total Complement)', category: 'serology', specimen: 'Serum', unit: 'U/mL', referenceRange: '41-90' },
    { id: 'immunoglobulins', name: 'Immunoglobulins (IgG, IgA, IgM)', category: 'serology', specimen: 'Serum', parameters: ['IgG', 'IgA', 'IgM'] },
    { id: 'ige_total', name: 'IgE (Total)', category: 'serology', specimen: 'Serum', unit: 'IU/mL', referenceRange: '<100' },
    { id: 'specific_ige', name: 'Specific IgE (Allergen Panel)', category: 'serology', specimen: 'Serum', parameters: ['Food Panel', 'Inhalant Panel'] },
    
    // Tumor Markers
    { id: 'psa', name: 'Prostate Specific Antigen (PSA)', category: 'serology', specimen: 'Serum', unit: 'ng/mL', referenceRange: '<4.0' },
    { id: 'psa_free', name: 'Free PSA', category: 'serology', specimen: 'Serum', unit: 'ng/mL', referenceRange: '>25% of Total' },
    { id: 'cea', name: 'Carcinoembryonic Antigen (CEA)', category: 'serology', specimen: 'Serum', unit: 'ng/mL', referenceRange: '<3.0 (non-smoker), <5.0 (smoker)' },
    { id: 'afp', name: 'Alpha-Fetoprotein (AFP)', category: 'serology', specimen: 'Serum', unit: 'ng/mL', referenceRange: '<10' },
    { id: 'ca125', name: 'CA 125', category: 'serology', specimen: 'Serum', unit: 'U/mL', referenceRange: '<35' },
    { id: 'ca199', name: 'CA 19-9', category: 'serology', specimen: 'Serum', unit: 'U/mL', referenceRange: '<37' },
    { id: 'ca153', name: 'CA 15-3', category: 'serology', specimen: 'Serum', unit: 'U/mL', referenceRange: '<30' },
    { id: 'ca724', name: 'CA 72-4', category: 'serology', specimen: 'Serum', unit: 'U/mL', referenceRange: '<6.9' },
    { id: 'he4', name: 'HE4 (Human Epididymis Protein 4)', category: 'serology', specimen: 'Serum', unit: 'pmol/L', referenceRange: '<70 (premenopausal)' },
    { id: 'bhcg', name: 'Beta-hCG (Quantitative)', category: 'serology', specimen: 'Serum', unit: 'mIU/mL', referenceRange: '<5 (non-pregnant)' },
    { id: 'cyfra21_1', name: 'CYFRA 21-1', category: 'serology', specimen: 'Serum', unit: 'ng/mL', referenceRange: '<3.3' },
    { id: 'scc', name: 'SCC (Squamous Cell Carcinoma Antigen)', category: 'serology', specimen: 'Serum', unit: 'ng/mL', referenceRange: '<1.5' },
    { id: 'nse', name: 'NSE (Neuron Specific Enolase)', category: 'serology', specimen: 'Serum', unit: 'ng/mL', referenceRange: '<16.3' },
    { id: 's100', name: 'S-100 Protein', category: 'serology', specimen: 'Serum', unit: 'µg/L', referenceRange: '<0.15' },
    { id: 'thyroglobulin', name: 'Thyroglobulin', category: 'serology', specimen: 'Serum', unit: 'ng/mL', referenceRange: '<33' },
    { id: 'calcitonin', name: 'Calcitonin', category: 'serology', specimen: 'Serum', unit: 'pg/mL', referenceRange: 'M: <8.4, F: <5.0' },
    { id: 'chromogranin_a', name: 'Chromogranin A', category: 'serology', specimen: 'Serum', unit: 'ng/mL', referenceRange: '<100' },
    
    // Endocrinology (Hormones)
    { id: 'tft', name: 'Thyroid Function Tests', category: 'serology', specimen: 'Serum', parameters: ['TSH', 'Free T4', 'Free T3', 'Total T4'], turnaroundTime: '2 hours' },
    { id: 'tsh', name: 'TSH', category: 'serology', specimen: 'Serum', unit: 'mIU/L', referenceRange: '0.4-4.0' },
    { id: 'free_t4', name: 'Free T4', category: 'serology', specimen: 'Serum', unit: 'pmol/L', referenceRange: '12-22' },
    { id: 'free_t3', name: 'Free T3', category: 'serology', specimen: 'Serum', unit: 'pmol/L', referenceRange: '3.1-6.8' },
    { id: 'total_t4', name: 'Total T4', category: 'serology', specimen: 'Serum', unit: 'nmol/L', referenceRange: '66-181' },
    { id: 'total_t3', name: 'Total T3', category: 'serology', specimen: 'Serum', unit: 'nmol/L', referenceRange: '1.3-3.1' },
    { id: 'cortisol', name: 'Cortisol (AM/PM)', category: 'serology', specimen: 'Serum', unit: 'µg/dL', referenceRange: 'AM: 6-23, PM: <10' },
    { id: 'cortisol_random', name: 'Cortisol (Random)', category: 'serology', specimen: 'Serum', unit: 'µg/dL' },
    { id: 'acth', name: 'ACTH', category: 'serology', specimen: 'EDTA Blood (on ice)', unit: 'pg/mL', referenceRange: 'AM: 7-63' },
    { id: 'synacthen_test', name: 'Short Synacthen Test', category: 'serology', specimen: 'Serum', parameters: ['Baseline Cortisol', '30-min Cortisol', '60-min Cortisol'] },
    { id: 'dexamethasone_suppression', name: 'Dexamethasone Suppression Test', category: 'serology', specimen: 'Serum', parameters: ['Overnight DST', 'Low-dose DST'] },
    { id: '24h_ufc', name: '24-hour Urinary Free Cortisol', category: 'serology', specimen: '24hr Urine', unit: 'µg/24hr', referenceRange: '<100' },
    { id: 'aldosterone', name: 'Aldosterone', category: 'serology', specimen: 'Serum', unit: 'ng/dL', referenceRange: 'Supine: 3-16' },
    { id: 'renin', name: 'Plasma Renin Activity', category: 'serology', specimen: 'EDTA Blood', unit: 'ng/mL/hr', referenceRange: 'Supine: 0.2-1.6' },
    { id: 'aldo_renin_ratio', name: 'Aldosterone/Renin Ratio', category: 'serology', specimen: 'Serum/EDTA Blood', referenceRange: '<30' },
    { id: 'prolactin', name: 'Prolactin', category: 'serology', specimen: 'Serum', unit: 'ng/mL', referenceRange: 'M: 4-15, F: 4-23' },
    { id: 'growth_hormone', name: 'Growth Hormone', category: 'serology', specimen: 'Serum', unit: 'ng/mL', referenceRange: 'M: <3, F: <8' },
    { id: 'igf1', name: 'IGF-1', category: 'serology', specimen: 'Serum', unit: 'ng/mL', referenceRange: 'Age-dependent' },
    { id: 'fsh', name: 'FSH', category: 'serology', specimen: 'Serum', unit: 'mIU/mL', referenceRange: 'Varies by cycle phase' },
    { id: 'lh', name: 'LH', category: 'serology', specimen: 'Serum', unit: 'mIU/mL', referenceRange: 'Varies by cycle phase' },
    { id: 'oestradiol', name: 'Oestradiol (E2)', category: 'serology', specimen: 'Serum', unit: 'pmol/L', referenceRange: 'Varies by cycle phase' },
    { id: 'progesterone', name: 'Progesterone', category: 'serology', specimen: 'Serum', unit: 'nmol/L', referenceRange: 'Luteal: >16' },
    { id: 'testosterone', name: 'Testosterone (Total)', category: 'serology', specimen: 'Serum', unit: 'nmol/L', referenceRange: 'M: 8.6-29, F: 0.3-1.9' },
    { id: 'free_testosterone', name: 'Free Testosterone', category: 'serology', specimen: 'Serum', unit: 'pg/mL', referenceRange: 'M: 9-30' },
    { id: 'shbg', name: 'SHBG', category: 'serology', specimen: 'Serum', unit: 'nmol/L', referenceRange: 'M: 10-57, F: 18-114' },
    { id: 'dheas', name: 'DHEA-S', category: 'serology', specimen: 'Serum', unit: 'µg/dL', referenceRange: 'Age/sex dependent' },
    { id: '17oh_progesterone', name: '17-OH Progesterone', category: 'serology', specimen: 'Serum', unit: 'ng/mL', referenceRange: '<2.0' },
    { id: 'androstenedione', name: 'Androstenedione', category: 'serology', specimen: 'Serum', unit: 'ng/dL', referenceRange: 'M: 75-205, F: 85-275' },
    { id: 'amh', name: 'Anti-Müllerian Hormone (AMH)', category: 'serology', specimen: 'Serum', unit: 'ng/mL', referenceRange: 'Age-dependent' },
    { id: 'inhibin_b', name: 'Inhibin B', category: 'serology', specimen: 'Serum', unit: 'pg/mL', referenceRange: 'M: 25-325' },
    { id: 'metanephrines_plasma', name: 'Plasma Metanephrines', category: 'serology', specimen: 'EDTA Blood', parameters: ['Metanephrine', 'Normetanephrine'] },
    { id: 'metanephrines_urine', name: 'Urinary Metanephrines', category: 'serology', specimen: '24hr Urine', parameters: ['Metanephrine', 'Normetanephrine', 'VMA'] },
    { id: 'catecholamines', name: 'Catecholamines', category: 'serology', specimen: '24hr Urine', parameters: ['Adrenaline', 'Noradrenaline', 'Dopamine'] },
  ],
  urinalysis: [
    { id: 'urinalysis', name: 'Urinalysis (Dipstick)', category: 'urinalysis', specimen: 'Random Urine', parameters: ['pH', 'Specific Gravity', 'Protein', 'Glucose', 'Ketones', 'Blood', 'Bilirubin', 'Urobilinogen', 'Nitrites', 'Leukocytes'] },
    { id: 'urine_microscopy', name: 'Urine Microscopy', category: 'urinalysis', specimen: 'Mid-stream Urine', parameters: ['WBC', 'RBC', 'Casts', 'Crystals', 'Epithelial Cells', 'Bacteria', 'Yeast'] },
    { id: 'urine_feme', name: 'Urine FEME', category: 'urinalysis', specimen: 'Mid-stream Urine', parameters: ['Physical', 'Chemical', 'Microscopy'] },
    { id: 'urine_protein_24h', name: '24-hour Urine Protein', category: 'urinalysis', specimen: '24hr Urine', unit: 'g/24hr', referenceRange: '<0.15' },
    { id: 'urine_albumin', name: 'Urine Albumin', category: 'urinalysis', specimen: 'Urine', unit: 'mg/L', referenceRange: '<20' },
    { id: 'urine_acr', name: 'Urine Albumin/Creatinine Ratio (ACR)', category: 'urinalysis', specimen: 'Spot Urine', unit: 'mg/mmol', referenceRange: '<3.5 (F), <2.5 (M)' },
    { id: 'urine_pcr', name: 'Urine Protein/Creatinine Ratio (PCR)', category: 'urinalysis', specimen: 'Spot Urine', unit: 'mg/mmol', referenceRange: '<15' },
    { id: 'urine_creatinine', name: 'Urine Creatinine', category: 'urinalysis', specimen: 'Urine', unit: 'mmol/L' },
    { id: 'urine_electrolytes', name: 'Urine Electrolytes', category: 'urinalysis', specimen: 'Urine', parameters: ['Sodium', 'Potassium', 'Chloride'] },
    { id: 'urine_sodium', name: 'Urine Sodium', category: 'urinalysis', specimen: 'Urine', unit: 'mmol/L', referenceRange: '40-220 (24hr)' },
    { id: 'urine_potassium', name: 'Urine Potassium', category: 'urinalysis', specimen: 'Urine', unit: 'mmol/L', referenceRange: '25-125 (24hr)' },
    { id: 'urine_osmolality', name: 'Urine Osmolality', category: 'urinalysis', specimen: 'Urine', unit: 'mOsm/kg', referenceRange: '300-900' },
    { id: 'urine_calcium', name: 'Urine Calcium', category: 'urinalysis', specimen: '24hr Urine', unit: 'mmol/24hr', referenceRange: '2.5-7.5' },
    { id: 'urine_oxalate', name: 'Urine Oxalate', category: 'urinalysis', specimen: '24hr Urine', unit: 'mmol/24hr', referenceRange: '<0.46' },
    { id: 'urine_citrate', name: 'Urine Citrate', category: 'urinalysis', specimen: '24hr Urine', unit: 'mmol/24hr', referenceRange: '>1.6' },
    { id: 'urine_uric_acid', name: 'Urine Uric Acid', category: 'urinalysis', specimen: '24hr Urine', unit: 'mmol/24hr', referenceRange: '1.5-4.4' },
    { id: 'urine_phosphate', name: 'Urine Phosphate', category: 'urinalysis', specimen: '24hr Urine', unit: 'mmol/24hr', referenceRange: '13-42' },
    { id: 'stone_analysis', name: 'Kidney Stone Analysis', category: 'urinalysis', specimen: 'Stone', parameters: ['Composition', 'Type'] },
    { id: 'pregnancy_test', name: 'Pregnancy Test (Urine)', category: 'urinalysis', specimen: 'First Morning Urine', referenceRange: 'Negative' },
    { id: 'urine_drug_screen', name: 'Urine Drug Screen', category: 'urinalysis', specimen: 'Urine', parameters: ['Amphetamines', 'Benzodiazepines', 'Cannabis', 'Cocaine', 'Opiates', 'Methadone', 'Barbiturates', 'PCP'] },
    { id: 'urine_bence_jones', name: 'Bence Jones Protein', category: 'urinalysis', specimen: 'Urine', referenceRange: 'Negative' },
    { id: 'urine_porphyrins', name: 'Urine Porphyrins', category: 'urinalysis', specimen: '24hr Urine (protected from light)', unit: 'µmol/24hr' },
    { id: 'urine_5hiaa', name: 'Urine 5-HIAA', category: 'urinalysis', specimen: '24hr Urine', unit: 'µmol/24hr', referenceRange: '10-47' },
    { id: 'urine_cortisol', name: 'Urine Free Cortisol', category: 'urinalysis', specimen: '24hr Urine', unit: 'µg/24hr', referenceRange: '<100' },
  ],
  histopathology: [
    // Biopsies
    { id: 'tissue_biopsy', name: 'Tissue Biopsy (General)', category: 'histopathology', specimen: 'Tissue in Formalin', turnaroundTime: '5-7 days', parameters: ['Macroscopic', 'Microscopic', 'Diagnosis', 'Comments'] },
    { id: 'skin_biopsy', name: 'Skin Biopsy', category: 'histopathology', specimen: 'Skin in Formalin', turnaroundTime: '5-7 days', parameters: ['Epidermis', 'Dermis', 'Subcutis', 'Diagnosis'] },
    { id: 'liver_biopsy', name: 'Liver Biopsy', category: 'histopathology', specimen: 'Liver Tissue', turnaroundTime: '5-7 days', parameters: ['Grade', 'Stage', 'Iron', 'Copper', 'Diagnosis'] },
    { id: 'kidney_biopsy', name: 'Kidney Biopsy', category: 'histopathology', specimen: 'Kidney Tissue', turnaroundTime: '7-10 days', parameters: ['Light Microscopy', 'Immunofluorescence', 'Electron Microscopy', 'Diagnosis'] },
    { id: 'bone_biopsy', name: 'Bone Biopsy', category: 'histopathology', specimen: 'Bone in Formalin', turnaroundTime: '7-10 days' },
    { id: 'bone_marrow_biopsy', name: 'Bone Marrow Biopsy', category: 'histopathology', specimen: 'Bone Marrow Trephine', turnaroundTime: '5-7 days' },
    { id: 'gi_biopsy', name: 'GI Tract Biopsy', category: 'histopathology', specimen: 'Tissue in Formalin', turnaroundTime: '5-7 days', parameters: ['Site', 'Findings', 'H. pylori', 'Diagnosis'] },
    { id: 'prostate_biopsy', name: 'Prostate Biopsy', category: 'histopathology', specimen: 'Prostate Cores', turnaroundTime: '5-7 days', parameters: ['Gleason Score', 'Percentage Involvement', 'Perineural Invasion'] },
    { id: 'breast_biopsy', name: 'Breast Biopsy', category: 'histopathology', specimen: 'Breast Tissue', turnaroundTime: '5-7 days', parameters: ['Type', 'Grade', 'ER/PR/HER2', 'Ki-67'] },
    { id: 'lymph_node_biopsy', name: 'Lymph Node Biopsy', category: 'histopathology', specimen: 'Lymph Node', turnaroundTime: '5-7 days' },
    { id: 'muscle_biopsy', name: 'Muscle Biopsy', category: 'histopathology', specimen: 'Muscle (special handling)', turnaroundTime: '7-14 days' },
    { id: 'nerve_biopsy', name: 'Nerve Biopsy', category: 'histopathology', specimen: 'Nerve (special handling)', turnaroundTime: '14-21 days' },
    { id: 'testis_biopsy', name: 'Testis Biopsy', category: 'histopathology', specimen: 'Testis Tissue', turnaroundTime: '5-7 days' },
    { id: 'endomyocardial_biopsy', name: 'Endomyocardial Biopsy', category: 'histopathology', specimen: 'Cardiac Tissue', turnaroundTime: '5-7 days' },
    
    // Cytology
    { id: 'fnac', name: 'Fine Needle Aspiration Cytology (FNAC)', category: 'histopathology', specimen: 'Aspirate', turnaroundTime: '24-48 hours' },
    { id: 'thyroid_fnac', name: 'Thyroid FNAC', category: 'histopathology', specimen: 'Thyroid Aspirate', turnaroundTime: '24-48 hours', parameters: ['Bethesda Category'] },
    { id: 'breast_fnac', name: 'Breast FNAC', category: 'histopathology', specimen: 'Breast Aspirate', turnaroundTime: '24-48 hours' },
    { id: 'lymph_node_fnac', name: 'Lymph Node FNAC', category: 'histopathology', specimen: 'Lymph Node Aspirate', turnaroundTime: '24-48 hours' },
    { id: 'frozen_section', name: 'Frozen Section', category: 'histopathology', specimen: 'Fresh Tissue', turnaroundTime: '20-30 minutes' },
    { id: 'pap_smear', name: 'Pap Smear (Cervical Cytology)', category: 'histopathology', specimen: 'Cervical Smear', turnaroundTime: '3-5 days', parameters: ['Bethesda Classification'] },
    { id: 'liquid_cytology', name: 'Liquid-Based Cytology', category: 'histopathology', specimen: 'Cervical Sample', turnaroundTime: '3-5 days' },
    { id: 'hpv_test', name: 'HPV DNA Test', category: 'histopathology', specimen: 'Cervical Sample', referenceRange: 'Negative' },
    { id: 'fluid_cytology', name: 'Fluid Cytology', category: 'histopathology', specimen: 'Fluid (Pleural/Ascitic/CSF)', turnaroundTime: '24-48 hours', parameters: ['Cell Count', 'Cell Type', 'Malignancy'] },
    { id: 'sputum_cytology', name: 'Sputum Cytology', category: 'histopathology', specimen: 'Sputum', turnaroundTime: '24-48 hours' },
    { id: 'urine_cytology', name: 'Urine Cytology', category: 'histopathology', specimen: 'Urine', turnaroundTime: '24-48 hours' },
    { id: 'brushing_cytology', name: 'Brushing Cytology', category: 'histopathology', specimen: 'Brushings', turnaroundTime: '24-48 hours' },
    { id: 'bronchial_washings', name: 'Bronchial Washings/Lavage', category: 'histopathology', specimen: 'BAL Fluid', turnaroundTime: '24-48 hours' },
    
    // Special Studies
    { id: 'immunohistochemistry', name: 'Immunohistochemistry', category: 'histopathology', specimen: 'Tissue in Formalin', turnaroundTime: '5-7 days' },
    { id: 'er_pr_her2', name: 'ER/PR/HER2 (Breast)', category: 'histopathology', specimen: 'Breast Tissue', turnaroundTime: '5-7 days', parameters: ['ER', 'PR', 'HER2', 'Ki-67'] },
    { id: 'fish', name: 'FISH (Fluorescence In Situ Hybridization)', category: 'histopathology', specimen: 'Tissue/Blood', turnaroundTime: '5-7 days' },
    { id: 'her2_fish', name: 'HER2 FISH', category: 'histopathology', specimen: 'Breast Tissue', turnaroundTime: '5-7 days' },
    { id: 'pdl1', name: 'PD-L1 Expression', category: 'histopathology', specimen: 'Tissue', turnaroundTime: '5-7 days' },
    { id: 'msi_ihc', name: 'MSI/MMR Immunohistochemistry', category: 'histopathology', specimen: 'Tissue', turnaroundTime: '5-7 days', parameters: ['MLH1', 'MSH2', 'MSH6', 'PMS2'] },
    { id: 'congo_red', name: 'Congo Red (Amyloid)', category: 'histopathology', specimen: 'Tissue', turnaroundTime: '3-5 days' },
    { id: 'special_stains', name: 'Special Stains', category: 'histopathology', specimen: 'Tissue', turnaroundTime: '3-5 days', parameters: ['PAS', 'Iron', 'Reticulin', 'Masson Trichrome', 'ZN'] },
    
    // Post-surgical Specimens
    { id: 'resection_specimen', name: 'Resection Specimen', category: 'histopathology', specimen: 'Surgical Specimen', turnaroundTime: '7-14 days', parameters: ['Margins', 'Staging', 'Lymph Nodes'] },
    { id: 'appendix', name: 'Appendectomy Specimen', category: 'histopathology', specimen: 'Appendix', turnaroundTime: '5-7 days' },
    { id: 'gallbladder', name: 'Cholecystectomy Specimen', category: 'histopathology', specimen: 'Gallbladder', turnaroundTime: '5-7 days' },
    { id: 'products_conception', name: 'Products of Conception', category: 'histopathology', specimen: 'POC', turnaroundTime: '5-7 days' },
    { id: 'placenta', name: 'Placental Examination', category: 'histopathology', specimen: 'Placenta', turnaroundTime: '5-7 days' },
    
    // Autopsy
    { id: 'autopsy_full', name: 'Full Autopsy', category: 'histopathology', specimen: 'Body', turnaroundTime: '4-8 weeks' },
    { id: 'autopsy_limited', name: 'Limited Autopsy', category: 'histopathology', specimen: 'Body', turnaroundTime: '2-4 weeks' },
    { id: 'autopsy_perinatal', name: 'Perinatal Autopsy', category: 'histopathology', specimen: 'Body', turnaroundTime: '4-8 weeks' },
  ],
  imaging: [
    // X-RAY - HEAD & NECK
    { id: 'xray_skull', name: 'X-Ray Skull (AP & Lateral)', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour', parameters: ['Bone Integrity', 'Sinuses', 'Soft Tissue'] },
    { id: 'xray_facial', name: 'X-Ray Facial Bones', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour' },
    { id: 'xray_mandible', name: 'X-Ray Mandible', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour' },
    { id: 'xray_nasal', name: 'X-Ray Nasal Bones', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour' },
    { id: 'xray_sinuses', name: 'X-Ray Paranasal Sinuses (OM View)', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour' },
    { id: 'xray_soft_tissue_neck', name: 'X-Ray Soft Tissue Neck', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour', parameters: ['Airway', 'Prevertebral Soft Tissue'] },
    
    // X-RAY - SPINE
    { id: 'xray_cervical_spine', name: 'X-Ray Cervical Spine (AP, Lateral, Odontoid)', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour', parameters: ['Alignment', 'Vertebral Bodies', 'Disc Spaces', 'Odontoid', 'Prevertebral Space'] },
    { id: 'xray_cervical_flexion_ext', name: 'X-Ray Cervical Spine Flexion/Extension', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour', parameters: ['Stability', 'Subluxation'] },
    { id: 'xray_thoracic_spine', name: 'X-Ray Thoracic Spine (AP & Lateral)', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour', parameters: ['Alignment', 'Vertebral Bodies', 'Disc Spaces'] },
    { id: 'xray_lumbar_spine', name: 'X-Ray Lumbar Spine (AP, Lateral, Oblique)', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour', parameters: ['Alignment', 'Vertebral Bodies', 'Disc Spaces', 'Pars Interarticularis'] },
    { id: 'xray_lumbosacral_spine', name: 'X-Ray Lumbosacral Spine', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour', parameters: ['L5-S1 Junction', 'Sacrum', 'Spondylolisthesis'] },
    { id: 'xray_sacrum_coccyx', name: 'X-Ray Sacrum & Coccyx', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour' },
    { id: 'xray_whole_spine', name: 'X-Ray Whole Spine (Scoliosis Series)', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour', parameters: ['Cobb Angle', 'Curve Pattern'] },
    
    // X-RAY - CHEST & THORAX
    { id: 'xray_chest', name: 'Chest X-Ray (PA)', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour', parameters: ['Heart Size', 'Lung Fields', 'Mediastinum', 'Costophrenic Angles'] },
    { id: 'xray_chest_ap', name: 'Chest X-Ray (AP Erect/Supine)', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour', parameters: ['Findings', 'Lines/Tubes Position'] },
    { id: 'xray_chest_lateral', name: 'Chest X-Ray (Lateral)', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour' },
    { id: 'xray_ribs', name: 'X-Ray Ribs', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour' },
    { id: 'xray_sternum', name: 'X-Ray Sternum', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour' },
    { id: 'xray_clavicle', name: 'X-Ray Clavicle', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour' },
    
    // X-RAY - ABDOMEN & PELVIS
    { id: 'xray_abdomen', name: 'Abdominal X-Ray (Supine)', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour', parameters: ['Gas Pattern', 'Calcifications', 'Soft Tissue'] },
    { id: 'xray_abdomen_erect', name: 'Abdominal X-Ray (Erect)', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour', parameters: ['Air-Fluid Levels', 'Free Air'] },
    { id: 'xray_acute_abdomen', name: 'Acute Abdomen Series (Supine, Erect, CXR)', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour', parameters: ['Obstruction', 'Perforation'] },
    { id: 'xray_pelvis', name: 'X-Ray Pelvis (AP)', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour', parameters: ['Hip Joints', 'SI Joints', 'Pubic Symphysis'] },
    { id: 'xray_hip', name: 'X-Ray Hip (AP & Lateral)', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour' },
    { id: 'xray_kub', name: 'X-Ray KUB (Kidneys, Ureter, Bladder)', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour' },
    
    // X-RAY - UPPER LIMB
    { id: 'xray_shoulder', name: 'X-Ray Shoulder', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour' },
    { id: 'xray_humerus', name: 'X-Ray Humerus', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour' },
    { id: 'xray_elbow', name: 'X-Ray Elbow', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour' },
    { id: 'xray_forearm', name: 'X-Ray Forearm', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour' },
    { id: 'xray_wrist', name: 'X-Ray Wrist', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour' },
    { id: 'xray_hand', name: 'X-Ray Hand', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour' },
    { id: 'xray_finger', name: 'X-Ray Finger(s)', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour' },
    { id: 'xray_thumb', name: 'X-Ray Thumb', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour' },
    
    // X-RAY - LOWER LIMB
    { id: 'xray_femur', name: 'X-Ray Femur', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour' },
    { id: 'xray_knee', name: 'X-Ray Knee', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour' },
    { id: 'xray_tibia_fibula', name: 'X-Ray Tibia/Fibula', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour' },
    { id: 'xray_ankle', name: 'X-Ray Ankle', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour' },
    { id: 'xray_foot', name: 'X-Ray Foot', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour' },
    { id: 'xray_calcaneus', name: 'X-Ray Calcaneus', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour' },
    { id: 'xray_toes', name: 'X-Ray Toe(s)', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour' },
    { id: 'xray_leg_length', name: 'X-Ray Leg Length Study (Scanogram)', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour' },
    
    // DOPPLER ULTRASOUND - ARTERIAL (LIMB SALVAGE)
    { id: 'doppler_arterial_upper', name: 'Arterial Doppler Upper Limb', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour', parameters: ['Subclavian', 'Axillary', 'Brachial', 'Radial', 'Ulnar', 'Waveform', 'PSV'] },
    { id: 'doppler_arterial_lower', name: 'Arterial Doppler Lower Limb', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour', parameters: ['CFA', 'SFA', 'Popliteal', 'ATA', 'PTA', 'Peroneal', 'Dorsalis Pedis', 'ABI', 'TBI', 'Waveform', 'Stenosis'] },
    { id: 'doppler_bilateral_arterial', name: 'Bilateral Arterial Doppler Lower Limbs', category: 'imaging', specimen: 'N/A', turnaroundTime: '1.5 hours', parameters: ['Right ABI', 'Left ABI', 'Right TBI', 'Left TBI', 'Stenosis Location', 'Critical Limb Ischemia'] },
    { id: 'abi_tbi', name: 'ABI/TBI Measurement', category: 'imaging', specimen: 'N/A', turnaroundTime: '30 minutes', parameters: ['Ankle-Brachial Index', 'Toe-Brachial Index'] },
    
    // DOPPLER ULTRASOUND - VENOUS (DVT)
    { id: 'doppler_venous_upper', name: 'Venous Doppler Upper Limb', category: 'imaging', specimen: 'N/A', turnaroundTime: '45 minutes', parameters: ['Subclavian', 'Axillary', 'Brachial', 'Basilic', 'Cephalic', 'Compressibility', 'Flow'] },
    { id: 'doppler_venous_lower', name: 'Venous Doppler Lower Limb (DVT Protocol)', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour', parameters: ['CFV', 'SFV', 'Popliteal', 'Calf Veins', 'Compressibility', 'Thrombus', 'DVT Confirmed'] },
    { id: 'doppler_bilateral_venous', name: 'Bilateral Venous Doppler Lower Limbs', category: 'imaging', specimen: 'N/A', turnaroundTime: '1.5 hours', parameters: ['DVT Present', 'Location', 'Extent'] },
    { id: 'doppler_venous_reflux', name: 'Venous Reflux Study (Varicose Veins)', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour', parameters: ['GSV Reflux', 'SSV Reflux', 'Perforator Incompetence', 'CEAP Classification'] },
    
    // DOPPLER - CAROTID & CEREBROVASCULAR
    { id: 'doppler_carotid', name: 'Carotid Doppler', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour', parameters: ['Right ICA', 'Left ICA', 'PSV', 'EDV', 'Stenosis %', 'Plaque'] },
    { id: 'doppler_vertebral', name: 'Vertebral Artery Doppler', category: 'imaging', specimen: 'N/A', turnaroundTime: '45 minutes' },
    { id: 'tcd', name: 'Transcranial Doppler', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour', parameters: ['MCA', 'ACA', 'PCA', 'Velocities', 'Vasospasm'] },
    
    // DOPPLER - ABDOMINAL VESSELS
    { id: 'doppler_renal', name: 'Renal Artery Doppler', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour', parameters: ['Main Renal Arteries', 'Segmental Arteries', 'RI', 'Stenosis'] },
    { id: 'doppler_portal', name: 'Portal Vein Doppler', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour', parameters: ['Portal Vein', 'Hepatic Veins', 'Hepatic Artery', 'Direction of Flow'] },
    { id: 'doppler_mesenteric', name: 'Mesenteric Artery Doppler', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour', parameters: ['SMA', 'IMA', 'Celiac Trunk'] },
    { id: 'doppler_aorta', name: 'Abdominal Aorta Doppler', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour', parameters: ['Diameter', 'Aneurysm', 'Thrombus'] },
    
    // GENERAL ULTRASOUND
    { id: 'ultrasound_abdomen', name: 'Abdominal Ultrasound', category: 'imaging', specimen: 'N/A', turnaroundTime: '30 minutes', parameters: ['Liver', 'Gallbladder', 'Pancreas', 'Spleen', 'Kidneys', 'Aorta', 'Free Fluid'] },
    { id: 'ultrasound_pelvis', name: 'Pelvic Ultrasound (Transabdominal)', category: 'imaging', specimen: 'N/A', turnaroundTime: '30 minutes', parameters: ['Bladder', 'Uterus', 'Ovaries', 'Prostate'] },
    { id: 'ultrasound_tvs', name: 'Transvaginal Ultrasound', category: 'imaging', specimen: 'N/A', turnaroundTime: '30 minutes', parameters: ['Uterus', 'Ovaries', 'Endometrium', 'Adnexa'] },
    { id: 'ultrasound_obstetric', name: 'Obstetric Ultrasound', category: 'imaging', specimen: 'N/A', turnaroundTime: '30 minutes', parameters: ['Viability', 'Dating', 'Fetal Anatomy', 'Placenta', 'Liquor'] },
    { id: 'ultrasound_anomaly', name: 'Fetal Anomaly Scan (18-22 weeks)', category: 'imaging', specimen: 'N/A', turnaroundTime: '45 minutes' },
    { id: 'ultrasound_growth', name: 'Fetal Growth Scan', category: 'imaging', specimen: 'N/A', turnaroundTime: '30 minutes', parameters: ['BPD', 'HC', 'AC', 'FL', 'EFW', 'AFI', 'Doppler'] },
    { id: 'ultrasound_renal', name: 'Renal Ultrasound', category: 'imaging', specimen: 'N/A', turnaroundTime: '30 minutes', parameters: ['Kidney Size', 'Cortex', 'Hydronephrosis', 'Stones', 'Cysts'] },
    { id: 'ultrasound_thyroid', name: 'Thyroid Ultrasound', category: 'imaging', specimen: 'N/A', turnaroundTime: '30 minutes', parameters: ['Lobes', 'Isthmus', 'Nodules', 'Vascularity', 'Lymph Nodes'] },
    { id: 'ultrasound_breast', name: 'Breast Ultrasound', category: 'imaging', specimen: 'N/A', turnaroundTime: '30 minutes', parameters: ['Lesion', 'BIRADS', 'Lymph Nodes'] },
    { id: 'ultrasound_scrotum', name: 'Scrotal Ultrasound', category: 'imaging', specimen: 'N/A', turnaroundTime: '30 minutes', parameters: ['Testes', 'Epididymis', 'Hydrocele', 'Varicocele', 'Vascularity'] },
    { id: 'ultrasound_soft_tissue', name: 'Soft Tissue Ultrasound', category: 'imaging', specimen: 'N/A', turnaroundTime: '30 minutes', parameters: ['Location', 'Size', 'Nature', 'Vascularity'] },
    { id: 'ultrasound_neck', name: 'Neck Ultrasound', category: 'imaging', specimen: 'N/A', turnaroundTime: '30 minutes', parameters: ['Thyroid', 'Salivary Glands', 'Lymph Nodes', 'Vessels'] },
    { id: 'ultrasound_msk', name: 'Musculoskeletal Ultrasound', category: 'imaging', specimen: 'N/A', turnaroundTime: '30 minutes', parameters: ['Tendons', 'Joints', 'Muscles', 'Ligaments'] },
    { id: 'ultrasound_chest', name: 'Chest Ultrasound (POCUS)', category: 'imaging', specimen: 'N/A', turnaroundTime: '20 minutes', parameters: ['Pleural Effusion', 'Lung Sliding', 'B-lines', 'Consolidation'] },
    { id: 'ultrasound_fast', name: 'FAST Scan (Trauma)', category: 'imaging', specimen: 'N/A', turnaroundTime: '10 minutes', parameters: ['RUQ', 'LUQ', 'Pelvis', 'Pericardium'] },
    { id: 'ultrasound_efast', name: 'eFAST Scan (Extended)', category: 'imaging', specimen: 'N/A', turnaroundTime: '15 minutes', parameters: ['RUQ', 'LUQ', 'Pelvis', 'Pericardium', 'Bilateral Chest'] },
    
    // CT SCANS
    { id: 'ct_head', name: 'CT Head (Non-Contrast)', category: 'imaging', specimen: 'N/A', turnaroundTime: '1-2 hours', parameters: ['Hemorrhage', 'Infarct', 'Mass Effect', 'Midline Shift'] },
    { id: 'ct_head_contrast', name: 'CT Head with Contrast', category: 'imaging', specimen: 'N/A', turnaroundTime: '1-2 hours' },
    { id: 'ct_orbits', name: 'CT Orbits', category: 'imaging', specimen: 'N/A', turnaroundTime: '1-2 hours' },
    { id: 'ct_sinuses', name: 'CT Paranasal Sinuses', category: 'imaging', specimen: 'N/A', turnaroundTime: '1-2 hours' },
    { id: 'ct_temporal', name: 'CT Temporal Bones', category: 'imaging', specimen: 'N/A', turnaroundTime: '1-2 hours' },
    { id: 'ct_neck', name: 'CT Neck', category: 'imaging', specimen: 'N/A', turnaroundTime: '1-2 hours' },
    { id: 'ct_cervical_spine', name: 'CT Cervical Spine', category: 'imaging', specimen: 'N/A', turnaroundTime: '1-2 hours' },
    { id: 'ct_thoracic_spine', name: 'CT Thoracic Spine', category: 'imaging', specimen: 'N/A', turnaroundTime: '1-2 hours' },
    { id: 'ct_lumbar_spine', name: 'CT Lumbar Spine', category: 'imaging', specimen: 'N/A', turnaroundTime: '1-2 hours' },
    { id: 'ct_chest', name: 'CT Chest', category: 'imaging', specimen: 'N/A', turnaroundTime: '1-2 hours', parameters: ['Lung Parenchyma', 'Mediastinum', 'Pleura'] },
    { id: 'ct_chest_pe', name: 'CT Pulmonary Angiogram (CTPA)', category: 'imaging', specimen: 'N/A', turnaroundTime: '1-2 hours', parameters: ['Pulmonary Embolism'] },
    { id: 'ct_hrct', name: 'HRCT Chest (Interstitial Lung Disease)', category: 'imaging', specimen: 'N/A', turnaroundTime: '1-2 hours' },
    { id: 'ct_abdomen', name: 'CT Abdomen', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours' },
    { id: 'ct_abdomen_pelvis', name: 'CT Abdomen & Pelvis', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours', parameters: ['Liver', 'Pancreas', 'Kidneys', 'Bowel', 'Lymph Nodes'] },
    { id: 'ct_pelvis', name: 'CT Pelvis', category: 'imaging', specimen: 'N/A', turnaroundTime: '1-2 hours' },
    { id: 'ct_kub', name: 'CT KUB (Stone Protocol)', category: 'imaging', specimen: 'N/A', turnaroundTime: '1-2 hours' },
    { id: 'ct_urogram', name: 'CT Urogram', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours' },
    { id: 'ct_colonography', name: 'CT Colonography (Virtual Colonoscopy)', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours' },
    { id: 'ct_angio_head', name: 'CT Angiography Head', category: 'imaging', specimen: 'N/A', turnaroundTime: '1-2 hours' },
    { id: 'ct_angio_neck', name: 'CT Angiography Carotids', category: 'imaging', specimen: 'N/A', turnaroundTime: '1-2 hours' },
    { id: 'ct_angio_chest', name: 'CT Aortogram (Thoracic)', category: 'imaging', specimen: 'N/A', turnaroundTime: '1-2 hours' },
    { id: 'ct_angio_abdomen', name: 'CT Aortogram (Abdominal)', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours' },
    { id: 'ct_angio_lower_limb', name: 'CT Angiography Lower Limb', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours', parameters: ['Aorto-Iliac', 'Femoral', 'Popliteal', 'Tibial', 'Runoff'] },
    { id: 'ct_angio_upper_limb', name: 'CT Angiography Upper Limb', category: 'imaging', specimen: 'N/A', turnaroundTime: '1-2 hours' },
    { id: 'ct_cardiac', name: 'CT Coronary Angiogram', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours' },
    { id: 'ct_calcium_score', name: 'CT Calcium Score', category: 'imaging', specimen: 'N/A', turnaroundTime: '1-2 hours' },
    { id: 'ct_triple_rule_out', name: 'CT Triple Rule Out (ACS/PE/Dissection)', category: 'imaging', specimen: 'N/A', turnaroundTime: '1-2 hours' },
    
    // MRI
    { id: 'mri_brain', name: 'MRI Brain', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours', parameters: ['Sequences', 'Lesions', 'Enhancement'] },
    { id: 'mri_brain_contrast', name: 'MRI Brain with Contrast', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours' },
    { id: 'mri_iac', name: 'MRI Internal Auditory Canal', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours' },
    { id: 'mri_orbits', name: 'MRI Orbits', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours' },
    { id: 'mri_pituitary', name: 'MRI Pituitary', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours' },
    { id: 'mri_cervical_spine', name: 'MRI Cervical Spine', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours', parameters: ['Cord', 'Discs', 'Foramina'] },
    { id: 'mri_thoracic_spine', name: 'MRI Thoracic Spine', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours' },
    { id: 'mri_lumbar_spine', name: 'MRI Lumbar Spine', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours', parameters: ['Disc Herniation', 'Stenosis', 'Nerve Roots'] },
    { id: 'mri_whole_spine', name: 'MRI Whole Spine', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours' },
    { id: 'mri_shoulder', name: 'MRI Shoulder', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours', parameters: ['Rotator Cuff', 'Labrum', 'Cartilage'] },
    { id: 'mri_elbow', name: 'MRI Elbow', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours' },
    { id: 'mri_wrist', name: 'MRI Wrist', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours' },
    { id: 'mri_hip', name: 'MRI Hip', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours', parameters: ['Labrum', 'AVN', 'Cartilage'] },
    { id: 'mri_knee', name: 'MRI Knee', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours', parameters: ['Meniscus', 'Ligaments', 'Cartilage'] },
    { id: 'mri_ankle', name: 'MRI Ankle', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours' },
    { id: 'mri_foot', name: 'MRI Foot', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours' },
    { id: 'mri_soft_tissue', name: 'MRI Soft Tissue Mass', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours' },
    { id: 'mri_liver', name: 'MRI Liver', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours' },
    { id: 'mrcp', name: 'MRCP (Biliary)', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours' },
    { id: 'mri_pancreas', name: 'MRI Pancreas', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours' },
    { id: 'mri_abdomen', name: 'MRI Abdomen', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours' },
    { id: 'mri_pelvis', name: 'MRI Pelvis', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours' },
    { id: 'mri_prostate', name: 'MRI Prostate (Multiparametric)', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours', parameters: ['PIRADS Score'] },
    { id: 'mri_rectum', name: 'MRI Rectum (Staging)', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours' },
    { id: 'mri_breast', name: 'MRI Breast', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours' },
    { id: 'mri_cardiac', name: 'Cardiac MRI', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours', parameters: ['Function', 'Viability', 'Scar', 'Inflammation'] },
    { id: 'mra_head', name: 'MR Angiography Head', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours' },
    { id: 'mra_neck', name: 'MR Angiography Neck', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours' },
    { id: 'mrv', name: 'MR Venography', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours' },
    
    // NUCLEAR MEDICINE
    { id: 'bone_scan', name: 'Bone Scan (Technetium)', category: 'imaging', specimen: 'N/A', turnaroundTime: '4-6 hours' },
    { id: 'bone_scan_3phase', name: 'Three-Phase Bone Scan', category: 'imaging', specimen: 'N/A', turnaroundTime: '4-6 hours' },
    { id: 'thyroid_scan', name: 'Thyroid Scan', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours' },
    { id: 'renal_scan', name: 'Renal Scan (DTPA/MAG3)', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours' },
    { id: 'dmsa_scan', name: 'DMSA Scan (Cortical)', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours' },
    { id: 'vq_scan', name: 'V/Q Scan (Ventilation/Perfusion)', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours' },
    { id: 'gi_bleeding', name: 'GI Bleeding Scan', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours' },
    { id: 'hepatobiliary', name: 'Hepatobiliary Scan (HIDA)', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours' },
    { id: 'gastric_emptying', name: 'Gastric Emptying Study', category: 'imaging', specimen: 'N/A', turnaroundTime: '4-6 hours' },
    { id: 'pet_ct', name: 'PET-CT', category: 'imaging', specimen: 'N/A', turnaroundTime: '4-6 hours' },
    { id: 'pet_ct_fdg', name: 'PET-CT FDG (Oncology)', category: 'imaging', specimen: 'N/A', turnaroundTime: '4-6 hours' },
    { id: 'mibg_scan', name: 'MIBG Scan', category: 'imaging', specimen: 'N/A', turnaroundTime: '24-48 hours' },
    { id: 'parathyroid_scan', name: 'Parathyroid Scan (MIBI)', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours' },
    
    // MAMMOGRAPHY
    { id: 'mammogram', name: 'Mammography (Screening)', category: 'imaging', specimen: 'N/A', turnaroundTime: '1-2 hours', parameters: ['BIRADS Category'] },
    { id: 'mammogram_diagnostic', name: 'Mammography (Diagnostic)', category: 'imaging', specimen: 'N/A', turnaroundTime: '1-2 hours' },
    
    // FLUOROSCOPY
    { id: 'barium_swallow', name: 'Barium Swallow', category: 'imaging', specimen: 'N/A', turnaroundTime: '1-2 hours' },
    { id: 'barium_meal', name: 'Barium Meal', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours' },
    { id: 'barium_follow_through', name: 'Small Bowel Follow Through', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours' },
    { id: 'barium_enema', name: 'Barium Enema', category: 'imaging', specimen: 'N/A', turnaroundTime: '1-2 hours' },
    { id: 'ivu', name: 'Intravenous Urogram (IVU)', category: 'imaging', specimen: 'N/A', turnaroundTime: '1-2 hours' },
    { id: 'mcug', name: 'Micturating Cystourethrogram (MCUG)', category: 'imaging', specimen: 'N/A', turnaroundTime: '1-2 hours' },
    { id: 'rgu', name: 'Retrograde Urethrogram', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour' },
    { id: 'hsg', name: 'Hysterosalpingogram', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour' },
    { id: 'sinogram', name: 'Sinogram/Fistulogram', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour' },
    
    // INTERVENTIONAL
    { id: 'angiogram_diagnostic', name: 'Diagnostic Angiography', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours' },
    { id: 'us_guided_biopsy', name: 'Ultrasound-Guided Biopsy', category: 'imaging', specimen: 'N/A', turnaroundTime: '1-2 hours' },
    { id: 'ct_guided_biopsy', name: 'CT-Guided Biopsy', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours' },
    { id: 'us_guided_drainage', name: 'Ultrasound-Guided Drainage', category: 'imaging', specimen: 'N/A', turnaroundTime: '1-2 hours' },
    { id: 'ct_guided_drainage', name: 'CT-Guided Drainage', category: 'imaging', specimen: 'N/A', turnaroundTime: '2-4 hours' },
    { id: 'picc_line', name: 'PICC Line Insertion (Imaging-Guided)', category: 'imaging', specimen: 'N/A', turnaroundTime: '1 hour' },
  ],
  cardiology: [
    // ECG
    { id: 'ecg', name: 'Electrocardiogram (12-Lead ECG)', category: 'cardiology', specimen: 'N/A', turnaroundTime: '15 minutes', parameters: ['Rate', 'Rhythm', 'Axis', 'PR Interval', 'QRS Duration', 'QTc', 'ST Changes', 'Findings'] },
    { id: 'ecg_rhythm', name: 'ECG Rhythm Strip', category: 'cardiology', specimen: 'N/A', turnaroundTime: '10 minutes' },
    
    // Holter & Event Monitoring
    { id: 'holter_24', name: 'Holter Monitor (24 hours)', category: 'cardiology', specimen: 'N/A', turnaroundTime: '48-72 hours', parameters: ['Arrhythmias', 'Heart Rate', 'ST Changes'] },
    { id: 'holter_48', name: 'Holter Monitor (48 hours)', category: 'cardiology', specimen: 'N/A', turnaroundTime: '72-96 hours' },
    { id: 'holter_7day', name: 'Extended Holter (7 days)', category: 'cardiology', specimen: 'N/A', turnaroundTime: '1-2 weeks' },
    { id: 'event_recorder', name: 'Event Recorder', category: 'cardiology', specimen: 'N/A', turnaroundTime: '2-4 weeks' },
    { id: 'implantable_loop', name: 'Implantable Loop Recorder Download', category: 'cardiology', specimen: 'N/A', turnaroundTime: '24-48 hours' },
    
    // Blood Pressure Monitoring
    { id: 'abpm', name: 'Ambulatory Blood Pressure Monitoring (24hr)', category: 'cardiology', specimen: 'N/A', turnaroundTime: '48-72 hours', parameters: ['Daytime Average', 'Nighttime Average', 'Dipping Status'] },
    
    // Echocardiography
    { id: 'echo_tte', name: 'Transthoracic Echocardiogram (TTE)', category: 'cardiology', specimen: 'N/A', turnaroundTime: '1 hour', parameters: ['LVEF', 'LV Dimensions', 'Wall Motion', 'Valves', 'Diastolic Function', 'RV Function', 'Pericardium'] },
    { id: 'echo_tee', name: 'Transesophageal Echocardiogram (TEE)', category: 'cardiology', specimen: 'N/A', turnaroundTime: '1-2 hours', parameters: ['LA/LAA', 'Valves', 'Aorta', 'Interatrial Septum', 'Thrombus', 'Vegetations'] },
    { id: 'echo_stress', name: 'Stress Echocardiogram', category: 'cardiology', specimen: 'N/A', turnaroundTime: '1.5 hours', parameters: ['Rest EF', 'Stress EF', 'Wall Motion', 'Ischemia'] },
    { id: 'echo_dobutamine', name: 'Dobutamine Stress Echo', category: 'cardiology', specimen: 'N/A', turnaroundTime: '1.5 hours', parameters: ['Viability', 'Ischemia'] },
    { id: 'echo_contrast', name: 'Contrast Echocardiogram', category: 'cardiology', specimen: 'N/A', turnaroundTime: '1 hour', parameters: ['LV Opacification', 'Shunt Detection'] },
    { id: 'echo_bubble', name: 'Bubble Study (Shunt Detection)', category: 'cardiology', specimen: 'N/A', turnaroundTime: '45 minutes', parameters: ['PFO', 'ASD'] },
    { id: 'echo_fetal', name: 'Fetal Echocardiogram', category: 'cardiology', specimen: 'N/A', turnaroundTime: '1 hour' },
    { id: 'echo_pediatric', name: 'Pediatric Echocardiogram', category: 'cardiology', specimen: 'N/A', turnaroundTime: '1 hour' },
    
    // Stress Testing
    { id: 'exercise_stress', name: 'Exercise Stress Test (Treadmill)', category: 'cardiology', specimen: 'N/A', turnaroundTime: '1 hour', parameters: ['Exercise Capacity', 'METs', 'Heart Rate Response', 'BP Response', 'ST Changes', 'Arrhythmias', 'Symptoms'] },
    { id: 'pharmacologic_stress', name: 'Pharmacological Stress Test', category: 'cardiology', specimen: 'N/A', turnaroundTime: '1 hour' },
    { id: 'cardiopulmonary_exercise', name: 'Cardiopulmonary Exercise Test (CPET)', category: 'cardiology', specimen: 'N/A', turnaroundTime: '1-2 hours', parameters: ['VO2 max', 'Anaerobic Threshold', 'Ventilatory Efficiency'] },
    { id: '6min_walk', name: '6-Minute Walk Test', category: 'cardiology', specimen: 'N/A', turnaroundTime: '30 minutes', parameters: ['Distance', 'SpO2', 'Heart Rate', 'Dyspnea'] },
    
    // Cardiac Biomarkers
    { id: 'troponin', name: 'Troponin I/T', category: 'cardiology', specimen: 'Serum', unit: 'ng/mL', referenceRange: '<0.04', turnaroundTime: '1 hour' },
    { id: 'troponin_hs', name: 'High-Sensitivity Troponin', category: 'cardiology', specimen: 'Serum', unit: 'ng/L', referenceRange: 'M: <22, F: <14' },
    { id: 'bnp', name: 'BNP', category: 'cardiology', specimen: 'Serum', unit: 'pg/mL', referenceRange: '<100' },
    { id: 'nt_probnp', name: 'NT-proBNP', category: 'cardiology', specimen: 'Serum', unit: 'pg/mL', referenceRange: 'Age-dependent' },
    { id: 'ck_mb', name: 'CK-MB', category: 'cardiology', specimen: 'Serum', unit: 'ng/mL', referenceRange: '<5' },
    { id: 'myoglobin', name: 'Myoglobin (Cardiac)', category: 'cardiology', specimen: 'Serum', unit: 'ng/mL', referenceRange: 'M: <72, F: <58' },
    
    // Electrophysiology
    { id: 'eps', name: 'Electrophysiology Study (EPS)', category: 'cardiology', specimen: 'N/A', turnaroundTime: '2-4 hours' },
    { id: 'tilt_table', name: 'Tilt Table Test', category: 'cardiology', specimen: 'N/A', turnaroundTime: '1-2 hours', parameters: ['Syncope Type', 'Vasovagal Response'] },
    { id: 'signal_averaged_ecg', name: 'Signal-Averaged ECG', category: 'cardiology', specimen: 'N/A', turnaroundTime: '30 minutes' },
    
    // Pacing & Device
    { id: 'pacemaker_check', name: 'Pacemaker Interrogation', category: 'cardiology', specimen: 'N/A', turnaroundTime: '30 minutes', parameters: ['Battery', 'Leads', 'Thresholds', 'Events'] },
    { id: 'icd_check', name: 'ICD Interrogation', category: 'cardiology', specimen: 'N/A', turnaroundTime: '30 minutes', parameters: ['Battery', 'Leads', 'Therapies', 'Events'] },
    { id: 'crt_check', name: 'CRT Device Check', category: 'cardiology', specimen: 'N/A', turnaroundTime: '30 minutes' },
    
    // Pulmonary Function (Cardiology-related)
    { id: 'spirometry', name: 'Spirometry', category: 'cardiology', specimen: 'N/A', turnaroundTime: '30 minutes', parameters: ['FEV1', 'FVC', 'FEV1/FVC', 'Peak Flow'] },
    { id: 'full_pft', name: 'Full Pulmonary Function Tests', category: 'cardiology', specimen: 'N/A', turnaroundTime: '1 hour', parameters: ['Spirometry', 'Lung Volumes', 'DLCO'] },
    { id: 'pulse_oximetry', name: 'Pulse Oximetry (Rest/Exercise)', category: 'cardiology', specimen: 'N/A', turnaroundTime: '15 minutes', parameters: ['SpO2 Rest', 'SpO2 Exercise'] },
    { id: 'sleep_study', name: 'Sleep Study (Polysomnography)', category: 'cardiology', specimen: 'N/A', turnaroundTime: '1-2 weeks', parameters: ['AHI', 'Sleep Architecture', 'Arousals'] },
    { id: 'home_sleep_test', name: 'Home Sleep Apnea Test', category: 'cardiology', specimen: 'N/A', turnaroundTime: '1 week', parameters: ['AHI', 'ODI'] },
  ],
  pathology: [
    // General Pathology
    { id: 'histology', name: 'Histology (General)', category: 'pathology', specimen: 'Tissue in Formalin', turnaroundTime: '5-7 days' },
    { id: 'cytology', name: 'Cytology (General)', category: 'pathology', specimen: 'Fluid/Smear', turnaroundTime: '24-48 hours' },
    
    // Autopsy
    { id: 'autopsy', name: 'Full Autopsy', category: 'pathology', specimen: 'Body', turnaroundTime: '4-8 weeks' },
    { id: 'autopsy_limited', name: 'Limited Autopsy', category: 'pathology', specimen: 'Body', turnaroundTime: '2-4 weeks' },
    { id: 'autopsy_perinatal', name: 'Perinatal Autopsy', category: 'pathology', specimen: 'Body', turnaroundTime: '4-8 weeks' },
    { id: 'autopsy_forensic', name: 'Forensic Autopsy', category: 'pathology', specimen: 'Body', turnaroundTime: '4-8 weeks' },
    
    // Molecular Pathology
    { id: 'molecular_panel', name: 'Molecular Panel (NGS)', category: 'pathology', specimen: 'Tissue/Blood', turnaroundTime: '2-4 weeks' },
    { id: 'pcr_panel', name: 'PCR Panel', category: 'pathology', specimen: 'Various', turnaroundTime: '1-3 days' },
    { id: 'karyotype', name: 'Karyotype Analysis', category: 'pathology', specimen: 'Blood/Bone Marrow', turnaroundTime: '2-3 weeks' },
    { id: 'fish', name: 'FISH Analysis', category: 'pathology', specimen: 'Tissue/Blood', turnaroundTime: '5-7 days' },
    { id: 'mutation_analysis', name: 'Gene Mutation Analysis', category: 'pathology', specimen: 'Tissue/Blood', turnaroundTime: '2-4 weeks' },
    { id: 'microsatellite', name: 'Microsatellite Instability (MSI)', category: 'pathology', specimen: 'Tissue', turnaroundTime: '5-7 days' },
    { id: 'brca', name: 'BRCA 1/2 Testing', category: 'pathology', specimen: 'Blood', turnaroundTime: '2-4 weeks' },
    { id: 'egfr', name: 'EGFR Mutation', category: 'pathology', specimen: 'Tissue', turnaroundTime: '1-2 weeks' },
    { id: 'alk', name: 'ALK Rearrangement', category: 'pathology', specimen: 'Tissue', turnaroundTime: '1-2 weeks' },
    { id: 'ros1', name: 'ROS1 Rearrangement', category: 'pathology', specimen: 'Tissue', turnaroundTime: '1-2 weeks' },
    { id: 'braf', name: 'BRAF Mutation', category: 'pathology', specimen: 'Tissue', turnaroundTime: '1-2 weeks' },
    { id: 'kras', name: 'KRAS/NRAS Mutation', category: 'pathology', specimen: 'Tissue', turnaroundTime: '1-2 weeks' },
    { id: 'her2_gene', name: 'HER2 Gene Amplification', category: 'pathology', specimen: 'Tissue', turnaroundTime: '5-7 days' },
    { id: 'pdl1_expression', name: 'PD-L1 Expression', category: 'pathology', specimen: 'Tissue', turnaroundTime: '5-7 days' },
    { id: 'tmb', name: 'Tumor Mutational Burden (TMB)', category: 'pathology', specimen: 'Tissue', turnaroundTime: '2-4 weeks' },
    
    // Forensic/Toxicology
    { id: 'post_mortem_tox', name: 'Post-Mortem Toxicology', category: 'pathology', specimen: 'Various', turnaroundTime: '2-4 weeks' },
    { id: 'dna_profiling', name: 'DNA Profiling (Forensic)', category: 'pathology', specimen: 'Various', turnaroundTime: '2-4 weeks' },
    { id: 'paternity_test', name: 'Paternity Testing', category: 'pathology', specimen: 'Blood/Buccal Swab', turnaroundTime: '1-2 weeks' },
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
