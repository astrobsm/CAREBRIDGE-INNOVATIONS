/**
 * The BNF lookup's report. Kept apart from bedsideReports so the drug
 * database stays in the lazily loaded BNF chunk.
 */
import { getFrequencyLabel, getRouteLabel, type BNFDrug, type DosageInfo } from '../../../data/bnfDrugDatabase';
import { field, presentFields, section, sections } from '../../calculators/report/format';
import type { CalculatorReport, ReportPatient } from '../../calculators/report/types';
import { withPatient } from './bedsideReports';

// ── BNF drug lookup ─────────────────────────────────────────────────────────

/** A drug monograph as looked up: reference only, so no AI plan is offered. */
export function bnfReport(input: {
  drug: BNFDrug; doseLabel: string; dose: DosageInfo;
  warnings: Array<{ level: string; message: string }>;
  weightKg: number; ageYears: number; sex: string; gfr: number | null;
  flags: { pregnant: boolean; lactating: boolean; hepatic: boolean; cardiac: boolean };
}, patient?: ReportPatient): CalculatorReport {
  const { drug: d, dose } = input;
  return withPatient({
    calculatorId: 'bnf',
    calculatorName: `BNF drug dosing — ${d.genericName}`,
    inputs: presentFields([
      { label: 'Drug', value: d.genericName },
      field('Weight', input.weightKg > 0 ? input.weightKg : null, 'kg'),
      field('Age', input.ageYears > 0 ? input.ageYears : null, 'years', 0),
      field('eGFR', input.gfr, 'mL/min/1.73m²', 0),
      ...(input.flags.pregnant ? [{ label: 'Pregnant', value: 'Yes' }] : []),
      ...(input.flags.lactating ? [{ label: 'Breastfeeding', value: 'Yes' }] : []),
      ...(input.flags.hepatic ? [{ label: 'Liver impairment', value: 'Yes' }] : []),
      ...(input.flags.cardiac ? [{ label: 'Cardiac disease', value: 'Yes' }] : []),
    ]),
    results: presentFields([
      { label: `${input.doseLabel} dose`, value: dose.standard },
      { label: 'Range', value: `${dose.min} – ${dose.max}` },
      { label: 'Maximum daily', value: d.maxDailyDose },
      { label: 'Frequency', value: dose.frequency.map(getFrequencyLabel).join(', ') },
      field('Duration', dose.duration ?? null),
    ]),
    notes: [
      ...input.warnings.map(w => `${w.level === 'danger' ? 'DANGER' : w.level === 'warning' ? 'Warning' : 'Note'}: ${w.message}`),
      ...(dose.notes ? [dose.notes] : []),
      'Interactions are not checked here — prescribe in the medication module, which checks the current medication list and allergies.',
    ],
    reference: sections(
      d.dosage.renalImpairment ? section('Renal impairment', [d.dosage.renalImpairment.adjustment, d.dosage.renalImpairment.gfrThreshold ? `Threshold: ${d.dosage.renalImpairment.gfrThreshold}` : null]) : null,
      d.dosage.hepaticImpairment ? section('Hepatic impairment', [d.dosage.hepaticImpairment.adjustment]) : null,
      section('Formulations', d.formulations.map(f => `${f.form} — ${getRouteLabel(f.route)}`)),
      section('Contraindications', d.contraindications),
      section('Monitoring', d.monitoringRequired ?? []),
    ),
  }, patient);
}
