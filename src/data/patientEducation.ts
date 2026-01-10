// Comprehensive Patient Education Database for Surgical Procedures
// Used for auto-generating medico-legal patient counseling PDFs

export type AnesthesiaType = 'local' | 'regional' | 'spinal' | 'general' | 'sedation' | 'combined';

export interface Complication {
  name: string;
  description: string;
  likelihood: 'rare' | 'uncommon' | 'common' | 'very_common';
  percentage: string; // e.g., "<1%", "1-5%", "5-10%", ">10%"
  severity: 'minor' | 'moderate' | 'major' | 'life_threatening';
}

export interface LifestyleChange {
  category: string;
  recommendation: string;
  duration?: string;
  importance: 'essential' | 'recommended' | 'optional';
}

export interface PatientResponsibility {
  phase: 'pre_operative' | 'immediate_post_op' | 'recovery' | 'long_term';
  responsibility: string;
  importance: 'critical' | 'important' | 'helpful';
}

export interface ProcedureEducation {
  procedureId: string;
  procedureName: string;
  category: string;
  
  // Overview
  overview: string;
  aims: string[];
  indications: string[];
  
  // Anesthesia
  anesthesiaTypes: AnesthesiaType[];
  preferredAnesthesia: AnesthesiaType;
  anesthesiaDescription: string;
  
  // Expected Outcomes
  expectedOutcomes: string[];
  successRate: string;
  healingTime: string;
  hospitalStay: string;
  
  // Complications
  generalComplications: Complication[];
  specificComplications: Complication[];
  
  // Lifestyle & Recovery
  lifestyleChanges: LifestyleChange[];
  patientResponsibilities: PatientResponsibility[];
  
  // Follow-up
  followUpSchedule: string[];
  warningSignsToReport: string[];
  
  // Medico-legal
  alternativeTreatments?: string[];
  riskOfNotTreating?: string;
}

// Complication likelihood percentages
export const complicationLikelihood = {
  rare: { label: 'Rare', percentage: '<1%', color: 'text-green-600' },
  uncommon: { label: 'Uncommon', percentage: '1-5%', color: 'text-yellow-600' },
  common: { label: 'Common', percentage: '5-20%', color: 'text-orange-600' },
  very_common: { label: 'Very Common', percentage: '>20%', color: 'text-red-600' },
};

// General surgical complications (common to most procedures)
export const generalSurgicalComplications: Complication[] = [
  {
    name: 'Infection',
    description: 'Bacterial infection at the surgical site requiring antibiotics or drainage',
    likelihood: 'uncommon',
    percentage: '1-5%',
    severity: 'moderate',
  },
  {
    name: 'Bleeding/Haematoma',
    description: 'Collection of blood under the skin that may require drainage',
    likelihood: 'uncommon',
    percentage: '1-5%',
    severity: 'moderate',
  },
  {
    name: 'Wound Dehiscence',
    description: 'Partial or complete opening of the surgical wound',
    likelihood: 'rare',
    percentage: '<1%',
    severity: 'moderate',
  },
  {
    name: 'Seroma',
    description: 'Collection of clear fluid under the skin',
    likelihood: 'common',
    percentage: '5-15%',
    severity: 'minor',
  },
  {
    name: 'Scar Formation',
    description: 'All surgical wounds heal with scars; some may be hypertrophic or keloid',
    likelihood: 'very_common',
    percentage: '>90%',
    severity: 'minor',
  },
  {
    name: 'Nerve Damage',
    description: 'Temporary or permanent numbness, tingling, or pain near the surgical site',
    likelihood: 'uncommon',
    percentage: '1-5%',
    severity: 'moderate',
  },
  {
    name: 'Deep Vein Thrombosis (DVT)',
    description: 'Blood clot in leg veins that may travel to lungs (pulmonary embolism)',
    likelihood: 'rare',
    percentage: '<1%',
    severity: 'life_threatening',
  },
  {
    name: 'Anesthetic Complications',
    description: 'Reactions to anesthesia including allergic reactions, nausea, respiratory issues',
    likelihood: 'rare',
    percentage: '<1%',
    severity: 'major',
  },
];

