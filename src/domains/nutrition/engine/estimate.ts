/**
 * The transparent result every engine output is wrapped in.
 *
 * A number without its method, inputs and assumptions cannot be checked at the
 * bedside. When something cannot be computed, `value` is null and `missing`
 * says what would be needed: the engine never fills a gap with a default.
 */

import type { NutritionConfig } from './config/types';

export type EstimateStatus =
  /** Computed from the inputs given. */
  | 'computed'
  /** An input is missing or invalid; see `missing`. */
  | 'not_computable'
  /** The equation slot exists but its coefficients are not configured. */
  | 'equation_not_configured'
  /** Outside the engine's scope for this patient. */
  | 'not_applicable';

export interface Range {
  low: number;
  high: number;
}

export type InputValue = number | string | boolean | null;

export interface Estimate<T = number> {
  value: T | null;
  unit: string;
  method: string;
  formula: string;
  inputsUsed: Record<string, InputValue>;
  assumptions: string[];
  warnings: string[];
  /** Inputs that were needed and not supplied. Empty when computed. */
  missing: string[];
  status: EstimateStatus;
  configVersion: string;
  /** Full citations, resolved from the config's source ids. */
  sources: string[];
}

export function citations(config: NutritionConfig, ids: string[]): string[] {
  return [...new Set(ids)].map(id => config.sources[id]?.citation ?? `Unknown source: ${id}`);
}

interface Base {
  unit: string;
  method: string;
  formula: string;
  sourceIds: string[];
  inputsUsed?: Record<string, InputValue>;
  assumptions?: string[];
  warnings?: string[];
}

export function computed<T>(config: NutritionConfig, value: T, b: Base): Estimate<T> {
  return {
    value,
    unit: b.unit,
    method: b.method,
    formula: b.formula,
    inputsUsed: b.inputsUsed ?? {},
    assumptions: b.assumptions ?? [],
    warnings: b.warnings ?? [],
    missing: [],
    status: 'computed',
    configVersion: config.version,
    sources: citations(config, b.sourceIds),
  };
}

export function notComputable<T = number>(
  config: NutritionConfig,
  missing: string[],
  b: Base & { status?: Exclude<EstimateStatus, 'computed'> },
): Estimate<T> {
  const status = b.status ?? 'not_computable';
  const lead = status === 'equation_not_configured'
    ? 'Equation not configured'
    : status === 'not_applicable'
      ? 'Not applicable'
      : `Cannot compute: missing ${missing.join(', ')}`;
  return {
    value: null,
    unit: b.unit,
    method: b.method,
    formula: b.formula,
    inputsUsed: b.inputsUsed ?? {},
    assumptions: b.assumptions ?? [],
    warnings: [lead, ...(b.warnings ?? [])],
    missing,
    status,
    configVersion: config.version,
    sources: citations(config, b.sourceIds),
  };
}

/** A finite, positive number, or null. Zero and negatives are not measurements. */
export function positive(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null;
}

/** A finite number (zero and negatives allowed), or null. */
export function finite(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/** Names of required inputs that are absent. */
export function missingOf(inputs: Record<string, unknown>, required: string[]): string[] {
  return required.filter(k => finite(inputs[k]) === null);
}

export const r1 = (n: number) => Math.round(n * 10) / 10;
export const r0 = (n: number) => Math.round(n);
export const r2 = (n: number) => Math.round(n * 100) / 100;
