// Non-Theater Services Fee Structure for Nigerian Clinical Practice
// All fees in Nigerian Naira (₦)

export type ServiceComplexity = 'basic' | 'intermediate' | 'advanced';

export interface NonTheaterService {
  id: string;
  category: string;
  name: string;
  complexity: ServiceComplexity;
  minFee: number;
  maxFee: number;
  description: string;
  duration?: string;
  notes?: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}

// Service Categories
export const serviceCategories: ServiceCategory[] = [
  {
    id: 'consultation',
    name: 'Specialist Consultation & Reviews',
    description: 'Initial and follow-up consultations with specialists',
    icon: 'Stethoscope',
  },
  {
    id: 'wound-review',
    name: 'Wound Care Reviews',
    description: 'Wound assessment and review without debridement',
    icon: 'Eye',
  },
  {
    id: 'debridement',
    name: 'Bedside Wound Debridement',
    description: 'Non-theater wound debridement procedures',
    icon: 'Scissors',
  },
  {
    id: 'npwt',
    name: 'Negative Pressure Wound Therapy',
    description: 'NPWT application and supervision',
    icon: 'Wind',
  },
  {
    id: 'burn-dressing',
    name: 'Burn Wound Dressings',
    description: 'Specialist-performed burn dressings',
    icon: 'Flame',
  },
  {
    id: 'package',
    name: 'Long-Term Management Packages',
    description: 'Serial and comprehensive wound care packages',
    icon: 'Package',
  },
  {
    id: 'specialist-service',
    name: 'Burns & Wound Specialist Services',
    description: 'Additional specialist services',
    icon: 'Award',
  },
];

// Complexity Levels
export const complexityLevels: Record<ServiceComplexity, { label: string; description: string; color: string }> = {
  basic: {
    label: 'Basic',
    description: 'Outpatient / short bedside service',
    color: 'bg-green-100 text-green-800',
  },
  intermediate: {
    label: 'Intermediate',
    description: 'Requires skill, time, repeated visits',
    color: 'bg-amber-100 text-amber-800',
  },
  advanced: {
    label: 'Advanced',
    description: 'High expertise, risk, prolonged care',
    color: 'bg-red-100 text-red-800',
  },
};

