// Nigerian Burns, Plastic & Reconstructive Surgery Fee Structure
// All amounts in Nigerian Naira (₦)
// Surgeon's professional fee only - excludes anaesthesia, theatre, consumables, implants, admission, nursing, drugs, investigations

export type ProcedureComplexity = 'level1' | 'level2' | 'level3' | 'level4';

export interface SurgicalProcedure {
  id: string;
  name: string;
  category: string;
  complexity: ProcedureComplexity;
  complexityLabel: string;
  icdCode?: string;
  minFee: number;
  maxFee: number;
  defaultFee: number;
  description?: string;
  notes?: string;
}

export interface ProcedureCategory {
  id: string;
  name: string;
  complexity: ProcedureComplexity;
  complexityLabel: string;
  feeRange: string;
  procedures: SurgicalProcedure[];
}

// Complexity level descriptions
export const complexityLevels = {
  level1: {
    label: 'Minor',
    description: 'Local anaesthesia / short duration / outpatient or day case',
    feeRange: '₦50,000 – ₦200,000',
    color: 'bg-green-100 text-green-800 border-green-200',
  },
  level2: {
    label: 'Intermediate',
    description: 'Regional / spinal / GA; short admission or day case',
    feeRange: '₦250,000 – ₦800,000',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  level3: {
    label: 'Major',
    description: 'General anaesthesia / inpatient / significant reconstruction',
    feeRange: '₦1,000,000 – ₦3,500,000',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  level4: {
    label: 'Super Major',
    description: 'Microsurgery / prolonged surgery / high expertise',
    feeRange: '₦4,000,000 – ₦10,000,000+',
    color: 'bg-red-100 text-red-800 border-red-200',
  },
};

// Complete surgical procedures database
export const surgicalProcedures: SurgicalProcedure[] = [
  // LEVEL 1 – MINOR PROCEDURES
  {
    id: 'minor-001',
    name: 'Skin Biopsy',
    category: 'minor',
    complexity: 'level1',
    complexityLabel: 'Minor',
    icdCode: '0HB0XZX',
    minFee: 50000,
    maxFee: 80000,
    defaultFee: 65000,
    description: 'Diagnostic skin biopsy for histopathological examination',
  },
  {
    id: 'minor-002',
    name: 'Excision of Small Skin Lesion',
    category: 'minor',
    complexity: 'level1',
    complexityLabel: 'Minor',
    icdCode: '0HB0XZZ',
    minFee: 70000,
    maxFee: 120000,
    defaultFee: 95000,
    description: 'Excision of small benign skin lesion',
  },
  {
    id: 'minor-003',
    name: 'Lipoma Excision (Small/Moderate)',
    category: 'minor',
    complexity: 'level1',
    complexityLabel: 'Minor',
    icdCode: '0JB00ZZ',
    minFee: 80000,
    maxFee: 150000,
    defaultFee: 115000,
    description: 'Surgical removal of lipoma',
  },
  {
    id: 'minor-004',
    name: 'Sebaceous Cyst Excision',
    category: 'minor',
    complexity: 'level1',
    complexityLabel: 'Minor',
    icdCode: '0HB0XZZ',
    minFee: 70000,
    maxFee: 120000,
    defaultFee: 95000,
    description: 'Excision of sebaceous cyst',
  },
  {
    id: 'minor-005',
    name: 'Ingrown Toenail Surgery',
    category: 'minor',
    complexity: 'level1',
    complexityLabel: 'Minor',
    icdCode: '0HBR0ZZ',
    minFee: 80000,
    maxFee: 150000,
    defaultFee: 115000,
    description: 'Surgical correction of ingrown toenail',
  },
  {
    id: 'minor-006',
    name: 'Incision & Drainage (Abscess)',
    category: 'minor',
    complexity: 'level1',
    complexityLabel: 'Minor',
    icdCode: '0H90XZZ',
    minFee: 60000,
    maxFee: 120000,
    defaultFee: 90000,
    description: 'Incision and drainage of abscess',
  },
  {
    id: 'minor-007',
    name: 'Keloid Steroid Injection',
    category: 'minor',
    complexity: 'level1',
    complexityLabel: 'Minor',
    icdCode: '3E0H3GC',
    minFee: 50000,
    maxFee: 80000,
    defaultFee: 65000,
    description: 'Intralesional steroid injection for keloid',
  },
  {
    id: 'minor-008',
    name: 'Minor Scar Revision',
    category: 'minor',
    complexity: 'level1',
    complexityLabel: 'Minor',
    icdCode: '0HB0XZZ',
    minFee: 100000,
    maxFee: 200000,
    defaultFee: 150000,
    description: 'Minor scar revision surgery',
  },

  // LEVEL 2 – INTERMEDIATE PROCEDURES
  {
    id: 'intermediate-001',
    name: 'Split-Thickness Skin Graft (Small–Moderate)',
    category: 'intermediate',
    complexity: 'level2',
    complexityLabel: 'Intermediate',
    icdCode: '0HR0X73',
    minFee: 250000,
    maxFee: 400000,
    defaultFee: 325000,
    description: 'Split-thickness skin graft for wound coverage',
  },
  {
    id: 'intermediate-002',
    name: 'Debridement of Chronic Wound',
    category: 'intermediate',
    complexity: 'level2',
    complexityLabel: 'Intermediate',
    icdCode: '0HB0XZZ',
    minFee: 200000,
    maxFee: 400000,
    defaultFee: 300000,
    description: 'Surgical debridement of chronic wound',
  },
  {
    id: 'intermediate-003',
    name: 'Diabetic Foot Debridement',
    category: 'intermediate',
    complexity: 'level2',
    complexityLabel: 'Intermediate',
    icdCode: '0YBN0ZZ',
    minFee: 300000,
    maxFee: 600000,
    defaultFee: 450000,
    description: 'Debridement of diabetic foot ulcer/infection',
  },
  {
    id: 'intermediate-004',
    name: 'Pressure Sore Excision (Small)',
    category: 'intermediate',
    complexity: 'level2',
    complexityLabel: 'Intermediate',
    icdCode: '0HB0XZZ',
    minFee: 300000,
    maxFee: 600000,
    defaultFee: 450000,
    description: 'Excision of small pressure ulcer',
  },
  {
    id: 'intermediate-005',
    name: 'Contracture Release (Single Joint)',
    category: 'intermediate',
    complexity: 'level2',
    complexityLabel: 'Intermediate',
    icdCode: '0LN00ZZ',
    minFee: 300000,
    maxFee: 700000,
    defaultFee: 500000,
    description: 'Release of single joint contracture',
  },
  {
    id: 'intermediate-006',
    name: 'Carpal Tunnel Release',
    category: 'intermediate',
    complexity: 'level2',
    complexityLabel: 'Intermediate',
    icdCode: '01N50ZZ',
    minFee: 300000,
    maxFee: 500000,
    defaultFee: 400000,
    description: 'Carpal tunnel decompression surgery',
  },
  {
    id: 'intermediate-007',
    name: 'Trigger Finger Release',
    category: 'intermediate',
    complexity: 'level2',
    complexityLabel: 'Intermediate',
    icdCode: '0LN00ZZ',
    minFee: 250000,
    maxFee: 400000,
    defaultFee: 325000,
    description: 'Release of trigger finger',
  },
  {
    id: 'intermediate-008',
    name: 'Gynecomastia (Unilateral/Simple)',
    category: 'intermediate',
    complexity: 'level2',
    complexityLabel: 'Intermediate',
    icdCode: '0HBT0ZZ',
    minFee: 500000,
    maxFee: 800000,
    defaultFee: 650000,
    description: 'Surgical correction of unilateral gynecomastia',
  },
  {
    id: 'intermediate-009',
    name: 'Syndactyly Release (Simple)',
    category: 'intermediate',
    complexity: 'level2',
    complexityLabel: 'Intermediate',
    icdCode: '0XB60ZZ',
    minFee: 400000,
    maxFee: 700000,
    defaultFee: 550000,
    description: 'Surgical separation of simple syndactyly',
  },

  // LEVEL 3 – MAJOR / COMPLEX PROCEDURES
  {
    id: 'major-001',
    name: 'Extensive Skin Grafting',
    category: 'major',
    complexity: 'level3',
    complexityLabel: 'Major',
    icdCode: '0HR0X74',
    minFee: 800000,
    maxFee: 1500000,
    defaultFee: 1150000,
    description: 'Extensive split or full thickness skin grafting',
  },
  {
    id: 'major-002',
    name: 'Burn Contracture Release (Multiple Joints)',
    category: 'major',
    complexity: 'level3',
    complexityLabel: 'Major',
    icdCode: '0LN00ZZ',
    minFee: 1200000,
    maxFee: 2500000,
    defaultFee: 1850000,
    description: 'Release of multiple joint burn contractures',
  },
  {
    id: 'major-003',
    name: 'Pressure Sore Excision + Flap',
    category: 'major',
    complexity: 'level3',
    complexityLabel: 'Major',
    icdCode: '0HRX0J4',
    minFee: 1200000,
    maxFee: 2500000,
    defaultFee: 1850000,
    description: 'Pressure sore excision with flap reconstruction',
  },
  {
    id: 'major-004',
    name: 'Local/Regional Flap Reconstruction',
    category: 'major',
    complexity: 'level3',
    complexityLabel: 'Major',
    icdCode: '0HRX074',
    minFee: 1200000,
    maxFee: 2500000,
    defaultFee: 1850000,
    description: 'Local or regional flap reconstruction',
  },
  {
    id: 'major-005',
    name: 'Diabetic Foot Limb Salvage Surgery',
    category: 'major',
    complexity: 'level3',
    complexityLabel: 'Major',
    icdCode: '0YBN0ZZ',
    minFee: 1500000,
    maxFee: 3000000,
    defaultFee: 2250000,
    description: 'Complex limb salvage surgery for diabetic foot',
  },
  {
    id: 'major-006',
    name: 'Cleft Lip Repair',
    category: 'major',
    complexity: 'level3',
    complexityLabel: 'Major',
    icdCode: '0CQ00ZZ',
    minFee: 800000,
    maxFee: 1500000,
    defaultFee: 1150000,
    description: 'Surgical repair of cleft lip',
  },
  {
    id: 'major-007',
    name: 'Cleft Palate Repair',
    category: 'major',
    complexity: 'level3',
    complexityLabel: 'Major',
    icdCode: '0CQS0ZZ',
    minFee: 1200000,
    maxFee: 2500000,
    defaultFee: 1850000,
    description: 'Surgical repair of cleft palate',
  },
  {
    id: 'major-008',
    name: 'Breast Reduction',
    category: 'major',
    complexity: 'level3',
    complexityLabel: 'Major',
    icdCode: '0HBT0ZZ',
    minFee: 1500000,
    maxFee: 3000000,
    defaultFee: 2250000,
    description: 'Reduction mammoplasty',
  },
  {
    id: 'major-009',
    name: 'Abdominoplasty',
    category: 'major',
    complexity: 'level3',
    complexityLabel: 'Major',
    icdCode: '0W0F0ZZ',
    minFee: 2000000,
    maxFee: 3500000,
    defaultFee: 2750000,
    description: 'Abdominoplasty / Tummy tuck',
  },
  {
    id: 'major-010',
    name: "Fournier's Gangrene Reconstruction",
    category: 'major',
    complexity: 'level3',
    complexityLabel: 'Major',
    icdCode: '0WBM0ZZ',
    minFee: 1500000,
    maxFee: 3000000,
    defaultFee: 2250000,
    description: "Reconstruction following Fournier's gangrene debridement",
  },
  {
    id: 'major-011',
    name: 'Post-Tumour Soft Tissue Reconstruction',
    category: 'major',
    complexity: 'level3',
    complexityLabel: 'Major',
    icdCode: '0JBD0ZZ',
    minFee: 1200000,
    maxFee: 3000000,
    defaultFee: 2100000,
    description: 'Soft tissue reconstruction after tumour excision',
  },

  // LEVEL 4 – ADVANCED / HIGHLY SPECIALIZED PROCEDURES
  {
    id: 'advanced-001',
    name: 'Free Flap Reconstruction (ALT, RFF)',
    category: 'advanced',
    complexity: 'level4',
    complexityLabel: 'Super Major',
    icdCode: '0JX00Z5',
    minFee: 4000000,
    maxFee: 7000000,
    defaultFee: 5500000,
    description: 'Microsurgical free flap reconstruction',
  },
  {
    id: 'advanced-002',
    name: 'Complex Head & Neck Reconstruction',
    category: 'advanced',
    complexity: 'level4',
    complexityLabel: 'Super Major',
    icdCode: '0WR00J4',
    minFee: 4000000,
    maxFee: 8000000,
    defaultFee: 6000000,
    description: 'Complex reconstruction of head and neck defects',
  },
  {
    id: 'advanced-003',
    name: 'Breast Reconstruction (Autologous Flap)',
    category: 'advanced',
    complexity: 'level4',
    complexityLabel: 'Super Major',
    icdCode: '0HRV074',
    minFee: 4000000,
    maxFee: 8000000,
    defaultFee: 6000000,
    description: 'Autologous breast reconstruction using free flap',
  },
  {
    id: 'advanced-004',
    name: 'Microsurgical Limb Salvage',
    category: 'advanced',
    complexity: 'level4',
    complexityLabel: 'Super Major',
    icdCode: '0YX00Z0',
    minFee: 5000000,
    maxFee: 10000000,
    defaultFee: 7500000,
    description: 'Complex microsurgical limb salvage procedure',
  },
  {
    id: 'advanced-005',
    name: 'Replantation Surgery',
    category: 'advanced',
    complexity: 'level4',
    complexityLabel: 'Super Major',
    icdCode: '0XM00ZZ',
    minFee: 5000000,
    maxFee: 10000000,
    defaultFee: 7500000,
    description: 'Microsurgical replantation of amputated part',
  },
  {
    id: 'advanced-006',
    name: 'Complex Craniofacial Reconstruction',
    category: 'advanced',
    complexity: 'level4',
    complexityLabel: 'Super Major',
    icdCode: '0NW00JZ',
    minFee: 6000000,
    maxFee: 12000000,
    defaultFee: 9000000,
    description: 'Major craniofacial reconstruction surgery',
  },

  // BURNS SURGERY (ACUTE PHASE)
  {
    id: 'burns-001',
    name: 'Escharotomy',
    category: 'burns',
    complexity: 'level2',
    complexityLabel: 'Intermediate',
    icdCode: '0H9NXZZ',
    minFee: 300000,
    maxFee: 600000,
    defaultFee: 450000,
    description: 'Emergency escharotomy for circumferential burns',
  },
  {
    id: 'burns-002',
    name: 'Fasciotomy',
    category: 'burns',
    complexity: 'level2',
    complexityLabel: 'Intermediate',
    icdCode: '0J9N0ZZ',
    minFee: 400000,
    maxFee: 800000,
    defaultFee: 600000,
    description: 'Fasciotomy for compartment syndrome',
  },
  {
    id: 'burns-003',
    name: 'Burn Wound Excision & Grafting',
    category: 'burns',
    complexity: 'level3',
    complexityLabel: 'Major',
    icdCode: '0HR0X74',
    minFee: 1000000,
    maxFee: 3000000,
    defaultFee: 2000000,
    description: 'Burn wound excision with skin grafting',
  },
  {
    id: 'burns-004',
    name: 'Serial Burn Surgeries (Per Session)',
    category: 'burns',
    complexity: 'level3',
    complexityLabel: 'Major',
    icdCode: '0HR0X74',
    minFee: 800000,
    maxFee: 2000000,
    defaultFee: 1400000,
    description: 'Staged burn surgery session',
  },

  // AESTHETIC / COSMETIC PROCEDURES
  {
    id: 'aesthetic-001',
    name: 'Rhinoplasty',
    category: 'aesthetic',
    complexity: 'level3',
    complexityLabel: 'Major',
    icdCode: '09SK0ZZ',
    minFee: 2000000,
    maxFee: 5000000,
    defaultFee: 3500000,
    description: 'Cosmetic rhinoplasty / Nose job',
  },
  {
    id: 'aesthetic-002',
    name: 'Liposuction',
    category: 'aesthetic',
    complexity: 'level3',
    complexityLabel: 'Major',
    icdCode: '0JD90ZZ',
    minFee: 1500000,
    maxFee: 4000000,
    defaultFee: 2750000,
    description: 'Liposuction / Fat removal surgery',
  },
  {
    id: 'aesthetic-003',
    name: 'Facelift',
    category: 'aesthetic',
    complexity: 'level4',
    complexityLabel: 'Super Major',
    icdCode: '0W020ZZ',
    minFee: 3000000,
    maxFee: 6000000,
    defaultFee: 4500000,
    description: 'Rhytidectomy / Facelift surgery',
  },
  {
    id: 'aesthetic-004',
    name: 'Blepharoplasty',
    category: 'aesthetic',
    complexity: 'level3',
    complexityLabel: 'Major',
    icdCode: '08B0XZZ',
    minFee: 1200000,
    maxFee: 2500000,
    defaultFee: 1850000,
    description: 'Eyelid surgery',
  },
  {
    id: 'aesthetic-005',
    name: 'Fat Grafting',
    category: 'aesthetic',
    complexity: 'level3',
    complexityLabel: 'Major',
    icdCode: '0JR007Z',
    minFee: 1000000,
    maxFee: 2500000,
    defaultFee: 1750000,
    description: 'Autologous fat transfer',
  },
  {
    id: 'aesthetic-006',
    name: 'BBL (Brazilian Butt Lift)',
    category: 'aesthetic',
    complexity: 'level4',
    complexityLabel: 'Super Major',
    icdCode: '0JR907Z',
    minFee: 3000000,
    maxFee: 6000000,
    defaultFee: 4500000,
    description: 'Brazilian butt lift with fat grafting',
  },
];

// Procedure categories for dropdown organization
export const procedureCategories = [
  { id: 'minor', name: 'Minor Procedures (Level 1)', complexity: 'level1' as ProcedureComplexity },
  { id: 'intermediate', name: 'Intermediate Procedures (Level 2)', complexity: 'level2' as ProcedureComplexity },
  { id: 'major', name: 'Major Procedures (Level 3)', complexity: 'level3' as ProcedureComplexity },
  { id: 'advanced', name: 'Advanced/Super Major (Level 4)', complexity: 'level4' as ProcedureComplexity },
  { id: 'burns', name: 'Burns Surgery', complexity: 'level2' as ProcedureComplexity },
  { id: 'aesthetic', name: 'Aesthetic/Cosmetic', complexity: 'level3' as ProcedureComplexity },
];

// Helper function to get procedure by ID
export const getProcedureById = (id: string): SurgicalProcedure | undefined => {
  return surgicalProcedures.find(p => p.id === id);
};

// Helper function to get procedures by category
export const getProceduresByCategory = (category: string): SurgicalProcedure[] => {
  return surgicalProcedures.filter(p => p.category === category);
};

// Helper function to search procedures by name
export const searchProcedures = (query: string): SurgicalProcedure[] => {
  const lowercaseQuery = query.toLowerCase();
  return surgicalProcedures.filter(
    p => p.name.toLowerCase().includes(lowercaseQuery) ||
         (p.icdCode && p.icdCode.toLowerCase().includes(lowercaseQuery))
  );
};

// Helper function to format currency in Naira
export const formatNaira = (amount: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Fee calculation helper
export interface SurgicalFeeEstimate {
  surgeonFee: number;
  anaesthesiaFee: number;
  theatreConsumables: number;
  postOpMedications: number;
  histologyFee: number;
  totalEstimate: number;
  disclaimer: string;
}

export const calculateSurgicalFeeEstimate = (
  procedure: SurgicalProcedure,
  options: {
    customSurgeonFee?: number;
    includeAnaesthesia?: boolean;
    includeHistology?: boolean;
    anaesthesiaType?: 'local' | 'regional' | 'general';
  } = {}
): SurgicalFeeEstimate => {
  const surgeonFee = options.customSurgeonFee || procedure.defaultFee;
  
  // Anaesthesia fee based on type and procedure complexity
  let anaesthesiaFee = 0;
  if (options.includeAnaesthesia !== false) {
    switch (options.anaesthesiaType) {
      case 'local':
        anaesthesiaFee = 50000;
        break;
      case 'regional':
        anaesthesiaFee = procedure.complexity === 'level1' ? 100000 : 150000;
        break;
      case 'general':
      default:
        if (procedure.complexity === 'level1') anaesthesiaFee = 150000;
        else if (procedure.complexity === 'level2') anaesthesiaFee = 250000;
        else if (procedure.complexity === 'level3') anaesthesiaFee = 400000;
        else anaesthesiaFee = 600000;
    }
  }
  
  // Theatre consumables based on complexity
  let theatreConsumables = 0;
  if (procedure.complexity === 'level1') theatreConsumables = 50000;
  else if (procedure.complexity === 'level2') theatreConsumables = 100000;
  else if (procedure.complexity === 'level3') theatreConsumables = 200000;
  else theatreConsumables = 400000;
  
  // Post-op medications estimate
  let postOpMedications = 0;
  if (procedure.complexity === 'level1') postOpMedications = 30000;
  else if (procedure.complexity === 'level2') postOpMedications = 50000;
  else if (procedure.complexity === 'level3') postOpMedications = 100000;
  else postOpMedications = 150000;
  
  // Histology fee if applicable
  const histologyFee = options.includeHistology ? 25000 : 0;
  
  const totalEstimate = surgeonFee + anaesthesiaFee + theatreConsumables + postOpMedications + histologyFee;
  
  return {
    surgeonFee,
    anaesthesiaFee,
    theatreConsumables,
    postOpMedications,
    histologyFee,
    totalEstimate,
    disclaimer: 'This estimate does not include fees for hospital admissions, ward charges, ICU care, nursing services, additional investigations, blood products, or unexpected complications. Final charges may vary based on intraoperative findings and postoperative course.',
  };
};
