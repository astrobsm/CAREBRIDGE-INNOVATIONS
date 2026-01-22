/**
 * AI Text Enhancement Service
 * AstroHEALTH Innovations in Healthcare
 * 
 * Service for enhancing dictated medical text with proper
 * medical terminology, formatting, and professional expressions.
 */

// Medical context types for specialized enhancement
export type MedicalTextContext = 
  | 'general'
  | 'clinical_notes'
  | 'examination'
  | 'diagnosis'
  | 'treatment_plan'
  | 'surgical_notes'
  | 'preoperative'
  | 'postoperative'
  | 'intraoperative'
  | 'ward_round'
  | 'discharge'
  | 'referral'
  | 'lab_report'
  | 'imaging_report'
  | 'prescription'
  | 'wound_assessment'
  | 'burn_assessment'
  | 'patient_history';

// Medical abbreviation expansions
const MEDICAL_ABBREVIATIONS: Record<string, string> = {
  'bp': 'blood pressure',
  'hr': 'heart rate',
  'rr': 'respiratory rate',
  'spo2': 'oxygen saturation (SpO2)',
  'temp': 'temperature',
  'fbc': 'full blood count',
  'lft': 'liver function tests',
  'rft': 'renal function tests',
  'ecg': 'electrocardiogram (ECG)',
  'cxr': 'chest X-ray',
  'ct': 'computed tomography (CT)',
  'mri': 'magnetic resonance imaging (MRI)',
  'iv': 'intravenous',
  'im': 'intramuscular',
  'sc': 'subcutaneous',
  'po': 'per oral',
  'prn': 'as needed (PRN)',
  'bd': 'twice daily',
  'tds': 'three times daily',
  'qds': 'four times daily',
  'od': 'once daily',
  'stat': 'immediately (STAT)',
  'npo': 'nil per os (nothing by mouth)',
  'sob': 'shortness of breath',
  'loc': 'level of consciousness',
  'gcs': 'Glasgow Coma Scale',
  'dvt': 'deep vein thrombosis',
  'pe': 'pulmonary embolism',
  'mi': 'myocardial infarction',
  'cva': 'cerebrovascular accident (stroke)',
  'dm': 'diabetes mellitus',
  'htn': 'hypertension',
  'chf': 'congestive heart failure',
  'ckd': 'chronic kidney disease',
  'copd': 'chronic obstructive pulmonary disease',
  'uti': 'urinary tract infection',
  'lrti': 'lower respiratory tract infection',
  'urti': 'upper respiratory tract infection',
  'ngt': 'nasogastric tube',
  'idc': 'indwelling catheter',
  'tpn': 'total parenteral nutrition',
  'wbc': 'white blood cell count',
  'rbc': 'red blood cell count',
  'plt': 'platelet count',
  'hb': 'haemoglobin',
  'pcv': 'packed cell volume',
  'inr': 'international normalized ratio',
  'pt': 'prothrombin time',
  'aptt': 'activated partial thromboplastin time',
  'crp': 'C-reactive protein',
  'esr': 'erythrocyte sedimentation rate',
  'bun': 'blood urea nitrogen',
  'tbsa': 'total body surface area',
  'npwt': 'negative pressure wound therapy',
  'ssi': 'surgical site infection',
  'asa': 'American Society of Anesthesiologists',
  'or': 'operating room',
  'pacu': 'post-anesthesia care unit',
  'icu': 'intensive care unit',
  'hdu': 'high dependency unit',
  'eta': 'estimated time of arrival',
  'c/o': 'complains of',
  'h/o': 'history of',
  'o/e': 'on examination',
  'wnl': 'within normal limits',
  'nad': 'no abnormality detected',
  'nkda': 'no known drug allergies',
  'rx': 'prescription/treatment',
  'dx': 'diagnosis',
  'tx': 'treatment',
  'sx': 'symptoms',
  'hx': 'history',
  'px': 'physical examination',
  'ax': 'assessment',
  'sos': 'if needed',
};