// Non-Theater Services Database
export const nonTheaterServices: NonTheaterService[] = [
  // 1. SPECIALIST CONSULTATION & REVIEWS
  {
    id: 'CONS-001',
    category: 'consultation',
    name: 'Initial Specialist Consultation',
    complexity: 'basic',
    minFee: 30000,
    maxFee: 60000,
    description: 'First-time consultation with surgical specialist',
    duration: '30-45 minutes',
  },
  {
    id: 'CONS-002',
    category: 'consultation',
    name: 'Follow-up Consultation',
    complexity: 'basic',
    minFee: 20000,
    maxFee: 40000,
    description: 'Subsequent visits for ongoing care',
    duration: '15-30 minutes',
  },
  {
    id: 'CONS-003',
    category: 'consultation',
    name: 'Complex Wound Specialist Review',
    complexity: 'intermediate',
    minFee: 40000,
    maxFee: 80000,
    description: 'Detailed assessment of complex wounds',
    duration: '30-60 minutes',
  },
  {
    id: 'CONS-004',
    category: 'consultation',
    name: 'Multidisciplinary Wound Review',
    complexity: 'advanced',
    minFee: 60000,
    maxFee: 120000,
    description: 'Joint review with multiple specialists',
    duration: '45-90 minutes',
  },
  {
    id: 'CONS-005',
    category: 'consultation',
    name: 'Pre-operative Specialist Review',
    complexity: 'intermediate',
    minFee: 40000,
    maxFee: 80000,
    description: 'Pre-surgery assessment and planning',
    duration: '30-45 minutes',
  },
  {
    id: 'CONS-006',
    category: 'consultation',
    name: 'Post-operative Specialist Review',
    complexity: 'intermediate',
    minFee: 30000,
    maxFee: 60000,
    description: 'Post-surgery follow-up and assessment',
    duration: '20-30 minutes',
  },

  // 2. WOUND CARE REVIEWS (WITHOUT DEBRIDEMENT)
  {
    id: 'WCR-001',
    category: 'wound-review',
    name: 'Small Wound Review',
    complexity: 'basic',
    minFee: 25000,
    maxFee: 50000,
    description: 'Assessment of small wounds without debridement',
    duration: '15-20 minutes',
    notes: 'Chronic ulcers, post-operative wounds, healing burn wounds',
  },
  {
    id: 'WCR-002',
    category: 'wound-review',
    name: 'Moderate Wound Review',
    complexity: 'intermediate',
    minFee: 40000,
    maxFee: 80000,
    description: 'Assessment of moderate-sized wounds',
    duration: '20-30 minutes',
    notes: 'Chronic ulcers, post-operative wounds, healing burn wounds',
  },
  {
    id: 'WCR-003',
    category: 'wound-review',
    name: 'Large/Complex Wound Review',
    complexity: 'advanced',
    minFee: 60000,
    maxFee: 120000,
    description: 'Assessment of large or complex wounds',
    duration: '30-45 minutes',
    notes: 'Chronic ulcers, post-operative wounds, healing burn wounds',
  },

  // 3. BEDSIDE WOUND DEBRIDEMENT
  {
    id: 'DEB-001',
    category: 'debridement',
    name: 'Small Wound Debridement',
    complexity: 'intermediate',
    minFee: 50000,
    maxFee: 100000,
    description: 'Bedside debridement of small wounds',
    duration: '20-30 minutes',
    notes: 'Non-theatre / ward / clinic based',
  },
  {
    id: 'DEB-002',
    category: 'debridement',
    name: 'Moderate Wound Debridement',
    complexity: 'intermediate',
    minFee: 100000,
    maxFee: 200000,
    description: 'Bedside debridement of moderate wounds',
    duration: '30-45 minutes',
    notes: 'Non-theatre / ward / clinic based',
  },
  {
    id: 'DEB-003',
    category: 'debridement',
    name: 'Extensive Wound Debridement',
    complexity: 'advanced',
    minFee: 200000,
    maxFee: 400000,
    description: 'Bedside debridement of extensive wounds',
    duration: '45-90 minutes',
    notes: 'Theatre debridement fees are higher and billed separately',
  },

  // 4. NEGATIVE PRESSURE WOUND THERAPY (NPWT)
  {
    id: 'NPWT-001',
    category: 'npwt',
    name: 'Small Wound NPWT Application',
    complexity: 'intermediate',
    minFee: 80000,
    maxFee: 150000,
    description: 'NPWT application for small wounds',
    duration: '30-45 minutes',
    notes: 'Consumables billed separately',
  },
  {
    id: 'NPWT-002',
    category: 'npwt',
    name: 'Medium Wound NPWT Application',
    complexity: 'intermediate',
    minFee: 120000,
    maxFee: 250000,
    description: 'NPWT application for medium wounds',
    duration: '45-60 minutes',
    notes: 'Consumables billed separately',
  },
  {
    id: 'NPWT-003',
    category: 'npwt',
    name: 'Large Wound NPWT Application',
    complexity: 'advanced',
    minFee: 200000,
    maxFee: 400000,
    description: 'NPWT application for large wounds',
    duration: '60-90 minutes',
    notes: 'Consumables billed separately',
  },
  {
    id: 'NPWT-004',
    category: 'npwt',
    name: 'NPWT Ongoing Review',
    complexity: 'intermediate',
    minFee: 40000,
    maxFee: 80000,
    description: 'Follow-up review for ongoing NPWT',
    duration: '15-30 minutes',
    notes: 'Per visit fee',
  },

  // 5. BURN WOUND DRESSINGS
  {
    id: 'BURN-001',
    category: 'burn-dressing',
    name: 'Small Burn Dressing',
    complexity: 'intermediate',
    minFee: 40000,
    maxFee: 80000,
    description: 'Specialist-performed dressing for small burns',
    duration: '20-30 minutes',
    notes: 'Acute burns, infected burns, post-excision burns, paediatric burns',
  },
  {
    id: 'BURN-002',
    category: 'burn-dressing',
    name: 'Moderate Burn Dressing',
    complexity: 'intermediate',
    minFee: 80000,
    maxFee: 150000,
    description: 'Specialist-performed dressing for moderate burns',
    duration: '30-45 minutes',
    notes: 'Acute burns, infected burns, post-excision burns, paediatric burns',
  },
  {
    id: 'BURN-003',
    category: 'burn-dressing',
    name: 'Large/Extensive Burn Dressing',
    complexity: 'advanced',
    minFee: 150000,
    maxFee: 300000,
    description: 'Specialist-performed dressing for large burns',
    duration: '45-90 minutes',
    notes: 'Acute burns, infected burns, post-excision burns, paediatric burns',
  },

  // 6. SERIAL / LONG-TERM WOUND MANAGEMENT PACKAGES
  {
    id: 'PKG-001',
    category: 'package',
    name: 'Weekly Wound Care Package',
    complexity: 'intermediate',
    minFee: 150000,
    maxFee: 300000,
    description: 'One week of wound care (multiple visits)',
    duration: '1 week',
    notes: 'Includes multiple dressing changes and reviews',
  },
  {
    id: 'PKG-002',
    category: 'package',
    name: 'Monthly Wound Care Package',
    complexity: 'intermediate',
    minFee: 500000,
    maxFee: 1000000,
    description: 'One month of comprehensive wound care',
    duration: '1 month',
    notes: 'Includes regular assessments and treatments',
  },
  {
    id: 'PKG-003',
    category: 'package',
    name: 'Complex Chronic Wound Package',
    complexity: 'advanced',
    minFee: 1000000,
    maxFee: 2000000,
    description: 'Long-term management for complex chronic wounds',
    duration: '1-3 months',
    notes: 'Comprehensive care for difficult wounds',
  },

  // 7. BURNS & WOUND SPECIALIST SERVICES (ADDITIONAL)
  {
    id: 'SPEC-001',
    category: 'specialist-service',
    name: 'Burn Severity Assessment & TBSA Calculation',
    complexity: 'intermediate',
    minFee: 30000,
    maxFee: 50000,
    description: 'Detailed burn assessment with body surface area calculation',
    duration: '20-30 minutes',
  },
  {
    id: 'SPEC-002',
    category: 'specialist-service',
    name: 'Wound Photography & Documentation',
    complexity: 'basic',
    minFee: 20000,
    maxFee: 40000,
    description: 'Professional wound imaging for records and monitoring',
    duration: '10-15 minutes',
  },
  {
    id: 'SPEC-003',
    category: 'specialist-service',
    name: 'Advanced Wound Treatment Planning',
    complexity: 'advanced',
    minFee: 50000,
    maxFee: 100000,
    description: 'Comprehensive treatment plan development',
    duration: '30-45 minutes',
  },
  {
    id: 'SPEC-004',
    category: 'specialist-service',
    name: 'Home Care Wound Supervision',
    complexity: 'intermediate',
    minFee: 50000,
    maxFee: 100000,
    description: 'Home visit for wound care supervision',
    duration: '30-60 minutes',
    notes: 'Per visit fee',
  },
];