// Procedure-specific education database
export const procedureEducationDatabase: ProcedureEducation[] = [
  // BURNS SURGERY
  {
    procedureId: 'BURNS-001',
    procedureName: 'Split-Thickness Skin Graft (STSG)',
    category: 'Burns Surgery',
    overview: 'A split-thickness skin graft involves removing a thin layer of skin from a healthy part of your body (donor site) and placing it over the burn wound to promote healing.',
    aims: [
      'Close the burn wound to prevent infection',
      'Promote healing and reduce scarring',
      'Restore skin coverage and function',
      'Prevent contracture formation',
    ],
    indications: [
      'Deep partial-thickness burns',
      'Full-thickness burns after debridement',
      'Large wounds that cannot heal on their own',
      'Failed conservative wound management',
    ],
    anesthesiaTypes: ['general', 'regional', 'spinal'],
    preferredAnesthesia: 'general',
    anesthesiaDescription: 'This procedure is typically performed under general anesthesia where you will be completely asleep. In some cases, regional or spinal anesthesia may be used.',
    expectedOutcomes: [
      'Successful graft take in 80-95% of cases',
      'Wound closure within 2-3 weeks',
      'Improved skin coverage and protection',
      'Reduced risk of infection',
    ],
    successRate: '80-95% graft take rate',
    healingTime: '2-4 weeks for initial healing; 6-12 months for maturation',
    hospitalStay: '5-14 days depending on extent',
    generalComplications: generalSurgicalComplications,
    specificComplications: [
      {
        name: 'Graft Failure',
        description: 'The transplanted skin does not survive and may need repeat surgery',
        likelihood: 'uncommon',
        percentage: '5-20%',
        severity: 'moderate',
      },
      {
        name: 'Donor Site Pain',
        description: 'The area where skin was taken may be painful during healing',
        likelihood: 'very_common',
        percentage: '>80%',
        severity: 'minor',
      },
      {
        name: 'Contracture',
        description: 'Tightening of the grafted area that may restrict movement',
        likelihood: 'common',
        percentage: '10-30%',
        severity: 'moderate',
      },
      {
        name: 'Color Mismatch',
        description: 'The grafted skin may be lighter or darker than surrounding skin',
        likelihood: 'very_common',
        percentage: '>50%',
        severity: 'minor',
      },
      {
        name: 'Itching',
        description: 'Persistent itching during healing phase',
        likelihood: 'very_common',
        percentage: '>70%',
        severity: 'minor',
      },
    ],
    lifestyleChanges: [
      {
        category: 'Wound Care',
        recommendation: 'Keep grafted area clean and follow dressing change instructions',
        duration: '4-6 weeks',
        importance: 'essential',
      },
      {
        category: 'Sun Protection',
        recommendation: 'Protect grafted skin from sun exposure for at least 12 months',
        duration: '12+ months',
        importance: 'essential',
      },
      {
        category: 'Physical Activity',
        recommendation: 'Avoid strenuous activities that may stress the graft site',
        duration: '4-6 weeks',
        importance: 'recommended',
      },
      {
        category: 'Nutrition',
        recommendation: 'Maintain high protein diet to support healing',
        duration: '6-8 weeks',
        importance: 'recommended',
      },
      {
        category: 'Smoking',
        recommendation: 'Do not smoke as it significantly impairs graft healing',
        duration: 'Permanent',
        importance: 'essential',
      },
      {
        category: 'Moisturizing',
        recommendation: 'Apply prescribed moisturizer regularly once wound heals',
        duration: '6-12 months',
        importance: 'recommended',
      },
    ],
    patientResponsibilities: [
      {
        phase: 'pre_operative',
        responsibility: 'Stop smoking at least 2 weeks before surgery',
        importance: 'critical',
      },
      {
        phase: 'pre_operative',
        responsibility: 'Inform surgeon of all medications including herbal supplements',
        importance: 'critical',
      },
      {
        phase: 'pre_operative',
        responsibility: 'Follow fasting instructions before surgery',
        importance: 'critical',
      },
      {
        phase: 'immediate_post_op',
        responsibility: 'Keep the graft area immobile as instructed',
        importance: 'critical',
      },
      {
        phase: 'immediate_post_op',
        responsibility: 'Report any fever, increased pain, or foul smell immediately',
        importance: 'critical',
      },
      {
        phase: 'recovery',
        responsibility: 'Attend all follow-up appointments',
        importance: 'critical',
      },
      {
        phase: 'recovery',
        responsibility: 'Perform prescribed exercises for contracture prevention',
        importance: 'important',
      },
      {
        phase: 'long_term',
        responsibility: 'Use pressure garments if prescribed',
        importance: 'important',
      },
      {
        phase: 'long_term',
        responsibility: 'Apply sunscreen (SPF 30+) to grafted areas',
        importance: 'important',
      },
    ],
    followUpSchedule: [
      '48-72 hours: First dressing check',
      '1 week: Wound assessment and dressing change',
      '2 weeks: Suture removal if applicable',
      '1 month: Healing assessment',
      '3 months: Scar assessment',
      '6 months: Long-term review',
      '12 months: Final assessment',
    ],
    warningSignsToReport: [
      'Fever above 38°C (100.4°F)',
      'Increasing pain not relieved by medication',
      'Foul-smelling discharge from wound',
      'Graft turning dark or black',
      'Spreading redness around the wound',
      'Excessive swelling',
      'Bleeding that does not stop with pressure',
    ],
    alternativeTreatments: [
      'Conservative wound care with dressings',
      'Negative pressure wound therapy',
      'Skin substitutes',
      'Full-thickness skin graft',
    ],
    riskOfNotTreating: 'Without treatment, the burn wound may fail to heal, become infected, develop severe scarring and contractures, and significantly impact quality of life and function.',
  },

  // WOUND CARE
  {
    procedureId: 'WOUND-001',
    procedureName: 'Surgical Wound Debridement',
    category: 'Wound Care',
    overview: 'Surgical debridement is the removal of dead, damaged, or infected tissue from a wound to promote healing. This can be performed at the bedside or in the operating theatre.',
    aims: [
      'Remove necrotic (dead) tissue',
      'Reduce bacterial load and infection risk',
      'Prepare wound bed for healing',
      'Stimulate healthy tissue growth',
    ],
    indications: [
      'Chronic non-healing wounds',
      'Infected wounds',
      'Diabetic foot ulcers',
      'Pressure sores',
      'Burn wounds',
      'Traumatic wounds with dead tissue',
    ],
    anesthesiaTypes: ['local', 'regional', 'general'],
    preferredAnesthesia: 'local',
    anesthesiaDescription: 'Minor debridement can be done with local anesthesia (numbing injection). Extensive debridement may require regional or general anesthesia.',
    expectedOutcomes: [
      'Clean wound bed ready for healing',
      'Reduced infection risk',
      'Improved wound healing',
      'Multiple sessions may be needed',
    ],
    successRate: 'Varies by wound type; generally improves healing by 50-70%',
    healingTime: 'Depends on wound size; weeks to months',
    hospitalStay: 'Day case to 1-3 days for extensive debridement',
    generalComplications: generalSurgicalComplications.filter(c => 
      ['Infection', 'Bleeding/Haematoma', 'Nerve Damage'].includes(c.name)
    ),
    specificComplications: [
      {
        name: 'Pain',
        description: 'Increased pain during and after the procedure',
        likelihood: 'common',
        percentage: '30-50%',
        severity: 'minor',
      },
      {
        name: 'Incomplete Debridement',
        description: 'Some dead tissue may remain requiring repeat procedure',
        likelihood: 'common',
        percentage: '20-40%',
        severity: 'minor',
      },
      {
        name: 'Wound Enlargement',
        description: 'The wound may appear larger after removing dead tissue',
        likelihood: 'very_common',
        percentage: '>50%',
        severity: 'minor',
      },
      {
        name: 'Exposure of Deeper Structures',
        description: 'Tendons, bone, or blood vessels may be exposed',
        likelihood: 'uncommon',
        percentage: '5-10%',
        severity: 'moderate',
      },
    ],
    lifestyleChanges: [
      {
        category: 'Wound Care',
        recommendation: 'Follow dressing change instructions carefully',
        duration: 'Until healed',
        importance: 'essential',
      },
      {
        category: 'Offloading',
        recommendation: 'Avoid pressure on the wound (especially for foot wounds)',
        duration: 'Until healed',
        importance: 'essential',
      },
      {
        category: 'Blood Sugar',
        recommendation: 'Maintain good blood sugar control if diabetic',
        duration: 'Ongoing',
        importance: 'essential',
      },
      {
        category: 'Nutrition',
        recommendation: 'Eat a balanced diet rich in protein and vitamins',
        duration: 'During healing',
        importance: 'recommended',
      },
    ],
    patientResponsibilities: [
      {
        phase: 'pre_operative',
        responsibility: 'Inform doctor of all medications especially blood thinners',
        importance: 'critical',
      },
      {
        phase: 'immediate_post_op',
        responsibility: 'Take prescribed antibiotics as directed',
        importance: 'critical',
      },
      {
        phase: 'recovery',
        responsibility: 'Keep wound clean and dry as instructed',
        importance: 'critical',
      },
      {
        phase: 'recovery',
        responsibility: 'Monitor wound for signs of infection',
        importance: 'important',
      },
      {
        phase: 'long_term',
        responsibility: 'Address underlying conditions (diabetes, circulation)',
        importance: 'important',
      },
    ],
    followUpSchedule: [
      '2-3 days: First wound check',
      'Weekly: Until wound shows good healing',
      'As needed: Additional debridement sessions',
    ],
    warningSignsToReport: [
      'Increasing redness or warmth around wound',
      'Foul-smelling or increased discharge',
      'Fever or chills',
      'Increasing pain',
      'Dark discoloration of wound edges',
    ],
    alternativeTreatments: [
      'Enzymatic debridement (ointments)',
      'Mechanical debridement (wet-to-dry dressings)',
      'Maggot therapy',
      'Autolytic debridement (hydrogels)',
    ],
    riskOfNotTreating: 'Without debridement, dead tissue prevents healing, harbors bacteria leading to serious infection, and may result in spreading infection (cellulitis, sepsis) or limb loss.',
  },

  // NEGATIVE PRESSURE WOUND THERAPY
  {
    procedureId: 'NPWT-001',
    procedureName: 'Negative Pressure Wound Therapy (NPWT/VAC)',
    category: 'Wound Care',
    overview: 'NPWT uses a sealed dressing connected to a pump that applies controlled negative pressure (suction) to the wound, promoting healing by removing fluid, reducing swelling, and increasing blood flow.',
    aims: [
      'Accelerate wound healing',
      'Remove excess fluid and reduce swelling',
      'Increase blood flow to wound',
      'Reduce bacterial load',
      'Promote granulation tissue formation',
    ],
    indications: [
      'Complex or large wounds',
      'Diabetic foot ulcers',
      'Pressure ulcers',
      'Post-surgical wounds',
      'Skin grafts',
      'Open abdominal wounds',
    ],
    anesthesiaTypes: ['local', 'sedation'],
    preferredAnesthesia: 'local',
    anesthesiaDescription: 'Application and dressing changes may require local anesthesia or pain medication for comfort.',
    expectedOutcomes: [
      'Faster wound healing (30-50% faster)',
      'Reduced wound size',
      'Formation of healthy granulation tissue',
      'Preparation for skin grafting',
    ],
    successRate: '70-90% show significant improvement',
    healingTime: 'Treatment typically 1-6 weeks; healing continues after',
    hospitalStay: 'Can be managed as outpatient or during admission',
    generalComplications: generalSurgicalComplications.filter(c => 
      ['Infection', 'Bleeding/Haematoma'].includes(c.name)
    ),
    specificComplications: [
      {
        name: 'Pain During Dressing Change',
        description: 'Discomfort when foam is removed from wound',
        likelihood: 'common',
        percentage: '20-40%',
        severity: 'minor',
      },
      {
        name: 'Skin Maceration',
        description: 'Softening and damage to skin around the wound',
        likelihood: 'uncommon',
        percentage: '5-10%',
        severity: 'minor',
      },
      {
        name: 'Bleeding',
        description: 'Bleeding from granulation tissue during dressing change',
        likelihood: 'common',
        percentage: '10-20%',
        severity: 'minor',
      },
      {
        name: 'Noise/Discomfort from Device',
        description: 'The pump may be noisy and uncomfortable to carry',
        likelihood: 'common',
        percentage: '30-50%',
        severity: 'minor',
      },
    ],
    lifestyleChanges: [
      {
        category: 'Device Management',
        recommendation: 'Keep device charged and connected as instructed',
        duration: 'During treatment',
        importance: 'essential',
      },
      {
        category: 'Activity',
        recommendation: 'Limit activities that may dislodge the dressing',
        duration: 'During treatment',
        importance: 'recommended',
      },
      {
        category: 'Hygiene',
        recommendation: 'Keep dressing and surrounding skin clean and dry',
        duration: 'During treatment',
        importance: 'essential',
      },
    ],
    patientResponsibilities: [
      {
        phase: 'immediate_post_op',
        responsibility: 'Ensure device remains connected and functioning',
        importance: 'critical',
      },
      {
        phase: 'recovery',
        responsibility: 'Report any alarm sounds from the device',
        importance: 'critical',
      },
      {
        phase: 'recovery',
        responsibility: 'Attend all dressing change appointments',
        importance: 'critical',
      },
    ],
    followUpSchedule: [
      'Every 2-3 days: Dressing change and wound assessment',
      'Weekly: Review of progress',
    ],
    warningSignsToReport: [
      'Device alarm that cannot be resolved',
      'Sudden increase in pain',
      'Heavy bleeding visible in canister',
      'Foul smell from dressing',
      'Fever or feeling unwell',
    ],
    alternativeTreatments: [
      'Standard wound dressings',
      'Surgical debridement alone',
      'Skin grafting',
    ],
    riskOfNotTreating: 'Without appropriate wound care, healing may be delayed, infection risk increases, and more extensive surgery may eventually be needed.',
  },

  // KELOID EXCISION
  {
    procedureId: 'SCAR-001',
    procedureName: 'Keloid Excision',
    category: 'Scar Management',
    overview: 'Keloid excision is the surgical removal of a keloid scar, which is an overgrowth of scar tissue that extends beyond the original wound. Surgery is combined with other treatments to prevent recurrence.',
    aims: [
      'Remove unsightly or symptomatic keloid',
      'Improve appearance and function',
      'Relieve symptoms such as itching or pain',
      'Prevent further growth',
    ],
    indications: [
      'Large or disfiguring keloids',
      'Keloids causing pain or itching',
      'Keloids restricting movement',
      'Failed conservative treatment',
    ],
    anesthesiaTypes: ['local', 'regional', 'general'],
    preferredAnesthesia: 'local',
    anesthesiaDescription: 'Most keloid excisions are performed under local anesthesia. Large keloids may require general anesthesia.',
    expectedOutcomes: [
      'Removal of visible keloid mass',
      'Improved appearance',
      'Relief of symptoms',
      'Risk of recurrence 20-80% without adjuvant therapy',
    ],
    successRate: '50-80% success with combined treatment',
    healingTime: '2-4 weeks for wound healing; 6-12 months for scar maturation',
    hospitalStay: 'Day case procedure',
    generalComplications: generalSurgicalComplications,
    specificComplications: [
      {
        name: 'Keloid Recurrence',
        description: 'The keloid returns, often larger than before',
        likelihood: 'common',
        percentage: '20-80% without adjuvant therapy',
        severity: 'moderate',
      },
      {
        name: 'Hypertrophic Scar',
        description: 'A raised but non-keloid scar forms',
        likelihood: 'common',
        percentage: '20-40%',
        severity: 'minor',
      },
      {
        name: 'Pain at Site',
        description: 'Persistent pain or sensitivity',
        likelihood: 'uncommon',
        percentage: '5-10%',
        severity: 'minor',
      },
    ],
    lifestyleChanges: [
      {
        category: 'Wound Care',
        recommendation: 'Follow precise wound care instructions',
        duration: '4-6 weeks',
        importance: 'essential',
      },
      {
        category: 'Steroid Injections',
        recommendation: 'Attend all scheduled steroid injection sessions',
        duration: '3-6 months',
        importance: 'essential',
      },
      {
        category: 'Pressure Therapy',
        recommendation: 'Wear pressure garments if prescribed',
        duration: '6-12 months',
        importance: 'recommended',
      },
      {
        category: 'Silicone Therapy',
        recommendation: 'Apply silicone sheets or gel as directed',
        duration: '3-6 months',
        importance: 'recommended',
      },
      {
        category: 'Sun Protection',
        recommendation: 'Protect scar from sun exposure',
        duration: '12+ months',
        importance: 'recommended',
      },
    ],
    patientResponsibilities: [
      {
        phase: 'pre_operative',
        responsibility: 'Understand and accept risk of recurrence',
        importance: 'critical',
      },
      {
        phase: 'immediate_post_op',
        responsibility: 'Start adjuvant therapy as scheduled',
        importance: 'critical',
      },
      {
        phase: 'recovery',
        responsibility: 'Complete full course of steroid injections',
        importance: 'critical',
      },
      {
        phase: 'long_term',
        responsibility: 'Use silicone/pressure therapy consistently',
        importance: 'important',
      },
      {
        phase: 'long_term',
        responsibility: 'Report any signs of keloid returning',
        importance: 'important',
      },
    ],
    followUpSchedule: [
      '1 week: Wound check and first steroid injection',
      '3 weeks: Suture removal and second injection',
      '6 weeks: Third injection',
      'Monthly: For 3-6 months',
      '6 months: Progress review',
      '12 months: Final assessment',
    ],
    warningSignsToReport: [
      'Wound opening or infection',
      'Rapid scar growth or thickness',
      'Increasing pain or itching',
      'Redness or warmth around site',
    ],
    alternativeTreatments: [
      'Steroid injections alone',
      'Silicone therapy',
      'Pressure therapy',
      'Radiation therapy (in select cases)',
      'Cryotherapy',
      'Laser therapy',
    ],
    riskOfNotTreating: 'Keloids may continue to grow, cause pain, itching, or cosmetic concerns. They do not resolve spontaneously.',
  },

  // BREAST REDUCTION
  {
    procedureId: 'BREAST-001',
    procedureName: 'Breast Reduction (Reduction Mammoplasty)',
    category: 'Breast Surgery',
    overview: 'Breast reduction surgery removes excess breast tissue, fat, and skin to reduce breast size and reshape the breasts. It relieves physical symptoms and improves body proportions.',
    aims: [
      'Reduce breast size and weight',
      'Relieve back, neck, and shoulder pain',
      'Improve posture and mobility',
      'Achieve better breast proportion',
      'Enhance quality of life',
    ],
    indications: [
      'Symptomatic breast hypertrophy',
      'Chronic back, neck, or shoulder pain',
      'Skin irritation under breasts',
      'Difficulty with physical activities',
      'Psychological distress from breast size',
    ],
    anesthesiaTypes: ['general'],
    preferredAnesthesia: 'general',
    anesthesiaDescription: 'This procedure is performed under general anesthesia. You will be completely asleep throughout the surgery.',
    expectedOutcomes: [
      'Smaller, lighter, and lifted breasts',
      'Relief of physical symptoms in 80-90%',
      'Improved ability to exercise',
      'Better fitting clothes',
      'Enhanced self-confidence',
    ],
    successRate: '>90% patient satisfaction',
    healingTime: '2-4 weeks initial recovery; 3-6 months for final result',
    hospitalStay: 'Day case or 1-2 nights',
    generalComplications: generalSurgicalComplications,
    specificComplications: [
      {
        name: 'Nipple Sensation Changes',
        description: 'Temporary or permanent changes in nipple feeling',
        likelihood: 'common',
        percentage: '20-50%',
        severity: 'minor',
      },
      {
        name: 'Breastfeeding Difficulty',
        description: 'May not be able to breastfeed after surgery',
        likelihood: 'common',
        percentage: '30-50%',
        severity: 'moderate',
      },
      {
        name: 'Asymmetry',
        description: 'Breasts may not be perfectly symmetrical',
        likelihood: 'common',
        percentage: '10-20%',
        severity: 'minor',
      },
      {
        name: 'Fat Necrosis',
        description: 'Death of fatty tissue causing lumps',
        likelihood: 'uncommon',
        percentage: '5-10%',
        severity: 'minor',
      },
      {
        name: 'Nipple Loss',
        description: 'Partial or complete loss of nipple (rare)',
        likelihood: 'rare',
        percentage: '<1%',
        severity: 'major',
      },
      {
        name: 'Need for Revision',
        description: 'Additional surgery to correct issues',
        likelihood: 'uncommon',
        percentage: '5-10%',
        severity: 'moderate',
      },
    ],
    lifestyleChanges: [
      {
        category: 'Activity',
        recommendation: 'Avoid heavy lifting and strenuous exercise',
        duration: '6 weeks',
        importance: 'essential',
      },
      {
        category: 'Support',
        recommendation: 'Wear supportive surgical bra 24/7',
        duration: '6-8 weeks',
        importance: 'essential',
      },
      {
        category: 'Sleeping',
        recommendation: 'Sleep on your back, slightly elevated',
        duration: '2-4 weeks',
        importance: 'recommended',
      },
      {
        category: 'Weight',
        recommendation: 'Maintain stable weight after surgery',
        duration: 'Permanent',
        importance: 'recommended',
      },
      {
        category: 'Work',
        recommendation: 'Plan for 2-4 weeks off work (desk job) or longer for physical work',
        duration: '2-6 weeks',
        importance: 'recommended',
      },
    ],
    patientResponsibilities: [
      {
        phase: 'pre_operative',
        responsibility: 'Stop smoking 4-6 weeks before surgery',
        importance: 'critical',
      },
      {
        phase: 'pre_operative',
        responsibility: 'Achieve stable weight before surgery',
        importance: 'important',
      },
      {
        phase: 'pre_operative',
        responsibility: 'Arrange help at home for first week',
        importance: 'important',
      },
      {
        phase: 'immediate_post_op',
        responsibility: 'Wear surgical bra at all times',
        importance: 'critical',
      },
      {
        phase: 'recovery',
        responsibility: 'Attend all follow-up appointments',
        importance: 'critical',
      },
      {
        phase: 'recovery',
        responsibility: 'Report any signs of complication immediately',
        importance: 'critical',
      },
      {
        phase: 'long_term',
        responsibility: 'Maintain stable weight',
        importance: 'important',
      },
    ],
    followUpSchedule: [
      '1 week: Wound check and drain removal if applicable',
      '2 weeks: Suture check',
      '6 weeks: Activity clearance',
      '3 months: Progress review',
      '6 months: Final assessment',
    ],
    warningSignsToReport: [
      'Fever above 38°C',
      'Severe or worsening pain',
      'Significant swelling or bruising',
      'Opening of wound',
      'Discharge from wound',
      'Darkening of nipple or skin',
      'Shortness of breath or chest pain',
    ],
    alternativeTreatments: [
      'Weight loss (may reduce breast size)',
      'Physical therapy',
      'Supportive bras',
      'Liposuction alone (limited cases)',
    ],
    riskOfNotTreating: 'Chronic pain, posture problems, skin problems, and psychological distress will likely continue or worsen over time.',
  },

  // CLEFT LIP REPAIR
  {
    procedureId: 'CONGEN-001',
    procedureName: 'Cleft Lip Repair',
    category: 'Congenital Anomaly Surgery',
    overview: 'Cleft lip repair is surgery to close the gap in the upper lip that a child is born with. It restores normal lip appearance and function for feeding and speech development.',
    aims: [
      'Close the gap in the lip',
      'Create normal lip shape and symmetry',
      'Improve feeding ability',
      'Allow normal speech development',
      'Enhance facial appearance',
    ],
    indications: [
      'Unilateral or bilateral cleft lip',
      'Usually performed at 3-6 months of age',
      'Child healthy enough for surgery',
    ],
    anesthesiaTypes: ['general'],
    preferredAnesthesia: 'general',
    anesthesiaDescription: 'The surgery is performed under general anesthesia. Your child will be completely asleep and feel no pain during the procedure.',
    expectedOutcomes: [
      'Closed lip with improved symmetry',
      'Better feeding ability',
      'Foundation for normal speech',
      'Scar will mature over 1-2 years',
      'May need revision surgery later',
    ],
    successRate: '>95% successful primary closure',
    healingTime: '2-4 weeks for initial healing; 1-2 years for scar maturation',
    hospitalStay: '1-2 nights',
    generalComplications: generalSurgicalComplications.filter(c => 
      ['Infection', 'Bleeding/Haematoma', 'Scar Formation'].includes(c.name)
    ),
    specificComplications: [
      {
        name: 'Asymmetry',
        description: 'Lip may not be perfectly symmetrical',
        likelihood: 'common',
        percentage: '20-40%',
        severity: 'minor',
      },
      {
        name: 'Notching of Lip',
        description: 'Irregularity in the lip border',
        likelihood: 'uncommon',
        percentage: '5-15%',
        severity: 'minor',
      },
      {
        name: 'Need for Revision',
        description: 'Additional surgery may be needed as child grows',
        likelihood: 'common',
        percentage: '20-50%',
        severity: 'minor',
      },
      {
        name: 'Fistula',
        description: 'Abnormal connection between mouth and nose',
        likelihood: 'uncommon',
        percentage: '5-10%',
        severity: 'moderate',
      },
    ],
    lifestyleChanges: [
      {
        category: 'Feeding',
        recommendation: 'Follow special feeding instructions post-surgery',
        duration: '2-4 weeks',
        importance: 'essential',
      },
      {
        category: 'Arm Restraints',
        recommendation: 'Use arm restraints to prevent child touching lip',
        duration: '2-3 weeks',
        importance: 'essential',
      },
      {
        category: 'Sun Protection',
        recommendation: 'Protect scar from sun exposure',
        duration: '12+ months',
        importance: 'recommended',
      },
    ],
    patientResponsibilities: [
      {
        phase: 'pre_operative',
        responsibility: 'Ensure child is healthy (no cold/fever) before surgery',
        importance: 'critical',
      },
      {
        phase: 'immediate_post_op',
        responsibility: 'Follow special feeding instructions carefully',
        importance: 'critical',
      },
      {
        phase: 'immediate_post_op',
        responsibility: 'Keep arm restraints on as instructed',
        importance: 'critical',
      },
      {
        phase: 'recovery',
        responsibility: 'Apply scar treatment as prescribed',
        importance: 'important',
      },
      {
        phase: 'long_term',
        responsibility: 'Attend all follow-up and speech therapy appointments',
        importance: 'critical',
      },
    ],
    followUpSchedule: [
      '1 week: Wound check',
      '2 weeks: Suture removal',
      '3 months: Progress review',
      '6 months: Development check',
      'Annually: Until adulthood',
    ],
    warningSignsToReport: [
      'Fever',
      'Difficulty feeding',
      'Wound opening or oozing',
      'Increased swelling or redness',
      'Difficulty breathing',
    ],
    alternativeTreatments: [
      'No surgical alternatives available',
      'Pre-surgical molding may improve results',
    ],
    riskOfNotTreating: 'Without repair, the child will have difficulty feeding, speech problems, dental issues, and significant social and psychological impact.',
  },

  // CARPAL TUNNEL RELEASE
  {
    procedureId: 'HAND-001',
    procedureName: 'Carpal Tunnel Release',
    category: 'Hand Surgery',
    overview: 'Carpal tunnel release surgery cuts the ligament pressing on the median nerve in the wrist, relieving numbness, tingling, and weakness in the hand caused by carpal tunnel syndrome.',
    aims: [
      'Relieve pressure on the median nerve',
      'Reduce numbness and tingling',
      'Restore hand strength',
      'Prevent permanent nerve damage',
    ],
    indications: [
      'Carpal tunnel syndrome not responding to conservative treatment',
      'Severe or worsening symptoms',
      'Muscle wasting in the thumb',
      'Significant nerve damage on testing',
    ],
    anesthesiaTypes: ['local', 'regional'],
    preferredAnesthesia: 'local',
    anesthesiaDescription: 'The procedure is usually performed under local anesthesia with sedation. You will be awake but the hand will be completely numb.',
    expectedOutcomes: [
      'Relief of numbness and tingling in 70-90%',
      'Improved grip strength over time',
      'Night symptoms usually improve first',
      'Full recovery takes 6-12 weeks',
    ],
    successRate: '85-95% symptom improvement',
    healingTime: '2-6 weeks for wound healing; 3-6 months for full recovery',
    hospitalStay: 'Day case procedure',
    generalComplications: generalSurgicalComplications.filter(c => 
      ['Infection', 'Bleeding/Haematoma', 'Scar Formation', 'Nerve Damage'].includes(c.name)
    ),
    specificComplications: [
      {
        name: 'Pillar Pain',
        description: 'Pain at base of palm during gripping',
        likelihood: 'common',
        percentage: '20-40%',
        severity: 'minor',
      },
      {
        name: 'Scar Tenderness',
        description: 'Sensitivity over the scar',
        likelihood: 'common',
        percentage: '10-30%',
        severity: 'minor',
      },
      {
        name: 'Incomplete Relief',
        description: 'Some symptoms may persist',
        likelihood: 'uncommon',
        percentage: '5-15%',
        severity: 'minor',
      },
      {
        name: 'CRPS',
        description: 'Complex Regional Pain Syndrome (chronic pain condition)',
        likelihood: 'rare',
        percentage: '1-2%',
        severity: 'major',
      },
      {
        name: 'Recurrence',
        description: 'Symptoms may return over time',
        likelihood: 'rare',
        percentage: '1-5%',
        severity: 'moderate',
      },
    ],
    lifestyleChanges: [
      {
        category: 'Hand Use',
        recommendation: 'Avoid heavy gripping and lifting',
        duration: '4-6 weeks',
        importance: 'essential',
      },
      {
        category: 'Splinting',
        recommendation: 'Wear splint as directed (usually at night)',
        duration: '2-4 weeks',
        importance: 'recommended',
      },
      {
        category: 'Exercises',
        recommendation: 'Perform finger and wrist exercises as prescribed',
        duration: '6-12 weeks',
        importance: 'recommended',
      },
      {
        category: 'Work Modification',
        recommendation: 'Modify repetitive hand activities long-term',
        duration: 'Permanent',
        importance: 'recommended',
      },
    ],
    patientResponsibilities: [
      {
        phase: 'pre_operative',
        responsibility: 'Stop blood thinners as advised',
        importance: 'critical',
      },
      {
        phase: 'immediate_post_op',
        responsibility: 'Keep hand elevated to reduce swelling',
        importance: 'important',
      },
      {
        phase: 'immediate_post_op',
        responsibility: 'Move fingers regularly to prevent stiffness',
        importance: 'important',
      },
      {
        phase: 'recovery',
        responsibility: 'Keep wound dry until healed',
        importance: 'critical',
      },
      {
        phase: 'recovery',
        responsibility: 'Perform prescribed exercises',
        importance: 'important',
      },
    ],
    followUpSchedule: [
      '1-2 weeks: Wound check and suture removal',
      '6 weeks: Progress review',
      '3 months: Final assessment if needed',
    ],
    warningSignsToReport: [
      'Increasing pain despite medication',
      'Fever or wound redness',
      'Increasing numbness or weakness',
      'Inability to move fingers',
      'Wound opening or discharge',
    ],
    alternativeTreatments: [
      'Wrist splinting',
      'Steroid injections',
      'Activity modification',
      'Physical therapy',
    ],
    riskOfNotTreating: 'Without treatment, symptoms typically worsen, leading to permanent numbness, weakness, and muscle wasting in the thumb.',
  },

  // ABDOMINOPLASTY
  {
    procedureId: 'BODY-001',
    procedureName: 'Abdominoplasty (Tummy Tuck)',
    category: 'Body Contouring',
    overview: 'Abdominoplasty removes excess skin and fat from the abdomen and tightens the abdominal muscles. It improves the appearance of a protruding or loose abdomen.',
    aims: [
      'Remove excess abdominal skin and fat',
      'Tighten weakened or separated muscles',
      'Create a flatter, firmer abdomen',
      'Improve body contour and proportion',
    ],
    indications: [
      'Excess abdominal skin after weight loss',
      'Post-pregnancy abdominal changes',
      'Muscle separation (diastasis recti)',
      'Stable weight for at least 6 months',
    ],
    anesthesiaTypes: ['general'],
    preferredAnesthesia: 'general',
    anesthesiaDescription: 'This is a major surgery performed under general anesthesia. You will be completely asleep throughout.',
    expectedOutcomes: [
      'Flatter, firmer abdomen',
      'Improved waist definition',
      'Tighter abdominal muscles',
      'Permanent improvement if weight is maintained',
    ],
    successRate: '>90% patient satisfaction',
    healingTime: '2-4 weeks initial recovery; 3-6 months for final result',
    hospitalStay: '1-3 nights',
    generalComplications: generalSurgicalComplications,
    specificComplications: [
      {
        name: 'Seroma',
        description: 'Fluid collection under the skin requiring drainage',
        likelihood: 'common',
        percentage: '10-30%',
        severity: 'minor',
      },
      {
        name: 'Numbness',
        description: 'Permanent numbness of abdominal skin',
        likelihood: 'very_common',
        percentage: '50-80%',
        severity: 'minor',
      },
      {
        name: 'Wound Healing Problems',
        description: 'Delayed healing especially in smokers or diabetics',
        likelihood: 'uncommon',
        percentage: '5-15%',
        severity: 'moderate',
      },
      {
        name: 'Asymmetry',
        description: 'Uneven appearance of the abdomen',
        likelihood: 'uncommon',
        percentage: '5-10%',
        severity: 'minor',
      },
      {
        name: 'Umbilical Issues',
        description: 'Belly button asymmetry or healing problems',
        likelihood: 'uncommon',
        percentage: '5-10%',
        severity: 'minor',
      },
      {
        name: 'Skin Necrosis',
        description: 'Death of skin tissue requiring additional surgery',
        likelihood: 'rare',
        percentage: '1-3%',
        severity: 'major',
      },
    ],
    lifestyleChanges: [
      {
        category: 'Activity',
        recommendation: 'Avoid heavy lifting and strenuous exercise',
        duration: '6-8 weeks',
        importance: 'essential',
      },
      {
        category: 'Posture',
        recommendation: 'Walk in a slightly bent position initially',
        duration: '1-2 weeks',
        importance: 'recommended',
      },
      {
        category: 'Garment',
        recommendation: 'Wear compression garment continuously',
        duration: '6-8 weeks',
        importance: 'essential',
      },
      {
        category: 'Smoking',
        recommendation: 'Do not smoke before or after surgery',
        duration: '6 weeks before and after',
        importance: 'essential',
      },
      {
        category: 'Weight',
        recommendation: 'Maintain stable weight after surgery',
        duration: 'Permanent',
        importance: 'essential',
      },
    ],
    patientResponsibilities: [
      {
        phase: 'pre_operative',
        responsibility: 'Stop smoking 6 weeks before surgery',
        importance: 'critical',
      },
      {
        phase: 'pre_operative',
        responsibility: 'Achieve target weight before surgery',
        importance: 'important',
      },
      {
        phase: 'pre_operative',
        responsibility: 'Arrange help at home for 2 weeks',
        importance: 'important',
      },
      {
        phase: 'immediate_post_op',
        responsibility: 'Wear compression garment 24/7',
        importance: 'critical',
      },
      {
        phase: 'immediate_post_op',
        responsibility: 'Walk short distances to prevent blood clots',
        importance: 'critical',
      },
      {
        phase: 'recovery',
        responsibility: 'Care for drains if in place',
        importance: 'critical',
      },
      {
        phase: 'long_term',
        responsibility: 'Maintain weight and exercise regularly',
        importance: 'important',
      },
    ],
    followUpSchedule: [
      '1 week: Wound check and drain removal',
      '2 weeks: Suture removal',
      '6 weeks: Activity clearance',
      '3 months: Progress review',
      '6-12 months: Final assessment',
    ],
    warningSignsToReport: [
      'Severe or worsening pain',
      'Fever above 38°C',
      'Spreading redness around wound',
      'Foul-smelling discharge',
      'Darkening of skin',
      'Calf pain or swelling (blood clot)',
      'Shortness of breath or chest pain',
    ],
    alternativeTreatments: [
      'Diet and exercise alone',
      'Liposuction (for fat without excess skin)',
      'Mini-abdominoplasty (limited skin excess)',
      'Non-surgical skin tightening (limited results)',
    ],
    riskOfNotTreating: 'This is an elective procedure. Without surgery, excess skin and muscle laxity will remain and may worsen with age.',
  },
];

