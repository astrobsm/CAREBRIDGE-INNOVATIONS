/**
 * One shape for "what a calculator produced", shared by both calculator
 * surfaces (the Bedside calculators in the Clinician Assistant and the
 * /calculators hub).
 *
 * A calculator turns its own result into a CalculatorReport; everything that
 * leaves the screen — the PDF, the WhatsApp share, the AI plan request — is
 * built from that one object. That is what keeps them in step: the PDF cannot
 * print a figure the screen did not show, and the AI is given exactly the
 * deterministic plan the clinician is looking at, hard limits included.
 */

export interface ReportField {
  label: string;
  /** Already formatted, unit included. Never a raw number. */
  value: string;
}

/** One step of a deterministic plan, with every field the engine supplied. */
export interface ReportStep {
  heading: string;
  /** Labelled lines in a fixed order (route, preparation, dose, ...). */
  lines: ReportField[];
  cautions: string[];
}

export interface ReportSection {
  title: string;
  items: string[];
  tone?: 'info' | 'warn' | 'danger';
}

/** The plan the app itself computed — the one that is never replaced by AI. */
export interface DeterministicPlan {
  title?: string;
  /** Where the value should end up, and how fast. */
  target?: string;
  steps: ReportStep[];
  /** Limits that must not be exceeded whatever else the plan says. */
  hardLimits: string[];
  monitoring: string[];
  /** Things to correct or check first. */
  prerequisites: string[];
  /** Any other headed lists (recommendations, referral criteria, ...). */
  sections: ReportSection[];
}

/** Patient context. Identifiers are kept for the PDF only, never sent to AI. */
export interface ReportPatient {
  name?: string;
  hospitalNumber?: string;
  phone?: string;
  ageYears?: number | null;
  sex?: string;
  weightKg?: number | null;
  heightCm?: number | null;
  diagnosis?: string;
  comorbidities?: string[];
}

export interface CalculatorReport {
  calculatorId: string;
  calculatorName: string;
  inputs: ReportField[];
  results: ReportField[];
  /** Present when the calculator produces a management plan. */
  plan?: DeterministicPlan;
  /** Free-text interpretation lines shown with the result. */
  notes?: string[];
  patient?: ReportPatient;
}
