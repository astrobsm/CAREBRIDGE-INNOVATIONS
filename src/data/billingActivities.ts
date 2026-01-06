// Comprehensive Nigerian Healthcare Billing Activities & Services
// All fees in Nigerian Naira (₦)
// This covers all billable activities for healthcare staff

export type BillingCategory = 
  | 'doctor_consultation'
  | 'surgeon_review'
  | 'plastic_surgeon_review'
  | 'wound_care'
  | 'nursing_service'
  | 'laboratory'
  | 'pharmacy'
  | 'physiotherapy'
  | 'dietetics'
  | 'anaesthesia'
  | 'procedure'
  | 'ward_round'
  | 'home_care'
  | 'administrative';

export type StaffRevenueShare = 0.50; // 50% to staff, 50% to hospital

export interface BillableActivity {
  id: string;
  code: string;
  name: string;
  category: BillingCategory;
  description: string;
  minFee: number;
  maxFee: number;
  defaultFee: number;
  duration?: string;
  applicableRoles: string[]; // Which roles can bill for this activity
  notes?: string;
}

export interface ActivityBillingRecord {
  id: string;
  activityId: string;
  activityCode: string;
  activityName: string;
  category: BillingCategory;
  patientId: string;
  patientName: string;
  hospitalNumber: string;
  encounterId?: string;
  admissionId?: string;
  
  // Staff who performed the activity
  performedBy: string;
  performedByName: string;
  performedByRole: string;
  
  // Billing details
  fee: number;
  staffShare: number; // 50% of fee
  hospitalShare: number; // 50% of fee
  
  // Payment status
  paymentStatus: 'pending' | 'partial' | 'paid' | 'waived';
  amountPaid: number;
  staffAmountPaid: number; // 50% of amount paid
  hospitalAmountPaid: number; // 50% of amount paid
  
  // Timestamps
  performedAt: Date;
  billedAt: Date;
  paidAt?: Date;
  
