/**
 * The template engine: match, flag, and turn answers back into prose.
 *
 * THE NARRATIVE IS THE POINT
 * Structure is what makes an encounter queryable; prose is what makes it
 * readable. This module produces both from one set of answers, and writes the
 * prose into the free-text fields the rest of the application already reads.
 * The referral letter, the PDF, the discharge summary and the clinician
 * assistant carry on working untouched, and nobody downstream needs to know the
 * history was entered into dropdowns.
 *
 * That is also what makes the change safe to ship: nothing existing depends on
 * the structured data, so nothing existing breaks if a clinician ignores the
 * template entirely and types as they always have.
 *
 * Pure functions: no DOM, no database.
 */

import type {
  EncounterAnswers, EncounterField, EncounterTemplate, FieldOption,
} from '../data/encounterModel';
import { TEMPLATES, getTemplate, TEMPLATE_VERSION } from '../data/encounterTemplates';
import { complaintLabel } from '../data/complaints';

export { TEMPLATE_VERSION };

// ── Matching ────────────────────────────────────────────────────────────────

/**
 * The template for a complaint, with the generic one as a floor.
 *
 * Never returns nothing. A complaint with no specific template still deserves a
 * structured history, and falling back to free text would quietly reintroduce
 * exactly the problem this exists to solve.
 */
export function templateForComplaint(complaintId: string): EncounterTemplate {
  const match = TEMPLATES.find(t => t.complaints.includes(complaintId));
  return match ?? (getTemplate('generic') as EncounterTemplate);
}

/** Every template that could reasonably apply, best first. */
export function templateOptions(complaintId: string): EncounterTemplate[] {
  const best = templateForComplaint(complaintId);
  return [best, ...TEMPLATES.filter(t => t.id !== best.id)];
}

// ── Visibility ──────────────────────────────────────────────────────────────

/** Whether a conditional field should be shown, given what has been answered. */
export function isVisible(field: EncounterField, answers: EncounterAnswers): boolean {
  if (!field.showWhen) return true;
  const value = answers[field.showWhen.field];
  if (value == null) return false;
  const values = Array.isArray(value) ? value.map(String) : [String(value)];
  return values.some(v => field.showWhen!.equals.includes(v));
}

/** Every field in a template that is currently visible. */
export function visibleFields(
  template: EncounterTemplate, answers: EncounterAnswers,
): EncounterField[] {
  return template.sections
    .flatMap(s => s.fields)
    .filter(f => isVisible(f, answers));
}

// ── Flags ───────────────────────────────────────────────────────────────────

export interface RaisedFlag {
  level: 'red' | 'amber';
  fieldLabel: string;
  answerLabel: string;
  reason: string;
}

const answeredValues = (value: EncounterAnswers[string]): string[] => {
  if (value == null || value === false) return [];
  if (Array.isArray(value)) return value.map(String);
  return [String(value)];
};

/**
 * Every flag the current answers raise, red first.
 *
 * Read from the options themselves rather than from a separate rule set, so a
 * flag cannot drift away from the answer that triggers it — adding an option
 * and forgetting its rule is not possible when the rule lives on the option.
 */
export function raisedFlags(
  template: EncounterTemplate, answers: EncounterAnswers,
): RaisedFlag[] {
  const flags: RaisedFlag[] = [];

  for (const field of visibleFields(template, answers)) {
    const chosen = answeredValues(answers[field.id]);
    if (!chosen.length) continue;

    for (const option of field.options ?? []) {
      if (!option.flag || !chosen.includes(option.value)) continue;
      flags.push({
        level: option.flag,
        fieldLabel: field.label,
        answerLabel: option.label,
        reason: option.flagReason
          ?? `${option.label} is a concerning answer to "${field.label}".`,
      });
    }

    // Boolean fields carry their concern in the question itself: answering yes
    // to "compartment syndrome concern" is the flag.
    if (field.kind === 'boolean' && answers[field.id] === true && CONCERNING_BOOLEANS[field.id]) {
      flags.push({
        level: CONCERNING_BOOLEANS[field.id].level,
        fieldLabel: field.label,
        answerLabel: 'Yes',
        reason: CONCERNING_BOOLEANS[field.id].reason,
      });
    }
  }

  return flags.sort((a, b) => (a.level === b.level ? 0 : a.level === 'red' ? -1 : 1));
}

/** Boolean fields where "yes" is itself the concerning answer. */
const CONCERNING_BOOLEANS: Record<string, { level: 'red' | 'amber'; reason: string }> = {
  compartment: {
    level: 'red',
    reason: 'Compartment syndrome is a surgical emergency and a clinical diagnosis. Do not wait '
      + 'for imaging or for pulses to disappear — they are a late sign.',
  },
  rest_pain: {
    level: 'red',
    reason: 'Ischaemic rest pain with tissue loss is chronic limb-threatening ischaemia. Assess '
      + 'perfusion formally.',
  },
  enclosed_space: {
    level: 'red',
    reason: 'Burn in an enclosed space or involving the face carries inhalation injury risk. '
      + 'Assess the airway early — it will not get easier.',
  },
  circumferential: {
    level: 'amber',
    reason: 'A circumferential burn can compromise perfusion or ventilation as oedema develops. '
      + 'Monitor and consider escharotomy.',
  },
};

// ── Completeness ────────────────────────────────────────────────────────────

export interface Completeness {
  percent: number;
  answered: number;
  total: number;
  /** Important fields still unanswered, by label. */
  missing: string[];
}

