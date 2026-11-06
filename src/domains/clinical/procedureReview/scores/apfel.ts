/**
 * Simplified Apfel score for postoperative nausea and vomiting.
 *
 * Apfel CC, Laara E, Koivuranta M, Greim CA, Roewer N. A simplified risk score
 * for predicting postoperative nausea and vomiting. Anesthesiology
 * 1999;91:693-700. Four risk factors, one point each; the incidence of PONV
 * with 0, 1, 2, 3 and 4 factors was approximately 10, 21, 39, 61 and 79%.
 * Prophylaxis per the Fourth Consensus Guidelines (Gan TJ et al. Anesth Analg
 * 2020;131:411-48): two antiemetics for 1–2 risk factors, three or four for
 * more than two.
 *
 * Sex and smoking are filled by the engine from the patient record and the
 * smoking answer; the clinician supplies history and opioid expectation.
 */
import { YES_NO_SCORE, type ScreeningInstrument } from './instrument';

export const APFEL: ScreeningInstrument = {
  id: 'apfel',
  name: 'Simplified Apfel PONV risk score',
  abbreviation: 'Apfel',
  version: '1999',
  items: [
    { id: 'female', label: 'Female sex', source: 'clinician', options: YES_NO_SCORE },
    { id: 'non_smoker', label: 'Non-smoker', source: 'clinician', options: YES_NO_SCORE },
    { id: 'history', label: 'History of PONV or motion sickness', source: 'patient', options: YES_NO_SCORE },
    { id: 'opioids', label: 'Postoperative opioids expected', source: 'clinician', options: YES_NO_SCORE },
  ],
  totalRange: [0, 4],
  lowerIsBetter: true,
  citation: 'Apfel CC et al. Anesthesiology 1999;91:693-700; Gan TJ et al. Anesth Analg 2020;131:411-48',
  licence: 'Published risk score; the items are factual and freely reproducible.',
  bands: [
    { min: 0, max: 0, band: { label: 'Low (about 10%)', level: 'low', interpretation: 'PONV risk about 10%.' } },
    { min: 1, max: 1, band: { label: 'Low-moderate (about 21%)', level: 'low', interpretation: 'PONV risk about 21%: two-agent prophylaxis.' } },
    { min: 2, max: 2, band: { label: 'Moderate (about 39%)', level: 'moderate', interpretation: 'PONV risk about 39%: two-agent prophylaxis.' } },
    { min: 3, max: 3, band: { label: 'High (about 61%)', level: 'high', interpretation: 'PONV risk about 61%: three or more agents; consider TIVA and opioid-sparing analgesia.' } },
    { min: 4, max: 4, band: { label: 'Very high (about 79%)', level: 'very_high', interpretation: 'PONV risk about 79%: three or more agents; TIVA and opioid-sparing analgesia.' } },
  ],
};