// Common medical phrases patterns
const PHRASE_PATTERNS: { pattern: RegExp; replacement: string }[] = [
  { pattern: /patient is a (\d+) year old/gi, replacement: 'Patient is a $1-year-old' },
  { pattern: /(\d+) years? old/gi, replacement: '$1-year-old' },
  { pattern: /no known allergies/gi, replacement: 'No known drug allergies (NKDA)' },
  { pattern: /appears well/gi, replacement: 'Patient appears well, in no acute distress' },
  { pattern: /vitals are stable/gi, replacement: 'Vital signs are within normal limits' },
  { pattern: /wound looks good/gi, replacement: 'Wound appears clean with healthy granulation tissue' },
  { pattern: /wound is healing/gi, replacement: 'Wound is healing well with evidence of epithelialization' },
  { pattern: /no complaints/gi, replacement: 'Patient denies any complaints' },
  { pattern: /feels better/gi, replacement: 'Patient reports subjective improvement' },
  { pattern: /pain is less/gi, replacement: 'Patient reports decreased pain intensity' },
  { pattern: /eating well/gi, replacement: 'Patient tolerating oral diet without difficulty' },
  { pattern: /passed urine/gi, replacement: 'Patient has voided adequately' },
  { pattern: /opened bowels/gi, replacement: 'Patient has had bowel movements' },
  { pattern: /mobile/gi, replacement: 'Patient is ambulatory' },
  { pattern: /walking around/gi, replacement: 'Patient ambulating independently' },
  { pattern: /good progress/gi, replacement: 'Patient making satisfactory progress' },
  { pattern: /continue current management/gi, replacement: 'Continue current therapeutic regimen' },
  { pattern: /for discharge/gi, replacement: 'Patient medically fit for discharge' },
  { pattern: /to come back/gi, replacement: 'Follow-up appointment scheduled' },
  { pattern: /will review/gi, replacement: 'Patient to be reviewed' },
];

// Context-specific templates
const CONTEXT_TEMPLATES: Record<MedicalTextContext, { prefix?: string; suffix?: string; formatting?: (text: string) => string }> = {
  general: {},
  clinical_notes: {
    formatting: (text) => formatAsParagraph(text),
  },
  examination: {
    prefix: 'On examination: ',
    formatting: (text) => formatAsExamination(text),
  },
  diagnosis: {
    formatting: (text) => formatAsDiagnosis(text),
  },
  treatment_plan: {
    prefix: 'Plan:\n',
    formatting: (text) => formatAsNumberedList(text),
  },
  surgical_notes: {
    formatting: (text) => formatAsSurgicalNote(text),
  },
  preoperative: {
    formatting: (text) => formatAsPreoperativeNote(text),
  },
  postoperative: {
    formatting: (text) => formatAsPostoperativeNote(text),
  },
  intraoperative: {
    formatting: (text) => formatAsIntraoperativeNote(text),
  },
  ward_round: {
    formatting: (text) => formatAsWardRoundNote(text),
  },
  discharge: {
    formatting: (text) => formatAsDischargeNote(text),
  },
  referral: {
    formatting: (text) => formatAsReferralNote(text),
  },
  lab_report: {
    formatting: (text) => formatAsLabReport(text),
  },
  imaging_report: {
    formatting: (text) => formatAsImagingReport(text),
  },
  prescription: {
    formatting: (text) => formatAsPrescription(text),
  },
  wound_assessment: {
    formatting: (text) => formatAsWoundAssessment(text),
  },
  burn_assessment: {
    formatting: (text) => formatAsBurnAssessment(text),
  },
  patient_history: {
    formatting: (text) => formatAsPatientHistory(text),
  },
};

/**
 * Main function to enhance medical text
 */
export async function enhanceMedicalText(
  text: string,
  context: MedicalTextContext = 'general'
): Promise<string> {
  if (!text.trim()) return text;

  let enhanced = text;

  // Step 1: Expand medical abbreviations
  enhanced = expandAbbreviations(enhanced);

  // Step 2: Apply phrase pattern improvements
  enhanced = applyPhrasePatterns(enhanced);

  // Step 3: Fix common grammar and punctuation
  enhanced = fixGrammarAndPunctuation(enhanced);

  // Step 4: Apply context-specific formatting
  const template = CONTEXT_TEMPLATES[context];
  if (template) {
    if (template.formatting) {
      enhanced = template.formatting(enhanced);
    }
    if (template.prefix && !enhanced.startsWith(template.prefix)) {
      enhanced = template.prefix + enhanced;
    }
    if (template.suffix && !enhanced.endsWith(template.suffix)) {
      enhanced = enhanced + template.suffix;
    }
  }

  // Step 5: Capitalize sentences and proper nouns
  enhanced = capitalizeSentences(enhanced);

  return enhanced;
}