// Mapping from surgical fee procedure names to education IDs
const procedureNameToEducationId: Record<string, string> = {
  // Burns-related
  'split skin graft': 'BURNS-001',
  'skin graft': 'BURNS-001',
  'stsg': 'BURNS-001',
  'burn debridement': 'BURNS-001',
  'escharotomy': 'BURNS-001',
  // Wound care
  'wound debridement': 'WOUND-001',
  'wound closure': 'WOUND-001',
  'ulcer debridement': 'WOUND-001',
  'chronic wound': 'WOUND-001',
  // NPWT
  'npwt': 'NPWT-001',
  'negative pressure': 'NPWT-001',
  'vac therapy': 'NPWT-001',
  // Scar revision
  'scar revision': 'SCAR-001',
  'keloid': 'SCAR-001',
  'scar excision': 'SCAR-001',
  'z-plasty': 'SCAR-001',
  'contracture release': 'SCAR-001',
  // Breast surgery
  'breast': 'BREAST-001',
  'mastectomy': 'BREAST-001',
  'breast reconstruction': 'BREAST-001',
  'breast reduction': 'BREAST-001',
  // Congenital
  'cleft lip': 'CONGEN-001',
  'cleft palate': 'CONGEN-001',
  'syndactyly': 'CONGEN-001',
  'polydactyly': 'CONGEN-001',
  'congenital': 'CONGEN-001',
  // Hand surgery
  'hand': 'HAND-001',
  'carpal tunnel': 'HAND-001',
  'trigger finger': 'HAND-001',
  'tendon repair': 'HAND-001',
  'dupuytren': 'HAND-001',
  // Body contouring
  'abdominoplasty': 'BODY-001',
  'liposuction': 'BODY-001',
  'tummy tuck': 'BODY-001',
  'body contouring': 'BODY-001',
};

