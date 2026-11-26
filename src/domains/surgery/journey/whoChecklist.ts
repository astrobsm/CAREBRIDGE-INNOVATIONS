/**
 * WHO Surgical Safety Checklist and CDC surgical wound classification.
 *
 * Items follow the WHO Surgical Safety Checklist, first edition (World Health
 * Organization, 2009; "WHO Guidelines for Safe Surgery 2009: Safe Surgery
 * Saves Lives", WHO/IER/PSP/2008.08-1E). Sign In before induction of
 * anaesthesia, Time Out before skin incision, Sign Out before the patient
 * leaves the operating room. Haynes AB et al., N Engl J Med 2009;360:491-9.
 *
 * Wound class: CDC/NHSN surgical wound classification (Patient Safety
 * Component Manual, ch. 9 "Surgical Site Infection Event"; after Garner JS,
 * CDC Guideline for Prevention of SSI, 1985/1999 Mangram AJ et al.).
 */
import type { SurgicalWoundClass, WhoChecklistPhase, WhoSurgicalSafetyChecklist } from '../../../types';

export type WhoPhaseId = 'signIn' | 'timeOut' | 'signOut';

export interface WhoItem { id: string; text: string; notApplicable?: boolean }

export const WHO_PHASES: { id: WhoPhaseId; title: string; when: string; items: WhoItem[] }[] = [
  {
    id: 'signIn', title: 'Sign in', when: 'Before induction of anaesthesia',
    items: [
      { id: 'identity_confirmed', text: 'Patient has confirmed identity, site, procedure and consent' },
      { id: 'site_marked', text: 'Site marked (or not applicable)', notApplicable: true },
      { id: 'anaesthesia_check', text: 'Anaesthesia safety check completed' },
      { id: 'pulse_oximeter', text: 'Pulse oximeter on the patient and functioning' },
      { id: 'allergy_known', text: 'Known allergy checked and stated' },
      { id: 'airway_risk', text: 'Difficult airway / aspiration risk assessed; equipment and assistance available if needed' },
      { id: 'blood_loss_risk', text: 'Risk of >500 ml blood loss (7 ml/kg in children) assessed; adequate IV access and fluids planned if so' },
    ],
  },
  {
    id: 'timeOut', title: 'Time out', when: 'Before skin incision',
    items: [
      { id: 'team_introduced', text: 'All team members have introduced themselves by name and role' },
      { id: 'verbal_confirmation', text: 'Surgeon, anaesthetist and nurse verbally confirm patient, site and procedure' },
      { id: 'surgeon_events', text: 'Surgeon reviews critical or unexpected steps, operative duration and anticipated blood loss' },
      { id: 'anaesthesia_events', text: 'Anaesthesia team reviews patient-specific concerns' },
      { id: 'nursing_events', text: 'Nursing team confirms sterility (including indicator results) and any equipment issues' },
      { id: 'antibiotic_prophylaxis', text: 'Antibiotic prophylaxis given within the last 60 minutes (or not applicable)', notApplicable: true },
      { id: 'imaging_displayed', text: 'Essential imaging displayed (or not applicable)', notApplicable: true },
    ],
  },
  {
    id: 'signOut', title: 'Sign out', when: 'Before the patient leaves the operating room',
    items: [
      { id: 'procedure_recorded', text: 'Nurse verbally confirms the name of the procedure recorded' },
      { id: 'counts_correct', text: 'Instrument, sponge and needle counts are correct (or not applicable)', notApplicable: true },
      { id: 'specimen_labelled', text: 'Specimen labelled, including the patient\'s name (or no specimen)', notApplicable: true },
      { id: 'equipment_problems', text: 'Any equipment problems to be addressed have been stated' },
      { id: 'recovery_concerns', text: 'Surgeon, anaesthetist and nurse review the key concerns for recovery and management' },
    ],
  },
];

export const WOUND_CLASSES: { value: SurgicalWoundClass; label: string; help: string }[] = [
  { value: 'clean', label: 'Class I — Clean', help: 'Uninfected wound, no inflammation; respiratory, alimentary, genital or uninfected urinary tract not entered; primarily closed.' },
  { value: 'clean_contaminated', label: 'Class II — Clean-contaminated', help: 'Respiratory, alimentary, genital or urinary tract entered under controlled conditions without unusual contamination.' },
  { value: 'contaminated', label: 'Class III — Contaminated', help: 'Open, fresh, accidental wounds; major break in sterile technique or gross spillage from the GI tract; acute non-purulent inflammation.' },
  { value: 'dirty', label: 'Class IV — Dirty / infected', help: 'Old traumatic wounds with devitalised tissue; existing clinical infection or perforated viscera.' },
];

export const woundClassLabel = (c?: SurgicalWoundClass) => WOUND_CLASSES.find(w => w.value === c)?.label ?? 'Not recorded';

export function phaseItems(id: WhoPhaseId): WhoItem[] {
  return WHO_PHASES.find(p => p.id === id)!.items;
}

/** Items of a phase not ticked yet. */
export function phaseOutstanding(id: WhoPhaseId, phase?: WhoChecklistPhase): WhoItem[] {
  return phaseItems(id).filter(i => !phase?.items?.[i.id]);
}

export const phaseDone = (id: WhoPhaseId, c?: WhoSurgicalSafetyChecklist) => !!c?.[id]?.completedAt;

/** What still stops a step: start needs Sign in; end needs Time out, Sign out and the wound class. */
export function theatreStepBlockers(step: 'start' | 'end', c: WhoSurgicalSafetyChecklist | undefined, woundClass?: SurgicalWoundClass): string[] {
  const out: string[] = [];
  if (!phaseDone('signIn', c)) out.push('WHO Sign in');
  if (step === 'end') {
    if (!phaseDone('timeOut', c)) out.push('WHO Time out');
    if (!phaseDone('signOut', c)) out.push('WHO Sign out');
    if (!woundClass) out.push('Wound class');
  }
  return out;
}

/** Complete a phase: refused while an item is unticked. */
export function completePhase(
  id: WhoPhaseId, c: WhoSurgicalSafetyChecklist | undefined, items: Record<string, boolean>,
  who: { id: string; name?: string }, at: Date, notes?: string,
): WhoSurgicalSafetyChecklist {
  const missing = phaseItems(id).filter(i => !items[i.id]);
  if (missing.length) throw new Error(`Tick every item first: ${missing.map(i => i.text).join('; ')}`);
  return { ...(c ?? {}), [id]: { items, completedAt: at, completedBy: who.id, completedByName: who.name, notes } };
}