/**
 * Expand medical abbreviations to full terms
 */
function expandAbbreviations(text: string): string {
  let result = text;
  
  for (const [abbr, full] of Object.entries(MEDICAL_ABBREVIATIONS)) {
    // Match whole words only, case insensitive
    const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
    result = result.replace(regex, full);
  }

  return result;
}

/**
 * Apply phrase pattern improvements
 */
function applyPhrasePatterns(text: string): string {
  let result = text;

  for (const { pattern, replacement } of PHRASE_PATTERNS) {
    result = result.replace(pattern, replacement);
  }

  return result;
}

/**
 * Fix common grammar and punctuation issues
 */
function fixGrammarAndPunctuation(text: string): string {
  let result = text;

  // Add periods at end of sentences if missing
  result = result.replace(/([a-zA-Z])\s*$/g, '$1.');

  // Fix multiple spaces
  result = result.replace(/\s+/g, ' ');

  // Fix missing space after periods
  result = result.replace(/\.([A-Z])/g, '. $1');

  // Fix missing space after commas
  result = result.replace(/,([a-zA-Z])/g, ', $1');

  // Remove space before punctuation
  result = result.replace(/\s+([.,;:!?])/g, '$1');

  // Fix double periods
  result = result.replace(/\.+/g, '.');

  return result.trim();
}

/**
 * Capitalize sentences properly
 */
function capitalizeSentences(text: string): string {
  // Capitalize first letter
  let result = text.charAt(0).toUpperCase() + text.slice(1);

  // Capitalize after periods
  result = result.replace(/\.\s+([a-z])/g, (_, letter) => `. ${letter.toUpperCase()}`);

  // Capitalize after newlines
  result = result.replace(/\n\s*([a-z])/g, (_, letter) => `\n${letter.toUpperCase()}`);

  return result;
}

// Formatting functions for different contexts

function formatAsParagraph(text: string): string {
  return text.split('\n').map(p => p.trim()).filter(p => p).join('\n\n');
}

function formatAsExamination(text: string): string {
  const systems = [
    'General', 'Cardiovascular', 'Respiratory', 'Abdominal', 
    'Neurological', 'Musculoskeletal', 'Skin', 'Local'
  ];
  
  let formatted = text;
  
  // Try to identify and format system examinations
  systems.forEach(system => {
    const regex = new RegExp(`(${system.toLowerCase()}[:\\s-]*)`, 'gi');
    formatted = formatted.replace(regex, `\n${system}: `);
  });

  return formatted.trim();
}

function formatAsDiagnosis(text: string): string {
  // Try to separate multiple diagnoses
  const lines = text.split(/[,;]|\band\b/i).map(d => d.trim()).filter(d => d);
  
  if (lines.length > 1) {
    return lines.map((d, i) => `${i + 1}. ${d}`).join('\n');
  }
  
  return text;
}

function formatAsNumberedList(text: string): string {
  const items = text.split(/[,;]|\band\b/i).map(item => item.trim()).filter(item => item);
  
  if (items.length > 1) {
    return items.map((item, i) => `${i + 1}. ${item}`).join('\n');
  }
  
  return text;
}

function formatAsSurgicalNote(text: string): string {
  const sections = ['Indication', 'Procedure', 'Findings', 'Complications', 'Estimated blood loss', 'Specimens', 'Drains', 'Closure'];
  
  let formatted = text;
  sections.forEach(section => {
    const regex = new RegExp(`(${section.toLowerCase()}[:\\s-]*)`, 'gi');
    formatted = formatted.replace(regex, `\n**${section}:** `);
  });

  return formatted.trim();
}

