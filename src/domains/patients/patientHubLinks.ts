/**
 * Where the patient hub sends the clinician. Pure, so the links are tested:
 * every one carries the patient.
 */

import { patientModuleLinks } from './patientModuleLinks';

export interface HubLink {
  id: string;
  label: string;
  href: string;
  hint?: string;
}

const q = encodeURIComponent;

/**
 * The one "Start consultation" list. It replaces the five competing ways to
 * document a visit (classic form, structured clerking, procedure review,
 * quick follow-up form, mode switch) with each option listed once.
 */
export function consultationOptions(patientId: string, hasInitialClerking: boolean): {
  primary: HubLink[];
  procedureReview: HubLink[];
  quickNote: HubLink;
} {
  const base = `/patients/${q(patientId)}`;
  return {
    primary: [
      {
        id: 'initial', label: 'Initial clerking',
        hint: 'Structured history, examination, problem list and plan. Use for a new problem.',
        href: `${base}?tab=visits&clerk=initial`,
      },
      hasInitialClerking
        ? {
          id: 'follow_up', label: 'Follow-up visit',
          hint: 'Review the tracked problems and plan from the last clerking.',
          href: `${base}?tab=visits&clerk=follow_up`,
        }
        : {
          id: 'follow_up', label: 'Follow-up visit',
          hint: 'Interval history, examination and plan. (No structured clerking yet.)',
          href: `${base}/follow-up`,
        },
    ],
    procedureReview: [
      { id: 'pre_op', label: 'Pre-op', href: `${base}/procedure-review?phase=pre_op` },
      { id: 'post_op', label: 'Post-op', href: `${base}/procedure-review?phase=post_op` },
      { id: 'pr_follow_up', label: 'Follow-up', href: `${base}/procedure-review?phase=follow_up` },
      { id: 'wound_review', label: 'Wound', href: `${base}/procedure-review?phase=wound_review` },
    ],
    quickNote: {
      id: 'quick_note', label: 'Quick note',
      hint: 'The classic free-text encounter form.',
      href: `${base}/encounter`,
    },
  };
}

/** The hub's quick actions (besides Start consultation). */
export function hubQuickActions(patientId: string): HubLink[] {
  const base = `/patients/${q(patientId)}`;
  return [
    { id: 'book', label: 'Book appointment', href: `/appointments/new?patientId=${q(patientId)}` },
    { id: 'education', label: 'Patient education', href: `/patient-education?patientId=${q(patientId)}` },
    { id: 'procedure_review', label: 'Procedure review', href: `${base}/procedure-review` },
    { id: 'surgery', label: 'Schedule surgery', href: `/surgery/workflow/${q(patientId)}` },
    { id: 'vitals', label: 'Record vitals', href: `${base}/vitals` },
    { id: 'investigations', label: 'Request investigations', href: `${base}/investigations/request` },
    { id: 'summary', label: 'Clinical summary', href: `${base}/clinical-summary` },
  ];
}

/** Specialty modules opened with this patient. */
export function hubModuleLinks(patientId: string): HubLink[] {
  return patientModuleLinks(patientId);
}

/** The URL that opens the hub with the consultation chooser up. */
export const consultationChooserHref = (patientId: string) => `/patients/${q(patientId)}?consult=1`;
