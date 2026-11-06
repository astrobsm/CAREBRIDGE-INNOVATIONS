/**
 * Screening instruments as data — the same item model as the scar scales.
 *
 * Each instrument is a list of ScaleItems (scar/data/scales.ts) with its
 * published wording, plus its published bands. The form fields are generated
 * FROM the items and the total is computed by the scar module's own
 * scoreScale, so item text, form and arithmetic cannot drift apart, and a
 * total over unanswered items is never reported (scoreScale returns null).
 */
import type { ScaleDefinition, ScaleItem } from '../../../scar/data/scales';
import { scoreScale } from '../../../scar/data/scales';
import type { EncounterAnswers, EncounterField } from '../../data/encounterModel';
import type { ScoreBand } from '../types';

export interface InstrumentBand {
  /** Inclusive lower bound of the total. */
  min: number;
  /** Inclusive upper bound of the total. */
  max: number;
  band: ScoreBand;
}

export interface ScreeningInstrument
  extends Pick<ScaleDefinition, 'id' | 'name' | 'abbreviation' | 'version' | 'items' | 'totalRange' | 'lowerIsBetter' | 'citation' | 'notes'> {
  /** The question stem shown above the items (e.g. "Over the last 2 weeks…"). */
  stem?: string;
  bands: InstrumentBand[];
  /** Licensing / reproduction note. */
  licence: string;
}

export interface InstrumentResult {
  total: number | null;
  band: ScoreBand | null;
  /** Item ids with no response. */
  incomplete: string[];
  responses: Record<string, number>;
}

/** The band a total falls in, or null. */
export function bandFor(inst: Pick<ScreeningInstrument, 'bands'>, total: number | null): ScoreBand | null {
  if (total == null) return null;
  return inst.bands.find(b => total >= b.min && total <= b.max)?.band ?? null;
}

/** Field id of an item: `${prefix}.${item.id}`. */
export const itemFieldId = (prefix: string, item: Pick<ScaleItem, 'id'>) => `${prefix}.${item.id}`;

/**
 * Form fields for an instrument's items (select fields whose option values
 * are the item scores), so the wording on the form IS the instrument's.
 */
export function instrumentFields(
  inst: ScreeningInstrument, prefix: string,
  opts: { items?: string[]; visibleWhen?: EncounterField['visibleWhen']; important?: boolean } = {},
): EncounterField[] {
  return inst.items
    .filter(i => !opts.items || opts.items.includes(i.id))
    .map(item => ({
      id: itemFieldId(prefix, item),
      label: item.label,
      narrativeLabel: `${inst.abbreviation} — ${item.label}`,
      kind: 'select' as const,
      help: item.help,
      important: opts.important,
      visibleWhen: opts.visibleWhen,
      options: (item.options ?? []).map(o => ({ value: String(o.value), label: o.label })),
    }));
}

/** Numeric responses read from the answers, for the given items. */
export function responsesFrom(
  inst: ScreeningInstrument, prefix: string, answers: EncounterAnswers, items?: string[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of inst.items) {
    if (items && !items.includes(item.id)) continue;
    const raw = answers[itemFieldId(prefix, item)];
    if (raw == null || raw === '' || Array.isArray(raw) || typeof raw === 'boolean') continue;
    const n = Number(raw);
    if (Number.isFinite(n)) out[item.id] = n;
  }
  return out;
}

/**
 * Score an instrument (optionally a subset of its items — the PHQ-2 is items
 * 1–2 of the PHQ-9) with the scar module's scoreScale, and band it.
 */
export function scoreInstrument(
  inst: ScreeningInstrument, responses: Record<string, number>, items?: string[],
  bands: InstrumentBand[] = inst.bands,
): InstrumentResult {
  const scale = { items: inst.items.filter(i => !items || items.includes(i.id)) };
  const r = scoreScale(scale, responses);
  return { total: r.total, band: bandFor({ bands }, r.total), incomplete: r.incompleteItems, responses };
}

/** Options 0–3 shared by the PHQ and GAD families. */
export const FREQUENCY_OPTIONS = [
  { value: 0, label: 'Not at all' },
  { value: 1, label: 'Several days' },
  { value: 2, label: 'More than half the days' },
  { value: 3, label: 'Nearly every day' },
];

export const YES_NO_SCORE = [
  { value: 0, label: 'No' },
  { value: 1, label: 'Yes' },
];
