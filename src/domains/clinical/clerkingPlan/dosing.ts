/**
 * Weight-based doses for children: mg/kg × weight, never above the stated
 * maximum, and never above the adult dose when one is passed (the wound
 * clinic protocol's rule). Child iron is the exception: it is capped only at
 * the child table's own maximum (ownerDecisions.ts). Pure.
 */

export interface WeightDose {
  low: number;
  high: number;
  /** The dose was reduced to a maximum. */
  capped: boolean;
  /** "0.5–1 mg/kg × 8 kg = 4–8 mg" with any cap stated. */
  basis: string;
}

const round = (n: number) => (n >= 10 ? Math.round(n) : Math.round(n * 10) / 10);
const fmt = (lo: number, hi: number, unit: string) => (lo === hi ? `${lo} ${unit}` : `${lo}–${hi} ${unit}`);

export function weightDose(p: {
  perKg: { low: number; high: number } | number;
  weightKg: number;
  unit?: string;
  /** Per-dose / per-day maximum stated by the source. */
  maxDose?: number;
  /** The adult dose: children never get more. */
  adultDose?: number;
}): WeightDose {
  const unit = p.unit ?? 'mg';
  const per = typeof p.perKg === 'number' ? { low: p.perKg, high: p.perKg } : p.perKg;
  const rawLow = round(per.low * p.weightKg), rawHigh = round(per.high * p.weightKg);
  const caps = [p.maxDose, p.adultDose].filter((x): x is number => typeof x === 'number');
  const cap = caps.length ? Math.min(...caps) : Infinity;
  const low = Math.min(rawLow, cap), high = Math.min(rawHigh, cap);
  const capped = rawHigh > cap;
  const perText = per.low === per.high ? `${per.low} ${unit}/kg` : `${per.low}–${per.high} ${unit}/kg`;
  const capText = capped
    ? `, capped at ${cap} ${unit}${p.adultDose === cap ? ' (never above the adult dose)' : ' (maximum)'}`
    : '';
  return { low, high, capped, basis: `${perText} × ${p.weightKg} kg = ${fmt(rawLow, rawHigh, unit)}${capText}` };
}

export const doseText = (d: Pick<WeightDose, 'low' | 'high'>, unit = 'mg') => fmt(d.low, d.high, unit);