  notes?: string;
  hospitalId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Staff Revenue Share Configuration
export const REVENUE_SHARE_CONFIG = {
  staffPercentage: 0.50, // 50% to staff
  hospitalPercentage: 0.50, // 50% to hospital
  description: 'Revenue is split 50-50 between the performing staff and the hospital',
};

// ============================================
// BILLABLE ACTIVITIES DATABASE
// ============================================

export const billableActivities: BillableActivity[] = [
  // ============================================
  // 1. DOCTOR CONSULTATION & REVIEWS
  // ============================================
  {
    id: 'DOC-001',
    code: 'CONS-INIT',
    name: 'Initial Doctor Consultation',
    category: 'doctor_consultation',
    description: 'First-time consultation with a doctor',
    minFee: 15000,
    maxFee: 30000,
    defaultFee: 20000,
    duration: '20-30 minutes',
    applicableRoles: ['surgeon', 'anaesthetist'],
    notes: 'Includes history taking, examination, and initial plan',
  },
  {
    id: 'DOC-002',
    code: 'CONS-FU',
    name: 'Follow-up Consultation',
    category: 'doctor_consultation',
    description: 'Subsequent consultation for ongoing care',
    minFee: 10000,
    maxFee: 20000,
    defaultFee: 15000,
    duration: '10-20 minutes',
    applicableRoles: ['surgeon', 'anaesthetist'],
  },
  {
    id: 'DOC-003',
    code: 'CONS-EMERG',
    name: 'Emergency Consultation',
    category: 'doctor_consultation',
    description: 'Urgent/emergency consultation',
    minFee: 25000,
    maxFee: 50000,
    defaultFee: 35000,
    duration: '30-60 minutes',
    applicableRoles: ['surgeon', 'anaesthetist'],
  },
  {
    id: 'DOC-004',
    code: 'WR-DAILY',
    name: 'Daily Ward Round',
    category: 'ward_round',
    description: 'Daily bedside review of admitted patient',
    minFee: 10000,
    maxFee: 20000,
    defaultFee: 15000,
    duration: '10-15 minutes per patient',
    applicableRoles: ['surgeon', 'anaesthetist'],
  },
  {
    id: 'DOC-005',
    code: 'WR-SPECIALIST',
    name: 'Specialist Ward Round',
    category: 'ward_round',
    description: 'Specialist consultant ward round',
    minFee: 20000,
    maxFee: 40000,
    defaultFee: 25000,
    duration: '15-30 minutes per patient',
    applicableRoles: ['surgeon'],
  },

  // ============================================
  // 2. SURGEON REVIEWS (Non-Plastic)
  // ============================================
  {
    id: 'SURG-001',
    code: 'SURG-INIT',
    name: 'Initial Surgeon Review',
    category: 'surgeon_review',
    description: 'First-time surgical specialist review',
    minFee: 30000,
    maxFee: 60000,
    defaultFee: 40000,
    duration: '30-45 minutes',
    applicableRoles: ['surgeon'],
  },
  {
    id: 'SURG-002',
    code: 'SURG-FU',
    name: 'Surgeon Follow-up Review',
    category: 'surgeon_review',
    description: 'Follow-up surgical review',
    minFee: 20000,
    maxFee: 40000,
    defaultFee: 25000,
    duration: '15-30 minutes',
    applicableRoles: ['surgeon'],
  },
  {
    id: 'SURG-003',
    code: 'SURG-PREOP',
    name: 'Pre-operative Surgeon Review',
    category: 'surgeon_review',
    description: 'Pre-surgery assessment and planning',
    minFee: 40000,
    maxFee: 80000,
    defaultFee: 50000,
    duration: '30-45 minutes',
    applicableRoles: ['surgeon'],
  },
  {
    id: 'SURG-004',
    code: 'SURG-POSTOP',
    name: 'Post-operative Surgeon Review',
    category: 'surgeon_review',
    description: 'Post-surgery follow-up and assessment',
    minFee: 30000,
    maxFee: 60000,
    defaultFee: 40000,
    duration: '20-30 minutes',
    applicableRoles: ['surgeon'],
  },

  // ============================================
  // 3. PLASTIC SURGEON REVIEWS
  // ============================================
  {
    id: 'PLAS-001',
    code: 'PLAS-INIT',
    name: 'Initial Plastic Surgeon Consultation',
    category: 'plastic_surgeon_review',
    description: 'First-time plastic surgery specialist consultation',
    minFee: 40000,
    maxFee: 80000,
    defaultFee: 50000,
    duration: '30-45 minutes',
    applicableRoles: ['surgeon'],
    notes: 'For burns, reconstructive, and aesthetic consultations',
  },
  {
    id: 'PLAS-002',
    code: 'PLAS-FU',
    name: 'Plastic Surgeon Follow-up',
    category: 'plastic_surgeon_review',
    description: 'Follow-up plastic surgery review',
    minFee: 25000,
    maxFee: 50000,
    defaultFee: 35000,
    duration: '15-30 minutes',
    applicableRoles: ['surgeon'],
  },
  {
    id: 'PLAS-003',
    code: 'PLAS-COMPLEX',
    name: 'Complex Reconstructive Review',
    category: 'plastic_surgeon_review',
    description: 'Review of complex reconstructive cases',
    minFee: 60000,
    maxFee: 120000,
    defaultFee: 80000,
    duration: '45-60 minutes',
    applicableRoles: ['surgeon'],
  },
  {
    id: 'PLAS-004',
    code: 'PLAS-MDT',
    name: 'Multidisciplinary Plastic Surgery Review',
    category: 'plastic_surgeon_review',
    description: 'Joint review with multiple specialists',
    minFee: 80000,
    maxFee: 150000,
    defaultFee: 100000,
    duration: '60-90 minutes',
    applicableRoles: ['surgeon'],
  },

  // ============================================
  // 4. WOUND CARE REVIEWS
  // ============================================
  {
    id: 'WC-001',
    code: 'WC-ASSESS',
    name: 'Wound Assessment',
    category: 'wound_care',
    description: 'Initial wound assessment and documentation',
    minFee: 15000,
    maxFee: 30000,
    defaultFee: 20000,
    duration: '15-20 minutes',
    applicableRoles: ['surgeon', 'nurse'],
  },
  {
    id: 'WC-002',
    code: 'WC-SIMPLE',
    name: 'Simple Wound Dressing',
    category: 'wound_care',
    description: 'Simple wound dressing change',
    minFee: 10000,
    maxFee: 25000,
    defaultFee: 15000,
    duration: '15-20 minutes',
    applicableRoles: ['surgeon', 'nurse'],
  },
  {
    id: 'WC-003',
    code: 'WC-COMPLEX',
    name: 'Complex Wound Dressing',
    category: 'wound_care',
    description: 'Complex wound dressing with multiple layers',
    minFee: 25000,
    maxFee: 60000,
    defaultFee: 40000,
    duration: '30-45 minutes',
    applicableRoles: ['surgeon', 'nurse'],
  },
  {
    id: 'WC-004',
    code: 'WC-DEBRIDE',
    name: 'Bedside Debridement',
    category: 'wound_care',
    description: 'Bedside wound debridement',
    minFee: 50000,
    maxFee: 100000,
    defaultFee: 70000,
    duration: '30-60 minutes',
    applicableRoles: ['surgeon'],
  },
  {
    id: 'WC-005',
    code: 'WC-NPWT-APPLY',
    name: 'NPWT Application',
    category: 'wound_care',
    description: 'Application of Negative Pressure Wound Therapy',
    minFee: 80000,
    maxFee: 150000,
    defaultFee: 100000,
    duration: '45-60 minutes',
    applicableRoles: ['surgeon'],
  },
  {
    id: 'WC-006',
    code: 'WC-NPWT-CHANGE',
    name: 'NPWT Dressing Change',
    category: 'wound_care',
    description: 'Change of NPWT dressing',
    minFee: 50000,
    maxFee: 80000,
    defaultFee: 60000,
    duration: '30-45 minutes',
    applicableRoles: ['surgeon', 'nurse'],
  },
  {
    id: 'WC-007',
    code: 'WC-BURN-SMALL',
    name: 'Small Burn Dressing',
    category: 'wound_care',
    description: 'Burn wound dressing < 10% TBSA',
    minFee: 30000,
    maxFee: 60000,
    defaultFee: 40000,
    duration: '30-45 minutes',
    applicableRoles: ['surgeon', 'nurse'],
  },
  {
    id: 'WC-008',
    code: 'WC-BURN-LARGE',
    name: 'Large Burn Dressing',
    category: 'wound_care',
    description: 'Burn wound dressing > 10% TBSA',
    minFee: 80000,
    maxFee: 150000,
    defaultFee: 100000,
    duration: '60-90 minutes',
    applicableRoles: ['surgeon', 'nurse'],
  },

  // ============================================
  // 5. NURSING SERVICES
  // ============================================
  {
    id: 'NRS-001',
    code: 'NRS-ADMIT',
    name: 'Admission Nursing Care',
    category: 'nursing_service',
    description: 'Nursing care for patient admission',
    minFee: 10000,
    maxFee: 20000,
    defaultFee: 15000,
    duration: '30-60 minutes',
    applicableRoles: ['nurse'],
  },
  {
    id: 'NRS-002',
    code: 'NRS-DAILY',
    name: 'Daily Nursing Care',
    category: 'nursing_service',
    description: 'Daily nursing care per patient',
    minFee: 8000,
    maxFee: 15000,
    defaultFee: 10000,
    duration: 'Per day',
    applicableRoles: ['nurse'],
  },
  {
    id: 'NRS-003',
    code: 'NRS-VITAL',
    name: 'Vital Signs Monitoring',
    category: 'nursing_service',
    description: 'Vital signs recording and monitoring',
    minFee: 2000,
    maxFee: 5000,
    defaultFee: 3000,
    duration: '10-15 minutes',
    applicableRoles: ['nurse'],
  },
  {
    id: 'NRS-004',
    code: 'NRS-MED-ADMIN',
    name: 'Medication Administration',
    category: 'nursing_service',
    description: 'Administration of prescribed medications',
    minFee: 3000,
    maxFee: 8000,
    defaultFee: 5000,
    duration: '10-20 minutes',
    applicableRoles: ['nurse'],
  },
  {
    id: 'NRS-005',
    code: 'NRS-IV-START',
    name: 'IV Cannulation',
    category: 'nursing_service',
    description: 'Intravenous line insertion',
    minFee: 5000,
    maxFee: 10000,
    defaultFee: 7000,
    duration: '15-20 minutes',
    applicableRoles: ['nurse'],
  },
  {
    id: 'NRS-006',
    code: 'NRS-CATHETER',
    name: 'Urinary Catheterization',
    category: 'nursing_service',
    description: 'Insertion of urinary catheter',
    minFee: 8000,
    maxFee: 15000,
    defaultFee: 10000,
    duration: '20-30 minutes',
    applicableRoles: ['nurse'],
  },
  {
    id: 'NRS-007',
    code: 'NRS-NGT',
    name: 'NG Tube Insertion',
    category: 'nursing_service',
    description: 'Nasogastric tube insertion',
    minFee: 8000,
    maxFee: 15000,
    defaultFee: 10000,
    duration: '15-20 minutes',
    applicableRoles: ['nurse'],
  },
  {
    id: 'NRS-008',
    code: 'NRS-TRANSFUSION',
    name: 'Blood Transfusion Monitoring',
    category: 'nursing_service',
    description: 'Monitoring of blood transfusion',
    minFee: 15000,
    maxFee: 30000,
    defaultFee: 20000,
    duration: '2-4 hours',
    applicableRoles: ['nurse'],
  },
  {
    id: 'NRS-009',
    code: 'NRS-SPECIAL',
    name: 'Special Nursing Care',
    category: 'nursing_service',
    description: 'Specialized nursing care (ICU/burns)',
    minFee: 20000,
    maxFee: 50000,
    defaultFee: 30000,
    duration: 'Per 12-hour shift',
    applicableRoles: ['nurse'],
  },
  {
    id: 'NRS-010',
    code: 'NRS-DISCHARGE',
    name: 'Discharge Nursing',
    category: 'nursing_service',
    description: 'Discharge planning and education',
    minFee: 8000,
    maxFee: 15000,
    defaultFee: 10000,
    duration: '30-60 minutes',
    applicableRoles: ['nurse'],
  },

  // ============================================
  // 6. LABORATORY SERVICES
  // ============================================
  {
    id: 'LAB-001',
    code: 'LAB-COLLECT',
    name: 'Sample Collection',
    category: 'laboratory',
    description: 'Blood/specimen collection',
    minFee: 2000,
    maxFee: 5000,
    defaultFee: 3000,
    duration: '10-15 minutes',
    applicableRoles: ['lab_scientist', 'nurse'],
  },
  {
    id: 'LAB-002',
    code: 'LAB-FBC',
    name: 'Full Blood Count',
    category: 'laboratory',
    description: 'Complete blood count with differential',
    minFee: 5000,
    maxFee: 10000,
    defaultFee: 7000,
    duration: '1-2 hours',
    applicableRoles: ['lab_scientist'],
  },
  {
    id: 'LAB-003',
    code: 'LAB-EUC',
    name: 'Electrolytes, Urea & Creatinine',
    category: 'laboratory',
    description: 'Kidney function panel',
    minFee: 8000,
    maxFee: 15000,
    defaultFee: 10000,
    duration: '2-4 hours',
    applicableRoles: ['lab_scientist'],
  },
  {
    id: 'LAB-004',
    code: 'LAB-LFT',
    name: 'Liver Function Tests',
    category: 'laboratory',
    description: 'Hepatic function panel',
    minFee: 10000,
    maxFee: 20000,
    defaultFee: 15000,
    duration: '2-4 hours',
    applicableRoles: ['lab_scientist'],
  },
  {
    id: 'LAB-005',
    code: 'LAB-COAG',
    name: 'Coagulation Profile',
    category: 'laboratory',
    description: 'PT, PTT, INR',
    minFee: 10000,
    maxFee: 20000,
    defaultFee: 15000,
    duration: '2-4 hours',
    applicableRoles: ['lab_scientist'],
  },
  {
    id: 'LAB-006',
    code: 'LAB-XMATCH',
    name: 'Blood Grouping & Crossmatch',
    category: 'laboratory',
    description: 'Blood group and crossmatch',
    minFee: 8000,
    maxFee: 15000,
    defaultFee: 10000,
    duration: '1-2 hours',
    applicableRoles: ['lab_scientist'],
  },
  {
    id: 'LAB-007',
    code: 'LAB-CULTURE',
    name: 'Wound Culture & Sensitivity',
    category: 'laboratory',
    description: 'Microbiological culture and sensitivity',
    minFee: 15000,
    maxFee: 30000,
    defaultFee: 20000,
    duration: '48-72 hours',
    applicableRoles: ['lab_scientist'],
  },
  {
    id: 'LAB-008',
    code: 'LAB-HISTO',
    name: 'Histopathology',
    category: 'laboratory',
    description: 'Tissue histopathological examination',
    minFee: 25000,
    maxFee: 50000,
    defaultFee: 35000,
    duration: '5-7 days',
    applicableRoles: ['lab_scientist'],
  },

  // ============================================
  // 7. PHARMACY SERVICES
  // ============================================
  {
    id: 'PHARM-001',
    code: 'PHARM-DISPENSE',
    name: 'Medication Dispensing',
    category: 'pharmacy',
    description: 'Prescription dispensing service',
    minFee: 1000,
    maxFee: 3000,
    defaultFee: 2000,
    duration: '10-15 minutes',
    applicableRoles: ['pharmacist'],
  },
  {
    id: 'PHARM-002',
    code: 'PHARM-COUNSEL',
    name: 'Patient Medication Counseling',
    category: 'pharmacy',
    description: 'Patient education on medications',
    minFee: 3000,
    maxFee: 8000,
    defaultFee: 5000,
    duration: '15-30 minutes',
    applicableRoles: ['pharmacist'],
  },
  {
    id: 'PHARM-003',
    code: 'PHARM-COMPOUND',
    name: 'Medication Compounding',
    category: 'pharmacy',
    description: 'Custom medication preparation',
    minFee: 5000,
    maxFee: 15000,
    defaultFee: 8000,
    duration: '30-60 minutes',
    applicableRoles: ['pharmacist'],
  },

  // ============================================
  // 8. PHYSIOTHERAPY SERVICES
  // ============================================
  {
    id: 'PHYSIO-001',
    code: 'PHYSIO-ASSESS',
    name: 'Physiotherapy Assessment',
    category: 'physiotherapy',
    description: 'Initial physiotherapy evaluation',
    minFee: 15000,
    maxFee: 30000,
    defaultFee: 20000,
    duration: '45-60 minutes',
    applicableRoles: ['physiotherapist'],
  },
  {
    id: 'PHYSIO-002',
    code: 'PHYSIO-SESSION',
    name: 'Physiotherapy Session',
    category: 'physiotherapy',
    description: 'Regular physiotherapy treatment session',
    minFee: 10000,
    maxFee: 25000,
    defaultFee: 15000,
    duration: '30-45 minutes',
    applicableRoles: ['physiotherapist'],
  },
  {
    id: 'PHYSIO-003',
    code: 'PHYSIO-SCAR',
    name: 'Scar Management',
    category: 'physiotherapy',
    description: 'Scar massage and management',
    minFee: 15000,
    maxFee: 30000,
    defaultFee: 20000,
    duration: '30-45 minutes',
    applicableRoles: ['physiotherapist'],
  },
  {
    id: 'PHYSIO-004',
    code: 'PHYSIO-BURN',
    name: 'Burns Rehabilitation',
    category: 'physiotherapy',
    description: 'Specialized burns rehabilitation',
    minFee: 20000,
    maxFee: 40000,
    defaultFee: 30000,
    duration: '45-60 minutes',
    applicableRoles: ['physiotherapist'],
  },

  // ============================================
  // 9. DIETETICS SERVICES
  // ============================================
  {
    id: 'DIET-001',
    code: 'DIET-ASSESS',
    name: 'Nutritional Assessment',
    category: 'dietetics',
    description: 'Initial nutrition evaluation (MUST/STAMP)',
    minFee: 10000,
    maxFee: 25000,
    defaultFee: 15000,
    duration: '30-45 minutes',
    applicableRoles: ['dietician'],
  },
  {
    id: 'DIET-002',
    code: 'DIET-PLAN',
    name: 'Meal Plan Development',
    category: 'dietetics',
    description: 'Customized meal planning',
    minFee: 15000,
    maxFee: 30000,
    defaultFee: 20000,
    duration: '45-60 minutes',
    applicableRoles: ['dietician'],
  },
  {
    id: 'DIET-003',
    code: 'DIET-FOLLOWUP',
    name: 'Nutrition Follow-up',
    category: 'dietetics',
    description: 'Follow-up nutrition consultation',
    minFee: 8000,
    maxFee: 15000,
    defaultFee: 10000,
    duration: '20-30 minutes',
    applicableRoles: ['dietician'],
  },
  {
    id: 'DIET-004',
    code: 'DIET-BURN',
    name: 'Burns Nutrition Management',
    category: 'dietetics',
    description: 'Specialized nutrition for burns patients',
    minFee: 20000,
    maxFee: 40000,
    defaultFee: 25000,
    duration: '45-60 minutes',
    applicableRoles: ['dietician'],
  },

  // ============================================
  // 10. ANAESTHESIA SERVICES
  // ============================================
  {
    id: 'ANES-001',
    code: 'ANES-PREOP',
    name: 'Pre-anaesthetic Assessment',
    category: 'anaesthesia',
    description: 'Pre-operative anaesthesia evaluation',
    minFee: 30000,
    maxFee: 60000,
    defaultFee: 40000,
    duration: '30-45 minutes',
    applicableRoles: ['anaesthetist'],
  },
  {
    id: 'ANES-002',
    code: 'ANES-LOCAL',
    name: 'Local Anaesthesia',
    category: 'anaesthesia',
    description: 'Administration of local anaesthesia',
    minFee: 20000,
    maxFee: 50000,
    defaultFee: 30000,
    duration: '30-60 minutes',
    applicableRoles: ['anaesthetist'],
  },
  {
    id: 'ANES-003',
    code: 'ANES-SEDATION',
    name: 'Procedural Sedation',
    category: 'anaesthesia',
    description: 'Conscious sedation for procedures',
    minFee: 50000,
    maxFee: 100000,
    defaultFee: 70000,
    duration: '1-2 hours',
    applicableRoles: ['anaesthetist'],
  },
  {
    id: 'ANES-004',
    code: 'ANES-GENERAL',
    name: 'General Anaesthesia',
    category: 'anaesthesia',
    description: 'Full general anaesthesia',
    minFee: 100000,
    maxFee: 250000,
    defaultFee: 150000,
    duration: '2-6 hours',
    applicableRoles: ['anaesthetist'],
  },
  {
    id: 'ANES-005',
    code: 'ANES-ICU',
    name: 'ICU Anaesthesia Cover',
    category: 'anaesthesia',
    description: 'Daily ICU anaesthesia coverage',
    minFee: 50000,
    maxFee: 100000,
    defaultFee: 70000,
    duration: 'Per day',
    applicableRoles: ['anaesthetist'],
  },

  // ============================================
  // 11. HOME CARE SERVICES
  // ============================================
  {
    id: 'HC-001',
    code: 'HC-VISIT',
    name: 'Home Care Visit',
    category: 'home_care',
    description: 'Home care visit and assessment',
    minFee: 15000,
    maxFee: 30000,
    defaultFee: 20000,
    duration: '1-2 hours',
    applicableRoles: ['home_care_giver', 'nurse'],
  },
  {
    id: 'HC-002',
    code: 'HC-DRESSING',
    name: 'Home Wound Dressing',
    category: 'home_care',
    description: 'Wound dressing at patient home',
    minFee: 20000,
    maxFee: 40000,
    defaultFee: 25000,
    duration: '30-60 minutes',
    applicableRoles: ['home_care_giver', 'nurse'],
  },
  {
    id: 'HC-003',
    code: 'HC-DAILY',
    name: 'Daily Home Care',
    category: 'home_care',
    description: 'Full day home care service',
    minFee: 25000,
    maxFee: 50000,
    defaultFee: 35000,
    duration: 'Per day',
    applicableRoles: ['home_care_giver'],
  },

  // ============================================
  // 12. MINOR PROCEDURES (Bedside)
  // ============================================
  {
    id: 'PROC-001',
    code: 'PROC-SUTURE',
    name: 'Suturing/Laceration Repair',
    category: 'procedure',
    description: 'Bedside wound suturing',
    minFee: 30000,
    maxFee: 80000,
    defaultFee: 50000,
    duration: '30-60 minutes',
    applicableRoles: ['surgeon'],
  },
  {
    id: 'PROC-002',
    code: 'PROC-IND',
    name: 'Incision & Drainage',
    category: 'procedure',
    description: 'Incision and drainage of abscess',
    minFee: 50000,
    maxFee: 100000,
    defaultFee: 70000,
    duration: '30-60 minutes',
    applicableRoles: ['surgeon'],
  },
  {
    id: 'PROC-003',
    code: 'PROC-BIOPSY',
    name: 'Bedside Biopsy',
    category: 'procedure',
    description: 'Bedside tissue biopsy',
    minFee: 40000,
    maxFee: 80000,
    defaultFee: 60000,
    duration: '20-30 minutes',
    applicableRoles: ['surgeon'],
  },
  {
    id: 'PROC-004',
    code: 'PROC-REMOVE-SUTURE',
    name: 'Suture Removal',
    category: 'procedure',
    description: 'Removal of surgical sutures',
    minFee: 5000,
    maxFee: 15000,
    defaultFee: 10000,
    duration: '15-20 minutes',
    applicableRoles: ['surgeon', 'nurse'],
  },
];

// Category display names
export const categoryLabels: Record<BillingCategory, string> = {
  doctor_consultation: 'Doctor Consultation',
  surgeon_review: 'Surgeon Review',
  plastic_surgeon_review: 'Plastic Surgeon Review',
  wound_care: 'Wound Care',
  nursing_service: 'Nursing Services',
  laboratory: 'Laboratory',
  pharmacy: 'Pharmacy',
  physiotherapy: 'Physiotherapy',
  dietetics: 'Dietetics',
  anaesthesia: 'Anaesthesia',
  procedure: 'Procedures',
  ward_round: 'Ward Rounds',
  home_care: 'Home Care',
  administrative: 'Administrative',
};

// Helper functions
export const getActivitiesByCategory = (category: BillingCategory): BillableActivity[] => {
  return billableActivities.filter(a => a.category === category);
};

export const getActivitiesByRole = (role: string): BillableActivity[] => {
  return billableActivities.filter(a => a.applicableRoles.includes(role));
};

export const getActivityById = (id: string): BillableActivity | undefined => {
  return billableActivities.find(a => a.id === id);
};

export const calculateStaffShare = (amount: number): number => {
  return amount * REVENUE_SHARE_CONFIG.staffPercentage;
};

export const calculateHospitalShare = (amount: number): number => {
  return amount * REVENUE_SHARE_CONFIG.hospitalPercentage;
};
