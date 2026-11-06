/**
 * Small building blocks shared by the oncology modules. Each factory takes
 * the module's id so every field stays namespaced (`${moduleId}.<field>`);
 * nothing here is a field in its own right.
 */
import type { EncounterField } from '../../../data/encounterModel';
import type { ScaleItem } from '../../../../scar/data/scales';

/** Fitzpatrick skin phototype (Fitzpatrick TB. Arch Dermatol 1988;124:869-71). */
export const fitzpatrickField = (moduleId: string): EncounterField => ({
  id: `${moduleId}.fitzpatrick`, label: 'Fitzpatrick skin type', kind: 'select',
  help: 'Fitzpatrick 1988. Darker skin (IV–VI) carries more keloid, hypertrophic scarring and post-inflammatory pigment change.',
  options: [
    { value: 'I', label: 'I — always burns, never tans' },
    { value: 'II', label: 'II — usually burns, tans minimally' },
    { value: 'III', label: 'III — sometimes burns, tans gradually' },
    { value: 'IV', label: 'IV — rarely burns, tans well' },
    { value: 'V', label: 'V — very rarely burns (brown skin)' },
    { value: 'VI', label: 'VI — never burns (deeply pigmented skin)' },
  ],
});

/** Sun-protection behaviour at follow-up. */
export const sunProtectionField = (moduleId: string): EncounterField => ({
  id: `${moduleId}.sun_protection`, label: 'Sun protection', kind: 'select',
  options: [
    { value: 'consistent', label: 'Consistent — hat, clothing, shade, sunscreen' },
    { value: 'partial', label: 'Partial / inconsistent' },
    { value: 'none', label: 'None', flag: 'amber', flagReason: 'No sun protection: UV exposure drives further keratinocyte cancers and melanoma (NICE NG34; BAD).' },
  ],
});

/**
 * Form fields generated from a scar-scale's items (scar/data/scales.ts), so
 * the wording on the form is the instrument's and scoreScale can score it.
 * Categorical items become selects; numeric items (POSAS 1–10) numbers.
 */
export function scaleItemFields(prefix: string, abbreviation: string, items: ScaleItem[]): EncounterField[] {
  return items.map(item => item.options
    ? {
        id: `${prefix}.${item.id}`, label: `${abbreviation} — ${item.label}`, kind: 'select' as const, help: item.help,
        options: item.options.map(o => ({ value: String(o.value), label: o.label })),
      }
    : {
        id: `${prefix}.${item.id}`, label: `${abbreviation} — ${item.label}`, kind: 'number' as const,
        min: item.min, max: item.max,
        help: [item.minLabel && `${item.min} = ${item.minLabel}`, item.maxLabel && `${item.max} = ${item.maxLabel}`].filter(Boolean).join('; ') || item.help,
      });
}

/** Numeric responses for scale items, read from the answers. */
export function scaleResponses(prefix: string, items: ScaleItem[], answers: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) {
    const raw = answers[`${prefix}.${item.id}`];
    if (raw == null || raw === '' || Array.isArray(raw) || typeof raw === 'boolean') continue;
    const n = Number(raw);
    if (Number.isFinite(n)) out[item.id] = n;
  }
  return out;
}
