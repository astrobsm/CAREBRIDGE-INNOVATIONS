/**
 * General Pre- and Post-operative Care Education
 * Dr Nnadi-Burns Plastic and Reconstructive Surgery Services
 * 
 * Comprehensive patient education for surgical care applicable to most procedures
 */

import type { EducationCondition } from '../types';

export const generalPrePostOpCare: EducationCondition = {
  id: 'general-pre-post-op-care',
  name: 'General Pre- and Post-operative Care',
  description: 'Essential information for patients before and after any surgical procedure',
  category: 'General Care',
  
  overview: {
    definition: 'Comprehensive guidance for patients undergoing surgical procedures, covering preparation, the surgical experience, recovery, and long-term healing expectations.',
    causes: [],
    riskFactors: [
      'Smoking and tobacco use (delays healing, increases infection risk)',
      'Uncontrolled diabetes (impairs wound healing)',
      'Malnutrition or obesity',
      'Chronic medical conditions (heart disease, kidney disease)',
      'Use of blood thinners or certain medications',
      'Previous history of poor wound healing or keloids',
      'Immunocompromised states',
    ],
    symptoms: [],
    diagnosis: [],
    complications: [
      'Surgical site infection',
      'Bleeding or haematoma formation',
      'Wound dehiscence (wound opening)',
      'Seroma (fluid collection)',
      'Deep vein thrombosis (blood clots)',
      'Delayed wound healing',
      'Scarring and keloid formation',
    ],
  },
  
  treatmentPhases: [
    {
      phase: 1,
      name: 'Pre-operative Preparation',
      duration: '2-4 weeks before surgery',
      description: 'Preparing your body and mind for surgery to optimize outcomes.',
      goals: [
        'Optimize overall health status',
        'Complete all required investigations',
        'Understand the procedure and provide informed consent',
        'Arrange post-operative support and care',
      ],
      interventions: [
        'Pre-operative clinic assessment',
        'Blood tests, ECG, chest X-ray as indicated',
        'Nutritional optimization',
        'Smoking cessation (minimum 4 weeks before surgery)',
        'Medication review and adjustment',
      ],
      activities: [
        'Stop smoking and avoid alcohol',
        'Eat a balanced, protein-rich diet',
        'Stay physically active within your limits',
        'Prepare your home for recovery (easy access to essentials)',
        'Arrange transport and a companion for surgery day',
      ],
    },
    {
      phase: 2,
      name: 'Day Before Surgery',
      duration: '24 hours before',
      description: 'Final preparations to ensure you are ready for the procedure.',
      goals: [
        'Complete fasting as instructed',
        'Take prescribed pre-operative medications',
        'Ensure personal hygiene and skin preparation',
      ],
      interventions: [
        'Nothing to eat from midnight (or as instructed)',
        'Shower with antiseptic soap if provided',
        'Remove nail polish, jewelry, and piercings',
        'Pack hospital bag with essentials',
      ],
      activities: [
        'Have a light dinner the evening before',
        'Take any medications as specifically instructed',
        'Get adequate rest and sleep',
        'Do not apply lotions, creams, or makeup',
        'Shave the surgical area only if instructed',
      ],
    },
    {
      phase: 3,
      name: 'Day of Surgery',
      duration: 'Surgery day',
      description: 'What to expect on the day of your operation.',
      goals: [
        'Arrive on time and prepared',
        'Complete admission procedures',
        'Undergo safe anaesthesia and surgery',
      ],
      interventions: [
        'Hospital registration and admission',
        'Pre-operative nursing assessment',
        'Anaesthesia review and consent',
        'Surgical procedure as planned',
      ],
      activities: [
        'Arrive at the hospital at the specified time',
        'Bring required documents (ID, insurance, consent forms)',
        'Wear loose, comfortable clothing',
        'Leave valuables at home',
        'Confirm your companion will be available to take you home',
      ],
    },
    {
      phase: 4,
      name: 'Immediate Post-operative Period',
      duration: '0-48 hours after surgery',
      description: 'The first critical hours after your operation when monitoring is essential.',
      goals: [
        'Recover safely from anaesthesia',
        'Control pain effectively',
        'Prevent immediate complications',
        'Begin early mobilization if appropriate',
      ],
      interventions: [
        'Recovery room monitoring (vital signs, pain, bleeding)',
        'Pain management (medications as prescribed)',
        'Fluid and nutrition management',
        'Assessment of wound and drains if present',
      ],
      activities: [
        'Rest in bed initially, then gradually sit up as instructed',
        'Take deep breaths and cough gently to prevent lung problems',
        'Drink fluids when permitted, then advance to light diet',
        'Report pain honestly so it can be controlled',
        'Move legs regularly to prevent blood clots',
      ],
      warningSignsThisPhase: [
        'Difficulty breathing or chest pain',
        'Sudden severe pain not controlled by medication',
        'Excessive bleeding through bandages',
        'Nausea and vomiting preventing fluid intake',
        'Unable to pass urine',
      ],
    },
    {
      phase: 5,
      name: 'Early Recovery',
      duration: '2-14 days after surgery',
      description: 'The initial healing phase requiring careful wound care and activity modification.',
      goals: [
        'Ensure proper wound healing begins',
        'Gradually increase activity levels',
        'Manage pain with decreasing medication needs',
        'Prevent infection and complications',
      ],
      interventions: [
        'Daily wound inspection and dressing changes',
        'Drain care and removal when output decreases',
        'Suture or staple removal (usually day 7-14)',
        'Physiotherapy if indicated',
      ],
      activities: [
        'Keep wound clean and dry',
        'Change dressings as instructed',
        'Walk short distances regularly (unless restricted)',
        'Avoid lifting heavy objects',
        'Eat nutritious, protein-rich meals',
        'Take medications as prescribed',
        'Attend follow-up appointments',
      ],
    },
    {
      phase: 6,
      name: 'Late Recovery',
      duration: '2-6 weeks after surgery',
      description: 'Continued healing with gradual return to normal activities.',
      goals: [
        'Complete wound healing',
        'Return to most daily activities',
        'Scar maturation begins',
        'Resume work if appropriate',
      ],
      interventions: [
        'Follow-up clinic reviews',
        'Scar care instructions',
        'Physical therapy progression',
        'Activity clearance based on healing',
      ],
      activities: [
        'Continue healthy eating habits',
        'Gradually increase physical activity',
        'Protect the scar from sun exposure',
        'Apply scar care products if recommended',
        'Attend all scheduled follow-up visits',
      ],
    },
    {
      phase: 7,
      name: 'Long-term Healing',
      duration: '6 weeks to 12 months',
      description: 'Scar maturation and final outcome assessment.',
      goals: [
        'Achieve optimal functional outcome',
        'Scar remodeling and softening',
        'Full return to normal activities',
        'Address any concerns or complications',
      ],
      interventions: [
        'Periodic clinic reviews',
        'Scar revision if needed (after 12 months)',
        'Ongoing physiotherapy if required',
      ],
      activities: [
        'Massage scars gently to promote softening',
        'Use sunscreen on scars for at least 12 months',
        'Report any concerns about the surgical result',
        'Maintain overall health and wellbeing',
      ],
    },
  ],
  
  preoperativeInstructions: {
    consultations: [
      'Surgeon consultation and consent',
      'Anaesthetist pre-assessment',
      'Medical clearance if you have chronic conditions',
    ],
    investigations: [
      'Full blood count',
      'Blood group and crossmatch (if significant blood loss expected)',
      'Kidney and liver function tests',
      'Blood sugar (especially for diabetics)',
      'ECG for patients over 40 or with heart conditions',
      'Chest X-ray if indicated',
    ],
    medications: [
      {
        medication: 'Blood thinners (warfarin, aspirin, clopidogrel)',
        instruction: 'Stop 5-7 days before surgery as directed',
        reason: 'Reduces bleeding risk during and after surgery',
      },
      {
        medication: 'Herbal supplements (ginkgo, garlic, ginger)',
        instruction: 'Stop 2 weeks before surgery',
        reason: 'These can increase bleeding tendency',
      },
      {
        medication: 'Blood pressure medications',
        instruction: 'Usually continue, confirm with doctor',
        reason: 'Maintains blood pressure stability',
      },
      {
        medication: 'Diabetes medications',
        instruction: 'May need adjustment on surgery day',
        reason: 'Fasting affects blood sugar control',
      },
    ],
    dietaryRestrictions: [
      'No food for 6-8 hours before surgery (as instructed)',
      'Clear fluids may be allowed up to 2 hours before',
      'No alcohol for at least 48 hours before surgery',
    ],
    physicalPreparation: [
      'Shower or bath the night before and morning of surgery',
      'Use antiseptic soap if provided',
      'Do not shave the surgical area yourself',
      'Remove all jewelry, piercings, and nail polish',
      'Do not apply makeup, lotions, or deodorant',
    ],
    dayBeforeSurgery: [
      'Confirm your surgery time and arrival time',
      'Prepare and pack your hospital bag',
      'Arrange transport and a responsible adult companion',
      'Eat a light, balanced dinner',
      'Get a good night\'s rest',
    ],
    dayOfSurgery: [
      'Follow fasting instructions strictly',
      'Take only medications approved by your doctor',
      'Wear loose, comfortable clothing',
      'Bring your ID, insurance documents, and hospital paperwork',
      'Leave valuables at home',
      'Arrive at the hospital at the scheduled time',
    ],
    whatToBring: [
      'Valid identification',
      'Hospital admission documents',
      'Insurance cards if applicable',
      'List of current medications',
      'Comfortable loose clothing for discharge',
      'Personal toiletries',
      'Phone and charger',
      'Reading material or entertainment',
    ],
    fastingInstructions: 'Nothing to eat for 6-8 hours before surgery. Clear fluids (water, clear juice without pulp) may be allowed up to 2 hours before surgery. Follow your specific instructions carefully.',
  },
  
  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Position as directed by nursing staff, usually semi-reclined initially',
      painManagement: 'Pain medications will be given regularly - report your pain level honestly',
      activityLevel: 'Bed rest initially, then gradual mobilization as instructed',
      expectedSymptoms: [
        'Mild to moderate pain at the surgical site',
        'Drowsiness from anaesthesia (wears off in hours)',
        'Mild nausea (medications available if needed)',
        'Swelling and bruising around the wound',
        'Slight temperature elevation in first 24-48 hours',
      ],
      nursingInstructions: [
        'Vital signs monitoring every 1-4 hours',
        'Pain assessment and medication administration',
        'Wound and drain checks',
        'Fluid intake and urine output monitoring',
        'Assistance with mobilization',
      ],
    },
    woundCare: [
      {
        day: 'Days 1-2',
        instruction: 'Keep original dressing dry and intact. Report any excessive bleeding.',
        dressingType: 'Surgical dressing applied in theatre',
        frequency: 'Do not change unless instructed',
      },
      {
        day: 'Days 3-7',
        instruction: 'First dressing change by healthcare provider. Keep wound clean and dry.',
        dressingType: 'As prescribed by surgeon',
        frequency: 'Every 2-3 days or as instructed',
      },
      {
        day: 'Days 7-14',
        instruction: 'Suture or staple removal if applicable. Wound may be left open or covered.',
        dressingType: 'Light dressing or steri-strips',
        frequency: 'As needed for protection',
      },
      {
        day: 'After 2 weeks',
        instruction: 'Wound usually healed. Begin scar care if recommended.',
        dressingType: 'No dressing needed once healed',
        frequency: 'Apply scar products as directed',
      },
    ],
    painManagement: {
      expectedPainLevel: 'Moderate pain for the first few days, gradually decreasing over 1-2 weeks',
      medications: [
        'Paracetamol (acetaminophen) - take regularly as prescribed',
        'NSAIDs (ibuprofen, diclofenac) - take with food, avoid if contraindicated',
        'Stronger pain relievers (tramadol, codeine) - use only as needed for severe pain',
      ],
      nonPharmacological: [
        'Elevate the surgical area if applicable (reduces swelling)',
        'Apply cold packs wrapped in cloth (first 48 hours) - 20 minutes on, 20 minutes off',
        'Rest and avoid activities that worsen pain',
        'Distraction techniques (music, reading, conversation)',
        'Deep breathing and relaxation exercises',
      ],
      whenToSeekHelp: 'Contact your doctor if pain is not controlled by prescribed medications, if pain suddenly worsens, or if you experience new symptoms alongside pain.',
    },
    activityRestrictions: [
      {
        activity: 'Heavy lifting',
        restriction: 'Avoid lifting more than 5kg',
        duration: '4-6 weeks or as instructed',
        reason: 'Prevents wound stress and hernia formation',
      },
      {
        activity: 'Driving',
        restriction: 'Do not drive while taking strong pain medications',
        duration: 'Usually 1-2 weeks minimum',
        reason: 'Medications impair reflexes; pain may prevent safe control',
      },
      {
        activity: 'Strenuous exercise',
        restriction: 'Avoid gym, running, swimming',
        duration: '4-6 weeks',
        reason: 'Allows wound to heal without stress',
      },
      {
        activity: 'Sexual activity',
        restriction: 'Avoid for the time specified by your surgeon',
        duration: '2-6 weeks depending on surgery type',
        reason: 'Prevents wound complications',
      },
      {
        activity: 'Bathing/swimming',
        restriction: 'No submerging wound in water',
        duration: 'Until wound is fully healed (usually 2-3 weeks)',
        reason: 'Prevents infection and wound softening',
      },
      {
        activity: 'Work',
        restriction: 'Depends on job type - desk work earlier than physical work',
        duration: '1-6 weeks depending on surgery and job',
        reason: 'Allows adequate healing time',
      },
    ],
    dietaryGuidelines: [
      'Eat a balanced diet rich in protein (eggs, fish, chicken, beans, nuts)',
      'Include plenty of fruits and vegetables for vitamins and fibre',
      'Drink at least 2 litres of water daily (unless restricted)',
      'Vitamin C rich foods (citrus, tomatoes, peppers) support healing',
      'Zinc-rich foods (meat, shellfish, legumes) aid wound repair',
      'Avoid excessive alcohol (impairs healing and interacts with medications)',
      'Eat small, regular meals if appetite is reduced',
    ],
    returnToWork: '1-6 weeks depending on the type of surgery and your job demands. Desk jobs can resume earlier than physically demanding work.',
    returnToNormalActivities: 'Most normal activities can resume by 4-6 weeks. Full recovery may take 3-6 months depending on the procedure.',
  },
  
  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '1-2 weeks',
        expectation: 'Initial wound healing, decreasing pain and swelling',
        indicators: ['Wound edges coming together', 'Reduced need for pain medication', 'Able to perform basic self-care'],
      },
      {
        timeframe: '2-4 weeks',
        expectation: 'Wound healed, able to resume light activities',
        indicators: ['Sutures removed', 'No signs of infection', 'Gradual return of energy'],
      },
    ],
    longTerm: [
      {
        timeframe: '1-3 months',
        expectation: 'Return to most normal activities, scar maturing',
        indicators: ['Scar becoming flatter and paler', 'Full range of motion returning', 'Back to work and daily routines'],
      },
      {
        timeframe: '6-12 months',
        expectation: 'Final result visible, scar fully matured',
        indicators: ['Scar soft and pale', 'Full function restored', 'Final cosmetic outcome achieved'],
      },
    ],
    functionalRecovery: 'Most patients achieve full functional recovery within 3-6 months. The timeline depends on the specific procedure, your overall health, and adherence to post-operative instructions.',
    cosmeticOutcome: 'Scars continue to improve for up to 12-18 months. Final appearance depends on surgical technique, genetics, wound care, and scar management.',
    possibleComplications: [
      {
        complication: 'Surgical site infection',
        riskLevel: 'low',
        prevention: 'Good wound care, keeping wound clean and dry',
        management: 'Antibiotics, possible wound drainage',
      },
      {
        complication: 'Wound dehiscence (opening)',
        riskLevel: 'low',
        prevention: 'Avoid strain on wound, good nutrition',
        management: 'May require re-closure or healing by secondary intention',
      },
      {
        complication: 'Hypertrophic or keloid scarring',
        riskLevel: 'moderate',
        prevention: 'Scar care, pressure therapy, silicone products',
        management: 'Steroid injections, revision surgery if needed',
      },
      {
        complication: 'Deep vein thrombosis (DVT)',
        riskLevel: 'low',
        prevention: 'Early mobilization, compression stockings, blood thinners if prescribed',
        management: 'Anticoagulation therapy, hospitalization may be needed',
      },
    ],
  },
  
  followUpCare: {
    schedule: [
      {
        timing: '1-2 days after discharge',
        purpose: 'Wound check and early complication detection',
        whatToExpect: 'Brief examination, dressing change if needed',
      },
      {
        timing: '1 week',
        purpose: 'Wound assessment, possible suture removal',
        investigations: ['Wound inspection'],
        whatToExpect: 'Dressing change or removal, activity guidance',
      },
      {
        timing: '2 weeks',
        purpose: 'Final suture removal if not done, confirm healing',
        whatToExpect: 'Assessment of healing, scar care instructions',
      },
      {
        timing: '4-6 weeks',
        purpose: 'Progress review, clearance for activities',
        whatToExpect: 'Assessment of function and healing, clearance for work/exercise',
      },
      {
        timing: '3 months',
        purpose: 'Review outcome, address any concerns',
        whatToExpect: 'Assessment of final result, scar evaluation',
      },
      {
        timing: '6-12 months',
        purpose: 'Final review, scar maturation assessment',
        whatToExpect: 'Long-term outcome evaluation, discuss any revisions if needed',
      },
    ],
    ongoingMonitoring: [
      'Watch for signs of infection (redness, warmth, pus, fever)',
      'Monitor wound healing progress',
      'Assess scar development',
      'Track pain levels and medication use',
    ],
    lifestyleModifications: [
      'Maintain a healthy, protein-rich diet',
      'Stay physically active within restrictions',
      'Do not smoke - it significantly impairs healing',
      'Limit alcohol consumption',
      'Manage stress and get adequate sleep',
      'Protect healing wounds and scars from sun exposure',
    ],
  },
  
  complianceRequirements: [
    {
      requirement: 'Attend all scheduled follow-up appointments',
      importance: 'critical',
      consequence: 'Missed appointments may lead to undetected complications',
      tips: ['Set reminders on your phone', 'Arrange transport in advance'],
    },
    {
      requirement: 'Take medications exactly as prescribed',
      importance: 'critical',
      consequence: 'Improper medication use can cause complications or poor pain control',
      tips: ['Use a pill organizer', 'Set alarms for medication times'],
    },
    {
      requirement: 'Follow wound care instructions precisely',
      importance: 'critical',
      consequence: 'Poor wound care increases infection and dehiscence risk',
      tips: ['Keep supplies organized', 'Wash hands before touching wound area'],
    },
    {
      requirement: 'Observe activity restrictions',
      importance: 'important',
      consequence: 'Overexertion can cause wound breakdown or hernia',
      tips: ['Ask for help with heavy tasks', 'Plan activities to avoid strain'],
    },
    {
      requirement: 'Report warning signs immediately',
      importance: 'critical',
      consequence: 'Delayed reporting of complications worsens outcomes',
      tips: ['Keep clinic contact numbers accessible', 'Know the nearest emergency facility'],
    },
    {
      requirement: 'Maintain good nutrition',
      importance: 'important',
      consequence: 'Poor nutrition delays wound healing',
      tips: ['Prepare meals in advance', 'Include protein in every meal'],
    },
    {
      requirement: 'Abstain from smoking',
      importance: 'critical',
      consequence: 'Smoking severely impairs wound healing and increases complications',
      tips: ['Seek support for smoking cessation', 'Remove cigarettes from your environment'],
    },
  ],
  
  warningSigns: [
    'Fever above 38°C (100.4°F)',
    'Increasing pain not relieved by prescribed medications',
    'Spreading redness around the wound',
    'Foul-smelling discharge or pus from the wound',
    'Wound edges separating or opening',
    'Excessive swelling that continues to worsen',
    'Bleeding that soaks through bandages',
    'Numbness or tingling not previously present',
  ],
  
  emergencySigns: [
    'Sudden severe chest pain or difficulty breathing',
    'Coughing up blood',
    'Sudden severe pain or swelling in the leg (possible blood clot)',
    'High fever with chills and confusion',
    'Uncontrolled bleeding that does not stop with pressure',
    'Signs of severe allergic reaction (swelling of face/throat, difficulty breathing)',
    'Loss of consciousness or severe dizziness',
    'Complete wound breakdown with exposed tissues',
  ],
};

export const generalCareEducationList: EducationCondition[] = [
  generalPrePostOpCare,
];