/**
 * How much of the template has been filled.
 *
 * Counts only the fields the template marks important. Everything else is
 * optional by design, and counting it would make a perfectly adequate note look
 * half-finished and train clinicians to ignore the indicator.
 */
export function completeness(
  template: EncounterTemplate, answers: EncounterAnswers,
): Completeness {
  const fields = visibleFields(template, answers).filter(f => f.important);
  const answered = fields.filter(f => answeredValues(answers[f.id]).length > 0);
  const missing = fields
    .filter(f => answeredValues(answers[f.id]).length === 0)
    .map(f => f.label);

  return {
    percent: fields.length === 0 ? 100 : Math.round((answered.length / fields.length) * 100),
    answered: answered.length,
    total: fields.length,
    missing,
  };
}

// ── Narrative ───────────────────────────────────────────────────────────────

const optionLabel = (field: EncounterField, value: string): string => {
  const option = (field.options ?? []).find((o: FieldOption) => o.value === value);
  return option?.label ?? value;
};

/** Join a list the way a person writes one: "a, b and c". */
const listPhrase = (items: string[]): string => {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
};

/** How a field is named in prose: its narrative label, else its form label. */
const proseLabel = (field: EncounterField): string =>
  field.narrativeLabel ?? field.label.replace(/\?$/, '');

function renderValue(
  field: EncounterField,
  answers: EncounterAnswers,
  otherText?: Record<string, string>,
): string | null {
  const raw = answers[field.id];
  if (raw == null || raw === '') return null;

  if (field.kind === 'boolean') {
    // Only worth a sentence when it is true; "no compartment syndrome concern"
    // in every trauma note is noise that buries the one that says yes.
    return raw === true ? proseLabel(field) : null;
  }

  if (field.kind === 'multiselect') {
    const values = (raw as string[]).filter(Boolean);
    if (!values.length) return null;
    const labels = values.map(v => optionLabel(field, v).toLowerCase());
    const extra = otherText?.[field.id];
    if (extra) labels.push(extra);
    return `${proseLabel(field)}: ${listPhrase(labels)}`;
  }

  if (field.kind === 'number') {
    return `${proseLabel(field)}: ${raw}${field.unit ? ` ${field.unit}` : ''}`;
  }

  if (field.kind === 'scale') {
    return `${proseLabel(field)}: ${raw}/${field.max ?? 10}`;
  }

  if (field.kind === 'text') {
    return String(raw).trim() || null;
  }

  const label = optionLabel(field, String(raw));
  const extra = otherText?.[field.id];
  return `${proseLabel(field)}: ${extra ? `${label} — ${extra}` : label}`;
}

export interface GeneratedNarrative {
  /** One line, for the chief complaint field. */
  chiefComplaint: string;
  /** Prose paragraphs, for the history of present illness field. */
  history: string;
  /** Examination findings, where the template collected them separately. */
  examination: string;
}

/**
 * Turn the answers into the prose the rest of the application reads.
 *
 * Grouped by section with the section title as a lead-in, because that is how a
 * clinician reads a history back — and a single undifferentiated paragraph of
 * thirty facts is harder to scan than the dropdowns were to fill.
 */
export function generateNarrative(
  template: EncounterTemplate,
  complaintId: string,
  answers: EncounterAnswers,
  options: { complaintOther?: string; otherText?: Record<string, string> } = {},
): GeneratedNarrative {
  const complaint = complaintId === 'other'
    ? (options.complaintOther || 'Other')
    : complaintLabel(complaintId);

  // A duration in the headline, because it is the first thing anyone reading a
  // surgical history wants after the complaint itself.
  const durationField = template.sections
    .flatMap(s => s.fields)
    .find(f => f.id === 'duration');
  const durationValue = durationField && answers.duration
    ? optionLabel(durationField, String(answers.duration)).toLowerCase()
    : null;

  const chiefComplaint = durationValue
    ? `${complaint} — ${durationValue}`
    : complaint;

  const historyParts: string[] = [];
  const examParts: string[] = [];

  for (const section of template.sections) {
    const lines = section.fields
      .filter(f => isVisible(f, answers))
      .map(f => renderValue(f, answers, options.otherText))
      .filter((l): l is string => !!l);

    if (!lines.length) continue;

    const block = `${section.title}: ${lines.join('. ')}.`;
    // Examination sections are kept apart so they land in the examination field
    // rather than being buried inside the history.
    const isExam = /examination|wound bed|the injury|ulcer and infection/i.test(section.title);
    (isExam ? examParts : historyParts).push(block);
  }

  return {
    chiefComplaint,
    history: historyParts.join('\n\n'),
    examination: examParts.join('\n\n'),
  };
}

// ── Putting it together ─────────────────────────────────────────────────────

export interface TemplateReading {
  template: EncounterTemplate;
  flags: RaisedFlag[];
  completeness: Completeness;
  narrative: GeneratedNarrative;
  /** Modules this history should hand off to. */
  handoffs: NonNullable<EncounterTemplate['handoffs']>;
}

export function readTemplate(
  templateId: string,
  complaintId: string,
  answers: EncounterAnswers,
  options: { complaintOther?: string; otherText?: Record<string, string> } = {},
): TemplateReading {
  const template = getTemplate(templateId) ?? templateForComplaint(complaintId);
  return {
    template,
    flags: raisedFlags(template, answers),
    completeness: completeness(template, answers),
    narrative: generateNarrative(template, complaintId, answers, options),
    handoffs: template.handoffs ?? [],
  };
}
