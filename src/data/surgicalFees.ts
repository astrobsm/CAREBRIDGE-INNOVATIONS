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

  // ADDITIONAL PROCEDURES - KELOID & SOFT TISSUE
  {
    id: 'soft-001',
    name: 'Keloid Excision (Small)',
    category: 'minor',
    complexity: 'level1',
    complexityLabel: 'Minor',
    icdCode: '0HB0XZZ',
    minFee: 100000,
    maxFee: 200000,
    defaultFee: 150000,
    description: 'Surgical excision of small keloid lesion',
    notes: 'May require adjuvant therapy (steroid injection, radiation)',
  },
  {
    id: 'soft-002',
    name: 'Keloid Excision (Medium)',
    category: 'intermediate',
    complexity: 'level2',
    complexityLabel: 'Intermediate',
    icdCode: '0HB0XZZ',
    minFee: 250000,
    maxFee: 500000,
    defaultFee: 375000,
    description: 'Surgical excision of medium-sized keloid',
    notes: 'May require flap coverage or skin grafting',
  },
  {
    id: 'soft-003',
    name: 'Keloid Excision (Large/Complex)',
    category: 'major',
    complexity: 'level3',
    complexityLabel: 'Major',
    icdCode: '0HB0XZZ',
    minFee: 600000,
    maxFee: 1200000,
    defaultFee: 900000,
    description: 'Surgical excision of large or multiple keloids with reconstruction',
    notes: 'Requires flap coverage or extensive grafting',
  },
  {
    id: 'soft-004',
    name: 'Lipoma Excision (Large/Deep)',
    category: 'intermediate',
    complexity: 'level2',
    complexityLabel: 'Intermediate',
    icdCode: '0JB00ZZ',
    minFee: 200000,
    maxFee: 400000,
    defaultFee: 300000,
    description: 'Surgical removal of large or deep-seated lipoma',
  },
  {
    id: 'soft-005',
    name: 'Ganglion Cyst Excision',
    category: 'minor',
    complexity: 'level1',
    complexityLabel: 'Minor',
    icdCode: '0JB80ZZ',
    minFee: 80000,
    maxFee: 150000,
    defaultFee: 115000,
    description: 'Surgical excision of ganglion cyst',
    notes: 'Usually wrist or hand, local anaesthesia',
  },
  {
    id: 'soft-006',
    name: 'Incisional Biopsy',
    category: 'minor',
    complexity: 'level1',
    complexityLabel: 'Minor',
    icdCode: '0HB0XZX',
    minFee: 50000,
    maxFee: 100000,
    defaultFee: 75000,
    description: 'Incisional biopsy for histopathological diagnosis',
    notes: 'Sampling of lesion for pathology',
  },
  {
    id: 'soft-007',
    name: 'Tumor Excision with Skin Grafting',
    category: 'major',
    complexity: 'level3',
    complexityLabel: 'Major',
    icdCode: '0HBT0ZZ',
    minFee: 800000,
    maxFee: 1800000,
    defaultFee: 1300000,
    description: 'Wide excision of tumor with immediate skin graft coverage',
    notes: 'Includes split or full thickness skin graft',
  },

  // DIABETIC FOOT & LIMB SALVAGE
  {
    id: 'diabetic-001',
    name: 'Ray Amputation (Single)',
    category: 'intermediate',
    complexity: 'level2',
    complexityLabel: 'Intermediate',
    icdCode: '0Y6M0Z0',
    minFee: 300000,
    maxFee: 600000,
    defaultFee: 450000,
    description: 'Amputation of single toe with metatarsal (ray)',
    notes: 'Diabetic foot, vascular disease, osteomyelitis',
  },
  {
    id: 'diabetic-002',
    name: 'Ray Amputation (Multiple)',
    category: 'major',
    complexity: 'level3',
    complexityLabel: 'Major',
    icdCode: '0Y6M0Z0',
    minFee: 500000,
    maxFee: 1000000,
    defaultFee: 750000,
    description: 'Amputation of multiple toes with metatarsals',
    notes: 'Complex diabetic foot reconstruction',
  },
  {
    id: 'diabetic-003',
    name: 'Below Knee Amputation (BKA)',
    category: 'major',
    complexity: 'level3',
    complexityLabel: 'Major',
    icdCode: '0Y6H0Z1',
    minFee: 1500000,
    maxFee: 3000000,
    defaultFee: 2000000,
    description: 'Transtibial amputation below the knee joint preserving the knee for prosthetic rehabilitation',
    notes: 'Peripheral vascular disease, diabetic gangrene, severe trauma, osteomyelitis, malignancy. Requires vascular assessment, DVT prophylaxis, prosthetic referral, and rehabilitation planning.',
  },
  {
    id: 'diabetic-004',
    name: 'Below Knee Amputation (BKA) – Revision/Re-amputation',
    category: 'major',
    complexity: 'level3',
    complexityLabel: 'Major',
    icdCode: '0Y6H0ZZ',
    minFee: 1800000,
    maxFee: 3500000,
    defaultFee: 2500000,
    description: 'Revision of previous below knee amputation stump for wound breakdown, infection, or prosthetic fitting issues',
    notes: 'Failed primary BKA healing, stump neuroma, bone spur, poorly shaped stump. May require myodesis/myoplasty.',
  },

  // HAND & NERVE SURGERY
  {
    id: 'hand-001',
    name: 'Tendon Repair (Primary)',
    category: 'intermediate',
    complexity: 'level2',
    complexityLabel: 'Intermediate',
    icdCode: '0LQ50ZZ',
    minFee: 350000,
    maxFee: 700000,
    defaultFee: 525000,
    description: 'Primary repair of severed or ruptured tendon',
    notes: 'Flexor or extensor tendon, hand or foot',
  },
  {
    id: 'hand-002',
    name: 'Tendon Repair (Secondary/Reconstruction)',
    category: 'major',
    complexity: 'level3',
    complexityLabel: 'Major',
    icdCode: '0LQ50ZZ',
    minFee: 700000,
    maxFee: 1500000,
    defaultFee: 1100000,
    description: 'Secondary tendon repair or tendon graft reconstruction',
    notes: 'May require tendon graft, staged procedure',
  },
  {
    id: 'hand-003',
    name: 'Nerve Repair (Primary)',
    category: 'major',
    complexity: 'level3',
    complexityLabel: 'Major',
    icdCode: '01Q00ZZ',
    minFee: 600000,
    maxFee: 1200000,
    defaultFee: 900000,
    description: 'Primary repair of severed peripheral nerve',
    notes: 'Requires microsurgical technique',
  },
  {
    id: 'hand-004',
    name: 'Nerve Repair (Graft/Reconstruction)',
    category: 'advanced',
    complexity: 'level4',
    complexityLabel: 'Super Major',
    icdCode: '01U00JZ',
    minFee: 1500000,
    maxFee: 3500000,
    defaultFee: 2500000,
    description: 'Nerve graft or conduit reconstruction',
    notes: 'Microsurgery, may require nerve graft harvesting',
  },

  // PRESSURE SORE SURGERY
  {
    id: 'pressure-001',
    name: 'Pressure Sore Surgery (Stage II-III)',
    category: 'intermediate',
    complexity: 'level2',
    complexityLabel: 'Intermediate',
    icdCode: '0HB0XZZ',
    minFee: 400000,
    maxFee: 800000,
    defaultFee: 600000,
    description: 'Debridement and primary closure of pressure ulcer',
    notes: 'May require local flap',
  },
  {
    id: 'pressure-002',
    name: 'Pressure Sore Surgery with Flap (Stage IV)',
    category: 'major',
    complexity: 'level3',
    complexityLabel: 'Major',
    icdCode: '0HX0XZ5',
    minFee: 1200000,
    maxFee: 2500000,
    defaultFee: 1850000,
    description: 'Pressure sore excision with rotational or advancement flap',
    notes: 'Sacral, ischial, trochanteric pressure sores',
  },

  // CONGENITAL & RECONSTRUCTIVE
  {
    id: 'congenital-001',
    name: 'Syndactyly Release (Complex)',
    category: 'major',
    complexity: 'level3',
    complexityLabel: 'Major',
    icdCode: '0Y6N0Z0',
    minFee: 700000,
    maxFee: 1500000,
    defaultFee: 1100000,
    description: 'Complex syndactyly release with skin grafting',
    notes: 'Multiple digits, osseous involvement, or complete syndactyly',
  },
  {
    id: 'congenital-002',
    name: 'Contracture Release (Multiple Joint/Complex)',
    category: 'major',
    complexity: 'level3',
    complexityLabel: 'Major',
    icdCode: '0LN00ZZ',
    minFee: 800000,
    maxFee: 1800000,
    defaultFee: 1300000,
    description: 'Release of contracture affecting multiple joints or extensive burns',
    notes: 'May require skin grafting or flap coverage',
  },
  {
    id: 'congenital-003',
    name: 'Ear Reconstruction (Partial)',
    category: 'major',
    complexity: 'level3',
    complexityLabel: 'Major',
    icdCode: '09U10JZ',
    minFee: 800000,
    maxFee: 1800000,
    defaultFee: 1300000,
    description: 'Partial ear reconstruction for trauma or congenital deformity',
    notes: 'May require cartilage graft',
  },
  {
    id: 'congenital-004',
    name: 'Ear Reconstruction (Total/Microtia)',
    category: 'advanced',
    complexity: 'level4',
    complexityLabel: 'Super Major',
    icdCode: '09U10JZ',
    minFee: 2500000,
    maxFee: 5000000,
    defaultFee: 3750000,
    description: 'Total ear reconstruction for microtia or auricular loss',
    notes: 'Staged procedure, rib cartilage framework',
  },
  {
    id: 'congenital-005',
    name: 'Reduction Rhinoplasty',
    category: 'major',
    complexity: 'level3',
    complexityLabel: 'Major',
    icdCode: '09QK0ZZ',
    minFee: 1000000,
    maxFee: 2500000,
    defaultFee: 1750000,
    description: 'Rhinoplasty for nasal hump reduction or nasal reduction',
    notes: 'Cosmetic or functional indication',
  },

  // VASCULAR SURGERY
  {
    id: 'vascular-001',
    name: 'Venous Ligation and Stripping (Unilateral)',
    category: 'intermediate',
    complexity: 'level2',
    complexityLabel: 'Intermediate',
    icdCode: '06L80ZZ',
    minFee: 400000,
    maxFee: 800000,
    defaultFee: 600000,
    description: 'Ligation and stripping of varicose veins (one leg)',
    notes: 'Great saphenous vein, regional or general anaesthesia',
  },
  {
    id: 'vascular-002',
    name: 'Venous Ligation and Stripping (Bilateral)',
    category: 'major',
    complexity: 'level3',
    complexityLabel: 'Major',
    icdCode: '06L80ZZ',
    minFee: 700000,
    maxFee: 1400000,
    defaultFee: 1050000,
    description: 'Ligation and stripping of varicose veins (both legs)',
    notes: 'Bilateral procedure, requires longer theatre time',
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
