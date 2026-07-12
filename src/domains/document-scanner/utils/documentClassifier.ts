// ---------------------------------------------------------------------------
// Document classification & field extraction (offline, heuristic)
// ---------------------------------------------------------------------------
// Pure functions that inspect OCR text to (a) guess the document type and
// (b) pull out common clinical fields. Fully offline — keyword + regex based.
// Results are suggestions the clinician edits before saving.
// ---------------------------------------------------------------------------

import type { ScannedDocumentType, ScannedDocumentField } from '../../../types';

interface TypeRule {
  type: ScannedDocumentType;
  label: string;
  keywords: RegExp;
}

// Order matters — earlier rules win ties via score, but keep specific first.
const TYPE_RULES: TypeRule[] = [
  {
    type: 'lab_result',
    label: 'Laboratory Result',
    keywords:
      /\b(full blood count|fbc|haematology|hematology|electrolyte|urea|creatinine|e\/?u\/?cr|lft|liver function|lab(oratory)? result|reference range|haemoglobin|hemoglobin|wbc|platelet|specimen)\b/i,
  },
  {
    type: 'radiology_report',
    label: 'Radiology Report',
    keywords:
      /\b(x-?ray|radiograph|ultrasound|uss|ct scan|mri|radiolog|impression:|findings:|sonograph|doppler)\b/i,
  },
  {
    type: 'operative_note',
    label: 'Operative Note',
    keywords:
      /\b(operative note|operation note|procedure:|surgeon:|anaesth|anesth|incision|intra-?operative|findings at surgery|estimated blood loss|ebl)\b/i,
  },
  {
    type: 'consent_form',
    label: 'Consent Form',
    keywords:
      /\b(consent|i hereby (give|consent)|informed consent|risks and benefits|signature of patient|witness)\b/i,
  },
  {
    type: 'referral_letter',
    label: 'Referral Letter',
    keywords: /\b(refer(ral|red)?|dear (doctor|colleague|dr)|kindly (see|review)|thank you for seeing)\b/i,
  },
  {
    type: 'discharge_summary',
    label: 'Discharge Summary',
    keywords:
      /\b(discharge summary|discharged? on|date of discharge|discharge medications|follow[- ]?up|condition on discharge)\b/i,
  },
  {
    type: 'ecg',
    label: 'ECG',
    keywords: /\b(ecg|ekg|electrocardiogram|sinus rhythm|st (elevation|depression)|qrs|pr interval|qtc?)\b/i,
  },
  {
    type: 'observation_chart',
    label: 'Observation Chart',
    keywords:
      /\b(observation chart|obs chart|vital signs chart|news2?|early warning|fluid balance|intake\/output|input\/output)\b/i,
  },
  {
    type: 'nursing_note',
    label: 'Nursing Note',
    keywords: /\b(nursing note|nurse'?s note|care plan|patient (settled|comfortable)|shift report|handover)\b/i,
  },
  {
    type: 'prescription',
    label: 'Prescription',
    keywords: /\b(rx|prescription|tab(let)?s?|caps?(ule)?s?|mg (od|bd|tds|qds|nocte|prn)|dispense|sig:)\b/i,
  },
];

/** Guess the document type from OCR text. */
export function classifyDocument(text: string): ScannedDocumentType {
  if (!text || !text.trim()) return 'other';
  let best: { type: ScannedDocumentType; score: number } = { type: 'other', score: 0 };
  for (const rule of TYPE_RULES) {
    const matches = text.match(new RegExp(rule.keywords, 'gi'));
    const score = matches ? matches.length : 0;
    if (score > best.score) best = { type: rule.type, score };
  }
  return best.type;
}

export const DOCUMENT_TYPE_LABELS: Record<ScannedDocumentType, string> = {
  lab_result: 'Laboratory Result',
  radiology_report: 'Radiology Report',
  operative_note: 'Operative Note',
  nursing_note: 'Nursing Note',
  consent_form: 'Consent Form',
  referral_letter: 'Referral Letter',
  discharge_summary: 'Discharge Summary',
  ecg: 'ECG',
  observation_chart: 'Observation Chart',
  prescription: 'Prescription',
  other: 'Other Document',
};

function firstMatch(text: string, re: RegExp): string | null {
  const m = text.match(re);
  return m && m[1] ? m[1].trim() : null;
}

/** Extract common clinical fields from OCR text. Returns only fields found. */
export function extractFields(text: string): ScannedDocumentField[] {
  const fields: ScannedDocumentField[] = [];
  const push = (key: string, label: string, value: string | null) => {
    if (value && value.trim()) fields.push({ key, label, value: value.trim() });
  };

  // Patient name — "Name: John Doe" / "Patient: John Doe"
  push(
    'patientName',
    'Patient name',
    firstMatch(text, /(?:patient(?:'s)?\s*name|name)\s*[:\-]\s*([A-Za-z][A-Za-z .'-]{2,40})/i)
  );

  // Hospital / record number
  push(
    'hospitalNumber',
    'Hospital number',
    firstMatch(
      text,
      /(?:hosp(?:ital)?\.?\s*(?:no|number|#)|hosp\.?\s*no|mrn|record\s*(?:no|number))\s*[:\-]?\s*([A-Za-z0-9/\-]{3,20})/i
    )
  );

  // Date
  push(
    'date',
    'Date',
    firstMatch(
      text,
      /(?:date)\s*[:\-]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2})/i
    )
  );

  // Diagnosis
  push('diagnosis', 'Diagnosis', firstMatch(text, /(?:diagnosis|impression)\s*[:\-]\s*([^\n]{3,80})/i));

  // Blood pressure e.g. 120/80
  push('bloodPressure', 'Blood pressure', firstMatch(text, /(?:bp|blood pressure)\s*[:\-]?\s*(\d{2,3}\s*\/\s*\d{2,3})/i));

  // Pulse / heart rate
  push('pulse', 'Pulse (bpm)', firstMatch(text, /(?:pulse|hr|heart rate)\s*[:\-]?\s*(\d{2,3})/i));

  // Temperature
  push('temperature', 'Temperature (°C)', firstMatch(text, /(?:temp(?:erature)?)\s*[:\-]?\s*(\d{2}(?:\.\d)?)/i));

  // Haemoglobin
  push('hemoglobin', 'Haemoglobin (g/dL)', firstMatch(text, /(?:h(?:a)?emoglobin|hb|hgb)\s*[:\-]?\s*(\d{1,2}(?:\.\d)?)/i));

  // Glucose
  push('glucose', 'Glucose (mmol/L)', firstMatch(text, /(?:glucose|rbs|fbs|bsl|blood sugar)\s*[:\-]?\s*(\d{1,2}(?:\.\d)?)/i));

  // Sodium / Potassium
  push('sodium', 'Sodium (mmol/L)', firstMatch(text, /(?:sodium|na\+?)\s*[:\-]?\s*(\d{2,3}(?:\.\d)?)/i));
  push('potassium', 'Potassium (mmol/L)', firstMatch(text, /(?:potassium|k\+?)\s*[:\-]?\s*(\d(?:\.\d)?)/i));

  return fields;
}