// Helper functions
export function getServicesByCategory(categoryId: string): NonTheaterService[] {
  return nonTheaterServices.filter(s => s.category === categoryId);
}

export function getServiceById(id: string): NonTheaterService | undefined {
  return nonTheaterServices.find(s => s.id === id);
}

export function calculateServiceFee(
  service: NonTheaterService,
  feeLevel: 'min' | 'mid' | 'max' = 'mid',
  discountPercent: number = 0
): { baseFee: number; discount: number; finalFee: number } {
  let baseFee: number;
  
  switch (feeLevel) {
    case 'min':
      baseFee = service.minFee;
      break;
    case 'max':
      baseFee = service.maxFee;
      break;
    case 'mid':
    default:
      baseFee = Math.round((service.minFee + service.maxFee) / 2);
      break;
  }

  const discount = Math.round(baseFee * (discountPercent / 100));
  const finalFee = baseFee - discount;

  return { baseFee, discount, finalFee };
}

export function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Discount presets
export const discountPresets = [
  { value: 0, label: 'No Discount' },
  { value: 5, label: '5% Discount' },
  { value: 10, label: '10% Discount' },
  { value: 15, label: '15% Discount' },
  { value: 20, label: '20% Discount' },
  { value: 25, label: '25% Discount' },
  { value: 30, label: '30% Discount' },
  { value: 50, label: '50% Discount' },
];