// Generate a generic procedure education based on complexity and name
function generateGenericProcedureEducation(procedureName: string, category: string = 'General Surgery'): ProcedureEducation {
  const isMinor = category.toLowerCase().includes('minor') || procedureName.toLowerCase().includes('excision') || procedureName.toLowerCase().includes('biopsy');
  const isMajor = category.toLowerCase().includes('major') || category.toLowerCase().includes('super');
  
  return {
    procedureId: `GEN-${Date.now()}`,
    procedureName: procedureName,
    category: category,
    overview: `${procedureName} is a surgical procedure that will be performed by your surgeon to address your specific medical condition. Your surgeon will explain the specific details of your case during your consultation.`,
    aims: [
      'Address your specific medical condition',
      'Improve your health and quality of life',
      'Minimize complications and promote healing',
      'Achieve the best possible surgical outcome',
    ],
    indications: [
      'As recommended by your surgeon based on your clinical assessment',
      'When conservative treatment has been unsuccessful or is not appropriate',
      'When surgical intervention offers the best outcome',
    ],
    anesthesiaTypes: isMinor ? ['local', 'sedation'] : ['general', 'regional', 'spinal'],
    preferredAnesthesia: isMinor ? 'local' : 'general',
    anesthesiaDescription: isMinor 
      ? 'This procedure may be performed under local anesthesia (numbing the area) with or without sedation to help you relax.'
      : 'This procedure is typically performed under general anesthesia where you will be completely asleep, or regional/spinal anesthesia depending on your case.',
    expectedOutcomes: [
      'Successful treatment of your condition',
      'Recovery time varies depending on the complexity of the procedure',
      'Your surgeon will discuss specific expected outcomes with you',
    ],
    successRate: 'Varies depending on specific condition and patient factors',
    healingTime: isMinor ? '1-2 weeks for initial healing' : isMajor ? '4-8 weeks for initial healing' : '2-4 weeks for initial healing',
    hospitalStay: isMinor ? 'Day case or overnight stay' : isMajor ? '3-7 days or longer' : '1-3 days depending on progress',
    generalComplications: generalSurgicalComplications,
    specificComplications: [
      {
        name: 'Procedure-specific complications',
        description: 'Your surgeon will discuss any specific risks related to your particular procedure',
        likelihood: 'uncommon',
        percentage: 'Varies',
        severity: 'moderate',
      },
    ],
    lifestyleChanges: [
      {
        category: 'Activity',
        recommendation: 'Avoid strenuous activity until cleared by your surgeon',
        duration: isMinor ? '1-2 weeks' : '4-6 weeks',
        importance: 'essential',
      },
      {
        category: 'Wound Care',
        recommendation: 'Keep surgical site clean and dry, follow dressing instructions',
        duration: 'Until wound is healed',
        importance: 'essential',
      },
      {
        category: 'Medications',
        recommendation: 'Take all prescribed medications as directed',
        importance: 'essential',
      },
      {
        category: 'Diet',
        recommendation: 'Maintain a healthy diet to promote healing',
        importance: 'recommended',
      },
    ],
    patientResponsibilities: [
      {
        phase: 'pre_operative',
        responsibility: 'Follow all pre-operative instructions including fasting requirements',
        importance: 'critical',
      },
      {
        phase: 'pre_operative',
        responsibility: 'Inform your surgeon of all medications including traditional/herbal remedies',
        importance: 'critical',
      },
      {
        phase: 'immediate_post_op',
        responsibility: 'Follow discharge instructions carefully',
        importance: 'critical',
      },
      {
        phase: 'recovery',
        responsibility: 'Attend all scheduled follow-up appointments',
        importance: 'important',
      },
      {
        phase: 'recovery',
        responsibility: 'Report any concerning symptoms immediately',
        importance: 'critical',
      },
    ],
    followUpSchedule: [
      isMinor ? 'Wound check at 7-10 days' : 'First follow-up at 1-2 weeks',
      'Subsequent visits as directed by your surgeon',
      'Contact clinic if any concerns arise before scheduled appointments',
    ],
    warningSignsToReport: [
      'Increasing pain not controlled by medications',
      'Fever above 38°C',
      'Increasing redness, swelling, or discharge from wound',
      'Bleeding that does not stop with pressure',
      'Any symptoms that concern you',
    ],
    alternativeTreatments: [
      'Conservative (non-surgical) management where appropriate',
      'Alternative surgical approaches may be available',
      'Discuss all options with your surgeon',
    ],
    riskOfNotTreating: 'Your surgeon will explain the specific risks of not proceeding with treatment based on your individual condition.',
  };
}