function formatAsPreoperativeNote(text: string): string {
  return `PREOPERATIVE ASSESSMENT:\n\n${text}`;
}

function formatAsPostoperativeNote(text: string): string {
  return `POSTOPERATIVE NOTE:\n\n${text}`;
}

function formatAsIntraoperativeNote(text: string): string {
  return `INTRAOPERATIVE FINDINGS:\n\n${text}`;
}

function formatAsWardRoundNote(text: string): string {
  // SOAP format
  const soapPattern = /\b(subjective|objective|assessment|plan)\b/gi;
  let formatted = text;
  
  formatted = formatted.replace(soapPattern, (match) => `\n**${match.toUpperCase()}:**`);
  
  return formatted.trim();
}

function formatAsDischargeNote(text: string): string {
  return `DISCHARGE SUMMARY:\n\n${text}`;
}

function formatAsReferralNote(text: string): string {
  return `REFERRAL NOTE:\n\nDear Colleague,\n\n${text}\n\nThank you for seeing this patient.`;
}

function formatAsLabReport(text: string): string {
  // Try to format lab values
  return text.replace(/(\d+\.?\d*)\s*(mg|g|mmol|umol|U|IU|L|mL|mcg|ng|%)/gi, '$1 $2');
}

function formatAsImagingReport(text: string): string {
  const sections = ['Clinical indication', 'Technique', 'Findings', 'Impression'];
  
  let formatted = text;
  sections.forEach(section => {
    const regex = new RegExp(`(${section.toLowerCase()}[:\\s-]*)`, 'gi');
    formatted = formatted.replace(regex, `\n**${section}:** `);
  });

  return formatted.trim();
}

function formatAsPrescription(text: string): string {
  // Format drug prescriptions
  return text.replace(
    /(\w+)\s+(\d+\s*(?:mg|g|mcg|mL|IU))\s+(once|twice|three times|four times|daily|bd|tds|qds|od|prn)/gi,
    (_, drug, dose, frequency) => `• ${drug} ${dose} - ${frequency}`
  );
}

function formatAsWoundAssessment(text: string): string {
  const sections = ['Location', 'Size', 'Depth', 'Tissue type', 'Exudate', 'Periwound', 'Pain', 'Signs of infection'];
  
  let formatted = text;
  sections.forEach(section => {
    const regex = new RegExp(`(${section.toLowerCase()}[:\\s-]*)`, 'gi');
    formatted = formatted.replace(regex, `\n**${section}:** `);
  });

  return formatted.trim();
}

function formatAsBurnAssessment(text: string): string {
  const sections = ['TBSA', 'Depth', 'Location', 'Mechanism', 'First aid', 'Fluid resuscitation'];
  
  let formatted = text;
  sections.forEach(section => {
    const regex = new RegExp(`(${section.toLowerCase()}[:\\s-]*)`, 'gi');
    formatted = formatted.replace(regex, `\n**${section}:** `);
  });

  return formatted.trim();
}

function formatAsPatientHistory(text: string): string {
  const sections = [
    'Chief complaint', 'History of present illness', 'Past medical history',
    'Past surgical history', 'Family history', 'Social history', 
    'Medications', 'Allergies', 'Review of systems'
  ];
  
  let formatted = text;
  sections.forEach(section => {
    const regex = new RegExp(`(${section.toLowerCase()}[:\\s-]*)`, 'gi');
    formatted = formatted.replace(regex, `\n**${section}:** `);
  });

  return formatted.trim();
}

/**
 * Get suggestions for medical terms based on partial input
 */
export function getMedicalTermSuggestions(partialText: string): string[] {
  const lowerText = partialText.toLowerCase();
  const suggestions: string[] = [];

  // Check abbreviations
  for (const [abbr, full] of Object.entries(MEDICAL_ABBREVIATIONS)) {
    if (abbr.startsWith(lowerText) || full.toLowerCase().includes(lowerText)) {
      suggestions.push(`${abbr.toUpperCase()} - ${full}`);
    }
  }

  return suggestions.slice(0, 10);
}

export default {
  enhanceMedicalText,
  getMedicalTermSuggestions,
};
