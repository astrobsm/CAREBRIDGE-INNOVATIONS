/**
 * Follow-up core: what has happened since, whether the plan was carried out,
 * and how the patient is functioning. The comparison with the previous review
 * is computed (engine.compareWithPrior), not asked.
 */
import type { EncounterSection } from '../../data/encounterModel';

export const FOLLOW_UP_INTERVAL: EncounterSection = {
  id: 'core.follow_up_interval',
  title: 'Since the last review',
  intent: 'Interval events, adherence and function. The previous review is compared automatically.',
  fields: [
    { id: 'core.weeks_since', label: 'Weeks since the procedure or last review', kind: 'number', unit: 'weeks', min: 0, max: 520, important: true },
    {
      id: 'core.interval_events', label: 'Events since the last review', kind: 'multiselect', important: true,
      options: [
        { value: 'none', label: 'None' },
        { value: 'infection', label: 'Infection treated', flag: 'amber', flagReason: 'Interval infection: check it has resolved and why it happened.' },
        { value: 'readmission', label: 'Readmission', flag: 'amber', flagReason: 'Readmitted since the last review: find out why.' },
        { value: 'further_surgery', label: 'Further surgery' },
        { value: 'new_wound', label: 'A new wound or breakdown', flag: 'amber', flagReason: 'New breakdown: assess the cause (pressure, trauma, recurrence).' },
        { value: 'fall', label: 'Fall' },
      ],
    },
    {
      id: 'core.adherence_fu', label: 'Adherence to the agreed plan', kind: 'select', important: true,
      help: 'Dressings, splint, pressure garments, offloading, medication, exercises.',
      options: [
        { value: 'full', label: 'Followed fully' },
        { value: 'partial', label: 'Partly', flag: 'amber', flagReason: 'Plan only partly followed: find the barrier before changing the treatment.' },
        { value: 'none', label: 'Not followed', flag: 'amber', flagReason: 'Plan not followed: find the barrier before changing the treatment.' },
      ],
    },
    {
      id: 'core.adherence_barrier', label: 'Why not', kind: 'multiselect',
      showWhen: { field: 'core.adherence_fu', equals: ['partial', 'none'] },
      options: [
        { value: 'cost', label: 'Cost' },
        { value: 'distance', label: 'Distance / transport' },
        { value: 'understanding', label: 'Did not understand the instructions' },
        { value: 'pain', label: 'Pain' },
        { value: 'side_effects', label: 'Side effects' },
        { value: 'availability', label: 'Dressing / drug not available' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      id: 'core.function', label: 'Function and daily activities', kind: 'select', important: true,
      options: [
        { value: 'normal', label: 'Back to normal' },
        { value: 'improving', label: 'Improving' },
        { value: 'static', label: 'No better', flag: 'amber', flagReason: 'Function not improving: physiotherapy / OT review and look for a cause.' },
        { value: 'worse', label: 'Worse', flag: 'amber', flagReason: 'Function worse: examine for a complication (contracture, nerve, tendon, infection).' },
      ],
    },
    {
      id: 'core.work_status', label: 'Work / school', kind: 'select',
      options: [
        { value: 'returned', label: 'Returned' },
        { value: 'partial', label: 'Partly returned' },
        { value: 'not_yet', label: 'Not yet' },
        { value: 'not_applicable', label: 'Not applicable' },
      ],
    },
    {
      id: 'core.satisfaction', label: 'Patient-rated satisfaction with progress', kind: 'scale', min: 0, max: 10,
      help: '0 very dissatisfied, 10 very satisfied. A simple rating, not a validated instrument.',
    },
    { id: 'core.patient_concerns', label: 'Patient\'s concerns in their own words', kind: 'text' },
  ],
};