// Helper function to get procedure education by ID or name
export function getProcedureEducation(procedureIdOrName: string): ProcedureEducation | undefined {
  // First try exact ID match
  let education = procedureEducationDatabase.find(p => p.procedureId === procedureIdOrName);
  if (education) return education;
  
  // Try to find by exact procedure name
  education = procedureEducationDatabase.find(p => 
    p.procedureName.toLowerCase() === procedureIdOrName.toLowerCase()
  );
  if (education) return education;
  
  // Try fuzzy match on procedure name
  const lowerName = procedureIdOrName.toLowerCase();
  for (const [keyword, educationId] of Object.entries(procedureNameToEducationId)) {
    if (lowerName.includes(keyword)) {
      education = procedureEducationDatabase.find(p => p.procedureId === educationId);
      if (education) return education;
    }
  }
  
  // Try partial match on procedure name in database
  education = procedureEducationDatabase.find(p => 
    p.procedureName.toLowerCase().includes(lowerName) ||
    lowerName.includes(p.procedureName.toLowerCase())
  );
  if (education) return education;
  
  // If no match found, generate generic education
  return generateGenericProcedureEducation(procedureIdOrName);
}

// Helper function to get procedures by category
export function getProceduresByCategory(category: string): ProcedureEducation[] {
  return procedureEducationDatabase.filter(p => p.category === category);
}

// Get all unique categories
export function getEducationCategories(): string[] {
  return [...new Set(procedureEducationDatabase.map(p => p.category))];
}

// Search procedures
export function searchProcedureEducation(query: string): ProcedureEducation[] {
  const lowerQuery = query.toLowerCase();
  return procedureEducationDatabase.filter(p =>
    p.procedureName.toLowerCase().includes(lowerQuery) ||
    p.category.toLowerCase().includes(lowerQuery) ||
    p.overview.toLowerCase().includes(lowerQuery)
  );
}
